import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getConversation, answerQuestion, getAdvice, type ConversationDetail, type AdviceResponse } from '../api/client'
import { SocraticQuestions } from '../components/SocraticQuestions'
import { AdviceCards } from '../components/AdviceCards'

interface ConversationPageProps {
  userId: string
}

export function ConversationPage({ userId }: ConversationPageProps) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [conversation, setConversation] = useState<ConversationDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [currentContext, setCurrentContext] = useState('')
  const [adviceData, setAdviceData] = useState<AdviceResponse | null>(null)
  const [isGeneratingAdvice, setIsGeneratingAdvice] = useState(false)

  useEffect(() => {
    if (!id) return

    getConversation(id)
      .then(data => {
        setConversation(data)
        // Find last unanswered question from messages
        const messages = data.messages as Array<{ question?: string; answer?: string; context?: string }>
        const lastQuestion = messages.filter(m => m.question).pop()
        if (lastQuestion?.question) {
          setCurrentQuestion(lastQuestion.question)
          setCurrentContext(lastQuestion.context || '')
          setCurrentQuestionIndex(messages.filter(m => m.answer).length)
        }
        setIsLoading(false)
      })
      .catch(e => {
        setError('Failed to load conversation')
        setIsLoading(false)
      })
  }, [id])

  // Fetch advice when conversation is finished
  useEffect(() => {
    if (!id || !conversation || conversation.current_phase !== 'finished' || adviceData) return

    setIsGeneratingAdvice(true)
    getAdvice(id).then(advice => {
      setAdviceData(advice)
      setIsGeneratingAdvice(false)
    }).catch(() => {
      setIsGeneratingAdvice(false)
    })
  }, [id, conversation?.current_phase, adviceData])

  const handleAnswer = async (answer: string) => {
    if (!id) return

    try {
      const res = await answerQuestion(id, { answer })
      if (res.phase === 'advice-generation' || res.done) {
        setIsGeneratingAdvice(true)
        // Re-fetch conversation to get updated phase
        const updated = await getConversation(id)
        setConversation(updated)
        // Call getAdvice API
        const advice = await getAdvice(id)
        setAdviceData(advice)
        setIsGeneratingAdvice(false)
      } else if (res.question) {
        setCurrentQuestion(res.question)
        setCurrentContext(res.context || '')
        setCurrentQuestionIndex(prev => prev + 1)
      }
    } catch (e) {
      console.error('Failed to submit answer:', e)
      setIsGeneratingAdvice(false)
      alert('提交回答失败，请重试')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error || !conversation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || '会话不存在'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-stone-700 text-white rounded-lg"
          >
            返回首页
          </button>
        </div>
      </div>
    )
  }

  // Advice generation loading
  if (isGeneratingAdvice) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-100">
        <div className="animate-spin w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full mb-4" />
        <p className="text-stone-600">智囊团正在商议建议...</p>
      </div>
    )
  }

  // Render based on phase
  if (conversation.current_phase === 'finished' || adviceData) {
    return (
      <div className="min-h-screen bg-stone-100">
        <div className="p-4 flex justify-end">
          <button
            onClick={() => navigate('/')}
            className="px-3 py-1 text-sm text-stone-500 border border-stone-300 rounded-lg hover:bg-stone-50 hover:text-stone-700 transition-colors"
          >
            ← 返回首页
          </button>
        </div>
        <AdviceCards counselors={conversation.counselors} advice={adviceData?.advice || {}} />
      </div>
    )
  }

  // Socratic Q&A phase
  return (
    <div className="min-h-screen bg-stone-100">
      <SocraticQuestions
        question={currentQuestion}
        context={currentContext}
        questionIndex={currentQuestionIndex}
        totalQuestions={5}
        onAnswer={handleAnswer}
        initialProblem={conversation.problem}
      />
    </div>
  )
}