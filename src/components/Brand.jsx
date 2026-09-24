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

// Mark, rule and name, laid out as on the brochure's "Presenting" lockup.
export function BrandLockup({ className = '', size = 'md' }) {
  const mark = size === 'lg' ? 'h-14 w-auto 3xl:h-16' : 'h-7 w-auto sm:h-9'
  const name = size === 'lg' ? 'text-2xl 3xl:text-[1.75rem]' : 'text-[0.74rem] sm:text-[0.95rem]'
  return <span className={`inline-flex items-center gap-3 text-fg ${className}`}>
    <ArkadeMark className={`${mark} text-current`} />
    <span className="my-0.5 w-px self-stretch bg-current opacity-70 sm:my-1" />
    <span className="flex flex-col items-start leading-none">
      <span className={`${name} whitespace-nowrap font-logo font-black tracking-[0.01em] uppercase`}>Arkade Ascend</span>
      <span className={`mt-[0.45em] font-logo font-bold uppercase tracking-[0.08em] ${size === 'lg' ? 'text-sm' : 'text-[0.58rem]'}`}>Malad West</span>
    </span>
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
