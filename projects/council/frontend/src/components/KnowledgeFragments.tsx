import { useState } from 'react'
import { KnowledgeFragment } from './api/client'

interface KnowledgeFragmentsProps {
  fragments: KnowledgeFragment[]
  counselor: string
}

export function KnowledgeFragments({ fragments, counselor }: KnowledgeFragmentsProps) {
  const [expanded, setExpanded] = useState(false)
  const [selectedFragment, setSelectedFragment] = useState<KnowledgeFragment | null>(null)

  if (fragments.length === 0) return null

  return (
    <div className="mt-6 pt-4 border-t border-stone-100">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
      >
        {expanded ? '▲' : '▼'} 查看相关知识碎片 ({fragments.length})
      </button>

      {expanded && (
        <div className="mt-3 grid gap-2">
          {fragments.map((fragment, idx) => (
            <div
              key={idx}
              className="bg-amber-50 rounded-lg p-3 border border-amber-100 hover:border-amber-200 transition-colors"
            >
              <button
                onClick={() => setSelectedFragment(fragment)}
                className="w-full text-left"
              >
                <span className="font-medium text-amber-800">{fragment.topic}</span>
                <p className="text-sm text-stone-600 mt-1 line-clamp-2">{fragment.content}</p>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {selectedFragment && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedFragment(null)}
        >
          <div
            className="bg-white rounded-xl p-6 max-w-lg w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-lg font-semibold text-stone-800 mb-3">{selectedFragment.topic}</h4>
            <p className="text-stone-600 whitespace-pre-wrap leading-relaxed">{selectedFragment.content}</p>
            <button
              onClick={() => setSelectedFragment(null)}
              className="mt-4 px-4 py-2 bg-stone-200 text-stone-700 rounded-lg hover:bg-stone-300 transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  )
}