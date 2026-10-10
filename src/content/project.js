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

// Brochure page 5. `distance` is the brochure's figure (as per Google Maps).
// `point` is the position on the brochure map image (0–1); `lngLat` places
// the same place on the live map. The live-map positions come from
// OpenStreetMap and are indicative: the project pin sits on Liberty Garden
// Cross Road No. 4, Malad West, and should be confirmed against the site plan.
// MahaRERA registration (Ascend Rera.pdf, supplied 9 Oct 2026). The QR code
// is redrawn square by square from the PDF's image (public/rera/qr.svg) and
// opens the project's page on the MahaRERA site.
export const rera = {
  number: 'PM1180002601025',
  site: 'https://maharera.maharashtra.gov.in',
  qr: '/rera/qr.svg',
  qrTarget: 'https://maharerait.maharashtra.gov.in/project/view/64988',
}

export const origin ={ x: 352 / 720, y: 338 / 840, lngLat: [72.8401, 19.1854] }
// The Neu Gen chapters from the customer presentation (Ascend_Customer
// PPT.pdf, supplied 9 Oct 2026), pages 7 to 9, as printed. Page 6 is the
// "Malad's Neu Gen life has arrived" lockup, drawn by NeuGenMark.
export const neuGen = {
  homebuyers: {
    title: ['The', 'new generation', 'homebuyers,', 'want it all.'],
    lead: ['New-Gen is not a generation.', 'It is a way of living.'],
    body: 'A way of living where every need has a place, every aspiration has room, and every day feels more balanced.',
  },
  desired: {
    title: ['“The New-Gen life”', 'desired by those', 'who want more'],
    qualities: [
      { name: 'Connected', line: 'Closer to work, leisure, culture and everything that keeps life moving.' },
      { name: 'Spacious', line: 'Homes that give you a home to live, grow, host and breathe.' },
      { name: 'Elevated', line: 'Lifestyle amenities and experiences that make everyday living feel exceptional.' },
      { name: 'Social', line: 'A vibrant community that brings people, families and experiences together.' },
      { name: 'Status-led', line: 'A home that reflects where you are in life and where you’re headed.' },
      { name: 'Balanced', line: 'The freedom to pursue ambition while making time for wellness, family and yourself.' },
    ],
  },
  together: {
    line: 'Brings it all together.',
    close: ['Because today’s home isn’t just where you live.', 'It’s how you choose to live.'],
    image: { src: '/neu-gen/together-1600.webp', srcSet: '/neu-gen/together-1600.webp 1600w, /neu-gen/together-2880.webp 2880w', alt: 'A woman in a flowing gown on a high balcony at dusk, looking out over the city' },
  },
}

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

// The rendered 360° orbit of the tower (Orbit project, supplied 10 Oct 2026):
// 100 frames, 3.6° apart, each with day and night renders, a depth pass and
// an alpha matte, plus the per-pixel world positions that name the floor
// under the pointer. public/orbit/<width>/<layer>/NNN.webp (960 where the
// cropped view needs no more, 1920 otherwise), public/orbit/depth/, public/orbit/world/.
export const orbit = {
  frames: 100, path: '/orbit', widths: [960, 1920], width: 1920, height: 1080,
  poster: { day: '/orbit/poster-day.webp', night: '/orbit/poster-night.webp' },
}

// Brochure page 9: everyday places close by, in the brochure's own groups.
// Positions are indicative, found Oct 2026 from OpenStreetMap and the places'
// published map pins and addresses; `approx` marks those placed from a street
// address alone. Distances are by road from the project (OSRM routing over
// OpenStreetMap), rounded. They have no place on the brochure's own map.
export const nearby = {
  headline: 'Here every comfort is exceptionally close',
  groups: [
    { id: 'business', label: 'Business & employment hubs' },
    { id: 'dining', label: 'Restaurants & cafés' },
    { id: 'leisure', label: 'Hotels & entertainment' },
    { id: 'schools', label: 'Schools' },
    { id: 'colleges', label: 'Colleges' },
    { id: 'health', label: 'Healthcare' },
    { id: 'shopping', label: 'Shopping & lifestyle' },
  ],
}
export const nearbyPlaces = [
  { id: 'mindspace', name: 'Mindspace Business Park', distance: '1.2 km', group: 'nearby-business', lngLat: [72.83279, 19.18031] },
  { id: 'nesco', name: 'NESCO IT Park', distance: '5.7 km', group: 'nearby-business', lngLat: [72.85491, 19.15224] },
  { id: 'nirlon', name: 'Nirlon Knowledge Park', distance: '5.8 km', group: 'nearby-business', lngLat: [72.85405, 19.15502] },
  { id: 'infinity-it', name: 'Infinity IT Park', distance: '6.1 km', group: 'nearby-business', lngLat: [72.88118, 19.17624] },
  { id: 'lotus', name: 'Lotus Corporate Park', distance: '7.1 km', group: 'nearby-business', lngLat: [72.85319, 19.14501] },
  { id: 'flags', name: 'Flag’s Restaurant Liberty Garden', distance: '800 m', group: 'nearby-dining', lngLat: [72.84170, 19.18960] },
  { id: 'liberty-restaurant', name: 'Liberty Restaurant', distance: '1.3 km', group: 'nearby-dining', lngLat: [72.83850, 19.19400], approx: true },
  { id: 'kake-da', name: 'Kake Da Hotel', distance: '1.7 km', group: 'nearby-dining', lngLat: [72.83560, 19.18920], approx: true },
  { id: 'food-studio', name: 'The Food Studio', distance: '1.1 km', group: 'nearby-dining', lngLat: [72.83600, 19.18330] },
  { id: 'sozo', name: 'Sozo Izakaya', distance: '1.8 km', group: 'nearby-dining', lngLat: [72.83417, 19.19466] },
  { id: 'the-resort', name: 'The Resort', distance: '7.8 km', group: 'nearby-leisure', lngLat: [72.79633, 19.17437] },
  { id: 'lemon-tree', name: 'Lemon Tree Premier', distance: '1.2 km', group: 'nearby-leisure', lngLat: [72.83520, 19.17900], approx: true },
  { id: 'radisson', name: 'Radisson Hotel', distance: '1.9 km', group: 'nearby-leisure', lngLat: [72.84600, 19.17450], approx: true },
  { id: 'goregaon-sports', name: 'Goregaon Sports Club', distance: '1.6 km', group: 'nearby-leisure', lngLat: [72.83355, 19.18563] },
  { id: 'mca-gymkhana', name: 'MCA Sachin Tendulkar Gymkhana', distance: '4.4 km', group: 'nearby-leisure', lngLat: [72.84228, 19.21382] },
  { id: 'vibgyor', name: 'Vibgyor Rise', distance: '1.5 km', group: 'nearby-schools', lngLat: [72.83398, 19.17635] },
  { id: 'billabong', name: 'Billabong High International School', distance: '3.5 km', group: 'nearby-schools', lngLat: [72.82125, 19.20244] },
  { id: 'orchids', name: 'Orchids The International School', distance: '1.4 km', group: 'nearby-schools', lngLat: [72.84092, 19.19384] },
  { id: 'witty', name: 'Witty International School', distance: '1.7 km', group: 'nearby-schools', lngLat: [72.84780, 19.17650], approx: true },
  { id: 'ryan', name: 'Ryan International School', distance: '1.3 km', group: 'nearby-schools', lngLat: [72.83324, 19.19102] },
  { id: 'kg-mittal', name: 'Smt. K. G. Mittal College', distance: '400 m', group: 'nearby-colleges', lngLat: [72.83782, 19.18479] },
  { id: 'atharva', name: 'Atharva College of Engineering & Management Studies', distance: '2.5 km', group: 'nearby-colleges', lngLat: [72.82706, 19.19772] },
  { id: 'gs-saraf', name: 'Ghanshyamdas Saraf College of Arts & Commerce', distance: '1.2 km', group: 'nearby-colleges', lngLat: [72.84238, 19.17737] },
  { id: 'dsims', name: 'Durgadevi Saraf Institute of Management Studies', distance: '1.1 km', group: 'nearby-colleges', lngLat: [72.84205, 19.17760] },
  { id: 'sun-hospital', name: 'Sun Multispeciality Hospital', distance: '700 m', group: 'nearby-health', lngLat: [72.84180, 19.19023] },
  { id: 'criticare', name: 'CritiCare Asia Multispeciality Hospital', distance: '1.1 km', group: 'nearby-health', lngLat: [72.83500, 19.18400], approx: true },
  { id: 'cloudnine', name: 'Cloudnine Hospital', distance: '1.5 km', group: 'nearby-health', lngLat: [72.83746, 19.17563] },
  { id: 'zenith', name: 'Zenith Multispeciality Hospital', distance: '2.0 km', group: 'nearby-health', lngLat: [72.83427, 19.19507] },
  { id: 'inorbit', name: 'Inorbit Mall, Malad', distance: '2.3 km', group: 'nearby-shopping', lngLat: [72.83515, 19.17311] },
  { id: 'infiniti', name: 'Infiniti Mall, Malad West', distance: '1.5 km', group: 'nearby-shopping', lngLat: [72.83537, 19.18513] },
]
export const places = [...connectivity, ...upcoming, ...nearbyPlaces]

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
      { text: '24x7 manned security and CCTV surveillance', image: spec('cctv'), focus: '50% 45%' },
      { text: 'Fire-fighting system', image: spec('fire-safety'), focus: '50% 42%' },
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
      { id: 'kids-pool', name: 'Kids pool', image: amenity('kids-pool') },
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
