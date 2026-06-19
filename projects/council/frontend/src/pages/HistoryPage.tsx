import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getConversation, listConversations, type ConversationSummary, type ConversationDetail } from '../api/client'

interface HistoryPageProps {
  userId: string
}

export function HistoryPage({ userId }: HistoryPageProps) {
  const navigate = useNavigate()
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedConversation, setExpandedConversation] = useState<ConversationDetail | null>(null)
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

  const handleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
      setExpandedConversation(null)
      return
    }
    setExpandedId(id)
    try {
      const data = await getConversation(id)
      setExpandedConversation(data)
    } catch (e) {
      console.error('Failed to load conversation details:', e)
    }
  }

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
              <div key={conv.id} className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                <button
                  onClick={() => handleExpand(conv.id)}
                  className="w-full text-left p-4 hover:bg-stone-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-stone-800">{conv.problem}</p>
                      <p className="text-sm text-stone-500 mt-1">
                        {new Date(conv.created_at).toLocaleDateString('zh-CN')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        conv.current_phase === 'finished'
                          ? 'bg-green-100 text-green-700'
                          : conv.current_phase === 'socratic-qa'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-stone-100 text-stone-600'
                      }`}>
                        {conv.current_phase === 'finished' ? '已完成' : conv.current_phase === 'socratic-qa' ? '问答中' : conv.current_phase}
                      </span>
                      <span className="text-stone-400">{expandedId === conv.id ? '▲' : '▼'}</span>
                    </div>
                  </div>
                </button>

                {expandedId === conv.id && expandedConversation && (
                  <div className="border-t border-stone-200 p-4 bg-stone-50">
                    <div className="space-y-4">
                      {(expandedConversation.messages as Array<{question?: string; answer?: string}>).map((msg, i) => (
                        <div key={i}>
                          {msg.question && (
                            <div className="mb-2">
                              <p className="text-sm font-medium text-amber-700 mb-1">问题 {i + 1}:</p>
                              <p className="text-stone-700">{msg.question}</p>
                            </div>
                          )}
                          {msg.answer && (
                            <div className="ml-4 pl-4 border-l-2 border-stone-300">
                              <p className="text-sm font-medium text-blue-700 mb-1">回答:</p>
                              <p className="text-stone-600">{msg.answer}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => navigate(`/conversation/${conv.id}`)}
                      className="mt-4 px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors"
                    >
                      查看完整建议 →
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
