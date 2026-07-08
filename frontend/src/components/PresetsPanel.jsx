import { PRESETS } from '../presets'

function PresetsPanel({ onLoadPreset }) {
  return (
    <div className="presets-panel">
      <h2 className="presets-panel__title">Presets</h2>
      <p className="presets-panel__hint">Load a working architecture</p>
      {PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          className="presets-panel__item"
          title={preset.description}
          onClick={() => onLoadPreset(preset)}
        >
          {preset.label}
        </button>
      ))}
    </div>
  )
}

export default PresetsPanel
