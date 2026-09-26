import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import SilkScene from './scenes/silk/SilkScene.jsx'
import { sceneStore, setScenePreset } from './scenes/sceneStore.js'
import FullscreenGate from './app/FullscreenGate.jsx'
import SiteHeader from './app/SiteHeader.jsx'
import MenuOverlay from './app/MenuOverlay.jsx'
import TransitionStage from './app/TransitionStage.jsx'
import { ShellContext } from './app/ShellContext.js'
import { routeForPath, routes } from './app/routes.js'
import useFullscreen from './hooks/useFullscreen.js'
import useMediaQuery from './hooks/useMediaQuery.js'

// Development-only escape hatch for automated screenshots: ?fullscreen=off
const bypassGate = import.meta.env.DEV && new URLSearchParams(location.search).get('fullscreen') === 'off'
if (import.meta.env.DEV) window.__sceneStore = sceneStore   // for automated checks

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const route = routeForPath(location.pathname)
  const index = routes.indexOf(route)
  const compact = useMediaQuery('(max-width: 900px), (pointer: coarse)')
  const fullscreen = useFullscreen()
  const [started, setStarted] = useState(false)
  const [everStarted, setEverStarted] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButton = useRef(null)

  // Where the Fullscreen API exists it is required; where it does not (for
  // example iPhone Safari) the gate becomes a one-time start screen.
  const gated = !bypassGate && (fullscreen.supported ? !fullscreen.active : !started)
  useEffect(() => { if (!gated) setEverStarted(true) }, [gated])
  useEffect(() => { if (gated) setMenuOpen(false) }, [gated])
  // The menu has its own quiet mood. Closing it
  // without navigating restores the page's own mood; after a navigation the
  // new page's mood (set by the route effect) stands.
  const beforeMenu = useRef(null)
  useLayoutEffect(() => {
    sceneStore.menuOpen = menuOpen
    if (menuOpen) {
      beforeMenu.current = { preset: sceneStore.preset, path: location.pathname }
      setScenePreset('menu')
    } else if (beforeMenu.current) {
      if (beforeMenu.current.path === location.pathname) setScenePreset(beforeMenu.current.preset)
      beforeMenu.current = null
    }
  }, [menuOpen])
  useLayoutEffect(() => { setScenePreset(route.scene) }, [route.scene])

  const enter = async () => {
    if (!fullscreen.supported || !(await fullscreen.request())) setStarted(true)
  }

  const closeMenu = useCallback(() => {
    setMenuOpen(false)
    requestAnimationFrame(() => menuButton.current?.focus({ preventScroll: true }))
  }, [])
  // From the menu the old page is already hidden, so the stage swaps straight
  // to the new page instead of replaying the old page's exit behind it.
  // React Router renders navigations as low-priority transitions; closing the
  // menu separately would paint a frame of the old page. So the menu closes
  // in the same commit as the new location (layout effect below).
  const menuOpenRef = useRef(menuOpen)
  menuOpenRef.current = menuOpen
  const go = useCallback(path => {
    if (menuOpenRef.current && path === location.pathname) { setMenuOpen(false); return }
    navigate(path, { state: { instant: menuOpenRef.current } })
  }, [navigate, location.pathname])
  useLayoutEffect(() => { setMenuOpen(false) }, [location.key])
  const shell = useMemo(() => ({ openMenu: () => setMenuOpen(true), go, menuOpen }), [go, menuOpen])

  return <ShellContext.Provider value={shell}>
    <main className="fixed inset-0 overflow-hidden bg-espresso">
      <SilkScene quality={compact ? 'low' : 'high'} />
      <div className={`page-frame transition-opacity duration-700 ${gated ? 'opacity-0' : 'opacity-100'}`}
        inert={gated ? '' : undefined} aria-hidden={gated || undefined}>
        <div className={`absolute inset-0 transition-opacity duration-700 ${menuOpen ? 'opacity-0' : 'opacity-100'}`} inert={menuOpen ? '' : undefined}>
          <TransitionStage active={!gated} />
        </div>
        <SiteHeader route={route} index={index} hidden={route.id === 'home' || menuOpen} menuOpen={menuOpen}
          onMenu={() => setMenuOpen(true)} menuButton={menuButton} />
        <MenuOverlay open={menuOpen} currentId={route.id} onClose={closeMenu} onNavigate={go} />
      </div>
      <div className="grain" aria-hidden="true" />
      <FullscreenGate open={gated} resumed={everStarted} supported={fullscreen.supported}
        keyboardLocked={fullscreen.keyboardLocked} onEnter={enter} />
    </main>
  </ShellContext.Provider>
}
