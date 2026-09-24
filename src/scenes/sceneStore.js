import { useEffect } from 'react'

// Scene presets, one per brochure mood. Colours are sRGB hex; the scene damps
// every value toward the active preset, so switching is always a smooth blend.
// Pose x/y are fractions of the half-viewport, so placement holds at any aspect.
export const presets = {
  // Espresso night with the full gold veil across the title.
  home: {
    top: '#2c1b1f', bottom: '#120b0d', glow: '#5c3f3e', glowPos: [0.5, 0.52], glowStrength: 0.85, vignette: 0.55,
    shadow: '#2a160e', mid: '#946a3d', high: '#f2d5a3', opacity: 0.95, glitter: 1, sheer: 0.42,
    pose: { x: 0, y: -0.04, rot: -0.12, scale: 1 }, dust: 0.9, dustColor: '#e9c48d', speed: 1,
  },
  // Page 1: dark satin, the veil a quiet presence low on the frame.
  cover: {
    top: '#23161a', bottom: '#0f090a', glow: '#3f2a2c', glowPos: [0.3, 0.7], glowStrength: 0.7, vignette: 0.6,
    shadow: '#1f110b', mid: '#7a5431', high: '#e3c08c', opacity: 0.55, glitter: 0.8, sheer: 0.32,
    pose: { x: 0.25, y: -0.72, rot: 0.1, scale: 1.05 }, dust: 0.5, dustColor: '#e0b77e', speed: 0.8,
  },
  // Page 2 exactly: the #cea572 gold ground and a champagne veil.
  gilded: {
    top: '#dab686', bottom: '#b5895a', glow: '#efd6ab', glowPos: [0.78, 0.72], glowStrength: 0.55, vignette: 0.28,
    shadow: '#74502f', mid: '#c29462', high: '#fdeccf', opacity: 1, glitter: 1.15, sheer: 0.56,
    pose: { x: 0, y: -0.14, rot: -0.06, scale: 1.08 }, dust: 0.55, dustColor: '#fff0d4', speed: 0.9,
  },
  // Page 3's plum ground.
  plum: {
    top: '#553a40', bottom: '#3c292e', glow: '#6b4e54', glowPos: [0.72, 0.6], glowStrength: 0.5, vignette: 0.4,
    shadow: '#2a1a1c', mid: '#7d5a44', high: '#e3c292', opacity: 0, glitter: 0.8, sheer: 0.22,
    pose: { x: 0.35, y: 0.3, rot: 0.42, scale: 0.95 }, dust: 0, dustColor: '#e3c292', speed: 0.7,
    threads: 1, threadColor: '#ecc892', threadPose: { y: -0.12, rot: -0.14 }, mist: 0.28, mistColor: '#6e5057',
  },
  // Page 3 inside the Neu Gen story: the plum ground with a quiet silk kept
  // clear of the text, so the copy reads cleanly.
  homebuyers: {
    top: '#4f353b', bottom: '#382629', glow: '#5f4449', glowPos: [0.25, 0.5], glowStrength: 0.35, vignette: 0.45,
    shadow: '#2a1a1c', mid: '#7d5a44', high: '#e3c292', opacity: 0.32, glitter: 0.6, sheer: 0.2,
    pose: { x: 0.2, y: -0.86, rot: 0.06, scale: 1.05 }, dust: 0.2, dustColor: '#e3c292', speed: 0.6,
  },
  heart: {
    top: '#1f1417', bottom: '#0e0809', glow: '#3a272b', glowPos: [0.7, 0.5], glowStrength: 0.5, vignette: 0.6,
    shadow: '#1f110b', mid: '#6f4c2d', high: '#dcb884', opacity: 0.35, glitter: 0.6, sheer: 0.2,
    pose: { x: 0, y: -0.9, rot: 0, scale: 1.1 }, dust: 0.3, dustColor: '#e0b77e', speed: 0.7,
  },
  tower: {
    top: '#24171b', bottom: '#0e090a', glow: '#4d3438', glowPos: [0.64, 0.42], glowStrength: 0.75, vignette: 0.55,
    shadow: '#23130c', mid: '#8a6038', high: '#efcf9c', opacity: 0.7, glitter: 0.9, sheer: 0.32,
    pose: { x: 0.1, y: -0.74, rot: 0.04, scale: 1.15 }, dust: 0.55, dustColor: '#e9c48d', speed: 0.8,
  },
  residences: {
    top: '#2a1a1e', bottom: '#110a0c', glow: '#553a3a', glowPos: [0.62, 0.45], glowStrength: 0.7, vignette: 0.5,
    shadow: '#2a160e', mid: '#8e643a', high: '#f0d2a0', opacity: 0.75, glitter: 0.9, sheer: 0.34,
    pose: { x: 0.12, y: -0.62, rot: 0.12, scale: 1.05 }, dust: 0.6, dustColor: '#e9c48d', speed: 0.85,
  },
  // Pages 5 and 6: cream paper, the veil pushed into a corner.
  cream: {
    top: '#f8f3de', bottom: '#ebe0bb', glow: '#fffaf0', glowPos: [0.25, 0.8], glowStrength: 0.45, vignette: 0.14,
    shadow: '#9a7147', mid: '#d0ad7c', high: '#fff7e8', opacity: 0, glitter: 0.7, sheer: 0.22,
    pose: { x: 0.62, y: 0.78, rot: 0.32, scale: 0.8 }, dust: 0, dustColor: '#b88c56', speed: 0.6,
    threads: 0.6, threadLight: 1, threadColor: '#a47a4c', threadPose: { y: 0.08, rot: -0.1 }, mist: 0.5, mistColor: '#fffbef',
  },
  amenities: {
    top: '#2b1b1f', bottom: '#100a0b', glow: '#523838', glowPos: [0.5, 0.5], glowStrength: 0.8, vignette: 0.55,
    shadow: '#2a160e', mid: '#8e643a', high: '#f0d2a0', opacity: 0, glitter: 0.9, sheer: 0.3,
    pose: { x: 0, y: -0.5, rot: -0.08, scale: 1.1 }, dust: 0, dustColor: '#e9c48d', speed: 0.8,
    threads: 0.9, threadPose: { y: -0.3, rot: 0.05 }, mist: 0.22, mistColor: '#57393b',
  },
  views: {
    top: '#1a1012', bottom: '#0b0607', glow: '#3a2427', glowPos: [0.5, 0.5], glowStrength: 0.4, vignette: 0.6,
    shadow: '#2a160e', mid: '#8e643a', high: '#f0d2a0', opacity: 0, glitter: 0, sheer: 0.2,
    pose: { x: 0, y: -1.2, rot: 0, scale: 1 }, dust: 0.25, dustColor: '#e9c48d', speed: 0.6,
  },
  gallery: {
    top: '#26181c', bottom: '#0f090a', glow: '#4a3134', glowPos: [0.5, 0.45], glowStrength: 0.75, vignette: 0.55,
    shadow: '#2a160e', mid: '#8e643a', high: '#f0d2a0', opacity: 0, glitter: 0.85, sheer: 0.3,
    pose: { x: 0, y: -0.82, rot: 0, scale: 1.15 }, dust: 0, dustColor: '#e9c48d', speed: 0.8,
    threads: 0.85, threadPose: { y: -0.5, rot: -0.04 }, mist: 0.18, mistColor: '#57393b',
  },
  // The menu: dark satin mist, faint threads and the gold emblem.
  menu: {
    top: '#26181c', bottom: '#0c0708', glow: '#50363a', glowPos: [0.74, 0.5], glowStrength: 0.9, vignette: 0.6,
    shadow: '#2a160e', mid: '#8e643a', high: '#f0d2a0', opacity: 0, glitter: 0.8, sheer: 0.3,
    pose: { x: 0, y: -0.9, rot: 0, scale: 1 }, dust: 0, dustColor: '#e9c48d', speed: 0.7,
    threads: 0.4, threadPose: { y: -0.62, rot: 0.08 }, mist: 0.5, mistColor: '#6e4c44',
  },
  enquire: {
    top: '#2c1b1f', bottom: '#110a0c', glow: '#5a3d3d', glowPos: [0.75, 0.5], glowStrength: 0.8, vignette: 0.5,
    shadow: '#2a160e', mid: '#946a3d', high: '#f2d5a3', opacity: 0.9, glitter: 1, sheer: 0.38,
    pose: { x: 0.5, y: 0.02, rot: 1.05, scale: 0.95 }, dust: 0.8, dustColor: '#e9c48d', speed: 0.9,
  },
}

// A plain mutable object shared by the DOM and the render loop. The scene
// reads it every frame; nothing here triggers React renders.
export const sceneStore = {
  preset: 'home',
  tower: {
    visible: false,
    floor: -1,           // selected floor index, -1 for none
    hover: -1,           // floor under the pointer, -1 for none
    floors: 32,
    yaw: 0,              // target rotation, radians
    dragging: false,
    anchor: null,        // DOM element the model fits into
    pointer: null,       // { x, y, dirty } client position for hover picking
    pick: null,          // { x, y } client position of a tap to select
    onHover: null,       // (floor) => void, called when the hovered floor changes
    onPick: null,        // (floor) => void, called when a floor is tapped
    callout: null,       // viewport positions beside the shown floor
  },
  menuOpen: false,
  leaving: false,       // a page is playing its exit; page-owned 3D should leave with it
  emblem: {
    visible: false,
    anchor: null,        // DOM element the menu emblem fits into
    turn: 0,             // accumulated turns requested by menu hovers
  },
}

export function setScenePreset(name) {
  if (presets[name]) sceneStore.preset = name
}

// Pages call this to hold their mood while mounted.
export function useScenePreset(name) {
  useEffect(() => { setScenePreset(name) }, [name])
}
