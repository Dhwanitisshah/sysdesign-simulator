import { useCallback, useEffect, useRef, useState } from 'react'
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
import SystemResultsPanel from './components/SystemResultsPanel'
import LatencyChart from './components/LatencyChart'
import CritiquePanel from './components/CritiquePanel'
import SaveLoadPanel from './components/SaveLoadPanel'
import { NODE_TYPES } from './nodeTypes'
import { fromGraph, simulateGraph } from './api'
import { SimulationResultsContext } from './SimulationContext'

const SIMULATE_DEBOUNCE_MS = 400

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
  const [simResults, setSimResults] = useState({ nodes: {}, system: null })
  const [simError, setSimError] = useState(null)
  const wrapperRef = useRef(null)

  useEffect(() => {
    if (nodes.length === 0) {
      setSimResults({ nodes: {}, system: null })
      setSimError(null)
      return
    }

    let cancelled = false
    const timeout = setTimeout(async () => {
      const { data, error } = await simulateGraph(nodes, edges)
      if (cancelled) return
      if (error) {
        setSimError(error)
        setSimResults({ nodes: {}, system: null })
      } else {
        setSimError(null)
        setSimResults({ nodes: data.nodes, system: data })
      }
    }, SIMULATE_DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [nodes, edges])

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

  const onLoadDesign = useCallback((graph) => {
    const { nodes: loadedNodes, edges: loadedEdges } = fromGraph(graph)
    setNodes(loadedNodes)
    setEdges(loadedEdges)
    setSelectedNodeId(null)
  }, [])

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null

  return (
    <div className="app-layout">
      <Palette onAddNode={onAddNodeFromPalette} />

      <div className="canvas-wrapper" ref={wrapperRef}>
        <CritiquePanel nodes={nodes} edges={edges} />
        <div className="top-right-stack">
          <SaveLoadPanel nodes={nodes} edges={edges} onLoadDesign={onLoadDesign} />
          <SystemResultsPanel system={simResults.system} nodes={nodes} />
        </div>
        {simError && <div className="sim-error-banner">{simError}</div>}
        <SimulationResultsContext.Provider value={simResults}>
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
        </SimulationResultsContext.Provider>
        <LatencyChart nodes={nodes} edges={edges} />
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
