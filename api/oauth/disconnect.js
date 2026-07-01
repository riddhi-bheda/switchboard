import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' })

  const { user_id, provider } = req.body
  if (!user_id || !provider) return res.status(400).json({ error: 'user_id and provider required' })

  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const { error } = await supabase
    .from('integration_tokens')
    .delete()
    .eq('user_id', user_id)
    .eq('provider', provider)

  if (error) return res.status(500).json({ error: 'Failed to disconnect' })

  return res.status(200).json({ success: true })
}
