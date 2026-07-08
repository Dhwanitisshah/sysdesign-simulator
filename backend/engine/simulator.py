# All simulation math (latency, throughput, availability, cost) lives here
# as pure functions. No I/O, no database, no side effects.

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from pydantic import BaseModel, Field

NodeType = Literal["client", "loadBalancer", "service", "cache", "database"]

# Fixed latency a load balancer adds on top of whatever it routes to.
LB_FIXED_LATENCY = 0.001  # seconds


class GraphCycleError(ValueError):
    """Raised when the graph contains a cycle."""


class GraphValidationError(ValueError):
    """Raised when the graph references nodes that don't exist."""


# --------------------------------------------------------------------------
# Input shape (matches what the frontend canvas produces)
# --------------------------------------------------------------------------


class NodeParams(BaseModel):
    request_rate: float | None = None  # client: base lambda, req/s
    service_rate: float | None = None  # service/cache/database: mu, req/s
    replicas: int = Field(default=1, ge=1)
    availability: float = Field(default=1.0, ge=0, le=1)
    unit_cost: float = Field(default=0.0, ge=0)
    hit_ratio: float | None = Field(default=None, ge=0, le=1)  # cache only


class GraphNode(BaseModel):
    id: str
    type: NodeType
    label: str | None = None
    params: NodeParams = Field(default_factory=NodeParams)


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str


class Graph(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]


# --------------------------------------------------------------------------
# Results
# --------------------------------------------------------------------------


@dataclass
class QueueResult:
    lam_in: float
    rho: float
    saturated: bool
    wait_time: float  # seconds; float('inf') if saturated
    in_flight: float  # Little's Law: L = lam_r * W


@dataclass
class NodeResult:
    node_id: str
    node_type: NodeType
    queue: QueueResult | None  # None for client and loadBalancer (no M/M/1 queue)
    availability: float  # replica-adjusted: 1 - (1 - a)^R
    cost: float  # R * unit_cost
    lam_out: float  # traffic this node sends to each downstream edge


@dataclass
class SimulationResult:
    nodes: dict[str, NodeResult]
    end_to_end_latency: float  # seconds; float('inf') if the critical path is saturated
    system_availability: float
    total_cost: float
    bottleneck_node_id: str | None
    saturated: bool


# --------------------------------------------------------------------------
# Core queueing math (M/M/1 per replica)
# --------------------------------------------------------------------------


def queue_for_node(lam: float, mu: float, replicas: int) -> QueueResult:
    """Standard M/M/1-per-replica model for a node receiving arrival rate lam."""
    lam_r = lam / replicas
    if mu <= 0 or lam_r / mu >= 1:
        rho = float("inf") if mu <= 0 else lam_r / mu
        return QueueResult(lam_in=lam, rho=rho, saturated=True, wait_time=float("inf"), in_flight=float("inf"))
    rho = lam_r / mu
    wait_time = 1.0 / (mu - lam_r)
    in_flight = lam_r * wait_time
    return QueueResult(lam_in=lam, rho=rho, saturated=False, wait_time=wait_time, in_flight=in_flight)


def node_availability(a: float, replicas: int) -> float:
    """Availability of a node with R replicas: all replicas must fail for the node to fail."""
    return 1 - (1 - a) ** replicas


# --------------------------------------------------------------------------
# Graph traversal helpers
# --------------------------------------------------------------------------


def _outgoing(graph: Graph) -> dict[str, list[GraphEdge]]:
    adj: dict[str, list[GraphEdge]] = {n.id: [] for n in graph.nodes}
    for e in graph.edges:
        adj[e.source].append(e)
    return adj


def _incoming(graph: Graph) -> dict[str, list[GraphEdge]]:
    radj: dict[str, list[GraphEdge]] = {n.id: [] for n in graph.nodes}
    for e in graph.edges:
        radj[e.target].append(e)
    return radj


def _topological_order(graph: Graph, outgoing: dict[str, list[GraphEdge]]) -> list[str]:
    """DFS post-order reversed. Raises GraphCycleError if the graph isn't a DAG."""
    WHITE, GRAY, BLACK = 0, 1, 2
    color = {n.id: WHITE for n in graph.nodes}
    order: list[str] = []

    def visit(node_id: str) -> None:
        color[node_id] = GRAY
        for edge in outgoing[node_id]:
            nxt = edge.target
            if color[nxt] == GRAY:
                raise GraphCycleError(f"Cycle detected: edge {edge.id} closes a loop back to node {nxt}")
            if color[nxt] == WHITE:
                visit(nxt)
        color[node_id] = BLACK
        order.append(node_id)

    for n in graph.nodes:
        if color[n.id] == WHITE:
            visit(n.id)

    order.reverse()
    return order


def validate_graph(graph: Graph) -> list[str]:
    """Validates node/edge references and acyclicity. Returns topological order."""
    node_ids = {n.id for n in graph.nodes}
    for e in graph.edges:
        if e.source not in node_ids:
            raise GraphValidationError(f"Edge {e.id} references unknown source node {e.source}")
        if e.target not in node_ids:
            raise GraphValidationError(f"Edge {e.id} references unknown target node {e.target}")

    outgoing = _outgoing(graph)
    return _topological_order(graph, outgoing)


# --------------------------------------------------------------------------
# Simulation
# --------------------------------------------------------------------------


def _own_latency(node: GraphNode, result: NodeResult) -> float:
    if node.type == "client":
        return 0.0
    if node.type == "loadBalancer":
        return LB_FIXED_LATENCY
    assert result.queue is not None
    return result.queue.wait_time


def simulate(graph: Graph) -> SimulationResult:
    order = validate_graph(graph)
    nodes_by_id = {n.id: n for n in graph.nodes}
    outgoing = _outgoing(graph)
    incoming = _incoming(graph)

    edge_lambda: dict[str, float] = {}
    node_results: dict[str, NodeResult] = {}

    for node_id in order:
        node = nodes_by_id[node_id]

        if node.type == "client":
            lam_in = node.params.request_rate or 0.0
        else:
            lam_in = sum(edge_lambda[e.id] for e in incoming[node_id])

        queue: QueueResult | None = None
        if node.type in ("service", "database"):
            queue = queue_for_node(lam_in, node.params.service_rate or 0.0, node.params.replicas)
            lam_out_total = lam_in
        elif node.type == "cache":
            queue = queue_for_node(lam_in, node.params.service_rate or 0.0, node.params.replicas)
            hit_ratio = node.params.hit_ratio or 0.0
            lam_out_total = lam_in * (1 - hit_ratio)
        else:  # client, loadBalancer
            lam_out_total = lam_in

        out_edges = outgoing[node_id]
        if node.type == "loadBalancer" and out_edges:
            per_edge = lam_out_total / len(out_edges)
            for e in out_edges:
                edge_lambda[e.id] = per_edge
        else:
            for e in out_edges:
                edge_lambda[e.id] = lam_out_total

        node_results[node_id] = NodeResult(
            node_id=node_id,
            node_type=node.type,
            queue=queue,
            availability=node_availability(node.params.availability, node.params.replicas),
            cost=node.params.replicas * node.params.unit_cost,
            lam_out=lam_out_total,
        )

    end_to_end_latency, system_availability = _critical_path(graph, order, outgoing, nodes_by_id, node_results)
    total_cost = sum(r.cost for r in node_results.values())
    bottleneck_node_id, saturated = _find_bottleneck(node_results)

    return SimulationResult(
        nodes=node_results,
        end_to_end_latency=end_to_end_latency,
        system_availability=system_availability,
        total_cost=total_cost,
        bottleneck_node_id=bottleneck_node_id,
        saturated=saturated,
    )


def _critical_path(
    graph: Graph,
    order: list[str],
    outgoing: dict[str, list[GraphEdge]],
    nodes_by_id: dict[str, GraphNode],
    node_results: dict[str, NodeResult],
) -> tuple[float, float]:
    """Walks the graph to find the slowest (max-latency) root-to-leaf path.

    Series segments sum their wait times; parallel branches take the max
    (a request waits for the slowest branch), which is equivalent to picking
    the single root-to-leaf path with the largest total latency.
    """
    latency_from: dict[str, float] = {}
    best_next: dict[str, str | None] = {}

    for node_id in reversed(order):
        node = nodes_by_id[node_id]
        own = _own_latency(node, node_results[node_id])
        children = outgoing[node_id]
        if not children:
            latency_from[node_id] = own
            best_next[node_id] = None
        else:
            best_edge = max(children, key=lambda e: latency_from[e.target])
            latency_from[node_id] = own + latency_from[best_edge.target]
            best_next[node_id] = best_edge.target

    roots = [n.id for n in graph.nodes if n.type == "client"]
    if not roots:
        return 0.0, 1.0

    root = max(roots, key=lambda r: latency_from[r])
    end_to_end_latency = latency_from[root]

    availability = 1.0
    cur: str | None = root
    while cur is not None:
        availability *= node_results[cur].availability
        cur = best_next[cur]

    return end_to_end_latency, availability


def _find_bottleneck(node_results: dict[str, NodeResult]) -> tuple[str | None, bool]:
    candidates = [(nid, r.queue.rho) for nid, r in node_results.items() if r.queue is not None]
    if not candidates:
        return None, False
    bottleneck_id, max_rho = max(candidates, key=lambda item: item[1])
    return bottleneck_id, max_rho >= 1
