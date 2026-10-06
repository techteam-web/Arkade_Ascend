import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from './reveal.js'
import { routes, pad } from './routes.js'
import { ArkadeMark, BrandLockup } from '../components/Brand.jsx'
import { prefersReducedMotion } from '../hooks/useMediaQuery.js'

export default function MenuOverlay({ open, currentId, onClose, onNavigate }) {
  const root = useRef(null)
  const timeline = useRef(null)
  const [previewed, setPreviewed] = useState(null)
  const currentIndex = Math.max(0, routes.findIndex(route => route.id === currentId))
  const shown = previewed ?? currentIndex

  useLayoutEffect(() => {
    const context = gsap.context(() => {
      // A quiet fade with the rows rising in turn.
      timeline.current = gsap.timeline({ paused: true, defaults: { ease: 'silk' } })
        .set(root.current, { autoAlpha: 1 })
        .fromTo('.menu-curtain', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, ease: 'power2.out' })
        .from('.menu-row-label', { yPercent: 100, duration: 0.8, stagger: 0.03 }, 0.15)
        .from('.menu-row-number', { autoAlpha: 0, duration: 0.7, stagger: 0.03 }, 0.2)
        .from('.menu-row-rule', { scaleX: 0, transformOrigin: '0 50%', duration: 0.9, stagger: 0.03 }, 0.15)
        .from('.menu-fade', { autoAlpha: 0, duration: 0.8, stagger: 0.06 }, 0.3)
    }, root)
    gsap.set(root.current, { autoAlpha: 0 })
    return () => context.revert()
  }, [])

  useEffect(() => {
    const tl = timeline.current
    if (!tl) return
    if (prefersReducedMotion()) { tl.progress(open ? 1 : 0).pause(); if (!open) gsap.set(root.current, { autoAlpha: 0 }); return }
    if (open) tl.timeScale(1).play()
    else if (tl.progress() > 0) tl.timeScale(1.8).reverse()
  }, [open])

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
    onKeyDown={onKeyDown} className="invisible absolute inset-0 z-50 [--menu-picture:62%] xl:[--menu-picture:64%] 3xl:[--menu-picture:66%]" data-tone="dark">
    {/* The brochure's plum, lit from the upper left. */}
    <div className="menu-curtain absolute inset-0 overflow-hidden bg-[radial-gradient(ellipse_90%_80%_at_18%_22%,#5a4046_0%,#3d2a2f_45%,#21161a_100%)]">
      <ArkadeMark className="pointer-events-none absolute -right-[8vmin] -bottom-[14vmin] h-[70vmin] w-auto text-gold-500/[0.06] lg:hidden" />
    </div>

    {/* The section under consideration, as a full-height picture. It takes
        about two thirds of wide screens; the compact list keeps the rest. */}
    <aside className="menu-fade pointer-events-none absolute inset-y-0 right-0 hidden w-(--menu-picture) overflow-hidden lg:block" aria-hidden="true">
      {routes.map((route, index) => <img key={route.id} src={route.preview} alt="" loading="lazy"
        className={`absolute inset-0 size-full object-cover transition-opacity duration-700 ease-silk ${index === shown ? 'opacity-100' : 'opacity-0'}`} />)}
      <div className="absolute inset-0 bg-linear-to-r from-[#35252a] via-[#35252a]/25 to-transparent" />
      <div className="absolute inset-0 bg-linear-to-t from-ink/85 via-ink/5 to-ink/45" />
      <div className="absolute inset-x-[clamp(2rem,4vw,4.5rem)] bottom-[clamp(2.5rem,10vh,6rem)]">
        <p className="num text-[0.8rem] tracking-[0.3em] text-gold-200">{pad(shown + 1)} / {pad(routes.length)}</p>
        <p key={shown} className="menu-caption mt-3 font-display text-[clamp(2.2rem,3.6vw,4rem)] uppercase leading-none text-ivory">{routes[shown].label}</p>
        <p key={`hint-${shown}`} className="menu-caption mt-3 text-[1rem] tracking-[0.04em] text-ivory/90">{routes[shown].hint}</p>
      </div>
    </aside>

    <div className="absolute inset-0 grid grid-rows-[auto_1fr_auto] px-(--gutter)">
      <div className="menu-fade flex h-(--header-h) items-center lg:justify-between">
        <BrandLockup />
        <button type="button" onClick={onClose} className="group ml-auto flex min-h-11 items-center gap-4 rounded-full py-2 pl-4 pr-1 text-ivory lg:ml-0">
          <span className="text-[0.7rem] font-medium uppercase tracking-[0.3em] group-hover:text-gold-300 max-[23rem]:sr-only">Close</span>
          <span className="grid size-11 place-items-center rounded-full border border-ivory/50 bg-ink/30 transition-colors duration-500 group-hover:border-gold-400 group-hover:bg-gold-500 group-hover:text-espresso">
            <svg viewBox="0 0 24 24" className="size-3.5 fill-none stroke-current" strokeWidth="1.4" aria-hidden="true"><path d="m3 3 18 18M21 3 3 21" /></svg>
          </span>
        </button>
      </div>

      <nav aria-label="Sections" className="page-scroll -mx-2 flex min-h-0 flex-col justify-center-safe px-2 py-2 lg:w-[calc(100%-var(--menu-picture)-var(--gutter)-3vw)]" onPointerLeave={() => setPreviewed(null)}>
        {/* Two columns only on landscape phones and short tablets; on laptops
            the compact rows fit one column even in short windows. */}
        <ol className="grid grid-cols-1 max-lg:short:grid-cols-2 max-lg:short:gap-x-8 max-lg:sm:compact-h:grid-cols-2 max-lg:sm:compact-h:gap-x-10">
          {routes.map((route, index) => {
            const current = index === currentIndex
            return <li key={route.id} className="relative">
              <button type="button" data-route={route.id} aria-current={current ? 'page' : undefined}
                onClick={() => onNavigate(route.path)}
                onPointerEnter={event => { if (event.pointerType !== 'touch') setPreviewed(index) }}
                onFocus={() => setPreviewed(index)}
                className="group relative flex min-h-11 w-full items-baseline gap-4 py-[clamp(0.15rem,0.7vh,0.55rem)] text-left outline-offset-2">
                <span className={`menu-row-number num w-6 shrink-0 text-[0.68rem] transition-colors duration-500 ${current ? 'text-gold-300' : 'text-gold-200/75 group-hover:text-gold-200 group-focus-visible:text-gold-200'}`}>{pad(index + 1)}</span>
                <span className="-my-[0.14em] shrink-0 overflow-hidden py-[0.14em]">
                  {/* The row being considered turns gold and leans in slightly. */}
                  <span className={`menu-row-label block whitespace-nowrap font-display text-[clamp(1.15rem,min(3.4vw,3.4vh),1.75rem)] uppercase lg:text-[clamp(1.05rem,min(1.75vw,3.1vh),2rem)] leading-[1.08] tracking-[0.02em] transition-[color,translate] duration-500 ease-silk group-hover:translate-x-1.5 group-focus-visible:translate-x-1.5 ${index === shown && previewed !== null ? 'text-gold-200' : current ? 'text-gold-300' : 'text-ivory'}`}>{route.label}</span>
                </span>
                <span className="ml-auto hidden min-w-0 self-center text-right text-[0.62rem] leading-snug uppercase tracking-[0.22em] text-gold-200/70 transition-colors duration-500 group-hover:text-gold-200 group-focus-visible:text-gold-200 md:block lg:hidden short:hidden">{route.hint}</span>
                {current && <span className="absolute -left-4 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-gold-400" aria-hidden="true" />}
              </button>
              <span className="menu-row-rule relative block h-px bg-linear-to-r from-gold-400/45 via-gold-400/25 to-gold-400/5" aria-hidden="true">
                <span className={`absolute inset-y-0 left-0 w-full origin-left bg-linear-to-r from-gold-200 via-gold-400/60 to-transparent transition-[scale] duration-700 ease-silk ${index === shown && previewed !== null ? 'scale-x-100' : 'scale-x-0'}`} />
              </span>
            </li>
          })}
        </ol>
      </nav>


      <div className="menu-fade flex items-center justify-end gap-6 py-[clamp(0.75rem,3vh,2rem)] text-[0.62rem] uppercase tracking-[0.3em] text-gold-200/80">
        <span className="hidden sm:inline">Malad West · Mumbai</span>
      </div>
    </div>
  </div>
}
