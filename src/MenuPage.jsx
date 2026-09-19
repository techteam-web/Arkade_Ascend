import { useRef, useState } from 'react'
import GoldRibbonBackground from './GoldRibbon.jsx'

const items = [
  ['Home', 'A higher beginning'],
  ['Residences', 'Explore your space'],
  ['360° Experience', 'A new perspective'],
  ['Location', 'Closer to everything'],
  ['Amenities', 'Elevate your everyday'],
  ['Gallery', 'See the possibilities'],
  ['Enquire', 'Begin a conversation'],
]

export default function MenuPage({ onClose, onNavigate, quality }) {
  const [active, setActive] = useState(1)
  const dialog = useRef(null)
  const handleKey = (event) => {
    if (event.key === 'Escape') onClose()
    if (event.key !== 'Tab') return
    const controls = [...dialog.current.querySelectorAll('button')]
    const first = controls[0]
    const last = controls[controls.length - 1]
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }
  return <section className="menu-page" ref={dialog} role="dialog" aria-modal="true" aria-label="Explore Arkade Ascend" onKeyDown={handleKey}>
    <div className="menu-art" aria-hidden="true">
      <div className="menu-skyline" />
      <div className="menu-window-lines" />
      <GoldRibbonBackground composition="menu" quality={quality} bgColor="#28150e" backdrop="transparent" />
      <div className="menu-art-shade" />
    </div>
    <button className="menu-close" onClick={onClose} aria-label="Close menu" autoFocus>
      <span>Close</span><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m3 3 18 18M21 3 3 21" /></svg>
    </button>
    <div className="menu-panel">
      <div className="menu-logo" aria-label="Arkade Ascend, Malad West">
        <span className="menu-logo-brand">Arkade</span>
        <span className="menu-logo-name">Ascend</span>
        <span className="menu-logo-locality">Malad West</span>
      </div>
      <nav className="menu-nav" aria-label="Explore">
        {items.map(([label, hint], index) => <button key={label}
          className={`menu-item${active === index ? ' is-active' : ''}`}
          aria-pressed={active === index}
          onClick={() => { if (index === 0) onNavigate('home'); else if (index === 5) onNavigate('gallery'); else setActive(index) }}>
          <span className="menu-number">{String(index + 1).padStart(2, '0')}</span>
          <span className="menu-label">{label}</span>
          <span className="menu-hint" aria-hidden="true">{hint}</span>
        </button>)}
      </nav>
      <p className="menu-signoff">A higher way of living</p>
    </div>
    <div className="menu-manifesto" aria-hidden="true"><span>Spaces</span><span>People</span><span>Possibilities</span><span>A higher you</span></div>
    <div className="menu-footer">
      <p className="menu-counter" aria-live="polite"><span />{String(active + 1).padStart(2, '0')} / 07</p>
      <p>Mumbai rising higher</p>
    </div>
  </section>
}
