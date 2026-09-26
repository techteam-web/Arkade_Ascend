import { useState } from 'react'
import { Figure, PageHeading, TemplateNote } from '../components/PageKit.jsx'
import { towerRender as tower } from '../content/template.js'
import { pad } from '../app/routes.js'

// The concept render with a gold band marking the chosen level. Hover or tap
// the facade, use the slider, or the arrow keys, to move between levels.
export default function TowerPage() {
  const [level, setLevel] = useState(Math.round(tower.levels * 0.7))
  const [hover, setHover] = useState(null)
  const shown = hover ?? level
  const span = tower.bottom - tower.top
  const band = n => ({ top: `${(tower.bottom - (n / tower.levels) * span) * 100}%`, height: `${(span / tower.levels) * 100}%` })
  const levelAt = event => {
    const box = event.currentTarget.getBoundingClientRect()
    const y = (event.clientY - box.top) / box.height
    const x = (event.clientX - box.left) / box.width
    if (y < tower.top || y > tower.bottom || x < tower.left || x > tower.right) return null
    return Math.min(tower.levels, Math.max(1, Math.ceil((tower.bottom - y) / span * tower.levels)))
  }
  const step = delta => setLevel(value => Math.min(tower.levels, Math.max(1, value + delta)))

  return <section className="page page-scroll flex flex-col gap-6 split:grid split:grid-cols-[minmax(0,27rem)_minmax(0,1fr)] split:gap-x-[5vw] 3xl:grid-cols-[minmax(0,34rem)_minmax(0,1fr)] short:grid-cols-2">
    <div className="flex flex-col gap-[clamp(1rem,3.4vh,2.25rem)] stack:contents split:justify-between split:gap-6">
      <div className="flex flex-col gap-[clamp(1rem,3.4vh,2.25rem)] stack:order-1">
        <PageHeading id="tower" title="The Tower" subtitle="A masterpiece made for those who think ahead." />
        <p data-reveal className="body-copy max-w-md stack:hidden short:hidden">
          Hover or tap the facade, or use the slider, to find a level.
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
          <input id="tower-level" type="range" min="1" max={tower.levels} value={level} onChange={event => setLevel(Number(event.target.value))}
            aria-valuetext={`Level ${level}`} className="range-lux mt-1 w-full" style={{ '--fill': `${((level - 1) / (tower.levels - 1)) * 100}%` }} />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[0.6rem] uppercase leading-relaxed tracking-[0.22em] text-muted">
              <span className="pointer-coarse:hidden">Hover the facade, click to select</span>
              <span className="hidden pointer-coarse:inline">Tap the facade to select</span>
            </p>
            <div className="flex gap-2">
              <button type="button" className="btn-icon" aria-label="Level down" onClick={() => step(-1)}><svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg></button>
              <button type="button" className="btn-icon" aria-label="Level up" onClick={() => step(1)}><svg viewBox="0 0 24 24"><path d="m6 15 6-6 6 6" /></svg></button>
            </div>
          </div>
        </div>
        <TemplateNote>Concept render · levels indicative, counted on the render</TemplateNote>
      </div>
    </div>

    {/* On split layouts the render keeps to the visible height and stays in
        view while a short window scrolls the text column. */}
    <div data-reveal="fade" className="relative min-h-[46vh] flex-1 stack:order-2 split:sticky split:top-0 split:h-[calc(100cqh-var(--header-h)-0.5rem-clamp(1rem,4vh,3rem))] split:min-h-0 split:self-start @container-size">
      <div className="absolute inset-0 grid place-items-center">
        <div role="img" tabIndex={0} aria-label={`Concept render of the tower, level ${level} marked. Use the up and down arrow keys to change level.`}
          data-own-keys data-own-gesture
          onKeyDown={event => {
            if (event.key === 'ArrowUp') { event.preventDefault(); step(1) }
            if (event.key === 'ArrowDown') { event.preventDefault(); step(-1) }
          }}
          onPointerMove={event => { if (event.pointerType === 'mouse') setHover(levelAt(event)) }}
          onPointerLeave={() => setHover(null)}
          onClick={event => { const next = levelAt(event); if (next) setLevel(next) }}
          className={`relative rounded-sm outline-offset-8 ${hover ? 'cursor-pointer' : ''}`}
          style={{ aspectRatio: tower.ratio, height: `min(100cqh, calc(100cqw / ${tower.ratio}))` }}>
          <img src={tower.src} alt="" draggable="false" className="absolute inset-0 size-full select-none object-contain" />
          {/* The chosen level, and a lighter preview of the hovered one. */}
          {hover && hover !== level && <span aria-hidden="true" className="pointer-events-none absolute border-y border-gold-200/40 bg-gold-200/10"
            style={{ left: `${tower.left * 100}%`, right: `${(1 - tower.right) * 100}%`, ...band(hover) }} />}
          <span aria-hidden="true" className="pointer-events-none absolute border-y border-gold-200/80 bg-gold-300/25 transition-[top] duration-500 ease-silk"
            style={{ left: `${tower.left * 100}%`, right: `${(1 - tower.right) * 100}%`, ...band(level) }} />
          <span aria-hidden="true" className="pointer-events-none absolute right-[calc(100%-var(--edge))] flex -translate-y-1/2 items-center gap-3 transition-[top] duration-500 ease-silk"
            style={{ '--edge': `${tower.left * 100}%`, top: `calc(${band(shown).top} + ${(span / tower.levels) * 50}%)` }}>
            <span className="num whitespace-nowrap rounded-full border border-gold-500/40 bg-espresso/85 px-4 py-2 text-[0.64rem] uppercase tracking-[0.24em] text-gold-100 @max-md:hidden">Level {pad(shown)}</span>
            <span className="h-px w-[clamp(1rem,3cqw,3rem)] bg-gold-300/70" />
          </span>
        </div>
      </div>
      <p className="visually-hidden" aria-live="polite">Level {level} selected</p>
    </div>
  </section>
}
