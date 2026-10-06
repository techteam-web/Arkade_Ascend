import { units } from './project.js'
import { buildingModel as model, homeStacks, homeViews, samplePlanTypes } from './template.js'
import { selectable, towers } from '../scenes/building/floors.js'

// The unit finder's inventory: every home in both towers, built from the
// residential floors and each tower's stack of homes (template.js). Pages
// import from here; nothing here loads three.js.

// Type A is the brochure's Unit 1, with its measured rooms. The other types
// are samples, and all of them show the Unit 1 drawing as a placeholder.
const brochure = units[0]
export const planTypes = [
  { id: 'A', configuration: brochure.configuration, bedrooms: 4, bathrooms: 4, reraArea: brochure.reraArea, balcony: brochure.balcony, features: ['powder', 'dry-balcony'], unit: brochure },
  ...samplePlanTypes,
].map(type => ({
  ...type,
  name: `Type ${type.id}`,
  totalArea: type.reraArea + type.balcony,
  plan: type.plan ?? brochure.plan,
  placeholder: !type.plan && !type.unit,   // showing another type's drawing
}))
export const planById = id => planTypes.find(type => type.id === id)

const floorsOf = tower => Array.from({ length: model.lastFloor - model.firstFloor + 1 }, (_, i) => model.firstFloor + i)
  .filter(n => selectable(tower, n))

export const homes = towers.flatMap(tower => floorsOf(tower.id).flatMap(floor => homeStacks[tower.id].map(stack => {
  const type = planById(stack.plan)
  return {
    id: `${tower.id}-${floor}${String(stack.position).padStart(2, '0')}`,
    tower: tower.id, floor, position: stack.position, type,
    facing: stack.facing, view: stack.view,
    features: stack.corner ? ['corner', ...type.features] : type.features,
  }
})))
export const homeById = id => homes.find(home => home.id === id)
export const homesOnFloor = (tower, floor) => homes.filter(home => home.tower === tower && home.floor === floor)
export const viewLabel = id => homeViews.find(view => view.id === id)?.label ?? id

export const features = [
  { id: 'corner', label: 'Corner home' },
  { id: 'dry-balcony', label: 'Dry balcony' },
  { id: 'powder', label: 'Powder room' },
  { id: 'study', label: 'Study' },
  { id: 'utility', label: 'Utility' },
]
export const featureLabel = id => features.find(feature => feature.id === id)?.label ?? id

// Chip facets. Options within a facet widen the choice (3 BHK or 4 BHK);
// features narrow it (a study and a dry balcony), like Zenith's finder.
const unique = values => [...new Set(values)]
export const facets = [
  { key: 'configuration', label: 'Configuration', of: home => home.type.configuration,
    options: unique(planTypes.map(type => type.configuration)).sort().map(id => ({ id, label: id })) },
  { key: 'type', label: 'Plan type', of: home => home.type.id, options: planTypes.map(type => ({ id: type.id, label: type.id, name: type.name })) },
  { key: 'tower', label: 'Tower', of: home => home.tower, options: towers.map(tower => ({ id: tower.id, label: `Tower ${tower.id}` })) },
  { key: 'facing', label: 'Facing', of: home => home.facing, options: ['North', 'East', 'South', 'West'].map(id => ({ id, label: id })) },
  { key: 'view', label: 'View', of: home => home.view, options: homeViews },
  { key: 'feature', label: 'Features', of: home => home.features, all: true, options: features },
]

const round = (value, to, method) => Math[method](value / to) * to
export const bounds = {
  floor: [model.firstFloor, model.lastFloor],
  area: [round(Math.min(...planTypes.map(type => type.reraArea)), 50, 'floor'), round(Math.max(...planTypes.map(type => type.reraArea)), 50, 'ceil')],
}
export const floorBands = [
  { id: 'lower', label: 'Lower', range: [model.firstFloor, 15] },
  { id: 'middle', label: 'Middle', range: [16, 26] },
  { id: 'upper', label: 'Upper', range: [27, model.lastFloor] },
]

export const emptyFilters = () => ({
  ...Object.fromEntries(facets.map(facet => [facet.key, []])),
  floor: [...bounds.floor],
  area: [...bounds.area],
})
export const activeFilters = filters => facets.reduce((count, facet) => count + filters[facet.key].length, 0)
  + (filters.floor[0] > bounds.floor[0] || filters.floor[1] < bounds.floor[1] ? 1 : 0)
  + (filters.area[0] > bounds.area[0] || filters.area[1] < bounds.area[1] ? 1 : 0)

const within = (value, [low, high]) => value >= low && value <= high
const matches = (home, filters, skip) => within(home.floor, filters.floor) && within(home.type.reraArea, filters.area)
  && facets.every(facet => {
    const chosen = filters[facet.key]
    if (facet.key === skip || !chosen.length) return true
    const value = facet.of(home)
    return facet.all ? chosen.every(option => value.includes(option)) : chosen.includes(value)
  })

export const filterHomes = filters => homes.filter(home => matches(home, filters))

// How many homes each option of a facet would show, given every other filter,
// so a chip never leads to an empty result.
export const optionCounts = (filters, facet) => {
  const counts = {}
  for (const home of homes) {
    if (!matches(home, filters, facet.all ? null : facet.key)) continue
    for (const value of [].concat(facet.of(home))) counts[value] = (counts[value] || 0) + 1
  }
  return counts
}

// Matching homes gathered under their plan type.
export const groupByType = list => planTypes.map(type => {
  const of = list.filter(home => home.type === type)
  if (!of.length) return null
  const floors = of.map(home => home.floor)
  return { type, homes: of, towers: unique(of.map(home => home.tower)), floors: [Math.min(...floors), Math.max(...floors)], facings: unique(of.map(home => home.facing)) }
}).filter(Boolean)

export const sorts = {
  plans: [
    { id: 'type', label: 'Plan type' },
    { id: 'area-desc', label: 'Largest first' },
    { id: 'area-asc', label: 'Smallest first' },
  ],
  homes: [
    { id: 'floor-asc', label: 'Floor · low to high' },
    { id: 'floor-desc', label: 'Floor · high to low' },
    { id: 'area-desc', label: 'Largest first' },
    { id: 'area-asc', label: 'Smallest first' },
  ],
}
const byArea = direction => (a, b) => direction * (a.reraArea - b.reraArea)
export const sortGroups = (groups, sort) => sort === 'type' ? groups
  : [...groups].sort((a, b) => byArea(sort === 'area-asc' ? 1 : -1)(a.type, b.type))
export const sortHomes = (list, sort) => [...list].sort((a, b) => {
  if (sort.startsWith('area')) return byArea(sort === 'area-asc' ? 1 : -1)(a.type, b.type) || a.floor - b.floor || a.id.localeCompare(b.id)
  return (sort === 'floor-desc' ? b.floor - a.floor : a.floor - b.floor) || a.id.localeCompare(b.id)
})

export const area = value => value.toLocaleString('en-IN')
export const span = ([low, high]) => low === high ? `${low}` : `${low}–${high}`
