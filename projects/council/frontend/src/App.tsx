import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import AuthCallback from './pages/AuthCallback'
import { Home } from './pages/Home'
import { CounselorSelectPage } from './pages/CounselorSelectPage'
import { ConversationPage } from './pages/ConversationPage'
import { HistoryPage } from './pages/HistoryPage'

function App() {
  const { user, loading, login, logout, devLogin } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-100">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-stone-800 mb-2">个人智囊团</h1>
          <p className="text-stone-500">古代智者的智慧，为您的决策护航</p>
        </div>
        <button
          onClick={login}
          className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          使用 Google 登录
        </button>
        <button
          onClick={devLogin}
          className="mt-3 px-8 py-3 bg-stone-400 text-white font-semibold rounded-lg hover:bg-stone-500 transition-colors text-sm"
        >
          本地开发登录（跳过 OAuth）
        </button>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Home userId={user.id} />} />
      <Route path="/counselors" element={<CounselorSelectPage userId={user.id} />} />
      <Route path="/conversation/:id" element={<ConversationPage userId={user.id} />} />
      <Route path="/history" element={<HistoryPage userId={user.id} />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
