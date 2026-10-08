// Wing A floor plans, from the client's plan sheets (supplied 8 Oct 2026):
// the 9th-floor set, which serves as the typical floor for every floor of
// Wing A, and the 7th- and 36th-floor sheets, whose Unit 05 differs. Areas,
// configurations and room sizes are transcribed from the sheets as printed
// (the source folder also holds the full sheets as JPGs). The drawings are the
// sheets' PNG cut-outs, trimmed to the plan (public/plans/wing-a).
// Wing B has no plans yet; it is left out until they are supplied.

export const wing = 'A'
export const floorRange = [1, 37]

const drawing = (name, [width, height], sizes = [1600, 3000]) => ({
  src: `/plans/wing-a/${name}-${sizes[0]}.webp`,
  srcSet: sizes.map(size => `/plans/wing-a/${name}-${size}.webp ${size}w`).join(', '),
  ratio: width / height,
})

// The typical floor of Wing A, with each home's outline traced on the
// 2400-wide drawing (`viewBox`), and a point inside it for its label.
export const typicalPlan = {
  ...drawing('typical', [13644, 5838], [2400, 4800]),
  viewBox: [2400, 1027],
  zones: {
    '01': { label: [300, 330], points: '55,222 345,222 345,245 405,245 405,218 558,218 558,262 660,262 660,612 555,612 555,592 412,592 412,612 355,612 355,660 195,660 195,615 65,615 65,300 55,300' },
    '02': { label: [930, 270], points: '705,45 1188,45 1188,328 1140,328 1140,305 975,305 975,360 860,360 860,315 705,315' },
    '03': { label: [1440, 270], points: '1188,45 1725,45 1725,258 1602,258 1602,302 1235,302 1235,328 1188,328' },
    '04': { label: [2080, 230], points: '1750,183 1855,183 1855,150 2240,150 2240,238 2350,238 2350,505 2310,505 2310,610 1970,610 1970,590 1895,590 1895,410 1830,410 1830,405 1750,405' },
    '05': { label: [1560, 690], points: '1287,595 1345,595 1345,658 1675,658 1675,570 1868,570 1868,640 1898,640 1898,975 1410,975 1410,922 1287,922' },
    '06': { label: [1020, 900], points: '905,665 1240,665 1240,595 1287,595 1287,922 1170,922 1170,948 1092,948 1092,975 840,975 840,915 775,915 775,755 905,755' },
  },
}

// Room sizes as the sheets print them (width × depth, feet and inches).
// Passages, shafts (S.S) and chajjas are left out.
const r = (name, size) => ({ name, size: size.replace(/(\d+)'(\d+)"/g, '$1′$2″').replace('x', ' × ') })

export const planTypes = [
  {
    id: '01', unit: '01', configuration: '3 BHK', bedrooms: 3, bathrooms: 3,
    reraArea: 1310, deck: 60, totalArea: 1370, features: ['powder', 'wardrobe', 'utility'],
    image: drawing('unit-01', [4735, 3470]),
    rooms: [
      r('Living & dining', `12'0"x23'6"`), r('Kitchen', `8'0"x10'8"`), r('M. bedroom', `11'0"x18'0"`),
      r('C. bedroom', `11'0"x14'0"`), r('A. bedroom', `11'0"x15'0"`), r('Walk-in wardrobe', `5'3"x8'6"`),
      r('M. toilet', `5'3"x8'6"`), r('C. toilet', `5'0"x8'6"`), r('A. toilet', `5'0"x8'6"`),
      r('Powder toilet', `3'6"x6'0"`), r('Utility', `4'0"x6'0"`), r('Foyer', `8'6"x4'6"`), r('Deck', `12'0"x5'0"`),
    ],
  },
  {
    id: '02', unit: '02', configuration: '2 BHK', bedrooms: 2, bathrooms: 2,
    reraArea: 727, deck: 37, totalArea: 764, features: [],
    image: drawing('unit-02', [4788, 2861]),
    rooms: [
      r('Living', `10'0"x16'0"`), r('Dining', `8'0"x8'0"`), r('Kitchen', `7'6"x11'0"`),
      r('M. bedroom', `10'8"x14'9"`), r('C. bedroom', `10'0"x11'0"`), r('M. toilet', `8'0"x4'3"`),
      r('C. toilet', `8'0"x4'3"`), r('Foyer', `3'11"x1'6"`), r('Deck', `8'0"x4'8"`),
    ],
  },
  {
    id: '03', unit: '03', configuration: '2 BHK', bedrooms: 2, bathrooms: 2,
    reraArea: 745, deck: 37, totalArea: 782, features: [],
    image: drawing('unit-03', [5342, 2863]),
    rooms: [
      r('Living', `10'0"x16'0"`), r('Dining', `7'6"x8'0"`), r('Kitchen', `7'6"x11'0"`),
      r('M. bedroom', `10'0"x15'3"`), r('C. bedroom', `10'0"x11'0"`), r('M. toilet', `4'3"x8'6"`),
      r('C. toilet', `8'3"x4'3"`), r('Foyer', `3'11"x1'6"`), r('Deck', `8'0"x4'8"`),
    ],
  },
  {
    id: '04', unit: '04', configuration: '3 BHK', bedrooms: 3, bathrooms: 3,
    reraArea: 1215, deck: 72, totalArea: 1287, features: ['powder', 'wardrobe'],
    image: drawing('unit-04', [4396, 3416]),
    rooms: [
      r('Living & dining', `19'0"x16'6"`), r('Kitchen', `8'0"x11'6"`), r('M. bedroom', `11'2"x14'8"`),
      r('C. bedroom', `10'0"x14'8"`), r('A. bedroom', `12'4"x14'8"`), r('Walk-in wardrobe', `4'8"x7'2"`),
      r('M. toilet', `5'0"x8'6"`), r('C. toilet', `5'0"x8'6"`), r('A. toilet', `5'0"x8'6"`),
      r('Powder toilet', `6'2"x4'0"`), r('Foyer', `8'6"x4'6"`), r('Deck', `19'0"x4'0"`),
    ],
  },
  {
    id: '05', unit: '05', configuration: '3 BHK', bedrooms: 3, bathrooms: 3,
    reraArea: 1133, deck: 39, totalArea: 1172, features: ['powder', 'wardrobe'],
    image: drawing('unit-05', [4894, 3320]),
    rooms: [
      r('Living', `11'0"x17'0"`), r('Dining', `8'0"x8'0"`), r('Kitchen', `7'6"x14'0"`),
      r('M. bedroom', `10'6"x14'0"`), r('C. bedroom', `10'0"x14'0"`), r('A. bedroom', `15'2"x10'0"`),
      r('Walk-in wardrobe', `4'8"x5'5"`), r('M. toilet', `4'8"x8'0"`), r('C. toilet', `4'10"x8'0"`),
      r('A. toilet', `8'4"x4'11"`), r('Powder toilet', `6'5"x4'3"`), r('Foyer', `4'9"x5'7"`), r('Deck', `10'2"x4'0"`),
    ],
  },
  {
    // The 7th-floor sheet prints the dining as 2'11" x 11'9".
    id: '05-7', unit: '05', floor: 7, configuration: '2.5 BHK', bedrooms: 2, bathrooms: 3,
    reraArea: 927, deck: 39, totalArea: 966, features: ['study', 'wardrobe'],
    image: drawing('unit-05-floor-7', [4900, 3114]),
    rooms: [
      r('Living', `11'0"x17'0"`), r('Dining', `2'11"x11'9"`), r('Kitchen', `7'6"x10'3"`),
      r('M. bedroom', `10'6"x14'0"`), r('C. bedroom', `10'0"x10'3"`), r('Study room', `11'6"x8'2"`),
      r('Walk-in wardrobe', `4'8"x5'5"`), r('M. toilet', `4'8"x8'0"`), r('C. toilet', `4'10"x8'0"`),
      r('Toilet', `7'0"x3'6"`), r('Foyer', `4'9"x5'7"`), r('Deck', `10'2"x4'0"`),
    ],
  },
  {
    // On the 36th floor Unit 05 extends over Unit 06's place (see the
    // sheet's key plan), so that floor has no Unit 06.
    id: '05-36', unit: '05', floor: 36, configuration: '3.5 BHK', bedrooms: 3, bathrooms: 4,
    reraArea: 1433, deck: 80, totalArea: 1513, features: ['powder', 'study', 'wardrobe'],
    image: drawing('unit-05-floor-36', [5684, 2621]),
    rooms: [
      r('Living', `22'0"x10'6"`), r('Dining', `11'0"x6'6"`), r('Kitchen', `7'6"x14'0"`),
      r('M. bedroom', `10'6"x14'0"`), r('C. bedroom', `10'0"x14'0"`), r('A. bedroom', `15'2"x10'0"`),
      r('Study room', `9'6"x10'0"`), r('Walk-in wardrobe', `4'8"x5'5"`), r('M. toilet', `4'8"x8'0"`),
      r('C. toilet', `4'10"x8'0"`), r('A. toilet', `8'4"x4'1"`), r('Toilet', `4'10"x8'0"`),
      r('Powder toilet', `6'5"x4'3"`), r('Foyer', `4'9"x5'7"`), r('Deck', `20'4"x4'0"`),
    ],
  },
  {
    id: '06', unit: '06', configuration: '2 BHK', bedrooms: 2, bathrooms: 2,
    reraArea: 753, deck: 39, totalArea: 792, features: [],
    image: drawing('unit-06', [4416, 3328]),
    rooms: [
      r('Living', `10'6"x17'0"`), r('Dining', `4'8"x10'10"`), r('Kitchen', `12'4"x7'6"`),
      r('M. bedroom', `10'0"x14'3"`), r('C. bedroom', `10'0"x11'0"`), r('M. toilet', `5'0"x8'0"`),
      r('C. toilet', `4'10"x8'0"`), r('Foyer', `4'9"x5'7"`), r('Deck', `9'8"x4'0"`),
    ],
  },
]

// The six homes of the typical floor, in sheet order.
export const positions = ['01', '02', '03', '04', '05', '06']

// Floors that differ from the typical one: the plan type each position takes
// there, or null where the floor has no such home.
export const floorExceptions = {
  7: { '05': '05-7' },
  36: { '05': '05-36', '06': null },
}
