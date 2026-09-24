import { useState, useEffect, useRef } from 'react'
import GoldRibbonBackground from './scenes/gold-ribbon/GoldRibbonBackground.jsx'
import MenuPage from './pages/menu/MenuPage.jsx'
import GalleryPage from './pages/gallery/GalleryPage.jsx'
import ResidencesExperience from './pages/residences/ResidencesExperience.jsx'
import useResidencesTransition from './transitions/useResidencesTransition.js'
import useIntroTransition from './transitions/useIntroTransition.js'
import useGalleryTransition from './transitions/useGalleryTransition.js'

export default function App() {
  const [entered, setEntered] = useState(false)
  const [page, setPage] = useState('home')
  const [busy, setBusy] = useState(false)
  const enterRef = useRef(null)
  const frameRef = useRef(null)
  const motion = useRef({ progress: 0, energy: 0, gallery: 0, residences: 0, residenceLight: 0 })
  const menuPreview = useRef({ outward: 0, flat: 0, energy: 0, shift: 0 })
  const intro = useIntroTransition(frameRef, motion, entered, page, enterRef)
  const { openGallery, returnMenu } = useGalleryTransition({ root: frameRef, motion, intro, setPage, setEntered, setBusy })
  const { openResidences, returnResidenceMenu } = useResidencesTransition({ root: frameRef, motion, intro, setPage, setEntered, setBusy })
  const [compactRendering, setCompactRendering] = useState(false)
  useEffect(() => {
    const query = matchMedia('(max-width: 900px), (pointer: coarse)')
    const update = () => setCompactRendering(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  const closeWelcome = () => {
    setEntered(false)

  }
  const resetMagnet = () => {
    enterRef.current?.style.setProperty('--magnet-x', '0px')
    enterRef.current?.style.setProperty('--magnet-y', '0px')
  }
  const moveMagnet = (event) => {
    if (event.pointerType !== 'mouse' || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - bounds.left - bounds.width / 2) * .12
    const y = (event.clientY - bounds.top - bounds.height / 2) * .12
    enterRef.current?.style.setProperty('--magnet-x', `${Math.max(-7, Math.min(7, x))}px`)
    enterRef.current?.style.setProperty('--magnet-y', `${Math.max(-7, Math.min(7, y))}px`)
  }
  return (
    <main className="landing"><div ref={frameRef} className={`page-frame home-experience${busy ? ' is-navigating' : ''}`}>
      <GoldRibbonBackground className="ribbon-scene" motion={motion} preview={menuPreview} quality={compactRendering ? 'low' : 'high'} bgColor="#28150e" backdrop="transparent" />
      <><div className="atmosphere" aria-hidden="true" />
      <div className="cityscape" aria-hidden="true" />


      <div className="scene-shade" aria-hidden="true" />
      <aside className="corner-copy corner-copy--top"><span>Spaces</span><span>People</span><span>Possibilities</span><span>A higher you</span></aside>
      <div className="ascend-mark" aria-hidden="true"><i /><i /><i /><i /><i /></div>
      <section className="identity" aria-label="Arkade Ascend, Malad West">
        <p className="brand">Arkade</p>
        <h1>Ascend</h1>
        <p className="locality">Malad West</p>
      </section>
      <div className="entry">
        <div className="entry-line" aria-hidden="true" />
        <p className="tagline">A higher way of living</p>
        <div className="enter-hit-area" onPointerMove={moveMagnet} onPointerLeave={resetMagnet} onPointerCancel={resetMagnet}>
        <button ref={enterRef} className="enter-button" disabled={entered} onBlur={resetMagnet} onClick={() => { resetMagnet(); setEntered(true) }} aria-label="Enter Arkade Ascend">
          <span>Enter</span><svg viewBox="0 0 32 12" fill="none" aria-hidden="true"><path d="M1 6h28m-5-5 5 5-5 5" /></svg>
        </button>
        </div>
      </div>
      <aside className="corner-copy corner-copy--bottom"><span>Mumbai</span><span>Rising</span><span>Higher</span></aside>
      </>
      <GalleryPage sharedScene visible interactive={page === 'gallery' && !busy} quality={compactRendering ? 'low' : 'high'} onExplore={() => returnMenu()} onHome={() => returnMenu(true)} />

      <ResidencesExperience interactive={page === 'residences' && !busy} motion={motion} onExplore={() => returnResidenceMenu()} onHome={() => returnResidenceMenu(true)} />
      <MenuPage preview={menuPreview} sharedScene open={entered && page === 'home' && !busy} onClose={closeWelcome} onNavigate={destination => { if (busy) return; if (destination === 'gallery') openGallery(); else if (destination === 'residences') openResidences(); else if (destination === 'home') setEntered(false) }} quality={compactRendering ? 'low' : 'high'} />
    </div></main>
  )
}












