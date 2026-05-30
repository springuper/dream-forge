import { useState, useEffect } from 'react'

interface User {
  id: string
  email: string
  name?: string
  picture?: string
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        setUser(data.user)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [])

  const login = () => {
    window.location.href = '/api/auth/google'
  }

  const logout = () => {
    fetch('/api/auth/logout', { method: 'POST' })
      .then(() => setUser(null))
  }

  return { user, loading, login, logout }
}