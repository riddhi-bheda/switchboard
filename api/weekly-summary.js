export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { projects, calendarEvents, userApiKey } = req.body

  if (!userApiKey) {
    return res.status(400).json({ error: 'Anthropic API key required' })
  }

  const projectSummaries = projects.map(p => {
    const recentNotes = (p.notes || []).slice(0, 3).map(n => `  - ${n.text}`).join('\n') || '  - No recent notes'
    return `**${p.name}** (${p.type}, ${p.status})\n${recentNotes}`
  }).join('\n\n')

  const eventsText = calendarEvents.length
    ? calendarEvents.map(e => `- ${e.summary} (${e.start})`).join('\n')
    : 'No calendar events this week.'

  const prompt = `You are a sharp productivity assistant. Generate a weekly briefing across all active projects.

This Week's Calendar Events:
${eventsText}

Projects & Recent Notes:
${projectSummaries}

Write a focused weekly briefing with these four sections. Be direct and practical — busy professional audience.

**This Week At a Glance**
2-3 sentence overview of the week's priorities and energy distribution.

**Project Pulse**
One sentence per project: where it stands and what matters most this week.

**Watch List**
The 2-3 things across all projects most at risk of stalling or needing urgent attention.

**This Week's Priorities**
The 3-5 most important actions across all projects, ordered by impact.`

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
        max_tokens: 700,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      return res.status(response.status).json({ error: err.error?.message || 'Claude API error' })
    }

    const data = await response.json()
    return res.status(200).json({ summary: data.content[0].text })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to reach Claude API' })
  }
}
