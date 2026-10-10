import { Component, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { orbit } from '../../content/project.js'
import { OrbitController, orbitEngine, orbitWorld } from './engine.js'
import OrbitStage from './OrbitStage.jsx'

const coarse = () => window.matchMedia?.('(pointer: coarse)').matches

// The rendered orbit of the tower, ready for a page: drag, swipe or scroll
// to turn it; with `pickable`, point at a floor to light it and click or tap
// to choose it (`floor`, `onFloor`, `onHover` carry { tower, n }; `canPick`
// says which floors have homes). `light` is day, evening or night; `sky`
// paints a sky behind the matte, otherwise the page shows through it.
// `turn` is a counter the page bumps to step the view round.
export default function OrbitView({ light = 'day', sky = true, pickable = false, floor = null, onFloor, onHover, canPick, turn, zoom = 1, keys = false, onFirstMove, label, className = '' }) {
  const box = useRef(null)
  const engine = useMemo(orbitEngine, [])
  const controller = useMemo(() => new OrbitController(engine.source.count, engine.frame), [engine])
  const [world, setWorld] = useState(engine.world)
  const [ready, setReady] = useState(false)
  const [progress, setProgress] = useState(engine.progress)
  const [pointing, setPointing] = useState(false)

  useEffect(() => controller.attach(box.current, { keys }), [controller, keys])
  useEffect(() => { controller.onFirstMove = onFirstMove }, [controller, onFirstMove])
  useEffect(() => { if (pickable && !world) orbitWorld().then(setWorld) }, [pickable, world])
  useEffect(() => {
    if (engine.progress >= 1) return
    const update = value => setProgress(value)
    engine.progressListeners.add(update)
    return () => engine.progressListeners.delete(update)
  }, [engine])
  const turned = useRef(turn?.count ?? 0)
  useEffect(() => {
    if (!turn || turn.count === turned.current) return
    turned.current = turn.count
    controller.step(turn.direction * 8)   // about 29 degrees round
  }, [turn, controller])

  // Only floors with homes light up and are reported.
  const hover = next => {
    const ok = next && (!canPick || canPick(next.tower, next.n))
    setPointing(!!ok)
    onHover?.(ok ? next : null)
    return !!ok
  }
  const choose = next => { if (!canPick || canPick(next.tower, next.n)) onFloor?.(next) }

  const poster = orbit.poster[light === 'day' ? 'day' : 'night']
  return <div ref={box} data-own-gesture role="img" aria-label={label}
    className={`absolute inset-0 touch-pan-y select-none ${pointing ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'} ${className}`}>
    {/* The opening view, until the first frame is drawn (and without WebGL). */}
    <img src={poster} alt="" draggable="false" className={`pointer-events-none absolute inset-0 size-full object-cover transition-opacity duration-700 ${ready ? 'opacity-0' : 'opacity-100'}`} style={{ transform: zoom !== 1 ? `scale(${zoom})` : undefined }} />
    <WithoutWebGL>
      <Canvas className="absolute! inset-0" frameloop="demand" linear flat dpr={[1, coarse() ? 1.5 : 1.75]}
        gl={{ antialias: false, alpha: !sky, premultipliedAlpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => gl.setClearColor(new THREE.Color(0, 0, 0), 0)}>
        <OrbitStage engine={engine} controller={controller} world={pickable ? world : null} light={light} sky={sky} pickable={pickable && !!world}
          floor={floor} zoom={zoom} onFloor={choose} onHover={hover} onReady={() => setReady(true)} />
      </Canvas>
    </WithoutWebGL>
    {!ready && <p aria-live="polite" className="pointer-events-none absolute inset-x-0 bottom-[18%] text-center text-[0.58rem] uppercase tracking-[0.3em] text-ivory/80 [text-shadow:0_1px_8px_rgba(0,0,0,.5)]">
      Loading orbit <span className="num">{Math.round(progress * 100)}</span>%
    </p>}
  </div>
}

// Without WebGL the opening view stays, still.
class WithoutWebGL extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? null : this.props.children }
}
