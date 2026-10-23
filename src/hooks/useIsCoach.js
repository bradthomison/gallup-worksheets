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

export function useIsCoach(user) {
  const [state, setState] = useState({ loading: !!user, isCoach: false, error: null })

  useEffect(() => {
    if (!user) { setState({ loading: false, isCoach: false, error: null }); return }
    let cancelled = false
    setState(s => ({ ...s, loading: true }))
    lookup(user.id).then(
      isCoach => { if (!cancelled) setState({ loading: false, isCoach, error: null }) },
      error => { if (!cancelled) setState({ loading: false, isCoach: false, error }) },
    )
    return () => { cancelled = true }
  }, [user?.id])

  return state
}
