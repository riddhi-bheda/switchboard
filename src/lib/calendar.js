export async function fetchCalendarEvents(providerToken, keyword) {
  if (!providerToken || !keyword) return []

  const now = new Date()
  const twoWeeksOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

  const params = new URLSearchParams({
    timeMin: now.toISOString(),
    timeMax: twoWeeksOut.toISOString(),
    q: keyword,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '10',
  })

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${providerToken}` } }
  )

  if (!response.ok) return []

  const data = await response.json()
  return (data.items || []).map(event => ({
    id: event.id,
    summary: event.summary || '(no title)',
    start: event.start?.dateTime || event.start?.date || '',
    end: event.end?.dateTime || event.end?.date || '',
    description: event.description || '',
  }))
}

export async function fetchWeekEvents(providerToken) {
  if (!providerToken) return []

  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 7)

  const params = new URLSearchParams({
    timeMin: startOfWeek.toISOString(),
    timeMax: endOfWeek.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '50',
  })

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${providerToken}` } }
  )

  if (!response.ok) return []

  const data = await response.json()
  return (data.items || []).map(event => ({
    id: event.id,
    summary: event.summary || '(no title)',
    start: event.start?.dateTime || event.start?.date || '',
    end: event.end?.dateTime || event.end?.date || '',
  }))
}
