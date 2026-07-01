import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTheme, COLORS, FONTS } from '../lib/theme'

const PROVIDERS = [
  {
    id: 'github',
    label: 'GitHub',
    description: 'Pull recent commits, open PRs, and issues into your briefings.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
      </svg>
    ),
  },
  {
    id: 'google_drive',
    label: 'Google Drive',
    description: 'Pull recent docs and files into your briefings. Uses your existing Google login.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
        <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 53H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066DA"/>
        <path d="M43.65 25L29.9 1.2C28.55 2 27.4 3.1 26.6 4.5L1.2 48.5C.4 49.9 0 51.45 0 53h27.5z" fill="#00AC47"/>
        <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 11.5z" fill="#EA4335"/>
        <path d="M43.65 25L57.4 1.2C56.05.4 54.5 0 52.95 0H34.35c-1.55 0-3.1.4-4.45 1.2z" fill="#00832D"/>
        <path d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.45 1.2h50.9c1.55 0 3.1-.4 4.45-1.2z" fill="#2684FC"/>
        <path d="M73.4 26.5l-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25 59.8 53h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#FFBA00"/>
      </svg>
    ),
  },
  {
    id: 'notion',
    label: 'Notion',
    description: 'Pull page content and database entries into your briefings.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.081.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.448-1.632z"/>
      </svg>
    ),
  },
]

const TABS = [
  { id: 'appearance', label: 'Appearance', icon: '🎨' },
  { id: 'integrations', label: 'Integrations', icon: '🔌' },
  { id: 'ai', label: 'AI', icon: '⚡' },
  { id: 'account', label: 'Account', icon: '👤' },
]

export default function Settings({ session }) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState('appearance')
  const { theme, setTheme } = useTheme()

  // Integrations state
  const [status, setStatus] = useState({ github: { connected: false }, notion: { connected: false }, google_drive: { connected: false } })
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [disconnecting, setDisconnecting] = useState('')
  const [toast, setToast] = useState('')

  // AI tab state
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('sb_api_key') || sessionStorage.getItem('sb_api_key') || '')
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [apiKeySaved, setApiKeySaved] = useState(false)

  // Account state
  const [profile, setProfile] = useState(null)

  const userId = session.user.id

  useEffect(() => {
    fetchIntegrationStatus()
    fetchProfile()
  }, [userId])

  useEffect(() => {
    const connected = searchParams.get('connected')
    if (connected) {
      setToast(`${connected.charAt(0).toUpperCase() + connected.slice(1)} connected!`)
      setActiveTab('integrations')
      setTimeout(() => setToast(''), 3000)
      setSearchParams({})
      fetchIntegrationStatus()
    }
  }, [searchParams])

  async function fetchIntegrationStatus() {
    setLoadingStatus(true)
    const res = await fetch(`/api/oauth/status?user_id=${userId}`)
    if (res.ok) {
      const data = await res.json()
      if (session.provider_token) {
        data.google_drive = { connected: true, workspace_name: session.user.email }
      }
      setStatus(data)
    }
    setLoadingStatus(false)
  }

  async function fetchProfile() {
    const { data } = await supabase.from('profiles').select('name, email').eq('id', userId).single()
    if (data) setProfile(data)
  }

  function connectGitHub() {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID
    if (!clientId) return alert('GitHub Client ID not configured. Add VITE_GITHUB_CLIENT_ID to your .env file.')
    const state = `${userId}_${Math.random().toString(36).slice(2)}`
    const redirectUri = `${window.location.origin}/api/oauth/github/callback`
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=public_repo+read:user&state=${state}`
  }

  function connectNotion() {
    const clientId = import.meta.env.VITE_NOTION_CLIENT_ID
    if (!clientId) return alert('Notion Client ID not configured. Add VITE_NOTION_CLIENT_ID to your .env file.')
    const state = `${userId}_${Math.random().toString(36).slice(2)}`
    const redirectUri = `${window.location.origin}/api/oauth/notion/callback`
    window.location.href = `https://api.notion.com/v1/oauth/authorize?client_id=${clientId}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`
  }

  function connectGoogleDrive() {
    alert('Google Drive uses your existing Google login — it\'s already connected! Sign out and back in if you added it recently.')
  }

  const connectFn = { github: connectGitHub, notion: connectNotion, google_drive: connectGoogleDrive }

  async function disconnect(provider) {
    setDisconnecting(provider)
    await fetch('/api/oauth/disconnect', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, provider }),
    })
    setDisconnecting('')
    fetchIntegrationStatus()
  }

  function saveApiKey() {
    const key = apiKeyInput.trim()
    if (!key) return
    localStorage.setItem('sb_api_key', key)
    sessionStorage.setItem('sb_api_key', key)
    setApiKey(key)
    setApiKeyInput('')
    setApiKeySaved(true)
    setTimeout(() => setApiKeySaved(false), 2000)
  }

  function removeApiKey() {
    localStorage.removeItem('sb_api_key')
    sessionStorage.removeItem('sb_api_key')
    setApiKey('')
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

      <main className="settings-main">
        <h1 style={{ marginBottom: '28px' }}>Settings</h1>

        <div className="settings-layout">
          <nav className="settings-tabs">
            {TABS.map(tab => (
              <button
                key={tab.id}
                className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="settings-content">
            {activeTab === 'appearance' && (
              <div className="appearance-section">
                <div className="appearance-block">
                  <h3>Mode</h3>
                  <div className="mode-options">
                    {['light', 'system', 'dark'].map(mode => (
                      <button
                        key={mode}
                        className={`mode-option ${theme.mode === mode ? 'active' : ''}`}
                        onClick={() => setTheme({ mode })}
                      >
                        {mode === 'light' ? '☀️ Light' : mode === 'dark' ? '🌙 Dark' : '💻 System'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="appearance-block">
                  <h3>Color</h3>
                  <div className="color-swatches">
                    {Object.entries(COLORS).map(([key, c]) => (
                      <div key={key} className="color-swatch-item">
                        <button
                          className={`color-swatch ${theme.color === key ? 'active' : ''}`}
                          style={{ background: c.swatch }}
                          onClick={() => setTheme({ color: key })}
                          title={c.label}
                        />
                        <span className="color-swatch-label">{c.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="appearance-block">
                  <h3>Font</h3>
                  <div className="font-options">
                    {Object.entries(FONTS).map(([key, f]) => (
                      <button
                        key={key}
                        className={`font-option ${theme.font === key ? 'active' : ''}`}
                        onClick={() => setTheme({ font: key })}
                      >
                        <span className="font-option-name" style={{ fontFamily: f.value }}>{f.label}</span>
                        <span className="font-option-preview" style={{ fontFamily: f.value }}>Aa Bb 123</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'integrations' && (
              <div>
                <p className="settings-subtitle">Connect your tools so Switchboard can pull live context into your briefings.</p>
                {loadingStatus ? (
                  <div className="loading-center"><div className="spinner" /></div>
                ) : (
                  <div className="integrations-list">
                    {PROVIDERS.map(provider => {
                      const providerStatus = status[provider.id]
                      const isConnected = providerStatus?.connected
                      return (
                        <div key={provider.id} className="integration-card">
                          <div className="integration-card-left">
                            <div className="integration-icon">{provider.icon}</div>
                            <div>
                              <div className="integration-name">{provider.label}</div>
                              <div className="integration-desc">{provider.description}</div>
                              {isConnected && providerStatus.login && (
                                <div className="integration-connected-as">@{providerStatus.login}</div>
                              )}
                              {isConnected && providerStatus.workspace_name && (
                                <div className="integration-connected-as">{providerStatus.workspace_name}</div>
                              )}
                            </div>
                          </div>
                          <div className="integration-card-right">
                            {isConnected ? (
                              <div className="integration-actions">
                                <span className="integration-badge">Connected</span>
                                {provider.id !== 'google_drive' && (
                                  <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => disconnect(provider.id)}
                                    disabled={disconnecting === provider.id}
                                  >
                                    {disconnecting === provider.id ? '…' : 'Disconnect'}
                                  </button>
                                )}
                              </div>
                            ) : (
                              <button className="btn btn-primary btn-sm" onClick={connectFn[provider.id]}>
                                Connect
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="ai-section">
                <p className="ai-description">
                  Switchboard uses Claude (by Anthropic) to generate your project briefings. Your API key is stored locally in your browser and never sent to our servers.
                </p>
                {apiKey ? (
                  <div className="section" style={{ gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>API key saved</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {apiKey.slice(0, 12)}••••••••••••
                        </div>
                      </div>
                      <button className="btn btn-ghost btn-sm" onClick={removeApiKey}>Remove</button>
                    </div>
                  </div>
                ) : (
                  <div className="section" style={{ gap: '12px' }}>
                    <div className="form-group">
                      <label>Anthropic API Key</label>
                      <input
                        type="password"
                        placeholder="sk-ant-..."
                        value={apiKeyInput}
                        onChange={e => setApiKeyInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveApiKey()}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <button className="btn btn-primary btn-sm" onClick={saveApiKey} disabled={!apiKeyInput.trim()}>
                        {apiKeySaved ? 'Saved!' : 'Save key'}
                      </button>
                      <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" className="hint">
                        Get a key at console.anthropic.com →
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'account' && (
              <div className="account-section">
                <div className="account-info">
                  <div className="account-avatar">
                    {(profile?.name || session.user.email || '?')[0].toUpperCase()}
                  </div>
                  <div className="account-details">
                    <div className="account-name">{profile?.name || '—'}</div>
                    <div className="account-email">{session.user.email}</div>
                  </div>
                </div>
                <div>
                  <button
                    className="btn btn-ghost"
                    onClick={() => supabase.auth.signOut()}
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {toast && <div className="toast">{toast}</div>}
      </main>
    </div>
  )
}
