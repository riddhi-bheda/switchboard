import { useNavigate } from 'react-router-dom'

const TYPE_LABELS = {
  job_search: 'Job Search',
  trip: 'Trip',
  client_project: 'Client',
  personal_goal: 'Goal',
  conference: 'Conference',
  other: 'Other',
}

const STATUS_COLORS = {
  active: 'status-active',
  stalled: 'status-stalled',
  upcoming: 'status-upcoming',
  completed: 'status-completed',
}

export default function ProjectCard({ project }) {
  const navigate = useNavigate()
  const lastNote = project.notes?.[0]

  return (
    <div className="project-card" onClick={() => navigate(`/project/${project.id}`)}>
      <div className="project-card-header">
        <div>
          <span className="type-badge">{TYPE_LABELS[project.type] || project.type}</span>
          <span className={`status-badge ${STATUS_COLORS[project.status]}`}>{project.status}</span>
        </div>
      </div>
      <h3 className="project-card-name">{project.name}</h3>
      {project.description && (
        <p className="project-card-desc">{project.description}</p>
      )}
      {lastNote ? (
        <p className="project-card-note">
          <span className="note-date">{new Date(lastNote.created_at).toLocaleDateString()}</span>
          {' — '}{lastNote.text.length > 100 ? lastNote.text.slice(0, 100) + '…' : lastNote.text}
        </p>
      ) : (
        <p className="project-card-empty">No notes yet</p>
      )}
      <div className="project-card-footer">
        <span className="project-card-cta">Open →</span>
      </div>
    </div>
  )
}
