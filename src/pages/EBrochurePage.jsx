import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from '../app/reveal.js'
import { PageHeading } from '../components/PageKit.jsx'
import { ChevronIcon } from '../components/Brand.jsx'
import useStepper from '../hooks/useStepper.js'
import useMediaQuery, { prefersReducedMotion } from '../hooks/useMediaQuery.js'
import { useShell } from '../app/ShellContext.js'

// The e-brochure (`9x14_in_Arkade Ascend-E-Presenter.pdf`, supplied 30 Oct 2026)
// read in the page, on the gold ground. Its 28 sheets are rendered to WebP in
// public/e-brochure/ (see public/asset-notes.md): sheet 1 is the front cover
// and 28 the back, each a single page; sheets 2 to 27 are two-page spreads.
// Landscape screens show the brochure as a book: the front cover alone on the
// right, then each spread, then the back cover alone on the left. Portrait
// screens (phones, tablets held upright) show one page at a time, each spread
// split into its two pages: 54 pages in all. A change of page is a turn: the
// page on show stays still and the new one sweeps across it in the direction
// of travel (right to left going on, left to right going back), a soft shadow
// riding its edge like a sheet of paper; nothing slides or fades.
const SHEETS = 28
const SPREAD = 1296 / 1015.37       // a spread's width over its height
const PAGE = 648 / 1015.37          // one page's (the covers, a touch shorter, fill it)
const PDF = '/e-brochure/arkade-ascend-e-presenter.pdf'
const isSingle = sheet => sheet === 1 || sheet === SHEETS
// `v`: the files keep their names, so caches must not mix two brochures.
const file = (sheet, width) => `/e-brochure/p${String(sheet).padStart(2, '0')}-${width}.webp?v=2`
const sources = sheet => isSingle(sheet)
  ? { src: file(sheet, 900), srcSet: `${file(sheet, 900)} 900w, ${file(sheet, 1800)} 1800w` }
  : { src: file(sheet, 1800), srcSet: `${file(sheet, 1800)} 1800w, ${file(sheet, 3600)} 3600w` }

// Pages one at a time: the cover, both halves of every spread, the back.
const PAGES = [{ sheet: 1 }, ...Array.from({ length: SHEETS - 2 }, (_, i) => [{ sheet: i + 2, half: 'left' }, { sheet: i + 2, half: 'right' }]).flat(), { sheet: SHEETS }]
const TOTAL = PAGES.length
// The book's views (landscape): which pages each shows.
const VIEWS = Array.from({ length: SHEETS }, (_, sheet) => sheet === 0 ? [0] : sheet === SHEETS - 1 ? [TOTAL - 1] : [2 * sheet - 1, 2 * sheet])
const viewOf = page => VIEWS.findIndex(pages => pages.includes(page))
const pad = n => String(n).padStart(2, '0')

export default function EBrochurePage() {
  const root = useRef(null)
  const stage = useRef(null)
  const book = !useMediaQuery('(orientation: portrait)')
  // The position is kept as a page, so turning the screen keeps the place.
  const [page, setPage] = useState(0)
  const view = book ? viewOf(page) : page
  const last = book ? VIEWS.length - 1 : TOTAL - 1
  const [leaving, setLeaving] = useState(null)       // { view, book, dir } fading out under the new one
  const shown = useRef({ view, book })
  // The brochure always opens on its cover: leaving the page closes it, and
  // the menu (which only covers the page) takes it back to the start.
  const { menuOpen } = useShell()
  useEffect(() => { if (menuOpen) { setLeaving(null); setPage(0) } }, [menuOpen])

  const go = direction => {
    const next = Math.max(0, Math.min(last, view + direction))
    if (next === view) return
    setLeaving({ ...shown.current, dir: direction })
    setPage(book ? VIEWS[next][0] : next)
  }
  useStepper(root, { onNext: () => go(1), onPrev: () => go(-1), lock: 450 })

  // The turn: the new view is uncovered across the old one, its edge shaded.
  const animated = useRef(`${view}-${book}`)
  useLayoutEffect(() => {
    const key = `${view}-${book}`
    if (animated.current === key) return
    animated.current = key
    shown.current = { view, book }
    if (prefersReducedMotion() || !leaving || leaving.book !== book) { setLeaving(null); return }
    const context = gsap.context(() => {
      const forward = leaving.dir > 0
      gsap.timeline({ defaults: { duration: 0.8, ease: 'power2.inOut' }, onComplete: () => setLeaving(null) })
        .fromTo('[data-turn="in"] [data-book]', { clipPath: forward ? 'inset(0% 0% 0% 100%)' : 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', clearProps: 'clipPath' }, 0)
        .fromTo('[data-turn="in"] [data-edge]', { left: forward ? '100%' : '0%', autoAlpha: 1 }, { left: forward ? '0%' : '100%' }, 0)
        .to('[data-turn="in"] [data-edge]', { autoAlpha: 0, duration: 0.25, ease: 'power1.out' }, 0.62)
    }, stage)
    return () => context.revert()
  }, [view, book])

  // The views either side load ahead, so a turn shows at once.
  useEffect(() => {
    const near = [view - 1, view + 1, view + 2].filter(v => v >= 0 && v <= last)
    near.forEach(v => {
      const sheets = book ? VIEWS[v].map(p => PAGES[p].sheet) : [PAGES[v].sheet]
      sheets.forEach(sheet => { const image = new Image(); const s = sources(sheet); image.sizes = '100vw'; image.srcset = s.srcSet; image.src = s.src })
    })
  }, [view, book, last])

  const pagesOf = (v, asBook) => asBook ? VIEWS[v] : [v]
  const label = pages => pages.length === 2 ? <><span className="num">{pad(pages[0] + 1)}</span>–<span className="num">{pad(pages[1] + 1)}</span></> : <span className="num">{pad(pages[0] + 1)}</span>
  const current = pagesOf(view, book)
  const place = current.length === 2 ? `Pages ${current[0] + 1} and ${current[1] + 1}` : `Page ${current[0] + 1}`

  const controls = <div className="flex items-center gap-3">
    <button type="button" className="btn-icon" onClick={() => go(-1)} disabled={view === 0} aria-label="Previous page"><ChevronIcon direction="left" /></button>
    <p className="min-w-[6.5rem] text-center text-[0.8rem] tracking-[0.12em] text-fg" aria-live="polite">
      <span className="visually-hidden">{place} of {TOTAL}. </span>
      <span aria-hidden="true">{label(current)} <span className="text-muted">/ <span className="num">{TOTAL}</span></span></span>
    </p>
    <button type="button" className="btn-icon" onClick={() => go(1)} disabled={view === last} aria-label="Next page"><ChevronIcon /></button>
  </div>
  const download = <a href={PDF} download className="chip inline-flex items-center gap-2" aria-label="Download the e-brochure (PDF)">
    <svg viewBox="0 0 24 24" className="size-3.5 fill-none stroke-current stroke-[1.6]" aria-hidden="true"><path d="M12 4v11m-5-5 5 5 5-5M5 20h14" /></svg>
    Download PDF
  </a>

  return <section ref={root} data-tone="light" className="page grid grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)_auto] gap-[clamp(0.75rem,2.4vh,1.5rem)] split:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] split:grid-rows-[minmax(0,1fr)] split:gap-x-[clamp(1.5rem,3vw,4rem)] 3xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] short:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
    <div className="flex flex-col gap-6 split:justify-center">
      <PageHeading id="e-brochure" title="E Brochure" subtitle="Arkade Ascend, page by page" />
      <div data-reveal className="hidden flex-col items-start gap-5 split:flex">
        {controls}
        {download}
      </div>
    </div>

    {/* The brochure, as large as its column allows at its own proportion. */}
    <div ref={stage} data-reveal="fade" className="relative min-h-0 [container-type:size]" aria-roledescription="carousel" aria-label="E-brochure">
      {leaving && <Spread data-turn="out" aria-hidden="true" pages={pagesOf(leaving.view, leaving.book)} book={leaving.book} />}
      <Spread key={`${view}-${book}`} data-turn="in" pages={current} book={book} />
    </div>

    <div data-reveal className="flex flex-wrap items-center justify-between gap-3 split:hidden">
      {controls}
      {download}
    </div>
  </section>
}

// One view of the brochure, centred in the stage: two pages side by side as a
// book (the covers on their own side), or one page.
function Spread({ pages, book, ...rest }) {
  const aspect = book ? SPREAD : PAGE
  const one = pages.length === 1
  // As a book, the front cover sits on the right and the back cover on the left.
  const side = book && one ? (pages[0] === 0 ? 'right' : 'left') : null
  return <div {...rest} className="absolute inset-0 grid place-items-center">
    <div data-book className="relative flex" style={{ width: `min(100cqw, calc(100cqh * ${aspect}))`, aspectRatio: aspect }}>
      {side === 'right' && <span className="flex-1" />}
      {pages.map(index => <Page key={index} page={PAGES[index]} wide={book} />)}
      {side === 'left' && <span className="flex-1" />}
      {/* The spine: a soft fold of shade down the middle of an open book. */}
      {book && !one && <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-1/2 w-[6%] -translate-x-1/2 bg-[linear-gradient(90deg,transparent,rgba(40,24,14,.22)_48%,rgba(255,240,215,.08)_52%,transparent)]" />}
      {/* The turning edge: a soft shade with a fine light line, hidden at rest. */}
      <span data-edge aria-hidden="true" className="pointer-events-none invisible absolute inset-y-0 w-[min(9%,5rem)] -translate-x-1/2 bg-[linear-gradient(90deg,transparent,rgba(30,18,10,.32)_46%,rgba(255,236,205,.45)_50%,rgba(30,18,10,.18)_54%,transparent)]" />
    </div>
  </div>
}

// A page: a single sheet whole, or one half of a spread's image.
function Page({ page, wide }) {
  const { src, srcSet } = sources(page.sheet)
  const half = page.half
  return <div className={`relative h-full flex-1 overflow-hidden bg-plum-950/30 ${half === 'left' ? 'rounded-l-[2px]' : half === 'right' ? 'rounded-r-[2px]' : 'rounded-[2px]'}`}>
    <img src={src} srcSet={srcSet} sizes={half ? (wide ? '100vw' : '200vw') : (wide ? '50vw' : '100vw')} alt={`E-brochure page ${PAGES.indexOf(page) + 1}`} draggable="false" decoding="async"
      className={`absolute top-0 h-full max-w-none select-none ${half ? 'w-[200%]' : 'w-full object-cover'} ${half === 'right' ? '-left-full' : 'left-0'}`} />
  </div>
}
