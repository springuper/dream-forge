import { useState } from 'react'
import { CounselorSelect } from './components/CounselorSelect'
import { SocraticQuestions } from './components/SocraticQuestions'
import { AdviceCards } from './components/AdviceCards'

interface ProfileHints {
  situation?: string
  cautiousness: number
  assertiveness: number
  risk_tolerance: number
  thinking_style: string
  favored_counselors: string[]
}

function App() {
  const [phase, setPhase] = useState<'select' | 'socratic' | 'advice'>('select')
  const [selectedCounselors, setSelectedCounselors] = useState<string[]>([])
  const [questions, setQuestions] = useState<string[]>([])
  const [adviceData, setAdviceData] = useState<Record<string, { advice: string; fragments: Array<{ topic: string; content: string }> }>>({})
  const [profileHints, setProfileHints] = useState<ProfileHints | null>(null)

  const handleCounselorsSelected = (counselors: string[]) => {
    setSelectedCounselors(counselors)
    // TODO: Call API to start conversation
    setPhase('socratic')
  }

  const handleSocraticComplete = (answers: string[]) => {
    // TODO: Submit answers to API, get advice
    setPhase('advice')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {phase === 'select' && (
        <CounselorSelect onSelect={handleCounselorsSelected} />
      )}
      {phase === 'socratic' && (
        <SocraticQuestions questions={questions} onComplete={handleSocraticComplete} />
      )}
      {phase === 'advice' && (
        <>
          {profileHints && (
            <div className="mt-4 mx-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                根据您的回答，我们理解您是：
                {profileHints.risk_tolerance > 0.7 ? '愿意承担风险的' : '倾向于稳健的'}，
                {profileHints.thinking_style}。
              </p>
            </div>
          )}
          <AdviceCards counselors={selectedCounselors} advice={adviceData} />
        </>
      )}
    </div>
  )
}

export default App