import { useEffect, useRef } from 'react'
import { api } from '../api/client'

const IDLE_LIMIT_MS = 2 * 60 * 60 * 1000 // 2 hours
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

export function useIdleLogout() {
  const lastActivityRef = useRef(Date.now())

  useEffect(() => {
    function resetTimer() {
      lastActivityRef.current = Date.now()
    }

    // Track real user activity
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll']
    events.forEach(evt => window.addEventListener(evt, resetTimer, { passive: true }))

    // Send heartbeat based on real activity (only if user has been active recently)
    const heartbeatTimer = setInterval(() => {
      const idle = Date.now() - lastActivityRef.current
      if (idle < IDLE_LIMIT_MS) {
        // User has been active recently — tell server
        api.sendHeartbeat?.().catch(() => {})
      }
    }, HEARTBEAT_INTERVAL_MS)

    return () => {
      events.forEach(evt => window.removeEventListener(evt, resetTimer))
      clearInterval(heartbeatTimer)
    }
  }, [])
}
