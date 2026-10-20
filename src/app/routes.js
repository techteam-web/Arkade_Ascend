
export const routes = [
  { id: 'home', path: '/', label: 'Home', hint: 'Return to Ascend', scene: 'home', preview: '/brochure/cover-satin.webp', menu: false },
  { id: 'about', path: '/about-us', label: 'About Us', hint: '40+ Years of Creating Happy Spaces For Happy Faces', scene: 'plum', preview: '/arkade-family/legacy-skyline-1600.webp', previewNote: 'Representational image' },
  { id: 'neu-gen', path: '/neu-gen', label: 'Neu Gen Life', hint: 'The vision', scene: 'arrival', preview: '/neu-gen/landmark-1600.webp' },
  { id: 'tower', path: '/tower', label: 'The Tower', hint: 'Architecture in the round', scene: 'tower', preview: '/gallery/exterior/cam02-twilight-1600.webp', previewNote: 'Architect’s impression' },
  { id: 'residences', path: '/residences', label: 'Residences', hint: 'Find your residence', scene: 'residences', preview: '/gallery/exterior/cam27-evening-1600.webp', previewNote: 'Architect’s impression' },
  { id: 'floor-plans', path: '/floor-plans', label: 'Floor Plans', hint: 'Every home, floor by floor', scene: 'cream', tone: 'light', preview: '/plans/wing-a/typical-2400.webp' },
  { id: 'specifications', path: '/specifications', label: 'Specifications', hint: 'Crafted in detail', scene: 'plum', preview: '/brochure/specs/living-dining.webp' },
  { id: 'amenities', path: '/amenities', label: 'Amenities', hint: 'Life beyond home', scene: 'amenities', preview: '/brochure/amenities/lap-pool.webp' },
  { id: 'views', path: '/views', label: 'Views', hint: 'The city from above', scene: 'views', preview: '/views/evening/still.webp' },
  { id: 'location', path: '/location', label: 'Location', hint: 'The city at your command', scene: 'map', tone: 'light', preview: '/brochure/location-map.webp' },
  { id: 'gallery', path: '/gallery', label: 'Gallery', hint: 'Curated visions of Ascend', scene: 'gallery', preview: '/gallery/exterior/cam12-day-1600.webp', previewNote: 'Architect’s impression' },
]
export const sections = routes.filter(route => route.menu !== false)

export const pad = value => String(value).padStart(2, '0')
export const routeIndex = id => routes.findIndex(route => route.id === id)
// A page's place among the menu's sections (-1 for Home).
export const sectionIndex = id => sections.findIndex(route => route.id === id)
export const routeForPath = pathname =>
  routes.find(route => route.path !== '/' && (pathname === route.path || pathname.startsWith(route.path + '/'))) || routes[0]



