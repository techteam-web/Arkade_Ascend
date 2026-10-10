import { forwardRef, useId, useImperativeHandle, useRef } from 'react'

// A wing's floor plan with a radar standing on one home: a fan that points
// where the panorama looks and opens as wide as the picture does. Press a home
// on the plan to move the radar there. update() moves the fan straight on the
// SVG (the panorama reports every frame it moves), so React never re-renders
// for it; `heading` is how the panorama's front sits on the plan, in degrees
// clockwise from the top of the drawing.
//
// The plan is the floor's own: homes the floor lacks are hatched, as on the
// Floor Plans page, and homes whose plan differs from the typical floor's are
// outlined in dashes. The SVG shares the drawing's coordinates (plan.viewBox),
// so a home's outline and its label point (plan.zones) sit where they are drawn.
const RADIUS = 450

// The middle of a home's outline (the centroid of its polygon, "x,y x,y ..."),
// where the radar stands: the plan's label points sit where the badges read
// best, not at the middle of the home.
const centres = new Map()
export function zoneCentre(zone) {
  if (!centres.has(zone)) {
    const points = zone.points.trim().split(/\s+/).map(pair => pair.split(',').map(Number))
    let area = 0, cx = 0, cy = 0
    points.forEach(([x0, y0], i) => {
      const [x1, y1] = points[(i + 1) % points.length]
      const cross = x0 * y1 - x1 * y0
      area += cross
      cx += (x0 + x1) * cross
      cy += (y0 + y1) * cross
    })
    centres.set(zone, area ? [cx / (3 * area), cy / (3 * area)] : points[0])
  }
  return centres.get(zone)
}
const deg = 180 / Math.PI
const fan = hfov => {
  const half = Math.min(hfov, 3) / 2
  const x = Math.sin(half) * RADIUS
  const y = -Math.cos(half) * RADIUS
  return `M0 0 L${-x.toFixed(1)} ${y.toFixed(1)} A${RADIUS} ${RADIUS} 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}Z`
}

const ViewMap = forwardRef(function ViewMap({ plan, zones, homes, absent = [], differs = [], unit, onUnit, heading = 0, alt }, ref) {
  const hatch = useId()
  const turn = useRef(null)
  const wedge = useRef(null)
  const last = useRef({ yaw: 0, hfov: 1.4 })
  const [width, height] = plan.viewBox
  const [x, y] = zoneCentre(zones[unit])
  const place = ({ yaw, hfov }) => {
    last.current = { yaw, hfov }
    turn.current?.setAttribute('transform', `translate(${x} ${y}) rotate(${(yaw * deg + heading).toFixed(1)})`)
    wedge.current?.setAttribute('d', fan(hfov))
  }
  useImperativeHandle(ref, () => ({ update: place }))

  return <div className="relative overflow-hidden rounded-sm bg-cream-100 p-2">
    <img src={plan.src} srcSet={plan.srcSet} sizes="22rem" alt={alt} draggable="false" className="block h-auto w-full select-none" />
    <svg viewBox={`0 0 ${width} ${height}`} className="absolute left-2 top-2 h-[calc(100%-1rem)] w-[calc(100%-1rem)]" style={{ pointerEvents: 'none' }}>
      <defs>
        <pattern id={hatch} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="14" height="14" className="fill-cream-50/85" /><line x1="0" y1="0" x2="0" y2="14" className="stroke-plum-700/30" strokeWidth="4" />
        </pattern>
      </defs>
      {absent.map(position => <polygon key={position} points={zones[position].points} style={{ fill: `url(#${CSS.escape(hatch)})`, pointerEvents: 'none' }} />)}
      {homes.map(position => <polygon key={position} points={zones[position].points} role="button" tabIndex={0}
        aria-label={`Put the radar on Unit ${position}`} aria-pressed={position === unit}
        onClick={() => onUnit(position)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onUnit(position) } }}
        style={{ pointerEvents: 'all' }} strokeDasharray={differs.includes(position) ? '16 10' : undefined}
        className={`cursor-pointer outline-none transition-colors duration-300 hover:fill-gold-500/15 focus-visible:fill-gold-500/25 ${differs.includes(position) ? 'fill-plum-700/10 stroke-plum-700 stroke-[6]' : 'fill-transparent'}`} />)}
      {/* Keyed by home, so the fan is drawn afresh at its new place. */}
      <g key={unit} ref={node => { turn.current = node; if (node) place(last.current) }} style={{ pointerEvents: 'none' }}>
        <path ref={wedge} className="fill-gold-500/35 stroke-plum-800 stroke-[6]" strokeDasharray="18 14" />
      </g>
      <circle cx={x} cy={y} r="24" className="fill-plum-800 stroke-cream-100 stroke-[8]" style={{ pointerEvents: 'none' }} />
    </svg>
  </div>
})

export default ViewMap
