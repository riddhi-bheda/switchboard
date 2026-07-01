import { supabase } from '../lib/supabase'

export default function Login() {
  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/drive.readonly',
        redirectTo: window.location.origin,
      },
    })
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <svg width="40" height="40" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="8" fill="#6366f1"/>
            <circle cx="8" cy="16" r="3" fill="white"/>
            <circle cx="16" cy="10" r="3" fill="white"/>
            <circle cx="24" cy="16" r="3" fill="white"/>
            <circle cx="16" cy="22" r="3" fill="white"/>
            <line x1="11" y1="14.5" x2="13.5" y2="11.5" stroke="white" strokeWidth="1.5"/>
            <line x1="18.5" y1="11.5" x2="21" y2="14.5" stroke="white" strokeWidth="1.5"/>
            <line x1="11" y1="17.5" x2="13.5" y2="20.5" stroke="white" strokeWidth="1.5"/>
            <line x1="18.5" y1="20.5" x2="21" y2="17.5" stroke="white" strokeWidth="1.5"/>
          </svg>
          <h1>Switchboard</h1>
        </div>
        <p className="login-tagline">
          Reload context on any project in 30 seconds. No more re-reading old notes.
        </p>
        <button className="btn btn-google" onClick={handleGoogleLogin}>
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.96L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>
        <p className="login-note">
          Google Calendar access is used to pull relevant events into your project briefings.
        </p>
      </div>
    </div>
  )
}
