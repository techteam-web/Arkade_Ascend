import { buildingModel as model } from '../../content/template.js'

// Floor arithmetic for the tower model, kept apart from the 3D code so pages
// can use it without loading three.js. The model's two wings are presented as
// Tower A and Tower B, each with its own floors.
export const towers = model.wings
export const towerById = id => towers.find(tower => tower.id === id)
export const floorBase = n => model.firstY + (n - model.firstFloor) * model.floorHeight

// Residential floors only: not the podium, and not the tower's refuge floors.
export const selectable = (id, n) => n >= model.firstFloor && n <= model.lastFloor && !towerById(id).refuge.includes(n)

// The next residential floor of a tower above or below n.
export const stepFloor = (id, n, direction) => {
  let next = n ?? (direction > 0 ? model.firstFloor - 1 : model.lastFloor + 1)
  do next += direction
  while (next >= model.firstFloor && next <= model.lastFloor && !selectable(id, next))
  return selectable(id, next) ? next : n
}
