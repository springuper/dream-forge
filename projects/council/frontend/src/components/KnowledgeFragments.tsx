interface KnowledgeFragment {
  topic: string
  content: string
}

interface KnowledgeFragmentsProps {
  fragments: KnowledgeFragment[]
  counselor: string
}

import { useState } from 'react'

export function KnowledgeFragments({ fragments, counselor }: KnowledgeFragmentsProps) {
  const [expanded, setExpanded] = useState(false)
  const [selectedFragment, setSelectedFragment] = useState<string | null>(null)

  return (
    <div className="mt-6 border-t pt-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-sm text-amber-600 hover:text-amber-700"
      >
        {expanded ? '收起知识碎片' : '查看更多知识碎片'}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {fragments.map((fragment, idx) => (
            <div key={idx} className="bg-amber-50 rounded p-3">
              <button
                onClick={() => setSelectedFragment(fragment.content)}
                className="text-sm font-medium text-amber-800"
              >
                {fragment.topic}
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedFragment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-lg">
            <p className="whitespace-pre-wrap">{selectedFragment}</p>
            <button
              onClick={() => setSelectedFragment(null)}
              className="mt-4 px-4 py-2 bg-gray-200 rounded"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  )
}