import { createClient } from '@supabase/supabase-js'

function blocksToText(blocks) {
  return blocks.map(block => {
    const type = block.type
    const content = block[type]
    if (!content?.rich_text) return null
    const text = content.rich_text.map(rt => rt.plain_text).join('')
    if (!text.trim()) return null
    if (type === 'heading_1') return `# ${text}`
    if (type === 'heading_2') return `## ${text}`
    if (type === 'heading_3') return `### ${text}`
    if (type === 'bulleted_list_item' || type === 'numbered_list_item') return `• ${text}`
    return text
  }).filter(Boolean).slice(0, 30).join('\n')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { user_id, project_id } = req.body
  if (!user_id || !project_id) return res.status(400).json({ error: 'user_id and project_id required' })

  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const [{ data: integration, error: intError }, { data: tokenRow, error: tokenError }] = await Promise.all([
    supabase.from('project_integrations').select('resource_id, resource_name, resource_type').eq('project_id', project_id).eq('provider', 'notion').single(),
    supabase.from('integration_tokens').select('access_token').eq('user_id', user_id).eq('provider', 'notion').single(),
  ])

  if (intError || !integration) return res.status(404).json({ error: 'No Notion integration for this project' })
  if (tokenError || !tokenRow) return res.status(404).json({ error: 'Notion not connected' })

  const { resource_id, resource_name, resource_type } = integration
  const headers = {
    'Authorization': `Bearer ${tokenRow.access_token}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  }

  try {
    let content = ''

    if (resource_type === 'database') {
      const dbRes = await fetch(`https://api.notion.com/v1/databases/${resource_id}/query`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }], page_size: 5 }),
      })
      const dbData = await dbRes.json()
      if (dbData.results) {
        const entries = dbData.results.map(page => {
          const titleProp = Object.values(page.properties || {}).find(p => p.type === 'title')
          const title = titleProp?.title?.map(t => t.plain_text).join('') || 'Untitled'
          const edited = new Date(page.last_edited_time).toLocaleDateString()
          return `- ${title} (edited ${edited})`
        }).join('\n')
        content = `Recent entries in ${resource_name || 'Notion database'}:\n${entries}`
      }
    } else {
      const blocksRes = await fetch(`https://api.notion.com/v1/blocks/${resource_id}/children?page_size=50`, { headers })
      const blocksData = await blocksRes.json()
      if (blocksData.results) {
        content = `Notion page "${resource_name || resource_id}":\n${blocksToText(blocksData.results)}`
      }
    }

    return res.status(200).json({ content })
  } catch (err) {
    console.error('Notion fetch error:', err)
    return res.status(500).json({ error: 'Failed to fetch Notion data' })
  }
}
