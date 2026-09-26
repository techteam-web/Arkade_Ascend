import { useLayoutEffect, useRef } from 'react'
import { gsap } from '../../app/reveal.js'
import { prefersReducedMotion } from '../../hooks/useMediaQuery.js'

const MAP_RATIO = 2640 / 3080
const VIEW = { w: 720, h: 840 }   // SVG space matches the brochure map
const toView = ([x, y]) => [x * VIEW.w, y * VIEW.h]

// A gentle arc from the project to a destination.
const arc = (o, point) => {
  const [x, y] = toView(point)
  const mx = (o[0] + x) / 2, my = (o[1] + y) / 2
  const dx = x - o[0], dy = y - o[1]
  return `M${o[0]} ${o[1]} Q${mx - dy * 0.22} ${my + dx * 0.22} ${x} ${y}`
}

// The brochure's own map (page 5), with the chosen destination drawn on it.
// Shown on request, and whenever the live map cannot load (for example
// without a connection).
export default function BrochureMap({ origin, place }) {
  const route = useRef(null)
  const dot = useRef(null)
  const o = toView([origin.x, origin.y])
  const [cx, cy] = toView(place.point)

  useLayoutEffect(() => {
    const path = route.current
    const reduced = prefersReducedMotion()
    const length = path.getTotalLength()
    const context = gsap.context(() => {
      gsap.fromTo(path, { strokeDasharray: length, strokeDashoffset: length }, { strokeDashoffset: 0, duration: reduced ? 0 : 1.2, ease: 'power2.inOut' })
      gsap.from(dot.current, { autoAlpha: 0, duration: reduced ? 0 : 0.6, delay: reduced ? 0 : 0.9 })
    })
    return () => context.revert()
  }, [place.id])

  return <div className="absolute inset-0 grid place-items-center bg-cream-100 @container-size">
    <figure className="relative m-0 overflow-hidden" style={{ aspectRatio: MAP_RATIO, width: `min(100cqw, calc(100cqh * ${MAP_RATIO}))` }}>
      <img src="/brochure/location-map.webp" alt="Brochure location map of Malad West showing Arkade Ascend, Link Road, S.V. Road, the Western Express Highway, rail and metro stations" draggable="false" className="size-full select-none object-cover" />
      <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} className="absolute inset-0 size-full" aria-hidden="true">
        <circle cx={o[0]} cy={o[1]} r="9" fill="#4e373c" stroke="#f4edcc" strokeWidth="3" />
        <path key={place.id} ref={route} d={arc(o, place.point)} fill="none" stroke="#4e373c" strokeWidth="2.4" strokeLinecap="round" />
        <g ref={dot} key={`${place.id}-dot`}>
          <circle cx={cx} cy={cy} r="6.5" fill="#4e373c" stroke="#f4edcc" strokeWidth="2.5" />
          {place.offMap && <text x={cx} y={cy - 18} textAnchor="middle" className="fill-plum-800 font-condensed text-[17px] font-bold uppercase tracking-[0.06em]">
            {place.distance ? `${place.distance} ↓` : 'Beyond map'}
          </text>}
        </g>
      </svg>
    </figure>
  </div>
}
