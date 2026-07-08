const API_BASE = 'http://localhost:8000'

// Converts React Flow's node/edge shape into the Graph shape the backend expects.
function toGraph(nodes, edges) {
  return {
    nodes: nodes.map((n) => ({ id: n.id, type: n.data.nodeType, label: n.data.label, params: n.data.params })),
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

// Calls POST /sweep. Returns { data } on success or { error } on failure.
export async function sweepGraph(nodes, edges) {
  let response
  try {
    response = await fetch(`${API_BASE}/sweep`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ graph: toGraph(nodes, edges) }),
    })
  } catch {
    return { error: 'Could not reach the simulation server.' }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const detail = body?.detail
    const message = typeof detail === 'string' ? detail : detail ? JSON.stringify(detail) : `Sweep failed (${response.status})`
    return { error: message }
  }

  return { data: await response.json() }
}

// Calls POST /critique. Returns { data } on success or { error } on failure.
export async function critiqueGraph(nodes, edges) {
  let response
  try {
    response = await fetch(`${API_BASE}/critique`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toGraph(nodes, edges)),
    })
  } catch {
    return { error: 'Could not reach the critique server.' }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const detail = body?.detail
    const message = typeof detail === 'string' ? detail : detail ? JSON.stringify(detail) : `Critique failed (${response.status})`
    return { error: message }
  }

  return { data: await response.json() }
}
