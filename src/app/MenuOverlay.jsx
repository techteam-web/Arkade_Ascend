import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from './reveal.js'
import { sections, pad } from './routes.js'
import { ArkadeMark, BrandLockup, Roll } from '../components/Brand.jsx'
import { rera } from '../content/project.js'
import { prefersReducedMotion } from '../hooks/useMediaQuery.js'
import GLImage from '../components/GLImage.jsx'
import { prefetchImages } from './prefetch.js'

// The menu rides the lift too (DESIGN.md): a plum curtain rises over the page
// with a domed leading edge, the section names rise out of their masks, and
// the picture of the section under consideration unveils from the bottom up
// over the last one. Closing, the curtain carries on upward, so the page
// beneath (or the new one) appears as if the lift had arrived.
const dome = () => `${Math.round(Math.min(160, Math.max(48, window.innerHeight * 0.14)))}px`

export default function MenuOverlay({ open, currentId, onClose, onNavigate }) {
  const root = useRef(null)
  const curtain = useRef(null)
  const running = useRef(null)
  const [previewed, setPreviewed] = useState(null)
  // Home is not a row (the home button is); on Home the first row leads.
  const currentIndex = sections.findIndex(route => route.id === currentId)
  const shown = previewed ?? Math.max(0, currentIndex)

  // Closed, the menu leaves the layout (display: none) as well as the view.
  useLayoutEffect(() => {
    gsap.set(root.current, { autoAlpha: 0, display: 'none' })
    gsap.set(curtain.current, { yPercent: 100 })
  }, [])

  useEffect(() => {
    const reduced = prefersReducedMotion()
    const el = root.current
    running.current?.kill()
    const q = gsap.utils.selector(el)
    if (open) {
      gsap.set(el, { clearProps: 'display' })
      if (reduced) { gsap.set(el, { autoAlpha: 1 }); gsap.set(curtain.current, { yPercent: 0, '--dome-top': '0px', '--dome-bottom': '0px' }); return }
      running.current = gsap.timeline({ defaults: { ease: 'silk' } })
        .set(el, { autoAlpha: 1 })
        .set(q('.menu-content'), { autoAlpha: 1 })
        .fromTo(curtain.current, { yPercent: 100, '--dome-top': dome(), '--dome-bottom': '0px' }, { yPercent: 0, '--dome-top': '0px', duration: 0.75, ease: 'curtain' }, 0)
        .fromTo(q('.menu-row-label'), { yPercent: 115, rotate: 4 }, { yPercent: 0, rotate: 0, duration: 0.95, stagger: 0.035, ease: 'rise' }, 0.28)
        .fromTo(q('.menu-row-number'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, stagger: 0.035 }, 0.4)
        .fromTo(q('.menu-row-rule'), { scaleX: 0 }, { scaleX: 1, transformOrigin: '0 50%', duration: 1, stagger: 0.035 }, 0.3)
        .fromTo(q('.menu-picture'), { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'curtain' }, 0.32)
        .fromTo(q('.menu-fade'), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.06 }, 0.45)
    } else {
      if (gsap.getProperty(el, 'autoAlpha') === 0) return
      if (reduced) { gsap.set(el, { autoAlpha: 0, display: 'none' }); return }
      running.current = gsap.timeline({ onComplete: () => gsap.set(el, { autoAlpha: 0, display: 'none' }) })
        .to(q('.menu-content'), { autoAlpha: 0, y: -24, duration: 0.35, ease: 'power2.in' }, 0)
        .to(curtain.current, { yPercent: -100, '--dome-bottom': dome(), duration: 0.75, ease: 'curtain' }, 0.1)
        .set(q('.menu-content'), { y: 0 })
    }
  }, [open])

  useEffect(() => {
    if (!open) { setPreviewed(null); return }
    const frame = requestAnimationFrame(() => root.current?.querySelector(`[data-route="${sections[Math.max(0, currentIndex)].id}"]`)?.focus({ preventScroll: true }))
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
    onKeyDown={onKeyDown} className="invisible absolute inset-0 z-50 overflow-hidden [--menu-picture:60%] xl:[--menu-picture:62%] 3xl:[--menu-picture:64%]" data-tone="dark">
    {/* The brochure's plum, lit from the upper left, as a lift curtain. */}
    <div ref={curtain} className="lift-panel overflow-hidden bg-[radial-gradient(ellipse_90%_80%_at_18%_22%,#5a4046_0%,#3d2a2f_45%,#1b1113_100%)]">
      <ArkadeMark className="pointer-events-none absolute -right-[8vmin] -bottom-[14vmin] h-[70vmin] w-auto text-gold-500/[0.06] lg:hidden" />
    </div>

    <div className="menu-content absolute inset-0">
      {/* The section under consideration, as a full-height picture. */}
      <aside className="menu-picture pointer-events-none absolute inset-y-0 right-0 hidden w-(--menu-picture) overflow-hidden lg:block" aria-hidden="true">
        <Previews shown={shown} />
        <div className="absolute inset-0 bg-linear-to-r from-[#2a1c20] via-[#2a1c20]/20 to-transparent" />
        {sections[shown].previewNote && <p key={`note-${shown}`} className="menu-caption absolute right-(--gutter) top-[calc(var(--header-h)+0.25rem)] z-10 text-[0.55rem] uppercase tracking-[0.22em] text-ivory/70">{sections[shown].previewNote}</p>}
        <div className="absolute inset-0 bg-linear-to-t from-ink/90 via-ink/5 to-ink/45" />
        <div className="absolute inset-x-[clamp(2rem,4vw,4.5rem)] bottom-[clamp(2.5rem,10vh,6rem)]">
          <p className="num text-[0.8rem] tracking-[0.3em] text-gold-200">{pad(shown + 1)} / {pad(sections.length)}</p>
          <p key={shown} className="menu-caption mt-3 font-display text-[clamp(2.6rem,4.6vw,5.5rem)] uppercase leading-[0.92] text-ivory">{sections[shown].label}</p>
          <p key={`hint-${shown}`} className="menu-caption mt-4 text-[1rem] tracking-[0.04em] text-ivory/90">{sections[shown].hint}</p>
        </div>
      </aside>

      <div className="absolute inset-0 grid grid-rows-[auto_1fr_auto] px-(--gutter)">
        <div className="menu-fade flex h-(--header-h) items-center gap-2">
          {/* The logo and, at the top right of the list's column, the way home. */}
          <div className="flex min-w-0 flex-1 items-center justify-between gap-4 lg:w-[calc(100%-var(--menu-picture)-var(--gutter)-3vw)] lg:flex-none">
            <BrandLockup />
            <button type="button" onClick={() => onNavigate('/')} aria-label="Home" aria-current={currentId === 'home' ? 'page' : undefined} data-magnetic
              className="group grid size-11 shrink-0 place-items-center rounded-full border border-ivory/40 text-ivory transition-colors duration-500 hover:border-gold-400 hover:bg-gold-500 hover:text-espresso focus-visible:border-gold-400 focus-visible:bg-gold-500 focus-visible:text-espresso aria-[current=page]:border-gold-400 aria-[current=page]:text-gold-300">
              <svg viewBox="0 0 24 24" className="size-[1.1rem] fill-none stroke-current" strokeWidth="1.3" strokeLinejoin="round" aria-hidden="true"><path d="M3.5 11 12 4l8.5 7M6 9v10.5h4.5V14h3v5.5H18V9" /></svg>
            </button>
          </div>
          <button type="button" onClick={onClose} data-cursor="none" className="group ml-auto flex min-h-11 shrink-0 items-center gap-4 rounded-full py-2 pl-4 pr-1 text-ivory">
            <span className="text-[0.7rem] font-medium uppercase tracking-[0.3em] group-hover:text-gold-300 max-[23rem]:sr-only"><Roll>Close</Roll></span>
            <span data-magnetic className="grid size-11 place-items-center rounded-full border border-ivory/50 bg-ink/30 transition-colors duration-500 group-hover:border-gold-400 group-hover:bg-gold-500 group-hover:text-espresso">
              <svg viewBox="0 0 24 24" className="size-3.5 fill-none stroke-current transition-[rotate] duration-700 ease-silk group-hover:rotate-90" strokeWidth="1.4" aria-hidden="true"><path d="m3 3 18 18M21 3 3 21" /></svg>
            </span>
          </button>
        </div>

        <nav aria-label="Sections" className="page-scroll -mx-2 flex min-h-0 flex-col justify-center-safe px-2 py-2 lg:w-[calc(100%-var(--menu-picture)-var(--gutter)-3vw)]" onPointerLeave={() => setPreviewed(null)}>
          {/* Two columns only on landscape phones and short tablets; on laptops
              the rows fit one column even in short windows. */}
          <ol className="grid grid-cols-1 max-lg:short:grid-cols-2 max-lg:short:gap-x-8 max-lg:sm:compact-h:grid-cols-2 max-lg:sm:compact-h:gap-x-10">
            {sections.map((route, index) => {
              const current = index === currentIndex
              const lit = index === shown && previewed !== null
              return <li key={route.id} className="relative">
                <button type="button" data-route={route.id} aria-current={current ? 'page' : undefined} data-cursor="none"
                  onClick={() => onNavigate(route.path)}
                  onPointerEnter={event => { if (event.pointerType !== 'touch') setPreviewed(index) }}
                  onFocus={() => setPreviewed(index)}
                  className="group relative flex min-h-11 w-full items-baseline gap-4 py-[clamp(0.15rem,0.75vh,0.6rem)] text-left outline-offset-2">
                  <span className={`menu-row-number num w-6 shrink-0 text-[0.68rem] transition-colors duration-500 ${current ? 'text-gold-300' : 'text-gold-200/75 group-hover:text-gold-200 group-focus-visible:text-gold-200'}`}>{pad(index + 1)}</span>
                  <span className="-my-[0.14em] shrink-0 overflow-hidden py-[0.14em]">
                    {/* The row being considered turns gold, leans in and rolls over. */}
                    <span className={`menu-row-label block whitespace-nowrap font-display text-[clamp(1.2rem,min(3.6vw,3.6vh),2rem)] uppercase lg:text-[clamp(1.2rem,min(2.5vw,4.3vh),3.1rem)] leading-[1.04] tracking-[0.01em] transition-[color,translate] duration-500 ease-silk group-hover:translate-x-3 group-focus-visible:translate-x-3 ${lit ? 'text-gold-200' : current ? 'text-gold-300' : 'text-ivory'}`}><Roll>{route.label}</Roll></span>
                  </span>
                  <span className="ml-auto hidden min-w-0 self-center text-right text-[0.62rem] leading-snug uppercase tracking-[0.22em] text-gold-200/70 transition-colors duration-500 group-hover:text-gold-200 group-focus-visible:text-gold-200 md:block lg:hidden short:hidden">{route.hint}</span>
                  {current && <span className="absolute -left-4 top-1/2 size-1.5 -translate-y-1/2 rotate-45 bg-gold-400" aria-hidden="true" />}
                </button>
                <span className="menu-row-rule relative block h-px bg-linear-to-r from-gold-400/45 via-gold-400/25 to-gold-400/5" aria-hidden="true">
                  <span className={`absolute inset-y-0 left-0 w-full origin-left bg-linear-to-r from-gold-200 via-gold-400/60 to-transparent transition-[scale] duration-700 ease-silk ${lit ? 'scale-x-100' : 'scale-x-0'}`} />
                </span>
              </li>
            })}
          </ol>
        </nav>

        <div className="menu-fade flex items-end justify-between gap-6 pt-[clamp(0.75rem,3vh,2rem)] pb-[max(clamp(0.75rem,3vh,2rem),var(--credit-space))] text-[0.62rem] uppercase tracking-[0.3em] text-gold-200/80">
          {/* The MahaRERA registration, bottom left. The QR code keeps a light
              tile and its quiet margin so phones can scan it off the screen. */}
          <div className="flex items-center gap-[clamp(0.75rem,1.2vw,1.25rem)]">
            <img src={rera.qr} alt={`QR code for the MahaRERA project page, ${rera.qrTarget}`} draggable="false"
              className="size-[clamp(3.75rem,min(7vw,9vh),5.5rem)] shrink-0 rounded-xs bg-ivory p-[clamp(0.4rem,0.6vw,0.6rem)] short:size-14" />
            <div className="min-w-0 normal-case tracking-normal">
              <p className="text-[0.6rem] uppercase tracking-[0.3em] text-gold-200/80">MahaRERA Reg. No.</p>
              <p className="num mt-1.5 text-[clamp(0.85rem,1.1vw,1.1rem)] tracking-[0.06em] text-ivory">{rera.number}</p>
              <p className="mt-1 text-[0.62rem] tracking-[0.04em] text-ivory/60 short:hidden">{rera.site.replace('https://', '')}</p>
            </div>
          </div>
          <span className="hidden sm:inline lg:pb-1">Malad West · Mumbai</span>
        </div>
      </div>
    </div>
  </div>
}

// The picture of the section under consideration, in WebGL: each new one rises
// in over the last through a liquid front (GLImage). All of them load when
// the menu first opens, so the rise starts at once.
function Previews({ shown }) {
  useEffect(() => prefetchImages(sections.map(route => ({ src: route.preview })), '62vw'), [])
  return <GLImage src={sections[shown].preview} sizes="62vw" alt="" ripple={false} />
}
