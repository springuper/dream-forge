import { useNavigate } from 'react-router-dom'
import { useLastConversation } from '../hooks/useLastConversation'

interface HomeProps {
  userId: string
}

export function Home({ userId }: HomeProps) {
  const navigate = useNavigate()
  const { lastConversationId, clearConversationId } = useLastConversation()

  const handleContinue = () => {
    if (lastConversationId) {
      navigate(`/conversation/${lastConversationId}`)
    }
  }

  const handleNewConversation = () => {
    clearConversationId()
    navigate('/counselors')
  }

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-stone-800 mb-2 text-center">个人智囊团</h1>
        <p className="text-stone-500 text-center mb-8">古代智者的智慧，为您的决策护航</p>

        {lastConversationId && (
          <button
            onClick={handleContinue}
            className="w-full py-3 px-4 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 transition-colors mb-4"
          >
            继续上次会话
          </button>
        )}

        <button
          onClick={handleNewConversation}
          className="w-full py-3 px-4 bg-stone-700 text-white font-semibold rounded-lg hover:bg-stone-800 transition-colors"
        >
          开始新会话
        </button>

        <button
          onClick={() => navigate('/history')}
          className="w-full py-2 px-4 mt-4 text-stone-500 hover:text-stone-700 text-sm"
        >
          查看历史会话 →
        </button>
      </div>
    </div>
  )
}
