import { useCallback, useState } from 'react'
import { critiqueGraph } from '../api'

function CritiquePanel({ nodes, edges }) {
  const [critique, setCritique] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const runCritique = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: critiqueError } = await critiqueGraph(nodes, edges)
    setLoading(false)
    if (critiqueError) {
      setError(critiqueError)
      setCritique(null)
      return
    }
    setCritique(data.critique)
  }, [nodes, edges])

  return (
    <div className="critique-panel">
      <div className="critique-panel__header">
        <span className="critique-panel__title">Architecture critique</span>
        <button
          type="button"
          className="critique-panel__button"
          onClick={runCritique}
          disabled={loading || nodes.length === 0}
        >
          {loading ? 'Thinking…' : 'Critique architecture'}
        </button>
      </div>

      {error && <div className="critique-panel__error">{error}</div>}
      {critique && <div className="critique-panel__text">{critique}</div>}
    </div>
  )
}

export default CritiquePanel
