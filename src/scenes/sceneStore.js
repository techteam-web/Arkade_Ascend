import { useEffect } from 'react'

// Scene presets, one per brochure mood. Colours are sRGB hex; the scene damps
// every value toward the active preset, so switching is always a smooth blend.
// The silk veil appears only on Home and on the brochure's gilded spread;
// every other page sits on a still gradient, so content leads.
// Pose x/y are fractions of the half-viewport, so placement holds at any aspect.
const still = (top, bottom, glow, glowPos, glowStrength = 0.5, vignette = 0.5) => ({
  top, bottom, glow, glowPos, glowStrength, vignette,
  shadow: '#2a160e', mid: '#8e643a', high: '#f0d2a0', opacity: 0, sheer: 0.3,
  pose: { x: 0, y: -0.9, rot: 0, scale: 1 }, speed: 0.6,
})

export const presets = {
  // Espresso night with the gold veil across the title.
  home: {
    top: '#2c1b1f', bottom: '#120b0d', glow: '#5c3f3e', glowPos: [0.5, 0.52], glowStrength: 0.8, vignette: 0.55,
    shadow: '#2a160e', mid: '#946a3d', high: '#f2d5a3', opacity: 0.92, sheer: 0.42,
    pose: { x: 0, y: -0.04, rot: -0.12, scale: 1 }, speed: 0.8,
  },
  // Page 2 exactly: the #cea572 gold ground and a champagne veil.
  gilded: {
    top: '#dab686', bottom: '#b5895a', glow: '#efd6ab', glowPos: [0.78, 0.72], glowStrength: 0.5, vignette: 0.28,
    shadow: '#74502f', mid: '#c29462', high: '#fdeccf', opacity: 0.95, sheer: 0.56,
    pose: { x: 0, y: -0.14, rot: -0.06, scale: 1.08 }, speed: 0.7,
  },
  // Full-bleed photographs cover these two; the ground only shows at the edges.
  cover: still('#23161a', '#0f090a', '#3f2a2c', [0.3, 0.7], 0.6, 0.6),
  heart: still('#1f1417', '#0e0809', '#3a272b', [0.7, 0.5], 0.5, 0.6),
  // Page 3's plum ground.
  homebuyers: still('#4f353b', '#382629', '#5f4449', [0.25, 0.5], 0.35, 0.45),
  plum: still('#553a40', '#3c292e', '#6b4e54', [0.72, 0.6], 0.45, 0.4),
  tower: still('#24171b', '#0e090a', '#4d3438', [0.64, 0.42], 0.7, 0.55),
  residences: still('#2a1a1e', '#110a0c', '#553a3a', [0.62, 0.45], 0.6, 0.5),
  // Pages 5 and 6: cream paper.
  cream: still('#f8f3de', '#ebe0bb', '#fffaf0', [0.25, 0.8], 0.45, 0.14),
  amenities: still('#2b1b1f', '#100a0b', '#523838', [0.5, 0.5], 0.6, 0.55),
  views: still('#1a1012', '#0b0607', '#3a2427', [0.5, 0.5], 0.4, 0.6),
  gallery: still('#26181c', '#0f090a', '#4a3134', [0.5, 0.45], 0.6, 0.55),
  menu: still('#26181c', '#0c0708', '#50363a', [0.74, 0.5], 0.7, 0.6),
  enquire: still('#2c1b1f', '#110a0c', '#5a3d3d', [0.75, 0.5], 0.6, 0.5),
}

// A plain mutable object shared by the DOM and the render loop. The scene
// reads it every frame; nothing here triggers React renders.
export const sceneStore = {
  preset: 'home',
  menuOpen: false,
  leaving: false,       // a page is playing its exit
  dirty: true,          // the canvas renders only while something moves
}

export function setScenePreset(name) {
  if (presets[name]) { sceneStore.preset = name; sceneStore.dirty = true }
}

// Pages call this to hold their mood while mounted.
export function useScenePreset(name) {
  useEffect(() => { setScenePreset(name) }, [name])
}
