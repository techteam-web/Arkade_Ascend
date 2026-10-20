import { lazy, Suspense, useState } from 'react'
import { ChevronIcon } from '../components/Brand.jsx'
import { PageHeading } from '../components/PageKit.jsx'
import { orbit } from '../content/project.js'

const OrbitView = lazy(() => import('../scenes/orbit/OrbitView.jsx'))

export const LIGHTS = [['day', 'Day'], ['evening', 'Evening'], ['night', 'Night']]

// The tower's rendered orbit fills the page under its own sky: drag, swipe,
// scroll or use the arrow keys to turn it, and change the light. Changing
// the light plays as a time-lapse of dusk or dawn. The heading sits
// over the shaded top left; one slim bar of controls sits at the foot.
export default function TowerPage() {
  const [light, setLight] = useState('day')
  const [moved, setMoved] = useState(false)
  const [turn, setTurn] = useState({ count: 0, direction: 1 })
  const rotate = direction => { setTurn(value => ({ count: value.count + 1, direction })); setMoved(true) }

  return <section className="absolute inset-0 overflow-hidden" aria-label="The Tower">
    <div data-reveal="fade" data-cursor="Drag" className="absolute inset-0">
      <Suspense fallback={<img src={orbit.poster.day} alt="" className="absolute inset-0 size-full object-cover" />}>
        {/* Zoomed in, so the tower reads larger (client, 14 Oct 2026). */}
        <OrbitView light={light} keys turn={turn} zoom={1.32} onFirstMove={() => setMoved(true)}
          label="Rendered 360 degree orbit of Arkade Ascend in its neighbourhood. Drag, swipe or use the left and right arrow keys to turn it." />
      </Suspense>
    </div>
    {/* Shade the corner and edge that carry text, so it reads over sky. */}
    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(18,11,13,.62),rgba(18,11,13,.12)_34%,transparent_55%,rgba(18,11,13,.25)_78%,rgba(18,11,13,.8))]" />
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_65%_at_0%_0%,rgba(18,11,13,.7),rgba(18,11,13,.25)_55%,transparent)]" />

    <div className="page pointer-events-none flex flex-col">
      {/* Subheading to follow from the client. */}
      <div className="pointer-events-auto max-w-md"><PageHeading id="tower" title="The Tower" subtitle="Rise to a life extraordinaire" /></div>
      {/* The tower in figures, from the brochure. */}
      <dl className="pointer-events-auto mt-[clamp(1.25rem,4vh,2.75rem)] flex gap-[clamp(1.5rem,3vw,3.25rem)] max-sm:hidden short:hidden">
        {[[37, 'Storeys'], [2, 'Wings']].map(([value, label]) => <div key={label} data-reveal className="flex flex-col-reverse">
          <dt className="mt-2 text-[0.58rem] uppercase tracking-[0.24em] text-ivory/70">{label}</dt>
          <dd className="num text-[clamp(1.8rem,3vw,3rem)] leading-none text-ivory"><span data-count={value}>{value}</span></dd>
        </div>)}
        <div data-reveal className="flex max-w-[13rem] flex-col-reverse border-l border-ivory/25 pl-[clamp(1rem,2vw,1.75rem)]">
          <dt className="mt-2 text-[0.58rem] uppercase tracking-[0.24em] text-ivory/70">Club Ark</dt>
          <dd className="text-[0.82rem] leading-snug text-ivory/90">Leisure experiences across Ground, Level <span className="num">5</span> &amp; Level <span className="num">6</span></dd>
        </div>
      </dl>
    </div>

    {/* The drag hint, until the first move. */}
    <div aria-hidden="true" className={`pointer-events-none absolute inset-x-0 top-1/2 flex justify-center transition-opacity duration-700 ${moved ? 'opacity-0' : 'opacity-100'}`}>
      <p className="flex items-center gap-4 rounded-full border border-ivory/25 bg-ink/40 px-5 py-3 text-ivory backdrop-blur-sm">
        <ChevronIcon direction="left" className="h-3.5 w-3 stroke-current stroke-[1.4]" />
        <span className="text-[0.64rem] font-medium uppercase tracking-[0.3em]"><span className="pointer-coarse:hidden">Drag to orbit</span><span className="hidden pointer-coarse:inline">Swipe to orbit</span></span>
        <ChevronIcon className="h-3.5 w-3 stroke-current stroke-[1.4]" />
      </p>
    </div>

    <div data-reveal className="pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+clamp(1rem,4.5vh,2.75rem))] flex flex-col items-center gap-3 px-(--gutter)">
      <div className="glass-panel pointer-events-auto flex items-center gap-1.5 rounded-full p-1.5">
        <button type="button" className="btn-icon border-transparent! max-sm:hidden" aria-label="Turn the tower left" onClick={() => rotate(-1)}><ChevronIcon direction="left" /></button>
        <div role="group" aria-label="Light" className="flex items-center gap-1">
          {LIGHTS.map(([id, name]) => <button key={id} type="button" className="chip" aria-pressed={light === id} onClick={() => setLight(id)}>{name}</button>)}
        </div>
        <button type="button" className="btn-icon border-transparent! max-sm:hidden" aria-label="Turn the tower right" onClick={() => rotate(1)}><ChevronIcon /></button>
      </div>
    </div>
    {/* Bottom right (client, 16 Oct 2026): the BrainWing credit holds the bottom left. */}
    <p className="pointer-events-none absolute bottom-(--credit-bottom) right-(--gutter) text-[0.52rem] uppercase tracking-[0.22em] text-ivory/75 [text-shadow:0_1px_6px_rgba(0,0,0,.5)]">Architect’s impression</p>
  </section>
}
