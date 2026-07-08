import { createContext, useContext } from 'react'

// Holds the full last /simulate response: per-node results plus system-level
// totals (end_to_end_latency, system_availability, total_cost, bottleneck_node_id).
export const SimulationResultsContext = createContext({ nodes: {}, system: null })

export function useSimulationResult(nodeId) {
  const { nodes, system } = useContext(SimulationResultsContext)
  const result = nodes[nodeId]
  if (!result) return null
  return { ...result, isBottleneck: system?.bottleneck_node_id === nodeId }
}

