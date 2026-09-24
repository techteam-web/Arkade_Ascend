import { ribbonPars, ribbonDisplace, ribbonDisplaceWithNormals, fragHelpers, fragBody } from './shaders.js'

export function patchRibbon(mat, uniforms, withNormals) {
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + ribbonPars)
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n' +
          (withNormals ? ribbonDisplaceWithNormals : ribbonDisplace)
      )
    if (withNormals) {
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\n' + fragHelpers)
        .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n' + fragBody)
    }
  }
  // three's program cache key is derived from material properties and does
  // NOT account for onBeforeCompile. Two materials with identical property
  // signatures but different injected GLSL can therefore collide and get
  // served the wrong compiled program — which shows up as intermittent
  // black or garbage frames. Give each variant its own key.
  mat.customProgramCacheKey = () => (withNormals ? 'ribbon-visible-bronze-v2' : 'ribbon-depth-v1')
  mat.needsUpdate = true
  return mat
}

