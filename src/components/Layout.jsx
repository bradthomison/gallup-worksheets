import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Layout({ children }) {
  const navigate = useNavigate()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-gray-900">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-brand-500 text-white text-xs font-bold">G</span>
            Gallup Strengths
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm text-gray-500 hover:text-gray-800 font-medium transition-colors">
              Sessions
            </Link>
            <Link to="/participants" className="text-sm text-gray-500 hover:text-gray-800 font-medium transition-colors">
              Participants
            </Link>
            <Link to="/sessions/new" className="text-sm bg-brand-500 hover:bg-brand-600 text-white font-medium px-3 py-1.5 rounded-lg transition-colors">
              + New Session
            </Link>
            <button onClick={handleSignOut} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  )
}
