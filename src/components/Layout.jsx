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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <Link to="/">
            <img src="/logo.png" alt="Gallup Strengths" className="h-[60px] w-auto" />
          </Link>
          <div className="flex items-center gap-6">
            <Link to="/" className="text-base text-gray-700 hover:text-gray-900 font-semibold transition-colors">
              Sessions
            </Link>
            <Link to="/participants" className="text-base text-gray-700 hover:text-gray-900 font-semibold transition-colors">
              Participants
            </Link>
            <Link to="/themes" className="text-base text-gray-700 hover:text-gray-900 font-semibold transition-colors">
              Themes
            </Link>
            <button onClick={handleSignOut} className="text-base text-gray-500 hover:text-gray-700 font-semibold transition-colors">
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
