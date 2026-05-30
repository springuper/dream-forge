import { KnowledgeFragments } from './KnowledgeFragments'

interface AdviceCardsProps {
  counselors: string[]
  advice: Record<string, { advice: string; fragments: Array<{ topic: string; content: string }> }>
}

export function AdviceCards({ counselors, advice }: AdviceCardsProps) {
  return (
    <div className="flex gap-6 p-6 overflow-x-auto">
      {counselors.map((counselor) => (
        <div
          key={counselor}
          className="flex-1 min-w-[300px] max-w-[400px] bg-white rounded-xl shadow-lg p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">👤</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold">{counselor}</h3>
              <p className="text-sm text-gray-500">智囊团成员</p>
            </div>
          </div>
          <div className="prose">
            <p className="whitespace-pre-wrap">{advice[counselor]?.advice}</p>
          </div>
          <KnowledgeFragments
            fragments={advice[counselor]?.fragments || []}
            counselor={counselor}
          />
        </div>
      ))}
    </div>
  )
}