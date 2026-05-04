import { useState } from 'react'
import { supabase } from '../lib/supabase'

const PROJECT_TYPES = [
  { value: 'job_search', label: 'Job Search' },
  { value: 'trip', label: 'Trip Planning' },
  { value: 'client_project', label: 'Client Project' },
  { value: 'personal_goal', label: 'Personal Goal' },
  { value: 'conference', label: 'Conference / Event' },
  { value: 'other', label: 'Other' },
]

const PROJECT_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'stalled', label: 'Stalled' },
  { value: 'completed', label: 'Completed' },
]

export default function AddProjectModal({ userId, onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '',
    type: 'job_search',
    status: 'active',
    description: '',
    keyword: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return

    setSaving(true)
    setError('')

    const { data, error } = await supabase
      .from('projects')
      .insert({ ...form, user_id: userId })
      .select()
      .single()

    setSaving(false)

    if (error) {
      setError(error.message)
      return
    }

    onCreated(data)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Project</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Project name</label>
            <input
              type="text"
              placeholder="e.g. Grace Hopper Conference Prep"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Type</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}>
                {PROJECT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}>
                {PROJECT_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Calendar keyword</label>
            <input
              type="text"
              placeholder="e.g. GHC, Aruba, Marathon — used to find related calendar events"
              value={form.keyword}
              onChange={e => set('keyword', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Description <span className="optional">(optional)</span></label>
            <textarea
              placeholder="What's this project about?"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={3}
            />
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
