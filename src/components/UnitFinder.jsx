import { forwardRef, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { gsap } from '../app/reveal.js'
import { ArrowIcon } from './Brand.jsx'
import {
  activeFilters, area, bounds, emptyFilters, facets, features, featureLabel, filterHomes, floorBands, floorRuns,
  groupByType, optionCounts, ordinal, planById, sortGroups, sortHomes, sorts, span,
} from '../content/inventory.js'
import { prefersReducedMotion } from '../hooks/useMediaQuery.js'

const MAX_COMPARE = 3
const facetByKey = Object.fromEntries(facets.map(facet => [facet.key, facet]))
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const Icon = ({ d }) => <svg viewBox="0 0 24 24"><path d={d} /></svg>

// Remembered for the session, so coming back from a plan finds the same search.
let remembered = { filters: emptyFilters(), view: 'plans', sort: { plans: 'type', homes: 'floor-asc' }, compare: [] }

// Search by unit, after Zenith's finder: facets narrow every home in Wing A;
// results read as plan types (cards) or as single homes (a list);
// up to three plan types compare side by side. `onOpenPlan` receives
// { plan } or { home } and opens the Floor Plans page.
const UnitFinder = forwardRef(function UnitFinder({ onClose, onOpenPlan, onView }, ref) {
  const [filters, setFilters] = useState(remembered.filters)
  const [view, setView] = useState(remembered.view)
  const [sort, setSort] = useState(remembered.sort)
  const [compare, setCompare] = useState(remembered.compare)
  const [comparing, setComparing] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)    // phones and tablets fold the filters away
  const compareButton = useRef(null)
  const scroller = useRef(null)
  const panelId = useId()
  useEffect(() => { remembered = { filters, view, sort, compare } }, [filters, view, sort, compare])

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
  const closeCompare = () => { setComparing(false); requestAnimationFrame(() => compareButton.current?.focus({ preventScroll: true })) }

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
                {groups.map(group => <PlanCard key={group.type.id} group={group} inCompare={compare.includes(group.type.id)}
                  compareFull={compare.length >= MAX_COMPARE} onCompare={() => toggleCompare(group.type.id)}
                  onOpen={() => onOpenPlan({ plan: group.type.id })} onHomes={() => showHomes(group.type.id)}
                  onView={() => onView({ wing: 'A', floor: group.floors[group.floors.length >> 1] })} />)}
              </ul>
              : <HomeList homes={list} onOpen={home => onOpenPlan({ home: home.id })} onView={home => onView({ wing: home.wing, floor: home.floor })} />}
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

    {comparing && <CompareDialog ids={compare} results={results} onClose={closeCompare} onOpen={plan => onOpenPlan({ plan })} />}
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

function PlanCard({ group, inCompare, compareFull, onCompare, onOpen, onHomes, onView }) {
  const { type, homes, floors } = group
  return <li className="finder-in">
    <article data-tone="light" className="group flex h-full flex-col overflow-hidden rounded-sm border border-line bg-cream-50 text-fg shadow-[0_24px_48px_-30px_rgba(0,0,0,.7)]">
      <button type="button" onClick={onOpen} aria-label={`Open the ${type.label} plan, ${type.configuration}`}
        className="relative block aspect-[3/2] w-full overflow-hidden bg-cream-100 outline-offset-[-3px]">
        <img src={type.image.src} alt="" loading="lazy" decoding="async" draggable="false"
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

// Up to three plan types side by side, over the whole presentation. It is
// portalled into the page frame, so the full-screen gate still covers it.
function CompareDialog({ ids, results, onClose, onOpen }) {
  const root = useRef(null)
  const types = ids.map(planById)
  const matching = Object.fromEntries(groupByType(results).map(group => [group.type.id, group]))
  // Opacity only: a hidden ancestor would take focus away from the close button.
  useLayoutEffect(() => {
    root.current.querySelector('[data-close]')?.focus({ preventScroll: true })
    if (prefersReducedMotion()) return
    const context = gsap.context(() => {
      gsap.timeline({ defaults: { ease: 'silk' } })
        .from(root.current, { opacity: 0, duration: 0.5 })
        .from('[data-compare-sheet]', { opacity: 0, y: 16, duration: 0.8 }, 0.1)
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
  const rows = [
    ['Configuration', type => type.configuration],
    ['RERA carpet area', type => `${area(type.reraArea)} sq.ft`],
    ['Deck area', type => `${area(type.deck)} sq.ft`],
    ['Total area', type => `${area(type.totalArea)} sq.ft`],
    ['Bedrooms', type => type.bedrooms],
    ['Toilets', type => type.bathrooms],
    ...features.map(feature => [feature.label, type => type.features.includes(feature.id) ? 'Yes' : '—']),
    ['Homes matching your filters', type => matching[type.id]?.homes.length ?? 0],
    ['Floors', type => matching[type.id] ? floorRuns(matching[type.id].floors) : '—'],
  ]

  return createPortal(<div ref={root} role="dialog" aria-modal="true" aria-label="Compare plan types" data-tone="light"
    className="absolute inset-0 z-70 flex flex-col bg-cream-100 px-(--gutter) pb-[clamp(0.75rem,3vh,2rem)] text-fg">
    <div className="flex h-(--header-h) shrink-0 items-center justify-between gap-4">
      <p className="eyebrow">Compare · {types.map(type => type.label).join(' · ')}</p>
      <button type="button" data-close className="btn-icon" onClick={onClose} aria-label="Close comparison"><Icon d="m5 5 14 14M19 5 5 19" /></button>
    </div>
    <div data-compare-sheet className="page-scroll min-h-0 flex-1">
      <div className="overflow-x-auto pb-2" data-own-gesture>
        <table className="w-full min-w-[36rem] border-collapse text-left">
          <thead>
            <tr>
              <th scope="col" className="w-[24%]"><span className="sr-only">Detail</span></th>
              {types.map(type => <th key={type.id} scope="col" className="px-3 pb-4 align-bottom font-normal">
                <div className="overflow-hidden rounded-sm border border-line bg-cream-50">
                  <img src={type.image.src} alt="" className="aspect-[3/2] w-full object-contain p-2" draggable="false" />
                </div>
                <div className="mt-3 flex items-baseline justify-between gap-2">
                  <span className="font-display text-[1.5rem] uppercase leading-none">Unit <span className="num">{type.unit}</span>{type.floor && <span className="ml-2 align-middle font-sans text-[0.55rem] tracking-[0.16em] text-muted"><span className="num">{ordinal(type.floor)}</span> floor</span>}</span>
                  <span className="text-[0.6rem] font-medium uppercase tracking-[0.18em] text-accent">{type.configuration}</span>
                </div>
                <button type="button" className="btn-lux mt-3 w-full bg-transparent!" onClick={() => onOpen(type.id)}>View plan<ArrowIcon /></button>
              </th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, value]) => <tr key={label} className="border-t border-line">
              <th scope="row" className="py-2.5 pr-4 align-top text-[0.6rem] font-medium uppercase leading-relaxed tracking-[0.2em] text-muted">{label}</th>
              {types.map(type => <td key={type.id} className="num px-3 py-2.5 align-top text-[0.82rem] text-fg">{value(type)}</td>)}
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>
  </div>, document.querySelector('.page-frame') || document.body)
}
