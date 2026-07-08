import { NODE_TYPES } from '../nodeTypes'

function formatLatency(seconds) {
  if (seconds == null) return 'Saturated'
  return `${(seconds * 1000).toFixed(1)} ms`
}

function formatAvailability(availability) {
  if (availability == null) return '—'
  return `${(availability * 100).toFixed(2)}%`
}

function formatCost(cost) {
  if (cost == null) return '—'
  return `$${cost.toFixed(2)}/hr`
}

function bottleneckLabel(system, nodes) {
  if (!system?.bottleneck_node_id) return '—'
  const node = nodes.find((n) => n.id === system.bottleneck_node_id)
  if (!node) return system.bottleneck_node_id
  return node.data.label || NODE_TYPES[node.data.nodeType]?.label || node.id
}

function SystemResultsPanel({ system, nodes }) {
  if (!system) return null

  return (
    <div className="system-results-panel">
      <div className="system-results-panel__item">
        <div className="system-results-panel__label">Latency</div>
        <div className="system-results-panel__value">{formatLatency(system.end_to_end_latency)}</div>
      </div>
      <div className="system-results-panel__item">
        <div className="system-results-panel__label">Availability</div>
        <div className="system-results-panel__value">{formatAvailability(system.system_availability)}</div>
      </div>
      <div className="system-results-panel__item">
        <div className="system-results-panel__label">Cost</div>
        <div className="system-results-panel__value">{formatCost(system.total_cost)}</div>
      </div>
      <div className="system-results-panel__item">
        <div className="system-results-panel__label">Bottleneck</div>
        <div className="system-results-panel__value">{bottleneckLabel(system, nodes)}</div>
      </div>
    </div>
  )
}

export default SystemResultsPanel
