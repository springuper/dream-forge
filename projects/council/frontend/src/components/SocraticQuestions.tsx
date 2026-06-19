import { useState } from 'react'

interface SocraticQuestionsProps {
  question: string
  context?: string
  questionIndex: number
  totalQuestions: number
  onAnswer: (answer: string) => void
  initialProblem: string
}

export function SocraticQuestions({ question, context, questionIndex, totalQuestions, onAnswer, initialProblem }: SocraticQuestionsProps) {
  const [input, setInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!input.trim()) return

    setIsSubmitting(true)
    await onAnswer(input.trim())
    setInput('')
    setIsSubmitting(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 p-4">
        <div className="max-w-2xl mx-auto">
          <p className="text-sm text-stone-500">问题 {questionIndex + 1} / {totalQuestions}</p>
          <div className="w-full bg-stone-200 h-1 mt-2 rounded">
            <div
              className="bg-amber-500 h-1 rounded transition-all"
              style={{ width: `${((questionIndex + 1) / totalQuestions) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="max-w-2xl w-full">
          {/* Initial problem context */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-amber-700">
              <span className="font-semibold">您的问题：</span>
              {initialProblem}
            </p>
          </div>

          {/* Question */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-stone-800 leading-relaxed">
              {question}
            </h2>
          </div>

          {/* Context */}
          {context && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
              <p className="text-sm text-blue-700 whitespace-pre-wrap">{context}</p>
            </div>
          )}

          {/* Answer input */}
          <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm">
            <label className="block text-sm font-medium text-stone-600 mb-2">
              请分享您的想法
            </label>
            <textarea
              className="w-full p-4 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
              rows={4}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="请输入您的回答..."
              disabled={isSubmitting}
            />
            <div className="flex justify-end mt-4">
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || isSubmitting}
                className="px-6 py-3 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '思考中...' : questionIndex < totalQuestions - 1 ? '下一题' : '获得建议'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}