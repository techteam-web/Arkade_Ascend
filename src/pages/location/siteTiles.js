// Takes the old buildings on the tower's site out of the map's tiles, so none
// stands inside the model: OpenStreetMap still has the colony that the
// project replaces. Style filters cannot do this here: this source merges the
// buildings of a tile that share a height into one multipolygon feature (so
// ids repeat, and a filter that drops a feature drops a whole group).
//
// The map's vector source is routed through a protocol of our own. Tiles that
// do not touch the site pass through untouched; in those that do, every
// polygon of the `building` layer whose centre lies inside the site is cut
// out of its feature, and the rest of the feature kept. The tiles are Mapbox
// Vector Tiles (protocol buffers), edited byte by byte: a feature's geometry
// is decoded, the site's polygons left out, the remainder encoded again, and
// the lengths around it rewritten.

const PROTOCOL = 'ascend-site'
let registered = false

// Route a style's vector source through the protocol.
export function clearSite(maplibregl, style, site, sourceId = 'openmaptiles') {
  const source = style.sources?.[sourceId]
  if (!source?.url?.startsWith('https://')) return style
  if (!registered) {
    maplibregl.addProtocol(PROTOCOL, (params, controller) => load(params, controller, site))
    registered = true
  }
  source.url = source.url.replace('https://', `${PROTOCOL}://`)
  return style
}

async function load(params, controller, site) {
  const url = params.url.replace(`${PROTOCOL}://`, 'https://')
  const response = await fetch(url, { signal: controller.signal })
  if (!response.ok) throw new Error(`${response.status} ${url}`)
  // The source's TileJSON: its tiles come back through here too.
  if (params.type === 'json') {
    const tileJson = await response.json()
    tileJson.tiles = tileJson.tiles?.map(tile => tile.replace('https://', `${PROTOCOL}://`))
    return { data: tileJson }
  }
  const buffer = await response.arrayBuffer()
  const match = url.match(/\/(\d+)\/(\d+)\/(\d+)\.pbf/)
  if (!match || !buffer.byteLength) return { data: buffer }
  try {
    return { data: withoutSite(buffer, +match[1], +match[2], +match[3], site) }
  } catch {
    return { data: buffer }   // an unexpected tile is better shown as it is
  }
}

// The site in a tile's own coordinates (0 to extent across the tile).
const toTile = ([lng, lat], z, x, y, extent) => {
  const n = 2 ** z, sin = Math.sin(lat * Math.PI / 180)
  return [
    ((lng + 180) / 360 * n - x) * extent,
    ((0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * n - y) * extent,
  ]
}

const inside = ([px, py], ring) => {
  let within = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j]
    if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) within = !within
  }
  return within
}

// Protocol buffer basics. Numbers stay below 2^53, so plain arithmetic.
function varint(bytes, at) {
  let value = 0, scale = 1, byte
  do { byte = bytes[at++]; value += (byte & 0x7f) * scale; scale *= 128 } while (byte & 0x80)
  return [value, at]
}
function pushVarint(out, value) {
  while (value > 127) { out.push((value % 128) | 0x80); value = Math.floor(value / 128) }
  out.push(value)
}
function skip(bytes, at, wire) {
  if (wire === 0) { while (bytes[at++] & 0x80); return at }
  if (wire === 1) return at + 8
  if (wire === 2) { const [length, start] = varint(bytes, at); return start + length }
  if (wire === 5) return at + 4
  throw new Error(`wire type ${wire}`)
}
// Every field of a message: [field number, wire type, start of key, start of value, end].
function fields(bytes, start, end) {
  const list = []
  for (let at = start; at < end;) {
    const [key, value] = varint(bytes, at)
    const next = skip(bytes, value, key & 7)
    list.push([Math.floor(key / 8), key & 7, at, value, next])
    at = next
  }
  return list
}
// The payload of a length-delimited field.
const payload = (bytes, value) => { const [length, start] = varint(bytes, value); return [start, start + length] }

// A feature's geometry as rings of tile coordinates (MVT command stream).
function decodeRings(bytes, start, end) {
  const rings = []
  let x = 0, y = 0, at = start, ring = null
  while (at < end) {
    let command
    ;[command, at] = varint(bytes, at)
    const id = command & 7, count = command >> 3
    if (id === 7) { ring = null; continue }
    for (let i = 0; i < count; i++) {
      let dx, dy
      ;[dx, at] = varint(bytes, at)
      ;[dy, at] = varint(bytes, at)
      x += (dx >>> 1) ^ -(dx & 1)
      y += (dy >>> 1) ^ -(dy & 1)
      if (id === 1 || !ring) { ring = []; rings.push(ring) }
      ring.push([x, y])
    }
  }
  return rings
}

function encodeRings(rings) {
  const out = []
  const zigzag = n => (n << 1) ^ (n >> 31)
  let x = 0, y = 0
  const move = ([px, py]) => { pushVarint(out, zigzag(px - x) >>> 0); pushVarint(out, zigzag(py - y) >>> 0); x = px; y = py }
  for (const ring of rings) {
    pushVarint(out, 1 | (1 << 3))              // MoveTo, one point
    move(ring[0])
    pushVarint(out, 2 | ((ring.length - 1) << 3))   // LineTo, the rest
    ring.slice(1).forEach(move)
    pushVarint(out, 7 | (1 << 3))              // ClosePath
  }
  return out
}

// Exterior rings have a positive area in tile coordinates (y down); the
// interior rings after one are its holes.
const area = ring => ring.reduce((sum, [x1, y1], i) => {
  const [x2, y2] = ring[(i + 1) % ring.length]
  return sum + x1 * y2 - x2 * y1
}, 0)

// A feature without the site's polygons: its bytes unchanged, new bytes, or
// null when nothing of it is left.
function cutFeature(bytes, keyAt, end, featureStart, featureEnd, site) {
  const parts = fields(bytes, featureStart, featureEnd)
  const geometry = parts.find(([f, wire]) => f === 4 && wire === 2)
  const type = parts.find(([f]) => f === 3)
  if (!geometry || !type || varint(bytes, type[3])[0] !== 3) return bytes.subarray(keyAt, end)
  const polygons = []
  for (const ring of decodeRings(bytes, ...payload(bytes, geometry[3]))) {
    if (ring.length < 3) continue
    if (area(ring) > 0 || !polygons.length) polygons.push([ring])
    else polygons[polygons.length - 1].push(ring)
  }
  const kept = polygons.filter(([outline]) => {
    const centre = outline.reduce((sum, p) => [sum[0] + p[0] / outline.length, sum[1] + p[1] / outline.length], [0, 0])
    return !inside(centre, site)
  })
  if (kept.length === polygons.length) return bytes.subarray(keyAt, end)
  if (!kept.length) return null
  const geometryBytes = encodeRings(kept.flat())   // packed varints, as bytes
  const feature = []
  for (const [f, , partKey, , partEnd] of parts) {
    if (f !== 4) { feature.push(...bytes.subarray(partKey, partEnd)); continue }
    feature.push(34)   // field 4, length-delimited
    pushVarint(feature, geometryBytes.length)
    feature.push(...geometryBytes)
  }
  const head = [18]   // field 2 of the layer, length-delimited
  pushVarint(head, feature.length)
  return Uint8Array.from([...head, ...feature])
}

function withoutSite(buffer, z, x, y, site) {
  const bytes = new Uint8Array(buffer)
  let changed = false
  const out = []
  for (const [field, wire, keyAt, valueAt, end] of fields(bytes, 0, bytes.length)) {
    if (field !== 3 || wire !== 2) { out.push(bytes.subarray(keyAt, end)); continue }
    const [layerStart, layerEnd] = payload(bytes, valueAt)
    const layer = fields(bytes, layerStart, layerEnd)
    const nameField = layer.find(([f]) => f === 1)
    const name = nameField && new TextDecoder().decode(bytes.subarray(...payload(bytes, nameField[3])))
    if (name !== 'building') { out.push(bytes.subarray(keyAt, end)); continue }
    const extentField = layer.find(([f]) => f === 5)
    const extent = extentField ? varint(bytes, extentField[3])[0] : 4096
    const ring = site.map(point => toTile(point, z, x, y, extent))
    // A tile far from the site (its buffer included) keeps its layer as is.
    const xs = ring.map(p => p[0]), ys = ring.map(p => p[1]), margin = extent * 0.1
    if (Math.max(...xs) < -margin || Math.min(...xs) > extent + margin || Math.max(...ys) < -margin || Math.min(...ys) > extent + margin) {
      out.push(bytes.subarray(keyAt, end))
      continue
    }
    const kept = []
    for (const [f, , fKey, fValue, fEnd] of layer) {
      if (f !== 2) { kept.push(bytes.subarray(fKey, fEnd)); continue }
      const feature = cutFeature(bytes, fKey, fEnd, ...payload(bytes, fValue), ring)
      if (feature !== null && feature.buffer === bytes.buffer) kept.push(feature)
      else { changed = true; if (feature) kept.push(feature) }
    }
    const head = [26]   // field 3 of the tile, length-delimited
    pushVarint(head, kept.reduce((sum, part) => sum + part.length, 0))
    out.push(Uint8Array.from(head), ...kept)
  }
  if (!changed) return buffer
  const result = new Uint8Array(out.reduce((sum, part) => sum + part.length, 0))
  let at = 0
  for (const part of out) { result.set(part, at); at += part.length }
  return result.buffer
}
