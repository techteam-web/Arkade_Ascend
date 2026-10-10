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
