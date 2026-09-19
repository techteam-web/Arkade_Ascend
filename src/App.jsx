import { useState } from 'react'
import GoldRibbonBackground from './GoldRibbon.jsx'
import MenuPage from './MenuPage.jsx'
import GalleryPage from './GalleryPage.jsx'
import { useEffect, useRef } from 'react'

export default function App() {
  const [entered, setEntered] = useState(false)
  const [page, setPage] = useState('home')
  const enterRef = useRef(null)
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
    if (page === 'home') requestAnimationFrame(() => enterRef.current?.focus())
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
    <main className="landing"><div className="page-frame">
      {page === 'home' && <><div className="atmosphere" aria-hidden="true" />
      <div className="cityscape" aria-hidden="true" />

      {!entered && <GoldRibbonBackground className="ribbon-scene" quality={compactRendering ? 'low' : 'high'} bgColor="#28150e" backdrop="transparent" />}
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
      </>}
      {page === 'gallery' && <GalleryPage visible={!entered} quality={compactRendering ? 'low' : 'high'} onExplore={() => setEntered(true)} onHome={() => { setPage('home'); setEntered(false) }} />}
      {entered && <MenuPage onClose={closeWelcome} onNavigate={destination => { setPage(destination); setEntered(false) }} quality={compactRendering ? 'low' : 'high'} />}
    </div></main>
  )
}






