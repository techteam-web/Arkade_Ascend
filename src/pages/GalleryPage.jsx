import { useEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from '../hooks/useMediaQuery.js'
import { createPortal } from 'react-dom'
import { ImageSlot, PageHeading } from '../components/PageKit.jsx'
import { ChevronIcon } from '../components/Brand.jsx'
import { gallery, galleryDisclaimer, galleryTabs, RENDER_NOTE } from '../content/template.js'
import { pad } from '../app/routes.js'
import useStepper from '../hooks/useStepper.js'


// A flat filmstrip: the current image centred, its neighbours dimmed at the
// edges. CSS transitions retarget smoothly when the visitor browses quickly,
// so no timers queue up.
const POSES = {
  center: 'translate3d(-50%, -50%, 0) scale(1)',
  left: 'translate3d(-156%, -50%, 0) scale(.9)',
  right: 'translate3d(56%, -50%, 0) scale(.9)',
  back: 'translate3d(-50%, -50%, 0) scale(.94)',
}
// An amenity render's name, shown on the picture (template.js).
const describe = image => image.description ?? null

export default function GalleryPage() {
  const [category, setCategory] = useState(galleryTabs[0])
  const [index, setIndex] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const root = useRef(null)
  const filtered = gallery.filter(image => image.category === category)
  const selected = filtered[index] || filtered[0]
  // The WebGL strip (gallery/GalleryStage.js); without WebGL, the filmstrip below.
  const canvas = useRef(null)
  const stage = useRef(null)
  const [strip, setStrip] = useState('loading')   // loading | ready | none
  const step = direction => {
    if (!filtered.length) return
    if (stage.current) stage.current.step(direction)
    else setIndex(value => (value + direction + filtered.length) % filtered.length)
  }
  useEffect(() => {
    let cancelled = false
    import('./gallery/GalleryStage.js').then(({ createGalleryStage }) => {
      if (cancelled || !canvas.current) return
      stage.current = createGalleryStage(canvas.current, { reduced: prefersReducedMotion(), onIndex: setIndex, onOpen: () => setLightbox(true) })
      if (!stage.current) { setStrip('none'); return }
      stage.current.setItems(gallery.filter(image => image.category === category), 0)
      setStrip('ready')
    }).catch(() => { if (!cancelled) setStrip('none') })
    return () => { cancelled = true; stage.current?.dispose(); stage.current = null }
  }, [])
  // A new tab lays its pictures on the strip.
  const laid = useRef(category)
  useEffect(() => {
    if (laid.current === category) return
    laid.current = category
    stage.current?.setItems(filtered, 0)
  }, [category])
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

  return <section ref={root} className="page page-scroll grid grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(14rem,1fr)_auto_auto] gap-4">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <PageHeading id="gallery" title="Gallery" subtitle="Curated visions of Ascend" className="flex-1 basis-64" />
      <div data-reveal role="group" aria-label="Gallery" className="flex flex-wrap gap-2">
        {galleryTabs.map(value => <button key={value} type="button" className="chip" aria-pressed={category === value} onClick={() => choose(value)}>{value}</button>)}
      </div>
    </div>

    <div data-reveal="fade" data-own-gesture className="relative min-h-0 overflow-hidden @container-size" role="region" aria-roledescription="carousel" aria-label="Gallery images">
      {/* The renders on a curved strip in WebGL: drag it, or click one to bring it to the centre. */}
      {strip !== 'none' && <canvas ref={canvas} data-cursor="Drag" aria-hidden="true"
        className={`absolute inset-0 size-full touch-none transition-opacity duration-700 ${strip === 'ready' ? 'opacity-100' : 'opacity-0'}`} />}
      {strip !== 'none' && selected && <div key={`${category}-${index}`} className="finder-in pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-1.5 text-center">
        <span className="text-[0.6rem] uppercase tracking-[0.34em] text-gold-200">{selected.category}</span>
        {describe(selected) && <span className="font-display text-[clamp(1.1rem,min(2vw,3.6vh),1.8rem)] leading-tight text-ivory">{describe(selected)}</span>}
      </div>}
      {strip === 'none' && filtered.map((image, i) => {
        const offset = (i - index + filtered.length) % filtered.length
        const pose = offset === 0 ? 'center' : offset === 1 ? 'right' : offset === filtered.length - 1 ? 'left' : 'back'
        // The image on show and two either side load; the rest wait their turn.
        const near = Math.min(offset, filtered.length - offset) <= 2
        return <figure key={image.src} aria-hidden={offset !== 0}
          className={`absolute left-1/2 top-1/2 m-0 aspect-16/10 w-[min(70cqw,calc(100cqh*1.55))] overflow-hidden rounded-sm border border-gold-500/30 bg-plum-950 shadow-[0_30px_70px_-35px_rgba(0,0,0,.7)] transition-[transform,opacity,filter] duration-900 ease-silk max-md:w-[min(94cqw,calc(100cqh*1.45))] ${pose === 'center' ? 'z-10' : 'z-0'} ${pose === 'left' || pose === 'right' ? 'max-md:opacity-0!' : ''}`}
          style={{ transform: POSES[pose], opacity: pose === 'back' ? 0 : pose === 'center' ? 1 : 0.35, filter: pose === 'center' ? 'none' : 'saturate(.7) brightness(.75)' }}>
          {/* Tall views are shown whole; the rest fill the frame around their focus. */}
          <img src={near ? image.src : undefined} srcSet={near ? image.srcSet : undefined} sizes="(max-width: 767px) 94vw, 64vw" alt={image.alt} draggable="false"
            className={`size-full select-none ${image.fit === 'contain' ? 'object-contain' : 'object-cover'}`} style={{ objectPosition: image.focus }} />
          {pose === 'center'
            ? <button type="button" data-cursor="View" className="absolute inset-0 cursor-zoom-in" onClick={() => setLightbox(true)} aria-label={`View ${image.category} image full screen`} />
            : pose !== 'back' && <button type="button" tabIndex={-1} data-cursor={pose === 'left' ? 'Previous' : 'Next'} className="absolute inset-0" onClick={() => step(pose === 'left' ? -1 : 1)} aria-label={pose === 'left' ? 'Previous image' : 'Next image'} />}
          {pose === 'center' && <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-linear-to-t from-espresso/85 to-transparent px-5 pb-4 pt-14">
            <span className="min-w-0">
              <span className="block text-[0.6rem] uppercase tracking-[0.34em] text-gold-200">{image.category}</span>
              {describe(image) && <span className="mt-1.5 block font-display text-[clamp(1rem,min(1.8vw,3.4vh),1.6rem)] leading-tight text-ivory">{describe(image)}</span>}
            </span>
          </figcaption>}
        </figure>
      })}
      {/* The open picture: the centre one opens full screen from the keyboard too. */}
      {/* Over the centre picture, ringed when it has keyboard focus; the
          pointer passes through it to the strip. */}
      {strip === 'ready' && selected && <button type="button" onClick={() => setLightbox(true)}
        className="pointer-events-none absolute left-1/2 top-1/2 h-(--card-h,62%) w-(--card-w,62%) -translate-x-1/2 -translate-y-1/2 rounded-sm opacity-0 outline-2 outline-offset-6 outline-gold-300 focus-visible:opacity-100">
        <span className="visually-hidden">View {selected.category} image {index + 1} full screen</span>
      </button>}
      {/* A tab without renders yet holds the framed placeholder. */}
      {!selected && <div className="absolute left-1/2 top-1/2 aspect-16/10 w-[min(64cqw,calc(100cqh*1.45))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-sm border border-gold-500/30 max-md:w-[min(94cqw,calc(100cqh*1.45))]">
        <ImageSlot label="Renders to follow" />
      </div>}
      <span className="visually-hidden" aria-live="polite">{selected ? `${selected.category}, image ${index + 1} of ${filtered.length}${describe(selected) ? `: ${describe(selected)}` : ''}` : `${category}: renders to follow`}</span>
    </div>

    <div data-reveal className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <p className="min-w-0 text-[0.6rem] uppercase tracking-[0.3em] text-muted">{selected ? selected.note ?? RENDER_NOTE : `${category} renders to follow`}</p>
      <div className="flex items-center gap-3">
        <button type="button" className="btn-icon" onClick={() => step(-1)} disabled={filtered.length < 2} aria-label="Previous image"><ChevronIcon direction="left" /></button>
        <p className="num w-16 text-center text-base text-fg">{pad(filtered.length ? index + 1 : 0)}<span className="text-muted"> / {pad(filtered.length)}</span></p>
        <button type="button" className="btn-icon" onClick={() => step(1)} disabled={filtered.length < 2} aria-label="Next image"><ChevronIcon /></button>
      </div>
    </div>

    {/* The client's disclaimer: small and quiet, but always on the page. */}
    <p data-reveal className="border-t border-line pt-2.5 text-[clamp(0.58rem,0.66vw,0.72rem)] leading-relaxed tracking-[0.03em] text-muted/85 max-sm:text-[0.54rem] max-sm:leading-snug short:pt-1.5 short:leading-snug">
      <span className="font-medium uppercase tracking-[0.16em] text-muted">Disclaimer: </span>{galleryDisclaimer}
    </p>

    {/* Portalled into the frame: above the page, still beneath the full-screen gate. */}
    {lightbox && selected && createPortal(<div role="dialog" aria-modal="true" aria-label={`${selected.category} image, full screen`} onClick={() => setLightbox(false)}
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
      <div className="absolute bottom-5 left-1/2 w-max max-w-[min(70vw,40rem)] -translate-x-1/2 text-center max-sm:bottom-12">
        {describe(selected) && <p className="mb-1.5 font-display text-[clamp(1rem,1.6vw,1.5rem)] leading-tight text-ivory">{describe(selected)}</p>}
        <p className="text-[0.6rem] uppercase tracking-[0.3em] text-gold-200">{selected.category} · {pad(index + 1)} / {pad(filtered.length)}</p>
      </div>
      <p className="absolute bottom-5 right-(--gutter) text-[0.55rem] uppercase tracking-[0.22em] text-ivory/70 max-sm:bottom-12">{selected.note ?? RENDER_NOTE}</p>
    </div>, document.querySelector('.page-frame') || document.body)}
  </section>
}
