const SECTIONS = [
  { key: 'Current Status', icon: '📍' },
  { key: 'Last Key Decision', icon: '✅' },
  { key: "What's Blocked / At Risk", icon: '⚠️' },
  { key: 'Next Action', icon: '▶️' },
  { key: 'Open Questions', icon: '❓' },
]

function parseBriefing(text) {
  const sections = {}

  for (let i = 0; i < SECTIONS.length; i++) {
    const current = SECTIONS[i].key
    const next = SECTIONS[i + 1]?.key

    const escapedCurrent = current.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = next
      ? `\\*\\*${escapedCurrent}\\*\\*([\\s\\S]*?)(?=\\*\\*${next.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\*\\*|$)`
      : `\\*\\*${escapedCurrent}\\*\\*([\\s\\S]*?)$`

    const match = text.match(new RegExp(pattern, 'i'))
    sections[current] = match ? match[1].trim() : ''
  }

  return sections
}

export default function ContextCard({ briefing, projectName, onCopy }) {
  const sections = parseBriefing(briefing)

  return (
    <div className="context-card">
      <div className="context-card-header">
        <div>
          <h3>Context Briefing</h3>
          <span className="context-card-project">{projectName}</span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onCopy}>
          Copy
        </button>
      </div>
      <div className="context-sections">
        {SECTIONS.map(({ key, icon }) => (
          <div key={key} className="context-section">
            <div className="context-section-label">
              <span>{icon}</span>
              <strong>{key}</strong>
            </div>
            <p>{sections[key] || '—'}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
