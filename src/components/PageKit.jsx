import { useLayoutEffect, useRef, useState } from 'react'
import { gsap } from '../app/reveal.js'
import { prefersReducedMotion } from '../hooks/useMediaQuery.js'
import { ArkadeMark } from './Brand.jsx'
import { pad, sectionIndex, sections } from '../app/routes.js'
import { isTemplate } from '../content/template.js'

// Section index, headline and a supporting line, shared by every page. The
// index reads like a stop on the lift (its number, a rule, the last stop);
// the headline's letters rise out of their mask (data-reveal="chars").
export function PageHeading({ id, title, subtitle, className = '', titleClass = '' }) {
  const index = sectionIndex(id)
  // Long titles shrink to fit their column (about 0.74em per capital).
  const fit = `min(clamp(2.6rem, min(7vw, 10.5vh), 8rem), ${(130 / title.length).toFixed(2)}cqi)`
  // Inline-size containment: in a flex row, give the heading flex-1 so it has a width.
  return <div className={`min-w-0 [container-type:inline-size] ${className}`}>
    <p data-reveal className="eyebrow flex items-center gap-3">
      <span className="visually-hidden">Section {index + 1} of {sections.length}</span>
      <span className="num tracking-[0.12em] text-fg" aria-hidden="true">{pad(index + 1)}</span>
      <span data-reveal="line" aria-hidden="true" className="h-px w-[clamp(1.75rem,4cqi,3.5rem)] bg-accent" />
      <span className="num tracking-[0.12em] text-muted" aria-hidden="true">{pad(sections.length)}</span>
    </p>
    <h1 tabIndex={-1} data-reveal="chars" className={`display sheen mt-[clamp(0.6rem,1.6vh,1rem)] whitespace-nowrap text-fg outline-none ${titleClass}`} style={{ fontSize: fit, lineHeight: 0.9 }}>{title}</h1>
    {subtitle && <p data-reveal className="mt-[clamp(0.6rem,1.8vh,1.1rem)] text-[clamp(0.9rem,1.1vw,1.15rem)] tracking-[0.02em] text-muted">{subtitle}</p>}
  </div>
}

// A render slot: shows the image when one is supplied, otherwise a quiet
// gold-framed placeholder so the layout reads as finished.
export function ImageSlot({ src, alt = '', label = 'Render to follow', className = '', imgClass = '' }) {
  if (src) return <img src={src} alt={alt} draggable="false" className={`size-full object-cover ${imgClass} ${className}`} />
  return <div role="img" aria-label={`${label} — image placeholder`} className={`relative grid size-full place-items-center overflow-hidden bg-[radial-gradient(ellipse_at_30%_20%,#4e373c,#21161a_70%)] ${className}`}>
    <div className="absolute inset-3 border border-gold-500/25" />
    <div className="relative flex flex-col items-center gap-3 text-gold-300/70">
      <ArkadeMark className="h-10 w-auto" />
      <span className="text-[0.58rem] uppercase tracking-[0.34em]">{label}</span>
    </div>
  </div>
}

// Shown wherever the building model appears. Short screens, and small
// spaces (`compact`), get the shorter wording.
export function ModelNote({ className = '', compact = false }) {
  return <p className={`text-[0.58rem] uppercase leading-relaxed tracking-[0.22em] text-muted/90 ${className}`}>
    <span className={compact ? 'hidden' : 'short:hidden'}>Temporary representation of the building · it will be replaced by the final, fully coloured model as the development progresses</span>
    <span className={compact ? '' : 'hidden short:inline'}>Temporary model · the final, fully coloured model will replace it</span>
  </p>
}

export function TemplateNote({ children = 'Indicative content — to be confirmed', className = '' }) {
  if (!isTemplate) return null
  return <p className={`text-[0.58rem] uppercase tracking-[0.26em] text-muted/80 ${className}`}>{children}</p>
}

// Figure with a label. Numbers count up on arrival via data-count; strings
// (such as a configuration) are shown as they are. The number and its unit
// are sized together to fit their own cell, so neighbouring figures can never
// collide at any width.
export function Figure({ value, suffix = '', label, decimals = 0, fitTo = value, className = '' }) {
  const numeric = typeof value === 'number'
  const text = numeric ? value.toLocaleString('en-IN') : String(value)
  // Width in ems: figures ~0.66em, letters ~0.74em; the unit is set at 0.36em.
  // Figures set side by side can share one size by fitting the widest (`fitTo`).
  const sized = typeof fitTo === 'number' ? fitTo.toLocaleString('en-IN') : String(fitTo)
  const width = sized.length * (typeof fitTo === 'number' ? 0.66 : 0.74) + (suffix ? 0.4 + suffix.length * 0.36 * 0.8 : 0)
  const fit = `min(clamp(1.3rem, min(1.8vw, 3.6vh), 2.2rem), ${(100 / width).toFixed(1)}cqi)`
  return <div data-reveal className={`min-w-0 [container-type:inline-size] ${className}`}>
    <p className="num whitespace-nowrap leading-none text-fg" style={{ fontSize: fit }}>
      {numeric ? <span data-count={value} data-decimals={decimals}>{text}</span> : text}
      {suffix && <span className="ml-[0.4em] text-[0.36em] font-medium uppercase tracking-[0.08em] text-accent">{suffix}</span>}
    </p>
    <p className="mt-2 text-[0.6rem] uppercase leading-snug tracking-[0.16em] text-muted [overflow-wrap:anywhere]">{label}</p>
  </div>
}

// A picture that changes by rising (DESIGN.md): the new one unveils from the
// bottom up over the last, settling as it comes, and the last steps away once
// it is covered. Fills its parent (which positions it). Each picture keeps
// its own alt text, focus and fit.
export function RiseImage({ src, srcSet, sizes, alt = '', focus, className = '', fit = 'object-cover', ...props }) {
  const [layers, setLayers] = useState(() => [{ id: 0, src, srcSet, alt, focus }])
  const top = useRef(null)
  const count = useRef(0)
  const animated = useRef(src)
  if (layers[layers.length - 1].src !== src) {
    count.current += 1
    // Keep at most the last picture under the new one.
    setLayers(value => [...value.slice(-1), { id: count.current, src, srcSet, alt, focus }])
  }
  const current = layers[layers.length - 1]
  useLayoutEffect(() => {
    if (animated.current === current.src) return
    animated.current = current.src
    const settle = () => setLayers(value => value.slice(-1))
    if (prefersReducedMotion() || !top.current) { settle(); return }
    const image = top.current.firstElementChild
    const timeline = gsap.timeline({ onComplete: settle })
      .fromTo(top.current, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'curtain' }, 0)
      .fromTo(image, { scale: 1.12, yPercent: 4 }, { scale: 1, yPercent: 0, duration: 1.4, ease: 'rise' }, 0)
    return () => timeline.progress(1)
  }, [current.src])
  return <div className={`absolute inset-0 ${className}`} {...props}>
    {layers.map((layer, i) => {
      const isTop = i === layers.length - 1
      return <div key={layer.id} ref={isTop ? top : undefined} className="absolute inset-0 overflow-hidden" aria-hidden={isTop ? undefined : 'true'}>
        <img src={layer.src} srcSet={layer.srcSet} sizes={sizes} alt={isTop ? layer.alt : ''} draggable="false" decoding="async"
          className={`absolute inset-0 size-full select-none ${fit}`} style={{ objectPosition: layer.focus }} />
      </div>
    })}
  </div>
}
