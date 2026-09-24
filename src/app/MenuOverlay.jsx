import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from './reveal.js'
import { routes, pad } from './routes.js'
import { ArkadeMark, BrandLockup } from '../components/Brand.jsx'
import { prefersReducedMotion } from '../hooks/useMediaQuery.js'
import { sceneStore } from '../scenes/sceneStore.js'

export default function MenuOverlay({ open, currentId, onClose, onNavigate }) {
  const root = useRef(null)
  const timeline = useRef(null)
  const emblem = useRef(null)
  const lastShown = useRef(null)
  const [previewed, setPreviewed] = useState(null)
  const currentIndex = Math.max(0, routes.findIndex(route => route.id === currentId))
  const shown = previewed ?? currentIndex

  useLayoutEffect(() => {
    const context = gsap.context(() => {
      timeline.current = gsap.timeline({ paused: true, defaults: { ease: 'silk' } })
        .set(root.current, { autoAlpha: 1 })
        .fromTo('.menu-curtain', { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'curtain' })
        .fromTo('.menu-edge', { yPercent: -100, autoAlpha: 1 }, { yPercent: 0, duration: 1, ease: 'curtain' }, 0)
        .to('.menu-edge', { autoAlpha: 0, duration: 0.4 }, 0.95)
        .from('.menu-row-label', { yPercent: 115, duration: 1.1, stagger: 0.045 }, 0.45)
        .from('.menu-row-number', { autoAlpha: 0, x: -10, duration: 0.9, stagger: 0.045 }, 0.5)
        .from('.menu-row-rule', { scaleX: 0, transformOrigin: '0 50%', duration: 1.2, stagger: 0.045, ease: 'curtain' }, 0.4)
        .from('.menu-fade', { autoAlpha: 0, y: 14, duration: 1, stagger: 0.08 }, 0.7)
        .from('.menu-preview', { autoAlpha: 0, duration: 1.6, ease: 'power2.out' }, 0.5)
    }, root)
    gsap.set(root.current, { autoAlpha: 0 })
    return () => context.revert()
  }, [])

  useEffect(() => {
    const tl = timeline.current
    if (!tl) return
    if (prefersReducedMotion()) { tl.progress(open ? 1 : 0).pause(); if (!open) gsap.set(root.current, { autoAlpha: 0 }); return }
    if (open) tl.timeScale(1).play()
    else if (tl.progress() > 0) tl.timeScale(1.9).reverse()
  }, [open])

  // The 3D emblem lives in the shared canvas and fits this anchor. Each move
  // to another section turns it half a revolution (the mark is symmetric).
  useEffect(() => {
    sceneStore.emblem.anchor = emblem.current
    return () => { sceneStore.emblem.anchor = null }
  }, [])
  useEffect(() => {
    if (!open) { lastShown.current = null; return }
    if (lastShown.current !== null && lastShown.current !== shown && !prefersReducedMotion()) sceneStore.emblem.turn += Math.PI
    lastShown.current = shown
  }, [open, shown])

  useEffect(() => {
    if (!open) { setPreviewed(null); return }
    const frame = requestAnimationFrame(() => root.current?.querySelector(`[data-route="${routes[currentIndex].id}"]`)?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(frame)
  }, [open, currentIndex])

  const onKeyDown = event => {
    if (event.key === 'Escape') { event.preventDefault(); onClose(); return }
    const rows = [...root.current.querySelectorAll('[data-route]')]
    const at = rows.indexOf(document.activeElement)
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && at >= 0) {
      event.preventDefault()
      rows[(at + (event.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length].focus()
    }
    if (event.key !== 'Tab') return
    const focusables = [...root.current.querySelectorAll('button')]
    const first = focusables[0], last = focusables[focusables.length - 1]
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }

  return <div ref={root} role="dialog" aria-modal="true" aria-label="Explore Arkade Ascend" aria-hidden={!open} inert={open ? undefined : ''}
    onKeyDown={onKeyDown} className="invisible absolute inset-0 z-50" data-tone="dark">
    {/* Translucent, so the living scene (mist, threads, emblem) shows through. */}
    <div className="menu-curtain absolute inset-0 overflow-hidden"
      style={{ background: 'linear-gradient(90deg, rgba(14,9,10,.9) 0%, rgba(18,11,13,.72) 42%, rgba(18,11,13,.2) 72%, rgba(18,11,13,.35) 100%)' }}>
      <ArkadeMark className="pointer-events-none absolute -right-[8vmin] -bottom-[14vmin] h-[70vmin] w-auto text-gold-500/[0.05] lg:hidden" />
    </div>
    <div className="menu-edge pointer-events-none absolute inset-x-0 top-0 h-full border-b border-gold-300/70" />

    <div className="absolute inset-0 grid grid-rows-[auto_1fr_auto] px-(--gutter) lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-x-[6vw]">
      <div className="menu-fade flex h-(--header-h) items-center lg:col-span-2 lg:justify-between">
        <BrandLockup />
        <button type="button" onClick={onClose} className="group ml-auto flex min-h-11 items-center gap-4 rounded-full py-2 pl-4 pr-1 text-ivory lg:ml-0">
          <span className="text-[0.68rem] font-medium uppercase tracking-[0.3em] group-hover:text-gold-400 max-[23rem]:sr-only">Close</span>
          <span className="grid size-11 place-items-center rounded-full border border-gold-500/40 transition-colors duration-500 group-hover:border-gold-400 group-hover:bg-gold-500 group-hover:text-espresso">
            <svg viewBox="0 0 24 24" className="size-3.5 fill-none stroke-current" strokeWidth="1.4" aria-hidden="true"><path d="m3 3 18 18M21 3 3 21" /></svg>
          </span>
        </button>
      </div>

      <nav aria-label="Sections" className="page-scroll -mx-2 flex min-h-0 flex-col justify-center-safe px-2 py-2" onPointerLeave={() => setPreviewed(null)}>
        <ol className="grid grid-cols-1 short:grid-cols-2 short:gap-x-8 sm:compact-h:grid-cols-2 sm:compact-h:gap-x-10">
          {routes.map((route, index) => {
            const current = index === currentIndex
            return <li key={route.id} className="relative">
              <button type="button" data-route={route.id} aria-current={current ? 'page' : undefined}
                onClick={() => onNavigate(route.path)}
                onPointerEnter={event => { if (event.pointerType !== 'touch') setPreviewed(index) }}
                onFocus={() => setPreviewed(index)}
                className="group relative flex min-h-11 w-full items-baseline gap-5 py-[clamp(0.2rem,0.9vh,0.75rem)] text-left outline-offset-2">
                <span className={`menu-row-number num w-6 shrink-0 text-[0.66rem] transition-colors duration-500 ${current ? 'text-gold-400' : 'text-gold-300/45 group-hover:text-gold-300 group-focus-visible:text-gold-300'}`}>{pad(index + 1)}</span>
                <span className="-my-[0.14em] shrink-0 overflow-hidden py-[0.14em]">
                  {/* Rows being considered turn to satin gold and lean in. */}
                  <span className={`menu-row-label block whitespace-nowrap font-display text-[clamp(1.35rem,min(3.3vw,4.6vh),3.1rem)] uppercase leading-[1.08] tracking-[0.02em] transition-[color,translate] duration-700 ease-silk group-hover:translate-x-3 group-focus-visible:translate-x-3 ${index === shown && previewed !== null ? 'gold-text' : current ? 'text-gold-300' : 'text-ivory/80'}`}>{route.label}</span>
                </span>
                <span className="ml-auto hidden min-w-0 translate-x-2 self-center text-right text-[0.6rem] leading-snug uppercase tracking-[0.26em] text-gold-300/0 transition-all duration-700 group-hover:translate-x-0 group-hover:text-gold-300/80 group-focus-visible:translate-x-0 group-focus-visible:text-gold-300/80 md:block short:hidden">{route.hint}</span>
                {current && <span className="absolute -left-4 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-gold-400 shadow-[0_0_12px_#e8c89a]" aria-hidden="true" />}
              </button>
              <span className="menu-row-rule relative block h-px bg-linear-to-r from-gold-500/30 via-gold-500/12 to-transparent" aria-hidden="true">
                <span className={`absolute inset-y-0 left-0 w-full origin-left bg-linear-to-r from-gold-200 via-gold-400/70 to-transparent transition-[scale] duration-900 ease-silk ${index === shown && previewed !== null ? 'scale-x-100' : 'scale-x-0'}`} />
              </span>
            </li>
          })}
        </ol>
      </nav>

      <aside className="relative hidden min-h-0 flex-col items-center justify-center py-6 lg:row-start-2 lg:col-start-2 lg:flex" aria-hidden="true">
        {/* Each section's picture drifts faintly behind the emblem. */}
        <div className="menu-preview pointer-events-none absolute -inset-y-6 -right-(--gutter) left-0 overflow-hidden [mask-image:radial-gradient(ellipse_62%_58%_at_55%_48%,#000_20%,transparent_72%)]">
          {routes.map((route, index) => <img key={route.id} src={route.preview} alt="" loading="lazy"
            className={`absolute inset-0 size-full object-cover saturate-[.7] transition-[opacity,scale] duration-1400 ease-silk ${index === shown ? 'scale-100 opacity-30' : 'scale-110 opacity-0'}`} />)}
        </div>
        <div ref={emblem} className="relative aspect-square w-[min(100%,44vh)] 3xl:w-[min(100%,48vh)]" />
        <div className="menu-fade relative mt-4 text-center">
          <p className="num text-[0.72rem] tracking-[0.3em] text-gold-300/80">{pad(shown + 1)} / {pad(routes.length)}</p>
          <p key={shown} className="menu-caption mt-2 font-display text-[clamp(1.6rem,2.4vw,2.6rem)] uppercase leading-none text-ivory">{routes[shown].label}</p>
          <p key={`hint-${shown}`} className="menu-caption mt-3 font-serif text-lg italic text-gold-200/80">{routes[shown].hint}</p>
        </div>
      </aside>

      <div className="menu-fade flex items-center justify-between gap-6 py-[clamp(0.75rem,3vh,2rem)] text-[0.6rem] uppercase tracking-[0.34em] text-gold-300/70 lg:col-span-2">
        <span>Malad&rsquo;s Neu Gen life has arrived</span>
        <span className="hidden sm:inline">Malad West · Mumbai</span>
      </div>
    </div>
  </div>
}
