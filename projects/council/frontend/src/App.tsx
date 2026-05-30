import { useState } from 'react'
import { CounselorSelect } from './components/CounselorSelect'
import { SocraticQuestions } from './components/SocraticQuestions'
import { AdviceCards } from './components/AdviceCards'

function App() {
  const [phase, setPhase] = useState<'select' | 'socratic' | 'advice'>('select')
  const [selectedCounselors, setSelectedCounselors] = useState<string[]>([])
  const [questions, setQuestions] = useState<string[]>([])
  const [adviceData, setAdviceData] = useState<Record<string, { advice: string; fragments: Array<{ topic: string; content: string }> }>>({})

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
        <AdviceCards counselors={selectedCounselors} advice={adviceData} />
      )}
    </div>
  )
}

export default App