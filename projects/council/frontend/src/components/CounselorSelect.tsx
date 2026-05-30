import { useState } from 'react'

interface CounselorSelectProps {
  onSelect: (counselors: string[]) => void
}

const COUNSELORS = [
  { id: 'zhang_liang', name: '张良', desc: '奇正结合，以柔克刚' },
  { id: 'zhu_ge_liang', name: '诸葛亮', desc: '知彼知己，庙算为先' },
  { id: 'xun_you', name: '荀彧', desc: '以德服人，稳健持重' },
  { id: 'liu_bo_wen', name: '刘伯温', desc: '审时度势，进退有度' },
]

export function CounselorSelect({ onSelect }: CounselorSelectProps) {
  const [selected, setSelected] = useState<string[]>([])

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      setSelected(selected.filter(s => s !== id))
    } else if (selected.length < 3) {
      setSelected([...selected, id])
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">选择您的智囊团（最多3位）</h2>
      <div className="grid grid-cols-2 gap-4 mb-6">
        {COUNSELORS.map(c => (
          <button
            key={c.id}
            onClick={() => toggle(c.id)}
            className={`p-4 rounded-lg border ${selected.includes(c.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
          >
            <div className="font-semibold">{c.name}</div>
            <div className="text-sm text-gray-500">{c.desc}</div>
          </button>
        ))}
      </div>
      <button
        onClick={() => onSelect(selected)}
        disabled={selected.length === 0}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
      >
        开始咨询
      </button>
    </div>
  )
}