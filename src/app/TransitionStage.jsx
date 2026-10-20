import { useLayoutEffect, useRef, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import { gsap, revealIn, revealOut, primeReveal, settleReveal } from './reveal.js'
import { routeForPath, sectionIndex } from './routes.js'
import { prefersReducedMotion } from '../hooks/useMediaQuery.js'
import { sceneStore } from '../scenes/sceneStore.js'
import HomePage from '../pages/HomePage.jsx'
import NeuGenPage from '../pages/NeuGenPage.jsx'
import TowerPage from '../pages/TowerPage.jsx'
import ResidencesPage from '../pages/ResidencesPage.jsx'
import FloorPlansPage from '../pages/FloorPlansPage.jsx'
import SpecificationsPage from '../pages/SpecificationsPage.jsx'
import AmenitiesPage from '../pages/AmenitiesPage.jsx'
import ViewsPage from '../pages/ViewsPage.jsx'
import LocationPage from '../pages/LocationPage.jsx'
import GalleryPage from '../pages/GalleryPage.jsx'
import ArkadeFamilyPage from '../pages/ArkadeFamilyPage.jsx'

// Holds the outgoing page on screen while the lift (LiftCurtain) rises over
// it, swaps to the new route once the screen is covered, then lets the lift
// carry on as the new page rises in behind it. A later section rides up, an
// earlier one down. From the menu (the old page already hidden) and under
// reduced motion the swap is immediate. The WebGL scene blends to the new
// preset underneath at the same time.
// The lift itself lives in the shell (App.jsx), above the menu; `curtain` is its handle.
export default function TransitionStage({ active, onCovered, curtain }) {
  const location = useLocation()
  const [shown, setShown] = useState(location)
  const stage = useRef(null)
  const leaving = useRef(null)
  const arriving = useRef(null)   // the current page's entrance timeline
  // { direction, to } from the moment the lift sets off until it has let the
  // new page through. Matched by path, not cleared on first use: StrictMode
  // runs the arrival twice and the second run must still find it.
  const lifting = useRef(null)
  const latest = useRef(location)
  latest.current = location
  // Set by the first real navigation: from then on an arriving page takes
  // focus to its heading. The first page of a visit leaves focus at the top,
  // so Tab finds the skip link first.
  const navigated = useRef(false)

  useLayoutEffect(() => {
    if (location.pathname === shown.pathname) {
      // Back to the page that was leaving: cancel its exit and restore it,
      // rather than letting the stale exit finish into another page.
      if (leaving.current?.isActive()) {
        leaving.current.kill()
        leaving.current = null
        lifting.current = null
        sceneStore.leaving = false
        curtain.current?.clear()
        settleReveal(stage.current)
        gsap.to([stage.current, ...stage.current.querySelectorAll('[data-reveal]')], { autoAlpha: 1, y: 0, duration: 0.5, ease: 'silk', overwrite: true })
      }
      if (location.key !== shown.key) setShown(location)
      return
    }
    navigated.current = true
    // Already travelling: the lift's display shows the newer stop and the
    // stage swaps to it once covered (the swap reads the latest location).
    if (leaving.current?.isActive() && lifting.current) {
      curtain.current?.retarget(routeForPath(location.pathname))
      lifting.current.to = location.pathname
      return
    }
    leaving.current?.kill()
    // Arriving from the menu (old page hidden) or with reduced motion: swap
    // before paint, so the previous page never reappears mid-exit.
    if (location.state?.instant || prefersReducedMotion()) {
      lifting.current = null
      curtain.current?.clear()
      onCovered?.()
      setShown(location)
      return
    }
    // Stop the entrance first: an entrance and an exit never share elements.
    arriving.current?.kill()
    sceneStore.leaving = true
    const fromRoute = routeForPath(shown.pathname)
    const toRoute = routeForPath(location.pathname)
    const direction = sectionIndex(toRoute.id) >= sectionIndex(fromRoute.id) ? 1 : -1
    lifting.current = { direction, to: location.pathname }
    leaving.current = gsap.timeline({ onComplete: () => { onCovered?.(); setShown(latest.current) } })
      .add(revealOut(stage.current, direction), 0)
      .add(curtain.current.cover({ fromRoute, toRoute, direction }), 0)
      .to({}, { duration: 0.12 })
  }, [location])

  useLayoutEffect(() => {
    const root = stage.current
    sceneStore.leaving = false
    if (!active) return
    primeReveal(root)
    // The lift that brought this page, if any: it carries on as the page rises.
    const lift = lifting.current?.to === shown.pathname ? lifting.current : null
    let timeline
    let cancelled = false
    const context = gsap.context(() => {
      const start = () => {
        if (cancelled) return
        timeline = gsap.timeline()
        if (lift) timeline.add(curtain.current.reveal(lift), 0).call(() => { if (lifting.current === lift) lifting.current = null }, null, 0.95)
        timeline.add(revealIn(root), lift ? 0.3 : 0)
        arriving.current = timeline
        if (navigated.current) [...root.querySelectorAll('h1')].find(heading => heading.offsetParent)?.focus({ preventScroll: true })
      }
      // SplitText needs final font metrics for its line breaks.
      if (document.fonts?.status === 'loaded') start()
      else document.fonts.ready.then(() => { if (!cancelled) context.add(start) })
    }, root)
    return () => { cancelled = true; timeline?.kill(); context.revert() }
  }, [shown.pathname, active])

  // The header takes a soft ground while a page's own content is scrolled.
  useLayoutEffect(() => {
    const root = stage.current
    const html = document.documentElement
    html.removeAttribute('data-scrolled')
    const onScroll = event => {
      if (event.target.classList?.contains('page')) html.toggleAttribute('data-scrolled', event.target.scrollTop > 6)
    }
    root.addEventListener('scroll', onScroll, true)
    return () => root.removeEventListener('scroll', onScroll, true)
  }, [shown.pathname])

  return <>
    <div ref={stage} className="absolute inset-0" key={shown.pathname}>
      <Routes location={shown}>
        <Route path="/" element={<HomePage />} />
        <Route path="/neu-gen" element={<NeuGenPage />} />
        <Route path="/tower" element={<TowerPage />} />
        <Route path="/residences/*" element={<ResidencesPage />} />
        <Route path="/floor-plans" element={<FloorPlansPage />} />
        <Route path="/specifications" element={<SpecificationsPage />} />
        <Route path="/amenities" element={<AmenitiesPage />} />
        <Route path="/views" element={<ViewsPage />} />
        <Route path="/location" element={<LocationPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/about-us" element={<ArkadeFamilyPage />} />
        <Route path="/arkade-family" element={<Navigate to="/about-us" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  </>
}
