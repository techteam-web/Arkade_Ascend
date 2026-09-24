// Runs the production choreography with real GSAP and layout stubs.
// Covers timing/state/reverse regression, not browser or shader rendering.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { gsap: real } = require('gsap/dist/gsap');
const motion = { current: { progress: 1, residences: 0, residenceLight: 0, residenceDepthReady: true, energy: 0 } };
let captured;
let callbacks;
const restored = [];
global.requestAnimationFrame = () => 1;
global.cancelAnimationFrame = () => {};
const elements = new Map();
function element(name) {
  if (!elements.has(name)) elements.set(name, {
    dataset: { route: name.includes('residences') ? 'residences' : name },
    querySelector: child => element(name + child),
    getBoundingClientRect: () => ({ left: 100, top: 100, width: 200, height: 100 }),
  });
  return elements.get(name);
}
function targets(target) {
  if (target === motion.current) return target;
  const count = Array.isArray(target) ? target.length : typeof target === 'string' && /residence-action|tower-callout|residence-tower/.test(target) ? 2 : 1;
  return Array.from({ length: count }, () => ({}));
}
function vars(value) {
  return Object.fromEntries(Object.entries(value).filter(([key]) =>
    ['duration', 'ease', 'stagger', 'residences', 'residenceSweep', 'residenceWrap', 'residenceWrapPhase', 'residenceDepth', 'energy'].includes(key)));
}
const gsap = {
  context(fn) { fn(); return { revert() {} }; },
  set(target, values) { restored.push({ target, values }); }, getProperty() { return 0; },
  timeline(options) {
    callbacks = options;
    const tl = real.timeline({ paused: true, defaults: options.defaults });
    captured = tl;
    const api = {
      addLabel(name, time) { tl.addLabel(name, time); return api; },
      to(t, v, time) { tl.to(targets(t), vars(v), time); return api; },
      fromTo(t, a, b, time) { tl.fromTo(targets(t), vars(a), vars(b), time); return api; },
      set(t, v, time) { tl.set(targets(t), vars(v), time); return api; },
      progress(n) { tl.progress(n, true); return api; }, play() { return api; },
      timeScale(n) { tl.timeScale(n); return api; },
      reverse() { tl.reverse().pause(); return api; },
    };
    return api;
  },
};
const source = fs.readFileSync('src/transitions/useResidencesTransition.js', 'utf8').trimStart()
  .replace(/^import .*$/gm, '').replace('export default function', 'function');
const create = new Function('gsap', 'useRef', 'useEffect', 'matchMedia', 'getComputedStyle', `${source}\nreturn useResidencesTransition;`);
const hook = create(gsap, value => ({ current: value }), () => {}, () => ({ matches: false }), () => ({ letterSpacing: '2px' }));
const root = { current: {
  classList: { add() {}, remove() {} },
  dispatchEvent() {},
  querySelector: element,
  querySelectorAll: () => [element('[data-route="residences"]'), element('gallery'), element('home')],
} };
const navigation = hook({ root, motion, intro: { current: null }, setPage() {}, setEntered() {}, setBusy() {} });
navigation.openResidences();
assert(Math.abs(captured.duration() - 2.1) < .001);
assert(Math.abs(captured.duration() / captured.timeScale() - 3.5) < .001);
for (let n = 0; n < 3; n++) {
  captured.time(.9, true);
  assert.equal(motion.current.residenceDepth, 1);
  assert(motion.current.residenceWrap > .8);
  assert(motion.current.residenceWrapPhase > 0 && motion.current.residenceWrapPhase < 1);
  captured.time(1.53, true);
  assert.equal(motion.current.residenceDepth, 0);
  assert.equal(motion.current.residenceWrap, 0);
  captured.time(2.1, true);
  assert.equal(motion.current.residences, 1);
  const lightingSource = fs.readFileSync('src/pages/residences/ResidencesExperience.jsx', 'utf8');
  assert.match(lightingSource, /residenceLight:.*overwrite: 'auto'/);
  const light = real.to(motion.current, { residenceLight: .08, overwrite: 'auto', duration: .1 });
  light.progress(1); light.kill();
  captured.time(.9, true);
  assert.equal(motion.current.residenceDepth, 1);
  assert(motion.current.residenceWrap > .8);
  captured.time(0, true);
  assert.equal(motion.current.residences, 0);
  assert.equal(motion.current.residenceDepth, 0);
  assert.equal(motion.current.residenceWrap, 0);
}
captured.time(2.1, true);
callbacks.onComplete();
navigation.returnResidenceMenu();
assert.equal(motion.current.residenceReturning, true, 'Explore suppresses foreground depth pass');
callbacks.onReverseComplete();
assert.equal(motion.current.residenceReturning, false);
assert.equal(motion.current.residenceDepth, 0);
assert(restored.some(item => item.target === '.ribbon-scene' && item.values.clearProps === 'zIndex'));
assert(restored.some(item => item.target === '.menu-panel' && item.values['--panel-opacity'] === 1));
captured.kill();
real.ticker.sleep();
console.log('PASS: 3.5s entrance playback, wrapping/depth handoff, and three forward/reverse cycles with concurrent lighting.');
console.log('PASS: Explore return disables foreground wrapping and restores canvas/menu layers.');
