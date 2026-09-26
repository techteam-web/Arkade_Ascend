import { useLayoutEffect, useRef, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import { gsap, revealIn, revealOut, primeReveal } from './reveal.js'
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
import EnquirePage from '../pages/EnquirePage.jsx'

// Holds the outgoing page on screen while its elements release, then swaps
// to the new route and choreographs its arrival: a simple cross-fade. The
// WebGL scene blends to the new preset underneath at the same time.
export default function TransitionStage({ active }) {
  const location = useLocation()
  const [shown, setShown] = useState(location)
  const stage = useRef(null)
  const leaving = useRef(null)
  const arriving = useRef(null)   // the current page's entrance timeline

  useLayoutEffect(() => {
    if (location.pathname === shown.pathname) {
      // Back to the page that was leaving: cancel its exit and restore it,
      // rather than letting the stale exit finish into another page.
      if (leaving.current?.isActive()) {
        leaving.current.kill()
        leaving.current = null
        sceneStore.leaving = false
        gsap.to([stage.current, ...stage.current.querySelectorAll('[data-reveal]')], { autoAlpha: 1, y: 0, duration: 0.5, ease: 'silk', overwrite: true })
      }
      if (location.key !== shown.key) setShown(location)
      return
    }
    leaving.current?.kill()
    // Arriving from the menu (old page hidden) or with reduced motion: swap
    // before paint, so the previous page never reappears mid-exit.
    if (location.state?.instant || prefersReducedMotion()) {
      setShown(location)
      return
    }
    // Stop the entrance first: an entrance and an exit never share elements.
    arriving.current?.kill()
    sceneStore.leaving = true
    leaving.current = gsap.timeline({ onComplete: () => setShown(location) })
      .add(revealOut(stage.current), 0)
      .to({}, { duration: 0.05 })
  }, [location])

  useLayoutEffect(() => {
    const root = stage.current
    sceneStore.leaving = false
    if (!active) return
    primeReveal(root)
    let timeline
    let cancelled = false
    const context = gsap.context(() => {
      const start = () => {
        if (cancelled) return
        timeline = revealIn(root)
        arriving.current = timeline
        ;[...root.querySelectorAll('h1')].find(heading => heading.offsetParent)?.focus({ preventScroll: true })
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
        <Route path="/enquire" element={<EnquirePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  </>
}
