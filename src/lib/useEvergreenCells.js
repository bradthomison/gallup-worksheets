import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './supabase'

// Loads and auto-saves cells for an evergreen worksheet.
// email and worksheetType must be non-empty before persistence activates.
// variant defaults to '' (pass the P2 variant key for Power of 2 pages).
export function useEvergreenCells(email, worksheetType, variant = '') {
  const [cells, setCells] = useState({})
  const [saveStatus, setSaveStatus] = useState('idle') // 'idle' | 'saving' | 'saved' | 'error'
  const loaded = useRef(false)
  const saveTimer = useRef(null)

  // Load once when email becomes available
  useEffect(() => {
    if (!email || !worksheetType) return
    loaded.current = false
    supabase
      .rpc('get_evergreen_responses', {
        p_email: email.trim().toLowerCase(),
        p_worksheet_type: worksheetType,
        p_variant: variant,
      })
      .then(({ data }) => {
        setCells(data && typeof data === 'object' ? data : {})
        loaded.current = true
      })
  }, [email, worksheetType, variant])

  // Auto-save 800 ms after the last change
  useEffect(() => {
    if (!loaded.current || !email || !worksheetType) return
    clearTimeout(saveTimer.current)
    setSaveStatus('saving')
    saveTimer.current = setTimeout(async () => {
      const { error } = await supabase.rpc('save_evergreen_responses', {
        p_email: email.trim().toLowerCase(),
        p_worksheet_type: worksheetType,
        p_variant: variant,
        p_cells: cells,
      })
      setSaveStatus(error ? 'error' : 'saved')
      if (!error) setTimeout(() => setSaveStatus('idle'), 2000)
    }, 800)
    return () => clearTimeout(saveTimer.current)
  }, [cells])

  const updateCell = useCallback((key, value) => {
    setCells(prev => ({ ...prev, [key]: value }))
  }, [])

  return { cells, setCells, updateCell, saveStatus }
}
