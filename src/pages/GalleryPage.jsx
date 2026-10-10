import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { PageHeading } from '../components/PageKit.jsx'
import { ChevronIcon } from '../components/Brand.jsx'
import { gallery } from '../content/template.js'
import { pad } from '../app/routes.js'
import useStepper from '../hooks/useStepper.js'

const categories = ['All', ...new Set(gallery.map(image => image.category))]

// A flat filmstrip: the current image centred, its neighbours dimmed at the
// edges. CSS transitions retarget smoothly when the visitor browses quickly,
// so no timers queue up.
const POSES = {
  center: 'translate3d(-50%, -50%, 0) scale(1)',
  left: 'translate3d(-156%, -50%, 0) scale(.9)',
  right: 'translate3d(56%, -50%, 0) scale(.9)',
  back: 'translate3d(-50%, -50%, 0) scale(.94)',
}

export default function GalleryPage() {
  const [category, setCategory] = useState('All')
  const [index, setIndex] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const root = useRef(null)
  const filtered = category === 'All' ? gallery : gallery.filter(image => image.category === category)
  const selected = filtered[index] || filtered[0]
  const step = direction => setIndex(value => (value + direction + filtered.length) % filtered.length)
  useStepper(root, { onNext: () => step(1), onPrev: () => step(-1), lock: 650, keys: !lightbox })

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

  const choose = value => { setCategory(value); setIndex(0) }

  return <section ref={root} className="page page-scroll grid grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(14rem,1fr)_auto] gap-4">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <PageHeading id="gallery" title="Gallery" subtitle="Curated visions of Ascend" className="flex-1 basis-64" />
      {/* Filters only once there is more than one category to choose from. */}
      {categories.length > 2 && <div data-reveal role="group" aria-label="Filter gallery" className="flex flex-wrap gap-2">
        {categories.map(value => <button key={value} type="button" className="chip" aria-pressed={category === value} onClick={() => choose(value)}>{value}</button>)}
      </div>}
    </div>

    <div data-reveal="fade" className="relative min-h-0 overflow-hidden @container-size" role="region" aria-roledescription="carousel" aria-label="Gallery images">
      {filtered.map((image, i) => {
        const offset = (i - index + filtered.length) % filtered.length
        const pose = offset === 0 ? 'center' : offset === 1 ? 'right' : offset === filtered.length - 1 ? 'left' : 'back'
        // The image on show and two either side load; the rest wait their turn.
        const near = Math.min(offset, filtered.length - offset) <= 2
        return <figure key={image.src} aria-hidden={offset !== 0}
          className={`absolute left-1/2 top-1/2 m-0 aspect-16/10 w-[min(64cqw,calc(100cqh*1.45))] overflow-hidden rounded-sm border border-gold-500/30 bg-plum-950 shadow-[0_30px_70px_-35px_rgba(0,0,0,.7)] transition-[transform,opacity,filter] duration-900 ease-silk max-md:w-[min(94cqw,calc(100cqh*1.45))] ${pose === 'center' ? 'z-10' : 'z-0'} ${pose === 'left' || pose === 'right' ? 'max-md:opacity-0!' : ''}`}
          style={{ transform: POSES[pose], opacity: pose === 'back' ? 0 : pose === 'center' ? 1 : 0.35, filter: pose === 'center' ? 'none' : 'saturate(.7) brightness(.75)' }}>
          {/* Tall views are shown whole; the rest fill the frame around their focus. */}
          <img src={near ? image.src : undefined} srcSet={near ? image.srcSet : undefined} sizes="(max-width: 767px) 94vw, 64vw" alt={image.alt} draggable="false"
            className={`size-full select-none ${image.fit === 'contain' ? 'object-contain' : 'object-cover'}`} style={{ objectPosition: image.focus }} />
          {pose === 'center'
            ? <button type="button" className="absolute inset-0 cursor-zoom-in" onClick={() => setLightbox(true)} aria-label={`View ${image.category} image full screen`} />
            : pose !== 'back' && <button type="button" tabIndex={-1} className="absolute inset-0" onClick={() => step(pose === 'left' ? -1 : 1)} aria-label={pose === 'left' ? 'Previous image' : 'Next image'} />}
          {pose === 'center' && <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-linear-to-t from-espresso/85 to-transparent px-5 pb-4 pt-14">
            <span className="text-[0.6rem] uppercase tracking-[0.34em] text-gold-200">{image.category}</span>
            <span className="num text-[0.7rem] text-ivory/80">{pad(i + 1)} / {pad(filtered.length)}</span>
          </figcaption>}
        </figure>
      })}
      <span className="visually-hidden" aria-live="polite">{selected.category}, image {index + 1} of {filtered.length}</span>
    </div>

    <div data-reveal className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <p className="min-w-0 text-[0.6rem] uppercase tracking-[0.3em] text-muted">{selected.note ?? 'Concept imagery · representational'}</p>
      <div className="flex items-center gap-3">
        <button type="button" className="btn-icon" onClick={() => step(-1)} disabled={filtered.length < 2} aria-label="Previous image"><ChevronIcon direction="left" /></button>
        <p className="num w-16 text-center text-base text-fg">{pad(index + 1)}<span className="text-muted"> / {pad(filtered.length)}</span></p>
        <button type="button" className="btn-icon" onClick={() => step(1)} disabled={filtered.length < 2} aria-label="Next image"><ChevronIcon /></button>
      </div>
    </div>

    {/* Portalled into the frame: above the page, still beneath the full-screen gate. */}
    {lightbox && createPortal(<div role="dialog" aria-modal="true" aria-label={`${selected.category} image, full screen`} onClick={() => setLightbox(false)}
      className="absolute inset-0 z-70 grid grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)] place-items-center bg-ink/95 p-[clamp(1rem,4vw,4rem)] backdrop-blur-md">
      {/* The one grid cell has a definite size, so a tall image fits its
          height too; the size it is drawn at picks the file. */}
      <img src={selected.src} srcSet={selected.srcSet} sizes={selected.aspect ? `min(100vw, ${Math.round(selected.aspect * 100)}vh)` : '100vw'} alt={selected.alt}
        onClick={event => event.stopPropagation()} className="max-h-full max-w-full rounded-sm object-contain shadow-2xl" />
      <button type="button" autoFocus className="btn-icon absolute right-(--gutter) top-5" onClick={() => setLightbox(false)} aria-label="Close full screen">
        <svg viewBox="0 0 24 24"><path d="m5 5 14 14M19 5 5 19" /></svg>
      </button>
      <button type="button" className="btn-icon absolute left-(--gutter) top-1/2" onClick={event => { event.stopPropagation(); step(-1) }} aria-label="Previous image"><ChevronIcon direction="left" /></button>
      <button type="button" className="btn-icon absolute right-(--gutter) top-1/2" onClick={event => { event.stopPropagation(); step(1) }} aria-label="Next image"><ChevronIcon /></button>
      <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-[0.6rem] uppercase tracking-[0.3em] text-gold-200">{selected.category} · {pad(index + 1)} / {pad(filtered.length)}</p>
    </div>, document.querySelector('.page-frame') || document.body)}
  </section>
}
