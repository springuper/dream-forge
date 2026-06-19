import { useState, useEffect } from 'react'

const STORAGE_KEY = 'last_conversation_id'

export function useLastConversation() {
  const [lastConversationId, setLastConversationId] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) setLastConversationId(stored)
  }, [])

  const saveConversationId = (id: string) => {
    localStorage.setItem(STORAGE_KEY, id)
    setLastConversationId(id)
  }

  const clearConversationId = () => {
    localStorage.removeItem(STORAGE_KEY)
    setLastConversationId(null)
  }

  return { lastConversationId, saveConversationId, clearConversationId }
}
