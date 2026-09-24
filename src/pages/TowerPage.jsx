import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { sceneStore } from '../scenes/sceneStore.js'
import { Figure, PageHeading, TemplateNote } from '../components/PageKit.jsx'
import { pad } from '../app/routes.js'

export default function TowerPage() {
  const anchor = useRef(null)
  const callout = useRef(null)
  const drag = useRef(null)
  const floors = sceneStore.tower.floors
  const [level, setLevel] = useState(Math.round(floors * 0.72))
  const [hover, setHover] = useState(-1)
  const shown = hover >= 0 ? hover + 1 : level

  // Hand the 3D model its anchor while this page is mounted.
  useLayoutEffect(() => {
    const tower = sceneStore.tower
    tower.anchor = anchor.current
    tower.visible = true
    tower.onHover = setHover
    tower.onPick = floor => setLevel(floor + 1)
    return () => {
      Object.assign(tower, { visible: false, anchor: null, floor: -1, dragging: false, pointer: null, pick: null, onHover: null, onPick: null })
    }
  }, [])
  useEffect(() => { sceneStore.tower.floor = level - 1 }, [level])

  // The callout follows the selected level's projected position.
  useEffect(() => {
    let frame
    const follow = () => {
      const element = callout.current
      const point = sceneStore.tower.callout
      if (element) {
        const frameBox = element.offsetParent?.getBoundingClientRect() || { left: 0, top: 0, width: innerWidth }
        element.style.opacity = point ? '1' : '0'
        if (point) {
          // Point left of the towers when there is room, otherwise right.
          const side = point.left.x - frameBox.left > 230 ? 'left' : 'right'
          element.dataset.side = side
          element.style.transform = `translate3d(${point[side].x - frameBox.left}px, ${point[side].y - frameBox.top}px, 0)`
        }
      }
      frame = requestAnimationFrame(follow)
    }
    follow()
    return () => cancelAnimationFrame(frame)
  }, [])

  const rotate = amount => { sceneStore.tower.yaw += amount }
  // Drag turns the towers; a tap or click without dragging selects the floor
  // beneath it; a mouse hovering over the model previews floors.
  const onPointerDown = event => {
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { x: event.clientX, startX: event.clientX, startY: event.clientY }
  }
  const onPointerMove = event => {
    const d = drag.current
    if (!d) {
      if (event.pointerType === 'mouse') sceneStore.tower.pointer = { x: event.clientX, y: event.clientY, dirty: true }
      return
    }
    if (Math.abs(event.clientX - d.startX) > 6) sceneStore.tower.dragging = true
    if (sceneStore.tower.dragging) rotate((event.clientX - d.x) * 0.009)
    d.x = event.clientX
  }
  const endDrag = () => { drag.current = null; sceneStore.tower.dragging = false }
  const onPointerUp = event => {
    const d = drag.current
    if (d && !sceneStore.tower.dragging && Math.hypot(event.clientX - d.startX, event.clientY - d.startY) < 8) {
      sceneStore.tower.pick = { x: event.clientX, y: event.clientY }
    }
    endDrag()
  }

  return <section className="page page-scroll flex flex-col gap-6 split:grid split:grid-cols-[minmax(0,27rem)_minmax(0,1fr)] split:gap-x-[5vw] 3xl:grid-cols-[minmax(0,34rem)_minmax(0,1fr)] short:grid-cols-2">
    <div className="flex flex-col gap-[clamp(1rem,3.4vh,2.25rem)] stack:contents split:justify-between split:gap-6">
      <div className="flex flex-col gap-[clamp(1rem,3.4vh,2.25rem)] stack:order-1">
        <PageHeading id="tower" title="The Tower" subtitle="A masterpiece made for those who think ahead." />
        <p data-reveal className="body-copy max-w-md stack:hidden short:hidden">
          Turn the architecture in the round, then hover or tap any floor to light it.
        </p>
        <div className="grid max-w-md grid-cols-3 gap-6 stack:hidden short:hidden">
          <Figure value="4 BHK" label="Residences" />
          <Figure value={1613} suffix="sq.ft" label="Total area, Unit 1" />
          <Figure value={650} suffix="m" label="To Link Road" />
        </div>
      </div>

      <div className="flex flex-col gap-4 stack:order-3">
        <div data-reveal className="glass-panel max-w-md rounded-sm px-5 py-4">
          <div className="flex items-baseline justify-between gap-4">
            <label htmlFor="tower-level" className="eyebrow">Explore by level</label>
            <p className="num text-3xl leading-none text-fg" aria-hidden="true">{pad(level)}</p>
          </div>
          <input id="tower-level" type="range" min="1" max={floors} value={level} onChange={event => setLevel(Number(event.target.value))}
            aria-valuetext={`Level ${level}`} className="range-lux mt-1 w-full" style={{ '--fill': `${((level - 1) / (floors - 1)) * 100}%` }} />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[0.6rem] uppercase leading-relaxed tracking-[0.22em] text-muted">
              <span className="pointer-coarse:hidden">Hover a floor, click to select</span>
              <span className="hidden pointer-coarse:inline">Tap a floor to select</span>
            </p>
            <div className="flex gap-2">
              <button type="button" className="btn-icon" aria-label="Rotate left" onClick={() => rotate(-0.4)}><svg viewBox="0 0 24 24"><path d="M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3" /></svg></button>
              <button type="button" className="btn-icon" aria-label="Rotate right" onClick={() => rotate(0.4)}><svg viewBox="0 0 24 24"><path d="m15 14 5-5-5-5M20 9H9a5 5 0 0 0 0 10h3" /></svg></button>
            </div>
          </div>
        </div>
        <TemplateNote>Illustrative massing model · elevation and storeys to be confirmed</TemplateNote>
      </div>
    </div>

    <div ref={anchor} role="img" tabIndex={0} data-own-gesture data-own-keys
      aria-label="Illustrative twin-tower massing model. Use the left and right arrow keys, or drag, to rotate."
      onKeyDown={event => {
        if (event.key === 'ArrowLeft') { event.preventDefault(); rotate(-0.25) }
        if (event.key === 'ArrowRight') { event.preventDefault(); rotate(0.25) }
      }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={endDrag} onLostPointerCapture={endDrag}
      onPointerLeave={() => { sceneStore.tower.pointer = null }}
      className={`relative min-h-[40vh] flex-1 touch-none rounded-sm outline-offset-8 active:cursor-grabbing stack:order-2 split:min-h-0 ${hover >= 0 ? 'cursor-pointer' : 'cursor-grab'}`}>
      <p data-reveal="fade" className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-center gap-3 text-[0.58rem] uppercase tracking-[0.32em] text-gold-300/70">
        <svg viewBox="0 0 40 12" className="h-3 w-10 fill-none stroke-current" strokeWidth="1" aria-hidden="true"><path d="M6 1 1 6l5 5M34 1l5 5-5 5M1 6h38" /></svg>
        Drag to rotate
      </p>
      <p className="visually-hidden" aria-live="polite">Level {level} selected</p>
    </div>

    <div ref={callout} aria-hidden="true" data-side="left" className="group/callout pointer-events-none absolute left-0 top-0 z-10 opacity-0 transition-opacity duration-500">
      <div className="flex -translate-x-full -translate-y-1/2 items-center gap-3 pr-1 group-data-[side=right]/callout:translate-x-0 group-data-[side=right]/callout:flex-row-reverse group-data-[side=right]/callout:pl-1 group-data-[side=right]/callout:pr-0">
        <span className="num whitespace-nowrap rounded-full border border-gold-500/40 bg-espresso/85 px-4 py-2 text-[0.64rem] uppercase tracking-[0.24em] text-gold-100 max-sm:hidden short:hidden">Level {pad(shown)}</span>
        <span className="h-px w-[clamp(1.5rem,4vw,4.5rem)] bg-gold-300/70" />
        <span className="size-2 rounded-full bg-gold-200 shadow-[0_0_14px_#f6e7cc]" />
      </div>
    </div>
  </section>
}
