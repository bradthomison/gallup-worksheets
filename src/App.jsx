import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import SessionPage from './pages/SessionPage'
import NewSessionPage from './pages/NewSessionPage'
import WorksheetPage from './pages/WorksheetPage'
import ParticipantsPage from './pages/ParticipantsPage'
import ThemesPage from './pages/ThemesPage'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-500">Loading…</div>
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/worksheet/:slug" element={<WorksheetPage />} />
      <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      <Route path="/sessions/new" element={<PrivateRoute><NewSessionPage /></PrivateRoute>} />
      <Route path="/sessions/:id" element={<PrivateRoute><SessionPage /></PrivateRoute>} />
      <Route path="/participants" element={<PrivateRoute><ParticipantsPage /></PrivateRoute>} />
      <Route path="/themes" element={<PrivateRoute><ThemesPage /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
