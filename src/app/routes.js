// One table drives the router, the menu, the header counter and the scene
// preset each page opens with. `preview` is the menu's right-hand image.
export const routes = [
  { id: 'home', path: '/', label: 'Home', hint: 'Return to Ascend', scene: 'home', preview: '/brochure/cover-satin.webp' },
  { id: 'neu-gen', path: '/neu-gen', label: 'Neu Gen Life', hint: 'The vision', scene: 'cover', preview: '/brochure/welcome-balcony-1600.webp' },
  { id: 'tower', path: '/tower', label: 'The Tower', hint: 'Architecture in the round', scene: 'tower', preview: '/gallery/exterior/cam02-twilight-1600.webp' },
  { id: 'residences', path: '/residences', label: 'Residences', hint: 'Find your residence', scene: 'residences', preview: '/residences/tower-cutout.png' },
  { id: 'floor-plans', path: '/floor-plans', label: 'Floor Plans', hint: 'Every room, measured', scene: 'cream', tone: 'light', preview: '/brochure/floor-plan-unit-1.webp' },
  { id: 'specifications', path: '/specifications', label: 'Specifications', hint: 'Crafted in detail', scene: 'plum', preview: '/gallery/interior.png' },
  { id: 'amenities', path: '/amenities', label: 'Amenities', hint: 'Life beyond home', scene: 'amenities', preview: '/gallery/amenities.png' },
  { id: 'views', path: '/views', label: 'Views', hint: 'The city from above', scene: 'views', preview: '/views/evening/still.webp' },
  { id: 'location', path: '/location', label: 'Location', hint: 'The city at your command', scene: 'cream', tone: 'light', preview: '/brochure/location-map.webp' },
  { id: 'gallery', path: '/gallery', label: 'Gallery', hint: 'Curated visions of Ascend', scene: 'gallery', preview: '/gallery/interior.png' },
]

export const pad = value => String(value).padStart(2, '0')
export const routeIndex = id => routes.findIndex(route => route.id === id)
export const routeForPath = pathname =>
  routes.find(route => route.path !== '/' && (pathname === route.path || pathname.startsWith(route.path + '/'))) || routes[0]
