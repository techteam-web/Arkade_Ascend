// The tower model's finishes, shared by Residences (BuildingModel.jsx) and the
// Location map (src/pages/location/towerLayer.js). The model's CAD materials,
// recoloured to the concept render: champagne frames, dark bronze recesses,
// blue-grey glass, warm paving and planting. Anything unlisted that is near
// white becomes the lighter champagne of the fins; other colours keep their
// own. No three.js here.
export const FINISHES = {
  'B03_Apricot_Glow': { color: '#b89a78', roughness: 0.7 },         // walls and frames
  '[Color M02]': { color: '#34414b', roughness: 0.18, metalness: 0.35 },   // glazing
  '[0134_DimGray]': { color: '#4b3d33', roughness: 0.6 },          // recesses and edges
  'Heather_Soles1': { color: '#3b302a', roughness: 0.55 },         // louvres and rails
  '[Color M08]': { color: '#2f2723', roughness: 0.55 },
  '[0136_Charcoal]': { color: '#8e8479', roughness: 0.85 },        // paving
  '<auto>4': { color: '#8a7e72', roughness: 0.7 },
  'G02_Spring_Lime': { color: '#4e4238', roughness: 0.6 },
  'F07_Moss_Shine': { color: '#5b4d41', roughness: 0.6 },
  'F04_Emerald_Green': { color: '#6c5e50', roughness: 0.6 },
  '[0064_Chartreuse]': { color: '#4f5640', roughness: 0.85 },       // planting
  '[0062_YellowGreen]': { color: '#4a513b', roughness: 0.85 },
  'D04_Dandelion_Burst': { color: '#c9a060', roughness: 0.45, metalness: 0.4 },   // signage
  'C05_Golden_Blaze': { color: '#b8894f', roughness: 0.45, metalness: 0.4 },
}
export const FIN = { color: '#d6c0a0', roughness: 0.65 }

// On the Location map the tower stands in daylight over the cream map and is
// lit as the city's buildings are, with no reflections but the glass's. The
// same finishes, lighter: champagne stone, softer bronze, warm paving that
// sits with the map's roads, muted planting. Only these differ; `gloss` is
// how much of the sky the glass reflects (more at grazing angles).
export const MAP_FINISHES = {
  'B03_Apricot_Glow': { color: '#e2cfb0' },
  '[Color M02]': { color: '#59636c', gloss: 0.65 },
  '<auto>16': { color: '#59636c', gloss: 0.65 },
  '[0134_DimGray]': { color: '#6e5a49' },
  'Heather_Soles1': { color: '#5e4e40' },
  '[Color M08]': { color: '#4f4136' },
  '[0136_Charcoal]': { color: '#c6b9a1' },
  '<auto>4': { color: '#bcae95' },
  '[0064_Chartreuse]': { color: '#99a07a' },
  '[0062_YellowGreen]': { color: '#8c946d' },
  '[0094_PowderBlue]': { color: '#9fc8c3' },   // the pool
}
export const MAP_FIN = { color: '#e8d9bf' }
