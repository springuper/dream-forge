import { useState } from 'react'

interface SocraticQuestionsProps {
  questions: string[]
  onComplete: (answers: string[]) => void
}

export function SocraticQuestions({ questions, onComplete }: SocraticQuestionsProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<string[]>([])
  const [input, setInput] = useState('')

  const handleSubmit = () => {
    const newAnswers = [...answers, input]
    if (currentIndex < questions.length - 1) {
      setAnswers(newAnswers)
      setCurrentIndex(currentIndex + 1)
      setInput('')
    } else {
      onComplete([...newAnswers, input])
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-4">
        <span className="text-sm text-gray-500">
          问题 {currentIndex + 1} / {questions.length}
        </span>
      </div>
      <h2 className="text-xl font-semibold mb-4">{questions[currentIndex]}</h2>
      <textarea
        className="w-full p-4 border rounded-lg mb-4"
        rows={4}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="请输入您的回答..."
      />
      <button
        onClick={handleSubmit}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg"
      >
        {currentIndex < questions.length - 1 ? '下一题' : '完成'}
      </button>
    </div>
  )
}