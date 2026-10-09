// The Arkade Developers mark, traced from the brochure's vector artwork
// (page 2 lockup). Seven petals and the open bowl.
export const MARK_PATHS = [
  ['matrix(1,0,0,-1,858.0031,496.8484)', 'M0 0C2.66-1.315 5.008-3.08 6.971-5.183L3.896-7.163 4.76-8.234C8.157-12.457 9.36-17.835 8.412-22.88 8.793-15.092 4.388-7.771-2.692-4.46Z'],
  ['matrix(1,0,0,-1,868.1266,501.4922)', 'M0 0C1.735-2.257 3.017-4.771 3.857-7.401L.196-7.923 .543-9.268C1.996-15.061 .436-21.053-3.256-25.39 1.281-18.403 .78-9.268-4.389-2.818Z'],
  ['matrix(1,0,0,-1,875.0258,509.7152)', 'M0 0C.689-2.986 .782-6.019 .36-8.95L-3.745-7.731-3.991-9.087C-5.11-15.152-9.211-20.043-14.606-22.378-6.828-18.129-3.031-9.155-5.155-.733Z'],
  ['matrix(1,0,0,-1,848.5298,496.8484)', 'M0 0C-2.656-1.315-5.013-3.08-6.974-5.183L-3.897-7.163-4.757-8.234C-8.149-12.457-9.356-17.835-8.409-22.88-8.782-15.092-4.389-7.771 2.696-4.46Z'],
  ['matrix(1,0,0,-1,838.408,501.4922)', 'M0 0C-1.732-2.257-3.022-4.771-3.866-7.401L-.191-7.923-.54-9.268C-1.996-15.061-.43-21.053 3.255-25.39-1.283-18.403-.788-9.268 4.391-2.818Z'],
  ['matrix(1,0,0,-1,831.5085,509.7152)', 'M0 0C-.686-2.986-.792-6.019-.361-8.95L3.741-7.731 3.989-9.087C5.114-15.152 9.21-20.043 14.613-22.378 6.829-18.129 3.034-9.155 5.161-.733Z'],
  ['matrix(1,0,0,-1,829.2824,520.515)', 'M0 0C2.314-11.122 12.17-19.485 23.981-19.485 35.793-19.485 45.658-11.122 47.973 0L42.978 1.487C41.318-7.501 33.449-14.304 23.981-14.304 14.527-14.304 6.651-7.501 4.993 1.487Z'],
]

export function ArkadeMark({ className = '', title }) {
  return <svg className={className} viewBox="827.5 494.5 51 47" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : 'true'} fill="currentColor">
    {/* Animate the wrapping groups: the paths' own matrices carry a flip. */}
    {MARK_PATHS.map(([transform, d], index) => <g key={index} data-petal={index}><path transform={transform} d={d} fillRule="evenodd" /></g>)}
  </svg>
}

// The Arkade Ascend project logo (mark, rule, ARKADE ASCEND, MALAD WEST) from
// the supplied artwork (Arkade Ascend Logo-02.svg). Its text is live type in
// the site's Avenir LT Std Black, so it stays sharp at any size. Colours come
// from .ascend-logo in index.css: the artwork's greys on light grounds, lifted
// to ivory tones on dark ones so it stays legible; the orange never changes.
const ASCEND_PATHS = [
  ['a', 'M309.54,282.37c9.57,4.73,18.02,11.09,25.08,18.65l-11.06,7.12,3.1,3.85c12.22,15.2,16.56,34.55,13.15,52.7,1.37-28.02-14.48-54.37-39.96-66.28l9.69-16.05Z'],
  ['b', 'M345.97,299.08c6.24,8.12,10.85,17.17,13.88,26.63l-13.17,1.88,1.25,4.84c5.23,20.84-.39,42.4-13.67,58,16.32-25.14,14.52-58-4.07-81.21l15.79-10.14Z'],
  ['c', 'M370.79,328.66c2.48,10.74,2.81,21.66,1.29,32.21l-14.77-4.39-.89,4.88c-4.02,21.82-18.78,39.42-38.19,47.82,27.99-15.29,41.65-47.58,34.01-77.88l18.55-2.64Z'],
  ['a', 'M275.45,282.37c-9.56,4.73-18.04,11.09-25.09,18.65l11.07,7.12-3.09,3.85c-12.21,15.2-16.55,34.55-13.14,52.7-1.34-28.02,14.47-54.37,39.96-66.28l-9.7-16.05Z'],
  ['b', 'M239.03,299.08c-6.23,8.12-10.87,17.17-13.91,26.63l13.22,1.88-1.25,4.84c-5.24,20.84.4,42.4,13.66,58-16.33-25.14-14.55-58,4.08-81.21l-15.8-10.14Z'],
  ['c', 'M214.21,328.66c-2.47,10.74-2.85,21.66-1.3,32.21l14.76-4.39.89,4.88c4.05,21.82,18.79,39.42,38.23,47.82-28.01-15.29-41.66-47.58-34.01-77.88l-18.57-2.64Z'],
  ['accent', 'M206.2,367.52c8.32,40.02,43.79,70.11,86.29,70.11s78-30.09,86.32-70.11l-17.97-5.35c-5.98,32.34-34.29,56.82-68.35,56.82s-62.36-24.48-68.33-56.82l-17.96,5.35Z'],
]

export function AscendLogo({ className = '', title = 'Arkade Ascend, Malad West', ...props }) {
  return <svg {...props} viewBox="204 280 1030 160" role="img" aria-label={title} className={`ascend-logo ${className}`}>
    {ASCEND_PATHS.map(([tone, d], index) => <path key={index} d={d} fillRule="evenodd" style={{ fill: `var(--logo-${tone})` }} />)}
    <line x1="414.7" y1="290.24" x2="414.7" y2="429.76" strokeWidth="2.74" style={{ stroke: 'var(--logo-ink)' }} />
    <text transform="translate(446.57 360.08) scale(.97 1)" fontSize="91.91" style={{ fontFamily: 'var(--font-logo)', fontWeight: 900 }}>
      <tspan x="0" y="0" style={{ fill: 'var(--logo-ink)' }}>ARKADE </tspan><tspan x="423.44" y="0" style={{ fill: 'var(--logo-accent)' }}>ASCEND</tspan>
    </text>
    <text transform="translate(687.08 420.1)" fontSize="41.87" letterSpacing="2.09" style={{ fontFamily: 'var(--font-logo)', fontWeight: 900, fill: 'var(--logo-ink)' }}>MALAD WEST</text>
  </svg>
}

// The Arkade logo: white on dark grounds, full colour on light ones (tone-light).
export function BrandLockup({ className = '', size = 'md' }) {
  const height = size === 'lg' ? 'h-14 3xl:h-16' : 'h-8 sm:h-10'
  return <span className={`inline-flex items-center ${className}`}>
    <img src="/logo/arkade-white.png" alt="Arkade" className={`${height} w-auto tone-light:hidden`} />
    <img src="/logo/arkade-color.png" alt="" aria-hidden="true" className={`hidden ${height} w-auto tone-light:block`} />
  </span>
}

export function ArrowIcon({ className = '' }) {
  return <svg className={className} viewBox="0 0 32 12" fill="none" aria-hidden="true"><path d="M1 6h28m-5-5 5 5-5 5" /></svg>
}

export function ChevronIcon({ direction = 'right', className = '' }) {
  return <svg className={className} viewBox="0 0 20 24" fill="none" aria-hidden="true">
    <path d={direction === 'right' ? 'm7 5 7 7-7 7' : 'm13 5-7 7 7 7'} />
  </svg>
}

// Play and pause for a panorama's slow turn.
export function SpinIcon({ paused }) {
  return <svg viewBox="0 0 20 24" fill="none" aria-hidden="true" strokeLinejoin="round">
    <path d={paused ? 'M6.5 5.5v13l10-6.5z' : 'M7 6v12m6-12v12'} />
  </svg>
}
