import { useShell } from '../app/ShellContext.js'
import { ArrowIcon } from '../components/Brand.jsx'
import AscendLockup from '../components/AscendLockup.jsx'

// The title over the moving silk, and a single way in.
export default function HomePage() {
  const { openMenu } = useShell()

  return <section className="page page-scroll flex flex-col items-center justify-center-safe pt-(--gutter) text-center" aria-label="Arkade Ascend, Malad West">
    <span data-reveal="line-v" className="hairline-v absolute left-1/2 top-0 h-[12vh] short:hidden" aria-hidden="true" />

    <p data-reveal className="eyebrow text-gold-300">Presenting</p>

    {/* The Arkade Ascend lockup draws itself in. Its width follows the
        viewport: the full column on phones, about 62vw on tablets and
        laptops, at most 60rem (which grows with the root size on large
        displays), and never taller than about 28vh on short screens. */}
    <h1 tabIndex={-1} className="relative mt-[clamp(1.25rem,4vh,2.5rem)] w-[min(100%,clamp(min(100%,26rem),62vw,60rem),180vh)] outline-none short:mt-4">
      {/* The lockup in its original colours (Arkade Ascend Logo-02), where its
          greys read as designed: on a champagne satin plaque, its diagonal
          sheen echoing the gold silk, softly rounded and edged in gold, a
          little glassy over the silk behind. It fades in; the logo draws on it. */}
      <span data-reveal="fade" aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[1.25rem] border border-gold-300/70 bg-[linear-gradient(115deg,rgba(255,250,240,.95)_0%,rgba(246,232,206,.93)_38%,rgba(255,248,236,.96)_52%,rgba(232,208,166,.92)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,.8),inset_0_-12px_30px_-18px_rgba(150,105,55,.35),0_30px_60px_-32px_rgba(18,10,8,.7)] backdrop-blur-md" />
      <span className="relative block px-[clamp(1.5rem,5vw,4.5rem)] py-[clamp(0.9rem,2.6vw,2.1rem)] short:py-3">
        <AscendLockup colour data-reveal="draw" className="block aspect-[1029/162] h-auto w-full" />
      </span>
      <span className="visually-hidden">Arkade Ascend, Malad West</span>
    </h1>

    <div className="mt-[clamp(1.5rem,5vh,3rem)] flex flex-col items-center short:mt-4">
      <p data-reveal className="max-w-[46ch] text-[clamp(0.68rem,0.9vw,0.9rem)] font-medium uppercase leading-[2] tracking-[0.26em] text-ivory/85">The Neu Gen life has arrived</p>
    </div>

    <div data-reveal className="relative mt-[clamp(1.5rem,5vh,3.5rem)] p-4 short:mt-3">
      <button type="button" onClick={openMenu} aria-label="Enter and explore Arkade Ascend" className="enter-lux group">
        <span>Enter</span>
        <ArrowIcon className="h-2.5 w-9 fill-none stroke-current stroke-[1.1] transition-[translate] duration-700 ease-silk group-hover:translate-x-1.5" />
      </button>
      <p className="mt-4 text-[0.56rem] uppercase tracking-[0.4em] text-gold-300/60">Explore the residences</p>
    </div>

    <img data-reveal="fade" src="/logo/arkade-white.png" alt="Arkade" className="absolute left-(--gutter) top-[clamp(1rem,4vh,2.5rem)] h-8 w-auto sm:h-10" />
  </section>
}
