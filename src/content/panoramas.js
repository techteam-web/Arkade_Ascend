// Aerial 360° panoramas supplied as tiled cube maps (Marzipano Tool exports in
// public/assets/<set>/tiles/<folder>/). The drone hovered beside each wing at
// the height of one floor, and once above the site. `height` is the drone's
// height above the ground in metres, as named in the export's folder.
//
// Used by Residences' visual selection: a wing's panoramas follow the wing
// that is chosen, the top view stands for the whole site.

const base = (set, folder) => encodeURI(`/assets/${set}/tiles/${folder}`)

// [floor, height, folder]: the same floors were flown at both wings.
const wingFlights = {
  A: [
    [5, 16, '7-dji_0013_5th-floor_16m'],
    [6, 19.15, '6-dji_0012_6th-floor_1915m'],
    [8, 25.45, '5-dji_0011_8th-floor_2545m'],
    [12, 38.05, '4-dji_0010_12th-floor_3805m'],
    [16, 50.65, '3-dji_0009_16th-floor_5065m'],
    [20, 63.25, '2-dji_0008_20th-floor_6325m'],
    [24, 75.85, '1-dji_0007_24th-floor_7585m'],
    [28, 88.45, '0-dji_0006_28th-floor_8845m'],
    [32, 101.05, '10-dji_0005_32nd-floor_10105m'],
    [36, 113.65, '9-dji_0004_36th-floor_11365m'],
    [37, 116.8, '8-dji_0003_37th-floor_1168m'],
  ],
  B: [
    [5, 16, '7-dji_0015_5th-floor_16m'],
    [6, 19.15, '8-dji_0016_6th-floor_1915m'],
    [8, 25.45, '9-dji_0017_8th-floor_2545m'],
    [12, 38.05, '10-dji_0018_12th-floor_3805m'],
    [16, 50.65, '0-dji_0019_16th-floor_5065m'],
    [20, 63.25, '1-dji_0020_20th-floor_6325m'],
    [24, 75.85, '2-dji_0021_24th-floor_7585m'],
    [28, 88.45, '3-dji_0022_28th-floor_8845m'],
    [32, 101.05, '4-dji_0023_32nd-floor_10105m'],
    [36, 113.65, '5-dji_0024_36th-floor_11365m'],
    [37, 116.8, '6-dji_0025_37th-floor_1168m'],
  ],
}

// Per wing: the floors a panorama was taken at, with a tile source for each.
export const wingPanoramas = Object.fromEntries(Object.entries(wingFlights).map(([wing, flights]) => [
  wing,
  flights.map(([floor, height, folder]) => ({ id: String(floor), floor, height, url: base(`Tower ${wing}`, folder) })),
]))

// The captured floor nearest to n (the lower one on a tie).
export const nearestFloor = (wing, n) => {
  const floors = wingPanoramas[wing].map(item => item.floor)
  if (!n) return floors[floors.length >> 1]
  return floors.reduce((best, floor) => Math.abs(floor - n) < Math.abs(best - n) ? floor : best)
}

export const topView = {
  height: 120,
  times: [
    { id: 'day', label: 'Day', url: base('Top View', '2-top_day_120m'), caption: 'The site from directly above, in daylight.' },
    { id: 'evening', label: 'Evening', url: base('Top View', '0-top_evening_120m'), caption: 'The site from directly above, at sunset.' },
    { id: 'night', label: 'Night', url: base('Top View', '1-top_night_120m'), caption: 'The site from directly above, after dark.' },
  ],
}

// How the panorama's heading sits on a wing's floor plan, in degrees: the
// direction on the plan (clockwise from the top of the drawing) that a view
// straight ahead (yaw 0) faces. INDICATIVE until measured against the site:
// the radar on the mini plan turns by this much more than the view does.
export const planHeading = { A: 0, B: 0 }

// Each home's view, set by hand, per wing (the same on every floor), in degrees:
//   start    where the view opens when the home is chosen: { yaw, pitch, fov }
//            (yaw 0 is the panorama's front, positive turns right; pitch
//            positive looks down; fov is the zoom, smaller is closer)
//   outlook  [left, right]: the yaw of the outlook's left and right edges; the
//            picture is kept between them (at most 165 degrees apart).
//            false: the home's view is not locked.
//   tilt     [top, bottom]: the pitch of the picture's top and bottom edges
//            (negative is above the horizon, positive below); the view is kept
//            between them. Left out: -30 to 60.
//   back     the corner homes (Units 01 and 04) also look out at the back:
//            the same { start, outlook, tilt } for that view, chosen with Back view.
// A home left out, or a part left out, uses the estimate from its place on the
// plan (labelled "angle indicative" on screen). Set them with `?calibrate` in
// the address: press a home on the mini plan, use the Setup panel, then
// "Copy this room" or "Copy all rooms" and paste here. For example:
//   A: { '01': { start: { yaw: 99.8, pitch: -7.5, fov: 55 }, outlook: [57.2, 159.9] } },
export const roomViews = {
  A: {
    '01': { start: { yaw: 1, pitch: 10.4, fov: 82.4 }, outlook: [-56.4, 58.2], tilt: [-29.6, 44.3], back: { start: { yaw: 180, pitch: 21.1, fov: 88.5 }, outlook: [125.7, -125.2], tilt: [-25.7, 46.1] } },
    '02': { start: { yaw: -2.9, pitch: 5, fov: 72.4 }, outlook: [-55.4, 49.6], tilt: [-30.2, 40.4] },
    '03': { start: { yaw: 6.3, pitch: 10, fov: 60 }, outlook: [-44.6, 52.1], tilt: [-27.4, null] },
    '04': { start: { yaw: -4.8, pitch: 10, fov: 88.5 }, outlook: [-56.7, 40.1], tilt: [-29.4, 41.5], back: { start: { yaw: 174.9, pitch: 2.9, fov: 64.7 }, outlook: [126.5, -136.7], tilt: [-28.6, 34.4] } },
    '05': { start: { yaw: 177.9, pitch: 10, fov: 60 }, outlook: [125.8, -136.4], tilt: [-22.2, 40] },
    '06': { start: { yaw: -177.3, pitch: 7, fov: 60 }, outlook: [140.6, -135.1], tilt: [-19.3, 34] },
  },
  B: {},
}
