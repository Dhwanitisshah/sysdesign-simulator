const API_BASE = 'http://localhost:8000'

// Converts React Flow's node/edge shape into the Graph shape the backend expects.
function toGraph(nodes, edges) {
  return {
    nodes: nodes.map((n) => ({ id: n.id, type: n.data.nodeType, params: n.data.params })),
    edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
  }
}

// Calls POST /simulate. Returns { data } on success or { error } on failure.
// Never throws — callers just check which field is set.
export async function simulateGraph(nodes, edges) {
  let response
  try {
    response = await fetch(`${API_BASE}/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toGraph(nodes, edges)),
    })
  } catch {
    return { error: 'Could not reach the simulation server.' }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const detail = body?.detail
    const message = typeof detail === 'string' ? detail : detail ? JSON.stringify(detail) : `Simulation failed (${response.status})`
    return { error: message }
  }

  return { data: await response.json() }
}
