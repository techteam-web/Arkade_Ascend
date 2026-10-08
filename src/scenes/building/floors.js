import { buildingModel as model } from '../../content/template.js'

// Floor arithmetic for the tower model, kept apart from the 3D code so pages
// can use it without loading three.js. The model's two wings are presented as
// Wing A and Wing B, each with its own floors.
export const towers = model.wings
export const towerById = id => towers.find(tower => tower.id === id)

// The floor line of floor n in model metres: the podium floors share the
// height below the first tower floor evenly, the tower floors are regular.
const podiumHeight = model.towerY / model.towerFloor
export const floorBase = n => n <= model.towerFloor ? n * podiumHeight : model.towerY + (n - model.towerFloor) * model.floorHeight
export const floorAt = y => y < model.towerY ? Math.floor(y / podiumHeight) : model.towerFloor + Math.floor((y - model.towerY) / model.floorHeight)

// Floors with homes only: within the wing's floors and not a refuge floor.
export const selectable = (id, n) => {
  const { floors: [first, last], refuge } = towerById(id)
  return n >= first && n <= last && !refuge.includes(n)
}

// The next floor with homes of a wing above or below n.
export const stepFloor = (id, n, direction) => {
  const [first, last] = towerById(id).floors
  let next = n ?? (direction > 0 ? first - 1 : last + 1)
  do next += direction
  while (next >= first && next <= last && !selectable(id, next))
  return selectable(id, next) ? next : n
}
