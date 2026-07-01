import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { applyTheme } from './lib/theme'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ProjectDetail from './pages/ProjectDetail'
import WeeklyView from './pages/WeeklyView'
import Settings from './pages/Settings'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('sb_theme') || '{}')
      applyTheme({ mode: 'system', color: 'indigo', font: 'system', ...saved })
    } catch {}
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => setSession(null), 5000)

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout)
      setSession(session)
    }).catch(() => {
      clearTimeout(timeout)
      setSession(null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/" element={
          <ProtectedRoute session={session}>
            <Dashboard session={session} />
          </ProtectedRoute>
        } />
        <Route path="/project/:id" element={
          <ProtectedRoute session={session}>
            <ProjectDetail session={session} />
          </ProtectedRoute>
        } />
        <Route path="/weekly" element={
          <ProtectedRoute session={session}>
            <WeeklyView session={session} />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute session={session}>
            <Settings session={session} />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
