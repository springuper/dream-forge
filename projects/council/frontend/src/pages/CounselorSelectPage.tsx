import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { listCounselors, startConversation, type SkillInfo, type StartConversationRequest } from '../api/client'
import { useLastConversation } from '../hooks/useLastConversation'

interface CounselorSelectPageProps {
  userId: string
}

export function CounselorSelectPage({ userId }: CounselorSelectPageProps) {
  const navigate = useNavigate()
  const { saveConversationId } = useLastConversation()
  const [skills, setSkills] = useState<SkillInfo[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [problem, setProblem] = useState('')
  const [showProblemInput, setShowProblemInput] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    listCounselors().then(data => setSkills(data.counselors || [])).catch(console.error)
  }, [])

  const toggleCounselor = (skillId: string) => {
    if (selected.includes(skillId)) {
      setSelected(selected.filter(s => s !== skillId))
    } else if (selected.length < 3) {
      setSelected([...selected, skillId])
    }
  }

  const handleConfirm = () => {
    if (selected.length === 3) {
      setShowProblemInput(true)
    }
  }

  const handleProblemSubmit = async () => {
    if (!problem.trim()) return
    setIsLoading(true)

    try {
      const req: StartConversationRequest = {
        user_id: userId,
        problem: problem.trim(),
        counselors: selected,
      }
      const res = await startConversation(req)
      saveConversationId(res.conversation_id)
      navigate(`/conversation/${res.conversation_id}`)
    } catch (e) {
      console.error('Failed to start conversation:', e)
      alert('启动对话失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-100">
      <div className="bg-white border-b border-stone-200 p-4">
        <h1 className="text-xl font-semibold text-stone-800">选择您的智囊团</h1>
        <p className="text-sm text-stone-500">已选择 {selected.length}/3 位智者</p>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills.map(skill => (
            <button
              key={skill.skill_id}
              onClick={() => toggleCounselor(skill.skill_id)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                selected.includes(skill.skill_id)
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-stone-200 bg-white hover:border-stone-300'
              }`}
            >
              <h3 className="font-semibold text-stone-800">{skill.name}</h3>
              <p className="text-sm text-stone-500 mt-1">{skill.description}</p>
            </button>
          ))}
        </div>

        {selected.length === 3 && !showProblemInput && (
          <div className="mt-6 text-center">
            <button
              onClick={handleConfirm}
              className="px-8 py-3 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 transition-colors"
            >
              确认选择
            </button>
          </div>
        )}
      </div>

      {showProblemInput && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4">
            <h2 className="text-xl font-semibold text-stone-800 mb-4">请描述您的问题</h2>
            <textarea
              value={problem}
              onChange={e => setProblem(e.target.value)}
              placeholder="请详细描述您面临的问题或决策..."
              className="w-full h-32 p-3 border border-stone-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowProblemInput(false)}
                className="flex-1 py-2 px-4 border border-stone-300 text-stone-600 font-medium rounded-lg hover:bg-stone-50"
              >
                返回
              </button>
              <button
                onClick={handleProblemSubmit}
                disabled={!problem.trim() || isLoading}
                className="flex-1 py-2 px-4 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 disabled:opacity-50"
              >
                {isLoading ? '启动中...' : '开始对话'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}