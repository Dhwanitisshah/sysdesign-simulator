import { useCallback, useRef, useState } from 'react'
import ReactFlow, {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  MarkerType,
  ReactFlowProvider,
} from 'reactflow'
import 'reactflow/dist/style.css'
import './App.css'

import Palette from './components/Palette'
import ParamsPanel from './components/ParamsPanel'
import InfraNode from './components/InfraNode'
import { NODE_TYPES } from './nodeTypes'

const nodeTypes = { infra: InfraNode }

let nextId = 1
const genId = () => `node-${nextId++}`

function makeNode(nodeType, position) {
  const def = NODE_TYPES[nodeType]
  return {
    id: genId(),
    type: 'infra',
    position,
    data: {
      nodeType,
      label: def.label,
      params: { ...def.defaultParams },
    },
  }
}

function AppInner() {
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [reactFlowInstance, setReactFlowInstance] = useState(null)
  const wrapperRef = useRef(null)

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  )

  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  )

  const onConnect = useCallback(
    (connection) =>
      setEdges((eds) =>
        addEdge({ ...connection, markerEnd: { type: MarkerType.ArrowClosed } }, eds),
      ),
    [],
  )

  const onNodesDelete = useCallback((deleted) => {
    setSelectedNodeId((current) =>
      deleted.some((node) => node.id === current) ? null : current,
    )
  }, [])

  const onNodeClick = useCallback((_event, node) => {
    setSelectedNodeId(node.id)
  }, [])

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null)
  }, [])

  const addNodeAt = useCallback((nodeType, position) => {
    setNodes((nds) => [...nds, makeNode(nodeType, position)])
  }, [])

  const onAddNodeFromPalette = useCallback(
    (nodeType) => {
      const position = reactFlowInstance
        ? reactFlowInstance.project({ x: 150 + Math.random() * 200, y: 150 + Math.random() * 200 })
        : { x: 150, y: 150 }
      addNodeAt(nodeType, position)
    },
    [reactFlowInstance, addNodeAt],
  )

  const onDragOver = useCallback((event) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event) => {
      event.preventDefault()
      const nodeType = event.dataTransfer.getData('application/reactflow')
      if (!nodeType || !NODE_TYPES[nodeType] || !reactFlowInstance) return

      const bounds = wrapperRef.current.getBoundingClientRect()
      const position = reactFlowInstance.project({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      })
      addNodeAt(nodeType, position)
    },
    [reactFlowInstance, addNodeAt],
  )

  const onLabelChange = useCallback((nodeId, label) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, label } } : node,
      ),
    )
  }, [])

  const onParamChange = useCallback((nodeId, key, value) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, params: { ...node.data.params, [key]: value } } }
          : node,
      ),
    )
  }, [])

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null

  return (
    <div className="app-layout">
      <Palette onAddNode={onAddNodeFromPalette} />

      <div className="canvas-wrapper" ref={wrapperRef}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodesDelete={onNodesDelete}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onInit={setReactFlowInstance}
          onDragOver={onDragOver}
          onDrop={onDrop}
          deleteKeyCode={['Backspace', 'Delete']}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>

      <ParamsPanel node={selectedNode} onLabelChange={onLabelChange} onParamChange={onParamChange} />
    </div>
  )
}

function App() {
  return (
    <ReactFlowProvider>
      <AppInner />
    </ReactFlowProvider>
  )
}

export default App
