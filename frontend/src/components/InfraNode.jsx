import { Handle, Position } from 'reactflow'
import { NODE_TYPES } from '../nodeTypes'
import { useSimulationResult } from '../SimulationContext'

const WARNING_RHO = 0.8

function loadStateClass(rho, saturated) {
  if (saturated || (rho != null && rho >= 1)) return 'infra-node--critical'
  if (rho != null && rho >= WARNING_RHO) return 'infra-node--warning'
  return ''
}

function InfraNode({ id, data, selected }) {
  const def = NODE_TYPES[data.nodeType]
  const result = useSimulationResult(id)

  const classes = [
    'infra-node',
    `infra-node--${data.nodeType}`,
    selected ? 'infra-node--selected' : '',
    result ? loadStateClass(result.rho, result.saturated) : '',
    result?.isBottleneck ? 'infra-node--bottleneck' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes}>
      <Handle type="target" position={Position.Left} />
      {result?.isBottleneck && <div className="infra-node__bottleneck-badge">bottleneck</div>}
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
