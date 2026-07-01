import { useState, useEffect } from 'react'

export const COLORS = {
  indigo: { label: 'Indigo', primary: '#6366f1', dark: '#4f46e5', light: '#eef2ff', swatch: '#6366f1' },
  pink:   { label: 'Pink',   primary: '#ec4899', dark: '#db2777', light: '#fdf2f8', swatch: '#ec4899' },
  orange: { label: 'Orange', primary: '#f97316', dark: '#ea580c', light: '#fff7ed', swatch: '#f97316' },
  purple: { label: 'Purple', primary: '#a855f7', dark: '#9333ea', light: '#faf5ff', swatch: '#a855f7' },
  blue:   { label: 'Blue',   primary: '#3b82f6', dark: '#2563eb', light: '#eff6ff', swatch: '#3b82f6' },
  green:  { label: 'Green',  primary: '#22c55e', dark: '#16a34a', light: '#f0fdf4', swatch: '#22c55e' },
}

export const FONTS = {
  system:    { label: 'System',            value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", url: null },
  inter:     { label: 'Inter',             value: "'Inter', sans-serif",             url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' },
  dm_sans:   { label: 'DM Sans',           value: "'DM Sans', sans-serif",           url: 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap' },
  playfair:  { label: 'Playfair Display',  value: "'Playfair Display', serif",       url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap' },
  jetbrains: { label: 'JetBrains Mono',   value: "'JetBrains Mono', monospace",     url: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap' },
}

const DEFAULT_THEME = { mode: 'system', color: 'indigo', font: 'system' }

function loadFont(font) {
  const config = FONTS[font]
  if (!config?.url) return
  const existing = document.getElementById('sb-google-font')
  if (existing) existing.remove()
  const link = document.createElement('link')
  link.id = 'sb-google-font'
  link.rel = 'stylesheet'
  link.href = config.url
  document.head.appendChild(link)
}

export function applyTheme({ mode, color, font }) {
  const root = document.documentElement

  const c = COLORS[color] || COLORS.indigo
  root.style.setProperty('--indigo', c.primary)
  root.style.setProperty('--indigo-dark', c.dark)
  root.style.setProperty('--indigo-light', c.light)

  const f = FONTS[font] || FONTS.system
  root.style.setProperty('--font', f.value)
  loadFont(font)

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = mode === 'dark' || (mode === 'system' && prefersDark)
  root.setAttribute('data-theme', isDark ? 'dark' : 'light')
}

export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    try {
      return { ...DEFAULT_THEME, ...JSON.parse(localStorage.getItem('sb_theme') || '{}') }
    } catch {
      return DEFAULT_THEME
    }
  })

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    if (theme.mode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme(theme)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  function setTheme(updates) {
    const next = { ...theme, ...updates }
    localStorage.setItem('sb_theme', JSON.stringify(next))
    setThemeState(next)
  }

  return { theme, setTheme }
}
