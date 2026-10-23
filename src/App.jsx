import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import { configured } from './lib/firebase.js'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import Chat from './pages/Chat.jsx'

const Splash = () => (
  <div className="grid h-full place-items-center text-muted">Loading…</div>
)

function Gate({ children, guest }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <Splash />
  if (guest) return user && profile ? <Navigate to="/chat" replace /> : children
  if (!user) return <Navigate to="/login" replace />
  return profile ? children : <Splash />
}

function SetupNotice() {
  return (
    <div className="grid h-full place-items-center p-6">
      <div className="max-w-lg rounded-3xl border border-line bg-surface p-8">
        <h1 className="text-2xl font-extrabold">Firebase is not configured</h1>
        <p className="mt-3 text-muted">
          Copy <code>.env.example</code> to <code>.env</code>, paste your Firebase web app config into it,
          then restart <code>npm run dev</code>. The README has the full setup steps.
        </p>
      </div>
    </div>
  )
}

export default function App() {
  if (!configured) return <SetupNotice />
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Gate guest><Login /></Gate>} />
      <Route path="/signup" element={<Gate guest><Signup /></Gate>} />
      <Route path="/chat" element={<Gate><Chat /></Gate>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
