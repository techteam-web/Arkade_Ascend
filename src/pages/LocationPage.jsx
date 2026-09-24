import { useLayoutEffect, useRef, useState } from 'react'
import { gsap } from '../app/reveal.js'
import { PageHeading } from '../components/PageKit.jsx'
import { connectivity, origin, project, upcoming } from '../content/project.js'
import { prefersReducedMotion } from '../hooks/useMediaQuery.js'

const MAP_RATIO = 2640 / 3080
const VIEW = { w: 720, h: 840 }   // SVG space matches the brochure map
const toView = ([x, y]) => [x * VIEW.w, y * VIEW.h]
const o = toView([origin.x, origin.y])

// A gentle arc from the project to a destination.
const arc = point => {
  const [x, y] = toView(point)
  const mx = (o[0] + x) / 2, my = (o[1] + y) / 2
  const dx = x - o[0], dy = y - o[1]
  return `M${o[0]} ${o[1]} Q${mx - dy * 0.22} ${my + dx * 0.22} ${x} ${y}`
}

export default function LocationPage() {
  const [active, setActive] = useState(connectivity[0].id)
  const card = useRef(null)
  const route = useRef(null)
  const items = [...connectivity, ...upcoming]
  const current = items.find(item => item.id === active)

  // Each selection draws its route from the project outward.
  useLayoutEffect(() => {
    const path = route.current
    if (!path) return
    const length = path.getTotalLength()
    gsap.fromTo(path, { strokeDasharray: length, strokeDashoffset: length }, { strokeDashoffset: 0, duration: prefersReducedMotion() ? 0 : 1.4, ease: 'expo.inOut' })
    gsap.fromTo(card.current.querySelectorAll('[data-destination]'), { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: prefersReducedMotion() ? 0 : 0.8, delay: prefersReducedMotion() ? 0 : 0.9, ease: 'back.out(2)' })
  }, [active])

  // The map lifts from a tilted sheet, then leans slightly toward the pointer.
  const arrived = useRef(false)
  useLayoutEffect(() => {
    if (prefersReducedMotion()) { arrived.current = true; return }
    const context = gsap.context(() => {
      gsap.from(card.current, { rotateX: 42, rotateZ: 8, y: 60, scale: 0.86, autoAlpha: 0, duration: 2.2, delay: 0.3, ease: 'expo.out', onComplete: () => { arrived.current = true } })
    })
    return () => { arrived.current = false; context.revert() }
  }, [])
  // The pointer lean only starts once the entrance has finished.
  const lean = event => {
    if (!arrived.current || event.pointerType !== 'mouse' || prefersReducedMotion()) return
    const box = event.currentTarget.getBoundingClientRect()
    gsap.to(card.current, { rotateY: ((event.clientX - box.left) / box.width - 0.5) * 6, rotateX: -((event.clientY - box.top) / box.height - 0.5) * 6, duration: 1.2, ease: 'power3.out', overwrite: 'auto' })
  }
  const settle = () => { if (arrived.current) gsap.to(card.current, { rotateX: 0, rotateY: 0, duration: 1.4, ease: 'power3.out', overwrite: 'auto' }) }

  const [cx, cy] = toView(current.point)

  return <section data-tone="light" className="page page-scroll flex flex-col gap-6 split:grid split:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] split:gap-x-[4vw] 3xl:grid-cols-[minmax(0,1fr)_minmax(0,32rem)]">
    <div className="flex min-h-0 shrink-0 flex-col gap-4 split:shrink">
      <PageHeading id="location" title="Location" subtitle="Malad West, Mumbai" className="split:hidden" />
      <div className="relative min-h-[60vh] flex-1 perspective-[1600px] split:min-h-0" onPointerMove={lean} onPointerLeave={settle}>
        <div className="absolute inset-0 grid place-items-center @container-size">
          <figure ref={card} className="relative overflow-hidden rounded-sm border border-line bg-cream-100 shadow-[0_50px_90px_-40px_rgba(61,42,47,.55)]"
            style={{ aspectRatio: MAP_RATIO, width: `min(100cqw, calc(100cqh * ${MAP_RATIO}))` }}>
            <img src="/brochure/location-map.webp" alt="Indicative location map of Malad West showing Arkade Ascend, Link Road, S.V. Road, the Western Express Highway, rail and metro stations" draggable="false" className="size-full select-none object-cover" />
            <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} className="absolute inset-0 size-full" aria-hidden="true">
              <defs>
                <radialGradient id="glow"><stop offset="0" stopColor="#c49a6c" stopOpacity=".55" /><stop offset="1" stopColor="#c49a6c" stopOpacity="0" /></radialGradient>
              </defs>
              <circle cx={o[0]} cy={o[1]} r="46" fill="url(#glow)" className="origin-center animate-pulse transform-fill" />
              <circle cx={o[0]} cy={o[1]} r="9" fill="none" stroke="#4e373c" strokeWidth="1.5">
                <animate attributeName="r" values="9;30" dur="2.4s" repeatCount="indefinite" />
                <animate attributeName="opacity" values=".8;0" dur="2.4s" repeatCount="indefinite" />
              </circle>
              <path key={active} ref={route} d={arc(current.point)} fill="none" stroke="#4e373c" strokeWidth="2.4" strokeLinecap="round" />
              <g data-destination key={`${active}-dot`}>
                <circle cx={cx} cy={cy} r="15" fill="#4e373c" fillOpacity=".14" />
                <circle cx={cx} cy={cy} r="6.5" fill="#4e373c" stroke="#f4edcc" strokeWidth="2.5" />
              </g>
              {current.offMap && <text x={cx} y={cy - 22} textAnchor="middle" className="fill-plum-800 text-[15px] font-semibold uppercase tracking-[0.12em]">
                {current.distance ? `${current.distance} ↓` : 'Beyond map'}
              </text>}
            </svg>
            <figcaption className="absolute bottom-2 right-3 max-w-56 text-right text-[0.5rem] uppercase leading-relaxed tracking-[0.12em] text-plum-700/70">
              Indicative map, not to scale · distances as per Google Maps
            </figcaption>
          </figure>
        </div>
      </div>
    </div>

    <aside data-tone="dark" className="relative flex min-h-0 shrink-0 flex-col split:shrink overflow-hidden rounded-sm bg-plum-700 px-[clamp(1.5rem,3vw,3rem)] py-[clamp(1.5rem,4.5vh,3.25rem)] text-ivory shadow-[0_40px_80px_-40px_rgba(33,22,26,.8)]">
      <div className="page-scroll -mx-3 min-h-0 flex-1 px-3">
        <p data-reveal className="eyebrow hidden items-center gap-4 split:flex"><span className="num">09</span><span>Location</span></p>
        <h1 tabIndex={-1} data-reveal="lines" className="mt-4 hidden font-display text-[clamp(1.2rem,min(1.9vw,3.6vh),2rem)] uppercase leading-[1.3] text-gold-400 outline-none split:block">
          {project.cityHeadline.map(line => <span key={line} className="block">{line}</span>)}
        </h1>
        <p className="split:hidden font-display text-xl uppercase leading-snug text-gold-400">{project.cityHeadline.join(' ')}</p>
        <p data-reveal className="eyebrow mt-[clamp(1rem,3.5vh,2rem)] text-gold-300!">Connectivity choices</p>
        <ul className="mt-2">
          {connectivity.map(item => <li key={item.id}>
            <ConnectivityButton item={item} active={active === item.id} onSelect={setActive} />
          </li>)}
        </ul>
        <p data-reveal className="eyebrow mt-[clamp(1rem,3vh,1.75rem)] text-gold-300!">Upcoming infrastructure</p>
        <ul className="mt-2">
          {upcoming.map(item => <li key={item.id}>
            <ConnectivityButton item={item} active={active === item.id} onSelect={setActive} />
          </li>)}
        </ul>
      </div>
    </aside>
  </section>
}

function ConnectivityButton({ item, active, onSelect }) {
  return <button type="button" data-reveal aria-pressed={active} onClick={() => onSelect(item.id)}
    onPointerEnter={event => { if (event.pointerType === 'mouse') onSelect(item.id) }} onFocus={() => onSelect(item.id)}
    className={`group flex min-h-11 w-full items-center justify-between gap-4 rounded-sm border-b border-gold-500/20 pl-1 text-left outline-offset-[-2px] transition-colors duration-500 ${active ? 'text-gold-200' : 'text-ivory/80 hover:text-ivory'}`}>
    <span className="flex items-center gap-3 text-[0.78rem] leading-snug">
      <span className={`size-1.5 shrink-0 rounded-full transition-all duration-500 ${active ? 'scale-150 bg-gold-300 shadow-[0_0_10px_#ecd3a8]' : 'bg-gold-500/40'}`} />
      {item.name}
    </span>
    {item.distance && <span className="num shrink-0 text-[0.95rem] text-gold-300">{item.distance}</span>}
  </button>
}
