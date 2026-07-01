import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fetchCalendarEvents } from '../lib/calendar'
import ContextCard from '../components/ContextCard'
import IntegrationPanel from '../components/IntegrationPanel'

const LEGACY_TYPE_LABELS = {
  job_search: 'Job Search',
  trip: 'Trip Planning',
  client_project: 'Client Project',
  personal_goal: 'Personal Goal',
  conference: 'Conference',
  other: 'Other',
}

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatEventTime(iso) {
  if (!iso) return ''
  if (iso.length === 10) return iso
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function displayType(type) {
  return LEGACY_TYPE_LABELS[type] || type
}

export default function ProjectDetail({ session }) {
  const { id } = useParams()
  const navigate = useNavigate()

  const [project, setProject] = useState(null)
  const [notes, setNotes] = useState([])
  const [links, setLinks] = useState([])
  const [calendarEvents, setCalendarEvents] = useState([])
  const [loading, setLoading] = useState(true)

  const [noteText, setNoteText] = useState('')
  const [addingNote, setAddingNote] = useState(false)

  const [linkUrl, setLinkUrl] = useState('')
  const [linkLabel, setLinkLabel] = useState('')
  const [addingLink, setAddingLink] = useState(false)

  const [integrations, setIntegrations] = useState([])
  const [briefing, setBriefing] = useState('')
  const [generating, setGenerating] = useState(false)
  const [briefingError, setBriefingError] = useState('')

  const [apiKey, setApiKey] = useState(() => sessionStorage.getItem('sb_api_key') || '')
  const [showApiKeyInput, setShowApiKeyInput] = useState(false)
  const [copied, setCopied] = useState(false)

  const textareaRef = useRef(null)

  useEffect(() => {
    async function load() {
      const [{ data: projectData }, { data: notesData }, { data: linksData }, { data: intData }] = await Promise.all([
        supabase.from('projects').select('*').eq('id', id).single(),
        supabase.from('notes').select('*').eq('project_id', id).order('created_at', { ascending: false }),
        supabase.from('project_links').select('*').eq('project_id', id).order('created_at', { ascending: true }),
        supabase.from('project_integrations').select('*').eq('project_id', id),
      ])

      if (!projectData) {
        navigate('/')
        return
      }

      setProject(projectData)
      setNotes(notesData || [])
      setLinks(linksData || [])
      setIntegrations(intData || [])

      const providerToken = session.provider_token
      if (providerToken && projectData.keyword) {
        const events = await fetchCalendarEvents(providerToken, projectData.keyword)
        setCalendarEvents(events)
      }

      setLoading(false)
    }
    load()
  }, [id, session.provider_token, navigate])

  async function handleAddNote(e) {
    e.preventDefault()
    if (!noteText.trim()) return

    setAddingNote(true)
    const { data, error } = await supabase
      .from('notes')
      .insert({ project_id: id, user_id: session.user.id, text: noteText.trim() })
      .select()
      .single()

    setAddingNote(false)
    if (!error && data) {
      setNotes(prev => [data, ...prev])
      setNoteText('')
    }
  }

  async function handleAddLink(e) {
    e.preventDefault()
    if (!linkUrl.trim()) return

    setAddingLink(true)
    const { data, error } = await supabase
      .from('project_links')
      .insert({
        project_id: id,
        user_id: session.user.id,
        url: linkUrl.trim(),
        label: linkLabel.trim() || null,
      })
      .select()
      .single()

    setAddingLink(false)
    if (!error && data) {
      setLinks(prev => [...prev, data])
      setLinkUrl('')
      setLinkLabel('')
    }
  }

  async function handleDeleteLink(linkId) {
    await supabase.from('project_links').delete().eq('id', linkId)
    setLinks(prev => prev.filter(l => l.id !== linkId))
  }

  async function handleGetBriefing() {
    if (!apiKey) {
      setShowApiKeyInput(true)
      return
    }

    setGenerating(true)
    setBriefingError('')
    setBriefing('')

    try {
      const hasGitHub = integrations.some(i => i.provider === 'github')
      const hasNotion = integrations.some(i => i.provider === 'notion')

      const [githubData, notionData] = await Promise.all([
        hasGitHub
          ? fetch('/api/fetch-github', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: session.user.id, project_id: id }) }).then(r => r.ok ? r.json() : null).catch(() => null)
          : null,
        hasNotion
          ? fetch('/api/fetch-notion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: session.user.id, project_id: id }) }).then(r => r.ok ? r.json() : null).catch(() => null)
          : null,
      ])

      const res = await fetch('/api/generate-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: project.name,
          projectType: displayType(project.type),
          projectStatus: project.status,
          notes: notes.slice(0, 20),
          calendarEvents,
          userApiKey: apiKey,
          githubData,
          notionData,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setBriefing(data.briefing)
    } catch (err) {
      setBriefingError(err.message || 'Something went wrong')
    } finally {
      setGenerating(false)
    }
  }

  function saveApiKey(key) {
    setApiKey(key)
    sessionStorage.setItem('sb_api_key', key)
    setShowApiKeyInput(false)
  }

  function handleCopy() {
    navigator.clipboard.writeText(briefing)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return <div className="loading-screen"><div className="spinner" /></div>
  }

  return (
    <div className="page">
      <header className="app-header">
        <div className="header-brand" onClick={() => navigate('/')}>
          <svg width="28" height="28" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="8" fill="#6366f1"/>
            <circle cx="8" cy="16" r="3" fill="white"/>
            <circle cx="16" cy="10" r="3" fill="white"/>
            <circle cx="24" cy="16" r="3" fill="white"/>
            <circle cx="16" cy="22" r="3" fill="white"/>
            <line x1="11" y1="14.5" x2="13.5" y2="11.5" stroke="white" strokeWidth="1.5"/>
            <line x1="18.5" y1="11.5" x2="21" y2="14.5" stroke="white" strokeWidth="1.5"/>
            <line x1="11" y1="17.5" x2="13.5" y2="20.5" stroke="white" strokeWidth="1.5"/>
            <line x1="18.5" y1="20.5" x2="21" y2="17.5" stroke="white" strokeWidth="1.5"/>
          </svg>
          <span>Switchboard</span>
        </div>
        <nav className="header-nav">
          <button className="nav-link" onClick={() => navigate('/weekly')}>This Week</button>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>← All Projects</button>
        </nav>
      </header>

      <main className="detail-main">
        <div className="detail-top">
          <div className="detail-meta">
            <h1>{project.name}</h1>
            <div className="detail-badges">
              <span className="type-badge">{displayType(project.type)}</span>
              <span className={`status-badge status-${project.status}`}>{project.status}</span>
              {project.keyword && (
                <span className="keyword-badge">📅 {project.keyword}</span>
              )}
            </div>
            {project.description && <p className="detail-description">{project.description}</p>}
          </div>

          <button
            className="btn btn-primary btn-briefing"
            onClick={handleGetBriefing}
            disabled={generating}
          >
            {generating ? (
              <><span className="spinner-sm" /> Generating...</>
            ) : (
              '⚡ Get me up to speed'
            )}
          </button>
        </div>

        {showApiKeyInput && (
          <ApiKeyPrompt onSave={saveApiKey} onCancel={() => setShowApiKeyInput(false)} />
        )}

        {briefingError && (
          <div className="error-banner">
            {briefingError}
            {briefingError.toLowerCase().includes('api key') && (
              <button className="btn btn-ghost btn-sm" onClick={() => setShowApiKeyInput(true)}>
                Update key
              </button>
            )}
          </div>
        )}

        {briefing && (
          <ContextCard
            briefing={briefing}
            projectName={project.name}
            onCopy={handleCopy}
          />
        )}
        {copied && <div className="toast">Copied to clipboard!</div>}

        <div className="detail-columns">
          <div className="detail-left">
            <section className="section">
              <h2>Log a note</h2>
              <form onSubmit={handleAddNote} className="note-form">
                <textarea
                  ref={textareaRef}
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="What happened? What did you decide? What's next?..."
                  rows={4}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddNote(e)
                  }}
                />
                <div className="note-form-footer">
                  <span className="hint">⌘↵ to save</span>
                  <button type="submit" className="btn btn-primary" disabled={addingNote || !noteText.trim()}>
                    {addingNote ? 'Saving...' : 'Save note'}
                  </button>
                </div>
              </form>
            </section>

            <section className="section">
              <h2>Notes</h2>
              {notes.length === 0 ? (
                <p className="empty-state-sm">No notes yet. Log your first update above.</p>
              ) : (
                <div className="notes-list">
                  {notes.map(note => (
                    <div key={note.id} className="note-item">
                      <span className="note-timestamp">{formatDate(note.created_at)}</span>
                      <p>{note.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="detail-right">
            <section className="section">
              <h2>🔗 Links</h2>
              <form onSubmit={handleAddLink} className="link-form">
                <input
                  type="url"
                  placeholder="https://..."
                  value={linkUrl}
                  onChange={e => setLinkUrl(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Label (optional)"
                  value={linkLabel}
                  onChange={e => setLinkLabel(e.target.value)}
                />
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={addingLink || !linkUrl.trim()}
                >
                  {addingLink ? 'Adding…' : 'Add link'}
                </button>
              </form>
              {links.length > 0 && (
                <div className="links-list">
                  {links.map(link => (
                    <div key={link.id} className="link-item">
                      <a href={link.url} target="_blank" rel="noreferrer" className="link-anchor">
                        <span className="link-label">{link.label || link.url}</span>
                        {link.label && <span className="link-url">{link.url}</span>}
                      </a>
                      <button
                        className="link-delete"
                        onClick={() => handleDeleteLink(link.id)}
                        aria-label="Remove link"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {links.length === 0 && (
                <p className="empty-state-sm">No links yet. Paste a Notion doc, Google Doc, or any URL above.</p>
              )}
            </section>

            <section className="section">
              <h2>📅 Upcoming Events</h2>
              {!session.provider_token ? (
                <p className="empty-state-sm">Calendar not connected. Sign out and sign back in to connect Google Calendar.</p>
              ) : !project.keyword ? (
                <p className="empty-state-sm">Set a calendar keyword in project settings to pull related events.</p>
              ) : calendarEvents.length === 0 ? (
                <p className="empty-state-sm">No events found matching "{project.keyword}" in the next 2 weeks.</p>
              ) : (
                <div className="events-list">
                  {calendarEvents.map(event => (
                    <div key={event.id} className="event-item">
                      <span className="event-time">{formatEventTime(event.start)}</span>
                      <span className="event-name">{event.summary}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <IntegrationPanel projectId={id} userId={session.user.id} />

            {apiKey && (
              <div className="api-key-status">
                <span>🔑 API key saved for session</span>
                <button className="btn-link" onClick={() => setShowApiKeyInput(true)}>Change</button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function ApiKeyPrompt({ onSave, onCancel }) {
  const [key, setKey] = useState('')

  return (
    <div className="api-key-prompt">
      <div className="api-key-prompt-inner">
        <h3>Enter your Anthropic API key</h3>
        <p>Your key is stored only for this browser session and never sent to our servers.</p>
        <div className="api-key-row">
          <input
            type="password"
            placeholder="sk-ant-..."
            value={key}
            onChange={e => setKey(e.target.value)}
            autoFocus
          />
          <button className="btn btn-primary" onClick={() => onSave(key)} disabled={!key.trim()}>
            Save & Generate
          </button>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        </div>
        <p className="hint">
          Get your key at <a href="https://console.anthropic.com" target="_blank" rel="noreferrer">console.anthropic.com</a>
        </p>
      </div>
    </div>
  )
}
