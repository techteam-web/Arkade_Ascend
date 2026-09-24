// TEMPLATE CONTENT — not from the brochure.
// Specifications, amenities and view captions below are placeholders that
// show the layout. Replace them with approved copy before any client use.
// The pages label them "indicative" on screen while `isTemplate` is true.
// Leave `image` empty to show the gold placeholder frame until renders arrive.

export const isTemplate = true

export const specifications = [
  { id: 'structure', title: 'Structure', image: '', items: ['Earthquake-resistant RCC frame structure', 'Premium external façade finish', 'Double-height entrance lobby'] },
  { id: 'living', title: 'Living & bedrooms', image: '/gallery/interior.png', items: ['Large-format vitrified tiles in living and dining', 'Wooden-finish flooring in the master bedroom', 'Premium emulsion paint on walls and ceilings'] },
  { id: 'kitchen', title: 'Kitchen', image: '', items: ['Granite platform with stainless-steel sink', 'Designer dado tiles above the counter', 'Provision for water purifier and exhaust'] },
  { id: 'bath', title: 'Bathrooms', image: '', items: ['Branded sanitaryware and CP fittings', 'Anti-skid floor tiles, full-height wall tiles', 'Concealed plumbing with hot and cold mixer'] },
  { id: 'openings', title: 'Doors & windows', image: '', items: ['Decorative main door with digital lock', 'Powder-coated aluminium sliding windows', 'Laminated internal doors'] },
  { id: 'electrical', title: 'Electrical', image: '', items: ['Concealed copper wiring with modular switches', 'Air-conditioning points in living and bedrooms', 'Power back-up for common areas and lifts'] },
  { id: 'safety', title: 'Safety & security', image: '', items: ['Multi-tier security with CCTV in common areas', 'Video door phone in every residence', 'Fire detection and sprinkler systems'] },
]

export const amenities = [
  { id: 'pool', name: 'Rooftop infinity pool', level: 'Sky deck', image: '/gallery/amenities.png', copy: 'A still, warm-lit pool held against the Malad skyline.' },
  { id: 'clubhouse', name: 'Clubhouse lounge', level: 'Podium', image: '', copy: 'A private lounge for evenings with friends and family.' },
  { id: 'fitness', name: 'Fitness studio', level: 'Podium', image: '', copy: 'Equipped for strength, cardio and quiet morning routines.' },
  { id: 'yoga', name: 'Yoga & meditation deck', level: 'Sky deck', image: '', copy: 'Open-air calm for sunrise practice.' },
  { id: 'play', name: 'Children’s play garden', level: 'Podium', image: '', copy: 'Safe, landscaped play spaces within sight of home.' },
  { id: 'games', name: 'Indoor games room', level: 'Podium', image: '', copy: 'Table games and leisure for every age.' },
  { id: 'garden', name: 'Landscaped podium garden', level: 'Podium', image: '', copy: 'Green walks and seating between the towers.' },
  { id: 'hall', name: 'Multipurpose hall', level: 'Podium', image: '', copy: 'Celebrations and gatherings, hosted at home.' },
]

export const gallery = [
  { src: '/gallery/exterior.png', category: 'Exterior', alt: 'Concept view of a bronze-toned residential tower illuminated at dusk' },
  { src: '/gallery/interior.png', category: 'Interior', alt: 'Concept living room with a curved sofa and panoramic sunset city views' },
  { src: '/gallery/amenities.png', category: 'Amenities', alt: 'Concept rooftop infinity pool with landscaped seating at sunset' },
  { src: '/brochure/lifestyle-arrival.webp', category: 'Lifestyle', alt: 'A couple arriving at a grand, warmly lit entrance beside a chauffeured car' },
  { src: '/mumbai-dusk.png', category: 'Lifestyle', alt: 'Illustrative Mumbai skyline and distant hills at sunset' },
]

// Illustrative levels for the Views page. The image is a generated skyline,
// not a photograph from the site.
export const viewLevels = [
  { floor: 8, label: 'Garden level', caption: 'Tree-top calm over the neighbourhood.' },
  { floor: 18, label: 'City level', caption: 'The suburb opens out towards the hills.' },
  { floor: 28, label: 'Sky level', caption: 'Unbroken horizons over Malad West.' },
]
