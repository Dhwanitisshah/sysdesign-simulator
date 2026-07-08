# Builds the LLM critique prompt from already-computed simulation results
# and calls Groq. No simulation math happens here — it only formats numbers
# that engine/simulator.py has already computed and asks an LLM to interpret
# them. The engine stays the single source of truth for all math.

from __future__ import annotations

import os

from groq import Groq

from engine.simulator import Graph, GraphNode, SimulationResult

GROQ_MODEL = "llama-3.1-8b-instant"

SYSTEM_PROMPT = (
    "You are a senior systems engineer reviewing a proposed system architecture "
    "and its computed performance metrics. Refer to components ONLY by the "
    "labels given in the summary (e.g. 'Database', 'Service (API)') — never by "
    "internal ids like 'node-8'.\n\n"
    "Judge severity strictly from each node's utilization, don't default to "
    "alarmism:\n"
    "- utilization < 0.7: the system is HEALTHY with headroom. Say so plainly. "
    "You may name the node with the highest utilization as the relative "
    "bottleneck, but make clear it is NOT a current problem and does NOT need "
    "scaling yet. You may optionally note roughly what load would start to "
    "concern you.\n"
    "- utilization 0.7-0.9: getting loaded. Warn that it's worth planning to "
    "scale soon, but it isn't urgent.\n"
    "- utilization >= 0.9, or saturated: urgent. Name the bottleneck, explain "
    "why in 1-2 sentences, and give 2-3 specific, actionable fixes (e.g. 'add a "
    "read replica', 'insert a cache with an 80% hit ratio', 'raise the service "
    "rate or add replicas').\n\n"
    "Base every claim on the real numbers in the summary. Be concise and "
    "concrete: no generic advice, no more than ~150 words."
)


def _display_name(node: GraphNode) -> str:
    return node.label or node.type


def build_summary(graph: Graph, result: SimulationResult) -> str:
    """Renders the graph + simulation result as plain text for the LLM prompt."""
    nodes_by_id = {n.id: n for n in graph.nodes}
    lines = ["Architecture:"]
    for node_id, r in result.nodes.items():
        node = nodes_by_id[node_id]
        p = node.params
        parts = [f"- {_display_name(node)} ({node.type})"]
        if p.service_rate is not None:
            parts.append(f"mu={p.service_rate} req/s")
        parts.append(f"replicas={p.replicas}")
        if r.queue is not None:
            parts.append(f"utilization={r.queue.rho:.2f}")
            parts.append("SATURATED" if r.queue.saturated else "ok")
        if node.type == "cache" and p.hit_ratio is not None:
            parts.append(f"hit_ratio={p.hit_ratio}")
        lines.append(", ".join(parts))

    bottleneck_name = _display_name(nodes_by_id[result.bottleneck_node_id]) if result.bottleneck_node_id else "none"
    latency = "saturated (infinite)" if result.saturated else f"{result.end_to_end_latency * 1000:.1f} ms"
    lines += [
        "",
        "System results:",
        f"- end-to-end latency: {latency}",
        f"- availability: {result.system_availability * 100:.3f}%",
        f"- total cost: ${result.total_cost:.2f}/hr",
        f"- relative bottleneck (highest utilization): {bottleneck_name}",
    ]
    return "\n".join(lines)


def get_critique(graph: Graph, result: SimulationResult) -> str:
    """Sends the summary to Groq and returns its critique text.

    Raises RuntimeError if GROQ_API_KEY isn't configured; propagates any
    Groq SDK exception on API/network failure so the caller can decide how
    to translate it into an HTTP response.
    """
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not set on the server.")

    client = Groq(api_key=api_key)
    summary = build_summary(graph, result)

    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": summary},
        ],
        temperature=0.3,
        max_tokens=400,
    )
    return response.choices[0].message.content.strip()
