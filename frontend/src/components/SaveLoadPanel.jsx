import { useCallback, useEffect, useState } from 'react'
import { deleteDesign, getDesign, listDesigns, saveDesign } from '../api'

function SaveLoadPanel({ nodes, edges, onLoadDesign }) {
  const [designs, setDesigns] = useState([])
  const [saving, setSaving] = useState(false)
  const [loadingId, setLoadingId] = useState(null)
  const [error, setError] = useState(null)

  const refreshDesigns = useCallback(async () => {
    const { data, error: listError } = await listDesigns()
    if (listError) {
      setError(listError)
      return
    }
    setDesigns(data)
  }, [])

  useEffect(() => {
    refreshDesigns()
  }, [refreshDesigns])

  const handleSave = useCallback(async () => {
    const name = window.prompt('Name this design:')
    if (!name) return
    setSaving(true)
    setError(null)
    const { error: saveError } = await saveDesign(nodes, edges, name)
    setSaving(false)
    if (saveError) {
      setError(saveError)
      return
    }
    refreshDesigns()
  }, [nodes, edges, refreshDesigns])

  const handleLoad = useCallback(
    async (id) => {
      setLoadingId(id)
      setError(null)
      const { data, error: loadError } = await getDesign(id)
      setLoadingId(null)
      if (loadError) {
        setError(loadError)
        return
      }
      onLoadDesign(data.graph)
    },
    [onLoadDesign],
  )

  const handleDelete = useCallback(
    async (id, event) => {
      event.stopPropagation()
      const { error: deleteError } = await deleteDesign(id)
      if (deleteError) {
        setError(deleteError)
        return
      }
      refreshDesigns()
    },
    [refreshDesigns],
  )

  return (
    <div className="save-load-panel">
      <div className="save-load-panel__header">
        <span className="save-load-panel__title">Saved designs</span>
        <button
          type="button"
          className="save-load-panel__button"
          onClick={handleSave}
          disabled={saving || nodes.length === 0}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {error && <div className="save-load-panel__error">{error}</div>}

      {designs.length > 0 && (
        <ul className="save-load-panel__list">
          {designs.map((design) => (
            <li
              key={design.id}
              className="save-load-panel__item"
              onClick={() => handleLoad(design.id)}
            >
              <span className="save-load-panel__item-name">
                {loadingId === design.id ? 'Loading…' : design.name}
              </span>
              <button
                type="button"
                className="save-load-panel__delete"
                onClick={(event) => handleDelete(design.id, event)}
                aria-label={`Delete ${design.name}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default SaveLoadPanel
