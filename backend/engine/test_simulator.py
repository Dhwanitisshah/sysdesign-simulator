import pytest
from pydantic import ValidationError

from engine.simulator import (
    Graph,
    GraphCycleError,
    GraphEdge,
    GraphNode,
    GraphValidationError,
    node_availability,
    queue_for_node,
    simulate,
)


def node(id, type, **params):
    return GraphNode(id=id, type=type, params=params)


def edge(id, source, target):
    return GraphEdge(id=id, source=source, target=target)


# --------------------------------------------------------------------------
# 1-3: core M/M/1 queueing math
# --------------------------------------------------------------------------


def test_single_service_low_utilization():
    r = queue_for_node(lam=50, mu=200, replicas=1)
    assert r.rho == pytest.approx(0.25)
    assert r.saturated is False
    assert r.wait_time == pytest.approx(1 / (200 - 50))


def test_single_service_saturated():
    r = queue_for_node(lam=200, mu=200, replicas=1)
    assert r.rho >= 1
    assert r.saturated is True
    assert r.wait_time == float("inf")

    r2 = queue_for_node(lam=300, mu=200, replicas=1)
    assert r2.saturated is True
    assert r2.wait_time == float("inf")


def test_latency_blows_up_near_saturation():
    w_low = queue_for_node(lam=50, mu=200, replicas=1).wait_time
    w_mid = queue_for_node(lam=100, mu=200, replicas=1).wait_time
    w_high = queue_for_node(lam=180, mu=200, replicas=1).wait_time
    assert w_low < w_mid < w_high


# --------------------------------------------------------------------------
# 4: cache relieves downstream database load
# --------------------------------------------------------------------------


def _client_db_graph(cache_hit_ratio=None):
    nodes = [
        node("client", "client", request_rate=100),
        node("db", "database", service_rate=150, replicas=1, availability=0.999, unit_cost=0.1),
    ]
    edges = []
    if cache_hit_ratio is None:
        edges.append(edge("e1", "client", "db"))
    else:
        nodes.insert(1, node("cache", "cache", hit_ratio=cache_hit_ratio, service_rate=1000, unit_cost=0.02, availability=0.999))
        edges.append(edge("e1", "client", "cache"))
        edges.append(edge("e2", "cache", "db"))
    return Graph(nodes=nodes, edges=edges)


def test_cache_reduces_downstream_load():
    without_cache = simulate(_client_db_graph())
    with_cache = simulate(_client_db_graph(cache_hit_ratio=0.8))

    db_rho_without = without_cache.nodes["db"].queue.rho
    db_rho_with = with_cache.nodes["db"].queue.rho

    assert with_cache.nodes["cache"].lam_out == pytest.approx(100 * 0.2)
    assert db_rho_with < db_rho_without


# --------------------------------------------------------------------------
# 5: replicas halve load and raise availability
# --------------------------------------------------------------------------


def test_replicas_halve_load_and_raise_availability():
    q1 = queue_for_node(lam=100, mu=200, replicas=1)
    q2 = queue_for_node(lam=100, mu=200, replicas=2)
    assert q2.rho == pytest.approx(q1.rho / 2)

    a = 0.99
    assert node_availability(a, replicas=2) > a


# --------------------------------------------------------------------------
# 6: Little's Law
# --------------------------------------------------------------------------


def test_littles_law():
    lam, mu, replicas = 80, 200, 1
    r = queue_for_node(lam, mu, replicas)
    lam_r = lam / replicas
    assert r.in_flight == pytest.approx(lam_r * r.wait_time)


# --------------------------------------------------------------------------
# 7-8: malformed input
# --------------------------------------------------------------------------


def test_cycle_detection_raises():
    g = Graph(
        nodes=[
            node("a", "service", service_rate=100),
            node("b", "service", service_rate=100),
        ],
        edges=[edge("e1", "a", "b"), edge("e2", "b", "a")],
    )
    with pytest.raises(GraphCycleError):
        simulate(g)


def test_dangling_edge_rejected():
    g = Graph(
        nodes=[node("a", "client", request_rate=10)],
        edges=[edge("e1", "a", "nonexistent")],
    )
    with pytest.raises(GraphValidationError):
        simulate(g)


def test_malformed_graph_rejected_by_pydantic():
    with pytest.raises(ValidationError):
        GraphNode(id="a", type="not-a-real-type")

    with pytest.raises(ValidationError):
        Graph(nodes=[{"id": "a"}], edges=[])


# --------------------------------------------------------------------------
# 9-10: end-to-end latency, series vs parallel
# --------------------------------------------------------------------------


def test_end_to_end_latency_series():
    g = Graph(
        nodes=[
            node("client", "client", request_rate=50),
            node("lb", "loadBalancer", replicas=2, unit_cost=0.05, availability=0.999),
            node("svc", "service", service_rate=200, replicas=1, availability=0.999, unit_cost=0.1),
            node("db", "database", service_rate=150, replicas=1, availability=0.9999, unit_cost=0.2),
        ],
        edges=[
            edge("e1", "client", "lb"),
            edge("e2", "lb", "svc"),
            edge("e3", "svc", "db"),
        ],
    )
    result = simulate(g)

    svc_w = result.nodes["svc"].queue.wait_time
    db_w = result.nodes["db"].queue.wait_time
    expected = 0.001 + svc_w + db_w
    assert result.end_to_end_latency == pytest.approx(expected)


def test_parallel_branches_take_max():
    g = Graph(
        nodes=[
            node("client", "client", request_rate=100),
            node("lb", "loadBalancer"),
            node("fast", "service", service_rate=1000, replicas=1),
            node("slow", "service", service_rate=60, replicas=1),
        ],
        edges=[
            edge("e1", "client", "lb"),
            edge("e2", "lb", "fast"),
            edge("e3", "lb", "slow"),
        ],
    )
    result = simulate(g)

    fast_w = result.nodes["fast"].queue.wait_time
    slow_w = result.nodes["slow"].queue.wait_time
    assert fast_w != pytest.approx(slow_w)

    expected_max_branch = 0.001 + max(fast_w, slow_w)
    assert result.end_to_end_latency == pytest.approx(expected_max_branch)
    # sanity: make sure it's really taking the max, not the sum
    summed = 0.001 + fast_w + slow_w
    assert result.end_to_end_latency != pytest.approx(summed)


# --------------------------------------------------------------------------
# 11-13: system-level rollups
# --------------------------------------------------------------------------


def test_system_availability_product():
    g = Graph(
        nodes=[
            node("client", "client", request_rate=10),
            node("a", "service", service_rate=100, replicas=1, availability=0.99),
            node("b", "service", service_rate=100, replicas=1, availability=0.98),
            node("c", "database", service_rate=100, replicas=1, availability=0.999),
        ],
        edges=[edge("e1", "client", "a"), edge("e2", "a", "b"), edge("e3", "b", "c")],
    )
    result = simulate(g)
    expected = 1.0 * node_availability(0.99, 1) * node_availability(0.98, 1) * node_availability(0.999, 1)
    assert result.system_availability == pytest.approx(expected)


def test_total_cost_sums_all_nodes():
    g = Graph(
        nodes=[
            node("client", "client", request_rate=10),
            node("lb", "loadBalancer", replicas=2, unit_cost=0.05),
            node("svc", "service", service_rate=100, replicas=3, unit_cost=0.1),
            node("db", "database", service_rate=100, replicas=2, unit_cost=0.2),
        ],
        edges=[edge("e1", "client", "lb"), edge("e2", "lb", "svc"), edge("e3", "svc", "db")],
    )
    result = simulate(g)
    expected = (2 * 0.05) + (3 * 0.1) + (2 * 0.2)
    assert result.total_cost == pytest.approx(expected)


def test_bottleneck_identification():
    g = Graph(
        nodes=[
            node("client", "client", request_rate=140),
            node("svc", "service", service_rate=1000, replicas=1),
            node("db", "database", service_rate=150, replicas=1),
        ],
        edges=[edge("e1", "client", "svc"), edge("e2", "svc", "db")],
    )
    result = simulate(g)
    assert result.bottleneck_node_id == "db"
    assert result.saturated is False
