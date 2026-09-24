import { useEffect, useRef, useState } from 'react'
import GoldRibbonBackground from '../../scenes/gold-ribbon/GoldRibbonBackground.jsx'

const images = [
  { src: '/gallery/exterior.png', category: 'Exterior', alt: 'Concept view of a bronze-toned residential tower illuminated at dusk' },
  { src: '/gallery/interior.png', category: 'Interior', alt: 'Concept living room with a curved sofa and panoramic sunset city views' },
  { src: '/gallery/amenities.png', category: 'Amenities', alt: 'Concept rooftop infinity pool with landscaped seating at sunset' },
  { src: '/mumbai-dusk.png', category: 'Lifestyle', alt: 'Illustrative Mumbai skyline and distant hills at sunset' },
]
const categories = ['All', 'Exterior', 'Interior', 'Amenities', 'Lifestyle']
const pad = value => String(value).padStart(2, '0')

export default function GalleryPage({ onExplore, onHome, quality, visible = true, sharedScene = false, interactive = true }) {
  const [category, setCategory] = useState('All')
  const [index, setIndex] = useState(1)
  const [lightbox, setLightbox] = useState(false)
  const heading = useRef(null)
  const swipe = useRef(null)
  const filtered = category === 'All' ? images : images.filter(image => image.category === category)
  const selected = filtered[index] || filtered[0]
  const step = direction => setIndex(value => (value + direction + filtered.length) % filtered.length)
  useEffect(() => { if (visible && interactive) heading.current?.focus() }, [visible, interactive])
  useEffect(() => { if (!visible) setLightbox(false) }, [visible, interactive])
  useEffect(() => {
    // Decode the small gallery up front so moving cards never reveal an empty frame.
    images.forEach(({ src }) => { const image = new Image(); image.src = src; image.decode?.().catch(() => {}) })
  }, [])
  useEffect(() => {
    if (!lightbox) return
    const onKey = event => {
      if (event.key === 'Escape') { event.preventDefault(); setLightbox(false) }
      if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1) }
      if (event.key === 'ArrowRight') { event.preventDefault(); step(1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox, filtered.length])
  const chooseCategory = value => { setCategory(value); setIndex(value === 'All' ? 1 : 0) }
  return <section className={`gallery-page${sharedScene ? ' gallery-page--shared' : ''}`} aria-label="Gallery" hidden={!visible} aria-hidden={!interactive} inert={interactive ? undefined : ''}>
    <div className="atmosphere" aria-hidden="true" />
    {visible && !sharedScene && <GoldRibbonBackground composition="gallery" quality={quality} bgColor="#28150e" backdrop="transparent" />}
    <header className="gallery-header">
      <button className="gallery-brand menu-logo" onClick={onHome} aria-label="Arkade Ascend home">
        <span className="menu-logo-brand">Arkade</span><span className="menu-logo-name">Ascend</span><span className="menu-logo-locality">Malad West</span>
      </button>
      <button className="gallery-explore" onClick={onExplore}><span>Explore</span><svg viewBox="0 0 30 24" fill="none" aria-hidden="true"><path d="M1 3h28M1 12h28M1 21h28" /></svg></button>
    </header>
    <div className="gallery-heading"><p>06 / 07</p><h1 ref={heading} tabIndex={-1}>Gallery</h1><p>Curated visions of Ascend</p></div>
    <aside className="gallery-corner"><span>Spaces</span><span>People</span><span>Possibilities</span><span>A higher you</span></aside>
    <div className="gallery-carousel" role="region" aria-roledescription="carousel" aria-label="Property concept images"
      onKeyDown={event => { if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1) } if (event.key === 'ArrowRight') { event.preventDefault(); step(1) } }}>
      <div className="gallery-track" tabIndex={0} aria-label={`${selected.category}, image ${index + 1} of ${filtered.length}. Use left and right arrow keys to browse.`}
        onPointerDown={event => { if (event.pointerType !== 'mouse') swipe.current = { x: event.clientX, y: event.clientY } }}
        onPointerCancel={() => { swipe.current = null }}
        onPointerUp={event => { if (!swipe.current) return; const dx = event.clientX - swipe.current.x; const dy = event.clientY - swipe.current.y; if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1); swipe.current = null }}>
        {filtered.map((image, imageIndex) => {
          const offset = (imageIndex - index + filtered.length) % filtered.length
          const position = offset === 0 ? 'center' : offset === 1 ? 'right' : offset === filtered.length - 1 ? 'left' : 'back'
          return <figure key={image.src} className={`gallery-feature gallery-card gallery-card--${position}`} aria-hidden={offset !== 0}>
            <img src={image.src} alt={image.alt} draggable="false" onClick={() => { if (offset === 0) setLightbox(true) }} />
            {offset !== 0 && position !== 'back' && <button className="gallery-card-select" tabIndex={-1} onClick={() => step(position === 'left' ? -1 : 1)} aria-label={`${position === 'left' ? 'Previous' : 'Next'} image`} />}
            {offset === 0 && <button className="gallery-expand" onClick={() => setLightbox(true)} aria-label="View full screen">
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M7 2H2v5M13 2h5v5M7 18H2v-5M13 18h5v-5" /></svg>
            </button>}
            <figcaption><span>A higher<br />way of<br />living</span><span>{pad(imageIndex + 1)} / {pad(filtered.length)}</span></figcaption>
          </figure>
        })}
      </div>
      <span className="visually-hidden" aria-live="polite" aria-atomic="true">{selected.category}, image {index + 1} of {filtered.length}</span>
      <button className="gallery-arrow gallery-arrow--previous" onClick={() => step(-1)} disabled={filtered.length < 2} aria-label="Previous image"><svg viewBox="0 0 20 24" fill="none" aria-hidden="true"><path d="m13 5-7 7 7 7" /></svg></button>
      <button className="gallery-arrow gallery-arrow--next" onClick={() => step(1)} disabled={filtered.length < 2} aria-label="Next image"><svg viewBox="0 0 20 24" fill="none" aria-hidden="true"><path d="m7 5 7 7-7 7" /></svg></button>
    </div>
    <div className="gallery-filters" role="group" aria-label="Filter gallery">{categories.map(value => <button key={value} aria-pressed={category === value} onClick={() => chooseCategory(value)}>{value}</button>)}</div>
    <footer className="gallery-footer"><span>Mumbai<br />rising<br />higher</span><p>A higher way of living</p></footer>
    {lightbox && <div className="gallery-lightbox" role="dialog" aria-modal="true" aria-label={`${selected.category} image, full screen`} onClick={() => setLightbox(false)}>
      <button className="lightbox-close" onClick={() => setLightbox(false)} aria-label="Close full screen">
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M2 2l16 16M18 2 2 18" /></svg>
      </button>
      <button className="gallery-arrow lightbox-arrow lightbox-arrow--previous" onClick={event => { event.stopPropagation(); step(-1) }} disabled={filtered.length < 2} aria-label="Previous image">
        <svg viewBox="0 0 20 24" fill="none" aria-hidden="true"><path d="m13 5-7 7 7 7" /></svg>
      </button>
      <img className="lightbox-image" src={selected.src} alt={selected.alt} onClick={event => event.stopPropagation()} />
      <button className="gallery-arrow lightbox-arrow lightbox-arrow--next" onClick={event => { event.stopPropagation(); step(1) }} disabled={filtered.length < 2} aria-label="Next image">
        <svg viewBox="0 0 20 24" fill="none" aria-hidden="true"><path d="m7 5 7 7-7 7" /></svg>
      </button>
      <p className="lightbox-caption">{selected.category} — {pad(index + 1)} / {pad(filtered.length)}</p>
    </div>}
  </section>
}

