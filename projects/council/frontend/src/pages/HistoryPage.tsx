import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { listConversations, type ConversationSummary } from '../api/client'

interface HistoryPageProps {
  userId: string
}

export function HistoryPage({ userId }: HistoryPageProps) {
  const navigate = useNavigate()
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    listConversations(userId)
      .then(data => {
        setConversations(data.conversations)
        setIsLoading(false)
      })
      .catch(e => {
        console.error('Failed to load conversations:', e)
        setIsLoading(false)
      })
  }, [userId])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-100">
      <div className="bg-white border-b border-stone-200 p-4">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-semibold text-stone-800">历史会话</h1>
          <button
            onClick={() => navigate('/')}
            className="px-3 py-1 text-sm text-stone-500 border border-stone-300 rounded-lg hover:bg-stone-50 hover:text-stone-700 transition-colors"
          >
            ← 返回首页
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6">
        {conversations.length === 0 ? (
          <p className="text-center text-stone-500">暂无历史会话</p>
        ) : (
          <div className="space-y-4">
            {conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => navigate(`/conversation/${conv.id}`)}
                className="w-full text-left bg-white rounded-xl border border-stone-200 p-4 hover:border-amber-300 hover:shadow-md transition-all"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-stone-800">{conv.problem}</p>
                    <p className="text-sm text-stone-500 mt-1">
                      {new Date(conv.created_at).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    conv.current_phase === 'finished'
                      ? 'bg-green-100 text-green-700'
                      : conv.current_phase === 'socratic-qa'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-stone-100 text-stone-600'
                  }`}>
                    {conv.current_phase === 'finished' ? '已完成' : conv.current_phase === 'socratic-qa' ? '问答中' : conv.current_phase}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
