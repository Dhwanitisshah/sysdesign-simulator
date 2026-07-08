import { NODE_TYPES, PALETTE_ORDER } from '../nodeTypes'

function Palette({ onAddNode }) {
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <aside className="palette">
      <h2 className="palette__title">Add node</h2>
      <p className="palette__hint">Click or drag onto the canvas</p>
      {PALETTE_ORDER.map((nodeType) => (
        <button
          key={nodeType}
          className={`palette__item palette__item--${nodeType}`}
          draggable
          onDragStart={(event) => onDragStart(event, nodeType)}
          onClick={() => onAddNode(nodeType)}
        >
          {NODE_TYPES[nodeType].label}
        </button>
      ))}
    </aside>
  )
}

export default Palette