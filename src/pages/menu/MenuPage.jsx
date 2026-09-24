import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import GoldRibbonBackground from '../../scenes/gold-ribbon/GoldRibbonBackground.jsx'

export const menuItems = [
  { id: 'home', label: 'Home', hint: ['Return', 'to', 'Ascend'] },
  { id: 'tower', label: 'The Tower', hint: ['Explore', 'the', 'architecture'] },
  { id: 'residences', label: 'Residences', hint: ['Find', 'your', 'residence'] },
  { id: 'location', label: 'Location', hint: ['Discover', 'the', 'neighbourhood'] },
  { id: 'amenities', label: 'Amenities', hint: ['Life', 'beyond', 'home'] },
  { id: 'gallery', label: 'Gallery', hint: ['Curated', 'visions', 'of Ascend'] },
  { id: 'enquire', label: 'Enquire', hint: ['Make Ascend', 'your', 'address'] },
]

export default function MenuPage({ onClose, onNavigate, quality, sharedScene = false, open = true, preview }) {
  const active = 2
  const [hovered, setHovered] = useState(null)
  const [focused, setFocused] = useState(null)
  const localPreview = useRef({ outward: 0, flat: 0, energy: 0, shift: 0 })
  const scenePreview = preview || localPreview
  const highlighted = open ? hovered ?? focused : null
  const current = highlighted ?? active
  const dialog = useRef(null)
  useEffect(() => { if (!open) { setHovered(null); setFocused(null) } }, [open])
  useEffect(() => {
    const id = highlighted === null ? null : menuItems[highlighted].id
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const tween = gsap.to(scenePreview.current, {
      outward: !reduced && id === 'tower' ? .24 : 0,
      flat: !reduced && id === 'residences' ? .045 : 0,
      energy: !reduced && id === 'tower' ? .12 : 0,
      shift: !reduced && id ? (highlighted - 3) * .018 : 0,
      duration: reduced ? 0 : .4, ease: 'power3.out', overwrite: true,
    })
    return () => tween.kill()
  }, [highlighted, scenePreview])
  useEffect(() => () => {
    gsap.killTweensOf(scenePreview.current)
    Object.assign(scenePreview.current, { outward: 0, flat: 0, energy: 0, shift: 0 })
  }, [scenePreview])
  const handleKey = (event) => {
    if (event.key === 'Escape') onClose()
    if (event.key !== 'Tab') return
    const controls = [...dialog.current.querySelectorAll('button')]
    const first = controls[0]
    const last = controls[controls.length - 1]
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }
  return <section className={`menu-page${sharedScene ? ' menu-page--cinematic' : ''}`} ref={dialog} role="dialog" aria-modal={open ? 'true' : undefined} aria-hidden={!open} inert={open ? undefined : ''} aria-label="Explore Arkade Ascend" data-preview={highlighted === null ? '' : menuItems[highlighted].id} onKeyDown={handleKey}>
    <div className="menu-art" aria-hidden="true">
      <div className="menu-skyline" />
      <div className="menu-window-lines" />
      {!sharedScene && <GoldRibbonBackground composition="menu" preview={scenePreview} quality={quality} bgColor="#28150e" backdrop="transparent" />}
      <div className="menu-art-shade" />
    </div>
    <button className="menu-close" onClick={onClose} aria-label="Close menu" autoFocus={!sharedScene}>
      <span>Close</span><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m3 3 18 18M21 3 3 21" /></svg>
    </button>
    <div className="menu-panel">
      <div className="menu-logo" aria-label="Arkade Ascend, Malad West">
        <span className="menu-logo-brand">Arkade</span>
        <span className="menu-logo-name">Ascend</span>
        <span className="menu-logo-locality">Malad West</span>
      </div>
      <nav className="menu-nav" aria-label="Explore" onPointerLeave={() => setHovered(null)}>
        {menuItems.map(({ id, label, hint }, index) => <button key={id} id={`menu-${id}`} data-route={id}
          className={`menu-item${active === index ? ' is-active' : ''}${highlighted === index ? ' is-previewed' : ''}`}
          aria-current={active === index ? 'page' : undefined}
          onPointerEnter={event => { if (event.pointerType === 'mouse' || event.pointerType === 'pen') setHovered(index) }}
          onPointerLeave={() => setHovered(null)}
          onFocus={event => { if (event.currentTarget.matches(':focus-visible')) setFocused(index) }} onBlur={() => setFocused(null)}
          onClick={() => onNavigate(id)}>
          <span className="menu-number">{String(index + 1).padStart(2, '0')}</span>
          <span className="menu-label">{label}</span>
          <span className="menu-hint" aria-hidden="true">{hint.map(line => <span key={line}>{line}</span>)}</span>
          <span className="menu-divider" aria-hidden="true" />
        </button>)}
      </nav>
      <p className="menu-signoff">A higher way of living</p>
    </div>
    <div className="menu-manifesto" aria-hidden="true"><span>Spaces</span><span>People</span><span>Possibilities</span><span>A higher you</span></div>
    <div className="menu-footer">
      <p className="menu-counter" aria-live="polite"><span />{String(current + 1).padStart(2, '0')} / 07</p>
      <p>Mumbai rising higher</p>
    </div>
  </section>
}
