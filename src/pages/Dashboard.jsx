import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ProjectCard from '../components/ProjectCard'
import AddProjectModal from '../components/AddProjectModal'

const STATUS_ORDER = { active: 0, stalled: 1, upcoming: 2, completed: 3 }

export default function Dashboard({ session }) {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState('all')

  const user = session.user
  const name = user.user_metadata?.full_name?.split(' ')[0] || 'there'

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('projects')
        .select('*, notes(text, created_at)')
        .eq('user_id', user.id)
        .order('created_at', { referencedTable: 'notes', ascending: false })

      if (data) {
        const sorted = data.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
        setProjects(sorted)
      }
      setLoading(false)
    }
    load()
  }, [user.id])

  function handleProjectCreated(project) {
    setProjects(prev => [{ ...project, notes: [] }, ...prev])
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  const filtered = filter === 'all' ? projects : projects.filter(p => p.status === filter)

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
          <button className="btn btn-ghost btn-sm" onClick={handleSignOut}>Sign out</button>
        </nav>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-top">
          <div>
            <h1>Hey, {name} 👋</h1>
            <p className="dashboard-subtitle">
              {projects.filter(p => p.status === 'active').length} active project{projects.filter(p => p.status === 'active').length !== 1 ? 's' : ''} in flight
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + New Project
          </button>
        </div>

        <div className="filter-tabs">
          {['all', 'active', 'stalled', 'upcoming', 'completed'].map(f => (
            <button
              key={f}
              className={`filter-tab ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p>No projects here yet.</p>
            {filter === 'all' && (
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                Add your first project
              </button>
            )}
          </div>
        ) : (
          <div className="projects-grid">
            {filtered.map(project => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <AddProjectModal
          userId={user.id}
          onClose={() => setShowModal(false)}
          onCreated={handleProjectCreated}
        />
      )}
    </div>
  )
}
