import { createContext, useContext } from 'react'

// Maps node id -> { wait_time, rho, saturated } from the last /simulate response.
export const SimulationResultsContext = createContext({})

export function useSimulationResult(nodeId) {
  const results = useContext(SimulationResultsContext)
  return results[nodeId]
}
