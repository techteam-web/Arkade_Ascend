// TEMPLATE CONTENT — not from the brochure.
// The gallery and the model's floor data below are placeholders that show
// the layout. Replace them with approved content before any client use.
// (Specifications and amenities now come from the brochure, in project.js;
// Wing A's floor plans from the plan sheets, in floorPlans.js.)
// The pages label them "indicative" on screen while `isTemplate` is true.
// Leave `image` empty to show the gold placeholder frame until renders arrive.

export const isTemplate = true

// The gallery. Exterior is the project's own final renders (supplied
// 6 Oct 2026, public/gallery/exterior/); the other categories are still
// concept images. Each render comes in two widths (`srcSet`); `focus` keeps
// the tower in the gallery's 16:10 frame, and the tall views are shown whole
// (`fit: 'contain'`). Full screen always shows the whole render.
const RENDER_NOTE = 'Exterior render · representational'
const render = (name, [width, height], alt, look = {}) => ({
  src: `/gallery/exterior/${name}-1600.webp`,
  srcSet: `/gallery/exterior/${name}-1600.webp ${Math.round(width * 1600 / Math.max(width, height))}w, /gallery/exterior/${name}-2880.webp ${Math.round(width * 2880 / Math.max(width, height))}w`,
  aspect: width / height, category: 'Exterior', alt, note: RENDER_NOTE, ...look,
})

export const gallery = [
  render('cam12-day', [1600, 1000], 'Arkade Ascend rising above the street in daylight, its two wings and landscaped podium framed by trees'),
  render('cam28-day', [1600, 889], 'Aerial view of the two wings of Arkade Ascend opening in a V around the podium pool, among green surroundings', { focus: '45% 50%' }),
  render('cam40-day', [1600, 615], 'The street-level arrival: the landscaped podium and the Arkade Ascend entrance along the road', { focus: '80% 50%' }),
  render('cam02-day', [1280, 1600], 'The full height of Arkade Ascend in daylight, seen from the street', { fit: 'contain' }),
  render('cam02-twilight', [1280, 1600], 'The full height of Arkade Ascend at twilight, its homes lit against a deep pink sky', { fit: 'contain' }),
  render('cam38-twilight', [1600, 889], 'Arkade Ascend at twilight above the trees, the city and the sunset beyond', { focus: '25% 50%' }),
  render('cam27-evening', [1600, 889], 'Aerial evening view of Arkade Ascend, lit from podium to crown above its pool'),
  render('cam06-evening', [1600, 640], 'The crown of Arkade Ascend at evening, its name on the facade and the city lights beyond', { focus: '15% 50%' }),
  { src: '/gallery/interior.png', category: 'Interior', alt: 'Concept living room with a curved sofa and panoramic sunset city views' },
  { src: '/gallery/amenities.png', category: 'Amenities', alt: 'Concept rooftop infinity pool with landscaped seating at sunset' },
  { src: '/brochure/lifestyle-arrival.webp', category: 'Lifestyle', alt: 'A couple arriving at a grand, warmly lit entrance beside a chauffeured car' },
  { src: '/mumbai-dusk.png', category: 'Lifestyle', alt: 'Illustrative Mumbai skyline and distant hills at sunset' },
]

// The architectural model of the tower (public/models, optimised from the
// supplied GLB). Floor levels are read from the model's floor names and
// heights, in model metres with the ground at 0; confirm against the approved
// plans. Floors 1 to 5 are the podium: the model has no levels for them, so
// they share its height evenly below the 6th floor (3.5 m each). Each wing
// lists the floors that hold homes. Wing A has homes on every floor (as
// instructed, 8 Oct 2026, pending the approved floor list); Wing B is
// unchanged until its plans are supplied. Wing outlines are convex [x, z]
// footprints measured on the model.
export const buildingModel = {
  src: '/models/ascend-block.glb',
  towerFloor: 6,        // the first floor above the podium
  towerY: 21,           // floor line of the 6th floor
  floorHeight: 3.15,
  top: 131.25,
  wings: [
    { id: 'A', floors: [1, 37], refuge: [], outline: [[-49.8, 15.5], [-49.4, 14.1], [-32.7, 9.7], [-23, 9.1], [-10, 9.2], [-6.4, 9.6], [6.9, 11.9], [9.8, 14.1], [9.8, 21], [8.6, 23.4], [-1.8, 33.2], [-29.4, 33.2], [-49.4, 23.9], [-49.8, 21.8]] },
    { id: 'B', floors: [6, 37], refuge: [8], outline: [[7, 11.5], [9.5, -2.5], [22, -18.3], [36.9, -23.6], [42.9, -19.4], [47.3, -16], [49.1, -14], [39.3, 1.6], [32.8, 10.5], [29.2, 15.1], [19.3, 21.1], [16.6, 19]] },
  ],
  // Where the model stands on the Location map, in its lighter map copy
  // (tools/map-model). `lngLat` is the model's origin; `bearing` is the
  // compass direction its -z axis faces (its +x axis faces bearing + 90).
  // Fitted to the site in OpenStreetMap, Nutan Ayojan Nagar on Liberty Garden
  // (Cross) Road No. 4, the brochure's site address: the model's own site
  // outline matches the plot's (93% of it inside), with its straight boundary
  // wall on the road. `site` is that plot merged with the model's ground
  // (pulled in 1 m, so neighbours that only touch the wall stay); the map
  // leaves out the old buildings whose centre lies inside it. `ground` and
  // `footprints` are traced from the model (its site, and its two wings above
  // 25 m) for its shadow and its plan in the 2D view. Indicative: confirm
  // against the approved site plan.
  map: {
    src: '/models/ascend-map.glb',
    lngLat: [72.83976, 19.185528],
    bearing: 271.2,
    site: [[72.8394747, 19.186254], [72.8397457, 19.1861861], [72.8398242, 19.1859532], [72.8401262, 19.1859464], [72.840081, 19.1847613], [72.8396221, 19.1849106], [72.839672, 19.1853086], [72.8395959, 19.1853425], [72.839584, 19.1853855], [72.8396078, 19.1854127], [72.8395293, 19.1855438], [72.8394271, 19.1855664], [72.8394223, 19.1857836], [72.8394794, 19.1859328], [72.8394604, 19.1860979], [72.8394747, 19.186254]],
    ground: [[72.8394057, 19.185693], [72.8394148, 19.1857955], [72.8395817, 19.1862189], [72.839776, 19.1860228], [72.8397976, 19.1859914], [72.8398512, 19.1859366], [72.8399485, 19.1859233], [72.8399901, 19.1859469], [72.8400502, 19.1859538], [72.8400912, 19.1859498], [72.8401232, 19.1859231], [72.8400862, 19.1848651], [72.8399964, 19.1848343], [72.8399502, 19.1848353], [72.8398635, 19.184863], [72.8397774, 19.185228], [72.8397448, 19.1853052], [72.8397248, 19.1853284], [72.8396727, 19.1852968], [72.839588, 19.185336], [72.8395753, 19.1853851], [72.8396492, 19.1854732], [72.8396256, 19.1855665], [72.8395409, 19.185534], [72.8394229, 19.1855412]],
    footprints: [
      [[72.8395431, 19.1858646], [72.8395783, 19.1859079], [72.8396086, 19.1858861], [72.8395998, 19.1858749], [72.8396065, 19.1858682], [72.839617, 19.1858794], [72.8396189, 19.1858875], [72.8395819, 19.1859176], [72.8395906, 19.1859206], [72.8396169, 19.1859511], [72.8396153, 19.1859576], [72.8396363, 19.1859767], [72.8397255, 19.1859066], [72.839746, 19.1859029], [72.839778, 19.1858778], [72.8397815, 19.1858826], [72.8398301, 19.1858361], [72.8398422, 19.1858391], [72.8399045, 19.1857922], [72.8399079, 19.1857889], [72.8399043, 19.1857808], [72.8398656, 19.1857376], [72.839869, 19.1857359], [72.8398813, 19.1857487], [72.8399015, 19.185732], [72.8399136, 19.1857383], [72.839964, 19.185695], [72.8398675, 19.1855861], [72.8398134, 19.1856198], [72.8398222, 19.1856326], [72.8397869, 19.1856594], [72.8397904, 19.1856642], [72.8397854, 19.1856692], [72.8397959, 19.185682], [72.8397825, 19.1856937], [72.8397615, 19.1856729], [72.8397766, 19.1856612], [72.8397362, 19.1856132], [72.8396857, 19.1856516], [72.839686, 19.1856663], [72.8396557, 19.1856913], [72.8396385, 19.1856884], [72.839588, 19.1857285], [72.839639, 19.1857894], [72.8396121, 19.1858111], [72.8396034, 19.1858031], [72.8396018, 19.185808], [72.8396087, 19.1858095], [72.8395666, 19.1858429], [72.8395647, 19.1858365], [72.8395596, 19.1858366], [72.8395684, 19.1858478]],
      [[72.8398374, 19.1853098], [72.8398443, 19.1854677], [72.8398956, 19.185465], [72.8398967, 19.1854357], [72.8399087, 19.1854355], [72.8399077, 19.1854697], [72.8398786, 19.1854719], [72.8398774, 19.1854915], [72.8398672, 19.1854965], [72.8398726, 19.185586], [72.8398932, 19.1855872], [72.8398954, 19.1856133], [72.8399228, 19.1856127], [72.839926, 19.1856012], [72.8399312, 19.1856028], [72.8399314, 19.1856125], [72.8399605, 19.185612], [72.839962, 19.1856005], [72.839986, 19.1856017], [72.8399842, 19.1855219], [72.839979, 19.1855204], [72.8399751, 19.1854993], [72.8399888, 19.1854974], [72.8399906, 19.1855039], [72.8400746, 19.1855038], [72.840072, 19.1853866], [72.8400616, 19.1853803], [72.8400607, 19.1853412], [72.8400708, 19.1853345], [72.8400691, 19.1852564], [72.8400536, 19.1852534], [72.8400533, 19.1852404], [72.8399746, 19.1852403], [72.8399741, 19.1852175], [72.8399792, 19.1852158], [72.8399777, 19.1851491], [72.8399896, 19.1851439], [72.8399887, 19.1851049], [72.8399801, 19.1851018], [72.8399794, 19.1850725], [72.8398785, 19.1850761], [72.8398794, 19.185195], [72.8398915, 19.1852013], [72.8398919, 19.1852192], [72.8399262, 19.1852201], [72.8399217, 19.1852512], [72.8399224, 19.1852837], [72.8399277, 19.1852901], [72.8399209, 19.1852919], [72.8399194, 19.1853001], [72.8399074, 19.1852987], [72.8399089, 19.1852905], [72.8399174, 19.1852903], [72.8399169, 19.1852643], [72.8399066, 19.1852629], [72.8399058, 19.1852287], [72.839839, 19.1852284]],
    ],
  },
}
