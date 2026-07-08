import { Handle, Position } from 'reactflow'
import { NODE_TYPES } from '../nodeTypes'
import { useSimulationResult } from '../SimulationContext'

function InfraNode({ id, data, selected }) {
  const def = NODE_TYPES[data.nodeType]
  const result = useSimulationResult(id)

  return (
    <div className={`infra-node infra-node--${data.nodeType}${selected ? ' infra-node--selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <div className="infra-node__type">{def.label}</div>
      <div className="infra-node__label">{data.label}</div>
      {result && (
        <div className="infra-node__stats">
          {result.saturated ? (
            <span className="infra-node__saturated">saturated</span>
          ) : (
            <>
              {result.wait_time != null && <span>wait: {(result.wait_time * 1000).toFixed(1)}ms</span>}
              {result.rho != null && <span>ρ: {result.rho.toFixed(2)}</span>}
            </>
          )}
        </div>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  )
}

export default InfraNode
