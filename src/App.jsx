import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { sceneStore, setScenePreset } from './scenes/sceneStore.js'
import FullscreenGate from './app/FullscreenGate.jsx'
import SiteHeader from './app/SiteHeader.jsx'
import MenuOverlay from './app/MenuOverlay.jsx'
import TransitionStage from './app/TransitionStage.jsx'
import Cursor from './app/Cursor.jsx'
import { ShellContext } from './app/ShellContext.js'
import { routeForPath } from './app/routes.js'
import useFullscreen from './hooks/useFullscreen.js'
import useMediaQuery from './hooks/useMediaQuery.js'

// The silk (three.js, the largest library) downloads alongside the app
// rather than ahead of it: the intro gate covers the first seconds, and a
// still plum ground stands in until the silk is ready.
const silkModule = import('./scenes/silk/SilkScene.jsx')
const SilkScene = lazy(() => silkModule)
const PLUM_GROUND = <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_80%_at_30%_20%,#4e373c,#21161a_75%)]" />

// Development-only escape hatch for automated screenshots: ?fullscreen=off
const bypassGate = import.meta.env.DEV && new URLSearchParams(location.search).get('fullscreen') === 'off'
if (import.meta.env.DEV) window.__sceneStore = sceneStore   // for automated checks

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const route = routeForPath(location.pathname)
  const compact = useMediaQuery('(max-width: 900px), (pointer: coarse)')
  const fullscreen = useFullscreen()
  const [started, setStarted] = useState(false)
  const [everStarted, setEverStarted] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  // A page can set the header's tone while it shows a light ground (About
  // Us on gold); it clears it again as it leaves.
  const [tone, setTone] = useState(null)
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
  // Each section has its own title in the tab, history and shared links.
  useEffect(() => {
    document.title = route.id === 'home' ? 'Arkade Ascend | Malad West' : `${route.label} | Arkade Ascend, Malad West`
    document.querySelector('meta[name="description"]')?.setAttribute('content', route.id === 'home'
      ? 'Arkade Ascend, Malad West: a 37-storey tower by Arkade Developers. Malad’s Neu Gen life has arrived.'
      : `${route.label}: ${route.hint}. Arkade Ascend, Malad West, by Arkade Developers.`)
  }, [route.id])
  // The skip link moves focus to the page's heading, past the header.
  const skip = event => {
    event.preventDefault()
    ;[...document.querySelectorAll('.page-frame h1')].find(heading => heading.offsetParent)?.focus()
  }

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
  const shell = useMemo(() => ({ openMenu: () => setMenuOpen(true), go, menuOpen, setTone }), [go, menuOpen])

  return <ShellContext.Provider value={shell}>
    <a href="#content" onClick={skip} className="skip-link">Skip to content</a>
    <main id="content" className="fixed inset-0 overflow-hidden bg-espresso">
      <Suspense fallback={PLUM_GROUND}><SilkScene quality={compact ? 'low' : 'high'} /></Suspense>
      <div className={`page-frame transition-opacity duration-700 ${gated ? 'opacity-0' : 'opacity-100'}`}
        inert={gated ? '' : undefined} aria-hidden={gated || undefined}>
        <div className={`absolute inset-0 transition-opacity duration-700 ${menuOpen ? 'opacity-0' : 'opacity-100'}`} inert={menuOpen ? '' : undefined}>
          <TransitionStage active={!gated} />
        </div>
        <SiteHeader route={route} tone={tone} hidden={menuOpen} menuOpen={menuOpen}
          onMenu={() => setMenuOpen(true)} menuButton={menuButton} />
        <MenuOverlay open={menuOpen} currentId={route.id} onClose={closeMenu} onNavigate={go} />
      </div>
      <div className="grain" aria-hidden="true" />
      {/* The BrainWing credit: small, at the foot of every screen, above
          everything (menu, overlays, the gate), in the tone of what is under
          it so it always reads. The logo is a mask filled with that tone. */}
      <div data-credit data-tone={gated || menuOpen ? 'dark' : tone || route.tone || 'dark'} className="credit pointer-events-none fixed z-[110]">
        <div role="img" aria-label="Developed by BrainWing Innovations" className="credit-mark aspect-[800/214] bg-fg opacity-85" />
      </div>
      <FullscreenGate open={gated} resumed={everStarted} supported={fullscreen.supported}
        keyboardLocked={fullscreen.keyboardLocked} onEnter={enter} />
      <Cursor />
    </main>
  </ShellContext.Provider>
}
