import { forwardRef, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { gsap } from '../app/reveal.js'
import { ArrowIcon } from './Brand.jsx'
import PanoramaViewer from './PanoramaViewer.jsx'
import SheetSwitch from './SheetSwitch.jsx'
import { BACK_HOMES, homeOutlook } from './ViewOverlay.jsx'
import { wing as planWing } from '../content/floorPlans.js'
import {
  activeFilters, area, bounds, emptyFilters, facets, features, featureLabel, filterHomes, floorBands, floorRuns,
  groupByType, isOpen, optionCounts, ordinal, planById, sortGroups, sortHomes, sorts, span,
} from '../content/inventory.js'
import { nearestFloor, wingPanoramas } from '../content/panoramas.js'
import useMediaQuery, { prefersReducedMotion } from '../hooks/useMediaQuery.js'

const MAX_COMPARE = 3
const facetByKey = Object.fromEntries(facets.map(facet => [facet.key, facet]))
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const Icon = ({ d }) => <svg viewBox="0 0 24 24"><path d={d} /></svg>

// Remembered for the session, so coming back from a plan finds the same search.
let remembered = { filters: emptyFilters(), view: 'plans', sort: { plans: 'type', homes: 'floor-asc' }, compare: [], look: 'plan' }
// The comparison as it was when one of its plans was opened (its view, the
// differences switch and where it was scrolled), so the plan's back button
// returns to exactly that.
let compareReturn = null

// Search by unit, after Zenith's finder: facets narrow every home in Wing A;
// results read as plan types (cards) or as single homes (a list);
// up to three plan types compare side by side. `onOpenPlan` receives
// { plan } or { home } and opens the Floor Plans page.
const UnitFinder = forwardRef(function UnitFinder({ reopen = null, onClose, onOpenPlan, onView }, ref) {
  const [filters, setFilters] = useState(remembered.filters)
  const [view, setView] = useState(remembered.view)
  const [sort, setSort] = useState(remembered.sort)
  const [compare, setCompare] = useState(remembered.compare)
  const [look, setLook] = useState(remembered.look)   // plan cards show the drawing, or its whole sheet
  const [comparing, setComparing] = useState(() => reopen === 'compare' && remembered.compare.length > 1 && Boolean(compareReturn))
  const [filtersOpen, setFiltersOpen] = useState(false)    // phones and tablets fold the filters away
  const compareButton = useRef(null)
  // Coming back from a compared plan restores the comparison once; opened again later, it starts afresh.
  const restoring = useRef(reopen === 'compare' ? compareReturn : null)
  const scroller = useRef(null)
  const panelId = useId()
  useEffect(() => { remembered = { filters, view, sort, compare, look } }, [filters, view, sort, compare, look])

  const results = useMemo(() => filterHomes(filters), [filters])
  const groups = useMemo(() => sortGroups(groupByType(results), sort.plans), [results, sort.plans])
  const list = useMemo(() => view === 'homes' ? sortHomes(results, sort.homes) : [], [results, sort.homes, view])
  const active = activeFilters(filters)
  // New results start at the top (of the list, or of the whole column on
  // phones and short screens, where the column scrolls as one).
  useEffect(() => {
    if (!scroller.current) return
    scroller.current.scrollTop = 0
    scroller.current.parentElement.scrollTop = 0
  }, [filters, view])

  const toggle = (key, id) => setFilters(value => ({ ...value, [key]: value[key].includes(id) ? value[key].filter(item => item !== id) : [...value[key], id] }))
  const setRange = (key, range) => setFilters(value => ({ ...value, [key]: range }))
  const reset = () => setFilters(emptyFilters())
  const toggleCompare = id => setCompare(value => value.includes(id) ? value.filter(item => item !== id) : value.length < MAX_COMPARE ? [...value, id] : value)
  const showHomes = id => { setFilters(value => ({ ...value, type: [id] })); setView('homes') }
  const closeCompare = () => { restoring.current = null; setComparing(false); requestAnimationFrame(() => compareButton.current?.focus({ preventScroll: true })) }

  const chipFacet = key => <ChipFacet key={key} facet={facetByKey[key]} filters={filters} onToggle={id => toggle(key, id)} />

  return <div ref={ref} role="region" aria-label="Unit finder" className="absolute inset-0 flex flex-col gap-3">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="eyebrow">02 · Unit finder</p>
        <h2 tabIndex={-1} className="display mt-2 text-[clamp(1.5rem,2.4vw,2.4rem)] text-fg outline-none short:sr-only">Find your residence</h2>
      </div>
      <button type="button" className="btn-icon" onClick={onClose} aria-label="Close unit finder"><Icon d="m5 5 14 14M19 5 5 19" /></button>
    </div>

    <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-3 split:grid-cols-[minmax(15rem,19rem)_minmax(0,1fr)] split:grid-rows-1 split:gap-6 3xl:grid-cols-[minmax(18rem,23rem)_minmax(0,1fr)]">
      <aside aria-label="Filters" className="flex min-h-0 flex-col">
        <div className="flex items-center gap-2 split:hidden">
          <button type="button" className="chip flex items-center gap-2" aria-expanded={filtersOpen} aria-controls={panelId} onClick={() => setFiltersOpen(open => !open)}>
            Filters{active > 0 && <span className="num">· {active}</span>}
            <svg viewBox="0 0 12 12" aria-hidden="true" className={`size-2.5 fill-none stroke-current stroke-[1.4] transition-transform duration-300 ${filtersOpen ? 'rotate-180' : ''}`}><path d="M2.5 4.5 6 8l3.5-3.5" /></svg>
          </button>
          {active > 0 && <button type="button" className="chip border-transparent!" onClick={reset}>Reset</button>}
        </div>
        <div id={panelId} className={`glass-panel page-scroll min-h-0 rounded-sm px-4 py-4 split:flex-1 stack:mt-3 stack:max-h-[44vh] ${filtersOpen ? '' : 'stack:hidden'}`}>
          {chipFacet('configuration')}
          {chipFacet('unit')}
          <RangeFacet label="Floor" names={['Lowest floor', 'Highest floor']} bounds={bounds.floor} value={filters.floor}
            format={n => `Floor ${n}`} onChange={range => setRange('floor', range)}>
            <div role="group" aria-label="Floor bands" className="mt-1 flex flex-wrap gap-1.5">
              {floorBands.map(band => <button key={band.id} type="button" className="chip"
                aria-pressed={filters.floor[0] === band.range[0] && filters.floor[1] === band.range[1]}
                aria-label={`${band.label} floors, ${span(band.range)}`}
                onClick={() => setRange('floor', [...band.range])}>{band.label} <span className="num ml-1 opacity-70">{span(band.range)}</span></button>)}
            </div>
          </RangeFacet>
          <RangeFacet label="RERA area" unit="sq.ft" names={['Smallest area', 'Largest area']} bounds={bounds.area} step={10} value={filters.area}
            format={area} valueText={n => `${area(n)} square feet`} onChange={range => setRange('area', range)} />
          {chipFacet('feature')}
          <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
            <button type="button" className="chip border-transparent! px-0!" onClick={reset} disabled={!active}>Reset filters</button>
            <span className="text-[0.58rem] uppercase tracking-[0.2em] text-muted">{plural(active, 'filter')} on</span>
          </div>
        </div>
      </aside>

      {/* Laptops pin the toolbar over a scrolling list; phones and short
          screens scroll the whole column, so results get the height. */}
      <div className="@container flex min-h-0 flex-col stack:overflow-y-auto stack:overscroll-contain short:overflow-y-auto short:overscroll-contain">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pb-3">
          <p role="status" className="text-[0.62rem] uppercase tracking-[0.24em] text-muted">
            <span className="num text-fg">{results.length}</span> {results.length === 1 ? 'home' : 'homes'} · <span className="num text-fg">{groups.length}</span> {groups.length === 1 ? 'plan type' : 'plan types'}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {view === 'plans' && <SheetSwitch value={look} onChange={setLook} />}
            <div role="group" aria-label="Show results as" className="flex gap-1 rounded-full border border-line p-1">
              {[['plans', 'Plans'], ['homes', 'Homes']].map(([id, label]) => <button key={id} type="button" className="chip border-transparent!" aria-pressed={view === id} onClick={() => setView(id)}>{label}</button>)}
            </div>
            <label className="flex"><span className="sr-only">Sort</span>
              <select className="select-lux" value={sort[view]} onChange={event => setSort(value => ({ ...value, [view]: event.target.value }))}>
                {sorts[view].map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
          </div>
        </div>

        <div ref={scroller} className="page-scroll -mx-1 min-h-0 flex-1 px-1 pb-2 stack:flex-none stack:overflow-visible short:flex-none short:overflow-visible">
          {!results.length
            ? <div className="grid h-full min-h-40 place-items-center rounded-sm border border-line p-8 text-center">
              <div>
                <p className="text-sm tracking-[0.04em] text-muted">No homes match these filters.</p>
                <button type="button" className="btn-lux mt-4" onClick={reset}>Reset filters</button>
              </div>
            </div>
            : view === 'plans'
              ? <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,15rem),1fr))] gap-4">
                {groups.map(group => <PlanCard key={group.type.id} group={group} look={look} inCompare={compare.includes(group.type.id)}
                  compareFull={compare.length >= MAX_COMPARE} onCompare={() => toggleCompare(group.type.id)}
                  onOpen={() => onOpenPlan({ plan: group.type.id })} onHomes={() => showHomes(group.type.id)}
                  onView={() => onView({ wing: 'A', floor: group.floors[group.floors.length >> 1], unit: group.type.unit })} />)}
              </ul>
              : <HomeList homes={list} onOpen={home => onOpenPlan({ home: home.id })} onView={home => onView({ wing: home.wing, floor: home.floor, unit: home.position })} />}
        </div>

        {compare.length > 0 && <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <p className="eyebrow mr-1">Compare <span className="num">{compare.length}/{MAX_COMPARE}</span></p>
          {compare.map(id => <button key={id} type="button" className="chip" onClick={() => toggleCompare(id)} aria-label={`Remove ${planById(id).label} from compare`}>
            {planById(id).label}<span aria-hidden="true" className="ml-2">×</span>
          </button>)}
          <div className="ml-auto flex gap-2">
            <button type="button" className="chip border-transparent!" onClick={() => setCompare([])}>Clear</button>
            <button ref={compareButton} type="button" className="btn-lux" disabled={compare.length < 2} onClick={() => setComparing(true)}>
              {compare.length < 2 ? 'Pick one more' : 'Compare'}<ArrowIcon />
            </button>
          </div>
        </div>}
        <p className="mt-3 text-[0.58rem] uppercase tracking-[0.26em] text-muted/80">Wing A · from the plan sheets<span className="max-sm:hidden short:hidden"> · Wing B plans to follow</span></p>
      </div>
    </div>

    {comparing && <CompareDialog ids={compare} results={results} look={look} restore={restoring.current} onLook={setLook} onClose={closeCompare}
      onOpen={(plan, state) => { compareReturn = state; onOpenPlan({ plan, from: 'compare' }) }} />}
  </div>
})

export default UnitFinder

// Chips for one facet, each with the number of homes it would show.
function ChipFacet({ facet, filters, onToggle }) {
  const counts = optionCounts(filters, facet)
  const chosen = filters[facet.key]
  const labelId = useId()
  return <div role="group" aria-labelledby={labelId} className="border-t border-line pt-3 pb-4 first:border-t-0 first:pt-0">
    <p id={labelId} className="mb-2 text-[0.6rem] uppercase tracking-[0.3em] text-muted">{facet.label}</p>
    <div className="flex flex-wrap gap-1.5">
      {facet.options.map(option => {
        const on = chosen.includes(option.id)
        const count = counts[option.id] || 0
        return <button key={option.id} type="button" className="chip" aria-pressed={on} disabled={!on && !count}
          aria-label={`${option.name ?? option.label}, ${plural(count, 'home')}`} onClick={() => onToggle(option.id)}>
          {option.label}<span className="num ml-2 opacity-60">{count}</span>
        </button>
      })}
    </div>
  </div>
}

// A two-thumb range. The track is inset by half a thumb, so its gold fill
// meets the thumb centres exactly.
function RangeFacet({ label, unit, names, bounds: [min, max], step = 1, value: [low, high], format, valueText = format, onChange, children }) {
  const labelId = useId()
  const at = n => `calc(1.375rem + (100% - 2.75rem) * ${(n - min) / (max - min)})`
  const middle = (min + max) / 2
  return <div role="group" aria-labelledby={labelId} className="border-t border-line pt-3 pb-4">
    <p id={labelId} className="mb-1 text-[0.6rem] uppercase tracking-[0.3em] text-muted">{label}</p>
    <div className="flex items-baseline justify-between gap-2 text-[0.8rem] text-fg">
      <span className="num">{format(low)}</span>
      {unit && <span className="text-[0.55rem] uppercase tracking-[0.2em] text-muted">{unit}</span>}
      <span className="num">{format(high)}</span>
    </div>
    <div className="relative h-11">
      <span className="absolute inset-x-[1.375rem] top-1/2 h-px bg-line" />
      <span className="absolute top-1/2 h-px bg-gold-500" style={{ left: at(low), right: `calc(100% - ${at(high)})` }} />
      <input type="range" className="range-dual" min={min} max={max} step={step} value={low} aria-label={names[0]} aria-valuetext={valueText(low)}
        style={{ zIndex: low > middle ? 2 : 1 }} onChange={event => onChange([Math.min(Number(event.target.value), high), high])} />
      <input type="range" className="range-dual" min={min} max={max} step={step} value={high} aria-label={names[1]} aria-valuetext={valueText(high)}
        style={{ zIndex: high < middle ? 2 : 1 }} onChange={event => onChange([low, Math.max(Number(event.target.value), low)])} />
    </div>
    {children}
  </div>
}

function PlanCard({ group, look, inCompare, compareFull, onCompare, onOpen, onHomes, onView }) {
  const { type, homes, floors } = group
  return <li className="finder-in">
    <article data-tone="light" className="group flex h-full flex-col overflow-hidden rounded-sm border border-line bg-cream-50 text-fg shadow-[0_24px_48px_-30px_rgba(0,0,0,.7)]">
      <button type="button" onClick={onOpen} aria-label={`Open the ${type.label} plan, ${type.configuration}`}
        className="relative block aspect-[3/2] w-full overflow-hidden bg-cream-100 outline-offset-[-3px]">
        <img src={type[look === 'sheet' ? 'sheet' : 'image'].src} alt="" loading="lazy" decoding="async" draggable="false"
          className="size-full select-none object-contain p-3 transition-[translate] duration-500 ease-silk group-hover:-translate-y-0.5" />
        <span className={`absolute left-2 top-2 rounded-full px-2.5 py-1 text-[0.52rem] font-medium uppercase tracking-[0.18em] ${type.floor ? 'bg-plum-800/85 text-cream-50' : 'bg-gold-500 text-espresso'}`}>
          {type.floor ? <><span className="num">{ordinal(type.floor)}</span> floor only</> : 'Typical floor'}
        </span>
      </button>
      <div className="flex flex-1 flex-col gap-1.5 border-t border-line px-4 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-[1.4rem] uppercase leading-none">Unit <span className="num">{type.unit}</span></h3>
          <span className="text-[0.62rem] font-medium uppercase tracking-[0.18em] text-accent">{type.configuration}</span>
        </div>
        <p className="num text-[0.72rem] text-muted">RERA {area(type.reraArea)} sq.ft · Total {area(type.totalArea)} sq.ft</p>
        <p className="text-[0.58rem] uppercase leading-relaxed tracking-[0.14em] text-muted">
          <span className="num">{homes.length}</span> {homes.length === 1 ? 'home' : 'homes'} · Floor{homes.length === 1 ? '' : 's'} <span className="num">{floorRuns(floors)}</span>
        </p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
          <button type="button" className="chip" aria-pressed={inCompare} disabled={!inCompare && compareFull} onClick={onCompare}
            aria-label={`${inCompare ? 'Remove' : 'Add'} ${type.label} ${inCompare ? 'from' : 'to'} compare`}>{inCompare ? 'Comparing' : 'Compare'}</button>
          <button type="button" className="chip" onClick={onView} aria-label={`See the view from ${type.label}, floor ${group.floors[group.floors.length >> 1]}`}>View</button>
          <button type="button" className="btn-lux bg-transparent! px-4!" onClick={onHomes} aria-label={`See the ${plural(homes.length, 'home')} of ${type.label}`}>Homes<ArrowIcon /></button>
        </div>
      </div>
    </article>
  </li>
}

// Single homes. Wide columns read as a table; narrow ones fold each home
// into two lines (container query on the results column).
function HomeList({ homes, onOpen, onView }) {
  const columns = '@3xl:grid-cols-[6rem_4rem_minmax(0,1fr)_7rem_5rem_minmax(0,1.3fr)_1.75rem]'
  const extras = home => home.features.map(featureLabel).join(', ') || '—'
  return <div>
    <div aria-hidden="true" className={`sticky top-0 z-1 hidden gap-x-4 border-b border-line bg-plum-950/90 py-2 pr-[5.25rem] text-[0.55rem] uppercase tracking-[0.24em] text-muted @3xl:grid ${columns}`}>
      <span>Home</span><span>Floor</span><span>Plan</span><span>RERA area</span><span>Deck</span><span>Features</span><span />
    </div>
    <ul>
      {homes.map(home => <li key={home.id} className="flex items-center gap-3 border-b border-line">
        <button type="button" onClick={() => onOpen(home)}
          aria-label={`Home ${home.id}: Wing ${home.wing}, floor ${home.floor}, Unit ${home.position}, ${home.type.configuration}, ${area(home.type.reraArea)} square feet. Open its plan.`}
          className={`group grid min-h-12 min-w-0 flex-1 grid-cols-[minmax(0,1fr)_1.75rem] items-center gap-x-4 py-2.5 text-left outline-offset-[-2px] transition-colors duration-300 hover:bg-gold-500/8 ${columns}`}>
          <span className="flex flex-col gap-1 @3xl:hidden">
            <span className="text-[0.8rem] text-fg"><span className="num">{home.id}</span><span className="ml-3 text-[0.6rem] uppercase tracking-[0.16em] text-accent">Unit <span className="num">{home.position}</span> · {home.type.configuration}</span></span>
            <span className="text-[0.62rem] uppercase tracking-[0.12em] text-muted">Floor <span className="num">{home.floor}</span> · <span className="num">{area(home.type.reraArea)}</span> sq.ft · {extras(home)}</span>
          </span>
          <span className="num hidden text-[0.85rem] text-fg @3xl:block">{home.id}</span>
          <span className="num hidden text-[0.8rem] text-fg @3xl:block">{home.floor}</span>
          <span className="hidden truncate text-[0.62rem] uppercase tracking-[0.16em] text-accent @3xl:block">Unit <span className="num">{home.position}</span> · {home.type.configuration}</span>
          <span className="hidden text-[0.8rem] text-fg @3xl:block"><span className="num">{area(home.type.reraArea)}</span> <span className="text-[0.6rem] text-muted">sq.ft</span></span>
          <span className="hidden text-[0.8rem] text-fg @3xl:block"><span className="num">{home.type.deck}</span> <span className="text-[0.6rem] text-muted">sq.ft</span></span>
          <span className="hidden truncate text-[0.72rem] text-muted @3xl:block">{extras(home)}</span>
          <ArrowIcon className="h-3 w-7 justify-self-end fill-none stroke-current stroke-[1.1] text-accent transition-[translate] duration-500 group-hover:translate-x-1" />
        </button>
        <button type="button" className="chip w-[4.5rem] shrink-0" onClick={() => onView(home)} aria-label={`See the view from home ${home.id}, floor ${home.floor}`}>View</button>
      </li>)}
    </ul>
  </div>
}

// The comparison's room dimensions tab: every room by its printed name,
// grouped, in the sheets' order. A combined living & dining room answers
// the Living row and is noted on the Dining row. Rooms not listed here
// still show, at the end of the last group.
const roomGroups = [
  ['Living spaces', ['Living', 'Dining', 'Kitchen', 'Foyer', 'Deck', 'Utility']],
  ['Bedrooms', ['M. bedroom', 'C. bedroom', 'A. bedroom', 'Study room', 'Walk-in wardrobe']],
  ['Toilets', ['M. toilet', 'C. toilet', 'A. toilet', 'Toilet', 'Powder toilet']],
]
const COMBINED = 'Living & dining'
// Width × depth as printed (12′0″ × 23′6″), worked out to whole square feet.
const feet = size => [...size.matchAll(/(\d+)′(\d+)″/g)].map(([, ft, inch]) => Number(ft) + Number(inch) / 12)
const roomArea = size => { const [width, depth] = feet(size); return width && depth ? Math.round(width * depth) : null }

function roomRows(types) {
  const listed = new Set([COMBINED, ...roomGroups.flatMap(([, names]) => names)])
  const extra = [...new Set(types.flatMap(type => type.rooms.map(room => room.name)))].filter(name => !listed.has(name))
  const groups = roomGroups.map(([label, names], i) => [label, i === roomGroups.length - 1 ? [...names, ...extra] : names])
  const cell = (type, name) => {
    const room = type.rooms.find(item => item.name === name)
    if (room) return { size: room.size, area: roomArea(room.size) }
    const combined = (name === 'Living' || name === 'Dining') && type.rooms.find(item => item.name === COMBINED)
    if (!combined) return null
    return name === 'Living' ? { size: combined.size, area: roomArea(combined.size), note: 'Living & dining', shared: true } : { note: 'With living', shared: true }
  }
  return groups.map(([label, names]) => [label, names.map(name => {
    const cells = types.map(type => cell(type, name))
    if (!cells.some(item => item && !(item.shared && !item.size))) return null
    // The largest of a room, when at least two plans have it on its own.
    const own = cells.filter(item => item?.area && !item.shared).map(item => item.area)
    const largest = own.length > 1 && Math.max(...own) > Math.min(...own) ? Math.max(...own) : null
    return { name, cells: cells.map(item => item && { ...item, largest: !item.shared && item.area === largest }) }
  }).filter(Boolean)]).filter(([, rows]) => rows.length)
}

// The comparison's details as sections of rows, one cell per plan type:
// areas (the largest marked with how much larger it is), features, then
// every room's size. `same` marks a row that reads alike in every plan.
function compareSections(types) {
  const areaRow = (name, key) => {
    const values = types.map(type => type[key])
    const most = Math.max(...values), least = Math.min(...values)
    return { name, cells: values.map(value => ({ value, gain: most > least && value === most ? most - least : 0 })) }
  }
  const textRow = (name, value) => ({ name, cells: types.map(type => ({ text: String(value(type)) })) })
  const sections = [
    { title: 'Areas', rows: [
      textRow('Configuration', type => type.configuration),
      areaRow('RERA carpet area', 'reraArea'),
      areaRow('Deck area', 'deck'),
      areaRow('Total area', 'totalArea'),
      textRow('Bedrooms', type => type.bedrooms),
      textRow('Toilets', type => type.bathrooms),
    ] },
    { title: 'Features', rows: features.map(feature => ({ name: feature.label, cells: types.map(type => ({ yes: type.features.includes(feature.id) })) })) },
    ...roomRows(types).map(([title, list]) => ({ title, note: 'Width × depth, as printed', rows: list.map(row => ({ name: row.name, cells: row.cells.map(room => ({ room })) })) })),
  ]
  const key = cell => cell.room !== undefined ? `${cell.room?.size ?? ''}|${cell.room?.note ?? ''}` : String(cell.text ?? cell.value ?? cell.yes)
  for (const section of sections) for (const row of section.rows) row.same = new Set(row.cells.map(key)).size === 1
  return sections
}

const Tag = ({ children }) => <span className="whitespace-nowrap rounded-sm bg-gold-500/15 px-1.5 py-0.5 text-[0.52rem] font-medium uppercase tracking-[0.14em] text-gold-800">{children}</span>

function CompareCell({ cell, many }) {
  if (cell.value !== undefined) return <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
    <span className={cell.gain ? 'font-medium text-gold-700' : ''}><span className="num text-[0.95rem]">{area(cell.value)}</span> <span className="text-[0.58rem] uppercase tracking-[0.12em] text-muted">sq.ft</span></span>
    {cell.gain > 0 && <Tag>+<span className="num">{area(cell.gain)}</span> sq.ft</Tag>}
  </span>
  if (cell.yes !== undefined) return cell.yes
    ? <span className="flex items-center gap-2 text-[0.8rem]"><svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 shrink-0 fill-none stroke-gold-700 stroke-[2.2]"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>Yes</span>
    : <span className="text-[0.8rem] text-muted">No</span>
  if (cell.room !== undefined) {
    const room = cell.room
    if (!room) return <span className="text-[0.8rem] text-muted">None</span>
    if (!room.size) return <span className="text-[0.8rem] text-muted">{room.note}</span>
    return <span className="flex flex-col gap-0.5">
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className={`num text-[0.95rem] ${room.largest ? 'font-medium text-gold-700' : ''}`}>{room.size}</span>
        {room.largest && <Tag>{many ? 'Largest' : 'Larger'}</Tag>}
      </span>
      <span className="text-[0.62rem] text-muted">{room.area && <><span className="num">≈ {area(room.area)}</span> sq.ft</>}{room.note && <>{room.area ? ' · ' : ''}{room.note}</>}</span>
    </span>
  }
  return <span className={`text-[0.9rem] ${/^\d/.test(cell.text) ? 'num' : ''}`}>{cell.text}</span>
}

// Laptops read a row across: its name, then each plan. Narrow screens (and
// narrow split windows) put the name above the plans' values, so nothing
// scrolls sideways.
function CompareDetails({ types, sections, matching, onlyDiff, onOpen }) {
  const grid = 'grid gap-x-4 grid-cols-[minmax(7rem,0.8fr)_repeat(var(--plans),minmax(0,1fr))] @max-[36rem]:grid-cols-[repeat(var(--plans),minmax(0,1fr))] @max-[36rem]:gap-x-2.5'
  const many = types.length > 2
  return <div className="finder-in mx-auto w-full max-w-[64rem] @container 3xl:max-w-[76rem]" style={{ '--plans': types.length }}>
    {/* Each plan's card, kept in view while the rows scroll (not on short
        screens, where it would cover most of them). */}
    <div className="sticky top-0 z-1 bg-cream-100 pb-3 pt-1 short:static [box-shadow:0_14px_14px_-12px_var(--color-cream-100)]">
      <div className={`${grid} px-4`}>
        <div className="self-end pb-1 @max-[36rem]:hidden">
          <p className="text-[0.58rem] uppercase leading-relaxed tracking-[0.16em] text-muted">Gold marks the larger area or room</p>
        </div>
        {types.map(type => {
          const found = matching[type.id]
          return <div key={type.id} className="flex min-w-0 flex-col gap-2 rounded-sm border border-line bg-cream-50 p-3 @max-[36rem]:p-2.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
              <span className="font-display text-[clamp(1.1rem,3.4cqi,1.6rem)] uppercase leading-none">Unit <span className="num">{type.unit}</span></span>
              <span className="text-[0.6rem] font-medium uppercase tracking-[0.18em] text-accent">{type.configuration}</span>
            </div>
            <p className="text-[0.58rem] uppercase leading-relaxed tracking-[0.14em] text-muted">
              {type.floor ? <><span className="num">{ordinal(type.floor)}</span> floor only</> : found ? <><span className="num">{found.homes.length}</span> {found.homes.length === 1 ? 'home' : 'homes'} · floors <span className="num">{floorRuns(found.floors)}</span></> : 'No home matches your filters'}
            </p>
            <button type="button" className="chip mt-auto flex w-full items-center justify-center gap-2 px-2!" onClick={() => onOpen(type.id)} aria-label={`View the plan of Unit ${type.unit}, ${type.configuration}`}>
              View plan<ArrowIcon className="h-2.5 w-5 shrink-0 fill-none stroke-current stroke-[1.1] @max-[36rem]:hidden" />
            </button>
          </div>
        })}
      </div>
    </div>

    <div className="flex flex-col gap-4 pb-2">
      {sections.map(section => {
        const rows = onlyDiff ? section.rows.filter(row => !row.same) : section.rows
        const id = `compare-${section.title.toLowerCase().replace(/\W+/g, '-')}`
        return <div key={section.title} className="glass-panel rounded-sm p-1 pb-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-3 pb-2 pt-3">
            <h3 id={id} className="eyebrow">{section.title}</h3>
            {section.note && <p className="text-[0.58rem] uppercase tracking-[0.14em] text-muted">{section.note}</p>}
          </div>
          {rows.length
            ? <div role="table" aria-labelledby={id}>
              <div role="row" className="sr-only">
                <span role="columnheader">Detail</span>
                {types.map(type => <span key={type.id} role="columnheader">Unit {type.unit}, {type.configuration}</span>)}
              </div>
              {rows.map(row => <div key={row.name} role="row" className={`${grid} items-center gap-y-1.5 rounded-sm px-3 py-2.5 odd:bg-plum-700/[0.05]`}>
                <span role="rowheader" className="text-[0.62rem] font-medium uppercase leading-snug tracking-[0.14em] text-fg/80 @max-[36rem]:col-span-full">{row.name}</span>
                {row.cells.map((cell, i) => <span key={types[i].id} role="cell" className="min-w-0"><CompareCell cell={cell} many={many} /></span>)}
              </div>)}
            </div>
            : <p className="px-3 pb-2 text-[0.72rem] text-muted">The same in every plan.</p>}
        </div>
      })}
      <p className="px-1 text-[0.58rem] leading-relaxed tracking-[0.06em] text-muted">
        Room sizes as printed on the plan sheets, width × depth. Room areas are worked out from those sizes and are indicative. A room is marked larger only where two or more plans have it on its own.
      </p>
    </div>
  </div>
}

// The homes' views side by side: the drone photograph taken at the height of
// one floor (chosen here, one of the open floors that were flown), turned to
// each home's outlook and kept within it, as in the view from a plan. All the
// homes of a floor share one photograph, so the comparison is fair. A plan of
// one floor only (Unit 05 on the 7th) shows the height nearest its own floor.
// Laptops and landscape screens set the views side by side, each as tall as
// the sheet; portrait screens show one at a time, chosen by unit, so a drag
// on the picture is never mistaken for a scroll of the page.
function CompareViews({ types }) {
  const flights = wingPanoramas[planWing]
  const offered = flights.filter(flight => isOpen(flight.floor))
  const [floor, setFloor] = useState(() => offered[offered.length >> 1]?.floor ?? flights[0].floor)
  const [sides, setSides] = useState(() => Object.fromEntries(types.map(type => [type.id, 'front'])))
  const [chosen, setChosen] = useState(types[0].id)
  const single = useMediaQuery('(max-width: 63.999rem) and (min-height: 34.001rem)')   // the stack layout
  const viewers = useRef({})
  const heightOf = type => type.floor ? nearestFloor(planWing, type.floor) : floor
  // Front and back turn the view in place, as the view from a plan does.
  const turn = (type, side) => {
    setSides(value => ({ ...value, [type.id]: side }))
    const outlook = homeOutlook(type.unit, side)
    viewers.current[type.id]?.focus(outlook.start, outlook.lock)
  }
  const shown = single ? types.filter(type => type.id === chosen) : types

  return <div className="finder-in flex min-h-full flex-col gap-3 split:h-full">
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
      <div role="group" aria-label="Height of the views" className="flex flex-wrap items-center gap-1.5">
        <p className="eyebrow mr-2">At the height of floor</p>
        {offered.map(flight => <button key={flight.floor} type="button" className="chip num min-w-11 px-3!" aria-pressed={floor === flight.floor}
          aria-label={`Floor ${flight.floor}`} onClick={() => setFloor(flight.floor)}>{flight.floor}</button>)}
      </div>
      {single && types.length > 1 && <div role="group" aria-label="Unit to show" className="flex flex-wrap gap-1.5">
        {types.map(type => <button key={type.id} type="button" className="chip" aria-pressed={chosen === type.id} onClick={() => setChosen(type.id)}>
          Unit <span className="num ml-1">{type.unit}</span>
        </button>)}
      </div>}
    </div>

    <ul style={{ '--plans': shown.length }} className="grid min-h-0 flex-1 gap-[clamp(0.75rem,1.6vw,1.75rem)] split:grid-cols-[repeat(var(--plans),minmax(0,1fr))]">
      {shown.map(type => {
        const side = sides[type.id]
        const outlook = homeOutlook(type.unit, side)
        const height = heightOf(type)
        const flight = flights.find(item => item.floor === height)
        return <li key={type.id} className="flex min-h-0 min-w-0 flex-col gap-2.5">
          <div data-own-gesture className="relative min-h-[15rem] flex-1 overflow-hidden rounded-sm border border-line bg-plum-950 short:min-h-[9rem] stack:aspect-[4/3] stack:min-h-0 stack:flex-none">
            <PanoramaViewer key={type.id} ref={handle => { viewers.current[type.id] = handle }} className="absolute inset-0"
              scenes={flights} active={String(height)} start={outlook.start} lock={outlook.lock} spinning={false}
              label={`Aerial photograph from Wing ${planWing} at the height of floor ${height}, facing the ${side} outlook of Unit ${type.unit}. Drag to look around.`} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="font-display text-[1.35rem] uppercase leading-none">Unit <span className="num">{type.unit}</span></span>
              <span className="text-[0.6rem] font-medium uppercase tracking-[0.18em] text-accent">{type.configuration}</span>
            </div>
            {/* Only the corner homes (01 and 04) have a back view. */}
            {BACK_HOMES.includes(type.unit) && <div role="group" aria-label={`Unit ${type.unit}'s outlook`} className="flex gap-1.5">
              {[['front', 'Front'], ['back', 'Back']].map(([id, label]) =>
                <button key={id} type="button" className="chip min-w-[4.75rem] px-3!" aria-pressed={side === id} onClick={() => turn(type, id)}>{label}</button>)}
            </div>}
          </div>
          <p className="text-[0.56rem] uppercase leading-relaxed tracking-[0.16em] text-muted">
            {BACK_HOMES.includes(type.unit) ? `${side} outlook` : 'Outlook'} · <span className="num">{flight?.height}</span> m up, the height of floor <span className="num">{height}</span>{type.floor && <> · <span className="num">{ordinal(type.floor)}</span> floor plan</>}{!outlook.manual && ' · angle indicative'}
          </p>
        </li>
      })}
    </ul>
    <p className="text-[0.56rem] leading-relaxed tracking-[0.06em] text-muted">
      Aerial photographs of the site taken at the height of the chosen floor, turned to each home's outlook. They are not the view from the home itself; views from each residence vary.
    </p>
  </div>
}

// Up to three plan types side by side, over the whole presentation. It is
// portalled into the page frame, so the full-screen gate still covers it.
// It opens on the plans alone (client, 16 Oct 2026); "Full detail plan"
// swaps them for the details alone: areas, features and every room's size.
function CompareDialog({ ids, results, look, restore, onLook, onClose, onOpen: openPlan }) {
  const root = useRef(null)
  const sheet = useRef(null)
  const [view, setView] = useState(restore?.view ?? 'plans')
  const [onlyDiff, setOnlyDiff] = useState(restore?.onlyDiff ?? false)   // the details: only the rows where the plans differ
  // Opening a plan remembers this view, so coming back finds it as it was.
  const onOpen = id => openPlan(id, { view, onlyDiff, scroll: sheet.current?.scrollTop ?? 0 })
  useLayoutEffect(() => { if (restore?.scroll && sheet.current) sheet.current.scrollTop = restore.scroll }, [])
  const types = ids.map(planById)
  const matching = Object.fromEntries(groupByType(results).map(group => [group.type.id, group]))
  // Opacity only: a hidden ancestor would take focus away from the close button.
  // Coming back from a plan, the finder under it must not show: the cream
  // ground is there at once (the plan page left on cream) and only the
  // comparison's contents fade in.
  useLayoutEffect(() => {
    root.current.querySelector('[data-close]')?.focus({ preventScroll: true })
    if (prefersReducedMotion()) return
    const context = gsap.context(() => {
      const timeline = gsap.timeline({ defaults: { ease: 'silk' } })
      if (restore) timeline.from('[data-compare-head]', { opacity: 0, duration: 0.6 })
      else timeline.from(root.current, { opacity: 0, duration: 0.5 })
      timeline.from('[data-compare-sheet]', { opacity: 0, y: 16, duration: 0.8 }, 0.1)
    }, root)
    return () => context.revert()
  }, [])
  // Escape closes the comparison only: caught before the finder's own
  // Escape (which closes the finder) and marked as handled.
  useEffect(() => {
    const onKey = event => { if (event.key === 'Escape') { event.preventDefault(); onClose() } }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])
  // Each view starts at its top.
  const show = next => { setView(next); if (sheet.current) sheet.current.scrollTop = 0 }
  const sections = compareSections(types)
  const drawing = type => type[look === 'sheet' ? 'sheet' : 'image']
  const frameRatio = Math.min(...types.map(type => drawing(type).ratio))
  const heading = type => <div className="flex items-baseline justify-between gap-2">
    <span className="font-display text-[1.5rem] uppercase leading-none">Unit <span className="num">{type.unit}</span>{type.floor && <span className="ml-2 align-middle font-sans text-[0.55rem] tracking-[0.16em] text-muted"><span className="num">{ordinal(type.floor)}</span> floor</span>}</span>
    <span className="text-[0.6rem] font-medium uppercase tracking-[0.18em] text-accent">{type.configuration}</span>
  </div>

  return createPortal(<div ref={root} role="dialog" aria-modal="true" aria-label="Compare plan types" data-tone="light"
    className="absolute inset-0 z-70 flex flex-col bg-cream-100 px-(--gutter) pb-[max(clamp(0.75rem,3vh,2rem),var(--credit-space))] text-fg">
    <div data-compare-head className="flex min-h-(--header-h) shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2">
      <p className="eyebrow">Compare · {types.map(type => type.label).join(' · ')}{view === 'details' && ' · Full details'}{view === 'views' && ' · Views'}</p>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
        {view === 'plans'
          ? <>
            <SheetSwitch value={look} onChange={onLook} />
            <button type="button" className="btn-lux whitespace-nowrap bg-transparent!" onClick={() => show('views')}>Compare views<ArrowIcon className="shrink-0" /></button>
            <button type="button" className="btn-lux whitespace-nowrap" onClick={() => show('details')}>Full detail plan<ArrowIcon className="shrink-0" /></button>
          </>
          : <>
            {view === 'details' && <button type="button" className="chip" aria-pressed={onlyDiff} onClick={() => setOnlyDiff(value => !value)}>Differences only</button>}
            <button type="button" className="btn-lux is-back whitespace-nowrap bg-transparent!" onClick={() => show('plans')}>
              <svg viewBox="0 0 32 12" aria-hidden="true"><path d="M31 6H3m5-5-5 5 5 5" /></svg>Unit plans
            </button>
          </>}
        <button type="button" data-close className="btn-icon" onClick={onClose} aria-label="Close comparison"><Icon d="m5 5 14 14M19 5 5 19" /></button>
      </div>
    </div>

    <div ref={sheet} data-compare-sheet className="page-scroll min-h-0 flex-1">
      {view === 'plans'
        // The plans alone, as large as the screen allows (client, 16 Oct 2026
        // and 20 Oct 2026). Laptops and landscape screens set them side by
        // side, each column as tall as the sheet: the drawing, its name and
        // its button scale together so the drawing fills its share. Every
        // plan gets the same box (the shape of the tallest drawing, each
        // drawing fitted inside), so the plans, names and buttons line up.
        // Portrait tablets fit two to a row, phones one, each at full width.
        ? <ul key="plans" style={{ '--plans': types.length, '--ratio': frameRatio }}
          className="finder-in grid gap-[clamp(1rem,2.2vw,2.75rem)] stack:grid-cols-[repeat(auto-fit,minmax(min(100%,22rem),1fr))] stack:content-start split:h-full split:min-h-[18rem] split:grid-cols-[repeat(var(--plans),minmax(0,1fr))]">
          {types.map(type => {
            return <li key={type.id} className="grid min-h-0 min-w-0 place-items-center split:@container-size">
              {/* 6.25rem: the name and the button below the drawing. */}
              <div className="flex w-full flex-col gap-2.5 split:w-[min(100cqw,calc((100cqh-6.25rem)*var(--ratio)))]">
                <button type="button" onClick={() => onOpen(type.id)} aria-label={`Open the ${type.label} plan`} style={{ aspectRatio: frameRatio }}
                  className="relative w-full overflow-hidden rounded-sm border border-line bg-cream-50 shadow-[0_30px_60px_-34px_rgba(61,42,47,.45)] outline-offset-[-3px]">
                  <img src={drawing(type).src} srcSet={drawing(type).srcSet} sizes={`(min-width: 64rem) ${Math.round(96 / types.length)}vw, 100vw`}
                    alt={`${type.label} ${look === 'sheet' ? 'plan sheet' : 'plan'}`} className="absolute inset-0 size-full object-contain p-[3%]" draggable="false" />
                </button>
                {heading(type)}
                <button type="button" className="btn-lux w-full bg-transparent!" onClick={() => onOpen(type.id)}>View plan<ArrowIcon /></button>
              </div>
            </li>
          })}
        </ul>
        // Each home's outlook side by side, from one height.
        : view === 'views' ? <CompareViews key="views" types={types} />
        // The details alone, for talking a visitor through two or three plans:
        // each plan's card stays at the top while the sections scroll under it.
        : <CompareDetails key="details" types={types} sections={sections} matching={matching} onlyDiff={onlyDiff} onOpen={onOpen} />}
    </div>
  </div>, document.querySelector('.page-frame') || document.body)
}
