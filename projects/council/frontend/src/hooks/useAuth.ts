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
        .then(res => res.json())
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
    // Redirect to backend OAuth endpoint
    window.location.href = '/api/auth/google'
  }

  const handleCallback = async () => {
    // This is called after OAuth callback
    // The backend returns session_token which we store
    const response = await fetch('/api/auth/callback')
    const data = await response.json()
    if (data.session_token) {
      localStorage.setItem(SESSION_KEY, data.session_token)
      setUser(data.user)
      return true
    }
    return false
  }

  const logout = () => {
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
  }

  return { user, loading, login, logout, handleCallback }
}