import { useShell } from '../app/ShellContext.js'
import { ArrowIcon, Roll } from '../components/Brand.jsx'
import AscendLockup from '../components/AscendLockup.jsx'
import { rera } from '../content/project.js'

// Home (DESIGN.md, "the screenshot"): the project's name set monumental in the
// brochure's display face, the twilight tower standing in a tall window behind
// it, and beside the window a storey scale whose gold marker climbs from the
// ground to the 37th floor as the page arrives. The window opens the Tower;
// the one primary action begins the tour at the first section.
const TOWER = {
  src: '/gallery/exterior/cam02-twilight-1600.webp',
  srcSet: '/gallery/exterior/cam02-twilight-1600.webp 1280w, /gallery/exterior/cam02-twilight-2880.webp 2304w',
}
const STOREYS = 37
// Marks on the scale, from the brochure: the arrival at ground, Club Ark on
// the 5th, the first homes on the 6th. The top is the climbing counter.
const MARKS = [
  { at: 0, label: 'G', note: 'Arrival' },
  { at: 5, label: '05', note: 'Club Ark' },
  { at: 6, label: '06', note: 'First homes', minor: true },
]

export default function HomePage() {
  const { go } = useShell()

  return <section className="page home-stage overflow-hidden p-0" aria-label="Arkade Ascend, Malad West">
    <h1 tabIndex={-1} className="visually-hidden outline-none">Arkade Ascend, Malad West</h1>

    {/* The tower, in a tall window that unveils from the ground up. */}
    <button type="button" onClick={() => go('/tower')} data-cursor="The tower" aria-label="See the tower (architect’s impression)"
      className="home-window group outline-offset-4">
      <span data-reveal="mask" className="absolute inset-0 block overflow-hidden bg-plum-950">
        <span className="home-drift absolute inset-0 block">
          <img src={TOWER.src} srcSet={TOWER.srcSet} sizes="(orientation: portrait) 62vw, 34vh" alt="Arkade Ascend at twilight" draggable="false" fetchpriority="high"
            className="absolute inset-0 size-full select-none object-cover object-[50%_38%] transition-[scale] duration-[1.6s] ease-silk group-hover:scale-[1.035] group-focus-visible:scale-[1.035]" />
        </span>
        <span className="absolute inset-0 bg-linear-to-t from-ink/80 via-ink/5 to-ink/25" />
        <span className="absolute inset-[clamp(0.4rem,0.9cqw,0.75rem)] border border-gold-200/30" />
        <span aria-hidden="true" className="absolute bottom-[clamp(0.7rem,1.6cqh,1.1rem)] right-[clamp(0.8rem,1.4cqw,1.2rem)] text-[0.48rem] uppercase tracking-[0.2em] text-ivory/75">Architect’s impression</span>
      </span>
    </button>

    {/* The name, across the window. Decorative: the heading above names the page. */}
    <p aria-hidden="true" className="home-word display sheen pointer-events-none z-10 select-none text-ivory">
      <span data-reveal="chars" data-delay="0.35" className="block">Ascend</span>
    </p>

    <StoreyScale />

    <div className="home-foot">
      <div className="home-foot-brand">
        <AscendLockup data-reveal="draw" data-delay="0.6" className="block aspect-[1029/162] h-auto w-[clamp(10rem,17cqw,17rem)] text-ivory" />
        <p data-reveal className="mt-[clamp(0.6rem,1.6cqh,1rem)] text-[clamp(0.6rem,0.75cqw,0.74rem)] font-medium uppercase tracking-[0.28em] text-gold-200/90">The Neu Gen life has arrived</p>
      </div>
      <div data-reveal className="home-foot-cta">
        <button type="button" onClick={() => go('/about-us')} className="btn-lux is-solid min-h-14! px-8! text-[0.7rem]! tracking-[0.3em]!" data-magnetic>
          <Roll>Begin the tour</Roll><ArrowIcon />
        </button>
      </div>
      <div data-reveal className="home-foot-rera text-right">
        <p className="text-[0.55rem] uppercase tracking-[0.3em] text-gold-200/75">MahaRERA Reg. No.</p>
        <p className="num mt-1.5 text-[clamp(0.8rem,0.95cqw,1rem)] tracking-[0.06em] text-ivory">{rera.number}</p>
      </div>
    </div>
  </section>
}

// The storey scale beside the window: a tick for every floor, longer every
// fifth, with the brochure's marks; the gold marker climbs it as Home arrives
// (data-reveal="climb", reveal.js), its counter rolling up to 37.
function StoreyScale() {
  const ticks = Array.from({ length: STOREYS + 1 }, (_, floor) => floor)
  return <div className="home-scale" aria-hidden="true">
    <div data-reveal="line-v" className="absolute inset-y-0 left-0 w-px origin-bottom bg-linear-to-t from-gold-500/70 via-gold-500/40 to-gold-300/70" />
    <svg className="absolute inset-y-0 left-0 h-full w-3 overflow-visible" preserveAspectRatio="none" viewBox={`0 0 12 ${STOREYS}`}>
      {ticks.map(floor => <line key={floor} x1="0" x2={floor % 5 === 0 ? 12 : 6} y1={STOREYS - floor} y2={STOREYS - floor}
        stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" className={floor % 5 === 0 ? 'text-gold-300/70' : 'text-gold-500/40'} />)}
    </svg>
    {MARKS.map(mark => <p key={mark.at} data-reveal="fade" data-delay="0.9"
      className={`home-scale-mark ${mark.minor ? 'max-sm:hidden short:hidden' : ''}`} style={{ '--at': mark.at / STOREYS }}>
      <span className="num text-ivory/90">{mark.label}</span><span className="max-md:hidden"> {mark.note}</span>
    </p>)}
    {/* The marker climbs to the top while the counter there rolls up to 37. */}
    <div data-reveal="climb" data-delay="0.5" data-climb-to={STOREYS} className="absolute inset-0">
      <span className="home-scale-marker block h-px w-[clamp(1.25rem,2.4cqw,2.5rem)] bg-gold-200 shadow-[0_0_0_1px_rgba(236,211,168,.15)]" />
      <p className="home-scale-top">
        <span data-climb-count className="num block text-[clamp(1.4rem,2.4cqw,2.4rem)] leading-none text-gold-100">37</span>
        <span className="mt-1.5 block text-[clamp(0.5rem,0.62cqw,0.62rem)] uppercase tracking-[0.24em] text-gold-200/80">Storeys</span>
      </p>
    </div>
  </div>
}
