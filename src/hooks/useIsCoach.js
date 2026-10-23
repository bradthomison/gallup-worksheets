import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Participants sign in too, so a signed-in user is not necessarily a coach.
// The database decides (is_coach() reads the coaches table). One lookup per user per page load.
const lookups = new Map() // user id -> Promise<boolean>

function lookup(userId) {
  let p = lookups.get(userId)
  if (!p) {
    p = supabase.rpc('is_coach').then(({ data, error }) => {
      if (error) throw error
      return data === true
    })
    p.catch(() => lookups.delete(userId)) // let a failed check be retried
    lookups.set(userId, p)
  }
  return p
}

// Returns { loading, isCoach, error }. While the answer for the *current* user has not come back,
// loading is true, so callers never treat "not asked yet" as "not a coach".
export function useIsCoach(user) {
  const [result, setResult] = useState({ userId: null, isCoach: false, error: null })

  useEffect(() => {
    if (!user) return
    let cancelled = false
    lookup(user.id).then(
      isCoach => { if (!cancelled) setResult({ userId: user.id, isCoach, error: null }) },
      error => { if (!cancelled) setResult({ userId: user.id, isCoach: false, error }) },
    )
    return () => { cancelled = true }
  }, [user?.id])

  if (!user) return { loading: false, isCoach: false, error: null }
  if (result.userId !== user.id) return { loading: true, isCoach: false, error: null }
  return { loading: false, isCoach: result.isCoach, error: result.error }
}
