import { useLayoutEffect, useRef } from 'react'
import { Link } from 'react-router'
import { gsap } from './reveal.js'
import { BrandLockup } from '../components/Brand.jsx'
import { pad, routes } from './routes.js'
import { prefersReducedMotion } from '../hooks/useMediaQuery.js'

export default function SiteHeader({ route, index, hidden, menuOpen, onMenu, menuButton }) {
  const root = useRef(null)
  useLayoutEffect(() => {
    const duration = prefersReducedMotion() ? 0 : 0.8
    // Visible (and focusable) at once when shown, so focus can return to Explore.
    if (hidden) {
      gsap.to(root.current, { autoAlpha: 0, y: -12, duration, ease: 'silk', overwrite: true })
    } else {
      gsap.set(root.current, { visibility: 'visible' })
      gsap.to(root.current, { opacity: 1, y: 0, duration, ease: 'silk', delay: duration ? 0.35 : 0, overwrite: true })
    }
  }, [hidden])

  return <header ref={root} data-tone={route.tone || 'dark'} inert={hidden ? '' : undefined}
    className="site-header pointer-events-none absolute inset-x-0 top-0 z-30 flex h-(--header-h) items-center justify-between px-(--gutter)">
    <Link to="/" className="relative pointer-events-auto -m-2 rounded-sm p-2 transition-opacity duration-500 hover:opacity-80" aria-label="Arkade Ascend, home">
      <BrandLockup />
    </Link>
    <div className="relative pointer-events-auto flex items-center gap-4 sm:gap-7">
      <p className="num hidden items-center gap-2 text-[0.72rem] text-muted sm:flex" aria-label={`Section ${index + 1} of ${routes.length}`}>
        <span className="text-fg">{pad(index + 1)}</span><span className="opacity-60">/</span><span>{pad(routes.length)}</span>
      </p>
      <button ref={menuButton} type="button" onClick={onMenu} aria-expanded={menuOpen} aria-haspopup="dialog"
        className="group flex min-h-11 items-center gap-4 rounded-full py-2 pl-4 pr-1 text-fg">
        <span className="text-[0.68rem] font-medium uppercase tracking-[0.3em] transition-colors group-hover:text-accent max-[23rem]:sr-only">Explore</span>
        <span className="grid size-11 place-items-center rounded-full border border-line transition-colors duration-500 group-hover:border-accent group-focus-visible:border-accent">
          <span className="flex w-4.5 flex-col items-end gap-[5px]">
            <i className="block h-px w-full bg-current" />
            <i className="block h-px w-2/3 bg-current transition-[width] duration-500 group-hover:w-full" />
            <i className="block h-px w-full bg-current" />
          </span>
        </span>
      </button>
    </div>
  </header>
}
