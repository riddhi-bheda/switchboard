import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fetchWeekEvents } from '../lib/calendar'

function formatEventTime(iso) {
  if (!iso) return ''
  if (iso.length === 10) return iso
  return new Date(iso).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function parseSummary(text) {
  if (!text) return []
  const sections = []
  const pattern = /\*\*([^*]+)\*\*([\s\S]*?)(?=\*\*|$)/g
  let match
  while ((match = pattern.exec(text)) !== null) {
    sections.push({ title: match[1].trim(), body: match[2].trim() })
  }
  return sections
}

export default function WeeklyView({ session }) {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [weekEvents, setWeekEvents] = useState([])
  const [summary, setSummary] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const [apiKey] = useState(() => sessionStorage.getItem('sb_api_key') || '')

  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  const weekLabel = weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

  useEffect(() => {
    async function load() {
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*, notes(text, created_at)')
        .eq('user_id', session.user.id)
        .in('status', ['active', 'stalled'])
        .order('created_at', { referencedTable: 'notes', ascending: false })

      setProjects(projectsData || [])

      if (session.provider_token) {
        const events = await fetchWeekEvents(session.provider_token)
        setWeekEvents(events)
      }

      setLoading(false)
    }
    load()
  }, [session.user.id, session.provider_token])

  async function handleGenerateSummary() {
    if (!apiKey) {
      setError('No API key found. Visit a project first to enter your Anthropic API key.')
      return
    }

    setGenerating(true)
    setError('')
    setSummary('')

    try {
      const res = await fetch('/api/weekly-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projects: projects.map(p => ({
            name: p.name,
            type: p.type,
            status: p.status,
            notes: (p.notes || []).slice(0, 5),
          })),
          calendarEvents: weekEvents,
          userApiKey: apiKey,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSummary(data.summary)
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setGenerating(false)
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(summary)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const sections = parseSummary(summary)

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
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>← Dashboard</button>
        </nav>
      </header>

      <main className="weekly-main">
        <div className="weekly-top">
          <div>
            <h1>This Week</h1>
            <p className="weekly-date">Week of {weekLabel}</p>
          </div>
          <button
            className="btn btn-primary btn-briefing"
            onClick={handleGenerateSummary}
            disabled={generating || projects.length === 0}
          >
            {generating ? (
              <><span className="spinner-sm" /> Generating...</>
            ) : (
              '⚡ Generate Weekly Briefing'
            )}
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {summary && (
          <div className="context-card">
            <div className="context-card-header">
              <div>
                <h3>Weekly Briefing</h3>
                <span className="context-card-project">Week of {weekLabel}</span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleCopy}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="context-sections">
              {sections.length > 0 ? sections.map((s, i) => (
                <div key={i} className="context-section">
                  <div className="context-section-label">
                    <strong>{s.title}</strong>
                  </div>
                  <p style={{ whiteSpace: 'pre-line' }}>{s.body}</p>
                </div>
              )) : (
                <p style={{ whiteSpace: 'pre-line' }}>{summary}</p>
              )}
            </div>
          </div>
        )}

        <div className="weekly-columns">
          <div className="weekly-left">
            <section className="section">
              <h2>Active Projects</h2>
              {projects.length === 0 ? (
                <p className="empty-state-sm">No active projects.</p>
              ) : (
                <div className="weekly-projects">
                  {projects.map(p => {
                    const lastNote = p.notes?.[0]
                    return (
                      <div
                        key={p.id}
                        className="weekly-project-row"
                        onClick={() => navigate(`/project/${p.id}`)}
                      >
                        <div className="weekly-project-info">
                          <span className={`status-dot status-${p.status}`} />
                          <strong>{p.name}</strong>
                        </div>
                        {lastNote && (
                          <p className="weekly-project-note">
                            {lastNote.text.length > 80 ? lastNote.text.slice(0, 80) + '…' : lastNote.text}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </div>

          <div className="weekly-right">
            <section className="section">
              <h2>📅 This Week's Calendar</h2>
              {!session.provider_token ? (
                <p className="empty-state-sm">Sign out and back in to connect Google Calendar.</p>
              ) : weekEvents.length === 0 ? (
                <p className="empty-state-sm">No events found this week.</p>
              ) : (
                <div className="events-list">
                  {weekEvents.map(event => (
                    <div key={event.id} className="event-item">
                      <span className="event-time">{formatEventTime(event.start)}</span>
                      <span className="event-name">{event.summary}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
