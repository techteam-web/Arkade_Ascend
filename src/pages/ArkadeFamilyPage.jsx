import { useLayoutEffect, useRef, useState } from 'react'
import { gsap, countUp } from '../app/reveal.js'
import { pad } from '../app/routes.js'
import { ArkadeMark } from '../components/Brand.jsx'
import { PageHeading } from '../components/PageKit.jsx'
import { landmarks, legacy, portfolio } from '../content/arkadeFamily.js'
import { prefersReducedMotion } from '../hooks/useMediaQuery.js'

// The developer's own story, from the first four pages of its customer
// presentation: the legacy in figures, its projects across Mumbai (the
// deck's title page leads that part) and its landmarks around Ascend.
// Photographs and the map lead each part, framed like the other pages'
// pictures, with the type set over their shaded foot.
const parts = [
  { id: 'legacy', label: 'Our legacy', hint: 'Figures & certifications', Panel: Legacy },
  { id: 'projects', label: 'Our projects', hint: 'Across Mumbai', Panel: Projects },
  { id: 'landmarks', label: 'Landmark projects', hint: 'Malad & Goregaon', Panel: Landmarks },
]

export default function ArkadeFamilyPage() {
  const [index, setIndex] = useState(0)
  const panel = useRef(null)
  const tabs = useRef([])
  const first = useRef(true)
  const { Panel } = parts[index]

  // A new part arrives with its picture settling and its lines rising in
  // turn; the legacy figures count up again.
  useLayoutEffect(() => {
    if (first.current) { first.current = false; return }
    if (prefersReducedMotion()) return
    const context = gsap.context(() => {
      const timeline = gsap.timeline({ defaults: { ease: 'silk' } })
        .from('[data-part-frame]', { autoAlpha: 0, duration: 0.7, ease: 'power2.out' }, 0)
        .from('[data-part-image]', { scale: 1.04, duration: 1.2 }, 0)
        .from('[data-part]', { autoAlpha: 0, y: 10, duration: 0.8, stagger: 0.04 }, 0.15)
      countUp(panel.current, timeline, 0.3)
    }, panel)
    return () => context.revert()
  }, [index])

  const onKeyDown = event => {
    const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }
    let next = null
    if (event.key in keys) next = (index + keys[event.key] + parts.length) % parts.length
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = parts.length - 1
    if (next === null) return
    event.preventDefault()
    setIndex(next)
    tabs.current[next]?.focus()
  }

  return <section className="page page-scroll flex flex-col gap-6 split:grid split:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] split:grid-rows-[minmax(0,1fr)] split:gap-x-[4vw] 3xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
    {/* The Arkade mark, still and faint, under the heading column. */}
    <ArkadeMark className="pointer-events-none absolute bottom-[-12vmin] left-[-9vmin] hidden h-[62vmin] w-auto text-gold-500/[0.05] split:block" />

    <div className="relative flex shrink-0 flex-col gap-6 split:min-h-0 split:justify-center-safe split:gap-[clamp(1.25rem,5vh,3rem)]">
      <PageHeading id="arkade-family" title="Arkade Family" subtitle="The family behind Ascend" />
      {/* Side by side the parts read as an index; stacked, as pills. */}
      <div role="tablist" aria-label="Arkade family" aria-orientation="vertical" onKeyDown={onKeyDown} data-reveal
        className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:none] split:flex-col split:gap-0 split:overflow-visible" data-own-gesture>
        {parts.map((part, i) => {
          const selected = index === i
          return <button key={part.id} ref={element => { tabs.current[i] = element }} role="tab" id={`family-tab-${part.id}`}
            aria-selected={selected} aria-controls="family-panel" tabIndex={selected ? 0 : -1} onClick={() => setIndex(i)}
            className={`group relative flex min-h-11 shrink-0 items-center gap-4 text-left transition-colors duration-500 stack:rounded-full stack:border stack:px-4 split:items-baseline split:border-b split:border-line split:py-[clamp(0.6rem,1.8vh,1rem)] ${selected ? 'stack:border-gold-500 stack:bg-gold-500 stack:text-espresso' : 'stack:border-line'}`}>
            <span className={`num hidden w-6 shrink-0 text-[0.68rem] transition-colors duration-500 split:inline ${selected ? 'text-accent' : 'text-muted'}`}>{pad(i + 1)}</span>
            <span className="min-w-0 split:transition-[translate] split:duration-500 split:ease-silk split:group-hover:translate-x-1 split:group-focus-visible:translate-x-1">
              <span className={`block uppercase stack:text-[0.74rem] stack:font-medium stack:tracking-[0.18em] split:font-display split:text-[clamp(1.1rem,min(1.75vw,3.6vh),1.85rem)] split:leading-tight split:transition-colors split:duration-500 ${selected ? 'split:text-fg' : 'split:text-muted split:group-hover:text-fg'}`}>{part.label}</span>
              <span className={`mt-1 hidden text-[0.58rem] uppercase tracking-[0.22em] transition-colors duration-500 split:block ${selected ? 'text-accent' : 'text-muted/80'}`}>{part.hint}</span>
            </span>
            <span className={`ml-auto hidden h-px shrink-0 self-center bg-accent transition-[width] duration-500 ease-silk split:block ${selected ? 'w-8' : 'w-0'}`} aria-hidden="true" />
          </button>
        })}
      </div>
    </div>

    <div ref={panel} id="family-panel" role="tabpanel" aria-labelledby={`family-tab-${parts[index].id}`}
      className="relative flex shrink-0 flex-col gap-[clamp(1rem,2.6vh,1.75rem)] @container split:min-h-0">
      <Panel number={index + 1} />
    </div>
  </section>
}

// A framed photograph that takes whatever height its part leaves it beside
// the viewport (stacked, it keeps its own proportion). Its foot is shaded
// so the type laid over it always reads.
function Frame({ image, focus, ratio, className = '', children }) {
  return <figure data-reveal="mask" data-part-frame className={`relative m-0 shrink-0 overflow-hidden rounded-sm border border-gold-500/25 bg-plum-950 ${ratio} split:aspect-auto split:min-h-52 split:flex-1 split:shrink ${className}`}>
    <img data-part-image src={image.src} srcSet={image.srcSet} sizes="(min-width: 64rem) 62vw, 100vw" alt={image.alt} draggable="false"
      className="absolute inset-0 size-full select-none object-cover" style={{ objectPosition: focus }} />
    <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-ink/90 via-ink/35 via-45% to-transparent" />
    <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-ink/45 to-transparent to-60%" />
    <p className="pointer-events-none absolute right-3 top-3 text-[0.5rem] uppercase tracking-[0.2em] text-ivory/70 [text-shadow:0_1px_6px_rgba(0,0,0,.5)]">Representative image</p>
    <figcaption className="absolute inset-x-0 bottom-0 px-[clamp(1.1rem,2.6vw,2.5rem)] pb-[clamp(1rem,3vh,2.25rem)] text-ivory">{children}</figcaption>
  </figure>
}

function PartNumber({ number }) {
  return <p data-part className="eyebrow num text-gold-300!">{pad(number)} / {pad(parts.length)}</p>
}

function Legacy({ number }) {
  return <>
    <Frame image={legacy.image} focus="50% 40%" ratio="aspect-[4/3] @lg:aspect-[16/9]">
      <PartNumber number={number} />
      <h2 data-part className="display mt-3 max-w-[18ch] text-[clamp(1.6rem,min(3.4vw,6.4vh),3.8rem)] leading-[1.02]">{legacy.title}</h2>
      <ul data-part className="mt-[clamp(0.8rem,2.4vh,1.4rem)] flex flex-wrap gap-x-8 gap-y-2">
        {legacy.certifications.map(item => <li key={item.name} className="flex items-baseline gap-3">
          <span className="num text-[0.78rem] font-medium tracking-[0.06em] text-gold-200">{item.name}</span>
          <span className="text-[0.55rem] uppercase tracking-[0.18em] text-ivory/75">{item.scope}</span>
        </li>)}
      </ul>
    </Frame>
    {/* The deck's eight figures in two ruled rows, divided as it divides them. */}
    <dl className="grid shrink-0 grid-cols-2 border-y border-line @xl:grid-cols-4">
      {legacy.figures.map((figure, i) => <div key={figure.label} data-reveal data-part
        className={`flex min-w-0 flex-col-reverse justify-end border-line px-[clamp(0.75rem,1.6vw,1.5rem)] py-[clamp(0.8rem,2.4vh,1.4rem)] ${RULES[i]}`}>
        <dt className="mt-2 text-[0.58rem] uppercase leading-snug tracking-[0.16em] text-muted">{figure.label}</dt>
        <dd className="num whitespace-nowrap text-[clamp(1.6rem,min(2.7vw,5vh),3.2rem)] leading-none text-fg">
          {figure.text ?? <span data-count={figure.value} data-decimals={figure.decimals ?? 0}>{figure.value.toLocaleString('en-IN')}</span>}
          {figure.plus && <span className="text-accent">+</span>}
        </dd>
      </div>)}
    </dl>
  </>
}

// Rules between the figures: two columns of four rows, or four of two.
const RULES = [0, 1, 2, 3, 4, 5, 6, 7].map(i => [
  i % 2 ? 'border-l' : i % 4 === 2 ? '@xl:border-l' : '',
  i >= 4 ? 'border-t' : i >= 2 ? 'border-t @xl:border-t-0' : '',
].join(' '))

// Status as the deck shows it, as a small mark beside each project.
const STATUS = {
  completed: { label: 'Completed', mark: 'bg-fg/45', text: 'text-fg/85' },
  ongoing: { label: 'Ongoing', mark: 'bg-gold-400', text: 'text-gold-200' },
  soon: { label: 'Coming soon', mark: 'border border-gold-300/80', text: 'text-muted' },
}
const Mark = ({ status }) => <span className={`mt-[0.5em] size-1.5 shrink-0 rotate-45 ${STATUS[status].mark}`} aria-hidden="true" />

function Projects({ number }) {
  const [regionId, setRegionId] = useState('western')
  const region = portfolio.regions.find(item => item.id === regionId)
  const list = useRef(null)
  const firstList = useRef(true)
  // A new region's localities fade up in place.
  useLayoutEffect(() => {
    if (firstList.current) { firstList.current = false; return }
    if (prefersReducedMotion()) return
    const context = gsap.context(() => gsap.from('[data-locality]', { autoAlpha: 0, y: 8, duration: 0.6, stagger: 0.03, ease: 'silk' }), list)
    return () => context.revert()
  }, [regionId])

  return <div className="grid gap-[clamp(1.25rem,3vw,3rem)] @xl:grid-cols-[minmax(0,1fr)_minmax(13rem,0.78fr)] split:min-h-0 split:flex-1 split:@xl:grid-rows-[minmax(0,1fr)]">
    <div className="flex min-h-0 flex-col gap-[clamp(0.9rem,2.4vh,1.5rem)] @container">
      <div data-reveal data-part>
        <PartNumber number={number} />
        <h2 className="display mt-3 text-[clamp(1.5rem,min(2.8vw,5.6vh),3.2rem)] leading-[1.02] text-fg">{portfolio.title}</h2>
      </div>
      {/* The regions as an index; the chosen one opens its localities below. */}
      <div role="group" aria-label="Region" data-reveal data-part className="grid shrink-0 grid-cols-2 gap-x-6 @md:grid-cols-4 @md:gap-x-4">
        {portfolio.regions.map(item => {
          const chosen = item.id === regionId
          return <button key={item.id} type="button" aria-pressed={chosen} onClick={() => setRegionId(item.id)}
            className="group relative flex min-h-11 flex-col justify-end border-b border-line pb-2 pt-2 text-left">
            <span className={`num text-[0.6rem] tracking-[0.16em] transition-colors duration-500 ${chosen ? 'text-accent' : 'text-muted'}`}>{pad(item.localities.length)} <span className="font-sans uppercase tracking-[0.2em]">{item.localities.length === 1 ? 'locality' : 'localities'}</span></span>
            <span className={`mt-1 font-display text-[clamp(0.95rem,min(1.35vw,2.8vh),1.35rem)] uppercase leading-tight transition-colors duration-500 ${chosen ? 'text-fg' : 'text-muted group-hover:text-fg'}`}>{item.name}</span>
            <span className={`absolute inset-x-0 -bottom-px h-px origin-left bg-accent transition-[scale] duration-500 ease-silk ${chosen ? 'scale-x-100' : 'scale-x-0'}`} aria-hidden="true" />
          </button>
        })}
      </div>
      <div ref={list} data-reveal data-part className="-mx-1 min-h-0 columns-1 gap-8 px-1 @xs:columns-2 @lg:columns-3 split:flex-1 split:overflow-y-auto split:overscroll-contain">
        {region.localities.map(place => <div key={place.name} data-locality className="mb-4 break-inside-avoid">
          <h3 className="text-[0.64rem] font-medium uppercase tracking-[0.2em] text-fg">{place.name}</h3>
          <ul className="mt-1.5 space-y-0.5 text-[clamp(0.74rem,0.82vw,0.84rem)] leading-relaxed">
            {place.projects.map(([name, status = 'completed']) => <li key={name} className={`flex gap-2.5 ${STATUS[status].text}`}>
              <Mark status={status} /><span>{name}{status === 'ongoing' && <span className="visually-hidden">, ongoing</span>}</span>
            </li>)}
            {place.comingSoon && <li className={`flex gap-2.5 ${STATUS.soon.text}`}><Mark status="soon" /><span>Coming soon <span className="num">({place.comingSoon})</span></span></li>}
          </ul>
        </div>)}
      </div>
      <ul data-reveal data-part className="flex shrink-0 flex-wrap gap-x-6 gap-y-2 border-t border-line pt-3 text-[0.58rem] uppercase tracking-[0.18em] text-muted" aria-label="Key">
        {['soon', 'ongoing', 'completed'].map(status => <li key={status} className="flex items-center gap-2.5"><Mark status={status} /><span>{STATUS[status].label}</span></li>)}
      </ul>
    </div>
    <MumbaiMap region={region} />
  </div>
}

// The deck's map of Mumbai, framed, with every locality marked; the chosen
// region's localities are lit and named, the others stay faint. The region
// index is the control, so the pins need no touch targets of their own.
function MumbaiMap({ region }) {
  const [x0, y0, width, height] = portfolio.map.box
  const places = portfolio.regions.flatMap(item => item.localities.map(place => ({ ...place, region: item.id })))
  return <figure data-reveal="fade" data-part-frame className="relative m-0 min-h-[26rem] overflow-hidden rounded-sm border border-gold-500/25 bg-[radial-gradient(ellipse_80%_70%_at_60%_40%,#5a3f45,#2e1f23_75%)] @xl:min-h-0">
    <div className="absolute inset-[clamp(0.75rem,2.4vh,1.75rem)] @container-size">
      <div role="img" aria-label={`Map of Mumbai marking the localities with Arkade projects; shown: ${region.localities.map(place => place.name).join(', ')}`}
        className="absolute left-1/2 top-1/2 w-[min(100cqw,calc(100cqh*0.676))] -translate-x-1/2 -translate-y-1/2 [container-type:inline-size]" style={{ aspectRatio: `${width} / ${height}` }}>
        <img src={portfolio.map.src} alt="" draggable="false" className="absolute inset-0 size-full select-none" />
        {places.map(place => {
          const lit = place.region === region.id
          return <span key={place.name} aria-hidden="true" className="absolute" style={{ left: `${(place.pin[0] - x0) / width * 100}%`, top: `${(place.pin[1] - y0) / height * 100}%` }}>
            <span className={`absolute left-0 top-0 block size-[max(0.4rem,1.5cqi)] -translate-x-1/2 -translate-y-1/2 rotate-45 transition-[background-color,scale] duration-500 ${lit ? 'scale-125 bg-gold-300' : 'bg-gold-500/40'}`} />
            <span className={`absolute whitespace-nowrap font-condensed text-[max(0.55rem,2cqi)] uppercase leading-none tracking-[0.06em] transition-colors duration-500 ${LABEL[place.side]} ${lit ? 'text-ivory' : 'text-ivory/30'}`}>{place.name}</span>
          </span>
        })}
      </div>
    </div>
    {/* The chosen region, named over the map's open top left. */}
    <figcaption className="pointer-events-none absolute left-[clamp(1rem,2.4vw,1.75rem)] top-[clamp(0.9rem,2.4vh,1.5rem)]">
      <p className="eyebrow">Our projects in</p>
      <p key={region.id} className="finder-in mt-2 font-display text-[clamp(1.2rem,min(2vw,4vh),2rem)] uppercase leading-none text-fg">{region.name}</p>
    </figcaption>
    <p className="pointer-events-none absolute bottom-2.5 right-3 text-[0.5rem] uppercase tracking-[0.2em] text-muted/80">Indicative map, not to scale</p>
  </figure>
}
const LABEL = {
  right: 'left-[max(0.45rem,1.6cqi)] top-0 -translate-y-1/2',
  left: 'right-[max(0.45rem,1.6cqi)] top-0 -translate-y-1/2',
  below: 'left-0 top-[max(0.45rem,1.6cqi)] -translate-x-1/2',
  above: 'left-0 bottom-[max(0.45rem,1.6cqi)] -translate-x-1/2',
}

function Landmarks({ number }) {
  return <div className="grid gap-[clamp(1.25rem,3vw,3rem)] @xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] split:min-h-0 split:flex-1 split:@xl:grid-rows-[minmax(0,1fr)]">
    <Frame image={landmarks.image} focus="50% 55%" ratio="aspect-[4/3] @lg:aspect-[16/9]" className="@xl:aspect-auto @xl:h-full">
      <PartNumber number={number} />
      <h2 data-part className="display mt-3 max-w-[16ch] text-[clamp(1.6rem,min(3vw,6vh),3.6rem)] leading-[1.02]">{landmarks.title}</h2>
    </Frame>
    {/* The eight landmarks as an index, each with the Arkade mark. */}
    <ol className="flex min-w-0 flex-col justify-center-safe" aria-label="Landmark projects">
      {landmarks.projects.map((project, i) => <li key={project.name} data-reveal data-part
        className="flex min-h-11 items-center gap-4 border-b border-line py-[clamp(0.45rem,1.4vh,0.9rem)] first:border-t">
        <span className="num w-6 shrink-0 text-[0.66rem] text-muted">{pad(i + 1)}</span>
        <ArkadeMark className="h-[clamp(1.1rem,1.6vw,1.6rem)] w-auto shrink-0 text-gold-400" />
        <span className="min-w-0">
          <span className="block font-display text-[clamp(1.05rem,min(1.7vw,3.4vh),1.8rem)] uppercase leading-tight text-fg">Arkade <span className="text-accent">{project.name}</span></span>
          <span className="mt-0.5 block text-[0.56rem] uppercase tracking-[0.2em] text-muted">{project.locality}</span>
        </span>
      </li>)}
    </ol>
  </div>
}
