// Camera shots of the tower on the Location map. MapLibre's camera looks at
// the map's centre, which it keeps in the middle of the open part of the map
// (its padding), from half the canvas height over tan(half the field of
// view) away. From that, these find the zoom and the centre that put the
// tower where a shot wants it, at a given angle.
//
// Places are metres from the tower's foot: [east, north, up]. Spots on
// screen are pixels from the middle of the open part: [right, up].

const rad = degrees => degrees * Math.PI / 180
const smooth = (low, high, value) => { const t = Math.min(1, Math.max(0, (value - low) / (high - low))); return t * t * (3 - 2 * t) }

// The front of the tower, where its crowns carry the name, seen from the
// east-north-east and a little from the side, so its depth shows.
export const HERO = { bearing: -108, pitch: 60 }
// The tilts a shot may take: from looking down over the city to looking out
// across it to the horizon (the map's own limit). About 62 degrees is
// preferred, the angle of the front view.
const PITCHES = [42, 48, 54, 58, 62, 66, 70, 73, 75]

// The camera stays above the city's tallest buildings (drawn at most 200 m)
// once the horizon comes into view, so none of them rises past it; until
// then it may come down to 110 m.
const lowest = pitch => 110 + 100 * smooth(62, 70, pitch)

// A camera, as MapLibre sets one up: where it shows a place (null behind
// it), and the ground it shows at a spot (null above the horizon), both
// relative to the map's centre.
export function lens({ zoom, pitch, bearing }, setup) {
  const f = setup.height / 2 / Math.tan(rad(setup.fov) / 2)
  const distance = f * setup.metresPerPixel(zoom)
  const p = rad(pitch), b = rad(bearing)
  const sp = Math.sin(p), cp = Math.cos(p), sb = Math.sin(b), cb = Math.cos(b)
  const back = distance * sp, up = distance * cp   // the camera, behind the centre and above it
  return {
    height: up,
    see([east, north, z = 0]) {
      const ahead = east * sb + north * cb + back, across = east * cb - north * sb
      const depth = ahead * sp - (z - up) * cp
      return depth > 1 ? [f * across / depth, f * (ahead * cp + (z - up) * sp) / depth] : null
    },
    ground([x, y]) {
      const t = y / f, below = cp - t * sp
      if (below <= 1e-6) return null
      const ahead = up * (sp + t * cp) / below
      const across = x * (ahead * sp + up * cp) / f, forward = ahead - back
      return [forward * sb + across * cb, forward * cb - across * sb]
    },
  }
}

// The shot that stands the tower's foot on a spot, its top `rise` pixels
// above it (or as close as the camera's lowest height allows): its zoom and
// where the foot lies from the map's centre.
export function shot({ bearing, pitch, foot, rise }, setup) {
  const at = zoom => {
    const view = lens({ zoom, pitch, bearing }, setup)
    const offset = view.ground(foot)
    const top = offset && view.see([offset[0], offset[1], setup.towerHeight])
    return { zoom, pitch, bearing, foot, offset, rise: top ? top[1] - foot[1] : 0, low: view.height < lowest(pitch) }
  }
  let near = 19, far = 10          // a nearer camera shows the tower larger
  for (let i = 0; i < 30; i++) {
    const mid = (near + far) / 2, take = at(mid)
    if (!take.offset || take.low || take.rise > rise) near = mid
    else far = mid
  }
  return at(far)
}

// Where the tower stands in a shot of the open part: its foot clear of the
// note along the bottom, its top (and its label) clear of the top.
const footFor = area => -area.height / 2 + Math.max(0.2 * area.height, 76)
const riseFor = (area, share, foot) => Math.max(40, Math.min(share * area.height, area.height / 2 - 64 - foot))

// The tower, large, from the front.
export function towerShot(area, setup) {
  const foot = footFor(area)
  return shot({ ...HERO, foot: [0, foot], rise: riseFor(area, 0.6, foot) }, setup)
}

// From the tower out towards a place: the tower on the left of the open
// part, the route running from its foot to the place on the right. Of the
// angles that bring the place into view (turned so it falls there, tilted
// from looking down to looking out to the horizon), the one that shows the
// tower largest wins, and then the one nearest the preferred tilt: a near
// place sits mid-way, a far one out towards the horizon, and where only a
// camera drawn back can show it (far, or a short opening on a phone), the
// tower stands smaller.
export function lookOut(place, area, setup) {
  const heading = Math.atan2(place[0], place[1]) * 180 / Math.PI
  const foot = [-0.2 * area.width, footFor(area)]
  const tallest = riseFor(area, 0.46, foot[1])
  const roof = area.height / 2 - 64          // room above the place for its label
  const aim = 0.18 * area.width, side = area.width / 2 - 48
  let best = null
  for (let turn = -36; turn <= 36; turn += 4) {
    const bearing = heading - turn
    for (const pitch of PITCHES) {
      const take = rise => {
        const camera = shot({ bearing, pitch, foot, rise }, setup)
        const spot = lens(camera, setup).see([place[0] + camera.offset[0], place[1] + camera.offset[1]])
        return { camera, spot, fits: Boolean(spot) && spot[1] <= roof && Math.abs(spot[0]) <= side }
      }
      // The largest tower that leaves the place in view.
      let pick = take(tallest)
      if (!pick.fits) {
        let small = 6, large = tallest
        pick = null
        for (let i = 0; i < 10; i++) {
          const mid = (small + large) / 2, middle = take(mid)
          if (middle.fits) { small = mid; pick = middle } else large = mid
        }
      }
      if (!pick) continue
      const score = pick.camera.rise - 0.35 * Math.abs(pick.spot[0] - aim) - 2 * Math.abs(pitch - 62)
      if (!best || score > best.score) best = { ...pick.camera, score }
    }
  }
  return best
}

// Above the whole journey: every point of the route, and the tower standing
// at its start, inside the open part (clear of the labels above and the
// note below), from a gentle tilt in the direction of the shot before, so
// rising into it reads as the camera lifting straight up from the tower. It
// is always clearly higher than that shot, even for a short journey.
const AERIAL = { pitch: 42, closest: 16 }
export function aerial(points, from, area, setup) {
  const { bearing } = from, { pitch } = AERIAL
  const step = Math.max(1, Math.floor(points.length / 160))
  const marks = points.filter((point, i) => i % step === 0 || i === points.length - 1).map(([east, north]) => [east, north, 0])
  marks.push([0, 0, 0], [0, 0, setup.towerHeight])
  const box = { left: -area.width / 2 + 48, right: area.width / 2 - 48, bottom: -area.height / 2 + 76, top: area.height / 2 - 64 }
  const want = [(box.left + box.right) / 2, (box.bottom + box.top) / 2]
  const spread = (view, centre) => {
    const spots = marks.map(([east, north, z]) => view.see([east - centre[0], north - centre[1], z]))
    if (spots.some(spot => !spot)) return null
    const xs = spots.map(spot => spot[0]), ys = spots.map(spot => spot[1])
    return { left: Math.min(...xs), right: Math.max(...xs), bottom: Math.min(...ys), top: Math.max(...ys) }
  }
  // At a zoom: centre the marks in the box (moving the map's centre so the
  // ground at their middle comes to the box's middle), and whether they fit.
  const at = zoom => {
    const view = lens({ zoom, pitch, bearing }, setup)
    let centre = [0, 1].map(axis => marks.reduce((sum, mark) => sum + mark[axis], 0) / marks.length)
    let edges = null
    for (let i = 0; i < 6; i++) {
      edges = spread(view, centre)
      if (!edges) return null
      const from = view.ground([(edges.left + edges.right) / 2, (edges.bottom + edges.top) / 2]), to = view.ground(want)
      if (!from || !to) return null
      centre = [centre[0] + from[0] - to[0], centre[1] + from[1] - to[1]]
    }
    edges = spread(view, centre)
    const fits = Boolean(edges) && edges.left >= box.left && edges.right <= box.right && edges.bottom >= box.bottom && edges.top <= box.top
    const foot = view.see([-centre[0], -centre[1], 0])
    return { zoom, pitch, bearing, offset: [-centre[0], -centre[1]], foot, fits }
  }
  let near = Math.min(AERIAL.closest, from.zoom - 0.8), far = 9
  if (at(near)?.fits) return at(near)
  for (let i = 0; i < 24; i++) {
    const mid = (near + far) / 2, take = at(mid)
    if (take?.fits) far = mid
    else near = mid
  }
  const best = at(far)
  return best?.foot ? best : null
}
