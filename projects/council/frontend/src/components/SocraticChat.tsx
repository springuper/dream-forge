import { useState, useEffect } from 'react'
import { startConversation, selectCounselors, answerQuestion, getAdvice, type StartConversationResponse } from '../api/client'

interface SocraticChatProps {
  userId: string
  counselors: string[]
  problem: string
  onComplete: (advice: string) => void
}

interface Message {
  type: 'question' | 'answer' | 'system'
  content: string
}

export function SocraticChat({ userId, counselors, problem, onComplete }: SocraticChatProps) {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [phase, setPhase] = useState<'loading' | 'socratic-qa' | 'done'>('loading')
  const [messages, setMessages] = useState<Message[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null)
  const [answer, setAnswer] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    initConversation()
  }, [])

  async function initConversation() {
    setIsLoading(true)
    try {
      // If counselors not selected yet, start with counselor selection
      const response = await startConversation({
        user_id: userId,
        problem,
        counselors: counselors.length > 0 ? counselors : undefined
      })

      setConversationId(response.conversation_id)
      setPhase(response.phase === 'socratic-qa' ? 'socratic-qa' : 'socratic-qa')

      if (response.question) {
        setCurrentQuestion(response.question)
        setMessages([{ type: 'question', content: response.question }])
      }
    } catch (error) {
      console.error('Failed to start conversation:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!answer.trim() || !conversationId) return

    setIsLoading(true)
    setMessages(prev => [...prev, { type: 'answer', content: answer }])

    try {
      const response = await answerQuestion(conversationId, { answer, stop: false })

      if (response.phase === 'finished' || response.done) {
        // Get final advice
        const adviceResponse = await getAdvice(conversationId)
        setMessages(prev => [...prev, { type: 'system', content: adviceResponse.advice }])
        onComplete(adviceResponse.advice)
        setPhase('done')
      } else if (response.question) {
        setCurrentQuestion(response.question)
        setMessages(prev => [...prev, { type: 'question', content: response.question }])
        setAnswer('')
      }
    } catch (error) {
      console.error('Failed to answer question:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleStop() {
    if (!conversationId) return

    setIsLoading(true)
    try {
      const response = await answerQuestion(conversationId, { answer: '', stop: true })
      if (response.phase === 'finished' || response.done) {
        const adviceResponse = await getAdvice(conversationId)
        setMessages(prev => [...prev, { type: 'system', content: adviceResponse.advice }])
        onComplete(adviceResponse.advice)
        setPhase('done')
      }
    } catch (error) {
      console.error('Failed to stop:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-stone-500">思考中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-stone-800">苏格拉底问答</h2>
        <p className="text-stone-500 text-sm mt-1">
          {phase === 'socratic-qa' ? '回答问题，帮助智囊团更好地理解你的处境' : '完成'}
        </p>
      </div>

      {/* Chat history */}
      <div className="flex-1 space-y-4 mb-8">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.type === 'question' ? 'justify-start' : msg.type === 'answer' ? 'justify-end' : 'justify-center'}`}>
            {msg.type === 'system' ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 w-full">
                <p className="text-amber-800 whitespace-pre-wrap">{msg.content}</p>
              </div>
            ) : msg.type === 'question' ? (
              <div className="bg-stone-100 rounded-lg p-4 max-w-[80%]">
                <p className="text-stone-700">{msg.content}</p>
              </div>
            ) : (
              <div className="bg-amber-100 rounded-lg p-4 max-w-[80%]">
                <p className="text-stone-800">{msg.content}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input form */}
      {phase === 'socratic-qa' && currentQuestion && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            placeholder="输入你的回答..."
            className="w-full p-4 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            rows={3}
          />
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isLoading || !answer.trim()}
              className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
            >
              回答
            </button>
            <button
              type="button"
              onClick={handleStop}
              disabled={isLoading}
              className="px-6 py-2 border border-stone-300 text-stone-600 rounded-lg hover:bg-stone-50"
            >
              跳过，直接获取建议
            </button>
          </div>
        </form>
      )}
    </div>
  )
}