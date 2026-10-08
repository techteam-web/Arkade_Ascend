import { floorExceptions, floorRange, planTypes as plans, positions, wing } from './floorPlans.js'

// The unit finder's inventory: every home in Wing A, built from its plan
// sheets (floorPlans.js). Each floor repeats the typical floor's six homes,
// except where floorExceptions says otherwise. Pages import from here.

export const planTypes = plans.map(type => ({
  ...type,
  name: `Unit ${type.unit}`,
  // "Unit 05 · 7th floor" for the plans that belong to one floor.
  label: type.floor ? `Unit ${type.unit} · ${ordinal(type.floor)} floor` : `Unit ${type.unit}`,
}))
export const planById = id => planTypes.find(type => type.id === id)

export const floors = Array.from({ length: floorRange[1] - floorRange[0] + 1 }, (_, i) => floorRange[0] + i)

// The plan type at a position on a floor, or null where the floor has no such home.
export const typeAt = (floor, position) => {
  const exception = floorExceptions[floor]?.[position]
  return exception === null ? null : planById(exception ?? position)
}

// A home is its wing, floor and position: A-705 is Wing A, floor 7, Unit 05.
export const homeId = (floor, position) => `${wing}-${floor}${position}`
export const homes = floors.flatMap(floor => positions.flatMap(position => {
  const type = typeAt(floor, position)
  return type ? [{ id: homeId(floor, position), wing, floor, position, type, features: type.features }] : []
}))
export const homeById = id => homes.find(home => home.id === id)
export const homesOnFloor = floor => homes.filter(home => home.floor === floor)
export const homesOfType = type => homes.filter(home => home.type === type)

export const features = [
  { id: 'powder', label: 'Powder toilet' },
  { id: 'wardrobe', label: 'Walk-in wardrobe' },
  { id: 'study', label: 'Study room' },
  { id: 'utility', label: 'Utility' },
]
export const featureLabel = id => features.find(feature => feature.id === id)?.label ?? id

// Chip facets. Options within a facet widen the choice (2 BHK or 3 BHK);
// features narrow it (a study and a powder toilet), like Zenith's finder.
const unique = values => [...new Set(values)]
export const facets = [
  { key: 'configuration', label: 'Configuration', of: home => home.type.configuration,
    options: unique(planTypes.map(type => type.configuration)).sort((a, b) => parseFloat(a) - parseFloat(b)).map(id => ({ id, label: id })) },
  { key: 'unit', label: 'Unit', of: home => home.position, options: positions.map(id => ({ id, label: id, name: `Unit ${id}` })) },
  { key: 'feature', label: 'Features', of: home => home.features, all: true, options: features },
]

const round = (value, to, method) => Math[method](value / to) * to
export const bounds = {
  floor: [...floorRange],
  area: [round(Math.min(...planTypes.map(type => type.reraArea)), 50, 'floor'), round(Math.max(...planTypes.map(type => type.reraArea)), 50, 'ceil')],
}
export const floorBands = [
  { id: 'lower', label: 'Lower', range: [floorRange[0], 12] },
  { id: 'middle', label: 'Middle', range: [13, 25] },
  { id: 'upper', label: 'Upper', range: [26, floorRange[1]] },
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
export const matches = (home, filters, skip) => within(home.floor, filters.floor) && within(home.type.reraArea, filters.area)
  && facets.every(facet => {
    const chosen = filters[facet.key]
    if (facet.key === skip || !chosen.length) return true
    const value = facet.of(home)
    return facet.all ? chosen.every(option => value.includes(option)) : chosen.includes(value)
  })

export const filterHomes = (filters, list = homes) => list.filter(home => matches(home, filters))

// How many homes each option of a facet would show, given every other filter,
// so a chip never leads to an empty result.
export const optionCounts = (filters, facet, list = homes) => {
  const counts = {}
  for (const home of list) {
    if (!matches(home, filters, facet.all ? null : facet.key)) continue
    for (const value of [].concat(facet.of(home))) counts[value] = (counts[value] || 0) + 1
  }
  return counts
}

// Matching homes gathered under their plan type.
export const groupByType = list => planTypes.map(type => {
  const of = list.filter(home => home.type === type)
  if (!of.length) return null
  return { type, homes: of, floors: of.map(home => home.floor) }
}).filter(Boolean)

export const sorts = {
  plans: [
    { id: 'type', label: 'Unit order' },
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
  if (sort.startsWith('area')) return byArea(sort === 'area-asc' ? 1 : -1)(a.type, b.type) || a.floor - b.floor || a.position.localeCompare(b.position)
  return (sort === 'floor-desc' ? b.floor - a.floor : a.floor - b.floor) || a.position.localeCompare(b.position)
})

export const area = value => value.toLocaleString('en-IN')
export const span = ([low, high]) => low === high ? `${low}` : `${low}–${high}`
export function ordinal(n) {
  const tens = n % 100
  return `${n}${tens >= 11 && tens <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`
}
// A list of floors as runs: [1, 2, 3, 5] reads "1–3, 5".
export const floorRuns = list => {
  const sorted = [...new Set(list)].sort((a, b) => a - b)
  const runs = []
  for (const n of sorted) {
    const last = runs.at(-1)
    if (last && n === last[1] + 1) last[1] = n
    else runs.push([n, n])
  }
  return runs.map(span).join(', ')
}
