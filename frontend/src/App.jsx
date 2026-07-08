import { useState, useCallback } from 'react'
import ReactFlow, { Background, Controls, applyNodeChanges } from 'reactflow'
import 'reactflow/dist/style.css'

const initialNodes = [
  {
    id: '1',
    position: { x: 250, y: 150 },
    data: { label: 'Client' },
  },
]

function App() {
  const [nodes, setNodes] = useState(initialNodes)

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  )

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow nodes={nodes} onNodesChange={onNodesChange} fitView>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  )
}

export default App
