import { useCallback, useEffect, useState } from 'react'

const element = () => document.fullscreenElement || document.webkitFullscreenElement || null
const isSupported = () => !!(document.fullscreenEnabled || document.webkitFullscreenEnabled)

// Fullscreen state plus a request that also locks Escape where the Keyboard
// Lock API exists (Chromium): Esc then reaches the page to close menus, and
// the visitor presses and holds Esc to leave full screen.
export default function useFullscreen() {
  const [active, setActive] = useState(() => !!element())
  const [supported] = useState(isSupported)
  const [keyboardLocked, setKeyboardLocked] = useState(false)

  useEffect(() => {
    const update = () => {
      const on = !!element()
      setActive(on)
      if (!on) setKeyboardLocked(false)
    }
    document.addEventListener('fullscreenchange', update)
    document.addEventListener('webkitfullscreenchange', update)
    return () => {
      document.removeEventListener('fullscreenchange', update)
      document.removeEventListener('webkitfullscreenchange', update)
    }
  }, [])

  const request = useCallback(async () => {
    const root = document.documentElement
    const enter = root.requestFullscreen || root.webkitRequestFullscreen
    if (!enter) return false
    try {
      await enter.call(root, { navigationUI: 'hide' })
    } catch {
      return false
    }
    try {
      await navigator.keyboard?.lock?.(['Escape'])
      setKeyboardLocked(!!navigator.keyboard?.lock)
    } catch { /* unsupported or refused: Esc simply exits */ }
    return true
  }, [])

  return { active, supported, request, keyboardLocked }
}
