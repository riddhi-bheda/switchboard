import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  const { code, state } = req.query

  if (!code) return res.status(400).send('Missing code parameter')

  const userId = state?.split('_')[0]
  if (!userId) return res.status(400).send('Invalid state parameter')

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    })
    const tokenData = await tokenRes.json()

    if (tokenData.error) {
      return res.status(400).send(`GitHub OAuth error: ${tokenData.error_description}`)
    }

    const { access_token, scope } = tokenData

    const userRes = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': `Bearer ${access_token}`, 'Accept': 'application/vnd.github.v3+json' },
    })
    const githubUser = await userRes.json()

    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    const { error } = await supabase
      .from('integration_tokens')
      .upsert({
        user_id: userId,
        provider: 'github',
        access_token,
        scope,
        meta: { login: githubUser.login, avatar_url: githubUser.avatar_url, name: githubUser.name },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,provider' })

    if (error) {
      console.error('Supabase upsert error:', error)
      return res.status(500).send('Failed to save token')
    }

    const host = req.headers['x-forwarded-host'] || req.headers.host
    const proto = req.headers['x-forwarded-proto'] || 'http'
    return res.redirect(`${proto}://${host}/settings?connected=github`)
  } catch (err) {
    console.error('GitHub OAuth error:', err)
    return res.status(500).send('OAuth flow failed')
  }
}
