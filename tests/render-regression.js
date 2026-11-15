'use strict';
// Run with node tests/render-regression.js. Executes actual client snippets with resource spies.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'game.js'), 'utf8');
const snippet = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
const resource = () => ({ calls: 0, dispose() { this.calls++; } });
const shared = resource(), outline = resource(), kept = resource(), texture = resource();
const geometry = resource(), material = Object.assign(resource(), { map: texture });
const protectedMaterial = Object.assign(resource(), { map: kept });
const instance = Object.assign(resource(), { isInstancedMesh: true, geometry, material, userData: {} });
const nodes = [instance, { geometry, material: [material, shared, outline, protectedMaterial], userData: {} }, { geometry, material: outline, userData: { isOutline: true } }];
const context = vm.createContext({ cachedMats: new Set([shared]), OUTLINE: outline, keepTex: new Set([kept]) });
vm.runInContext(snippet('function disposeTree(o)', '// ================================================================ venues'), context);
context.disposeTree({ traverse(fn) { nodes.forEach(fn); } });
for (const r of [instance, geometry, material, texture, protectedMaterial]) assert.equal(r.calls, 1);
for (const r of [shared, outline, kept]) assert.equal(r.calls, 0);

let qualityHandler;
const shadow = { mapSize: { x: 1024, y: 1024, set(x, y) { this.x = x; this.y = y; } }, map: resource(), mapPass: resource() };
const oldMap = shadow.map, oldPass = shadow.mapPass;
Object.assign(context, { seg(id, get, set) { qualityHandler = set; }, settings: { gfx: 1 }, saveAll() {}, renderer: { shadowMap: {} }, sun: { shadow }, scene: { traverse() {} }, resize() {}, setVenue() {}, venue: null });
const quality = source.match(/  seg\('setGfx'[\s\S]*?\n  \}\);/)[0];
vm.runInContext(quality, context);
qualityHandler(2);
assert.equal(shadow.mapSize.x, 2048); assert.equal(oldMap.calls, 1); assert.equal(oldPass.calls, 1);
assert.equal(shadow.map, null); assert.equal(shadow.mapPass, null);
shadow.map = resource(); const highMap = shadow.map;
qualityHandler(1); assert.equal(shadow.mapSize.x, 1024); assert.equal(highMap.calls, 1);
shadow.map = resource(); const mediumMap = shadow.map;
qualityHandler(0); qualityHandler(1); assert.equal(mediumMap.calls, 0);

const teardown = snippet('function endSession()', 'function startLocal(');
const disposed = [], removed = [];
const player = {}, playerShadow = {}, shuttle = {}, shuttleShadow = {};
const visible = { visible: true };
Object.assign(context, { session: { models: [{ model: { root: player }, shadow: playerShadow }], officials: { dispose() {} } }, aimMark: visible, marker: visible, reachRing: visible, timingRing: visible, trail: visible, dropLine: visible, serveBoxes: [], shuttleMesh: shuttle, shuttleShadow, scene: { remove(o) { removed.push(o); } }, disposeTree(o) { disposed.push(o); }, $() { return { classList: { add() {} } }; } });
vm.runInContext(teardown, context); context.endSession(); context.endSession();
assert.deepEqual(disposed, [player, playerShadow, shuttle, shuttleShadow]);
assert.deepEqual(removed, disposed); assert.equal(context.shuttleShadow, null);

const fps = snippet('  const elapsed =', '  if (session) {');
const label = {};
Object.assign(context, { now: 0, last: 0, fpsN: 0, fpsT: 0, $() { return label; } });
for (let i = 1; i <= 10; i++) { context.now = i * 100; vm.runInContext('{\n' + fps + '\n}', context); }
assert.equal(label.textContent, '10 FPS');
console.log('PASS: shared resource ownership, instance disposal, match teardown, shadow quality transitions, real-time FPS');
