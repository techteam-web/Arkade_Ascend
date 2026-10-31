// The Ecodeck layout, `Ascend_A2_Eco Deck Plan.pdf` (supplied 30 Oct 2026): its
// picture is cropped to public/ecodeck/ (see public/asset-notes.md) and its key
// is transcribed as printed. `at` is where each number stands on the picture,
// as a fraction of its width and height (measured on the 1684 x 921 crop).
const WIDTH = 1684
const HEIGHT = 921
const amenity = (id, name, x, y) => ({ id, name, at: [x / WIDTH, y / HEIGHT] })
const file = width => `/ecodeck/layout-${width}.webp`

export const ecodeck = {
  ratio: 6081 / 3325,
  src: file(3200),
  srcSet: [1600, 3200, 6000].map(width => `${file(width)} ${width}w`).join(', '),
  alt: 'Ecodeck layout, level 5: an aerial view of the deck with its amenities numbered 1 to 25',
  groups: [
    { title: 'A Wing', items: [
      amenity(1, 'Banquet Hall with Outdoor Deck', 360, 520),
      amenity(2, 'Party Hall', 547, 455),
      amenity(3, 'Hobby Studio', 669, 452),
      amenity(4, 'Indoor Games Arena', 778, 653),
      amenity(5, 'Golf Simulator', 1008, 542),
      amenity(6, 'Private Screening', 956, 476),
    ] },
    { title: 'B Wing', items: [
      amenity(7, 'Senior Citizen’s Social Corner', 1107, 423),
      amenity(8, 'The Game Lounge', 1134, 257),
      amenity(9, 'Gym with Outdoor Area', 1342, 364),
      amenity(10, 'Kickboxing Studio', 1401, 187),
      amenity(11, 'Café', 1346, 143),
    ] },
    { title: 'Podium', items: [
      amenity(12, 'Amphitheatre with Central Lawn', 967, 357),
      amenity(13, 'Flag Hosting', 1010, 268),
      amenity(14, 'Musical Playzone', 1077, 329),
      amenity(15, 'Tot-Lot Area', 1311, 102),
      amenity(16, 'Kid’s Play Zone', 1514, 142),
      amenity(17, 'Rock Climbing', 1472, 160),
      amenity(18, 'Wet Lounger', 1442, 619),
      amenity(19, 'Lap Pool', 1285, 619),
      amenity(20, 'Kids Pool', 993, 637),
      amenity(21, 'Jacuzzi', 1089, 538),
      amenity(22, 'Bubble Pool', 1084, 496),
    ] },
    { title: 'Ground Floor', items: [
      amenity(23, 'Multipurpose Court', 717, 306),
      amenity(24, 'Pickleball Court', 1036, 169),
      amenity(25, 'Net Cricket', 1604, 249),
    ] },
  ],
}

export const amenities = ecodeck.groups.flatMap(group => group.items)
