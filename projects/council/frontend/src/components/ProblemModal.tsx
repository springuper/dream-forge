import { useState, useEffect, useRef } from 'react'

interface ProblemModalProps {
  isOpen: boolean
  onSubmit: (problem: string) => void
  onClose: () => void
}

export function ProblemModal({ isOpen, onSubmit, onClose }: ProblemModalProps) {
  const [value, setValue] = useState('')
  const [isAnimating, setIsAnimating] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true)
      setTimeout(() => textareaRef.current?.focus(), 100)
    } else {
      setIsAnimating(false)
      setValue('')
    }
  }, [isOpen])

  if (!isOpen && !isAnimating) return null

  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit(value.trim())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ${
        isAnimating ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-xl font-semibold text-stone-800">
            请描述您的问题或困境
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            描述得越清楚，智囊团的建议越有针对性
          </p>
        </div>

        {/* Textarea */}
        <div className="px-6 pb-2">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="例如：我最近在考虑要不要换工作..."
              className="w-full h-40 px-4 py-3 text-stone-700 placeholder-stone-400 bg-stone-50 border border-stone-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-400 transition-all"
              maxLength={1000}
            />
            {/* Character count */}
            <div className="absolute bottom-2 right-3 text-xs text-stone-400">
              {value.length}/1000
            </div>
          </div>
        </div>

        {/* Hints */}
        <div className="px-6 py-2 text-xs text-stone-400">
          按 Enter 提交，Shift+Enter 换行
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors font-medium"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!value.trim()}
            className="flex-1 px-4 py-2.5 text-white bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 disabled:cursor-not-allowed rounded-xl transition-colors font-medium"
          >
            开始咨询
          </button>
        </div>
      </div>
    </div>
  )
}