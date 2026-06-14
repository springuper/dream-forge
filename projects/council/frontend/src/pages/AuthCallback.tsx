import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const exchangeToken = async () => {
      const hash = window.location.hash.slice(1)
      const params = new URLSearchParams(hash)
      const code = params.get('code')
      const state = params.get('state')

      if (!code) {
        alert('OAuth failed: no code returned')
        navigate('/')
        return
      }

      try {
        const res = await fetch('/api/auth/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, state }),
        })

        const data = await res.json()

        if (data.session_token) {
          localStorage.setItem('council_session_token', data.session_token)
          window.location.hash = ''
          navigate('/')
        } else {
          alert('OAuth failed: ' + (data.error || 'unknown error'))
          navigate('/')
        }
      } catch (e) {
        console.error('OAuth callback error:', e)
        alert('OAuth failed')
        navigate('/')
      }
    }

    exchangeToken()
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-100">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-stone-600">登录中...</p>
      </div>
    </div>
  )
}