import { Figure, PageHeading } from '../components/PageKit.jsx'
import OrbitViewer from './tower/OrbitViewer.jsx'

// Drone footage over the site fills the page and is dragged through like an
// orbit; the heading and key figures sit over it.
export default function TowerPage() {
  return <section className="absolute inset-0 overflow-hidden" aria-label="The Tower">
    <OrbitViewer>
      {/* Shade the corner and edge that carry text, so it reads over sky. */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(18,11,13,.72),rgba(18,11,13,.2)_38%,transparent_55%,rgba(18,11,13,.35)_75%,rgba(18,11,13,.88))]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_70%_at_0%_0%,rgba(18,11,13,.78),rgba(18,11,13,.35)_55%,transparent)]" />
    </OrbitViewer>

    <div className="page pointer-events-none flex flex-col">
      <div className="pointer-events-auto flex max-w-md flex-col gap-[clamp(1rem,3vh,2rem)]">
        <div className="flex"><PageHeading id="tower" title="The Tower" subtitle="A masterpiece made for those who think ahead." className="flex-1" /></div>
        <div className="grid grid-cols-3 gap-6 short:hidden">
          <Figure value="4 BHK" label="Residences" />
          <Figure value={1613} suffix="sq.ft" label="Total area, Unit 1" />
          <Figure value={650} suffix="m" label="To Link Road" />
        </div>
      </div>
    </div>
  </section>
}
