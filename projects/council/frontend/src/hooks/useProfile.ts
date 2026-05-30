import { useState, useEffect } from 'react'
import { apiRequest } from '../api/client'

interface ProfileHints {
  situation?: string
  cautiousness: number
  assertiveness: number
  risk_tolerance: number
  thinking_style: string
  favored_counselors: string[]
}

export function useProfile(userId: string) {
  const [profile, setProfile] = useState<ProfileHints | null>(null)

  useEffect(() => {
    if (!userId) return
    apiRequest<{ profile: ProfileHints }>(`/api/profile/${userId}`)
      .then(data => setProfile(data.profile))
      .catch(console.error)
  }, [userId])

  return { profile }
}