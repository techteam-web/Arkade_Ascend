import * as THREE from 'three'

// Map a DOM element's box onto the z = 0 plane of the shared scene, so 3D
// objects can sit inside CSS layouts. Returns world-space centre, bottom and
// size, or null when the anchor is absent or collapsed.
export function fitToAnchor(element, gl, camera, size) {
  const anchor = element?.getBoundingClientRect()
  const canvas = gl.domElement.getBoundingClientRect()
  if (!anchor?.width || !anchor.height || !canvas.width) return null
  const viewH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
  const viewW = viewH * (size.width / size.height)
  return {
    x: ((anchor.left + anchor.width / 2 - canvas.left) / canvas.width - 0.5) * viewW,
    y: (0.5 - (anchor.top + anchor.height / 2 - canvas.top) / canvas.height) * viewH,
    bottom: (0.5 - (anchor.bottom - canvas.top) / canvas.height) * viewH,
    width: (anchor.width / canvas.width) * viewW,
    height: (anchor.height / canvas.height) * viewH,
  }
}
