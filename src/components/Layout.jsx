import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'

export default function Layout({ children }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile, saveDisplayName } = useProfile(user)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [nameSaving, setNameSaving] = useState(false)

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  function startEditName() {
    setNameInput(profile?.display_name ?? '')
    setEditingName(true)
  }

  async function handleSaveName() {
    if (!nameInput.trim()) return
    setNameSaving(true)
    await saveDisplayName(nameInput)
    setNameSaving(false)
    setEditingName(false)
  }

  const displayName = profile?.display_name ?? user?.email?.split('@')[0] ?? ''

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

            {/* User name + sign out */}
            <div className="flex items-center gap-3 border-l border-gray-200 pl-6">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false) }}
                    className="text-sm rounded-lg border border-gray-300 px-2 py-1 w-36 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={nameSaving}
                    className="text-xs font-medium text-brand-500 hover:text-brand-700 disabled:opacity-60"
                  >
                    {nameSaving ? '…' : 'Save'}
                  </button>
                  <button onClick={() => setEditingName(false)} className="text-xs text-gray-400 hover:text-gray-600">
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={startEditName}
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  title="Click to edit your display name"
                >
                  {displayName}
                </button>
              )}
              <button onClick={handleSignOut} className="text-base text-gray-500 hover:text-gray-700 font-semibold transition-colors">
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  )
}
