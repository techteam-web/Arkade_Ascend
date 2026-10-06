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
  // Brochure (24 Sep 2026) page 5, as printed.
  welcome: 'Prominently nestled at one of Western Mumbai’s most vibrant residential locales of Malad West, the New-Gen Life is poised to be a striking representation of upscale homes, curated amenities and immediate access to major transit corridors.',
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
  { id: 'nearby', label: 'Nearby' },
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
  // Its Borivali portal, from OpenStreetMap (the tunnel is under construction).
  { id: 'twin-tunnel', name: 'Borivali–Thane Twin Tunnel', group: 'upcoming', point: [640 / 720, 40 / 840], offMap: true, lngLat: [72.8695, 19.2216] },
]
export const places = [...connectivity, ...upcoming]

// Drone footage over the site (DJI, 24 Sep 2026), cut into 360 evenly spaced
// frames for the Tower page's draggable orbit: public/orbit/<width>/NNN.avif.
export const orbit = { frames: 360, path: '/orbit', widths: [854, 1280], poster: '/orbit/poster.jpg', ratio: 16 / 9 }

// Brochure page 9: everyday places close by, as listed (no distances given).
export const nearby = {
  headline: 'Here every comfort is exceptionally close',
  groups: [
    { id: 'business', label: 'Business & employment hubs', places: ['Mindspace Business Park', 'NESCO IT Park', 'Nirlon Knowledge Park', 'Infinity IT Park', 'Lotus Corporate Park'] },
    { id: 'dining', label: 'Restaurants & cafés', places: ['Flag’s Restaurant Liberty Garden', 'Liberty Restaurant', 'Kake Da Hotel', 'The Food Studio', 'Sozo Izakaya'] },
    { id: 'leisure', label: 'Hotels & entertainment', places: ['The Resort', 'Lemon Tree Premier', 'Radisson Hotel', 'Goregaon Sports Club', 'MCA Sachin Tendulkar Gymkhana'] },
    { id: 'schools', label: 'Schools', places: ['Vibgyor Rise', 'Billabong High International School', 'Orchids The International School', 'Witty International School', 'Ryan International School'] },
    { id: 'colleges', label: 'Colleges', places: ['Smt. K. G. Mittal College', 'Atharva College of Engineering & Management Studies', 'Ghanshyamdas Saraf College of Arts & Commerce', 'Durgadevi Saraf Institute of Management Studies'] },
    { id: 'health', label: 'Healthcare', places: ['Sun Multispeciality Hospital', 'CritiCare Asia Multispeciality Hospital', 'Cloudnine Hospital', 'Zenith Multispeciality Hospital'] },
    { id: 'shopping', label: 'Shopping & lifestyle', places: ['Inorbit Mall, Malad', 'Infiniti Mall, Malad West'] },
  ],
}

// Brochure pages 10, 12, 14 and 21. Photographs are the brochure's own,
// marked there as representational (the tower as a dummy render, the
// kitchen as an artist impression). `focus` keeps the subject in frame.
const spec = name => `/brochure/specs/${name}.webp`
export const specifications = [
  {
    id: 'tower', title: 'The tower', line: 'A life above the ordinary', image: spec('tower'), note: 'Dummy render',
    items: [
      { text: 'Rising elegantly across 37 storeys' },
      { text: 'Two distinctive wings' },
      { text: 'A grand arrival experience' },
      { text: 'Eco-Deck Leisure Pad at Level 5' },
      { text: 'First habitable floor at Level 6' },
    ],
  },
  {
    id: 'arrival', title: 'Arrival', line: 'A grand arrival experience sets the tone from the very first step', image: spec('arrival-lobby'),
    items: [
      { text: 'Grand, double-height welcome lobby' },
      { text: 'Reception & waiting lounge' },
      { text: 'High-speed elevators' },
    ],
  },
  {
    id: 'residences', title: 'Residences', line: 'Abodes that redefine the norms of design',
    items: [
      { text: 'Expansive living & dining areas', image: spec('living-dining') },
      { text: 'Spacious & airy bedrooms', image: spec('bedroom') },
      { text: 'Guest suite', image: spec('guest-suite') },
      { text: 'Well-planned kitchens with premium fittings', image: spec('kitchen'), note: 'Artist impression', focus: '50% 45%' },
    ],
  },
  {
    id: 'safety', title: 'Safety & convenience', line: 'Exceptional convenience with absolute security',
    items: [
      { text: 'Surface car parking, designed for ease', image: spec('parking') },
      { text: '4-tier security system' },
      { text: '24x7 manned security', image: spec('security'), focus: '50% 40%' },
      { text: 'Fire-fighting system', image: spec('fire-safety'), focus: '50% 42%' },
      { text: 'CCTV surveillance', image: spec('cctv'), focus: '50% 45%' },
    ],
  },
]

// Brochure pages 15 to 20: Club Ark. Group names are short labels for the
// page; each group's line is the brochure's own.
const amenity = name => `/brochure/amenities/${name}.webp`
export const club = { name: 'Club Ark', line: 'Affluent club indulgences that rise to your standards' }
export const amenityGroups = [
  {
    id: 'pools', label: 'Pools', line: 'Experiences curated for ultimate relaxation',
    items: [
      { id: 'lap-pool', name: 'Lap pool', image: amenity('lap-pool') },
      { id: 'jacuzzi', name: 'Jacuzzi', image: amenity('jacuzzi'), focus: '40% 50%' },
      { id: 'kids-pool', name: 'Pool with kids’ section', image: amenity('kids-pool') },
      { id: 'wet-lounger', name: 'Wet lounger', image: amenity('wet-lounger'), focus: '50% 68%' },
      { id: 'bubble-pool', name: 'Bubble pool', image: amenity('bubble-pool'), focus: '50% 38%' },
    ],
  },
  {
    id: 'active', label: 'Active living', line: 'An ecosystem planned for active living',
    items: [
      { id: 'box-cricket', name: 'Box cricket', image: amenity('box-cricket') },
      { id: 'pickleball', name: 'Pickle ball court', image: amenity('pickleball') },
      { id: 'multipurpose-court', name: 'Multipurpose court', image: amenity('multipurpose-court') },
      { id: 'kids-play', name: 'Kids play area', image: amenity('kids-play') },
      { id: 'creche', name: 'Creche', image: amenity('creche') },
    ],
  },
  {
    id: 'fitness', label: 'Fitness', line: 'An ambience that brings out your strongest self',
    items: [
      { id: 'gym', name: 'Gym', image: amenity('gym') },
      { id: 'yoga-deck', name: 'Yoga deck', image: amenity('yoga-deck') },
      { id: 'meditation-zone', name: 'Meditation zone', image: amenity('meditation-zone') },
      { id: 'kick-boxing', name: 'Kick boxing studio', image: amenity('kick-boxing'), focus: '50% 45%' },
    ],
  },
  {
    id: 'pursuits', label: 'Pursuits', line: 'A private escape for your favourite pursuits',
    items: [
      { id: 'indoor-games', name: 'Indoor games arena', image: amenity('indoor-games'), focus: '30% 50%' },
      { id: 'music-studio', name: 'Music studio', image: amenity('music-studio'), focus: '50% 52%' },
      { id: 'private-screening', name: 'Private screening', image: amenity('private-screening'), focus: '50% 55%' },
      { id: 'hobby-studio', name: 'Hobby studio', image: amenity('hobby-studio') },
    ],
  },
  {
    id: 'gatherings', label: 'Gatherings', line: 'Where good company meets the perfect setting',
    items: [
      { id: 'banquet-hall', name: 'Banquet hall', image: amenity('banquet-hall'), focus: '50% 55%' },
      { id: 'amphitheatre', name: 'Amphitheatre with central lawn', image: amenity('amphitheatre') },
      { id: 'party-hall', name: 'Party hall', image: amenity('party-hall'), focus: '50% 55%' },
      { id: 'senior-seating', name: 'Senior citizen seating area', image: amenity('senior-seating'), focus: '50% 62%' },
    ],
  },
]
