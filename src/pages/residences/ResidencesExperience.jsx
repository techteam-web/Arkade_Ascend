import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import UnitFinder from './UnitFinder.jsx'

// The whole residence journey will live inside this shell. Only the entry
// stage is built; the rest are declared so later screens slot in without
// reshaping the state that the entry screen already writes.
export const residenceStages = ['entry', 'tower-selection', 'floor-selection', 'floor-plate', 'unit-detail', 'floor-plan', 'interior-360', 'balcony-view', 'compare', 'unit-finder', 'unit-results']
export const towers = ['A', 'B']
const initialJourney = { residenceStage: 'entry', discoveryMode: 'visual', activeTower: null, activeFloor: null, activeUnit: null, compareUnits: [] }
const discoveries = [
  { id: 'visual', label: 'Visual select', stage: 'tower-selection' },
  { id: 'finder', label: 'Unit finder', stage: 'unit-finder' },
]

export default function ResidencesExperience({ interactive, onExplore, onHome, motion }) {
  const [journey, setJourney] = useState(initialJourney)
  const [previewMode, setPreviewMode] = useState(null)
  const [previewTower, setPreviewTower] = useState(null)
  const [finderPreview, setFinderPreview] = useState(null)
  const [finderPath, setFinderPath] = useState(null)
  const finderOpen = journey.residenceStage === 'unit-finder'
  const root = useRef(null)
  // A considered option reads ahead of the committed one, so hovering Unit
  // finder shows the finder mood without discarding the visual selection.
  const mode = previewMode || journey.discoveryMode
  const highlight = mode === 'visual' ? previewTower || journey.activeTower || '' : ''

  const choose = (discoveryMode, activeTower = null) => {
    const { stage } = discoveries.find(item => item.id === discoveryMode)
    setJourney(current => ({ ...current, discoveryMode, activeTower, residenceStage: stage }))
  }

  useEffect(() => { if (!interactive) { setPreviewMode(null); setPreviewTower(null) } }, [interactive])
  useEffect(() => {
    // Considering Visual select warms the towers and pulls the silk toward
    // them; the finder mood leaves the architecture cooler.
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    // This object also holds intro/gallery/residences timeline properties.
    // Property-level overwrite preserves those tweens for reverse playback.
    const tween = gsap.to(motion.current, { residenceLight: interactive && (mode === 'visual' || finderPreview === 'guided') ? .08 : 0, duration: reduced ? 0 : .7, ease: 'power3.out', overwrite: 'auto' })
    return () => tween.kill()
  }, [interactive, mode, motion, finderPreview])
  // Only the light this screen owns is reset — the arrival timeline drives the
  // other keys on the same object and must not be killed from here.
  useEffect(() => () => { motion.current.residenceLight = 0 }, [motion])

  const parallax = event => {
    if (event.pointerType !== 'mouse' || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const box = event.currentTarget.getBoundingClientRect()
    gsap.to(root.current, {
      '--res-x': `${((event.clientX - box.left) / box.width - .5) * 17}px`,
      '--res-y': `${((event.clientY - box.top) / box.height - .5) * 12}px`,
      duration: 1.5, ease: 'power3.out', overwrite: true,
    })
  }
  const settle = () => gsap.to(root.current, { '--res-x': '0px', '--res-y': '0px', duration: 1.5, ease: 'power3.out', overwrite: true })

  const backToResidences = () => {
    setJourney(current => ({ ...current, residenceStage: 'entry', discoveryMode: 'visual' }))
    setFinderPreview(null)
    requestAnimationFrame(() => root.current?.querySelector('.residence-action--finder')?.focus())
  }

  return <section ref={root} className={`residences-page mode-${mode}${finderOpen ? ' is-unit-finder' : ''}`} aria-label={finderOpen ? 'Unit finder' : 'Residences'}
    aria-hidden={!interactive} inert={interactive ? undefined : ''}
    data-stage={journey.residenceStage} data-preview={previewMode || ''} data-finder-preview={finderPreview || ''}
    onPointerMove={parallax} onPointerLeave={settle}
    onKeyDown={event => { if (event.key === 'Escape') finderOpen ? backToResidences() : onExplore() }}>
    <ResidenceBackground />
    <header className="residence-header">
      <button className="residence-logo menu-logo" onClick={onHome} aria-label="Arkade Ascend home">
        <span className="menu-logo-brand">Arkade</span>
        <span className="menu-logo-name">Ascend</span>
        <span className="menu-logo-locality">Malad West</span>
      </button>
      <button className="residence-explore" onClick={onExplore}>
        <span>Explore</span><svg viewBox="0 0 30 24" fill="none" aria-hidden="true"><path d="M1 3h28M1 12h28M1 21h28" /></svg>
      </button>
    </header>

    <div className="residence-column" hidden={finderOpen}>
      <div className="residence-heading">
        <p className="residence-index">03 / 07</p>
        <h1 tabIndex={-1}>Residences</h1>
        <p className="residence-subtitle">Discover your residence</p>
      </div>
      <div className="residence-discovery">
        <p className="residence-lead">Two ways to explore</p>
        <div className="residence-actions">
          {discoveries.map(({ id, label }) => <button key={id} className={`residence-action residence-action--${id}`}
            aria-pressed={journey.discoveryMode === id}
            onPointerEnter={event => { if (event.pointerType === 'mouse') setPreviewMode(id) }}
            onPointerLeave={() => setPreviewMode(null)}
            onFocus={event => { if (event.currentTarget.matches(':focus-visible')) setPreviewMode(id) }}
            onBlur={() => setPreviewMode(null)}
            onClick={() => choose(id)}>
            <span>{label}</span>
            <svg viewBox="0 0 32 12" fill="none" aria-hidden="true"><path d="M1 6h28m-5-5 5 5-5 5" /></svg>
          </button>)}
        </div>
      </div>
    </div>

    <UnitFinder active={finderOpen} selected={finderPath} onSelect={setFinderPath} onPreview={setFinderPreview} onBack={backToResidences} />

    <div className="residence-architecture" data-highlight={finderOpen ? '' : highlight}>
      {towers.map(tower => <button key={tower} className={`residence-tower residence-tower--${tower.toLowerCase()}`}
        aria-label={`Tower ${tower}, explore residences`}
        aria-pressed={journey.activeTower === tower}
        onPointerEnter={event => { if (event.pointerType === 'mouse') setPreviewTower(tower) }}
        onPointerLeave={() => setPreviewTower(null)}
        onFocus={event => { if (event.currentTarget.matches(':focus-visible')) setPreviewTower(tower) }}
        onBlur={() => setPreviewTower(null)}
        onClick={() => { if (!finderOpen) choose('visual', tower) }}
        disabled={finderOpen}>
        <img src="/residences/tower-cutout.png" alt="" draggable="false" />
        <span className="tower-callout" aria-hidden="true">
          <span className="tower-callout-label">Tower {tower}</span>
          <i className="tower-callout-line" />
          <span className="tower-callout-hint">Explore residences <b>⟶</b></span>
        </span>
      </button>)}
    </div>
    <div className="finder-floor-lines" aria-hidden="true"><i /><i /><i /></div>

    <aside className="residence-manifesto" aria-hidden="true"><span>Spaces</span><span>People</span><span>Possibilities</span><span>A higher you</span></aside>
    <footer className="residence-footer">
      <p>A higher way of living</p>
      <small>Mumbai rising higher</small>
    </footer>
    {/* The later stages are not built. Rather than push the visitor to an
        empty screen, the chosen path is held and announced quietly here. */}
    <p className="residence-status visually-hidden" role="status">{journey.residenceStage === 'entry' ? '' : journey.residenceStage === 'tower-selection'
      ? `Visual select${journey.activeTower ? ` — Tower ${journey.activeTower}` : ''} — tower selection opens next`
      : ''}</p>
  </section>
}

function ResidenceBackground() {
  return <div className="residence-background" aria-hidden="true">
    <div className="residence-city" />
    <div className="residence-shade" />
  </div>
}
