import { NODE_TYPES } from '../nodeTypes'

function ParamsPanel({ node, onLabelChange, onParamChange }) {
  if (!node) {
    return (
      <aside className="params-panel">
        <p className="params-panel__empty">Select a node to edit its parameters.</p>
      </aside>
    )
  }

  const def = NODE_TYPES[node.data.nodeType]

  return (
    <aside className="params-panel">
      <h2 className="params-panel__title">{def.label}</h2>

      <label className="params-panel__field">
        <span>Label</span>
        <input
          type="text"
          value={node.data.label}
          onChange={(event) => onLabelChange(node.id, event.target.value)}
        />
      </label>

      {def.fields.map((field) => (
        <label className="params-panel__field" key={field.key}>
          <span>{field.label}</span>
          <input
            type="number"
            step={field.step}
            min={field.min}
            max={field.max}
            value={node.data.params[field.key]}
            onChange={(event) =>
              onParamChange(node.id, field.key, event.target.value === '' ? '' : Number(event.target.value))
            }
          />
        </label>
      ))}
    </aside>
  )
}

export default ParamsPanel