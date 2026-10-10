// One table drives the router, the menu, the header counter and the scene
// preset each page opens with. `preview` is the menu's right-hand image;
// with `previewLogo` it is a logo, shown centred on the brochure's plum.
export const routes = [
  { id: 'home', path: '/', label: 'Home', hint: 'Return to Ascend', scene: 'home', preview: '/brochure/cover-satin.webp' },
  { id: 'neu-gen', path: '/neu-gen', label: 'Neu Gen Life', hint: 'The vision', scene: 'arrival', preview: '/neu-gen/together-1600.webp' },
  { id: 'tower', path: '/tower', label: 'The Tower', hint: 'Architecture in the round', scene: 'tower', preview: '/gallery/exterior/cam02-twilight-1600.webp' },
  { id: 'residences', path: '/residences', label: 'Residences', hint: 'Find your residence', scene: 'residences', preview: '/residences/tower-cutout.png' },
  { id: 'floor-plans', path: '/floor-plans', label: 'Floor Plans', hint: 'Every home, floor by floor', scene: 'cream', tone: 'light', preview: '/plans/wing-a/typical-2400.webp' },
  { id: 'specifications', path: '/specifications', label: 'Specifications', hint: 'Crafted in detail', scene: 'plum', preview: '/brochure/specs/living-dining.webp' },
  { id: 'amenities', path: '/amenities', label: 'Amenities', hint: 'Life beyond home', scene: 'amenities', preview: '/brochure/amenities/lap-pool.webp' },
  { id: 'views', path: '/views', label: 'Views', hint: 'The city from above', scene: 'views', preview: '/views/evening/still.webp' },
  { id: 'location', path: '/location', label: 'Location', hint: 'The city at your command', scene: 'cream', tone: 'light', preview: '/brochure/location-map.webp' },
  { id: 'gallery', path: '/gallery', label: 'Gallery', hint: 'Curated visions of Ascend', scene: 'gallery', preview: '/gallery/exterior/cam12-day-1600.webp' },
  { id: 'arkade-family', path: '/arkade-family', label: 'Arkade Family', hint: 'The family behind Ascend', scene: 'plum', preview: '/logo/arkade-white.png', previewLogo: true },
]

export const pad = value => String(value).padStart(2, '0')
export const routeIndex = id => routes.findIndex(route => route.id === id)
export const routeForPath = pathname =>
  routes.find(route => route.path !== '/' && (pathname === route.path || pathname.startsWith(route.path + '/'))) || routes[0]
