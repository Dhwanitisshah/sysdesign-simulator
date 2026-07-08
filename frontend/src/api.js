const API_BASE = 'http://localhost:8000'

// Converts React Flow's node/edge shape into the Graph shape the backend expects.
function toGraph(nodes, edges) {
  return {
    nodes: nodes.map((n) => ({ id: n.id, type: n.data.nodeType, label: n.data.label, params: n.data.params })),
    edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
  }
}

// Converts the backend Graph shape back into React Flow nodes/edges.
// Node positions aren't part of the backend Graph, so nodes are laid out in a row.
export function fromGraph(graph) {
  const nodes = graph.nodes.map((n, i) => ({
    id: n.id,
    type: 'infra',
    position: { x: 150 + (i % 5) * 200, y: 150 + Math.floor(i / 5) * 160 },
    data: { nodeType: n.type, label: n.label, params: n.params },
  }))
  const edges = graph.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    markerEnd: { type: 'arrowclosed' },
  }))
  return { nodes, edges }
}

async function handleJsonResponse(response, failureLabel) {
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const detail = body?.detail
    const message = typeof detail === 'string' ? detail : detail ? JSON.stringify(detail) : `${failureLabel} (${response.status})`
    return { error: message }
  }
  return { data: await response.json() }
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

// Calls POST /designs to save the current graph under `name`.
export async function saveDesign(nodes, edges, name) {
  let response
  try {
    response = await fetch(`${API_BASE}/designs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, graph: toGraph(nodes, edges) }),
    })
  } catch {
    return { error: 'Could not reach the simulation server.' }
  }
  return handleJsonResponse(response, 'Save failed')
}

// Calls GET /designs. Returns the lightweight list (id, name, created_at).
export async function listDesigns() {
  let response
  try {
    response = await fetch(`${API_BASE}/designs`)
  } catch {
    return { error: 'Could not reach the simulation server.' }
  }
  return handleJsonResponse(response, 'Listing designs failed')
}

// Calls GET /designs/{id}. Returns the full saved graph.
export async function getDesign(id) {
  let response
  try {
    response = await fetch(`${API_BASE}/designs/${id}`)
  } catch {
    return { error: 'Could not reach the simulation server.' }
  }
  return handleJsonResponse(response, 'Loading design failed')
}

// Calls DELETE /designs/{id}.
export async function deleteDesign(id) {
  let response
  try {
    response = await fetch(`${API_BASE}/designs/${id}`, { method: 'DELETE' })
  } catch {
    return { error: 'Could not reach the simulation server.' }
  }
  return handleJsonResponse(response, 'Delete failed')
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
