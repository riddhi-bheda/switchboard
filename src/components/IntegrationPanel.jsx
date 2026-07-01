import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import LinkResourceModal from './LinkResourceModal'

const PROVIDER_LABELS = { github: 'GitHub', notion: 'Notion' }

export default function IntegrationPanel({ projectId, userId }) {
  const navigate = useNavigate()
  const [integrations, setIntegrations] = useState([])
  const [accountStatus, setAccountStatus] = useState({ github: { connected: false }, notion: { connected: false } })
  const [loading, setLoading] = useState(true)
  const [linking, setLinking] = useState(null) // 'github' | 'notion' | null

  useEffect(() => {
    async function load() {
      const [intRes, statusRes] = await Promise.all([
        supabase.from('project_integrations').select('*').eq('project_id', projectId),
        fetch(`/api/oauth/status?user_id=${userId}`),
      ])
      if (intRes.data) setIntegrations(intRes.data)
      if (statusRes.ok) setAccountStatus(await statusRes.json())
      setLoading(false)
    }
    load()
  }, [projectId, userId])

  async function handleUnlink(provider) {
    await supabase.from('project_integrations').delete().eq('project_id', projectId).eq('provider', provider)
    setIntegrations(prev => prev.filter(i => i.provider !== provider))
  }

  function handleLinked(newIntegration) {
    setIntegrations(prev => {
      const without = prev.filter(i => i.provider !== newIntegration.provider)
      return [...without, newIntegration]
    })
  }

  if (loading) return null

  const providers = ['github', 'notion']

  return (
    <section className="section">
      <h2>🔌 Integrations</h2>
      <div className="integrations-panel">
        {providers.map(provider => {
          const linked = integrations.find(i => i.provider === provider)
          const connected = accountStatus[provider]?.connected

          return (
            <div key={provider} className="integration-row">
              <span className="integration-row-label">{PROVIDER_LABELS[provider]}</span>
              {linked ? (
                <div className="integration-row-linked">
                  <span className="integration-resource">{linked.resource_name || linked.resource_id}</span>
                  <button className="btn-link" onClick={() => handleUnlink(provider)}>Unlink</button>
                </div>
              ) : connected ? (
                <button className="btn btn-ghost btn-sm" onClick={() => setLinking(provider)}>
                  + Link
                </button>
              ) : (
                <button className="btn-link" onClick={() => navigate('/settings')}>
                  Connect in Settings →
                </button>
              )}
            </div>
          )
        })}
      </div>

      {linking && (
        <LinkResourceModal
          provider={linking}
          projectId={projectId}
          userId={userId}
          onClose={() => setLinking(null)}
          onLinked={handleLinked}
        />
      )}
    </section>
  )
}
