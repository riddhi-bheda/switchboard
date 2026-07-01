export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { projectName, projectType, projectStatus, notes, calendarEvents, userApiKey, githubData, notionData } = req.body

  if (!userApiKey) {
    return res.status(400).json({ error: 'Anthropic API key required' })
  }

  const notesText = notes.length
    ? notes.map(n => `[${new Date(n.created_at).toLocaleDateString()}] ${n.text}`).join('\n')
    : 'No notes logged yet.'

  const eventsText = calendarEvents.length
    ? calendarEvents.map(e => `- ${e.summary} (${e.start})`).join('\n')
    : 'No upcoming calendar events.'

  const integrationText = [
    githubData ? githubData.text : null,
    notionData ? `Notion Content:\n${notionData.content}` : null,
  ].filter(Boolean).join('\n\n')

  const prompt = `You are a sharp productivity assistant. Generate a crisp context briefing for the following project.

Project: ${projectName}
Type: ${projectType}
Status: ${projectStatus}

Upcoming Calendar Events:
${eventsText}
${integrationText ? `\n${integrationText}\n` : ''}
Project Notes (newest first):
${notesText}

Write exactly five sections with these headers. Be specific, direct, and concise — 1-3 sentences per section max.

**Current Status**
Where things stand right now based on the notes.

**Last Key Decision**
The most recent important decision, milestone, or shift in direction.

**What's Blocked / At Risk**
Any blockers, open risks, or concerns that haven't been resolved.

**Next Action**
The single clearest next step to move this forward.

**Open Questions**
Unresolved questions that need answers before progress can continue. If none, say "None identified."`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': userApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      return res.status(response.status).json({ error: err.error?.message || 'Claude API error' })
    }

    const data = await response.json()
    return res.status(200).json({ briefing: data.content[0].text })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to reach Claude API' })
  }
}
