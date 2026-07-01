import { useState } from 'react'
import { supabase } from '../lib/supabase'

function extractNotionId(input) {
  const clean = input.replace(/-/g, '')
  const match = clean.match(/([a-f0-9]{32})/i)
  if (!match) return null
  const raw = match[1]
  return `${raw.slice(0,8)}-${raw.slice(8,12)}-${raw.slice(12,16)}-${raw.slice(16,20)}-${raw.slice(20)}`
}

export default function LinkResourceModal({ provider, projectId, userId, onClose, onLinked }) {
  const [input, setInput] = useState('')
  const [label, setLabel] = useState('')
  const [resourceType, setResourceType] = useState('page')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isGitHub = provider === 'github'
  const isNotion = provider === 'notion'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    let resource_id = input.trim()
    let resource_name = label.trim() || resource_id
    let resource_type = isGitHub ? 'repo' : resourceType

    if (isGitHub) {
      if (!/^[\w.-]+\/[\w.-]+$/.test(resource_id)) {
        setError('Enter a valid repo in the format owner/repo')
        return
      }
    }

    if (isNotion) {
      const parsed = extractNotionId(input)
      if (!parsed) {
        setError('Could not parse a Notion page ID from that URL. Paste the full Notion page URL.')
        return
      }
      resource_id = parsed
    }

    setSaving(true)
    const { data, error: dbError } = await supabase
      .from('project_integrations')
      .upsert({
        project_id: projectId,
        user_id: userId,
        provider,
        resource_id,
        resource_name,
        resource_type,
      }, { onConflict: 'project_id,provider' })
      .select()
      .single()

    setSaving(false)

    if (dbError) {
      setError('Failed to save. Try again.')
      return
    }

    onLinked(data)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>Link {isGitHub ? 'GitHub Repo' : 'Notion Page'}</h2>

        <form onSubmit={handleSubmit} className="modal-form">
          {isGitHub && (
            <div className="form-group">
              <label>Repository</label>
              <input
                type="text"
                placeholder="owner/repo"
                value={input}
                onChange={e => setInput(e.target.value)}
                autoFocus
              />
              <span className="hint">e.g. acme-corp/api or my-username/my-project</span>
            </div>
          )}

          {isNotion && (
            <>
              <div className="form-group">
                <label>Notion Page URL</label>
                <input
                  type="text"
                  placeholder="https://notion.so/..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  autoFocus
                />
                <span className="hint">Paste the full URL from your browser</span>
              </div>
              <div className="form-group">
                <label>Type</label>
                <select value={resourceType} onChange={e => setResourceType(e.target.value)}>
                  <option value="page">Page</option>
                  <option value="database">Database</option>
                </select>
              </div>
            </>
          )}

          <div className="form-group">
            <label>Label (optional)</label>
            <input
              type="text"
              placeholder={isGitHub ? 'e.g. Backend API' : 'e.g. Product Roadmap'}
              value={label}
              onChange={e => setLabel(e.target.value)}
            />
          </div>

          {error && <div className="error-banner">{error}</div>}

          <div className="modal-actions">
            <button type="submit" className="btn btn-primary" disabled={saving || !input.trim()}>
              {saving ? 'Saving…' : 'Link'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        </form>

        {isNotion && (
          <p className="hint" style={{ marginTop: '1rem' }}>
            Make sure you've shared this page with your Switchboard integration inside Notion.
          </p>
        )}
      </div>
    </div>
  )
}
