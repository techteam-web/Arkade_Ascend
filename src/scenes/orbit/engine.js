import * as THREE from 'three'
import { orbit } from '../../content/project.js'
import { prefersReducedMotion } from '../../hooks/useMediaQuery.js'
import { sceneStore } from '../sceneStore.js'

// The rendered orbit's engine, shared by every page that shows it (Tower,
// Residences): one frame cache for the visit, so moving between pages never
// downloads a frame twice. Ported from the Orbit project (FrameStore,
// OrbitController, WorldData), trimmed to what the presentation uses.

export const TUNING = {
  dragFramesPerScreen: 60,  // frames advanced by a full-width drag
  wheelFramesPerPixel: 0.05,
  follow: 16,               // how tightly the view chases the input
  friction: 3.5,            // inertia decay after a flick
  maxSpin: 90,              // frames per second cap for flicks
  minSpin: 0.6,
  parallax: 0.004,          // depth parallax from the mouse: a hint of depth, never a stretch
  transitionSeconds: 0.8,   // the light sweeping through the scene
}

export const wrap = (i, n) => ((i % n) + n) % n
export const shortestDelta = (a, b, n) => {
  const d = wrap(b - a, n)
  return d > n / 2 ? d - n : d
}
const pad = i => String(i).padStart(3, '0')

// The 960 px set where it is enough; otherwise the 1920 px one. The view
// fills the screen and crops the 16:9 frame, so a tall phone needs the
// frame's height as much as a wide screen needs its width.
const frameWidth = () => {
  const w = window.screen?.width ?? window.innerWidth, h = window.screen?.height ?? window.innerHeight
  const needed = Math.max(w, h * 16 / 9) * Math.min(window.devicePixelRatio || 1, 2)
  return needed <= 1500 ? orbit.widths[0] : orbit.widths[1]
}
const lowMemory = () => (navigator.deviceMemory ?? 8) <= 4
export const saveData = () => navigator.connection?.saveData === true

function frameSource() {
  const width = frameWidth()
  return {
    count: orbit.frames, width, height: width * 9 / 16,
    url: (layer, i) => layer === 'depth' ? `${orbit.path}/depth/${pad(i)}.webp` : `${orbit.path}/${width}/${layer}/${pad(i)}.webp`,
  }
}

// Compressed frames stay in memory for the visit; decoded bitmaps only for a
// window around the view, least recently used out first. Decoding happens off
// the main thread, so dragging never blocks.
class FrameStore {
  constructor(source, capacity) {
    this.source = source
    this.capacity = capacity
    this.blobs = new Map()
    this.loading = new Map()
    this.bitmaps = new Map()
    this.decoding = new Set()
    this.failed = new Set()
    this.pinned = new Map()   // key -> how many canvases show it
    this.listeners = new Set()
  }
  onDecoded(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn) }
  load(layer, i) {
    const k = `${layer}:${i}`
    const blob = this.blobs.get(k)
    if (blob) return Promise.resolve(blob)
    let p = this.loading.get(k)
    if (!p) {
      p = fetch(this.source.url(layer, i))
        .then(res => { if (!res.ok) throw new Error(`${res.status} ${res.url}`); return res.blob() })
        .then(b => { this.blobs.set(k, b); return b })
        .finally(() => this.loading.delete(k))
      this.loading.set(k, p)
    }
    return p
  }
  peek(layer, i) { return this.bitmaps.get(`${layer}:${i}`) }
  ensure(layer, i) {
    const k = `${layer}:${i}`
    const bmp = this.bitmaps.get(k)
    if (bmp) { this.bitmaps.delete(k); this.bitmaps.set(k, bmp); return }
    if (this.decoding.has(k) || this.failed.has(k)) return
    this.decoding.add(k)
    this.load(layer, i)
      .then(blob => createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' }))
      .then(decoded => { this.bitmaps.set(k, decoded); this.evict(); this.listeners.forEach(fn => fn()) })
      .catch(() => this.failed.add(k))
      .finally(() => this.decoding.delete(k))
  }
  pin(layer, i) { const k = `${layer}:${i}`; this.pinned.set(k, (this.pinned.get(k) ?? 0) + 1) }
  unpin(layer, i) {
    const k = `${layer}:${i}`, n = (this.pinned.get(k) ?? 0) - 1
    if (n > 0) this.pinned.set(k, n); else this.pinned.delete(k)
  }
  // Downloads (not decodes) every frame, nearest the view first.
  async preload(layers, center, concurrency, onProgress) {
    const n = this.source.count, order = [], seen = new Set()
    for (let d = 0; d <= n / 2; d++) for (const j of d === 0 ? [center] : [center + d, center - d]) {
      const i = wrap(j, n)
      if (!seen.has(i)) { seen.add(i); order.push(i) }
    }
    const tasks = order.flatMap(i => layers.map(layer => [layer, i]))
    let next = 0, done = 0
    const worker = async () => {
      while (next < tasks.length) {
        const [layer, i] = tasks[next++]
        try { await this.load(layer, i) } catch { /* shown as missing */ }
        onProgress?.(++done, tasks.length)
      }
    }
    await Promise.all(Array.from({ length: concurrency }, worker))
  }
  evict() {
    for (const [k, bmp] of this.bitmaps) {
      if (this.bitmaps.size <= this.capacity) break
      if (this.pinned.has(k)) continue
      bmp.close()
      this.bitmaps.delete(k)
    }
  }
}

// Pointer drags, touch swipes, the wheel and (optionally) the arrow keys as a
// continuous playhead with inertia. It knows nothing about drawing; it calls
// `onChange` whenever the view needs another frame.
export class OrbitController {
  constructor(count, start = 0) {
    this.count = count
    this.position = this.target = start
    this.velocity = 0
    this.dragging = false
    this.direction = 1
    this.hover = { x: 0, y: 0 }  // mouse position in -1..1
    this.hovering = false
    this.pointerId = null
    this.onChange = null
    this.onTap = null
    this.onFirstMove = null
    this.moved = false
  }
  get frame() { return wrap(Math.round(this.position), this.count) }
  get moving() { return this.dragging || Math.abs(this.velocity) > TUNING.minSpin || Math.abs(this.target - this.position) > 0.02 }
  step(frames) {
    this.velocity = 0
    this.target = Math.round(this.target) + frames
    this.direction = Math.sign(frames) || this.direction
    this.first()
    this.onChange?.()
  }
  first() { if (!this.moved) { this.moved = true; this.onFirstMove?.() } }
  attach(el, { keys = false } = {}) {
    this.el = el
    const opts = { passive: false }
    el.addEventListener('pointerdown', this.onDown)
    el.addEventListener('pointermove', this.onMove)
    el.addEventListener('pointerup', this.onUp)
    el.addEventListener('pointercancel', this.onUp)
    el.addEventListener('pointerleave', this.onLeave)
    el.addEventListener('wheel', this.onWheel, opts)
    if (keys) window.addEventListener('keydown', this.onKey)
    return () => {
      el.removeEventListener('pointerdown', this.onDown)
      el.removeEventListener('pointermove', this.onMove)
      el.removeEventListener('pointerup', this.onUp)
      el.removeEventListener('pointercancel', this.onUp)
      el.removeEventListener('pointerleave', this.onLeave)
      el.removeEventListener('wheel', this.onWheel, opts)
      window.removeEventListener('keydown', this.onKey)
      this.el = null
    }
  }
  update(dt) {
    const reduced = prefersReducedMotion()
    if (!this.dragging) {
      if (!reduced && Math.abs(this.velocity) > TUNING.minSpin) {
        this.target += this.velocity * dt
        this.velocity *= Math.exp(-TUNING.friction * dt)
      } else {
        this.velocity = 0
        // come to rest exactly on a rendered frame
        this.target += (Math.round(this.target) - this.target) * (reduced ? 1 : 1 - Math.exp(-10 * dt))
      }
    }
    this.position += (this.target - this.position) * (reduced ? 1 : 1 - Math.exp(-TUNING.follow * dt))
    if (Math.abs(this.target - this.position) < 0.002) this.position = this.target
  }
  onDown = event => {
    if (this.pointerId !== null || (event.pointerType === 'mouse' && event.button !== 0)) return
    this.pointerId = event.pointerId
    this.el?.setPointerCapture(event.pointerId)
    this.dragging = true
    this.dragMoved = false
    this.velocity = 0
    this.target = this.position
    this.downX = this.lastX = event.clientX
    this.downY = event.clientY
    this.downT = this.lastT = event.timeStamp
    this.onChange?.()
  }
  onMove = event => {
    if (event.pointerType === 'mouse' && this.pointerId === null && this.el) {
      const r = this.el.getBoundingClientRect()
      this.hover.x = ((event.clientX - r.left) / r.width) * 2 - 1
      this.hover.y = -(((event.clientY - r.top) / r.height) * 2 - 1)
      this.hovering = true
      this.onChange?.()
    }
    if (event.pointerId !== this.pointerId || !this.el) return
    if (!this.dragMoved && Math.hypot(event.clientX - this.downX, event.clientY - this.downY) > 6) { this.dragMoved = true; this.first() }
    const df = ((event.clientX - this.lastX) * TUNING.dragFramesPerScreen) / this.el.clientWidth
    const dtMs = Math.max(event.timeStamp - this.lastT, 1)
    this.target += df
    if (df) this.direction = Math.sign(df)
    this.velocity = this.velocity * 0.6 + ((df / dtMs) * 1000) * 0.4
    this.lastX = event.clientX
    this.lastT = event.timeStamp
    this.onChange?.()
  }
  onUp = event => {
    if (event.pointerId !== this.pointerId) return
    this.pointerId = null
    this.dragging = false
    if (event.timeStamp - this.lastT > 90) this.velocity = 0   // finger rested before lifting: no flick
    this.velocity = Math.max(-TUNING.maxSpin, Math.min(TUNING.maxSpin, this.velocity))
    if (!this.dragMoved && event.timeStamp - this.downT < 350 && this.el && event.type === 'pointerup') {
      const r = this.el.getBoundingClientRect()
      this.onTap?.((event.clientX - r.left) / r.width, 1 - (event.clientY - r.top) / r.height)
    }
    this.onChange?.()
  }
  onLeave = event => {
    if (event.pointerType === 'mouse' && this.pointerId === null) {
      this.hover.x = this.hover.y = 0
      this.hovering = false
      this.onChange?.()
    }
  }
  onWheel = event => {
    event.preventDefault()
    if (event.ctrlKey) return
    const d = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
    const px = event.deltaMode === 1 ? d * 16 : event.deltaMode === 2 ? d * 400 : d
    const df = -px * TUNING.wheelFramesPerPixel
    this.target += df
    this.velocity = 0
    if (df) this.direction = Math.sign(df)
    this.first()
    this.onChange?.()
  }
  onKey = event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    if (sceneStore.menuOpen || event.defaultPrevented || event.target.closest?.('input, select, textarea, [role="dialog"], [role="tablist"], [role="slider"]')) return
    event.preventDefault()
    this.step(event.key === 'ArrowRight' ? 1 : -1)
  }
}

// Per-pixel world positions, loaded per frame on demand, for naming the floor
// and wing under the pointer and lighting them in the shader.
const MAX_WORLD = 10
const decodeBytes = async url => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  const bitmap = await createImageBitmap(await res.blob(), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' })
  const canvas = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(bitmap.width, bitmap.height) : Object.assign(document.createElement('canvas'), { width: bitmap.width, height: bitmap.height })
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()
  return ctx.getImageData(0, 0, canvas.width, canvas.height).data
}
const dataTexture = (bytes, width, height, filter) => {
  const t = new THREE.DataTexture(bytes, width, height, THREE.RGBAFormat)
  t.minFilter = t.magFilter = filter
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  t.generateMipmaps = false
  t.flipY = false
  t.needsUpdate = true
  return t
}

class WorldData {
  constructor(manifest) {
    this.manifest = manifest
    this.maps = new Map()
    this.loading = new Set()
    this.wingMap = null
    this.listeners = new Set()
  }
  static async load() {
    const res = await fetch(`${orbit.path}/world/manifest.json`)
    if (!res.ok || !res.headers.get('content-type')?.includes('json')) return null
    const manifest = await res.json()
    if (manifest.version !== 2) return null
    const world = new WorldData(manifest)
    if (manifest.wingsMap) {
      try {
        const m = manifest.wingsMap
        const bytes = await decodeBytes(`${orbit.path}/world/${m.file}`)
        // linear filtering: the 0…255 labels blend over half a cell, a soft boundary
        world.wingMap = { bytes, texture: dataTexture(bytes, m.w, m.h, THREE.LinearFilter) }
      } catch { /* falls back to the plane between the wings */ }
    }
    return world
  }
  onLoaded(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn) }
  // A frame's textures if loaded; with `load`, a missing frame starts loading
  // (asked only once the orbit settles, so decoding never competes with a drag).
  textures(frame, load = true) {
    const map = this.maps.get(frame)
    if (map) { this.maps.delete(frame); this.maps.set(frame, map); return map.textures }
    if (load && this.manifest.frames.includes(frame) && !this.loading.has(frame)) this.fetch(frame)
    return null
  }
  // The world point at an image uv (0..1, v up); null on empty background.
  pick(frame, u, v) {
    const map = this.maps.get(frame)
    if (!map || u < 0 || u > 1 || v < 0 || v > 1) return null
    const { width, height, xyStep, zStep } = this.manifest
    const px = Math.min(width - 1, Math.floor(u * width))
    const py = Math.min(height - 1, Math.floor((1 - v) * height))
    const i = (py * width + px) * 4
    const { a, b } = map
    const qz = b[i + 1] * 256 + b[i + 2]
    if (qz === 0) return null
    const x = (a[i] * 256 + a[i + 1] - 32768) * xyStep
    const y = (a[i + 2] * 256 + b[i] - 32768) * xyStep
    const z = qz * zStep
    return { x, y, z, floor: this.floorAt(x, y, z), wing: this.wingAt(x, y) }
  }
  levelIndex(z) {
    const { levels } = this.manifest
    let n = 0
    for (let i = 0; i < levels.length; i++) if (z + 0.05 >= levels[i]) n = i
    return n
  }
  // The floor number at a point in the tower (from Floor 1 up), 0 elsewhere.
  floorAt(x, y, z) {
    const { tower: t, levels } = this.manifest
    const inTower = x >= t.minX && x <= t.maxX && y >= t.minY && y <= t.maxY
    return inTower && z >= levels[1] - 0.05 ? this.levelIndex(z) : 0
  }
  wingAt(x, y) {
    const map = this.manifest.wingsMap
    if (map && this.wingMap) {
      const cx = Math.floor((x - map.x0) / map.res), cy = Math.floor((y - map.y0) / map.res)
      if (cx >= 0 && cy >= 0 && cx < map.w && cy < map.h) return this.wingMap.bytes[((map.h - 1 - cy) * map.w + cx) * 4] > 127 ? 1 : 0
    }
    const w = this.manifest.wings
    if (!w) return 0
    return (x - w.mid[0]) * w.dir[0] + (y - w.mid[1]) * w.dir[1] > 0 ? 1 : 0
  }
  wingName(wing) { return this.manifest.wings?.names[wing] ?? 'A' }
  async fetch(frame) {
    this.loading.add(frame)
    try {
      const id = pad(frame), ext = this.manifest.ext ?? 'png'
      const [a, b] = await Promise.all([decodeBytes(`${orbit.path}/world/${id}-a.${ext}`), decodeBytes(`${orbit.path}/world/${id}-b.${ext}`)])
      const { width, height } = this.manifest
      this.maps.set(frame, { a, b, textures: [dataTexture(a, width, height, THREE.NearestFilter), dataTexture(b, width, height, THREE.NearestFilter)] })
      for (const [key, map] of this.maps) {
        if (this.maps.size <= MAX_WORLD) break
        if (key === frame) continue
        map.textures.forEach(t => t.dispose())
        this.maps.delete(key)
      }
      this.listeners.forEach(fn => fn())
    } catch { /* this frame stays without floor picking */ } finally {
      this.loading.delete(frame)
    }
  }
}

// The visit's one engine: frames, their download, the world data (loaded the
// first time a page asks for floors), and the angle last shown, so the next
// view of the orbit picks up where the last one left it.
let engine = null
export function orbitEngine() {
  if (engine) return engine
  const source = frameSource()
  const frames = new FrameStore(source, lowMemory() ? 18 : 36)
  engine = { source, frames, world: null, worldPromise: null, frame: 0, progress: 0, progressListeners: new Set() }
  const report = (done, total) => {
    engine.progress = done / total
    engine.progressListeners.forEach(fn => fn(engine.progress))
  }
  // Every pass of each angle together, nearest the view first, so the night
  // render is already there when the light changes. One connection is left
  // free for the frames the view asks for. With data saver on, frames load
  // only as the view reaches them.
  if (saveData()) report(1, 1)
  else frames.preload(['day', 'depth', 'alpha', 'night'], engine.frame, 5, report)
  return engine
}
export function orbitWorld() {
  const e = orbitEngine()
  if (!e.worldPromise) e.worldPromise = WorldData.load().catch(() => null).then(world => (e.world = world))
  return e.worldPromise
}
