import { useLayoutEffect, useRef } from 'react'
import { gsap } from 'gsap'

const paths = [
  { id: 'guided', number: '01', title: 'Guided finder', support: <>Let us guide you to<br />the right residence.</>, description: 'Answer a few simple questions and discover residences that match your preferences.', action: 'Begin guided search', hint: 'Let us guide you' },
  { id: 'filter', number: '02', title: 'Unit filter', support: <>Know what you’re<br />looking for?</>, description: 'Filter directly by tower, configuration, floor and availability.', action: 'Open unit filter', hint: 'Search directly' },
]

export default function UnitFinder({ active, selected, onSelect, onPreview, onBack }) {
  const root = useRef(null)
  useLayoutEffect(() => {
    if (!active) return
    const context = gsap.context(() => {
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.fromTo('.finder-arrival', { y: 14, opacity: 0, filter: 'blur(4px)' },
          { y: 0, opacity: 1, filter: 'blur(0px)', duration: .65, stagger: .065, ease: 'power3.out' })
      }
      root.current.querySelector('h1')?.focus({ preventScroll: true })
    }, root)
    return () => context.revert()
  }, [active])

  return <div ref={root} className="unit-finder" hidden={!active}>
    <button className="finder-back finder-arrival" onClick={onBack}><span aria-hidden="true">←</span> Residences</button>
    <div className="finder-heading finder-arrival">
      <p className="finder-index">03 / 07</p>
      <h1 tabIndex={-1}>Unit finder</h1>
      <p className="finder-subtitle">Find your way home.</p>
    </div>
    <p className="finder-intro finder-arrival">Choose how you’d like to search</p>
    <div className="finder-paths">
      {paths.map(path => <section key={path.id} className={`finder-path finder-path--${path.id} finder-arrival`}
        data-selected={selected === path.id}
        onPointerEnter={event => { if (event.pointerType === 'mouse') onPreview(path.id) }}
        onPointerLeave={() => onPreview(null)}
        onFocus={() => onPreview(path.id)} onBlur={() => onPreview(null)}>
        <p className="finder-option">Option {path.number}</p>
        <h2>{path.title}</h2>
        <p className="finder-support">{path.support}</p>
        <p className="finder-description">{path.description}</p>
        <button className="finder-cta" aria-pressed={selected === path.id} onClick={() => onSelect(path.id)}>
          <span>{path.action}</span><svg viewBox="0 0 32 12" aria-hidden="true"><path d="M1 6h28m-5-5 5 5-5 5" /></svg>
        </button>
        <span className="finder-hint" aria-hidden="true">{path.hint}</span>
      </section>)}
    </div>
    <p className="finder-status" role="status">{selected ? `${selected === 'guided' ? 'Guided finder' : 'Unit filter'} selected. This search experience is coming soon.` : ''}</p>
  </div>
}
