import { useLayoutEffect, useRef, useState } from 'react'
import { gsap } from '../app/reveal.js'
import { ImageSlot, PageHeading, TemplateNote } from '../components/PageKit.jsx'
import { ChevronIcon } from '../components/Brand.jsx'
import { amenities } from '../content/template.js'
import { pad } from '../app/routes.js'
import useStepper from '../hooks/useStepper.js'
import { prefersReducedMotion } from '../hooks/useMediaQuery.js'

const COUNT = amenities.length
const STEP = 360 / COUNT

export default function AmenitiesPage() {
  const [index, setIndex] = useState(0)
  const root = useRef(null)
  const ring = useRef(null)
  const details = useRef(null)
  const rotation = useRef({ angle: 0 })
  const drag = useRef(null)
  const wheelLock = useRef(0)
  const active = amenities[index]

  // Cumulative angle, so the ring always takes the short way round.
  const turnTo = (next, duration = 1.3) => {
    const wrapped = ((next % COUNT) + COUNT) % COUNT
    const current = Math.round(-rotation.current.angle / STEP)
    let delta = wrapped - (((current % COUNT) + COUNT) % COUNT)
    if (delta > COUNT / 2) delta -= COUNT
    if (delta < -COUNT / 2) delta += COUNT
    gsap.to(rotation.current, {
      angle: -(current + delta) * STEP, duration: prefersReducedMotion() ? 0 : duration, ease: 'expo.out', overwrite: true,
      onUpdate: () => gsap.set(ring.current, { rotateY: rotation.current.angle }),
    })
    setIndex(wrapped)
  }
  useStepper(root, { onNext: () => turnTo(index + 1), onPrev: () => turnTo(index - 1), lock: 700 })

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return
    const context = gsap.context(() => {
      gsap.from('[data-amenity-copy]', { autoAlpha: 0, y: 18, filter: 'blur(5px)', duration: 0.9, stagger: 0.06, ease: 'silk' })
    }, details)
    return () => context.revert()
  }, [index])

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return
    rotation.current.angle = 140
    gsap.set(ring.current, { rotateY: 140 })
    const tween = gsap.to(rotation.current, {
      angle: 0, duration: 2.6, delay: 0.3, ease: 'expo.out',
      onUpdate: () => gsap.set(ring.current, { rotateY: rotation.current.angle }),
    })
    return () => { tween.kill(); rotation.current.angle = 0; gsap.set(ring.current, { rotateY: 0 }) }
  }, [])

  const onPointerDown = event => {
    event.currentTarget.setPointerCapture(event.pointerId)
    gsap.killTweensOf(rotation.current)
    drag.current = { x: event.clientX, angle: rotation.current.angle, moved: false }
  }
  const onPointerMove = event => {
    if (!drag.current) return
    const dx = event.clientX - drag.current.x
    if (Math.abs(dx) > 4) drag.current.moved = true
    rotation.current.angle = drag.current.angle + dx * 0.22
    gsap.set(ring.current, { rotateY: rotation.current.angle })
  }
  const onPointerUp = () => {
    if (!drag.current) return
    const moved = drag.current.moved
    drag.current = null
    if (moved) turnTo(Math.round(-rotation.current.angle / STEP), 0.9)
  }

  return <section ref={root} className="page page-scroll grid grid-rows-[auto_minmax(16rem,1fr)_auto] gap-4">
    <div className="flex items-start justify-between gap-6">
      <PageHeading id="amenities" title="Amenities" subtitle="Life beyond home" className="flex-1" />
      <TemplateNote className="mt-3 hidden max-w-[16rem] text-right md:block">Indicative amenities · renders to follow</TemplateNote>
    </div>

    <div data-own-gesture className="relative min-h-0 touch-pan-y select-none"
      onWheel={event => {
        const now = performance.now()
        if (now < wheelLock.current || Math.abs(event.deltaX) + Math.abs(event.deltaY) < 12) return
        wheelLock.current = now + 650
        turnTo(index + (event.deltaY + event.deltaX > 0 ? 1 : -1))
      }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
      <div data-reveal="fade" className="absolute inset-0 grid place-items-center perspective-[1600px]">
        <div className="relative transform-3d" style={{ width: 'var(--card)', height: 'calc(var(--card) * 1.3)', '--card': 'clamp(9rem, min(17vw, 30cqh), 19rem)', transform: 'translateZ(calc(var(--card) * -1.62))' }}>
        <div ref={ring} className="absolute inset-0 transform-3d">
          {amenities.map((amenity, i) => {
            const distance = Math.min(Math.abs(i - index), COUNT - Math.abs(i - index))
            return <button key={amenity.id} type="button" tabIndex={-1} aria-hidden="true" onClick={() => { if (!drag.current) turnTo(i) }}
              className="absolute inset-0 overflow-hidden rounded-sm border border-gold-500/30 transition-[opacity,filter] duration-1000 backface-hidden"
              style={{
                transform: `rotateY(${i * STEP}deg) translateZ(calc(var(--card) * 1.62))`,
                opacity: distance === 0 ? 1 : distance === 1 ? 0.7 : distance === 2 ? 0.4 : 0.18,
                filter: distance === 0 ? 'none' : `saturate(.6) brightness(${1 - distance * 0.15})`,
              }}>
              <ImageSlot src={amenity.image} alt="" label={amenity.name} />
              <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-espresso/90 to-transparent px-4 pb-3 pt-10 text-left">
                <span className="num block text-[0.62rem] text-gold-300">{pad(i + 1)}</span>
                <span className="mt-1 block font-display text-sm uppercase leading-tight text-ivory">{amenity.name}</span>
              </span>
            </button>
          })}
        </div>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-[6%] mx-auto h-8 w-[min(34rem,70%)] rounded-[50%] bg-gold-400/15 blur-2xl" aria-hidden="true" />
    </div>

    <div className="flex flex-wrap items-end justify-between gap-6">
      {/* Fixed height, so a name wrapping to two lines never moves the ring. */}
      <div ref={details} data-reveal className="flex h-[clamp(8rem,18vh,10rem)] max-w-lg flex-col justify-end overflow-hidden" aria-live="polite">
        <p data-amenity-copy className="eyebrow">{active.level} · <span className="num">{pad(index + 1)} / {pad(COUNT)}</span></p>
        <h2 data-amenity-copy className="display mt-3 line-clamp-2 text-[clamp(1.6rem,min(3vw,5vh),3rem)] leading-[1.02] text-fg">{active.name}</h2>
        <p data-amenity-copy className="body-copy mt-2 line-clamp-2">{active.copy}</p>
      </div>
      <div data-reveal className="flex items-center gap-3">
        <button type="button" className="btn-icon size-12!" onClick={() => turnTo(index - 1)} aria-label="Previous amenity"><ChevronIcon direction="left" /></button>
        <div className="flex gap-1.5" aria-hidden="true">
          {amenities.map((amenity, i) => <span key={amenity.id} className={`h-px transition-all duration-700 ${i === index ? 'w-8 bg-gold-300' : 'w-3 bg-gold-500/35'}`} />)}
        </div>
        <button type="button" className="btn-icon size-12!" onClick={() => turnTo(index + 1)} aria-label="Next amenity"><ChevronIcon /></button>
      </div>
    </div>
  </section>
}
