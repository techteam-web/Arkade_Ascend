// Facts taken from the brochure (brochure design.pdf, September 2026).
// Anything not in the brochure lives in the template files beside this one
// and is marked there for replacement with approved copy.

export const project = {
  name: 'Arkade Ascend',
  locality: 'Malad West',
  developer: 'Arkade Developers',
  headline: ['Malad’s', 'Neu Gen', 'life', 'has arrived'],
  masterpiece: 'A masterpiece made for those who think ahead.',
  homebuyers: 'Exclusively crafted for today’s metropolitan families and high-achievers, Arkade Developers cocoon the old-world neighbourhood charm with an ultra-chic, modern lifestyle.',
  heart: 'Centrally-nestled with multi-modal connectivity avenues & elite comforts',
  cityHeadline: ['The city at', 'your command,', 'connectivity at', 'your convenience.'],
}

// Brochure page 6. "Dummy render" in the source, so the plan is labelled
// indicative wherever it appears.
export const units = [
  {
    id: 'unit-1',
    unit: '1',
    configuration: '4 BHK',
    reraArea: 1562,
    balcony: 51,
    totalArea: 1613,
    plan: '/brochure/floor-plan-unit-1.webp',
    keyPlan: '/brochure/key-plan.webp',
    // Room outlines in brochure page coordinates (1080 x 840 page render),
    // converted to plan-image percentages by planRect().
    rooms: [
      { id: 'living', name: 'Living room', size: '21′-10″ × 15′-6″', box: [205, 268, 415, 385] },
      { id: 'dining', name: 'Dining', size: '9′-6″ × 10′-0″', box: [300, 385, 410, 470] },
      { id: 'kitchen', name: 'Kitchen', size: '8′-0″ × 12′-6″', box: [237, 420, 322, 540] },
      { id: 'dry-balcony', name: 'Dry balcony', size: '8′-0″ × 4′-0″', box: [232, 540, 322, 600] },
      { id: 'balcony', name: 'Balcony', size: '9′-6″ × 5′-5″', box: [318, 210, 412, 266] },
      { id: 'bedroom-1', name: 'Bedroom', size: '11′-0″ × 12′-7″', box: [462, 255, 570, 377] },
      { id: 'bedroom-2', name: 'Bedroom', size: '11′-0″ × 17′-0″', box: [570, 255, 685, 412] },
      { id: 'bedroom-3', name: 'Bedroom', size: '11′-0″ × 14′-1″', box: [408, 420, 520, 552] },
      { id: 'bedroom-4', name: 'Bedroom', size: '11′-0″ × 15′-4″', box: [575, 420, 685, 562] },
      { id: 'passage', name: 'Passage', size: '16′-6″ × 3′-11″', box: [415, 378, 575, 420] },
      { id: 'toilet-1', name: 'Toilet', size: '4′-6″ × 8′-0″', box: [416, 290, 462, 335] },
      { id: 'wc', name: 'W.C.', size: '4′-6″ × 4′-3″', box: [416, 335, 462, 380] },
      { id: 'toilet-2', name: 'Toilet', size: '8′-6″ × 5′-7″', box: [685, 360, 760, 415] },
      { id: 'toilet-3', name: 'Toilet', size: '4′-6″ × 8′-0″', box: [520, 468, 575, 552] },
      { id: 'toilet-4', name: 'Toilet', size: '5′-0″ × 8′-10″', box: [685, 462, 732, 530] },
    ],
  },
]

// The plan image is cropped from page 6 at x 68.2–799.1, y 169.1–621.8.
const PLAN_CROP = { left: 68.2, top: 169.1, width: 730.9, height: 452.7 }
export const planRect = ([x1, y1, x2, y2]) => ({
  left: `${((x1 - PLAN_CROP.left) / PLAN_CROP.width) * 100}%`,
  top: `${((y1 - PLAN_CROP.top) / PLAN_CROP.height) * 100}%`,
  width: `${((x2 - x1) / PLAN_CROP.width) * 100}%`,
  height: `${((y2 - y1) / PLAN_CROP.height) * 100}%`,
})

// Brochure page 5. `distance` is the brochure's figure (as per Google Maps).
// `point` is the position on the brochure map image (0–1); `lngLat` places
// the same place on the live map. The live-map positions come from
// OpenStreetMap and are indicative: the project pin sits on Liberty Garden
// Cross Road No. 4, Malad West, and should be confirmed against the site plan.
export const origin = { x: 352 / 720, y: 338 / 840, lngLat: [72.8401, 19.1854] }
export const locationGroups = [
  { id: 'roads', label: 'Roads' },
  { id: 'transit', label: 'Rail & metro' },
  { id: 'air', label: 'Airports' },
  { id: 'upcoming', label: 'Upcoming' },
]
export const connectivity = [
  { id: 'link-road', name: 'Link Road', distance: '650 m', group: 'roads', point: [222 / 720, 352 / 840], lngLat: [72.8360, 19.1857] },
  { id: 'sv-road', name: 'S.V. Road', distance: '950 m', group: 'roads', point: [393 / 720, 360 / 840], lngLat: [72.8467, 19.1858] },
  { id: 'weh', name: 'Western Express Highway', distance: '3 km', group: 'roads', point: [611 / 720, 420 / 840], lngLat: [72.8585, 19.1877] },
  { id: 'malad-station', name: 'Malad Railway Station', distance: '1.4 km', group: 'transit', point: [436 / 720, 212 / 840], lngLat: [72.8486, 19.1867] },
  { id: 'metro-2a', name: 'Malad West Metro Station (Line 2A)', distance: '1.8 km', group: 'transit', point: [204 / 720, 245 / 840], lngLat: [72.8354, 19.1851] },
  { id: 'intl-airport', name: 'International Airport', distance: '12.3 km', group: 'air', point: [404 / 720, 812 / 840], offMap: true, lngLat: [72.8739, 19.0970] },
  { id: 'dom-airport', name: 'Domestic Airport', distance: '12.8 km', group: 'air', point: [404 / 720, 812 / 840], offMap: true, lngLat: [72.8546, 19.0928] },
]
export const upcoming = [
  { id: 'gmlr', name: 'Goregaon–Mulund Link Road (GMLR)', group: 'upcoming', point: [505 / 720, 458 / 840], lngLat: [72.8522, 19.1728] },
  { id: 'coastal', name: 'Versova–Dahisar Coastal Road', group: 'upcoming', point: [40 / 720, 470 / 840], offMap: true, lngLat: [72.8241, 19.1962] },
]
export const places = [...connectivity, ...upcoming]
