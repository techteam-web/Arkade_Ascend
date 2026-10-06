// Builds the Location map's lighter copy of the tower model.
//
//   cd tools/map-model && npm install && npm run build
//
// Reads public/models/ascend-block.glb (the model Residences shows) and writes
// public/models/ascend-map.glb. Seen from the map, the tower is at most a few
// hundred pixels tall, so it needs far less than the full model:
//
// 1. Merge. Repeated parts are expanded and merged into one mesh per
//    material: a couple of dozen draw calls instead of several hundred.
// 2. Simplify. Normals are dropped (three.js shades a mesh without normals
//    flat, which suits the architecture, and hard edges no longer split the
//    vertices, so the simplifier can merge them). Each material is then
//    simplified as far as it still looks the same: about 6 cm on the tower,
//    finer for the rails and louvres, and the crown's sign is left exact.
// 3. Hidden faces. The model is drawn from 7,200 directions around it
//    (bake.html), every triangle in its own colour: all round, from 10
//    degrees below the horizon to straight down, which covers everywhere the
//    map's camera can be (pitch up to 70) with a margin. Triangles that never
//    show are removed, except that a flat face any of which shows is kept
//    whole. About two in five of the simplified triangles go: the backs of
//    fins against walls, the undersides of ledges, everything inside.
// 4. Compress, like the full model (quantized, meshopt).
//
// Checked against the simplified model before step 3 from 204 map cameras
// (zooms 16 to 18, pitch 0 to 70, all round, and a landscape phone's low
// camera close to the tower): 0.08% of the tower's pixels differ, as single
// pixels along window edges. If the map's camera is ever allowed lower (a
// pitch above about 80), lower the bake's lowest direction to match.
//
// Step 3 runs in Chrome (about four minutes): set CHROME to its path if it is
// not in the usual macOS place. BAKE takes the bake's settings as a query
// string, e.g. BAKE='bearing=0.5&size=3072' for a finer, slower bake.
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions'
import { compactPrimitive, dedup, dequantize, flatten, join, prune, quantize, simplifyPrimitive, textureCompress, uninstance, weld } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer'
import puppeteer from 'puppeteer-core'
import sharp from 'sharp'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const SOURCE = process.env.SOURCE ?? path.join(here, '../../public/models/ascend-block.glb')
const OUTPUT = process.env.OUTPUT ?? path.join(here, '../../public/models/ascend-map.glb')
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

// Simplification error, as a fraction of each merged mesh's size (the tower's
// is about 100 m across, so 0.0006 is about 6 cm).
const ERROR = 0.0006
const FINER = { Heather_Soles1: 0.0004 }                  // rails and louvres
const EXACT = ['D04_Dandelion_Burst', 'C05_Golden_Blaze']  // the crown's sign

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready])
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder })
const document = await io.read(SOURCE)
const primitives = () => document.getRoot().listMeshes().flatMap(mesh => mesh.listPrimitives().map(prim => ({ mesh, prim })))
const triangles = () => primitives().reduce((sum, { prim }) => sum + (prim.getIndices()?.getCount() ?? 0) / 3, 0)
const textured = prim => Boolean(prim.getMaterial()?.getBaseColorTexture())

// Normals go; texture coordinates stay only where a texture uses them.
const dropNormals = () => doc => {
  for (const mesh of doc.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) {
    prim.getAttribute('NORMAL')?.dispose()
    if (!textured(prim)) for (const semantic of prim.listSemantics()) if (semantic.startsWith('TEXCOORD')) prim.getAttribute(semantic).dispose()
  }
}
const simplifyEach = () => () => {
  for (const { mesh, prim } of primitives()) {
    const name = prim.getMaterial()?.getName() ?? ''
    if (EXACT.includes(name)) continue
    simplifyPrimitive(prim, { simplifier: MeshoptSimplifier, ratio: 0, error: FINER[name] ?? ERROR, lockBorder: false })
    // A part that collapses entirely is too small to see from the map.
    if (!prim.getIndices()?.getCount()) { mesh.removePrimitive(prim); prim.dispose() }
  }
}

const sourceTriangles = await countSource()
await document.transform(dequantize(), dropNormals(), uninstance(), flatten(), join({ keepNamed: false }), weld(), simplifyEach(), prune(), dedup(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [256, 256] }))
const simplified = triangles()
// The bake reads plain buffers; compression comes back at the end.
document.getRoot().listExtensionsUsed().find(extension => extension.extensionName === 'EXT_meshopt_compression')?.dispose()

// Each primitive is tagged, so the bake can name it (the loader copies a
// primitive's extras onto its geometry).
primitives().forEach(({ prim }, id) => prim.setExtras({ bake: id }))
const seen = await bake(await io.writeBinary(document))
for (const { mesh, prim } of primitives()) {
  const part = seen.parts.find(item => item.id === prim.getExtras().bake)
  prim.setExtras({})
  if (!part || part.keepAll) continue
  const indices = prim.getIndices().getArray()
  const keep = wholeFaces(prim, seen.flags.subarray(part.offset, part.offset + part.triangles))
  const kept = []
  for (let t = 0; t < part.triangles; t++) {
    if (keep[t]) kept.push(indices[t * 3], indices[t * 3 + 1], indices[t * 3 + 2])
  }
  if (!kept.length) { mesh.removePrimitive(prim); prim.dispose(); continue }
  prim.getIndices().setArray(new Uint32Array(kept))
  compactPrimitive(prim)
}
const visible = triangles()

await document.transform(prune(), dedup(), quantize({ quantizePosition: 14 }))
document.createExtension(EXTMeshoptCompression).setRequired(true)
  .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE })
await io.write(OUTPUT, document)

const kb = file => Math.round(fs.statSync(file).size / 1024)
console.log(`source      ${sourceTriangles.toLocaleString()} triangles, ${kb(SOURCE)} KB`)
console.log(`simplified  ${simplified.toLocaleString()} triangles`)
console.log(`visible     ${visible.toLocaleString()} triangles (${seen.views} views)`)
console.log(`written     ${path.relative(process.cwd(), OUTPUT)}, ${kb(OUTPUT)} KB, ${primitives().length} draw calls`)

// A flat face is kept whole when any of it was seen: the seen triangles
// spread to neighbours across shared edges while those lie in the same plane
// (within 5 degrees). A face seen only through a narrow gap, half of whose
// triangles the bake happened to catch, so stays whole, while hidden backs
// and undersides, which meet the seen faces at an angle, still go.
function wholeFaces(prim, flags) {
  const indices = prim.getIndices().getArray()
  const position = prim.getAttribute('POSITION')
  const count = indices.length / 3
  const vertex = i => position.getElement(i, [])
  const normals = new Float64Array(count * 3)
  for (let t = 0; t < count; t++) {
    const [a, b, c] = [0, 1, 2].map(k => vertex(indices[t * 3 + k]))
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
    const length = Math.hypot(...n) || 1
    normals.set(n.map(value => value / length), t * 3)
  }
  const span = position.getCount()
  const edges = new Map()
  const edgeKey = (a, b) => a < b ? a * span + b : b * span + a
  for (let t = 0; t < count; t++) {
    for (let k = 0; k < 3; k++) {
      const key = edgeKey(indices[t * 3 + k], indices[t * 3 + (k + 1) % 3])
      if (!edges.has(key)) edges.set(key, [])
      edges.get(key).push(t)
    }
  }
  const SAME_PLANE = Math.cos(5 * Math.PI / 180)
  const keep = Uint8Array.from(flags)
  const queue = []
  for (let t = 0; t < count; t++) if (keep[t]) queue.push(t)
  while (queue.length) {
    const t = queue.pop()
    for (let k = 0; k < 3; k++) {
      for (const other of edges.get(edgeKey(indices[t * 3 + k], indices[t * 3 + (k + 1) % 3]))) {
        if (keep[other]) continue
        const dot = normals[t * 3] * normals[other * 3] + normals[t * 3 + 1] * normals[other * 3 + 1] + normals[t * 3 + 2] * normals[other * 3 + 2]
        if (Math.abs(dot) > SAME_PLANE) { keep[other] = 1; queue.push(other) }
      }
    }
  }
  return keep
}

// Triangles drawn by the full model, repeated parts counted once per copy.
async function countSource() {
  const source = await io.read(SOURCE)
  let sum = 0
  for (const node of source.getRoot().listNodes()) {
    const mesh = node.getMesh()
    if (!mesh) continue
    const copies = node.getExtension('EXT_mesh_gpu_instancing')?.getAttribute('TRANSLATION')?.getCount() ?? 1
    for (const prim of mesh.listPrimitives()) sum += copies * (prim.getIndices()?.getCount() ?? prim.getAttribute('POSITION').getCount()) / 3
  }
  return sum
}

// Draws the model in bake.html and returns which triangles were seen.
async function bake(glb) {
  const three = path.dirname(path.dirname(createRequire(path.join(here, 'build.mjs')).resolve('three')))
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.glb': 'model/gltf-binary' }
  const server = http.createServer((request, response) => {
    const url = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
    const file = url === '/' ? path.join(here, 'bake.html') : url.startsWith('/three/') ? path.join(three, url.slice(7)) : null
    if (url === '/model.glb') { response.writeHead(200, { 'content-type': types['.glb'] }); response.end(glb); return }
    if (!file || !file.startsWith(url === '/' ? here : three) || !fs.existsSync(file)) { response.writeHead(404); response.end(); return }
    response.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' })
    fs.createReadStream(file).pipe(response)
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', protocolTimeout: 10 * 60 * 1000, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] })
  try {
    const page = await browser.newPage()
    page.on('pageerror', error => console.error('bake:', error.message))
    await page.goto(`http://127.0.0.1:${server.address().port}/${process.env.BAKE ? `?${process.env.BAKE}` : ''}`)
    // The page pauses between batches of views, so it can be asked how far it is.
    for (;;) {
      const state = await page.evaluate(() => ({ done: Boolean(window.result), failure: window.failure, progress: window.progress ?? 0 }))
      if (state.failure) throw new Error(state.failure)
      if (state.done) break
      process.stdout.write(`\rbaking ${Math.round(state.progress * 100)}%`)
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    process.stdout.write('\r')
    const result = await page.evaluate('window.result')
    return { ...result, flags: Buffer.from(result.flags, 'base64') }
  } finally {
    await browser.close()
    server.close()
  }
}
