import { lazy, Suspense, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from '../app/reveal.js'
import { PageHeading } from '../components/PageKit.jsx'
import { locationGroups, origin, places, project } from '../content/project.js'
import { prefersReducedMotion } from '../hooks/useMediaQuery.js'
import BrochureMap from './location/BrochureMap.jsx'

// MapLibre is large, so the live map loads with this page only.
const LiveMap = lazy(() => import('./location/LiveMap.jsx'))

export default function LocationPage() {
  const [group, setGroup] = useState(locationGroups[0].id)
  const [active, setActive] = useState(places.find(place => place.group === locationGroups[0].id).id)
  const [hovered, setHovered] = useState(null)
  const [view, setView] = useState('tilt')   // tilt (3D) | plan (2D) | brochure
  const [liveFailed, setLiveFailed] = useState(false)
  const list = useRef(null)
  const shown = places.filter(place => place.group === group)
  const current = places.find(place => place.id === active)

  const chooseGroup = id => {
    if (id === group) return
    setGroup(id)
    setActive(places.find(place => place.group === id).id)
    setHovered(null)
  }

  // A new group's places rise into the list in turn (the page's own arrival
  // reveals the first group with the rest of the page).
  const firstGroup = useRef(true)
  useLayoutEffect(() => {
    if (firstGroup.current) { firstGroup.current = false; return }
    if (prefersReducedMotion()) return
    const context = gsap.context(() => {
      gsap.from(list.current.children, { autoAlpha: 0, y: 8, duration: 0.55, stagger: 0.05, ease: 'silk' })
    }, list)
    return () => context.revert()
  }, [group])

  const live = view !== 'brochure' && !liveFailed

  return <section data-tone="light" className="page page-scroll flex flex-col gap-6 split:grid split:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] split:gap-x-[4vw] 3xl:grid-cols-[minmax(0,1fr)_minmax(0,32rem)]">
    <div className="flex min-h-0 shrink-0 flex-col gap-4 split:shrink">
      <PageHeading id="location" title="Location" subtitle="Malad West, Mumbai" className="split:hidden" />
      <figure data-reveal="fade" className="relative m-0 min-h-[56vh] flex-1 overflow-hidden rounded-sm border border-line bg-cream-100 split:min-h-0"
        data-own-gesture data-own-keys aria-label={`Map of Malad West showing Arkade Ascend and ${current.name}`}>
        {live
          ? <Suspense fallback={<MapLoading />}>
              <LiveMap origin={origin.lngLat} places={places} group={group} active={active} hovered={hovered} tilted={view !== 'plan'}
                onSelect={id => setActive(id)} onFail={() => setLiveFailed(true)} />
            </Suspense>
          : <BrochureMap origin={origin} place={current} />}

        <div role="group" aria-label="Map view" className="absolute left-3 top-3 z-10 flex rounded-full border border-line bg-cream-50/90 p-0.5 backdrop-blur-sm">
          {[['tilt', '3D'], ['plan', '2D'], ['brochure', 'Brochure map']].map(([id, label]) => {
            const pressed = id === 'brochure' ? !live : live && view === id
            return <button key={id} type="button" aria-pressed={pressed} disabled={id !== 'brochure' && liveFailed} onClick={() => setView(id)}
              className={`min-h-11 min-w-11 rounded-full px-4 text-[0.58rem] font-medium uppercase tracking-[0.2em] transition-colors duration-500 disabled:opacity-40 ${pressed ? 'bg-plum-700 text-ivory' : 'text-plum-700 hover:text-plum-900'}`}>{label}</button>
          })}
        </div>
        {liveFailed && view !== 'brochure' && <figcaption className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-cream-50/90 px-3 py-1.5 text-[0.55rem] uppercase tracking-[0.14em] text-plum-700">
          Live map unavailable offline · showing the brochure map
        </figcaption>}
      </figure>
    </div>

    <aside data-tone="dark" className="relative flex min-h-0 shrink-0 flex-col split:shrink overflow-hidden rounded-sm bg-plum-700 px-[clamp(1.5rem,3vw,3rem)] py-[clamp(1.5rem,4.5vh,3.25rem)] text-ivory">
      <div className="page-scroll -mx-3 min-h-0 flex-1 px-3 py-1">
        <p data-reveal className="eyebrow hidden items-center gap-4 split:flex"><span className="num">09</span><span>Location</span></p>
        <h1 tabIndex={-1} data-reveal="lines" className="mt-4 hidden font-display text-[clamp(1.2rem,min(1.9vw,3.6vh),2rem)] uppercase leading-[1.3] text-gold-400 outline-none split:block">
          {project.cityHeadline.map(line => <span key={line} className="block">{line}</span>)}
        </h1>
        <p className="font-display text-xl uppercase leading-snug text-gold-400 split:hidden">{project.cityHeadline.join(' ')}</p>

        <GroupTabs group={group} onChoose={chooseGroup} />

        <ul ref={list} data-reveal id="location-places" role="tabpanel" aria-labelledby={`location-tab-${group}`} className="mt-3">
          {shown.map(place => <li key={place.id}>
            <PlaceButton place={place} active={active === place.id} onSelect={setActive} onHover={setHovered} />
          </li>)}
        </ul>
        <p data-reveal="fade" className="mt-4 text-[0.55rem] uppercase leading-relaxed tracking-[0.16em] text-ivory/50">
          Indicative locations. Routes by road from OpenStreetMap; distances as per Google Maps.
        </p>
      </div>
    </aside>
  </section>
}

function MapLoading() {
  return <div className="absolute inset-0 grid place-items-center bg-cream-100">
    <span className="text-[0.6rem] uppercase tracking-[0.3em] text-plum-700/60">Loading map</span>
  </div>
}

// Category tabs; a gold pill glides to the chosen one.
function GroupTabs({ group, onChoose }) {
  const bar = useRef(null)
  const pill = useRef(null)
  const tabs = useRef({})

  useLayoutEffect(() => {
    const place = instant => {
      const tab = tabs.current[group]
      if (!tab) return
      const to = { x: tab.offsetLeft, y: tab.offsetTop, width: tab.offsetWidth, height: tab.offsetHeight }
      if (instant || prefersReducedMotion()) gsap.set(pill.current, { ...to, overwrite: true })
      else gsap.to(pill.current, { ...to, duration: 0.6, ease: 'silk', overwrite: true })
    }
    place(!pill.current.dataset.placed)
    pill.current.dataset.placed = 'true'
    // Follow the tabs themselves too: web fonts can change their widths late.
    const resize = new ResizeObserver(() => place(true))
    resize.observe(bar.current)
    Object.values(tabs.current).forEach(tab => tab && resize.observe(tab))
    return () => resize.disconnect()
  }, [group])

  const onKeyDown = event => {
    const ids = locationGroups.map(item => item.id)
    const at = ids.indexOf(group)
    const next = { ArrowRight: at + 1, ArrowDown: at + 1, ArrowLeft: at - 1, ArrowUp: at - 1, Home: 0, End: ids.length - 1 }[event.key]
    if (next === undefined) return
    event.preventDefault()
    const id = ids[(next + ids.length) % ids.length]
    onChoose(id)
    tabs.current[id]?.focus()
  }

  return <div data-reveal className="mt-[clamp(1.25rem,3.5vh,2rem)]">
    <p className="eyebrow text-gold-300!">Connectivity</p>
    <div ref={bar} role="tablist" aria-label="Connectivity" onKeyDown={onKeyDown} className="relative mt-3 flex flex-wrap gap-2">
      <span ref={pill} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 rounded-full bg-gold-400" />
      {locationGroups.map(item => {
        const selected = item.id === group
        return <button key={item.id} ref={element => { tabs.current[item.id] = element }} id={`location-tab-${item.id}`} type="button" role="tab"
          aria-selected={selected} aria-controls="location-places" tabIndex={selected ? 0 : -1} onClick={() => onChoose(item.id)}
          className={`relative min-h-11 rounded-full border px-4 text-[0.6rem] font-medium uppercase tracking-[0.18em] transition-colors duration-500 ${selected ? 'border-transparent text-espresso' : 'border-gold-500/35 text-ivory/80 hover:border-gold-400 hover:text-ivory'}`}>
          {item.label}
        </button>
      })}
    </div>
  </div>
}

function PlaceButton({ place, active, onSelect, onHover }) {
  return <button type="button" aria-pressed={active} onClick={() => onSelect(place.id)} onFocus={() => onSelect(place.id)}
    onPointerEnter={event => { if (event.pointerType === 'mouse') onHover(place.id) }} onPointerLeave={() => onHover(null)}
    className={`group flex min-h-12 w-full items-center justify-between gap-4 rounded-sm border-b border-gold-500/20 pl-1 text-left outline-offset-[-2px] transition-colors duration-500 ${active ? 'text-gold-200' : 'text-ivory/80 hover:text-ivory'}`}>
    <span className="flex items-center gap-3 text-[0.8rem] leading-snug">
      <span className={`size-1.5 shrink-0 rounded-full transition-[background-color,scale] duration-500 ${active ? 'scale-150 bg-gold-300' : 'bg-gold-500/40'}`} />
      {place.name}
    </span>
    {place.distance
      ? <span className="num shrink-0 text-[0.95rem] text-gold-300">{place.distance}</span>
      : <span className="shrink-0 text-[0.55rem] uppercase tracking-[0.2em] text-gold-300/80">Upcoming</span>}
  </button>
}
