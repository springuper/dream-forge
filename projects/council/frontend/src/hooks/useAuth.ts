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

  const devLogin = async () => {
    const res = await fetch('/api/auth/dev-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dev@localhost', name: 'Local Dev User' }),
    })
    const data = await res.json()
    if (data.session_token) {
      localStorage.setItem(SESSION_KEY, data.session_token)
      setUser(data.user)
    }
  }

  return { user, loading, login, logout, devLogin }
}