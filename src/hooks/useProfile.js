import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useProfile(user) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setProfile(data)
        setLoading(false)
      })
  }, [user])

  async function saveDisplayName(name) {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, display_name: name.trim(), updated_at: new Date().toISOString() })
      .select()
      .single()
    if (!error) setProfile(data)
    return error
  }

  return { profile, loading, saveDisplayName }
}
