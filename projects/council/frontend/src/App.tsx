import { useState, useEffect } from 'react'
import { CounselorSelect } from './components/CounselorSelect'
import { SocraticQuestions } from './components/SocraticQuestions'
import { AdviceCards } from './components/AdviceCards'
import {
  listSkills,
  startConversation,
  answerQuestion,
  completeConversation,
  StartConversationRequest,
  ConversationContext,
  AdviceResponse,
  ProfileHints,
  SkillInfo,
  User,
} from './api/client'
import { useAuth } from './hooks/useAuth'

type Phase = 'select' | 'socratic' | 'advice'

function App() {
  const { user, loading: authLoading, login, logout } = useAuth()
  const [phase, setPhase] = useState<Phase>('select')
  const [skills, setSkills] = useState<SkillInfo[]>([])
  const [selectedCounselors, setSelectedCounselors] = useState<string[]>([])
  const [conversationId, setConversationId] = useState<string>('')
  const [currentQuestion, setCurrentQuestion] = useState<string>('')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [totalQuestions] = useState(5)
  const [context, setContext] = useState<ConversationContext | null>(null)
  const [adviceData, setAdviceData] = useState<AdviceResponse | null>(null)
  const [profileHints, setProfileHints] = useState<ProfileHints | null>(null)
  const [initialProblem, setInitialProblem] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Fetch skills on mount
  useEffect(() => {
    if (user) {
      listSkills().then(setSkills).catch(console.error)
    }
  }, [user])

  const handleCounselorsSelected = async (counselors: string[]) => {
    if (counselors.length === 0 || !user) return

    setSelectedCounselors(counselors)
    setIsLoading(true)

    // Prompt for initial problem
    const problem = prompt('请描述您的问题或困境：')
    if (!problem) {
      setIsLoading(false)
      return
    }

    setInitialProblem(problem)

    try {
      const req: StartConversationRequest = {
        user_id: user.id,
        counselors,
        initial_problem: problem,
      }
      const res = await startConversation(req)

      setConversationId(res.conversation_id)
      setCurrentQuestion(res.current_question)
      setQuestionIndex(res.question_index)
      setPhase('socratic')
    } catch (e) {
      console.error('Failed to start conversation:', e)
      alert('启动对话失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSocraticAnswer = async (answer: string) => {
    if (!conversationId || !user) return

    setIsLoading(true)

    try {
      const updatedContext = await answerQuestion({
        conversation_id: conversationId,
        answer,
      })

      setContext(updatedContext)

      // Check if we've completed the Socratic phase
      if (updatedContext.current_phase === 'WaitingForAdvice' || !updatedContext.current_question) {
        // Move to advice phase
        const { advice, profile_hints } = await completeConversation(updatedContext)
        setAdviceData(advice)
        setProfileHints(profile_hints)
        setPhase('advice')
      } else {
        // Continue with next question
        setCurrentQuestion(updatedContext.current_question!)
        setQuestionIndex(updatedContext.question_index)
      }
    } catch (e) {
      console.error('Failed to answer question:', e)
      alert('提交回答失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  // Auth loading or not logged in
  if (authLoading) {
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
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-100">
      {/* Header with user info */}
      <div className="bg-white border-b border-stone-200 p-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold text-stone-800">个人智囊团</h1>
        <div className="flex items-center gap-4">
          {user.picture && (
            <img src={user.picture} alt="" className="w-8 h-8 rounded-full" />
          )}
          <span className="text-sm text-stone-600">{user.name || user.email}</span>
          <button
            onClick={logout}
            className="text-sm text-stone-500 hover:text-stone-700"
          >
            退出
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-xl">
            <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">思考中...</p>
          </div>
        </div>
      )}

      {phase === 'select' && (
        <CounselorSelect onSelect={handleCounselorsSelected} skills={skills} />
      )}

      {phase === 'socratic' && (
        <SocraticQuestions
          question={currentQuestion}
          questionIndex={questionIndex}
          totalQuestions={totalQuestions}
          onAnswer={handleSocraticAnswer}
          initialProblem={initialProblem}
        />
      )}

      {phase === 'advice' && adviceData && (
        <>
          {profileHints && (
            <div className="mx-6 mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-amber-800">
                根据您的回答，我们理解您是：
                {profileHints.risk_tolerance > 0.6 ? '愿意承担风险的' : profileHints.risk_tolerance > 0.3 ? '风险偏好中性的' : '倾向于稳健保守的'}，
                {profileHints.thinking_style}的思考者。
              </p>
            </div>
          )}
          <AdviceCards
            counselors={selectedCounselors}
            advice={adviceData.advice}
          />
        </>
      )}
    </div>
  )
}

export default App