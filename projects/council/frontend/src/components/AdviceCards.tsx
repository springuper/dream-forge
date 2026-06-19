import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { AdviceForCounselor } from './api/client'
import { KnowledgeFragments } from './KnowledgeFragments'

interface AdviceCardsProps {
  counselors: string[]
  advice: Record<string, AdviceForCounselor>
}

// Map skill id to display name and emoji
const COUNSELOR_INFO: Record<string, { name: string; emoji: string }> = {
  zhang_liang: { name: '张良', emoji: '🧠' },
  zhu_ge_liang: { name: '诸葛亮', emoji: '📚' },
  xun_you: { name: '荀彧', emoji: '⚖️' },
  liu_bo_wen: { name: '刘伯温', emoji: '🔮' },
  zeng_guofan: { name: '曾国藩', emoji: '⚔️' },
}

function getCounselorName(id: string): string {
  return COUNSELOR_INFO[id]?.name || id
}

function getCounselorEmoji(id: string): string {
  return COUNSELOR_INFO[id]?.emoji || '👤'
}

export function AdviceCards({ counselors, advice }: AdviceCardsProps) {
  return (
    <div className="flex gap-6 p-6 overflow-x-auto min-h-screen">
      {counselors.map((counselorId) => {
        const counselorAdvice = advice[counselorId]
        if (!counselorAdvice) return null

        return (
          <div
            key={counselorId}
            className="flex-1 min-w-[320px] max-w-[480px] bg-white rounded-2xl shadow-xl p-6 border border-stone-100"
          >
            {/* Header */}
            <div className="flex items-center gap-4 mb-6 pb-4 border-b border-stone-100">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-100 to-amber-200 rounded-full flex items-center justify-center text-2xl">
                {getCounselorEmoji(counselorId)}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-stone-800">{getCounselorName(counselorId)}</h3>
                <p className="text-sm text-stone-500">智囊团成员</p>
              </div>
            </div>

            {/* Advice content */}
            <div className="prose prose-stone max-w-none text-stone-700 leading-relaxed">
              <ReactMarkdown>{counselorAdvice.advice}</ReactMarkdown>
            </div>

            {/* Knowledge fragments */}
            {counselorAdvice.fragments && counselorAdvice.fragments.length > 0 && (
              <KnowledgeFragments
                fragments={counselorAdvice.fragments}
                counselor={counselorId}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}