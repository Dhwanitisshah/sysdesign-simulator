import { Handle, Position } from 'reactflow'
import { NODE_TYPES } from '../nodeTypes'

function InfraNode({ data, selected }) {
  const def = NODE_TYPES[data.nodeType]

  return (
    <div className={`infra-node infra-node--${data.nodeType}${selected ? ' infra-node--selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <div className="infra-node__type">{def.label}</div>
      <div className="infra-node__label">{data.label}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}

export default InfraNode
