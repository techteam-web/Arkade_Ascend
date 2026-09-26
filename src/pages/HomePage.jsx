import { useShell } from '../app/ShellContext.js'
import { ArkadeMark, ArrowIcon } from '../components/Brand.jsx'
import { project } from '../content/project.js'

// The title over the moving silk, and a single way in.
export default function HomePage() {
  const { openMenu } = useShell()

  return <section className="page page-scroll flex flex-col items-center justify-center-safe pt-(--gutter) text-center" aria-label="Arkade Ascend, Malad West">
    <span data-reveal="line-v" className="hairline-v absolute left-1/2 top-0 h-[12vh] short:hidden" aria-hidden="true" />

    <div className="flex flex-col items-center">
      <p data-reveal className="eyebrow text-gold-300">Presenting</p>
      <div data-reveal="scale" className="mt-6 short:mt-3">
        <ArkadeMark className="h-[clamp(2.6rem,7vh,4.5rem)] w-auto text-gold-300" />
      </div>
      <p data-reveal className="mt-6 text-[clamp(0.8rem,1.1vw,1.05rem)] font-semibold uppercase tracking-[0.9em] pl-[0.9em] text-ivory/90 short:mt-3">Arkade</p>
    </div>

    <h1 tabIndex={-1} className="outline-none">
      <span data-reveal="title" className="display gold-text my-[0.1em] block pl-[0.06em] text-[clamp(3.6rem,min(15vw,21vh),15rem)] leading-[1] tracking-[0.06em] drop-shadow-[0_4px_24px_rgba(0,0,0,.25)]">Ascend</span>
      <span className="visually-hidden">Arkade Ascend, Malad West</span>
    </h1>

    <div className="flex flex-col items-center">
      <p data-reveal className="pl-[0.62em] text-[clamp(0.7rem,0.9vw,0.9rem)] font-medium uppercase tracking-[0.62em] text-gold-200">Malad West</p>
      <p data-reveal className="mt-5 max-w-[46ch] text-[clamp(0.68rem,0.9vw,0.9rem)] font-medium uppercase leading-[2] tracking-[0.26em] text-ivory/85 short:mt-2">{project.masterpiece}</p>
    </div>

    <div data-reveal className="relative mt-[clamp(1.5rem,5vh,3.5rem)] p-4 short:mt-3">
      <button type="button" onClick={openMenu} aria-label="Enter and explore Arkade Ascend" className="enter-lux group">
        <span>Enter</span>
        <ArrowIcon className="h-2.5 w-9 fill-none stroke-current stroke-[1.1] transition-[translate] duration-700 ease-silk group-hover:translate-x-1.5" />
      </button>
      <p className="mt-4 text-[0.56rem] uppercase tracking-[0.4em] text-gold-300/60">Explore the residences</p>
    </div>

    <p data-reveal="fade" className="absolute bottom-[clamp(1rem,5vh,3rem)] left-(--gutter) hidden text-left text-[0.62rem] uppercase leading-[2.1] tracking-[0.42em] text-gold-300/75 md:block short:hidden">
      Malad&rsquo;s<br />Neu Gen life<br />has arrived
    </p>
    <div data-reveal="fade" className="absolute bottom-[clamp(1rem,5vh,3rem)] right-(--gutter) hidden flex-col items-end gap-2 text-right md:flex short:hidden">
      <span className="flex items-center gap-3 text-ivory/85"><ArkadeMark className="h-6 w-auto" /><span className="text-[0.8rem] font-bold tracking-[0.12em]">ARKADE</span></span>
      <span className="text-[0.55rem] uppercase tracking-[0.6em] text-gold-300/70">Developers</span>
    </div>
  </section>
}
