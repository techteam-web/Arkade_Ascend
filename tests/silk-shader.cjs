// Shader assembly check for the restored classic ribbon appearance.
const assert = require('node:assert/strict');
const THREE = require('three');
const { patchRibbon } = require('../src/scenes/gold-ribbon/material.js');
function expand(shader) {
  return shader.replace(/#include <([\w\d_]+)>/g, (_, name) => {
    assert(THREE.ShaderChunk[name], `missing chunk: ${name}`);
    return expand(THREE.ShaderChunk[name]);
  });
}
for (const visible of [true, false]) {
  const lib = visible ? THREE.ShaderLib.physical : THREE.ShaderLib.depth;
  const shader = { uniforms: {}, vertexShader: lib.vertexShader, fragmentShader: lib.fragmentShader };
  const material = visible ? new THREE.MeshPhysicalMaterial() : new THREE.MeshDepthMaterial();
  patchRibbon(material, {}, visible).onBeforeCompile(shader);
  const vertex = expand(shader.vertexShader);
  const fragment = expand(shader.fragmentShader);
  assert(vertex.includes('uWrapPhase'), 'retain tower-wrap geometry');
  assert(!vertex.includes('sampleTime'), 'no stale lifecycle references');
  if (visible) {
    assert(fragment.includes('silkSpec(T, L, V, 24.0)'), 'classic soft silk highlight restored');
    assert(fragment.includes('gl_FragColor.rgb = col;'), 'classic gold treatment restored');
  }
  material.dispose();
}
console.log('PASS: restored classic ribbon shader assembly, with tower wrapping retained.');
