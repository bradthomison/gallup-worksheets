import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useIsCoach } from './hooks/useIsCoach'
import { supabase } from './lib/supabase'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import SessionPage from './pages/SessionPage'
import NewSessionPage from './pages/NewSessionPage'
import WorksheetPage from './pages/WorksheetPage'
import ParticipantsPage from './pages/ParticipantsPage'
import ThemesPage from './pages/ThemesPage'
import TeamsPage from './pages/TeamsPage'
import SessionJoinPage from './pages/SessionJoinPage'
import LMSLandingPage from './pages/LMSLandingPage'
import LMSWorksheetPage from './pages/LMSWorksheetPage'
import LMSLearnersPage from './pages/LMSLearnersPage'
import PersonalInsightsLMSPage from './pages/PersonalInsightsLMSPage'
import BringNeedLMSPage from './pages/BringNeedLMSPage'
import ReportLMSPage from './pages/ReportLMSPage'
import TeamPortalPage from './pages/TeamPortalPage'
import PowerOf2LMSPage from './pages/PowerOf2LMSPage'
import PowerOfMeLMSPage from './pages/PowerOfMeLMSPage'
import TalentMapPage from './pages/TalentMapPage'
import ParticipantSignInPage from './pages/ParticipantSignInPage'
import AuthConfirmPage from './pages/AuthConfirmPage'
import ParticipantDashboardPage from './pages/ParticipantDashboardPage'
import HomePage from './pages/HomePage'
import ReportsPage from './pages/ReportsPage'
import TeamGridPage from './pages/TeamGridPage'
import TeamSparkPage from './pages/TeamSparkPage'
import TeamSummaryPage from './pages/TeamSummaryPage'

function FullPageMessage({ children }) {
  return <div className="flex items-center justify-center min-h-screen px-4 text-center text-gray-500">{children}</div>
}

// Shown if the coach check itself fails (for example the database is unreachable): fail closed, never open.
function CoachCheckFailed() {
  async function signOut() {
    await supabase.auth.signOut()
    window.location.assign('/coach')
  }
  return (
    <FullPageMessage>
      <div className="space-y-3">
        <p className="text-gray-800 font-medium">We couldn't verify your coach access.</p>
        <p className="text-sm">Check your connection and try again.</p>
        <div className="flex items-center justify-center gap-4 text-sm">
          <button onClick={() => window.location.reload()} className="text-brand-500 hover:underline">Try again</button>
          <button onClick={signOut} className="text-gray-500 hover:underline">Sign out</button>
        </div>
      </div>
    </FullPageMessage>
  )
}

// Coach pages are for coaches only. Signed out -> coach login; signed in but not a coach -> their own page (/me).
function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  const coach = useIsCoach(user)
  if (loading || (user && coach.loading)) return <FullPageMessage>Loading…</FullPageMessage>
  if (!user) return <Navigate to="/coach" replace />
  if (coach.error) return <CoachCheckFailed />
  if (!coach.isCoach) return <Navigate to="/me" replace />
  return children
}

// /coach is the coach entry point: the login form when signed out, the coach home for coaches.
function CoachEntry() {
  const { user, loading } = useAuth()
  const coach = useIsCoach(user)
  if (loading || (user && coach.loading)) return <FullPageMessage>Loading…</FullPageMessage>
  if (!user) return <LoginPage />
  if (coach.error) return <CoachCheckFailed />
  return coach.isCoach ? <HomePage /> : <Navigate to="/me" replace />
}

// Participant pages handle their own auth guard internally (redirects to /sign-in)

export default function App() {
  return (
    <Routes>
      {/* Participants sign in at the site root; coaches at /coach. /login and /sign-in stay as aliases for old links. */}
      <Route path="/" element={<ParticipantSignInPage />} />
      <Route path="/coach" element={<CoachEntry />} />
      <Route path="/auth/confirm" element={<AuthConfirmPage />} />
      <Route path="/login" element={<Navigate to="/coach" replace />} />
      <Route path="/worksheet/:slug" element={<WorksheetPage />} />
      <Route path="/session/:sessionId/join" element={<SessionJoinPage />} />
      <Route path="/lms/:themeId" element={<LMSLandingPage />} />
      <Route path="/lms-worksheet/:slug" element={<LMSWorksheetPage />} />
      <Route path="/personal-insights" element={<PersonalInsightsLMSPage />} />
      <Route path="/bring-need" element={<BringNeedLMSPage />} />
      <Route path="/report/:reportId" element={<ReportLMSPage />} />
      <Route path="/team/:teamId" element={<TeamPortalPage />} />
      <Route path="/power-of-2/:variant?" element={<PowerOf2LMSPage />} />
      <Route path="/power-of-me" element={<PowerOfMeLMSPage />} />
      <Route path="/talent-map" element={<TalentMapPage />} />
      <Route path="/sign-in" element={<ParticipantSignInPage />} />
      <Route path="/me" element={<ParticipantDashboardPage />} />
      <Route path="/team-grid" element={<TeamGridPage />} />
      <Route path="/team-spark" element={<TeamSparkPage />} />
      <Route path="/team-summary" element={<TeamSummaryPage />} />
      <Route path="/sessions" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      <Route path="/sessions/new" element={<PrivateRoute><NewSessionPage /></PrivateRoute>} />
      <Route path="/sessions/:id" element={<PrivateRoute><SessionPage /></PrivateRoute>} />
      <Route path="/participants" element={<PrivateRoute><ParticipantsPage /></PrivateRoute>} />
      <Route path="/themes" element={<PrivateRoute><ThemesPage /></PrivateRoute>} />
      <Route path="/reports" element={<PrivateRoute><ReportsPage /></PrivateRoute>} />
      <Route path="/teams" element={<PrivateRoute><TeamsPage /></PrivateRoute>} />
      <Route path="/lms-learners" element={<PrivateRoute><LMSLearnersPage /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
