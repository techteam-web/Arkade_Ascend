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
// PPT.pdf, supplied 9 Oct 2026), pages 5 and 7 to 9, as printed. Page 5's
// 9TH LANDMARK is drawn by LandmarkMark, page 6's "Malad's Neu Gen life has
// arrived" lockup by NeuGenMark.
export const neuGen = {
  landmark: {
    lead: 'Presenting our',
    line: 'In Malad-Goregaon corridor',
    label: 'Presenting our 9th landmark in Malad-Goregaon corridor',
  },
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
  { id: 'air', label: 'Airport' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'nearby', label: 'Nearby' },
]
// Roads and upcoming links placed at the client's own coordinates (WhatsApp,
// 14 Oct 2026): Link Road, S.V. Road, the Western Express Highway, GMLR, the
// coastal road and the twin tunnel. Distances are on foot from the project
// (client, 16 Oct 2026), by the FOSSGIS walking router over OpenStreetMap, rounded.
export const connectivity = [
  { id: 'link-road', name: 'Link Road', distance: '700 m', group: 'roads', point: [222 / 720, 352 / 840], lngLat: [72.836018, 19.186780] },
  { id: 'sv-road', name: 'S.V. Road', distance: '900 m', group: 'roads', point: [393 / 720, 360 / 840], lngLat: [72.846482, 19.188836] },
  { id: 'weh', name: 'Western Express Highway', distance: '2.6 km', group: 'roads', point: [611 / 720, 420 / 840], lngLat: [72.858792, 19.191738] },
  { id: 'malad-station', name: 'Malad Railway Station', distance: '1.3 km', group: 'transit', point: [436 / 720, 212 / 840], lngLat: [72.8486, 19.1867] },
  { id: 'metro-2a', name: 'Malad West Metro Station (Line 2A)', distance: '1.1 km', group: 'transit', point: [204 / 720, 245 / 840], lngLat: [72.8354, 19.1851] },
  { id: 'intl-airport', name: 'International Airport', distance: '13.4 km', group: 'air', point: [404 / 720, 812 / 840], offMap: true, lngLat: [72.8739, 19.0970] },
]
export const upcoming = [
  { id: 'gmlr', name: 'Goregaon–Mulund Link Road (GMLR)', group: 'upcoming', point: [505 / 720, 458 / 840], lngLat: [72.883897, 19.163945] },
  { id: 'coastal', name: 'Versova–Dahisar Coastal Road', group: 'upcoming', point: [40 / 720, 470 / 840], offMap: true, lngLat: [72.831650, 19.178504] },
  // Its Borivali portal, from OpenStreetMap (the tunnel is under construction).
  { id: 'twin-tunnel', name: 'Borivali–Thane Twin Tunnel', group: 'upcoming', point: [640 / 720, 40 / 840], offMap: true, lngLat: [72.868864, 19.221600] },
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
// address alone. Distances are on foot from the project (the FOSSGIS walking
// router over OpenStreetMap, 16 Oct 2026), rounded. They have no place on the brochure's own map.
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
  { id: 'mindspace', name: 'Mindspace Business Park', distance: '1.1 km', group: 'nearby-business', lngLat: [72.83279, 19.18031] },
  { id: 'nesco', name: 'NESCO IT Park', distance: '4.8 km', group: 'nearby-business', lngLat: [72.85491, 19.15224] },
  { id: 'nirlon', name: 'Nirlon Knowledge Park', distance: '4.7 km', group: 'nearby-business', lngLat: [72.85405, 19.15502] },
  { id: 'infinity-it', name: 'Infinity IT Park', distance: '4.9 km', group: 'nearby-business', lngLat: [72.88118, 19.17624] },
  { id: 'lotus', name: 'Lotus Corporate Park', distance: '5.5 km', group: 'nearby-business', lngLat: [72.85319, 19.14501] },
  { id: 'flags', name: 'Flag’s Restaurant Liberty Garden', distance: '800 m', group: 'nearby-dining', lngLat: [72.84170, 19.18960] },
  { id: 'liberty-restaurant', name: 'Liberty Restaurant', distance: '1.3 km', group: 'nearby-dining', lngLat: [72.83850, 19.19400], approx: true },
  { id: 'kake-da', name: 'Kake Da Hotel', distance: '850 m', group: 'nearby-dining', lngLat: [72.83560, 19.18920], approx: true },
  { id: 'food-studio', name: 'The Food Studio', distance: '950 m', group: 'nearby-dining', lngLat: [72.83600, 19.18330] },
  { id: 'sozo', name: 'Sozo Izakaya', distance: '1.4 km', group: 'nearby-dining', lngLat: [72.83417, 19.19466] },
  { id: 'the-resort', name: 'The Resort', distance: '7.6 km', group: 'nearby-leisure', lngLat: [72.79633, 19.17437] },
  { id: 'lemon-tree', name: 'Lemon Tree Premier', distance: '1.1 km', group: 'nearby-leisure', lngLat: [72.83520, 19.17900], approx: true },
  { id: 'radisson', name: 'Radisson Hotel', distance: '1.8 km', group: 'nearby-leisure', lngLat: [72.84600, 19.17450], approx: true },
  { id: 'goregaon-sports', name: 'Goregaon Sports Club', distance: '1.5 km', group: 'nearby-leisure', lngLat: [72.83355, 19.18563] },
  { id: 'mca-gymkhana', name: 'MCA Sachin Tendulkar Gymkhana', distance: '3.8 km', group: 'nearby-leisure', lngLat: [72.84228, 19.21382] },
  { id: 'vibgyor', name: 'Vibgyor Rise', distance: '1.4 km', group: 'nearby-schools', lngLat: [72.83398, 19.17635] },
  { id: 'billabong', name: 'Billabong High International School', distance: '3.4 km', group: 'nearby-schools', lngLat: [72.82125, 19.20244] },
  { id: 'orchids', name: 'Orchids The International School', distance: '1.3 km', group: 'nearby-schools', lngLat: [72.84092, 19.19384] },
  { id: 'witty', name: 'Witty International School', distance: '1.7 km', group: 'nearby-schools', lngLat: [72.84780, 19.17650], approx: true },
  { id: 'ryan', name: 'Ryan International School', distance: '1.3 km', group: 'nearby-schools', lngLat: [72.83324, 19.19102] },
  { id: 'kg-mittal', name: 'Smt. K. G. Mittal College', distance: '400 m', group: 'nearby-colleges', lngLat: [72.83782, 19.18479] },
  { id: 'atharva', name: 'Atharva College of Engineering & Management Studies', distance: '2.4 km', group: 'nearby-colleges', lngLat: [72.82706, 19.19772] },
  { id: 'gs-saraf', name: 'Ghanshyamdas Saraf College of Arts & Commerce', distance: '1.1 km', group: 'nearby-colleges', lngLat: [72.84238, 19.17737] },
  { id: 'dsims', name: 'Durgadevi Saraf Institute of Management Studies', distance: '1.1 km', group: 'nearby-colleges', lngLat: [72.84205, 19.17760] },
  { id: 'sun-hospital', name: 'Sun Multispeciality Hospital', distance: '700 m', group: 'nearby-health', lngLat: [72.84180, 19.19023] },
  { id: 'criticare', name: 'CritiCare Asia Multispeciality Hospital', distance: '1.1 km', group: 'nearby-health', lngLat: [72.83500, 19.18400], approx: true },
  { id: 'cloudnine', name: 'Cloudnine Hospital', distance: '1.5 km', group: 'nearby-health', lngLat: [72.83746, 19.17563] },
  { id: 'zenith', name: 'Zenith Multispeciality Hospital', distance: '1.5 km', group: 'nearby-health', lngLat: [72.83427, 19.19507] },
  { id: 'inorbit', name: 'Inorbit Mall, Malad', distance: '1.7 km', group: 'nearby-shopping', lngLat: [72.83515, 19.17311] },
  { id: 'infiniti', name: 'Infiniti Mall, Malad West', distance: '1.1 km', group: 'nearby-shopping', lngLat: [72.83537, 19.18513] },
]
export const places = [...connectivity, ...upcoming, ...nearbyPlaces]

// Brochure pages 10, 12, 14 and 21. Photographs are the brochure's own and
// show "Representational image" (the page's default note); only the project's
// own renders (the arrival lobby) are marked as the architect's impression.
// `focus` keeps the subject in frame.
// The tower and residences copy was revised by the client on 13 Oct 2026
// (WhatsApp message), and is set here as sent.
const spec = name => `/brochure/specs/${name}.webp`
export const specifications = [
  {
    // The tower: the final exterior render cam02-twilight (as in the Gallery), not the brochure's stock image.
    id: 'tower', title: 'The tower', line: 'Rise to a life extraordinaire',
    image: '/gallery/exterior/cam02-twilight-1600.webp', srcSet: '/gallery/exterior/cam02-twilight-1600.webp 1280w, /gallery/exterior/cam02-twilight-2880.webp 2304w', note: 'Architect’s impression', focus: '50% 42%',
    items: [
      { text: 'Contemporary 37 storey tower' },
      { text: 'A grand double-height arrival experience' },
      { text: 'First habitable floor starts at Level 6, ~63 feet of elevation from ground level' },
      { text: 'Club Ark Leisure Experiences Across Ground, Level 5 & Level 6' },
      { text: '100% surface car parking' },
      { text: 'Hi-tech security system' },
      { text: 'Centrally nestled. Seamlessly connected. Elevated living.' },
    ],
  },
  {
    id: 'arrival', title: 'Arrival', line: 'A grand arrival experience sets the tone from the very first step',
    image: '/gallery/amenities/lobby-1600.webp', srcSet: '/gallery/amenities/lobby-1600.webp 1600w, /gallery/amenities/lobby-2880.webp 2880w', note: 'Architect’s impression', focus: '50% 58%',
    items: [
      { text: 'Grand, double-height welcome lobby' },
      { text: 'Reception & waiting lounge' },
      { text: 'High-speed elevators' },
    ],
  },
  {
    id: 'residences', title: 'Residences', line: 'Abodes that redefine the norms of design',
    items: [
      { text: 'Elite 2 & 3 bed residences' },
      { text: 'Expansive living & dining spaces', image: spec('living-dining') },
      { text: 'Exclusive sundeck apartments' },
      { text: 'Jodi apartment option available' },
      { text: 'Spacious, airy bedrooms', image: spec('bedroom') },
      { text: 'Abundant natural light & ventilation' },
      { text: 'Thoughtfully planned kitchens with premium fittings', image: spec('kitchen'), focus: '50% 45%' },
      { text: 'Provisions for dishwasher & washing machine' },
    ],
  },
  {
    id: 'safety', title: 'Safety & convenience', line: 'Exceptional convenience with absolute security',
    items: [
      { text: '100% surface car parking, designed for ease', image: spec('parking') },
      { text: 'Seamless circular ramp access for effortless parking' },
      { text: 'EV charging provisions for future ready living' },
      { text: 'High-tech security system' },
      { text: '24x7 manned security and CCTV surveillance', image: spec('cctv'), focus: '50% 45%' },
      { text: 'Fire-fighting system', image: spec('fire-safety'), focus: '50% 42%' },
    ],
  },
]

// Brochure pages 15 to 20: Club Ark. Group names are short labels for the
// page; each group's line is the brochure's own. Revised by the client on
// 13 Oct 2026: Gatherings renamed Community living, the music studio
// replaced by a golf simulator, a Guest suite group, a café and adult gaming added. The
// project's renders replace the brochure photographs they cover (`rendered`);
// the lap pool shows its brochure photograph and then two renders, in turn
// (`images`).
const amenity = name => `/brochure/amenities/${name}.webp`
// The project's own renders (interior and landscape final renders, supplied
// 14 Oct 2026, public/gallery/amenities/), which replace the brochure's photographs
// where there is one (client, 14 Oct 2026); marked as the architect's impression.
export const IMPRESSION = 'Architect’s impression'
export const rendered = (name, focus) => ({
  image: `/gallery/amenities/${name}-1600.webp`,
  srcSet: `/gallery/amenities/${name}-1600.webp 1600w, /gallery/amenities/${name}-2880.webp 2880w`,
  note: IMPRESSION, ...(focus && { focus }),
})
const slideOf = ({ image, srcSet, note, focus }) => ({ src: image, srcSet, note, focus })
export const club = { name: 'Club Ark', line: 'Affluent club indulgences that rise to your standards' }
export const amenityGroups = [
  {
    id: 'pools', label: 'Pools', line: 'Experiences curated for ultimate relaxation',
    items: [
      {
        id: 'lap-pool', name: 'Lap Pool – Swim. Stretch. Unwind.', image: amenity('lap-pool'),
        images: [
          { src: amenity('lap-pool') },
          slideOf(rendered('lap-pool-aerial', '50% 55%')),
          slideOf(rendered('lap-pool-evening', '30% 62%')),
        ],
      },
      { id: 'jacuzzi', name: 'Jacuzzi – Immerse in Relaxation.', image: amenity('jacuzzi'), focus: '40% 50%' },
      { id: 'kids-pool', name: 'Kids’ Pool – Little Splashes, Big Smiles.', image: amenity('kids-pool') },
      { id: 'wet-lounger', name: 'Wet Lounger – Lounge in Unhurried Luxury.', image: amenity('wet-lounger'), focus: '50% 68%' },
      { id: 'bubble-pool', name: 'Bubble pool - A Soothing Escape', image: amenity('bubble-pool'), focus: '50% 38%' },
    ],
  },
  {
    id: 'active', label: 'Active living', line: 'An Ecosystem Planned for Active Living',
    items: [
      { id: 'box-cricket', name: 'Net Cricket – Where Every Shot Counts.', image: amenity('box-cricket') },
      { id: 'multipurpose-court', name: 'Multipurpose Court – One Court. Endless Possibilities.', ...rendered('multipurpose-court', '48% 62%') },
      { id: 'pickleball', name: 'Pickleball Court – Serve Up the Fun.', ...rendered('pickleball', '58% 62%') },
      { id: 'kids-play', name: 'Kids’ Play Zone – Little Adventures, Endless Smiles.', ...rendered('kids-play-evening', '40% 52%') },
      { id: 'creche', name: 'Creche – Nurturing Little Minds with Loving Care.', ...rendered('creche', '45% 58%') },
    ],
  },
  {
    id: 'fitness', label: 'Fitness', line: 'An ambience that brings out your strongest self',
    items: [
      { id: 'gym', name: 'Gym – Strengthen Your Best Self.', ...rendered('gym', '62% 55%') },
      { id: 'yoga-deck', name: 'Yoga Deck – Find Your Inner Balance.', image: amenity('yoga-deck') },
      { id: 'meditation-zone', name: 'Meditation Zone – Pause. Breathe. Reconnect.', image: amenity('meditation-zone') },
      { id: 'kick-boxing', name: 'Kickboxing Studio – Unleash Your Inner Power.', ...rendered('kick-boxing', '38% 55%') },
    ],
  },
  {
    id: 'pursuits', label: 'Pursuits', line: 'A private escape for your favourite pursuits',
    items: [
      { id: 'indoor-games', name: 'Indoor Games Arena – Play Beyond the Ordinary.', ...rendered('indoor-games', '55% 55%') },
      { id: 'adult-gaming', name: 'The Game Lounge – Let the Fun Begin.', ...rendered('game-zone', '40% 55%') },
      { id: 'golf-simulator', name: 'Golf Simulator – Perfect Your Swing.', ...rendered('golf-simulator', '45% 50%') },
      { id: 'private-screening', name: 'Private Screening Theatre – Your Own Private Movie Escape.', ...rendered('private-screening', '62% 55%') },
      { id: 'hobby-studio', name: 'Hobby Studio – Discover. Create. Express.', ...rendered('hobby-studio', '42% 50%') },
      { id: 'cafe', name: 'Café – Sip, Savour, Socialise.', ...rendered('cafe', '50% 60%') },
    ],
  },
  {
    id: 'community', label: 'Community living', line: 'Where good company meets the perfect setting',
    items: [
      { id: 'banquet-hall', name: 'Banquet Hall with Outdoor Deck – Celebrations That Flow Beyond Walls.', ...rendered('banquet-hall', '42% 55%') },
      { id: 'amphitheatre', name: 'Amphitheatre with Central Lawn – Where Moments Take Centre Stage.', ...rendered('amphitheatre-lawn', '45% 62%') },
      { id: 'party-hall', name: 'Party Hall – Make Every Celebration Memorable.', image: amenity('party-hall'), focus: '50% 55%' },
      { id: 'senior-seating', name: 'Senior Citizens’ Social Corner – Connect, Converse & Cherish.', image: amenity('senior-seating'), focus: '50% 62%' },
    ],
  },
  {
    id: 'guest-suite', label: 'Guest suite', line: 'A thoughtful stay for those you welcome',
    items: [
      { id: 'guest-suite', name: 'Guest Suite', ...rendered('guest-suite', '50% 55%') },
    ],
  },
]
