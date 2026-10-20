import { useEffect, useRef, useState } from 'react'
import { useShell } from '../app/ShellContext.js'
import { ArrowIcon, Roll } from '../components/Brand.jsx'
import AscendLockup from '../components/AscendLockup.jsx'
import { rera } from '../content/project.js'
import { prefersReducedMotion } from '../hooks/useMediaQuery.js'

// Home (DESIGN.md, "the screenshot"): the tower in real time, from the
// project's own model (src/pages/home/HomeScene.js). A gold band of light
// climbs it floor by floor as the page arrives, the windows coming on behind
// it, the camera riding up beside it, and ASCEND rises in the space behind
// the building; satin ribbons drift across and the tower can be dragged
// round. The storey scale at the side follows the light to the 37th floor.
// Without WebGL the twilight render stands in a tall window instead.
const TOWER = {
  src: '/gallery/exterior/cam02-twilight-1600.webp',
  srcSet: '/gallery/exterior/cam02-twilight-1600.webp 1280w, /gallery/exterior/cam02-twilight-2880.webp 2304w',
}
const STOREYS = 37
// Marks on the scale, from the brochure: the arrival at ground, Club Ark on
// the 5th, the first homes on the 6th. The top is the climbing counter.
const MARKS = [
  { at: 0, label: 'G', note: 'Arrival' },
  { at: 5, label: '05', note: 'Club Ark' },
  { at: 6, label: '06', note: 'First homes', minor: true },
]

export default function HomePage() {
  const { go } = useShell()
  const canvas = useRef(null)
  const scale = useRef(null)
  const [stage, setStage] = useState('loading')   // loading | ready | none (no WebGL)

  // The light's height drives the storey scale: its marker and its counter.
  const paintRise = value => {
    const el = scale.current
    if (!el) return
    el.style.setProperty('--climb', value)
    const counter = el.querySelector('[data-climb-count]')
    if (counter) counter.textContent = String(Math.round(value * STOREYS)).padStart(2, '0')
  }

  useEffect(() => {
    let scene = null
    let cancelled = false
    paintRise(prefersReducedMotion() ? 1 : 0)
    import('./home/HomeScene.js').then(({ createHomeScene }) => {
      if (cancelled || !canvas.current) return
      scene = createHomeScene(canvas.current, {
        reduced: prefersReducedMotion(),
        low: matchMedia('(max-width: 900px), (pointer: coarse)').matches,
        onRise: paintRise,
        onReady: () => { if (!cancelled) setStage('ready') },
      })
      if (!scene) { setStage('none'); paintRise(1) }
    }).catch(() => { if (!cancelled) { setStage('none'); paintRise(1) } })
    return () => { cancelled = true; scene?.dispose() }
  }, [])

  return <section className="page home-stage overflow-hidden p-0" aria-label="Arkade Ascend, Malad West">
    <h1 tabIndex={-1} className="visually-hidden outline-none">Arkade Ascend, Malad West</h1>

    {/* The tower in 3D, filling the page; drag to turn it. */}
    {stage !== 'none' && <canvas ref={canvas} data-cursor="Drag" role="img" aria-label="The Arkade Ascend tower in 3D, turning slowly. Drag to turn it."
      className={`absolute inset-0 size-full touch-pan-y transition-opacity duration-1000 ${stage === 'ready' ? 'opacity-100' : 'opacity-0'}`} />}

    {/* Without WebGL: the twilight render in a tall window, ASCEND across it. */}
    {stage === 'none' && <>
      <button type="button" onClick={() => go('/tower')} data-cursor="The tower" aria-label="See the tower" className="home-window group outline-offset-4">
        <span className="absolute inset-0 block overflow-hidden bg-plum-950">
          <img src={TOWER.src} srcSet={TOWER.srcSet} sizes="(orientation: portrait) 62vw, 34vh" alt="Arkade Ascend at twilight" draggable="false"
            className="absolute inset-0 size-full select-none object-cover object-[50%_38%]" />
          <span className="absolute inset-0 bg-linear-to-t from-ink/80 via-ink/5 to-ink/25" />
        </span>
      </button>
      <p className="photo-note home-window-note">Architect’s impression</p>
      <p aria-hidden="true" className="home-word display pointer-events-none z-10 select-none text-ivory">Ascend</p>
    </>}

    <StoreyScale scaleRef={scale} />

    <div className="home-foot z-10">
      <div className="home-foot-brand">
        <AscendLockup data-reveal="draw" data-delay="0.6" className="block aspect-[1029/162] h-auto w-[clamp(10rem,17cqw,17rem)] text-ivory" />
        <p data-reveal className="mt-[clamp(0.6rem,1.6cqh,1rem)] text-[clamp(0.6rem,0.75cqw,0.74rem)] font-medium uppercase tracking-[0.28em] text-gold-200/90">The Neu Gen life has arrived</p>
      </div>
      <div data-reveal className="home-foot-cta">
        <button type="button" onClick={() => go('/about-us')} className="btn-lux is-solid min-h-14! px-8! text-[0.7rem]! tracking-[0.3em]!" data-magnetic>
          <Roll>Begin the tour</Roll><ArrowIcon />
        </button>
      </div>
      <div data-reveal className="home-foot-rera text-right">
        <p className="text-[0.55rem] uppercase tracking-[0.3em] text-gold-200/75">MahaRERA Reg. No.</p>
        <p className="num mt-1.5 text-[clamp(0.8rem,0.95cqw,1rem)] tracking-[0.06em] text-ivory">{rera.number}</p>
      </div>
    </div>
  </section>
}

// The storey scale at the side: a tick for every floor, longer every fifth,
// with the brochure's marks. Its gold marker follows the light as it climbs
// the tower (the scene reports the light's height), the counter at the top
// rolling up to 37.
function StoreyScale({ scaleRef }) {
  const ticks = Array.from({ length: STOREYS + 1 }, (_, floor) => floor)
  return <div ref={scaleRef} className="home-scale-side z-10" aria-hidden="true">
    <div data-reveal="line-v" className="absolute inset-y-0 left-0 w-px origin-bottom bg-linear-to-t from-gold-500/70 via-gold-500/40 to-gold-300/70" />
    <svg className="absolute inset-y-0 left-0 h-full w-3 overflow-visible" preserveAspectRatio="none" viewBox={`0 0 12 ${STOREYS}`}>
      {ticks.map(floor => <line key={floor} x1="0" x2={floor % 5 === 0 ? 12 : 6} y1={STOREYS - floor} y2={STOREYS - floor}
        stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" className={floor % 5 === 0 ? 'text-gold-300/70' : 'text-gold-500/40'} />)}
    </svg>
    {MARKS.map(mark => <p key={mark.at} data-reveal="fade" data-delay="0.9"
      className={`home-scale-mark ${mark.minor ? 'max-sm:hidden short:hidden' : ''}`} style={{ '--at': mark.at / STOREYS }}>
      <span className="num text-ivory/90">{mark.label}</span><span className="max-md:hidden"> {mark.note}</span>
    </p>)}
    <span className="home-scale-marker block h-px w-[clamp(1.25rem,2.4cqw,2.5rem)] bg-gold-200 shadow-[0_0_10px_rgba(242,213,163,.8)]" />
    <p className="home-scale-top">
      <span data-climb-count className="num block text-[clamp(1.4rem,2.4cqw,2.4rem)] leading-none text-gold-100">00</span>
      <span className="mt-1.5 block text-[clamp(0.5rem,0.62cqw,0.62rem)] uppercase tracking-[0.24em] text-gold-200/80">Storeys</span>
    </p>
  </div>
}
