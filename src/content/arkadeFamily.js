// The Arkade family: pages 1 to 4 of the developer's customer presentation
// (Ascend_Customer PPT.pdf, supplied 9 Oct 2026), transcribed as printed.
// Photographs are in public/arkade-family/; the deck marks them
// "Representative Image". The Mumbai map is the deck's own vector map,
// recoloured (public/asset-notes.md).

// Page 1.
export const legacy = {
  title: 'Embracing victory, embodying success',
  figures: [
    { value: 40, plus: true, label: 'Years of legacy' },
    { value: 33, label: 'Projects delivered' },
    { value: 5.8, decimals: 1, plus: true, label: 'Million sq.ft. developed' },
    { value: 5800, plus: true, label: 'Happy families' },
    { value: 7, label: 'Projects ongoing' },
    { value: 3, plus: true, label: 'Million sq.ft. under development' },
    { value: 10, plus: true, label: 'Projects upcoming' },
    // A year: shown as it is, never counted up.
    { text: '2024', label: 'Listed on BSE & NSE' },
  ],
  // The deck prints the first as "ISO 9001:201", its year cut short; only
  // the standard is shown until the full version is confirmed.
  certifications: [
    { name: 'ISO 9001', scope: 'Quality management systems' },
    { name: 'ISO 45001:2018', scope: 'Occupational health & safety management systems' },
  ],
  image: { src: '/arkade-family/legacy-skyline-1600.webp', srcSet: '/arkade-family/legacy-skyline-1600.webp 1600w, /arkade-family/legacy-skyline-2880.webp 2880w', alt: 'A city of residential towers among trees at sunset, a rainbow over the skyline' },
}

// Pages 2 and 3. Status as the deck colours it: completed (grey), ongoing
// (orange), coming soon (green, with how many). `pin` is the locality's
// place on the map, in the map's own coordinates (viewBox 1150 15 710 1050);
// `side` is where its label sits.
export const portfolio = {
  title: 'Scaling the length & breadth of Mumbai',
  map: { src: '/arkade-family/mumbai-map.svg', box: [1150, 15, 710, 1050] },
  regions: [
    {
      id: 'south', name: 'South Mumbai', localities: [
        { name: 'Carmichael Road', pin: [1252, 757], side: 'left', projects: [['Arkade Rise']] },
        { name: 'Tardeo', pin: [1298, 782], side: 'left', projects: [['Fortuna']] },
        { name: 'Mazgaon', pin: [1327, 781], side: 'right', projects: [['Wallace Fortuna']] },
      ],
    },
    {
      id: 'western', name: 'Western Suburbs', localities: [
        { name: 'Virar', pin: [1405, 66], side: 'right', projects: [['Acropolis']] },
        { name: 'Vasai', pin: [1418, 109], side: 'right', projects: [['Shubh Innov8'], ['Shubh Industrial Estate']] },
        { name: 'Mira Road', pin: [1418, 145], side: 'right', projects: [['White Lotus'], ['Arkade Art']] },
        { name: 'Dahisar', pin: [1372, 168], side: 'right', projects: [], comingSoon: 1 },
        { name: 'Borivali', pin: [1305, 200], side: 'right', projects: [['Green Avenue I'], ['Green Avenue II'], ['Park Side'], ['Harmony'], ['Casa Bella'], ['Gangadhar Nagar'], ['Arkade Crown']], comingSoon: 1 },
        { name: 'Kandivali', pin: [1318, 261], side: 'right', projects: [['Vineet Apartments'], ['Arkade Bhoomi Heights'], ['Bhoomi Arkade I'], ['Bhoomi Arkade II']] },
        { name: 'Malad', pin: [1358, 311], side: 'right', projects: [['Jayshree'], ['Arkade Serene'], ['Arkade Eden']], comingSoon: 2 },
        { name: 'Goregaon', pin: [1315, 381], side: 'right', projects: [['Arkade Adornia'], ['Arkade Aspire'], ['Arkade Views', 'ongoing'], ['Arkade Vistas', 'ongoing'], ['Arkade Evoke', 'ongoing']], comingSoon: 2 },
        { name: 'Andheri', pin: [1284, 448], side: 'right', projects: [['Arkade Prime']], comingSoon: 2 },
        { name: 'Vile Parle', pin: [1329, 516], side: 'right', projects: [['Jeevan Sarita'], ['Om Kushal'], ['Mahant'], ['New Bharat Villa'], ['Darshan by Arkade'], ['Arkade Pearl', 'ongoing']] },
        { name: 'Santacruz', pin: [1326, 609], side: 'right', projects: [['Arkade Aura'], ['Arkade Sapphire', 'ongoing']] },
      ],
    },
    {
      id: 'eastern', name: 'Eastern Suburbs', localities: [
        { name: 'Mulund', pin: [1502, 453], side: 'below', projects: [['Arkade Nest', 'ongoing']] },
        { name: 'Bhandup', pin: [1508, 539], side: 'below', projects: [['Arkade Rare', 'ongoing']], comingSoon: 1 },
        { name: 'Kanjurmarg', pin: [1496, 656], side: 'below', projects: [['Arkade Earth']] },
      ],
    },
    {
      id: 'central', name: 'Central Suburbs', localities: [
        { name: 'Thane', pin: [1627, 202], side: 'above', projects: [], comingSoon: 1 },
      ],
    },
  ],
}

// Page 4.
export const landmarks = {
  title: 'Landmark projects of Malad & Goregaon region',
  projects: [
    { name: 'Aspire', locality: 'Goregaon East' },
    { name: 'Vistas', locality: 'Goregaon East' },
    { name: 'Views', locality: 'Goregaon East' },
    { name: 'Adornia', locality: 'Goregaon East' },
    { name: 'Evoke', locality: 'Goregaon West' },
    { name: 'Eden', locality: 'Malad West' },
    { name: 'Serene', locality: 'Malad West' },
    { name: 'Jayshree', locality: 'Malad West' },
  ],
  image: { src: '/arkade-family/landmarks-hands-1600.webp', srcSet: '/arkade-family/landmarks-hands-1600.webp 1600w, /arkade-family/landmarks-hands-2880.webp 2880w', alt: 'Cupped hands holding a city skyline lit by the setting sun' },
}
