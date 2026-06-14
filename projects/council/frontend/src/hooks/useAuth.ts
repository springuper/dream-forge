import { useState, useEffect } from 'react'

interface User {
  id: string
  email: string
  name?: string
  picture?: string
}

const SESSION_KEY = 'council_session_token'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem(SESSION_KEY)
    if (token) {
      fetch('/api/auth/me', {
        headers: {
          'X-Session-Token': token,
        },
      })
        .then(res => {
          if (res.ok) return res.json()
          throw new Error('not authorized')
        })
        .then(data => {
          if (data.user) {
            setUser(data.user)
          } else {
            localStorage.removeItem(SESSION_KEY)
          }
          setLoading(false)
        })
        .catch(() => {
          localStorage.removeItem(SESSION_KEY)
          setLoading(false)
        })
    } else {
      setLoading(false)
    }
  }, [])

  const login = () => {
    window.location.href = '/api/auth/google'
  }

  const logout = async () => {
    const token = localStorage.getItem(SESSION_KEY)
    if (token) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'X-Session-Token': token },
      })
    }
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
  }

  return { user, loading, login, logout }
}