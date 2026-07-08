import { createContext, useContext } from 'react'

// Lets custom React Flow node components (rendered by the library, not by us)
// reach back up to App-level state mutators like node deletion.
export const NodeActionsContext = createContext({ onDeleteNode: () => {} })

export function useNodeActions() {
  return useContext(NodeActionsContext)
}
