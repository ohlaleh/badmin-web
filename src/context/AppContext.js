"use client"

import React, { createContext, useContext, useRef, useState, useCallback } from 'react'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [effectiveNextShow, setEffectiveNextShow] = useState(0)
  const [resetting, setResetting] = useState(false)

  // allow page to register a reset handler that will be invoked when header requests reset
  const onRequestResetRef = useRef(null)

  const setOnRequestReset = useCallback((fn) => {
    onRequestResetRef.current = fn
    return () => { onRequestResetRef.current = null }
  }, [])

  const requestReset = useCallback(() => {
    if (typeof onRequestResetRef.current === 'function') {
      try { onRequestResetRef.current() } catch (e) { console.error('onRequestReset handler failed', e) }
    }
  }, [])

  const value = {
    effectiveNextShow,
    setEffectiveNextShow,
    resetting,
    setResetting,
    setOnRequestReset,
    requestReset,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useAppContext() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used within AppProvider')
  return ctx
}

export default AppContext
