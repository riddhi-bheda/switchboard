import { createClient } from '@supabase/supabase-js'

function timeAgo(dateStr) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { user_id, project_id } = req.body
  if (!user_id || !project_id) return res.status(400).json({ error: 'user_id and project_id required' })

  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const [{ data: integration, error: intError }, { data: tokenRow, error: tokenError }] = await Promise.all([
    supabase.from('project_integrations').select('resource_id, resource_name').eq('project_id', project_id).eq('provider', 'github').single(),
    supabase.from('integration_tokens').select('access_token').eq('user_id', user_id).eq('provider', 'github').single(),
  ])

  if (intError || !integration) return res.status(404).json({ error: 'No GitHub integration for this project' })
  if (tokenError || !tokenRow) return res.status(404).json({ error: 'GitHub not connected' })

  const repo = integration.resource_id
  const headers = {
    'Authorization': `Bearer ${tokenRow.access_token}`,
    'Accept': 'application/vnd.github.v3+json',
  }
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  try {
    const [commitsRes, prsRes, issuesRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${repo}/commits?per_page=5&since=${since}`, { headers }),
      fetch(`https://api.github.com/repos/${repo}/pulls?state=open&per_page=10&sort=updated`, { headers }),
      fetch(`https://api.github.com/repos/${repo}/issues?state=open&per_page=10&sort=updated`, { headers }),
    ])
    const [commits, allPrs, allIssues] = await Promise.all([commitsRes.json(), prsRes.json(), issuesRes.json()])

    const recentCommits = Array.isArray(commits) ? commits : []
    const prs = Array.isArray(allPrs) ? allPrs : []
    const issues = Array.isArray(allIssues) ? allIssues.filter(i => !i.pull_request) : []

    const text = `Recent GitHub Activity (${repo}):
Recent commits (last 7 days):
${recentCommits.map(c => `- ${c.sha?.slice(0,7)} ${c.commit?.message?.split('\n')[0]} (${c.commit?.author?.name}, ${timeAgo(c.commit?.author?.date)})`).join('\n') || 'No commits in the last 7 days.'}

Open Pull Requests (${prs.length}):
${prs.map(pr => `- #${pr.number}: ${pr.title} [${pr.user?.login}]`).join('\n') || 'None'}

Open Issues (${issues.length}):
${issues.slice(0, 8).map(i => `- #${i.number}: ${i.title}`).join('\n') || 'None'}`

    return res.status(200).json({ text, repo })
  } catch (err) {
    console.error('GitHub fetch error:', err)
    return res.status(500).json({ error: 'Failed to fetch GitHub data' })
  }
}
