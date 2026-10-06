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
    <h1 tabIndex={-1} className="mt-[clamp(1rem,3.5vh,2.25rem)] w-[min(100%,clamp(min(100%,26rem),62vw,60rem),180vh)] outline-none short:mt-3">
      <AscendLockup data-reveal="draw" className="block aspect-[1029/162] h-auto w-full text-white drop-shadow-[0_2px_18px_rgba(0,0,0,.28)]" />
      <span className="visually-hidden">Arkade Ascend, Malad West</span>
    </h1>

    <div className="mt-[clamp(1.25rem,4.5vh,2.75rem)] flex flex-col items-center short:mt-3">
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
