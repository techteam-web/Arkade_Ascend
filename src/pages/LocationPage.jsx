import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from '../app/reveal.js'
import { locationGroups, nearby, origin, places, project } from '../content/project.js'
import { prefersReducedMotion } from '../hooks/useMediaQuery.js'
import BrochureMap from './location/BrochureMap.jsx'

// MapLibre is large, so the live map loads with this page only.
const LiveMap = lazy(() => import('./location/LiveMap.jsx'))

export default function LocationPage() {
  const [group, setGroup] = useState(locationGroups[0].id)
  const [active, setActive] = useState(places.find(place => place.group === locationGroups[0].id).id)
  const [hovered, setHovered] = useState(null)
  // Nearby: the brochure's category open in the panel (and on the map).
  const [category, setCategory] = useState(nearby.groups[0].id)
  const [view, setView] = useState('tilt')   // tilt (3D) | plan (2D) | brochure
  const [dusk, setDusk] = useState(false)    // the live map's light: day or dusk
  const [liveFailed, setLiveFailed] = useState(false)
  // What covers the map (header and view switch above, the panel at the
  // side or below), so routes are framed in the part left open.
  const [inset, setInset] = useState({ top: 0, right: 0, bottom: 0, left: 0 })
  const list = useRef(null)
  const section = useRef(null)
  const band = useRef(null)
  const switcher = useRef(null)
  const panel = useRef(null)
  // Nearby's places sit in one map group per category.
  const mapGroup = group === 'nearby' ? `nearby-${category}` : group
  const shown = places.filter(place => place.group === mapGroup)
  const current = places.find(place => place.id === active)

  // Choosing a group flies to its first place; Nearby instead opens on its
  // categories with the tower framed, and a place is flown to once chosen.
  const chooseGroup = id => {
    if (id === group) return
    setGroup(id)
    setActive(id === 'nearby' ? null : places.find(place => place.group === id)?.id ?? null)
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

  // Offsets ignore the entrance's small rises, so this is the settled layout.
  useLayoutEffect(() => {
    const measure = () => {
      const width = section.current.clientWidth, height = section.current.clientHeight
      const p = panel.current, sw = switcher.current
      const top = Math.max(band.current.offsetHeight, sw.offsetTop + sw.offsetHeight) + 8
      const beside = p.offsetLeft > width * 0.4
      const next = {
        top,
        right: beside ? width - p.offsetLeft + 12 : 0,
        bottom: beside ? 0 : height - p.offsetTop + 12,
        left: 0,
      }
      setInset(value => Object.keys(next).every(key => Math.abs(value[key] - next[key]) < 2) ? value : next)
    }
    measure()
    const observer = new ResizeObserver(measure)
    ;[section.current, panel.current, switcher.current].forEach(element => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  const live = view !== 'brochure' && !liveFailed

  return <section ref={section} data-tone="light" aria-label="Location" className="absolute inset-0 overflow-hidden">
    {/* The map fills the screen; everything else floats over it. */}
    <figure data-reveal="fade" className="location-map absolute inset-0 m-0 bg-cream-100" style={{ '--map-inset-bottom': `${inset.bottom}px` }}
      data-own-gesture data-own-keys aria-label={`Map of Malad West showing Arkade Ascend${current ? ` and ${current.name}` : ''}`}>
      {live
        ? <Suspense fallback={<MapLoading />}>
            <LiveMap origin={origin.lngLat} places={places} group={mapGroup} active={active} hovered={hovered} tilted={view !== 'plan'} dusk={dusk} inset={inset}
              onSelect={id => setActive(id)} onFail={() => setLiveFailed(true)} />
          </Suspense>
        : <BrochureMap origin={origin} place={current?.point ? current : null} inset={inset} />}
    </figure>
    {/* A soft cream ground under the header keeps the logo and menu legible. */}
    <div ref={band} aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-(--header-h)">
      <div className="absolute inset-x-0 top-0 h-[calc(100%+2.5rem)] bg-linear-to-b from-cream-50/90 via-cream-50/55 to-transparent" />
    </div>

    {/* Beside the logo in the header row from tablets up; just below the
        header on phones, where the row has no room. */}
    <div ref={switcher} data-reveal role="group" aria-label="Map view"
      className="absolute left-(--gutter) top-[calc(var(--header-h)+0.25rem)] z-10 flex rounded-full border border-line bg-cream-50/90 p-0.5 shadow-[0_8px_24px_-14px_rgba(61,42,47,.45)] backdrop-blur-sm md:left-[calc(var(--gutter)+13rem)] md:top-[calc((var(--header-h)-3.1rem)/2)]">
      {[['tilt', '3D'], ['plan', '2D'], ['brochure', 'Brochure map']].map(([id, label]) => {
        const pressed = id === 'brochure' ? !live : live && view === id
        return <button key={id} type="button" aria-pressed={pressed} disabled={id !== 'brochure' && liveFailed} onClick={() => setView(id)}
          className={`min-h-11 min-w-11 rounded-full px-4 text-[0.58rem] font-medium uppercase tracking-[0.2em] transition-colors duration-500 disabled:opacity-40 ${pressed ? 'bg-plum-700 text-ivory' : 'text-plum-700 hover:text-plum-900'}`}>{label}</button>
      })}
    </div>
    {!live && current && !current.point && <p className="pointer-events-none absolute left-(--gutter) z-10 rounded-full bg-cream-50/90 px-3 py-1.5 text-[0.55rem] uppercase tracking-[0.14em] text-plum-700" style={{ top: inset.top + (liveFailed ? 32 : 0) }}>
      {current.name} is not on the brochure map
    </p>}
    {liveFailed && view !== 'brochure' && <p className="pointer-events-none absolute left-(--gutter) z-10 rounded-full bg-cream-50/90 px-3 py-1.5 text-[0.55rem] uppercase tracking-[0.14em] text-plum-700" style={{ top: inset.top }}>
      Live map unavailable offline · showing the brochure map
    </p>}

    {/* The location panel floats over the map: on the right on laptops and
        landscape phones, as a sheet along the bottom on portrait screens. */}
    <aside ref={panel} data-tone="dark"
      className="absolute z-10 flex flex-col overflow-hidden rounded-md border border-gold-500/20 bg-plum-800/95 text-ivory shadow-[0_32px_80px_-36px_rgba(33,22,26,.8)] lg:bg-plum-800/90 lg:backdrop-blur-md
        split:right-(--gutter) split:top-[calc(var(--header-h)+0.5rem)] split:max-h-[calc(100%-var(--header-h)-0.5rem-clamp(1rem,4vh,2.5rem))] split:w-[clamp(19rem,26vw,27rem)] short:w-[min(19rem,44vw)]
        stack:inset-x-(--gutter) stack:bottom-[clamp(0.75rem,2.5vh,1.5rem)] stack:max-h-[min(50%,calc(100%-var(--header-h)-18rem))]">
      <div className="page-scroll min-h-0 flex-1 px-[clamp(1.25rem,2.2vw,2.25rem)] py-[clamp(1.1rem,3.5vh,2.5rem)] short:py-4">
        {/* The live map's light, day or dusk, beside the page's title. */}
        <div data-reveal className="flex min-h-11 items-center justify-between gap-3">
          <p className="eyebrow flex items-center gap-4"><span className="num">09</span><span>Location</span></p>
          {live && <button type="button" aria-pressed={dusk} onClick={() => setDusk(value => !value)} aria-label="Dusk light"
            className={`flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-[0.6rem] font-medium uppercase tracking-[0.18em] transition-colors duration-500 ${dusk ? 'border-transparent bg-gold-400 text-espresso' : 'border-gold-500/35 text-ivory/80 hover:border-gold-400 hover:text-ivory'}`}>
            <svg viewBox="0 0 20 20" aria-hidden="true" className="size-3.5 fill-none stroke-current" strokeWidth="1.4"><path d="M4 13a6 6 0 0 1 12 0M2 13h16M10 3.5v2M4.2 6.2l1.4 1.4M15.8 6.2l-1.4 1.4M6 16h8" /></svg>
            Dusk
          </button>}
        </div>
        {/* The brochure's line; on phones and short screens the map takes priority. */}
        <h1 tabIndex={-1} data-reveal="lines" className="mt-3 font-display text-[clamp(1.1rem,min(1.55vw,3.2vh),1.85rem)] uppercase leading-[1.3] text-gold-400 outline-none max-sm:sr-only short:sr-only">
          {project.cityHeadline.map(line => <span key={line} className="block">{line}</span>)}
        </h1>

        <GroupTabs group={group} onChoose={chooseGroup} />

        {group === 'nearby'
          ? <div ref={list} id="location-places" role="tabpanel" aria-labelledby={`location-tab-${group}`} className="mt-3">
            <p className="font-display text-[clamp(0.95rem,1.2vw,1.2rem)] uppercase leading-snug text-gold-300">{nearby.headline}</p>
            <NearbyCategories open={category} onOpen={setCategory} active={active} onSelect={setActive} onHover={setHovered} />
          </div>
          : <ul ref={list} data-reveal id="location-places" role="tabpanel" aria-labelledby={`location-tab-${group}`} className="mt-2">
            {shown.map(place => <li key={place.id}>
              <PlaceButton place={place} active={active === place.id} onSelect={setActive} onHover={setHovered} />
            </li>)}
          </ul>}
        <p data-reveal="fade" className="mt-3 text-[0.52rem] uppercase leading-relaxed tracking-[0.16em] text-ivory/50">
          {group === 'nearby' ? 'Places as listed in the brochure. Indicative locations from OpenStreetMap and published addresses; distances by road, approximate.' : 'Indicative locations. Routes by road from OpenStreetMap; distances as per Google Maps.'}
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
    // On phones the row scrolls: bring the chosen tab to its middle.
    const row = bar.current, tab = tabs.current[group]
    if (tab && row.scrollWidth > row.clientWidth) row.scrollTo({ left: tab.offsetLeft - (row.clientWidth - tab.offsetWidth) / 2, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
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

  return <div data-reveal className="mt-[clamp(1rem,3vh,1.75rem)] max-sm:mt-3 short:mt-3">
    <p className="eyebrow text-gold-300!">Connectivity</p>
    {/* Phones keep the tabs on one row that scrolls sideways. */}
    <div ref={bar} role="tablist" aria-label="Connectivity" onKeyDown={onKeyDown}
      className="relative mt-3 flex flex-wrap gap-2 max-sm:-mx-1 max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:px-1 max-sm:[scrollbar-width:none]">
      <span ref={pill} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 rounded-full bg-gold-400" />
      {locationGroups.map(item => {
        const selected = item.id === group
        return <button key={item.id} ref={element => { tabs.current[item.id] = element }} id={`location-tab-${item.id}`} type="button" role="tab"
          aria-selected={selected} aria-controls="location-places" tabIndex={selected ? 0 : -1} onClick={() => onChoose(item.id)}
          className={`relative min-h-11 shrink-0 rounded-full border px-4 text-[0.6rem] font-medium uppercase tracking-[0.18em] transition-colors duration-500 ${selected ? 'border-transparent text-espresso' : 'border-gold-500/35 text-ivory/80 hover:border-gold-400 hover:text-ivory'}`}>
          {item.label}
        </button>
      })}
    </div>
  </div>
}

// Nearby: the brochure's categories. Pointing at one (or clicking or
// tapping it, for touch and keyboard) opens its places beneath it and shows
// them on the map; choosing a place flies there as on the other tabs. A short
// delay keeps a pointer passing over other categories from opening them.
function NearbyCategories({ open, onOpen, active, onSelect, onHover }) {
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])
  const hover = id => { clearTimeout(timer.current); timer.current = setTimeout(() => onOpen(id), 140) }
  return <div className="mt-3">
    {nearby.groups.map(item => {
      const expanded = item.id === open
      const items = places.filter(place => place.group === `nearby-${item.id}`)
      return <div key={item.id} className="border-b border-gold-500/20"
        onPointerEnter={event => { if (event.pointerType === 'mouse') hover(item.id) }}
        onPointerLeave={() => clearTimeout(timer.current)}>
        <button type="button" aria-expanded={expanded} aria-controls={`nearby-${item.id}`} onClick={() => { clearTimeout(timer.current); onOpen(item.id) }}
          className={`group flex min-h-11 w-full items-center justify-between gap-3 text-left transition-colors duration-500 ${expanded ? 'text-gold-200' : 'text-ivory/80 hover:text-ivory'}`}>
          <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em]">{item.label}</span>
          <span className="flex shrink-0 items-center gap-2 text-gold-300/80">
            <span className="num text-[0.7rem]">{items.length}</span>
            <svg viewBox="0 0 20 20" aria-hidden="true" className={`size-3 fill-none stroke-current transition-[rotate] duration-500 ${expanded ? 'rotate-180' : ''}`} strokeWidth="1.5"><path d="m5 8 5 5 5-5" /></svg>
          </span>
        </button>
        {/* Opens to its full height smoothly (grid rows from 0fr to 1fr). */}
        <div id={`nearby-${item.id}`} inert={expanded ? undefined : ''} className={`grid transition-[grid-template-rows,opacity] duration-500 ease-silk ${expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
          <ul className="min-h-0 overflow-hidden pl-3">
            {items.map(place => <li key={place.id}>
              <PlaceButton place={place} active={active === place.id} onSelect={onSelect} onHover={onHover} />
            </li>)}
          </ul>
        </div>
      </div>
    })}
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
