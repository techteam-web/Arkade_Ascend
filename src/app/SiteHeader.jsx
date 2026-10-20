import { useLayoutEffect, useRef } from 'react'
import { Link } from 'react-router'
import { gsap } from './reveal.js'
import { BrandLockup, Roll } from '../components/Brand.jsx'
import { useShell } from './ShellContext.js'
import { pad, sectionIndex, sections } from './routes.js'
import { prefersReducedMotion } from '../hooks/useMediaQuery.js'

export default function SiteHeader({ route, tone, hidden, menuOpen, onMenu, menuButton }) {
  const index = sectionIndex(route.id)
  const root = useRef(null)
  useLayoutEffect(() => {
    const duration = prefersReducedMotion() ? 0 : 0.8
    // Visible (and focusable) at once when shown, so focus can return to the menu button.
    if (hidden) {
      gsap.to(root.current, { autoAlpha: 0, y: -12, duration, ease: 'silk', overwrite: true })
    } else {
      gsap.set(root.current, { visibility: 'visible' })
      gsap.to(root.current, { opacity: 1, y: 0, duration, ease: 'silk', delay: duration ? 0.35 : 0, overwrite: true })
    }
  }, [hidden])

  return <header ref={root} data-tone={tone || route.tone || 'dark'} inert={hidden ? '' : undefined}
    className="site-header pointer-events-none absolute inset-x-0 top-0 z-30 flex h-(--header-h) items-center justify-between px-(--gutter)">
    <Link to="/" className="relative pointer-events-auto -m-2 rounded-sm p-2 transition-opacity duration-500 hover:opacity-80" aria-label="Arkade Ascend, home">
      <BrandLockup />
    </Link>
    <div className="relative pointer-events-auto flex items-center gap-4 sm:gap-7">
      <LiftPanel index={index} />
      <button ref={menuButton} type="button" onClick={onMenu} aria-expanded={menuOpen} aria-haspopup="dialog" data-cursor="none"
        className="group flex min-h-11 items-center gap-4 rounded-full py-2 pl-4 pr-1 text-fg">
        <span className="text-[0.68rem] font-medium uppercase tracking-[0.3em] transition-colors group-hover:text-accent max-[23rem]:sr-only"><Roll>Menu</Roll></span>
        <span data-magnetic className="grid size-11 place-items-center rounded-full border border-line transition-[border-color,background-color] duration-500 group-hover:border-accent group-hover:bg-accent/10 group-focus-visible:border-accent">
          <span className="flex w-4.5 flex-col items-end gap-[5px]">
            <i className="block h-px w-full bg-current transition-[width] duration-500 ease-silk group-hover:w-2/3" />
            <i className="block h-px w-2/3 bg-current transition-[width] duration-500 ease-silk group-hover:w-full" />
            <i className="block h-px w-full bg-current transition-[width] duration-500 ease-silk group-hover:w-1/3" />
          </span>
        </span>
      </button>
    </div>
  </header>
}

// The lift panel: the section counter between a down and an up button, which
// ride to the previous or next section (with the lift transition). From
// Home, up goes to the first section. Phones use the menu instead.
function LiftPanel({ index }) {
  const { go } = useShell()
  const previous = index > 0 ? sections[index - 1] : index === 0 ? { path: '/', label: 'Home' } : null
  const next = sections[index + 1]
  const arrow = (direction, target) => <button type="button" disabled={!target} onClick={() => target && go(target.path)} data-cursor="none"
    aria-label={target ? `${direction > 0 ? 'Up' : 'Down'} to ${target.label}` : direction > 0 ? 'Top floor' : 'Ground floor'}
    className="group grid size-11 place-items-center rounded-full text-fg disabled:opacity-30">
    <span data-magnetic className="grid size-8 place-items-center rounded-full border border-line transition-[background-color,border-color,color] duration-500 group-enabled:group-hover:border-accent group-enabled:group-hover:bg-accent group-enabled:group-hover:text-espresso group-focus-visible:border-accent">
      <svg viewBox="0 0 12 12" aria-hidden="true" className={`size-2.5 fill-none stroke-current stroke-[1.3] ${direction > 0 ? '' : 'rotate-180'}`}><path d="M2.5 7.5 6 4l3.5 3.5" /></svg>
    </span>
  </button>
  return <div className="hidden items-center sm:flex" role="group" aria-label="Lift">
    {arrow(-1, previous)}
    <LiftDisplay index={index} />
    {arrow(1, next)}
  </div>
}

// The section counter as a lift display (DESIGN.md): the numbers sit on one
// strip that rolls through every stop between the old section and the new,
// and a small arrow shows which way the lift went. On Home, which is not a
// section, it reads G (ground).
function LiftDisplay({ index }) {
  const strip = useRef(null)
  const arrow = useRef(null)
  const last = useRef(null)
  useLayoutEffect(() => {
    if (index < 0) return
    const from = last.current
    last.current = index
    const to = { yPercent: -100 * index / sections.length }
    if (from === null || from < 0 || prefersReducedMotion()) { gsap.set(strip.current, to); return }
    if (from === index) return
    const direction = index > from ? 1 : -1
    const floors = Math.abs(index - from)
    gsap.to(strip.current, { ...to, duration: Math.min(1.4, 0.45 + floors * 0.12), ease: 'expo.inOut', overwrite: true })
    gsap.timeline({ overwrite: true })
      .set(arrow.current, { rotate: direction > 0 ? 0 : 180 })
      .fromTo(arrow.current, { autoAlpha: 0, y: 6 * direction }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out' })
      .to(arrow.current, { autoAlpha: 0, y: -6 * direction, duration: 0.5, ease: 'power2.in' }, '+=0.9')
  }, [index])
  if (index < 0) return <p className="num flex min-w-[4.5rem] items-center justify-center gap-2 px-1 text-[0.72rem] text-muted"><span className="visually-hidden">Home</span><span aria-hidden="true" className="text-fg">G</span><span aria-hidden="true" className="opacity-60">/</span><span aria-hidden="true">{pad(sections.length)}</span></p>
  return <p className="num flex min-w-[4.5rem] items-center justify-center gap-2 px-1 text-[0.72rem] text-muted">
    <span className="visually-hidden">Section {index + 1} of {sections.length}</span>
    <svg ref={arrow} viewBox="0 0 10 10" aria-hidden="true" className="invisible size-2 fill-accent"><path d="M5 1 9 8H1z" /></svg>
    <span aria-hidden="true" className="relative inline-block h-[1.25em] overflow-hidden leading-[1.25em] text-fg">
      <span ref={strip} className="flex flex-col">
        {sections.map((section, i) => <span key={section.id}>{pad(i + 1)}</span>)}
      </span>
    </span>
    <span aria-hidden="true" className="opacity-60">/</span><span aria-hidden="true">{pad(sections.length)}</span>
  </p>
}
