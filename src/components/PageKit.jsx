import { ArkadeMark } from './Brand.jsx'
import { pad, routeIndex, routes } from '../app/routes.js'
import { isTemplate } from '../content/template.js'

// Section index, headline and a supporting line, shared by every page.
export function PageHeading({ id, title, subtitle, className = '', titleClass = '' }) {
  const index = routeIndex(id)
  // Long titles shrink to fit their column (about 0.74em per capital).
  const fit = `min(clamp(2.4rem, min(6vw, 9vh), 6.5rem), ${(130 / title.length).toFixed(2)}cqi)`
  // Inline-size containment: in a flex row, give the heading flex-1 so it has a width.
  return <div className={`min-w-0 [container-type:inline-size] ${className}`}>
    <p data-reveal className="eyebrow flex items-center gap-4">
      <span className="num tracking-[0.12em]">{pad(index + 1)}</span><span>{routes[index].label}</span>
    </p>
    <h1 tabIndex={-1} data-reveal="lines" className={`display mt-4 whitespace-nowrap text-fg outline-none ${titleClass}`} style={{ fontSize: fit }}>{title}</h1>
    {subtitle && <p data-reveal className="mt-4 text-[clamp(0.9rem,1.1vw,1.15rem)] tracking-[0.02em] text-muted">{subtitle}</p>}
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
export function Figure({ value, suffix = '', label, decimals = 0, className = '' }) {
  const numeric = typeof value === 'number'
  const text = numeric ? value.toLocaleString('en-IN') : String(value)
  // Width in ems: figures ~0.66em, letters ~0.74em; the unit is set at 0.36em.
  const width = text.length * (numeric ? 0.66 : 0.74) + (suffix ? 0.4 + suffix.length * 0.36 * 0.8 : 0)
  const fit = `min(clamp(1.3rem, min(1.8vw, 3.6vh), 2.2rem), ${(100 / width).toFixed(1)}cqi)`
  return <div data-reveal className={`min-w-0 [container-type:inline-size] ${className}`}>
    <p className="num whitespace-nowrap leading-none text-fg" style={{ fontSize: fit }}>
      {numeric ? <span data-count={value} data-decimals={decimals}>{text}</span> : text}
      {suffix && <span className="ml-[0.4em] text-[0.36em] font-medium uppercase tracking-[0.08em] text-accent">{suffix}</span>}
    </p>
    <p className="mt-2 text-[0.6rem] uppercase leading-snug tracking-[0.16em] text-muted [overflow-wrap:anywhere]">{label}</p>
  </div>
}
