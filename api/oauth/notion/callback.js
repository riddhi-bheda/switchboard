import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  const { code, state } = req.query

  if (!code) return res.status(400).send('Missing code parameter')

  const userId = state?.split('_')[0]
  if (!userId) return res.status(400).send('Invalid state parameter')

  try {
    const host = req.headers['x-forwarded-host'] || req.headers.host
    const proto = req.headers['x-forwarded-proto'] || 'http'
    const redirectUri = `${proto}://${host}/api/oauth/notion/callback`

    const credentials = Buffer.from(`${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`).toString('base64')

    const tokenRes = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
    })
    const tokenData = await tokenRes.json()

    if (tokenData.error) {
      return res.status(400).send(`Notion OAuth error: ${tokenData.error}`)
    }

    const { access_token, workspace_name, workspace_icon, owner } = tokenData

    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    const { error } = await supabase
      .from('integration_tokens')
      .upsert({
        user_id: userId,
        provider: 'notion',
        access_token,
        meta: {
          workspace_name,
          workspace_icon,
          user_name: owner?.user?.name,
          user_avatar: owner?.user?.avatar_url,
        },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,provider' })

    if (error) {
      console.error('Supabase upsert error:', error)
      return res.status(500).send('Failed to save token')
    }

    return res.redirect(`${proto}://${host}/settings?connected=notion`)
  } catch (err) {
    console.error('Notion OAuth error:', err)
    return res.status(500).send('OAuth flow failed')
  }
}
