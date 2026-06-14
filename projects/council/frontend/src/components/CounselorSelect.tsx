import { useState, useEffect } from 'react'
import { listCounselors, type SkillMeta } from '../api/client'

interface CounselorSelectProps {
  onSelect: (counselors: string[]) => void
}

export function CounselorSelect({ onSelect }: CounselorSelectProps) {
  const [counselors, setCounselors] = useState<SkillMeta[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadCounselors()
  }, [])

  async function loadCounselors() {
    try {
      const response = await listCounselors()
      setCounselors(response.counselors)
    } catch (error) {
      console.error('Failed to load counselors:', error)
      // Fallback to defaults
      setCounselors([
        { skill_id: 'zhang_liang', name: '张良', description: '奇正结合，以柔克刚' },
        { skill_id: 'zhu_ge_liang', name: '诸葛亮', description: '知彼知己，庙算为先' },
        { skill_id: 'xun_you', name: '荀彧', description: '以德服人，稳健持重' },
        { skill_id: 'liu_bo_wen', name: '刘伯温', description: '审时度势，进退有度' },
        { skill_id: 'zeng_guofan', name: '曾国藩', description: '结硬寨，打呆仗' },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      setSelected(selected.filter(s => s !== id))
    } else if (selected.length < 3) {
      setSelected([...selected, id])
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold text-stone-800 mb-2">个人智囊团</h1>
      <p className="text-stone-500 mb-8">选择您的古代智囊（最多3位）</p>

      {isLoading ? (
        <div className="text-stone-500">加载中...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-8 w-full max-w-2xl">
            {counselors.map(c => (
              <button
                key={c.skill_id}
                onClick={() => toggle(c.skill_id)}
                className={`p-6 rounded-xl border-2 transition-all text-left ${
                  selected.includes(c.skill_id)
                    ? 'border-amber-500 bg-amber-50 shadow-lg'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                <div className="font-semibold text-lg text-stone-800">{c.name}</div>
                <div className="text-sm text-stone-500 mt-1">{c.description}</div>
                {c.strengths && c.strengths.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {c.strengths.slice(0, 3).map((s, i) => (
                      <span key={i} className="text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>

          <button
            onClick={() => onSelect(selected)}
            disabled={selected.length === 0}
            className="px-8 py-3 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            开始咨询 ({selected.length}/3)
          </button>
        </>
      )}
    </div>
  )
}