/* Shuttle Paws — client: rendering, UI, local + online sessions. */
(() => {
'use strict';
const S = window.SPSim;
const TIME_SCALE = 1.0;   // same speed as online (the server runs in real time)
const $ = (id) => document.getElementById(id);
const clamp = S.clamp, lerp = S.lerp, damp = S.damp, rand = S.rand;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const EMOTES = ['👋', '😆', '😮', '😢', '👏', '🔥', '❤️', '😎'];
const BOT_NAMES = ['Bánh Bao', 'Su Su', 'Kẹo Dẻo', 'Bi Bo', 'Mít', 'Xoài', 'Đậu Phộng', 'Cốm', 'Bơ', 'Tí Nị', 'Chè', 'Hạt Tiêu'];
const NAME_A = ['Mèo', 'Thỏ', 'Gấu', 'Cún', 'Vịt', 'Cáo', 'Ếch', 'Chim', 'Sóc', 'Heo'];
const NAME_B = ['Lười', 'Nhanh Nhẹn', 'Bông', 'Mập', 'Siêu Đập', 'Tí Hon', 'Ngơ Ngác', 'Vui Vẻ', 'Lém Lỉnh', 'Thần Tốc', 'Mũm Mĩm', 'Cầu Vồng'];
const randomName = () => NAME_A[Math.floor(Math.random() * NAME_A.length)] + ' ' + NAME_B[Math.floor(Math.random() * NAME_B.length)];

// ================================================================ storage
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
};
const profile = Object.assign({ name: randomName(), char: 'cat', id: null, secret: null }, store.get('sp.profile', {}));
const settings = Object.assign({ hand: 'R', helpN: 0, ctrl: 'simple', cam: 'high', assist: 1, vol: 0.8, gfx: 1, fps: false, marker: true, markerOnline: true, showAim: false, showReach: false, showTrail: false, showServeBox: false, dropLine: true, ring: true, hitStop: true, autoSplit: true, chat: true, touch: 1, server: '' }, store.get('sp.settings', {}));
// one-time: phones and tablets start at the low graphics level (it can be raised in Settings)
if (settings.gfxV !== 1) { if (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches) settings.gfx = 0; settings.gfxV = 1; }
// one-time: the landing marker is now on by default online too (older saves had it off)
if (settings.markerOnlineV !== 2) { settings.markerOnline = true; settings.markerOnlineV = 2; }
const AID_TOGGLES = [['setShowAim', 'showAim'], ['setShowReach', 'showReach'], ['setShowTrail', 'showTrail'], ['setShowServeBox', 'showServeBox']];
const DEFAULT_KEYS = { up: 'w', down: 's', left: 'a', right: 'd', hit: 'j', smash: 'k', drop: 'l', jump: ' ', dive: 'shift', emote: 'e', chat: 'enter' };
const KEY_NAMES = { up: 'Lên', down: 'Xuống', left: 'Trái', right: 'Phải', hit: 'Phông cầu (đánh cao)', smash: 'Đập / tạt', drop: 'Bỏ nhỏ', jump: 'Nhảy', dive: 'Lao người', emote: 'Bảng biểu cảm', chat: 'Chat' };
// v2 layout (3 shot keys); old saved layouts used K/L for jump/dive, so they are not carried over
let keymap = Object.assign({}, DEFAULT_KEYS, store.get('sp.keys2', {}));
const P = Object.assign({ matches: 0, wins: 0, perfect: 0, smash: 0, dives: 0, diveSaves: 0, longest: 0, streak: 0, bestStreak: 0, venues: [], onlineWins: 0, onlinePlayed: 0, hits: 0 }, store.get('sp.progress', {}));
const achieved = store.get('sp.ach', {});
const history = store.get('sp.history', []);
// tournament: 5 knockout rounds, losing sends you back to round 1
const TOUR = [
  { name: 'Vòng loại',  opp: 'duck',    oppName: 'Quạc Quạc',   diff: 0, venue: 4, points: 11, games: 1 },
  { name: 'Vòng 1/8',   opp: 'bunny',   oppName: 'Bông Tuyết',  diff: 1, venue: 3, points: 11, games: 1 },
  { name: 'Tứ kết',     opp: 'fox',     oppName: 'Cáo Lửa',     diff: 1, venue: 2, points: 11, games: 3 },
  { name: 'Bán kết',    opp: 'panda',   oppName: 'Tròn Tròn',   diff: 2, venue: 5, points: 11, games: 3 },
  { name: 'Chung kết',  opp: 'tiger',   oppName: 'Vằn Sấm Sét', diff: 2, venue: 1, points: 21, games: 3 },
];
const tour = Object.assign({ round: 0, cups: 0, best: 0, runs: 0 }, store.get('sp.tour', {}));
const saveAll = () => { store.set('sp.profile', profile); store.set('sp.settings', settings); store.set('sp.keys2', keymap); store.set('sp.progress', P); store.set('sp.ach', achieved); store.set('sp.history', history); store.set('sp.tour', tour); };

const ACH = [
  { id: 'win1',      ic: '🏆', name: 'Chiến thắng đầu tiên', desc: 'Thắng một trận bất kỳ.', test: (c) => c.won },
  { id: 'matches5',  ic: '🎽', name: 'Chăm chỉ', desc: 'Chơi 5 trận.', test: () => P.matches >= 5 },
  { id: 'perfect10', ic: '✨', name: 'Mười điểm Perfect', desc: '10 cú Perfect trong một trận.', test: (c) => c.st.perfect >= 10 },
  { id: 'rally25',   ic: '🔁', name: 'Rally marathon', desc: 'Một pha cầu dài 25 cú trở lên.', test: (c) => c.longest >= 25 },
  { id: 'smash10',   ic: '💥', name: 'Sấm sét', desc: '10 cú đập trong một trận.', test: (c) => c.st.smash >= 10 },
  { id: 'dive5',     ic: '🤸', name: 'Người nhện', desc: 'Lao người cứu cầu thành công 5 lần (cộng dồn).', test: () => P.diveSaves >= 5 },
  { id: 'hardwin',   ic: '🥇', name: 'Hạ bot Khó', desc: 'Thắng bot độ khó Khó trở lên.', test: (c) => c.won && c.kind === 'local' && c.diff >= 2 },
  { id: 'master',    ic: '👑', name: 'Cao thủ', desc: 'Thắng bot Cao thủ.', test: (c) => c.won && c.kind === 'local' && c.diff >= 3 },
  { id: 'clean',     ic: '🧼', name: 'Trắng lưới', desc: 'Thắng mà không mất điểm nào.', test: (c) => c.won && c.oppScore === 0 },
  { id: 'comeback',  ic: '🦸', name: 'Lội ngược dòng', desc: 'Thắng sau khi bị dẫn 5 điểm.', test: (c) => c.won && c.maxDeficit >= 5 },
  { id: 'doubles',   ic: '🤝', name: 'Đồng đội ăn ý', desc: 'Thắng một trận 2v2.', test: (c) => c.won && c.mode === '2v2' },
  { id: 'streak3',   ic: '🔥', name: 'Đang nóng tay', desc: 'Thắng 3 trận liên tiếp.', test: () => P.streak >= 3 },
  { id: 'venues',    ic: '🗺️', name: 'Đi khắp nơi', desc: 'Chơi ở cả 6 sân.', test: () => P.venues.length >= S.VENUES.length },
  { id: 'matches25', ic: '🏃', name: 'Vận động viên', desc: 'Chơi 25 trận.', test: () => P.matches >= 25 },
  { id: 'online1',   ic: '🌐', name: 'Ra mắt online', desc: 'Thắng một trận online.', test: (c) => c.won && c.kind === 'online' },
  { id: 'champ',     ic: '🏆', name: 'Nhà vô địch', desc: 'Vô địch Giải đấu Shuttle Paws.', test: (c) => c.champ },
  { id: 'bo3',       ic: '🎖️', name: 'Bản lĩnh 3 ván', desc: 'Thắng một trận 3 ván.', test: (c) => c.won && c.games > 1 },
];
// wallet: last state the server sent (gold, owned characters, prices, login streak, quests); cached only for display
let wallet = store.get('sp.wallet', null);
const FREE_OWNED = ['cat', 'bunny', 'bear', 'panda'];
const ownedChars = () => (wallet && wallet.owned) || FREE_OWNED;
const charPrice = (id) => (wallet && wallet.prices && wallet.prices[id]) || 0;
// usable = owned (free or bought with gold) or earned through its achievement
const isUnlocked = (c) => ownedChars().includes(c.id) || !!(c.unlock && achieved[c.unlock]);
const charById = (id) => S.CHARS.find((c) => c.id === id) || S.CHARS[0];
if (!isUnlocked(charById(profile.char))) profile.char = 'cat';

// ---- UI icons: one SVG set (sprite in index.html) instead of emoji
const icon = (name, cls) => `<svg class="ico${cls ? ' ' + cls : ''}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const ACH_ICON = { win1: 'cup', matches5: 'shirt', perfect10: 'sparkle', rally25: 'loop', smash10: 'bolt', dive5: 'run', hardwin: 'target', master: 'crown', clean: 'star', comeback: 'trend', doubles: 'users', streak3: 'fire', venues: 'map', matches25: 'flag', online1: 'globe', champ: 'cup', bo3: 'medal' };
const achIcon = (a) => icon(ACH_ICON[a.id] || 'medal');

// ---- character portraits, rendered once per character from the real 3D model (cached as data URLs)
const BLANK_IMG = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const portraitCache = new Map(), portraitQueue = [];
let portraitR = null, portraitScene = null, portraitCam = null;
function renderPortrait(id) {
  if (!portraitR) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 176;
    portraitR = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, preserveDrawingBuffer: true });
    portraitR.setPixelRatio(1); portraitR.setSize(176, 176, false); portraitR.setClearColor(0x000000, 0);
    portraitScene = new THREE.Scene();
    portraitScene.add(new THREE.HemisphereLight(0xfff7ee, 0x8a7a90, 1.05));
    const key = new THREE.DirectionalLight(0xffffff, 0.85); key.position.set(-2, 3, 4); portraitScene.add(key);
    portraitScene.add(new THREE.AmbientLight(0xffffff, 0.12));
    portraitCam = new THREE.PerspectiveCamera(24, 1, 0.05, 40);
  }
  const mdl = buildCharacter(charById(id), 0xff7a59, 1, 'R');
  scene.remove(mdl.root); portraitScene.add(mdl.root);
  mdl.wrist.visible = false;                 // no racket across the face
  mdl.root.rotation.y = 0.32;                // a touch of three-quarter view
  mdl.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(mdl.head), sz = box.getSize(new THREE.Vector3());
  const hp = mdl.head.getWorldPosition(new THREE.Vector3());
  // frame on the whole head including ears / horns / head gear, so tall ears are not cut off
  const bc = box.getCenter(new THREE.Vector3());
  const r = clamp(Math.max(sz.x, sz.y) * 0.5, 0.22, 0.7);
  const look = new THREE.Vector3(hp.x, bc.y - r * 0.08, hp.z);
  const dist = r * 1.25 / Math.tan(THREE.MathUtils.degToRad(12));
  portraitCam.position.set(look.x + dist * 0.1, look.y + dist * 0.12, look.z + dist); portraitCam.lookAt(look);
  portraitR.render(portraitScene, portraitCam);
  const url = portraitR.domElement.toDataURL('image/png');
  portraitScene.remove(mdl.root); disposeTree(mdl.root);
  return url;
}
function drainPortraits() {
  const id = portraitQueue[0]; if (!id) return;
  let url = '';
  try { url = renderPortrait(id); } catch (e) { console.warn('portrait', id, e); }
  portraitCache.set(id, url); portraitQueue.shift();
  document.querySelectorAll(`img[data-pt="${id}"]`).forEach((im) => { im.src = url || BLANK_IMG; });
  if (portraitQueue.length) setTimeout(drainPortraits, 0);
}
function queuePortrait(id) {
  if (portraitCache.has(id) || portraitQueue.includes(id)) return;
  portraitQueue.push(id); if (portraitQueue.length === 1) setTimeout(drainPortraits, 0);
}
// <img> of a character's face; fills in as soon as its portrait is rendered
const faceImg = (id, cls) => { const u = portraitCache.get(id); if (u === undefined) queuePortrait(id); return `<img class="pt${cls ? ' ' + cls : ''}" data-pt="${id}" alt="" src="${u || BLANK_IMG}">`; };

// ---- gear icons: the item worn by the player's own character, framed on the part of the body it belongs to (cached as data URLs)
const gearIconCache = new Map(), gearIconQueue = [];
function renderGearIcon(key) {
  const [id, ch] = key.split('@'), it = S.gearById(id), slot = it.slot;
  if (!portraitR) renderPortrait('cat');     // sets up the shared little renderer
  const mdl = buildCharacter(charById(ch), 0xff7a59, 1, 'R', [id]);
  scene.remove(mdl.root); portraitScene.add(mdl.root);
  if (slot !== 'racket') mdl.wrist.visible = false;
  else { mdl.root.visible = false; portraitScene.add(mdl.wrist); mdl.wrist.position.set(0, 0, 0); mdl.wrist.rotation.set(Math.PI, 0.25, 0.4); mdl.wrist.updateMatrixWorld(true); }   // the racket alone, head up
  mdl.root.rotation.y = slot === 'back' ? Math.PI - 0.5 : slot === 'wrist' ? -0.5 : 0.42;
  mdl.root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  const parts = slot === 'racket' ? [mdl.wrist] : slot === 'shoes' ? mdl.feet : slot === 'shirt' ? [mdl.gear.torso] : slot === 'shorts' ? [mdl.gear.shorts] : slot === 'wrist' ? [mdl.gear.wristGear[0]]
    : slot === 'head' ? [mdl.head] : slot === 'face' ? [mdl.gear.face] : slot === 'neck' ? [mdl.gear.neck] : [mdl.gear.back, mdl.gear.torso];
  for (const p of parts) box.expandByObject(p);
  if (slot === 'shorts') box.min.y -= 0.2;
  if (slot === 'neck') { box.min.y -= 0.16; box.max.y += 0.04; }
  if (slot === 'shirt') box.expandByScalar(0.09);
  if (slot === 'face') box.expandByScalar(0.05);
  if (slot === 'wrist') box.expandByScalar(0.07);
  const c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3()), r = Math.max(0.12, Math.max(sz.x, sz.y) * 0.56);
  const dist = r / Math.tan(THREE.MathUtils.degToRad(12));
  portraitCam.position.set(c.x + dist * 0.1, c.y + dist * (slot === 'shoes' ? 0.3 : 0.12), c.z + dist); portraitCam.lookAt(c);
  portraitR.render(portraitScene, portraitCam);
  const url = portraitR.domElement.toDataURL('image/png');
  if (slot === 'racket') { portraitScene.remove(mdl.wrist); disposeTree(mdl.wrist); }
  portraitScene.remove(mdl.root); disposeTree(mdl.root);
  return url;
}
function drainGearIcons() {
  const key = gearIconQueue[0]; if (!key) return;
  let url = '';
  try { url = renderGearIcon(key); } catch (e) { console.warn('gear icon', key, e); }
  gearIconCache.set(key, url); gearIconQueue.shift();
  document.querySelectorAll(`img[data-gi="${key}"]`).forEach((im) => { im.src = url || BLANK_IMG; });
  if (gearIconQueue.length) setTimeout(drainGearIcons, 0);
}
const gearIconImg = (id) => {
  const key = id + '@' + profile.char, u = gearIconCache.get(key);
  if (u === undefined && !gearIconQueue.includes(key)) { gearIconQueue.push(key); if (gearIconQueue.length === 1) setTimeout(drainGearIcons, 0); }
  return `<img class="gi-ic" data-gi="${key}" alt="" src="${u || BLANK_IMG}">`;
};

// ================================================================ audio
const Sound = (() => {
  let ctx = null, master = null, noiseBuf = null;
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = settings.vol; master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; }
  }
  function noise(dur, freq, q, gain, type = 'bandpass') {
    if (!ctx) return;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); const t = ctx.currentTime;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + Math.min(0.02, dur * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }
  function tone(freq, dur, gain, type = 'sine', slide = 0, delay = 0) {
    if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + delay;
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  return {
    init,
    setVol(v) { if (master) master.gain.value = v; },
    hit(p) { noise(0.07, 2200 + p * 1800, 1.5, 0.35 + p * 0.4); tone(900 + p * 500, 0.06, 0.12, 'triangle', 0.5); },
    perfect() { tone(1320, 0.12, 0.08, 'sine', 1.3); },
    smash() { noise(0.12, 3200, 1, 0.8); tone(240, 0.15, 0.25, 'square', 0.4); },
    land() { noise(0.05, 800, 2, 0.15); },
    net() { noise(0.12, 500, 1, 0.25); },
    whoosh() { noise(0.16, 1200, 0.8, 0.07, 'lowpass'); },
    jump() { tone(300, 0.1, 0.06, 'sine', 1.8); },
    cheer(big) { noise(big ? 1.8 : 1.1, 1100, 0.4, big ? 0.35 : 0.18); },
    boop() { tone(660, 0.08, 0.1, 'sine', 1.5); },
    pop() { tone(880, 0.07, 0.08, 'sine', 1.6); },
    whistle() { tone(2400, 0.25, 0.07, 'sine', 1.02); tone(2400, 0.2, 0.07, 'sine', 1.02, 0.3); },
    win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 0.1, 'triangle', 1, i * 0.12)); },
    lose() { [392, 330, 262].forEach((f, i) => tone(f, 0.3, 0.08, 'triangle', 1, i * 0.15)); },
    ach() { [784, 988, 1319].forEach((f, i) => tone(f, 0.18, 0.08, 'sine', 1, i * 0.08)); },
  };
})();

// ================================================================ renderer
THREE.ColorManagement.legacyMode = false;
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = settings.gfx >= 1;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 260);
const hemi = new THREE.HemisphereLight(0xfff7ee, 0xb89c88, 0.9); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 0.8); sun.position.set(5, 18, 8); scene.add(sun); scene.add(sun.target);
sun.castShadow = true;
sun.shadow.mapSize.set(settings.gfx >= 2 ? 2048 : 1024, settings.gfx >= 2 ? 2048 : 1024);
Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 13, bottom: -13, near: 1, far: 60 });
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
const amb = new THREE.AmbientLight(0xffffff, 0.12); scene.add(amb);
const OUTLINE = new THREE.MeshBasicMaterial({ color: 0x2a1d18, side: THREE.BackSide });
// cartoon outline: back-face shell around every solid mesh of a model
function addOutlines(root, thick) {
  const list = [];
  root.traverse((m) => { if (m.isMesh && !m.userData.noOutline && !(m.material && m.material.transparent)) list.push(m); });
  for (const m of list) {
    if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
    const r = m.geometry.boundingSphere.radius;
    if (r < 0.03) continue;
    const o = new THREE.Mesh(m.geometry, OUTLINE);
    o.userData.noOutline = true; o.userData.isOutline = true;
    o.scale.setScalar(1 + clamp((thick || 0.022) / r, 0.03, 0.4));
    m.add(o);
  }
}

const toonGrad = (() => {
  const data = new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
})();
const matCache = new Map();
const cachedMats = new Set();
const toon = (c, extra) => {
  if (!extra) {
    if (!matCache.has(c)) { const m = new THREE.MeshToonMaterial({ color: c, gradientMap: toonGrad }); matCache.set(c, m); cachedMats.add(m); }
    return matCache.get(c);
  }
  return new THREE.MeshToonMaterial(Object.assign({ color: c, gradientMap: toonGrad }, extra));
};
const basic = (c, extra) => new THREE.MeshBasicMaterial(Object.assign({ color: c }, extra || {}));
const lambert = (c, extra) => new THREE.MeshLambertMaterial(Object.assign({ color: c }, extra || {}));

function canvasTex(w, h, draw, repeat) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
const shadowTex = canvasTex(64, 64, (g) => {
  const gr = g.createRadialGradient(32, 32, 2, 32, 32, 31);
  gr.addColorStop(0, 'rgba(40,20,10,.45)'); gr.addColorStop(1, 'rgba(40,20,10,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
});
const keepTex = new Set([shadowTex]);
function blob(size, parent) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.032; m.renderOrder = 1; (parent || scene).add(m); return m;
}
function disposeTree(o) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  o.traverse((n) => {
    // Instance attributes belong to the mesh, not its geometry.
    if (n.isInstancedMesh) n.dispose();
    if (n.geometry && (!n.userData.isOutline || n.userData.ownGeo) && !geometries.has(n.geometry)) {
      geometries.add(n.geometry); n.geometry.dispose();
    }
    if (n.material) for (const m of [].concat(n.material)) {
      if (cachedMats.has(m) || m === OUTLINE || materials.has(m)) continue;
      materials.add(m);
      if (m.map && !keepTex.has(m.map) && !textures.has(m.map)) { textures.add(m.map); m.map.dispose(); }
      m.dispose();
    }
  });
}

// ================================================================ venues
const useShadows = () => settings.gfx >= 1;
function shade(m, cast, receive) { m.castShadow = !!cast; m.receiveShadow = !!receive; return m; }
function box(group, w, h, d, mat, x, y, z, opt) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); group.add(m);
  if (opt) shade(m, opt.cast, opt.recv);
  return m;
}
function skyDome(group, stops, sun) {
  const tex = canvasTex(8, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    stops.forEach(([p, c]) => gr.addColorStop(p, c));
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  group.add(new THREE.Mesh(new THREE.SphereGeometry(140, 32, 16), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false })));
  if (sun) {
    const st = canvasTex(128, 128, (g) => {
      const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
      gr.addColorStop(0, sun.core); gr.addColorStop(0.25, sun.core); gr.addColorStop(0.32, sun.glow); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    });
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: st, fog: false, depthWrite: false, transparent: true }));
    s.position.set(sun.x, sun.y, sun.z); s.scale.setScalar(sun.size); group.add(s);
  }
}
function ground(group, tex, color, size) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size || 160, size || 160), lambert(color || 0xffffff, tex ? { map: tex } : {}));
  m.rotation.x = -Math.PI / 2; m.receiveShadow = true; group.add(m); return m;
}
function noiseTex(base, specks, n, repeat, size = 256, sz = [1, 3]) {
  return canvasTex(size, size, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) { g.fillStyle = specks[i % specks.length]; g.fillRect(Math.random() * w, Math.random() * h, rand(sz[0], sz[1]), rand(sz[0], sz[1])); }
  }, repeat);
}
function woodTex(cols, repeat) {
  return canvasTex(512, 512, (c, w) => {
    const ph = 32;
    for (let i = 0; i < 512 / ph; i++) {
      c.fillStyle = cols[i % cols.length]; c.fillRect(0, i * ph, w, ph);
      for (let k = 0; k < 18; k++) { c.fillStyle = 'rgba(90,50,20,.06)'; c.fillRect(Math.random() * w, i * ph + Math.random() * ph, rand(30, 140), 1.2); }
      c.fillStyle = 'rgba(70,35,10,.18)'; c.fillRect(0, i * ph, w, 1.5);
      const off = (i * 197) % w; c.fillRect(off, i * ph, 1.5, ph); c.fillRect((off + 256) % w, i * ph, 1.5, ph);
    }
  }, repeat);
}

// court: playing area + run-off + crisp lines, net with posts
function makeCourt(group, o) {
  const CW = 9.2, CL = 16.4, PX = 96;
  const tex = canvasTex(CW * PX, CL * PX, (g, w, h) => {
    g.fillStyle = o.runoff; g.fillRect(0, 0, w, h);
    const X = (x) => (x + CW / 2) * PX, Z = (z) => (z + CL / 2) * PX;
    g.fillStyle = o.court; g.fillRect(X(-S.DBL_W), Z(-S.HALF_L), S.DBL_W * 2 * PX, S.HALF_L * 2 * PX);
    if (o.grain) for (let i = 0; i < 9000; i++) { g.fillStyle = o.grain[i % o.grain.length]; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    g.strokeStyle = o.line; g.lineWidth = 0.05 * PX; g.lineCap = 'square';
    const line = (x1, z1, x2, z2) => { g.beginPath(); g.moveTo(X(x1), Z(z1)); g.lineTo(X(x2), Z(z2)); g.stroke(); };
    g.strokeRect(X(-S.DBL_W), Z(-S.HALF_L), S.DBL_W * 2 * PX, S.HALF_L * 2 * PX);
    line(-S.HALF_W, -S.HALF_L, -S.HALF_W, S.HALF_L); line(S.HALF_W, -S.HALF_L, S.HALF_W, S.HALF_L);
    for (const s of [-1, 1]) {
      line(-S.DBL_W, s * S.SHORT_LINE, S.DBL_W, s * S.SHORT_LINE);
      line(-S.DBL_W, s * (S.HALF_L - S.LONG_SERVE), S.DBL_W, s * (S.HALF_L - S.LONG_SERVE));
      line(0, s * S.SHORT_LINE, 0, s * S.HALF_L);
    }
    if (o.logo) { g.save(); g.globalAlpha = 0.16; g.fillStyle = o.line; g.font = `900 ${0.9 * PX}px Nunito, Segoe UI, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(o.logo, X(0), Z(-S.HALF_L - 0.62)); g.translate(X(0), Z(S.HALF_L + 0.62)); g.rotate(Math.PI); g.fillText(o.logo, 0, 0); g.restore(); }
  });
  tex.anisotropy = 8;
  const base = new THREE.Mesh(new THREE.BoxGeometry(CW + 0.12, 0.04, CL + 0.12), toon(o.edge || 0x2b2b2b));
  base.position.y = 0.0; base.receiveShadow = true; group.add(base);
  const court = new THREE.Mesh(new THREE.PlaneGeometry(CW, CL), lambert(0xffffff, { map: tex }));
  court.rotation.x = -Math.PI / 2; court.position.y = 0.022; court.receiveShadow = true; group.add(court);
  // net
  const netTex = canvasTex(512, 96, (g, w, h) => {
    g.strokeStyle = o.netColor || 'rgba(25,25,35,.9)'; g.lineWidth = 1.4;
    for (let x = 0; x <= w; x += 7) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y <= h; y += 7) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  }, [3, 1]);
  const net = new THREE.Mesh(new THREE.PlaneGeometry(S.DBL_W * 2 + 0.1, 0.76), new THREE.MeshBasicMaterial({ map: netTex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  net.position.set(0, S.NET_H - 0.38, 0); group.add(net);
  box(group, S.DBL_W * 2 + 0.1, 0.075, 0.025, basic(0xffffff), 0, S.NET_H - 0.037, 0);
  box(group, S.DBL_W * 2 + 0.1, 0.02, 0.02, basic(0xffffff), 0, S.NET_H - 0.76, 0);
  const postMat = toon(o.post || 0x2f6fb0);
  const flags = [];
  for (const s of [-1, 1]) {
    const x = s * (S.DBL_W + 0.1);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, S.NET_H + 0.04, 12), postMat); post.position.set(x, (S.NET_H + 0.04) / 2, 0);
    shade(post, true, false); group.add(post);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), toon(0xffffff)); cap.position.set(x, S.NET_H + 0.05, 0); group.add(cap);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.1, 18), postMat); foot.position.set(x, 0.05, 0); shade(foot, true, true); group.add(foot);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 6), toon(0xdddddd)); pole.position.set(x, S.NET_H + 0.3, 0); group.add(pole);
    const pivot = new THREE.Group(); pivot.position.set(x, S.NET_H + 0.47, 0);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.22), toon(o.flag || 0xff7a59, { side: THREE.DoubleSide }));
    flag.position.set(0.18, -0.1, 0); pivot.add(flag); group.add(pivot); flags.push(pivot);
  }
  // umpire chair on the right side
  if (o.umpire !== false) {
    const u = new THREE.Group(); u.position.set(S.DBL_W + 1.3, 0, 0);
    const um = toon(o.umpireCol || 0xffffff);
    for (const [dx, dz] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) box(u, 0.05, 1.4, 0.05, um, dx, 0.7, dz, { cast: true });
    box(u, 0.62, 0.06, 0.62, um, 0, 1.4, 0, { cast: true }); box(u, 0.05, 0.62, 0.62, um, 0.3, 1.72, 0, { cast: true });
    for (const dz of [-0.29, 0.29]) box(u, 0.5, 0.05, 0.05, um, 0.05, 1.68, dz);   // armrests
    o.seat = { x: S.DBL_W + 1.3, y: 1.43 };
    for (let i = 0; i < 4; i++) box(u, 0.05, 0.03, 0.5, um, -0.3, 0.3 + i * 0.3, 0);
    group.add(u);
  }
  if (o.seat) group.userData.seat = o.seat;
  return flags;
}

// cute instanced animal fans: body + head + 2 ears, bouncing with the crowd excitement
const FAN_HEADS = [0xf6b26b, 0xf4f0ee, 0xa9744f, 0xfafafa, 0xff8c42, 0xd9c2a5, 0x7cc96b, 0xffd84d, 0x8d6e63, 0xa4b0be];
function crowdFans(group, seats, opts) {
  opts = opts || {};
  const keep = settings.gfx === 0 ? 0.4 : settings.gfx === 1 ? 0.75 : 1;
  seats = seats.filter(() => Math.random() < keep * (opts.fill || 0.75));
  const n = seats.length;
  if (!n) return () => {};
  const mk = (geo, count) => { const im = new THREE.InstancedMesh(geo, new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: toonGrad }), count); group.add(im); return im; };
  const bodies = mk(new THREE.SphereGeometry(0.25, 10, 8), n);
  const heads = mk(new THREE.SphereGeometry(0.21, 12, 10), n);
  const ears = mk(new THREE.ConeGeometry(0.07, 0.15, 6), n * 2);
  const hands = mk(new THREE.SphereGeometry(0.07, 6, 5), n * 2);
  const eyes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 6, 4), toon(0x2b2220), n * 2); group.add(eyes);
  const signers = []; for (let i = 0; i < n; i++) if ((i * 37) % 100 < 9) signers.push(i);
  const signs = signers.length ? mk(new THREE.BoxGeometry(0.62, 0.38, 0.03), signers.length) : null;
  const signFr = signers.length ? new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 0.46, 0.02), toon(0xffffff), signers.length) : null;
  if (signFr) group.add(signFr);
  const signCols = opts.signs || [0xff5e7a, 0xffc94d, 0x6b8cff, 0x5bbf8a, 0xc58cff];
  const shirts = opts.shirts || [0xff7a59, 0x6b8cff, 0x5bbf8a, 0xffc94d, 0xc58cff, 0xff9fb8, 0x4fc3d9];
  const lo = settings.gfx === 0;
  const R = () => Math.random();
  const col = new THREE.Color();
  // ---- every fan gets its own look and personality
  const data = seats.map((st) => {
    const hc = FAN_HEADS[Math.floor(R() * FAN_HEADS.length)];
    const sc = opts.sections ? opts.sections(st) : shirts[Math.floor(R() * shirts.length)];
    const face = st[3] !== undefined ? st[3] : Math.atan2(-st[0], -st[2]);
    // which team this fan backs: left stands = orange (your side), right = blue, the ends = neutral
    const side = Math.abs(st[2]) > 9.4 && Math.abs(st[0]) < 8 ? 0 : st[0] < 0 ? -1 : 1;
    const er = R();   // 0 pointy (cat/fox), 1 round (bear/mouse), 2 long (bunny), 3 none (bird/frog)
    const f = {
      x: st[0], y: st[1], z: st[2], face, side, hc, sc,
      ear: er < 0.38 ? 0 : er < 0.7 ? 1 : er < 0.84 ? 2 : 3,
      s: 0.82 + R() * 0.32, hs: 0.88 + R() * 0.28, wide: 0.9 + R() * 0.25,
      ph: R() * 6.283, fr: 0.7 + R() * 0.7, lag: 1.2 + R() * 3, temper: 0.35 + R() * 0.9,
      clapper: R() < 0.55, waver: R() < 0.3, look: 0, nextGlance: R() * 6, glance: 0,
      muzzle: R() < 0.5, hat: !lo && R() < (opts.hats || 0.14), scarf: !lo && R() < (opts.scarves || 0.12),
      finger: !lo && R() < 0.06, flag: !lo && R() < 0.05,
    };
    // the cheer ripples along the stand like a stadium wave
    f.delay = 0.05 + ((st[0] + 30) * 0.018 + Math.abs(st[2]) * 0.01) % 0.9 + R() * 0.12;
    return f;
  });
  data.forEach((f, i) => { bodies.setColorAt(i, col.setHex(f.sc)); heads.setColorAt(i, col.setHex(f.hc)); hands.setColorAt(i * 2, col.setHex(f.hc)); hands.setColorAt(i * 2 + 1, col.setHex(f.hc)); });
  // ears: pointy & long share the cone mesh, round ones are flattened spheres
  const pointy = data.filter((f) => f.ear === 0 || f.ear === 2), round = data.filter((f) => f.ear === 1);
  const earsR = mk(new THREE.SphereGeometry(0.075, 8, 6), Math.max(1, round.length * 2));
  pointy.forEach((f, k) => { ears.setColorAt(k * 2, col.setHex(f.hc)); ears.setColorAt(k * 2 + 1, col.setHex(f.hc)); f.pk = k; });
  round.forEach((f, k) => { earsR.setColorAt(k * 2, col.setHex(f.hc)); earsR.setColorAt(k * 2 + 1, col.setHex(f.hc)); f.rk = k; });
  ears.count = pointy.length * 2; earsR.count = round.length * 2;
  // muzzles a shade lighter than the head
  const muzzled = data.filter((f) => f.muzzle);
  const muzzles = mk(new THREE.SphereGeometry(0.1, 8, 6), Math.max(1, muzzled.length));
  const white = new THREE.Color(0xffffff);
  muzzled.forEach((f, k) => { muzzles.setColorAt(k, col.setHex(f.hc).lerp(white, 0.55)); f.mk = k; });
  muzzles.count = muzzled.length;
  // team gear in the colour of the side they back: party hats, scarves, foam fingers, flags
  const teamHex = (f) => (f.side < 0 ? 0xff7a59 : f.side > 0 ? 0x6b8cff : [0xffd23f, 0xffffff, 0x5bbf8a][Math.floor(f.ph) % 3]);
  const gear = (list, geo, colFn) => { const im = mk(geo, Math.max(1, list.length)); list.forEach((f, k) => im.setColorAt(k, col.setHex(colFn(f)))); im.count = list.length; return im; };
  const hatted = data.filter((f) => f.hat), scarfed = data.filter((f) => f.scarf), fingered = data.filter((f) => f.finger), flagged = data.filter((f) => f.flag);
  const hats = gear(hatted, new THREE.ConeGeometry(0.11, 0.24, 10), teamHex);
  const scarves = gear(scarfed, new THREE.TorusGeometry(0.15, 0.045, 6, 14), teamHex);
  const fingers = gear(fingered, new THREE.BoxGeometry(0.13, 0.34, 0.06), teamHex);
  const poles = gear(flagged, new THREE.CylinderGeometry(0.012, 0.012, 0.9, 5), () => 0xdddddd);
  const flags = gear(flagged, new THREE.PlaneGeometry(0.42, 0.28), teamHex);
  flags.material.side = THREE.DoubleSide;
  hatted.forEach((f, k) => { f.hk = k; }); scarfed.forEach((f, k) => { f.sk = k; }); fingered.forEach((f, k) => { f.fk = k; }); flagged.forEach((f, k) => { f.gk = k; });
  if (signs) signers.forEach((i, k) => signs.setColorAt(k, col.setHex(signCols[k % signCols.length])));
  const all = [bodies, heads, ears, earsR, muzzles, hands, eyes, hats, scarves, fingers, poles, flags, signs, signFr];
  for (const im of all) if (im && im.instanceColor) im.instanceColor.needsUpdate = true;
  const d = new THREE.Object3D(); d.rotation.order = 'YXZ';
  const place = (im, idx, x, y, z, yaw, pitch, roll, sx, sy, sz) => {
    d.position.set(x, y, z); d.rotation.set(pitch, yaw, roll); d.scale.set(sx, sy === undefined ? sx : sy, sz === undefined ? sx : sz); d.updateMatrix(); im.setMatrixAt(idx, d.matrix);
  };
  // local (right, forward) offset around a fan facing `yaw` -> world x/z
  let wx = 0, wz = 0;
  const off = (f, yaw, rgt, fwd) => { const c = Math.cos(yaw), s = Math.sin(yaw); wx = f.x + rgt * c + fwd * s; wz = f.z - rgt * s + fwd * c; };
  // cheering is detected from the score itself, so the crowd needs no event hook
  let frame = 0, lastT = 0, lastKey = '', cheerT = -99, cheerFav = 0;
  return (t, excite) => {
    const stride = settings.gfx === 2 ? 1 : 2, part = frame++ % stride;   // lower gfx: half the fans per frame, alternating
    const dt = Math.min(0.1, Math.max(0.001, t - lastT)); lastT = t;
    const m = session && session.m;
    if (m) {
      const key = m.score[0] + ':' + m.score[1];
      if (lastKey && key !== lastKey) {
        const prev = lastKey.split(':').map(Number);
        const scorer = m.score[0] > prev[0] ? 0 : m.score[1] > prev[1] ? 1 : -1;
        if (scorer >= 0) { cheerT = t; cheerFav = scorer === session.myTeam ? -1 : 1; }
      }
      lastKey = key;
    } else lastKey = '';
    const sp = m && m.shuttle && (m.shuttle.live || m.shuttle.held) ? m.shuttle.p : null;
    const tense = m && m.state === 'rally' && (m.rally || 0) > 6 ? Math.min(1, ((m.rally || 0) - 6) / 10) : 0;
    for (let i = part; i < n; i += stride) {
      const f = data[i];
      // cheer envelope: pop up, bounce, then sit back down slowly
      const lt = t - cheerT - f.delay;
      const amp = f.side === cheerFav ? 1 : f.side === 0 ? 0.55 : 0.12;
      const env = lt < 0 || lt > 3.4 ? 0 : lt < 0.25 ? lt / 0.25 : lt < 1.9 ? 1 : 1 - (lt - 1.9) / 1.5;
      const stand = amp * env * (0.55 + f.temper * 0.45);
      const bounce = stand > 0.2 ? Math.max(0, Math.sin(lt * (7 + f.fr * 3) + f.ph)) * 0.13 * stand : 0;
      // idle life: breathing, small sways, the odd look around; everyone leans in during long rallies
      const breathe = 1 + Math.sin(t * 1.6 * f.fr + f.ph) * 0.025;
      const sway = Math.sin(t * 0.55 * f.fr + f.ph) * 0.05 * (1 - tense);
      const lean = tense * 0.22 * f.temper - stand * 0.1;
      const s = f.s, by = f.y + 0.3 * s + stand * 0.22 * s + bounce;
      place(bodies, i, f.x, by, f.z, f.face, lean, sway, s * f.wide, s * 1.15 * breathe, s * 0.95);
      // head follows the shuttle with each fan's own lag, otherwise glances around now and then
      let tgt;
      if (sp) { let a = Math.atan2(sp.x - f.x, sp.z - f.z) - f.face; while (a > Math.PI) a -= 6.283; while (a < -Math.PI) a += 6.283; tgt = clamp(a, -0.75, 0.75); }
      else { if (t > f.nextGlance) { f.glance = (R() - 0.5) * 1.1; f.nextGlance = t + 2 + R() * 6; } tgt = f.glance; }
      f.look += (tgt - f.look) * Math.min(1, dt * stride * f.lag);
      const yaw = f.face + f.look + sway * 0.5, hs = f.hs * s;
      const nod = Math.sin(t * 2.1 * f.fr + f.ph * 2) * 0.04 + lean * 0.6 - stand * 0.15;
      off(f, f.face, 0, Math.sin(lean) * 0.38 * s);
      const hx = wx, hz = wz, hy = by + 0.4 * s * breathe;
      place(heads, i, hx, hy, hz, yaw, nod, sway * 0.6, hs);
      const c = Math.cos(yaw), sn = Math.sin(yaw);
      const ax = (rgt, fwd) => hx + rgt * c + fwd * sn, az = (rgt, fwd) => hz - rgt * sn + fwd * c;
      const blink = ((t * 0.31 + f.ph) % 3.7) < 0.12 ? 0.15 : 1;
      for (const sd of [-1, 1]) {
        const k = sd > 0 ? 1 : 0;
        if (f.ear === 0) place(ears, f.pk * 2 + k, ax(sd * 0.12 * hs, -0.01), hy + 0.19 * hs, az(sd * 0.12 * hs, -0.01), yaw, nod, -sd * 0.35, hs);
        else if (f.ear === 2) place(ears, f.pk * 2 + k, ax(sd * 0.08 * hs, -0.02), hy + 0.27 * hs, az(sd * 0.08 * hs, -0.02), yaw, nod - 0.1, -sd * 0.12 + Math.sin(t * 2 + f.ph + sd) * 0.06, hs * 0.8, hs * 2.1, hs * 0.6);
        else if (f.ear === 1) place(earsR, f.rk * 2 + k, ax(sd * 0.15 * hs, -0.02), hy + 0.15 * hs, az(sd * 0.15 * hs, -0.02), yaw, 0, 0, hs, hs, hs * 0.55);
        place(eyes, i * 2 + k, ax(sd * 0.075 * hs, 0.185 * hs), hy + 0.03 * hs, az(sd * 0.075 * hs, 0.185 * hs), yaw, 0, 0, hs, hs * blink, hs);
      }
      if (f.muzzle) place(muzzles, f.mk, ax(0, 0.16 * hs), hy - 0.06 * hs, az(0, 0.16 * hs), yaw, nod, 0, hs * 0.9, hs * 0.65, hs * 0.6);
      if (f.hat) place(hats, f.hk, hx, hy + 0.26 * hs, hz, yaw, nod, sway, hs);
      if (f.scarf) { off(f, f.face, 0, 0.02); place(scarves, f.sk, wx, by + 0.24 * s, wz, f.face, Math.PI / 2 + lean, 0, s, s, s * 0.8); }
      // hands: resting on the knees, clapping, waving or pumped in the air
      const clapping = f.clapper && (stand > 0.25 || (m && m.state === 'point' && f.side === cheerFav) || excite > 0.6);
      const up = f.waver ? stand : stand > 0.55 ? stand : 0;
      for (const sd of [-1, 1]) {
        const k = sd > 0 ? 1 : 0;
        let rgt = sd * 0.26 * s * f.wide, hup = 0.02, fwd = 0.12 * s;
        if (up > 0.2) { rgt = sd * (0.3 + 0.05 * Math.sin(t * 6 + f.ph + sd)) * s; hup = 0.55 * s * up + 0.05 * Math.sin(t * 9 * f.fr + f.ph + sd * 1.3); fwd = 0.05; }
        else if (clapping) { const cl = Math.abs(Math.sin(t * 8 * f.fr + f.ph)); rgt = sd * (0.03 + 0.11 * cl) * s; hup = 0.22 * s; fwd = 0.24 * s; }
        else if (tense > 0.4 && f.temper > 0.9) { rgt = sd * 0.06 * s; hup = 0.32 * s; fwd = 0.22 * s; }  // nervous: paws at the mouth
        off(f, f.face, rgt, fwd);
        place(hands, i * 2 + k, wx, by + hup, wz, f.face, 0, 0, s);
      }
      if (f.finger) { const raise = Math.max(stand, 0.15); off(f, f.face, 0.3 * s, 0.08); place(fingers, f.fk, wx, by + 0.2 * s + raise * 0.55 + Math.sin(t * 5 + f.ph) * 0.05 * raise, wz, f.face, 0, -0.2 + Math.sin(t * 4 + f.ph) * 0.15 * raise, s); }
      if (f.flag) {
        const wave = 0.15 + stand * 0.8, sw = Math.sin(t * (3 + stand * 5) + f.ph) * 0.45 * wave;
        const py = by + 0.3 * s + stand * 0.3;
        off(f, f.face, -0.3 * s, 0.05); place(poles, f.gk, wx, py, wz, f.face, 0, sw, s);
        off(f, f.face, -0.3 * s - Math.sin(sw) * 0.4 + 0.21 * Math.cos(sw), 0.05);
        place(flags, f.gk, wx, py + Math.cos(sw) * 0.33, wz, f.face, 0, sw + Math.sin(t * 9 + f.ph) * 0.15, s);
      }
    }
    if (signs) signers.forEach((i, k) => {
      const f = data[i], cs = Math.cos(f.face), sn = Math.sin(f.face);
      const lt = t - cheerT - f.delay, cheer = lt > 0 && lt < 3 && f.side === cheerFav ? 1 : 0;
      const up = 0.95 + cheer * 0.4 + Math.sin(t * (2 + cheer * 4) * f.fr + f.ph) * (0.03 + cheer * 0.1);
      const sx = f.x + sn * 0.3, sz = f.z + cs * 0.3, tilt = Math.sin(t * 1.7 * f.fr + f.ph) * (0.06 + cheer * 0.12);
      place(signs, k, sx, f.y + up, sz, f.face, 0, tilt, 1);
      place(signFr, k, sx - sn * 0.012, f.y + up, sz - cs * 0.012, f.face, 0, tilt, 1);
    });
    for (const im of all) if (im) im.instanceMatrix.needsUpdate = true;
  };
}
// tiered stand built in a local frame (length along X, rows going away along +Z, front facing -Z)
// then rotated into place. Front wall with LED ribbon, aisles with stairs, stepped end walls,
// back wall, optional roof canopy and hanging banners. Pushes seat positions [x,y,z,facing].
const venueFx = [];
function ledTex(text, bg, fg, glow) {
  const t = canvasTex(1024, 64, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.font = '900 38px Nunito, Segoe UI, sans-serif'; g.textBaseline = 'middle';
    if (glow) { g.shadowColor = fg; g.shadowBlur = 14; }
    g.fillStyle = fg;
    const seg = text + '   ★   ', n = Math.max(1, Math.floor(w / g.measureText(seg).width));
    g.textAlign = 'center';
    for (let i = 0; i < n; i++) g.fillText(seg, (i + 0.5) * w / n, h / 2 + 2);
    g.shadowBlur = 0; g.fillStyle = 'rgba(0,0,0,.18)'; for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1);
  });
  t.wrapS = THREE.RepeatWrapping; return t;
}
function bannerTex(title, sub, bg, fg) {
  return canvasTex(256, 384, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(0, 0, w, 26); g.fillRect(0, h - 70, w, 8);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = fg;
    g.font = '150px Segoe UI Emoji, Apple Color Emoji, sans-serif'; g.fillText(title, w / 2, h * 0.42);
    g.font = '900 40px Nunito, Segoe UI, sans-serif'; g.fillText(sub, w / 2, h - 34);
    g.fillStyle = bg; g.beginPath(); g.moveTo(0, h); g.lineTo(w / 2, h - 30); g.lineTo(w, h); g.fill();
  });
}
function grandstand(group, seats, o) {
  // o: { axis:'x'|'z', side, start, length, center, rows, depth, rise, colA, colB, chair:[colors], block,
  //      lip, wall, ledText, ledBg, ledFg, glow, endCol, back, roof, banners:[[emoji,text,bg,fg]], aisle }
  const st = new THREE.Group();
  const th = o.axis === 'x' ? o.side * Math.PI / 2 : (o.side > 0 ? 0 : Math.PI);
  st.rotation.y = th;
  st.position.set(o.axis === 'x' ? 0 : o.center, 0, o.axis === 'x' ? o.center : 0);
  group.add(st);
  const L = o.length, hTop = 0.35 + (o.rows - 1) * o.rise;
  const aisle = o.aisle || 6.2;
  const aisles = []; for (let x = -L / 2 + aisle; x < L / 2 - 1; x += aisle) aisles.push(x);
  const lipM = toon(o.lip || 0xffffff), stepM = toon(0xffc94d);
  const chairs = [];
  for (let r = 0; r < o.rows; r++) {
    const h = 0.35 + r * o.rise, z = o.start + r * o.depth + o.depth / 2;
    box(st, L, h, o.depth, toon(r % 2 ? o.colA : o.colB), 0, h / 2, z, { recv: true });
    box(st, L, 0.05, 0.07, lipM, 0, h + 0.005, z - o.depth / 2 + 0.035);
    for (const ax of aisles) {
      box(st, 0.8, 0.055, 0.08, stepM, ax, h + 0.01, z - o.depth / 2 + 0.04);
      box(st, 0.8, h - o.rise / 2 + 0.02, o.depth / 2, toon(o.colB), ax, (h - o.rise / 2) / 2, z - o.depth / 4);
    }
    for (let k = 0; k < L / 0.62 - 1; k++) {
      const x = -L / 2 + 0.5 + k * 0.62;
      if (aisles.some((ax) => Math.abs(x - ax) < 0.6)) continue;
      if (o.gap && Math.abs(x) < o.gap) continue;
      chairs.push([x, h, z]);
    }
    // stepped end walls
    for (const s of [-1, 1]) box(st, 0.28, h + 0.6, o.depth, toon(o.endCol || 0x8a8f9c), s * (L / 2 + 0.14), (h + 0.6) / 2, z, { cast: true });
  }
  // back wall + rail
  const backZ = o.start + o.rows * o.depth + 0.15;
  const bh = hTop + (o.lowBack ? 0.9 : 2.4);
  box(st, L + 0.56, bh, 0.3, toon(o.back || o.endCol || 0x8a8f9c), 0, bh / 2, backZ, { recv: true });
  // front wall with LED / padded face
  const fz = o.start - 0.12;
  const face = o.ledText ? new THREE.MeshBasicMaterial({ map: ledTex(o.ledText, o.ledBg || '#101528', o.ledFg || '#ffd23f', o.glow) }) : toon(o.wall || 0x3557a8);
  if (o.ledText) { face.map.repeat.set(Math.max(1, Math.round(L / 9)), 1); const tx = face.map; const sp = 0.03 + Math.random() * 0.02; venueFx.push((t) => { tx.offset.x = (t * sp) % 1; }); }
  const wallBack = toon(o.wall || 0x2b2b38);
  const fw = new THREE.Mesh(new THREE.BoxGeometry(L + 0.56, 0.95, 0.24), [wallBack, wallBack, toon(o.lip || 0xffffff), wallBack, wallBack, face]);
  fw.position.set(0, 0.475, fz); shade(fw, true, true); st.add(fw);
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, L + 0.56, 8), toon(0xd8dde6)); rail.rotation.z = Math.PI / 2; rail.position.set(0, 1.22, fz); st.add(rail);
  for (let x = -L / 2; x <= L / 2 + 0.01; x += L / Math.round(L / 2.4)) box(st, 0.035, 0.3, 0.035, toon(0xd8dde6), x, 1.08, fz);
  // roof canopy with a light strip under the front edge
  if (o.roof) {
    const ry = hTop + 3.2, depth = o.rows * o.depth + 1.4;
    const canopy = box(st, L + 1.2, 0.22, depth, toon(o.roof), 0, ry, o.start + depth / 2 - 1.1, { cast: false });
    canopy.rotation.x = -0.08;
    box(st, L + 1.2, 0.08, 0.16, basic(o.roofLight || 0xfff3c4), 0, ry - 0.2, o.start - 1.0);
    for (let x = -L / 2; x <= L / 2 + 0.01; x += L / 3) box(st, 0.18, ry, 0.18, toon(o.roof), x, ry / 2, backZ - 0.3);
  }
  // hanging banners on the back wall, waving gently
  if (o.banners) o.banners.forEach((b, i) => {
    const pivot = new THREE.Group();
    const x = (i + 0.5) / o.banners.length * L - L / 2;
    pivot.position.set(x, hTop + 2.3, backZ - 0.17);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.25), basic(0xffffff, { map: bannerTex(b[0], b[1], b[2], b[3] || '#fff'), side: THREE.DoubleSide }));
    m.position.y = -1.12; m.rotation.y = Math.PI; pivot.add(m); st.add(pivot);
    const ph = Math.random() * 6;
    venueFx.push((t) => { pivot.rotation.x = Math.sin(t * 1.3 + ph) * 0.04 - 0.03; });
  });
  // instanced chairs (world space)
  st.updateMatrix();
  const n = chairs.length;
  const seatIM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.46, 0.07, 0.4), new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: toonGrad }), n);
  const backIM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.46, 0.4, 0.06), new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: toonGrad }), n);
  const d = new THREE.Object3D(), col = new THREE.Color(), v = new THREE.Vector3();
  const face0 = th + Math.PI;
  chairs.forEach((c, i) => {
    v.set(c[0], c[1], c[2]).applyMatrix4(st.matrix);
    d.position.set(v.x, v.y + 0.22, v.z); d.rotation.set(0, face0, 0); d.scale.set(1, 1, 1); d.updateMatrix(); seatIM.setMatrixAt(i, d.matrix);
    d.translateZ(-0.2); d.translateY(0.2); d.updateMatrix(); backIM.setMatrixAt(i, d.matrix);
    const cc = o.chair[Math.floor((c[0] + L / 2) / (o.block || 9999)) % o.chair.length] || o.chair[0];
    seatIM.setColorAt(i, col.setHex(cc)); backIM.setColorAt(i, col.setHex(shadeHex(cc, -0.12)));
    seats.push([v.x, v.y + 0.12, v.z, face0]);
  });
  group.add(seatIM, backIM);
}
function boardTex(text, bg, fg, w = 512, h = 64) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = fg; g.font = `900 ${Math.round(h * 0.56)}px Nunito, Segoe UI, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 2);
  });
}
function perimeterBoards(group, items, glow) {
  // LED-style boards around the court (behind baselines and along sides)
  const spots = [[-2.6, -8.9, 0], [2.6, -8.9, 0], [-2.6, 8.9, Math.PI], [2.6, 8.9, Math.PI], [-5.4, -4.5, Math.PI / 2], [-5.4, 4.5, Math.PI / 2], [5.4, -4.5, -Math.PI / 2], [5.4, 4.5, -Math.PI / 2]];
  spots.forEach(([x, z, ry], i) => {
    const it = items[i % items.length];
    const face = (glow ? basic : (c, e) => lambert(c, e))(0xffffff, { map: boardTex(it[0], it[1], it[2]) });
    const back = toon(0x2b2b38);
    const m = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.62, 0.14), [back, back, back, back, face, back]);
    m.position.set(x, 0.31, z); m.rotation.y = ry; shade(m, true, false); group.add(m);
  });
}
function pine(group, x, z, s, snow) {
  box(group, 0.25 * s, 0.9 * s, 0.25 * s, toon(0x8d5a3b), x, 0.45 * s, z, { cast: true });
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Mesh(new THREE.ConeGeometry((1.35 - i * 0.32) * s, 1.5 * s, 8), toon(i % 2 ? 0x2e8b57 : 0x34a065));
    c.position.set(x, (1.2 + i * 0.8) * s, z); shade(c, true, false); group.add(c);
    if (snow) { const cap = new THREE.Mesh(new THREE.ConeGeometry((0.72 - i * 0.16) * s, 0.62 * s, 8), toon(0xffffff)); cap.position.set(x, (1.66 + i * 0.8) * s, z); group.add(cap); }
  }
}
function roundTree(group, x, z, s, cols) {
  const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.15 * s, 0.22 * s, 1.6 * s, 7), toon(0x8d5a3b)); tr.position.set(x, 0.8 * s, z); shade(tr, true, false); group.add(tr);
  cols = cols || [0x5bbf6a, 0x4caf50, 0x7cc96b];
  for (let i = 0; i < 5; i++) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry((0.75 + Math.random() * 0.35) * s, 1), toon(cols[i % cols.length]));
    b.position.set(x + rand(-0.6, 0.6) * s, (2.1 + rand(0, 0.8)) * s, z + rand(-0.6, 0.6) * s); shade(b, true, false); group.add(b);
  }
}
function palm(group, x, z, s) {
  let px = x, py = 0;
  const lean = rand(-0.3, 0.3);
  for (let i = 0; i < 7; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.13 * s, 0.17 * s, 0.62 * s, 8), toon(i % 2 ? 0xb07a4b : 0x9c6b40));
    px += lean * 0.22 * s; py += 0.58 * s; seg.position.set(px, py, z); seg.rotation.z = -lean * 0.35; shade(seg, true, false); group.add(seg);
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.28 * s, 2.3 * s, 4), toon(i % 2 ? 0x43a047 : 0x66bb6a));
    leaf.scale.z = 0.22;
    leaf.position.set(px + Math.cos(a) * 0.95 * s, py - 0.05 * s, z + Math.sin(a) * 0.95 * s);
    leaf.rotation.set(Math.sin(a) * 1.95, 0, -Math.cos(a) * 1.95); shade(leaf, true, false); group.add(leaf);
  }
  for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.12 * s, 8, 6), toon(0x6d4c2f)); c.position.set(px + rand(-0.15, 0.15) * s, py - 0.2 * s, z + rand(-0.15, 0.15) * s); group.add(c); }
}
function bench(group, seats, x, z, rotY, col) {
  const g = new THREE.Group();
  box(g, 2.4, 0.1, 0.5, toon(col || 0xb5835a), 0, 0.45, 0, { cast: true });
  box(g, 2.4, 0.4, 0.08, toon(col || 0xb5835a), 0, 0.75, -0.24, { cast: true });
  for (const s of [-1, 1]) box(g, 0.1, 0.45, 0.45, toon(0x5d4e46), s * 1.05, 0.22, 0);
  g.position.set(x, 0, z); g.rotation.y = rotY || 0; group.add(g);
  for (let k = -1; k <= 1; k++) seats.push([x + Math.cos(rotY || 0) * k * 0.75, 0.25, z - Math.sin(rotY || 0) * k * 0.75, (rotY || 0)]);
}
function flowers(group, n, area, avoid) {
  const cols = [0xff6b6b, 0xffd23f, 0xffffff, 0xc58cff, 0xff9fb8];
  const geo = new THREE.SphereGeometry(0.09, 6, 4);
  const im = new THREE.InstancedMesh(geo, new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: toonGrad }), n);
  const d = new THREE.Object3D(), col = new THREE.Color();
  for (let i = 0; i < n; i++) {
    let x, z; do { x = rand(-area, area); z = rand(-area, area); } while (Math.abs(x) < avoid[0] && Math.abs(z) < avoid[1]);
    d.position.set(x, 0.08, z); d.updateMatrix(); im.setMatrixAt(i, d.matrix); im.setColorAt(i, col.setHex(cols[i % cols.length]));
  }
  group.add(im);
}

const VENUE_BUILD = {
  // ---------------------------------------------------------- indoor gym
  gym(g) {
    ground(g, woodTex(['#e2b383', '#dcab7b', '#e6ba8c', '#d8a675'], [14, 14]));
    const flags = makeCourt(g, { runoff: '#1f7a62', court: '#2a9a78', line: '#ffffff', edge: 0x1a5e4b, post: 0x2f5fb8, flag: 0xff7a59, logo: 'SHUTTLE PAWS' });
    // walls: padded lower band + light upper wall with windows
    const pad = toon(0x3557a8), upper = toon(0xf6ecdc), win = basic(0xcfe8ff);
    for (const [w, x, z, ry] of [[40, 0, -19, 0], [40, 0, 24, Math.PI], [44, -16.5, 2.5, Math.PI / 2], [44, 16.5, 2.5, -Math.PI / 2]]) {
      const wall = new THREE.Group(); wall.position.set(x, 0, z); wall.rotation.y = ry;
      box(wall, w, 3, 0.4, pad, 0, 1.5, 0); box(wall, w, 10, 0.4, upper, 0, 8, 0.05);
      box(wall, w, 0.25, 0.5, toon(0xffc94d), 0, 3.1, 0);
      for (let i = -3; i <= 3; i++) box(wall, w / 9, 3.2, 0.1, win, i * (w / 7), 8.2, 0.3);
      g.add(wall);
    }
    // ceiling trusses + lamps
    for (let i = -4; i <= 5; i++) box(g, 33, 0.35, 0.35, toon(0x8a8f9c), 0, 12.5, i * 4.4);
    for (let i = -2; i <= 2; i++) for (let k = -2; k <= 3; k++) {
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 0.25, 16), toon(0x55596a)); lamp.position.set(i * 5.5, 11.6, k * 6 - 1.5); g.add(lamp);
      const glow = new THREE.Mesh(new THREE.CircleGeometry(0.52, 16), basic(0xfffbe8)); glow.rotation.x = Math.PI / 2; glow.position.set(i * 5.5, 11.47, k * 6 - 1.5); g.add(glow);
    }
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(14, 2.4), basic(0xffffff, { map: boardTex('GIẢI CẦU LÔNG SHUTTLE PAWS', '#ff7a59', '#ffffff', 1024, 176) }));
    banner.position.set(0, 7.4, -18.7); g.add(banner);
    const seats = [];
    const gymStand = { start: 7.2, center: 0, depth: 0.85, rise: 0.48, colA: 0xefe3d3, colB: 0xe2d2bd, lip: 0xffffff, endCol: 0x3557a8, back: 0xf6ecdc, ledBg: '#3557a8', ledFg: '#ffffff' };
    for (const s of [-1, 1]) grandstand(g, seats, Object.assign({}, gymStand, { axis: 'x', side: s, length: 24, rows: 6, chair: s < 0 ? [0xff7a59, 0xff9b7f, 0xffb199] : [0x5b7cf0, 0x7d97f5, 0x9bb0ff], block: 6.2,
      ledText: s < 0 ? 'CỐ LÊN ĐỘI CAM!' : 'ĐỘI XANH VÔ ĐỊCH!', ledBg: s < 0 ? '#e8623f' : '#3557a8',
      banners: s < 0 ? [['🐱', 'MƯỚP', '#ff7a59'], ['🦊', 'LỬA', '#e8623f'], ['🐻', 'ỦN', '#ff9b7f']] : [['🐰', 'BÔNG', '#5b7cf0'], ['🐼', 'TRÒN', '#3557a8'], ['🐧', 'LẠCH BẠCH', '#7d97f5']] }));
    grandstand(g, seats, Object.assign({}, gymStand, { axis: 'z', side: -1, start: 10.2, length: 13, rows: 5, chair: [0x5bbf8a, 0x7fd3a5], block: 6.5, ledText: 'GIẢI CẦU LÔNG SHUTTLE PAWS', ledBg: '#2a9a78' }));
    perimeterBoards(g, [['SHUTTLE PAWS', '#ff7a59', '#fff'], ['CẦU LÔNG VUI', '#3557a8', '#fff'], ['HOA MAI GYM', '#2a9a78', '#fff'], ['PERFECT!', '#ffc94d', '#3b2f2a']], false);
    return { bg: 0xf3e6d6, fog: [0xf3e6d6, 34, 80], flags, crowd: crowdFans(g, seats, { fill: 0.8, sections: (st) => st[2] < -9.5 ? [0x5bbf8a, 0xffffff, 0xffc94d][Math.floor(Math.random() * 3)] : st[0] < 0 ? [0xff7a59, 0xff9b7f, 0xffffff][Math.floor(Math.random() * 3)] : [0x5b7cf0, 0x7d97f5, 0xffffff][Math.floor(Math.random() * 3)] }), light: { hemi: [0xfff8ee, 0xc9a98d, 0.95], sun: [0xffffff, 0.85], pos: [5, 18, 8] } };
  },
  // ---------------------------------------------------------- night arena
  arena(g) {
    ground(g, null, 0x161b2e);
    const flags = makeCourt(g, { runoff: '#173d7a', court: '#2563c9', line: '#ffffff', edge: 0x0e2550, post: 0xffc94d, flag: 0xffc94d, logo: 'ÁNH SAO ARENA' });
    const seats = [];
    const arStand = { center: 0, depth: 0.85, rise: 0.5, colA: 0x2c3454, colB: 0x232a45, lip: 0x7fe3ff, endCol: 0x161b2e, back: 0x111628, wall: 0x0b1020, glow: true, roof: 0x1b2138, roofLight: 0x7fe3ff };
    for (const s of [-1, 1]) grandstand(g, seats, Object.assign({}, arStand, { axis: 'x', side: s, start: 7.5, length: 28, rows: 9, chair: s < 0 ? [0xe8455a, 0xff6b8a] : [0x3d7bff, 0x5fa0ff], block: 6.2,
      ledText: s < 0 ? 'ÁNH SAO ARENA  •  ĐẬP CẦU!' : 'SHUTTLE PAWS  •  RALLY!', ledBg: '#0b1020', ledFg: s < 0 ? '#ff6b8a' : '#7fe3ff',
      banners: s < 0 ? [['🔥', 'ĐẬP!', '#c0392b'], ['🏆', 'VÔ ĐỊCH', '#e8455a'], ['🐯', 'VẰN', '#c0392b'], ['⭐', 'ÁNH SAO', '#e8455a']] : [['💙', 'CỐ LÊN', '#2557c9'], ['🏸', 'RALLY', '#3d7bff'], ['🐲', 'BÉ RỒNG', '#2557c9'], ['✨', 'PERFECT', '#3d7bff']] }));
    for (const s of [-1, 1]) {
      const stand = new THREE.Group(); stand.userData.endStand = s; g.add(stand);
      grandstand(stand, seats, Object.assign({}, arStand, { axis: 'z', side: s, start: 10.5, length: 14, rows: s > 0 ? 5 : 8, roof: s > 0 ? null : arStand.roof, lowBack: s > 0, chair: [0xffc94d, 0xffdd7a], block: 7, ledText: 'ĐẤU TRƯỜNG ÁNH SAO', ledBg: '#0b1020', ledFg: '#ffd23f' }));
    }
    perimeterBoards(g, [['SHUTTLE PAWS', '#0b1020', '#ffd23f'], ['ĐẬP CẦU!', '#0b1020', '#ff6b8a'], ['ÁNH SAO', '#0b1020', '#7fe3ff'], ['RALLY!', '#0b1020', '#9ef0b8']], true);
    const coneMat = new THREE.MeshBasicMaterial({ color: 0xfff1c4, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    for (const [x, z] of [[-3, -4], [3, -4], [-3, 4], [3, 4]]) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(3.4, 17, 24, 1, true), coneMat); c.position.set(x, 8.5, z); c.userData.beam = true; g.add(c);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 8), basic(0xfff6d6)); lamp.position.set(x, 17, z); g.add(lamp);
    }
    // jumbotron
    const jt = new THREE.Group(); jt.position.set(0, 13, 0);
    for (let i = 0; i < 4; i++) {
      const sc = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.2), basic(0xffffff, { map: boardTex('SHUTTLE PAWS', '#101a3a', '#7fe3ff', 512, 280), side: THREE.DoubleSide }));
      sc.position.set(Math.sin(i * Math.PI / 2) * 2.05, 0, Math.cos(i * Math.PI / 2) * 2.05); sc.rotation.y = i * Math.PI / 2; jt.add(sc);
    }
    box(jt, 4.2, 0.3, 4.2, toon(0x2b2f3f), 0, 1.25, 0); box(jt, 4.2, 0.3, 4.2, toon(0x2b2f3f), 0, -1.25, 0);
    g.add(jt);
    // light rings: wide and high enough that every match camera (the behind-the-back view sits at y 6.6-11, up to
    // z 18 when the player is on the baseline) stays inside and below them, so they can never cross the view of the court
    const ring = new THREE.Mesh(new THREE.TorusGeometry(20, 0.3, 6, 72), basic(0x7fe3ff)); ring.rotation.x = Math.PI / 2; ring.position.y = 12.6; g.add(ring);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(20, 0.3, 6, 72), basic(0xff6b8a)); ring2.rotation.x = Math.PI / 2; ring2.position.y = 11.9; g.add(ring2);
    return { bg: 0x0d1222, fog: [0x0d1222, 30, 75], flags, crowd: crowdFans(g, seats, { fill: 0.88, sections: (st) => Math.abs(st[2]) > 10 ? [0xffd23f, 0xffffff][Math.floor(Math.random() * 2)] : st[0] < 0 ? [0xff6b8a, 0xe8455a, 0xffffff][Math.floor(Math.random() * 3)] : [0x7fe3ff, 0x3d7bff, 0xffffff][Math.floor(Math.random() * 3)] }), light: { hemi: [0xbfd0ff, 0x1a2036, 0.75], sun: [0xfff2dc, 1.05], pos: [2, 20, 4] },
      extra: (t) => { jt.rotation.y = t * 0.15; } };
  },
  // ---------------------------------------------------------- rooftop at sunset
  roof(g) {
    skyDome(g, [[0, '#2d1f5e'], [0.45, '#b4508a'], [0.7, '#ff8a5c'], [1, '#ffd28f']], { x: -40, y: 6, z: -90, size: 26, core: '#fff3c4', glow: 'rgba(255,170,90,.6)' });
    const tiles = canvasTex(256, 256, (c, w) => { c.fillStyle = '#cdbba7'; c.fillRect(0, 0, w, w); c.strokeStyle = '#b5a28e'; c.lineWidth = 3; for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(i * 64, 0); c.lineTo(i * 64, w); c.moveTo(0, i * 64); c.lineTo(w, i * 64); c.stroke(); } }, [11, 16]);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(22, 1, 32), lambert(0xffffff, { map: tiles })); roof.position.set(0, -0.5, 2); roof.receiveShadow = true; g.add(roof);
    box(g, 22.4, 1.6, 32.4, toon(0x7a6a8f), 0, -1.3, 2);
    const flags = makeCourt(g, { runoff: '#22806f', court: '#2fa08a', line: '#ffffff', edge: 0x1a5e52, flag: 0xffc94d, logo: 'ROOFTOP' });
    const glass = new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.25, depthWrite: false });
    for (const s of [-1, 1]) {
      box(g, 0.06, 1.1, 32, glass, s * 11, 0.55, 2); box(g, 0.12, 0.08, 32, toon(0x5d4e46), s * 11, 1.12, 2);
      box(g, 22, 1.1, 0.06, glass, 0, 0.55, s > 0 ? 18 : -14); box(g, 22, 0.08, 0.12, toon(0x5d4e46), 0, 1.12, s > 0 ? 18 : -14);
    }
    const winTex = canvasTex(64, 128, (c, w, h) => { c.fillStyle = '#2b2440'; c.fillRect(0, 0, w, h); for (let y = 6; y < h; y += 12) for (let x = 6; x < w; x += 12) { c.fillStyle = Math.random() < 0.5 ? '#ffd27a' : '#3d3459'; c.fillRect(x, y, 6, 7); } });
    const bm = lambert(0xffffff, { map: winTex });
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * Math.PI * 2, r = rand(28, 60), h = rand(8, 34);
      const b = new THREE.Mesh(new THREE.BoxGeometry(rand(3, 7), h, rand(3, 7)), bm);
      b.position.set(Math.cos(a) * r, h / 2 - 16, Math.sin(a) * r - 6); g.add(b);
    }
    const bulbCols = [0xffe9a8, 0xffb3c6, 0xa8e6ff];
    for (const s of [-1, 1]) for (let k = 0; k < 30; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), basic(bulbCols[k % 3])); b.position.set(s * 10.4, 3.4 - Math.sin((k % 6) / 6 * Math.PI) * 0.6, -13 + k); g.add(b); }
    for (const s of [-1, 1]) for (let k = 0; k < 6; k++) box(g, 0.1, 3.5, 0.1, toon(0x5d4e46), s * 10.4, 1.75, -13 + k * 6);
    for (const [x, z] of [[-9.5, -12], [9.5, -12], [-9.5, 16], [9.5, 16], [-9.5, 2], [9.5, 2]]) {
      box(g, 0.8, 0.7, 0.8, toon(0xc0785a), x, 0.35, z, { cast: true });
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.65, 1), toon(0x4caf50)); b.position.set(x, 1.2, z); shade(b, true, false); g.add(b);
    }
    const seats = []; bench(g, seats, -8.3, -5, Math.PI / 2, 0xffffff); bench(g, seats, 8.3, 5, -Math.PI / 2, 0xffffff); bench(g, seats, -8.3, 6, Math.PI / 2, 0xffffff); bench(g, seats, 8.3, -6, -Math.PI / 2, 0xffffff);
    return { bg: 0xff9f7a, fog: [0xd98a8a, 50, 130], flags, crowd: crowdFans(g, seats, { fill: 1 }), light: { hemi: [0xffd9c2, 0x6a4c7c, 0.85], sun: [0xffc59a, 0.9], pos: [-8, 12, -10] } };
  },
  // ---------------------------------------------------------- beach
  beach(g) {
    skyDome(g, [[0, '#2f9ae6'], [0.55, '#8fd3f7'], [1, '#e9f8ff']], { x: 50, y: 40, z: -80, size: 22, core: '#fffbe6', glow: 'rgba(255,240,180,.55)' });
    ground(g, noiseTex('#f0d6a4', ['#e3c48f', '#f8e3ba', '#dcb980'], 6000, [16, 16]));
    const flags = makeCourt(g, { runoff: '#e5c48b', court: '#ecd09c', line: '#1f6fd1', edge: 0xd2ac70, grain: ['#dcb980', '#f4dcae'], post: 0xffffff, flag: 0xff5e7a, umpireCol: 0x1f6fd1, netColor: 'rgba(20,40,90,.85)' });
    const waveTex = canvasTex(256, 256, (c, w) => { const gr = c.createLinearGradient(0, 0, 0, w); gr.addColorStop(0, '#1e88c9'); gr.addColorStop(1, '#2fb3d9'); c.fillStyle = gr; c.fillRect(0, 0, w, w); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 3; for (let y = 10; y < w; y += 28) { c.beginPath(); for (let x = 0; x <= w; x += 8) c.lineTo(x, y + Math.sin(x / 12 + y) * 4); c.stroke(); } }, [12, 4]);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(260, 90), basic(0xffffff, { map: waveTex }));
    sea.rotation.x = -Math.PI / 2; sea.position.set(0, 0.03, -62); g.add(sea);
    const shallow = new THREE.Mesh(new THREE.PlaneGeometry(260, 3), basic(0x7fe0e8, { transparent: true, opacity: 0.8 })); shallow.rotation.x = -Math.PI / 2; shallow.position.set(0, 0.035, -18.4); g.add(shallow);
    const foam = new THREE.Mesh(new THREE.PlaneGeometry(260, 0.8), basic(0xffffff, { transparent: true, opacity: 0.85 })); foam.rotation.x = -Math.PI / 2; foam.position.set(0, 0.04, -16.8); g.add(foam);
    for (const [x, z, s] of [[-9, -9, 1.3], [9.5, -6, 1.2], [-10, 5, 1.35], [10.5, 9, 1.25], [-13, -14, 1.5], [14, -13, 1.4]]) palm(g, x, z, s);
    const uc = [[0xff5e7a, 0xffffff], [0xffc94d, 0xffffff], [0x1f6fd1, 0xffffff]];
    const seats = [];
    for (let i = 0; i < 6; i++) {
      const sx = i % 2 ? 1 : -1, x = sx * rand(7.2, 9), z = -9 + i * 3.6;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6), toon(0xffffff)); pole.position.set(x, 1.2, z); g.add(pole);
      for (let k = 0; k < 8; k++) {
        const seg = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.55, 8, 1, true, k * Math.PI / 4, Math.PI / 4), toon(uc[i % 3][k % 2], { side: THREE.DoubleSide }));
        seg.position.set(x, 2.45, z); shade(seg, true, false); g.add(seg);
      }
      const towel = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.7), toon(uc[(i + 1) % 3][0])); towel.rotation.x = -Math.PI / 2; towel.position.set(x + sx * 0.6, 0.03, z + 0.3); g.add(towel);
      seats.push([x - sx * 0.4, -0.05, z + 0.5, sx > 0 ? -Math.PI / 2 : Math.PI / 2]);
      seats.push([x - sx * 0.4, -0.05, z - 0.4, sx > 0 ? -Math.PI / 2 : Math.PI / 2]);
    }
    for (let k = -6; k <= 6; k++) seats.push([k * 0.8, -0.05, -10.5 - Math.random() * 0.6, 0]);
    const water = (t) => { waveTex.offset.y = (t * 0.02) % 1; foam.position.z = -16.8 + Math.sin(t * 0.8) * 0.35; foam.material.opacity = 0.6 + Math.sin(t * 0.8) * 0.3; };
    return { bg: 0x8fd3f7, fog: [0xcfeefc, 55, 140], flags, crowd: crowdFans(g, seats, { fill: 0.9, shirts: [0xff5e7a, 0xffc94d, 0x1f6fd1, 0x5bbf8a, 0xffffff] }), light: { hemi: [0xffffff, 0xe8c79a, 1.0], sun: [0xfff4e0, 0.95], pos: [8, 20, 6] }, extra: water };
  },
  // ---------------------------------------------------------- park
  park(g) {
    skyDome(g, [[0, '#4aa7ea'], [0.6, '#a9dcf7'], [1, '#effaff']], { x: -50, y: 45, z: -70, size: 18, core: '#fffbe6', glow: 'rgba(255,245,200,.5)' });
    ground(g, canvasTex(256, 256, (c, w) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#79c468' : '#84cd72'; c.fillRect(0, i * 32, w, 32); } for (let i = 0; i < 2000; i++) { c.fillStyle = 'rgba(50,110,40,.22)'; c.fillRect(Math.random() * w, Math.random() * w, 1, 3); } }, [18, 18]));
    const path = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 160), lambert(0xe9dcc3)); path.rotation.x = -Math.PI / 2; path.position.set(-12.5, 0.01, 0); path.receiveShadow = true; g.add(path);
    const flags = makeCourt(g, { runoff: '#3e8f5e', court: '#4fa86c', line: '#ffffff', edge: 0x2f6e48, grain: ['#479c63', '#57b273'], post: 0xffffff, flag: 0xffc94d, logo: 'CÔNG VIÊN' });
    for (const [x, z, s] of [[-9, -10, 1.4], [9, -10, 1.6], [-9.5, 3, 1.2], [10, 2, 1.5], [-9, 13, 1.3], [9, 14, 1.4], [-16, -16, 2], [16, -15, 1.8], [0, -19, 1.9], [-6, -18, 1.5], [6, -17, 1.6], [-17, 6, 1.7], [17, 8, 1.8]]) roundTree(g, x, z, s, Math.random() < 0.25 ? [0xff9fb8, 0xffb7c9, 0xff8fab] : null);
    const fence = toon(0xffffff);
    for (let k = -9; k <= 9; k++) for (const s of [-1, 1]) box(g, 0.08, 0.75, 0.08, fence, s * 6.4, 0.37, k * 1.15, { cast: true });
    for (const s of [-1, 1]) { box(g, 0.05, 0.07, 21, fence, s * 6.4, 0.66, 0); box(g, 0.05, 0.07, 21, fence, s * 6.4, 0.36, 0); }
    flowers(g, settings.gfx === 0 ? 120 : 320, 22, [7, 11]);
    const seats = []; for (const z of [-5, 0, 5]) { bench(g, seats, -8, z, Math.PI / 2); bench(g, seats, 8, z, -Math.PI / 2); }
    for (let i = 0; i < 16; i++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(rand(0.4, 0.75), 1), toon(i % 2 ? 0x4caf50 : 0x66bb6a)); b.position.set((i % 2 ? 1 : -1) * rand(7.2, 12), 0.3, rand(-13, 13)); shade(b, true, false); g.add(b); }
    return { bg: 0xa9dcf7, fog: [0xd8f0fb, 45, 120], flags, crowd: crowdFans(g, seats, { fill: 0.9 }), light: { hemi: [0xffffff, 0x8fbf7a, 1.0], sun: [0xfff8e6, 0.9], pos: [-6, 18, 8] } };
  },
  // ---------------------------------------------------------- snowy mountain
  snow(g) {
    skyDome(g, [[0, '#7fb3e3'], [0.6, '#cfe5f7'], [1, '#f6fbff']], { x: 40, y: 30, z: -90, size: 18, core: '#ffffff', glow: 'rgba(255,255,255,.4)' });
    ground(g, noiseTex('#f7fbff', ['#e3edf7', '#ffffff', '#dbe7f3'], 3000, [14, 14]));
    const flags = makeCourt(g, { runoff: '#7fb7dd', court: '#9fd0ef', line: '#163e66', edge: 0x5f93bd, flag: 0xff5e7a, post: 0x163e66, umpireCol: 0xc0392b, netColor: 'rgba(15,40,70,.9)', logo: 'ĐỈNH TUYẾT' });
    for (const [x, z, s] of [[-8.5, -8, 1.4], [8.5, -10, 1.6], [-9.5, 3, 1.3], [9.5, 2, 1.5], [-8.5, 12, 1.3], [9, 13, 1.3], [-14, -14, 1.9], [15, -15, 2.1], [-4, -18, 1.7], [5, -19, 1.9], [-16, 4, 1.8], [16, 6, 1.7]]) pine(g, x, z, s, true);
    const mtn = [0x8fa3bf, 0x9fb3cc, 0x7d93ae];
    for (let i = 0; i < 10; i++) {
      const x = -70 + i * 15 + rand(-4, 4), h = rand(18, 34), r = rand(11, 17), z = -62 + rand(-8, 4);
      const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), toon(mtn[i % 3])); m.position.set(x, h / 2 - 1, z); g.add(m);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.4, h * 0.4, 7), toon(0xffffff)); cap.position.set(x, h - 1 - h * 0.2 + 0.05, z); g.add(cap);
    }
    // cabin
    const cab = new THREE.Group(); cab.position.set(-11, 0, -7); cab.rotation.y = 0.5;
    box(cab, 3.2, 2.2, 2.6, toon(0x9c6b40), 0, 1.1, 0, { cast: true });
    const roofM = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.4, 4), toon(0xffffff)); roofM.position.y = 2.9; roofM.rotation.y = Math.PI / 4; roofM.scale.set(1.25, 1, 1); cab.add(roofM);
    box(cab, 0.7, 0.7, 0.05, basic(0xffd27a), 0.7, 1.3, 1.31); box(cab, 0.7, 1.3, 0.05, toon(0x5d4e46), -0.6, 0.65, 1.31);
    g.add(cab);
    const N = settings.gfx === 0 ? 250 : 800;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { pos[i * 3] = rand(-18, 18); pos[i * 3 + 1] = rand(0, 14); pos[i * 3 + 2] = rand(-18, 18); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.1, transparent: true, opacity: 0.95 })));
    const seats = []; for (const z of [-4, 3]) { bench(g, seats, -8, z, Math.PI / 2, 0xc0392b); bench(g, seats, 8, z, -Math.PI / 2, 0xc0392b); }
    for (let k = -4; k <= 4; k++) seats.push([k * 0.8, 0, -10.8, 0]);
    const snowFx = (t, dt, wind) => {
      for (let i = 0; i < N; i++) {
        pos[i * 3] += (wind.x * 0.9 + Math.sin(t + i) * 0.2) * dt; pos[i * 3 + 1] -= 0.9 * dt; pos[i * 3 + 2] += wind.z * 0.9 * dt;
        if (pos[i * 3 + 1] < 0) { pos[i * 3 + 1] = 14; pos[i * 3] = rand(-18, 18); pos[i * 3 + 2] = rand(-18, 18); }
        if (pos[i * 3] > 18) pos[i * 3] -= 36; if (pos[i * 3] < -18) pos[i * 3] += 36;
        if (pos[i * 3 + 2] > 18) pos[i * 3 + 2] -= 36; if (pos[i * 3 + 2] < -18) pos[i * 3 + 2] += 36;
      }
      geo.attributes.position.needsUpdate = true;
    };
    return { bg: 0xcfe5f7, fog: [0xe6f1fb, 40, 120], flags, crowd: crowdFans(g, seats, { fill: 1, shirts: [0xc0392b, 0x1f6fd1, 0xffc94d, 0x2e8b57, 0xffffff] }), light: { hemi: [0xffffff, 0xb8cde0, 1.0], sun: [0xffffff, 0.85], pos: [6, 18, 10] }, extra: snowFx };
  },
};

let venue = null;
function setVenue(idx, force) {
  if (venue && venue.idx === idx && !force) return;
  if (venue) { scene.remove(venue.group); disposeTree(venue.group); }
  venueFx.length = 0;
  const v = S.VENUES[idx] || S.VENUES[0];
  const group = new THREE.Group();
  const info = VENUE_BUILD[v.id](group);
  scene.add(group);
  scene.background = new THREE.Color(info.bg);
  scene.fog = new THREE.Fog(info.fog[0], info.fog[1], info.fog[2]);
  const L = info.light;
  hemi.color.setHex(L.hemi[0]); hemi.groundColor.setHex(L.hemi[1]); hemi.intensity = L.hemi[2];
  sun.color.setHex(L.sun[0]); sun.intensity = L.sun[1]; sun.position.set(L.pos[0], L.pos[1], L.pos[2]);
  venue = Object.assign({ idx, group }, info);
  venue.seat = group.userData.seat || null;
  // ceiling parts above the court (lamps, trusses) get hidden when a high camera looks down through them
  group.updateMatrixWorld(true);
  const wp = new THREE.Vector3();
  venue.overhead = []; venue.beams = []; venue.endStands = [];
  group.traverse((o) => { if (o.userData.endStand) venue.endStands.push(o); });
  group.traverse((o) => { if (o.userData.beam) venue.beams.push(o); });
  group.traverse((o) => { if (o.isMesh) { o.getWorldPosition(wp); if (wp.y > 9 && Math.abs(wp.x) < 20 && Math.abs(wp.z) < 30) venue.overhead.push({ o, y: wp.y }); } });
  mergeStaticVenue(venue);
}
// Venue props that never move are drawn together: meshes with the same parent and material become one mesh (hundreds fewer draw calls).
// Left alone: instanced crowds, anything the venue's own animation moves (found by running it at two times), ceiling parts and
// other objects the camera code shows / hides one by one.
function mergeStaticVenue(v) {
  const skip = new Set(), all = [];
  const ohY = new Map(); for (const it of v.overhead) ohY.set(it.o, it.y);   // ceiling parts merge only with parts at the same height (they are hidden by height)
  for (const k of ['beams', 'endStands', 'flags']) for (const o of v[k] || []) if (o && o.isObject3D) o.traverse((c) => skip.add(c));
  v.group.traverse((o) => { if (o.isMesh) all.push(o); });
  const sig = (o) => o.position.x + ',' + o.position.y + ',' + o.position.z + ',' + o.quaternion.x + ',' + o.quaternion.y + ',' + o.quaternion.z + ',' + o.scale.x + ',' + o.scale.y + ',' + o.visible + ',' + (o.geometry.attributes.position ? o.geometry.attributes.position.version : 0) + ',' + o.material.uuid;
  const run = (t) => { try { for (const f of venueFx) f(t, 0.016); if (v.crowd) v.crowd(t, 0.5); if (v.extra) v.extra(t, 0.016, { x: 0.6, z: 0.3 }); } catch (e) { /* probe only */ } };
  run(3.1); const s0 = all.map(sig); run(3.47); all.forEach((o, i) => { o.quaternion.setFromEuler(o.rotation); if (sig(o) !== s0[i]) skip.add(o); });
  const buckets = new Map();
  for (const o of all) {
    const g = o.geometry;
    if (o.isInstancedMesh || o.isSkinnedMesh || skip.has(o) || o.children.length || !o.visible || Array.isArray(o.material) || !g.attributes.position || !g.attributes.normal || g.morphAttributes.position) continue;
    o.updateMatrix(); if (o.matrix.determinant() <= 0) continue;
    const key = o.parent.uuid + '|' + o.material.uuid + '|' + (g.attributes.uv ? 1 : 0) + (g.attributes.color ? 1 : 0) + (o.castShadow ? 1 : 0) + (o.receiveShadow ? 1 : 0) + (o.userData.isOutline ? 1 : 0) + (o.frustumCulled ? 1 : 0) + '|' + o.renderOrder + '|' + o.layers.mask + '|' + (ohY.has(o) ? 'oh' + Math.round(ohY.get(o) * 2) : '');
    if (!buckets.has(key)) buckets.set(key, []); buckets.get(key).push(o);
  }
  const p = new THREE.Vector3(), nm = new THREE.Matrix3();
  for (const list of buckets.values()) {
    if (list.length < 2) continue;
    const first = list[0], hasUv = !!first.geometry.attributes.uv, hasCol = !!first.geometry.attributes.color, colSize = hasCol ? first.geometry.attributes.color.itemSize : 3;
    if (hasCol && list.some((o) => o.geometry.attributes.color.itemSize !== colSize)) continue;
    const pos = [], nor = [], uv = [], col = [];
    for (const o of list) {
      const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry, P = g.attributes.position, N = g.attributes.normal;
      nm.getNormalMatrix(o.matrix);
      for (let i = 0; i < P.count; i++) {
        p.fromBufferAttribute(P, i).applyMatrix4(o.matrix); pos.push(p.x, p.y, p.z);
        p.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor.push(p.x, p.y, p.z);
        if (hasUv) uv.push(g.attributes.uv.getX(i), g.attributes.uv.getY(i));
        if (hasCol) for (let c = 0; c < colSize; c++) col.push(g.attributes.color.array[i * colSize + c]);
      }
      if (g !== o.geometry) g.dispose();
    }
    const mg = new THREE.BufferGeometry();
    mg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); mg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    if (hasUv) mg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    if (hasCol) mg.setAttribute('color', new THREE.Float32BufferAttribute(col, colSize));
    const mm = new THREE.Mesh(mg, first.material);
    mm.castShadow = first.castShadow; mm.receiveShadow = first.receiveShadow; mm.renderOrder = first.renderOrder; mm.frustumCulled = first.frustumCulled; mm.layers.mask = first.layers.mask;
    mm.userData.noOutline = true; if (first.userData.isOutline) mm.userData.isOutline = true;
    first.parent.add(mm);
    if (ohY.has(first)) v.overhead.push({ o: mm, y: Math.min(...list.map((o) => ohY.get(o))) });
    for (const o of list) { o.parent.remove(o); o.geometry.dispose(); }
  }
  v.overhead = v.overhead.filter((it) => it.o.parent);
}

// ================================================================ characters
// chibi athletes: big head, sparkly eyes, team jersey + shorts, sneakers, sweatband
const numTexCache = new Map();
function jerseyNumberTex(n, col) {
  const key = n + ':' + col;
  if (numTexCache.has(key)) return numTexCache.get(key);
  const t = canvasTex(128, 128, (g) => {
    g.font = '900 92px Nunito, Segoe UI, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineJoin = 'round'; g.lineWidth = 12; g.strokeStyle = col; g.strokeText(String(n), 64, 70);
    g.fillStyle = '#ffffff'; g.fillText(String(n), 64, 70);
  });
  keepTex.add(t); numTexCache.set(key, t); return t;
}
const stringTex = canvasTex(64, 64, (g) => {
  g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2;
  for (let i = 4; i < 64; i += 8) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 64); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(64, i); g.stroke(); }
});
keepTex.add(stringTex);
// white towel grip with a spiral wrap
const gripTex = canvasTex(32, 64, (g, w, h) => {
  g.fillStyle = '#f7f4ef'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(120,110,105,.55)'; g.lineWidth = 3;
  for (let y = -32; y < h + 32; y += 10) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + 14); g.stroke(); }
});
keepTex.add(gripTex);
const gripMat = new THREE.MeshToonMaterial({ color: 0xffffff, map: gripTex, gradientMap: toonGrad });
cachedMats.add(gripMat);
function shadeHex(hex, k) {
  const c = new THREE.Color(hex);
  if (k < 0) c.lerp(new THREE.Color(0x1a1530), -k); else c.lerp(new THREE.Color(0xffffff), k);
  return c.getHex();
}
// ---- arm poses. x = swing forward(-)/back(+) from hanging down; z = out(+)/across(-) (mirrored per side)
const POSE = {
  ready:  { s: [-0.77, 0.32], e: [-1.36, 0.34], w: -0.61 },  // racket up in front-side of the head, face to the net
  cockHi: { s: [-2.84, -0.09], e: [-1.06, 0.5], w: -1.64 },  // elbow high, racket dropped behind the back
  hitHi:  { s: [-2.8, 0.18], e: [0.02, -0.16], w: -0.05 },   // full stretch above the head
  follHi: { s: [-1.21, -0.7], e: [-0.11, 0.05], w: 0.06 },   // whips down across the body
  cockLo: { s: [1.52, 0.43], e: [-0.9, 0.29], w: 1.74 },     // racket drawn back, head up
  hitLo:  { s: [-0.87, 0.12], e: [-0.18, 0.16], w: -0.68 },  // underarm contact out in front
  follLo: { s: [-2.18, -0.64], e: [-0.14, 0.23], w: -0.51 }, // finishes up over the other shoulder
  dive:   { s: [-2.9, 0.3], e: [-0.05, 0], w: 0.1 },         // reaching over the head = straight ahead once lying flat
  cheer:  { s: [-3.13, 0.19], e: [0.09, 0.04], w: -0.12 },
  serve:  { s: [-1.89, 1.2], e: [-2.03, 0.5], w: 0.57 },     // racket raised back at shoulder height, shuttle out in front
};
const FREE = {
  rest: { s: [-0.3, 0.3], e: [-0.9, 0], w: 0 },
  hold: { s: [-1.0, 0.1], e: [-0.6, -0.25], w: 0 },          // shuttle held out in front for the serve
  up:   { s: [-2.6, 0.3], e: [-0.2, 0], w: 0 },              // non-racket arm points at the shuttle
  dive: { s: [-2.7, 0.35], e: [-0.1, 0], w: 0 },
};
SPAnim.init({ POSE, FREE, setArm: (...a) => setArm(...a) });
const mixPose = (a, b, t) => ({ s: [lerp(a.s[0], b.s[0], t), lerp(a.s[1], b.s[1], t)], e: [lerp(a.e[0], b.e[0], t), lerp(a.e[1], b.e[1], t)], w: lerp(a.w, b.w, t) });
// mid-height (side-arm drive) swing, fitted like the others
POSE.cockMid = { s: [-3.38, 0.84], e: [-0.4, -0.37], w: -0.51 };   // racket back at shoulder height
POSE.hitMid = { s: [-2.06, 0.57], e: [-0.25, 0.05], w: 0.19 };     // racket out to the side, level with the shoulder
POSE.follMid = { s: [-2.24, -0.53], e: [0.05, -0.27], w: 0.05 };   // carries across in front of the body
// which swing fits a contact height (m): overhead, side-arm or underarm
const swingType = (h) => (h > 1.35 ? 'hi' : h > 0.85 ? 'mid' : 'lo');
// racket swing over k = 0..1: 0..0.12 take-back, 0.12..0.38 swing in, contact at k = 0.38, then follow-through
function swingPose(type, k) {
  if (type === true) type = 'hi'; else if (type === false) type = 'lo';
  const C = type === 'hi' ? POSE.cockHi : type === 'mid' ? POSE.cockMid : POSE.cockLo;
  const H = type === 'hi' ? POSE.hitHi : type === 'mid' ? POSE.hitMid : POSE.hitLo;
  const Fo = type === 'hi' ? POSE.follHi : type === 'mid' ? POSE.follMid : POSE.follLo;
  if (k < 0.12) return type !== 'lo' ? mixPose(POSE.ready, C, k / 0.12) : C;   // low shots/serves start from the drawn-back racket
  if (k < 0.38) return mixPose(C, H, (k - 0.12) / 0.26);
  if (k < 0.8) return mixPose(H, Fo, (k - 0.38) / 0.42);
  return mixPose(Fo, POSE.ready, (k - 0.8) / 0.2);
}
// keep the racket above the floor: if any part of it would dip below, bend the wrist up until it clears
const guardV = new THREE.Vector3();
function floorGuard(mdl) {
  mdl.root.updateMatrixWorld(true);
  const lowY = () => { let mn = 9; for (const y of [-0.4, -0.6, -0.71, -0.86]) mn = Math.min(mn, mdl.wrist.localToWorld(guardV.set(0, y, 0)).y); return mn; };
  let y = lowY();
  for (let i = 0; i < 10 && y < 0.06; i++) {
    const w0 = mdl.wrist.rotation.x; let bd = 0, by = -9;
    for (const d of [0.22, -0.22]) { mdl.wrist.rotation.x = w0 + d; mdl.wrist.updateMatrixWorld(true); const yy = lowY(); if (yy > by) { by = yy; bd = d; } }
    mdl.wrist.rotation.x = w0 + bd; mdl.wrist.updateMatrixWorld(true); y = by;
  }
}
// rate 0 = snap
function setArm(mdl, which, p, rate, dt) {
  const sh = which === 'arm' ? mdl.arm : mdl.free, el = which === 'arm' ? mdl.armEl : mdl.freeEl, wr = which === 'arm' ? mdl.wrist : mdl.freeWr;
  const side = which === 'arm' ? mdl.h : -mdl.h;
  const go = (o, key, v) => { o.rotation[key] = rate ? damp(o.rotation[key], v, rate, dt) : v; };
  go(sh, 'x', p.s[0]); go(sh, 'z', p.s[1] * side); go(el, 'x', p.e[0]); go(el, 'z', p.e[1] * side); go(wr, 'x', p.w);
}

// per-species build: overall size, body / head proportions, leg length (lift), snout and eye style
// torso/sq are sphere scales; lift raises the hips (longer legs, negative = stubby legs); headY nudges the head
const SHAPES = {
  cat:     { size: 1.0,  torso: [0.95, 1.08, 0.86], head: 1.2,  sq: [1.1, 0.92, 0.98],  lift: 0,     snout: 'cat',     eye: 'big',    whiskers: true },
  bunny:   { size: 1.0,  torso: [0.84, 1.14, 0.8],  head: 1.04, sq: [1.04, 1.06, 0.95], lift: 0.08,  snout: 'bunny',   eye: 'big',    foot: 1.25 },
  bear:    { size: 1.12, torso: [1.26, 1.1, 1.1],   head: 1.12, sq: [1.14, 0.95, 1.0],  lift: 0,     snout: 'muzzle',  eye: 'dot',    belly: true },
  panda:   { size: 1.1,  torso: [1.32, 1.04, 1.15], head: 1.2,  sq: [1.14, 0.98, 1.0],  lift: -0.02, snout: 'muzzle',  eye: 'big',    belly: true },
  fox:     { size: 0.98, torso: [0.88, 1.08, 0.82], head: 1.1,  sq: [1.04, 0.92, 1.0],  lift: 0.03,  snout: 'pointed', eye: 'fierce', bigEars: 1.35, darkPaws: 0x4a3428 },
  frog:    { size: 0.95, torso: [1.15, 0.95, 1.0],  head: 1.12, sq: [1.2, 0.82, 1.0],  lift: -0.05, headY: -0.1, snout: 'frog', eye: 'frog' },
  penguin: { size: 0.93, torso: [1.22, 1.24, 1.05], head: 1.0,  sq: [1.0, 0.98, 1.0],   lift: -0.07, headY: -0.05, snout: 'beak', eye: 'big', webbed: true, belly: true },
  duck:    { size: 0.88, torso: [1.1, 1.05, 1.0],   head: 1.08, sq: [1.0, 1.0, 1.0],    lift: -0.06, snout: 'bill',    eye: 'big',    webbed: true },
  hamster: { size: 0.85, torso: [1.22, 0.95, 1.1],  head: 1.24, sq: [1.15, 0.95, 1.05], lift: -0.08, headY: -0.06, snout: 'hamster', eye: 'big', pouches: true },
  dog:     { size: 1.0,  torso: [1.0, 1.08, 0.9],   head: 1.14, sq: [1.06, 0.97, 1.0],  lift: 0.01,  snout: 'muzzle',  eye: 'big',    spot: true },
  sheep:   { size: 1.0,  torso: [1.16, 1.05, 1.0],  head: 1.08, sq: [1.0, 1.0, 1.0],    lift: 0,     snout: 'sheep',   eye: 'big',    wool: true },
  koala:   { size: 0.97, torso: [1.1, 1.0, 1.0],    head: 1.24, sq: [1.18, 0.98, 1.0],  lift: -0.03, snout: 'koala',   eye: 'sleepy' },
  tiger:   { size: 1.06, torso: [1.12, 1.08, 0.95], head: 1.15, sq: [1.12, 0.95, 0.98], lift: 0.01,  snout: 'muzzle',  eye: 'fierce', armStripes: true, whiskers: true },
  otter:   { size: 0.97, torso: [0.86, 1.32, 0.84], head: 1.0,  sq: [1.12, 0.86, 1.0],  lift: 0,     snout: 'otter',   eye: 'dot',    whiskers: true },
  unicorn: { size: 1.03, torso: [0.92, 1.12, 0.86], head: 1.06, sq: [0.95, 1.02, 1.02], lift: 0.05,  snout: 'horse',   eye: 'big' },
  dragon:  { size: 1.08, torso: [1.15, 1.12, 1.0],  head: 1.1,  sq: [1.04, 0.95, 1.06], lift: 0.02,  snout: 'dragon',  eye: 'fierce', belly: true },
};
// ---- roster v2: the house style. Per character: iris colour, lid tilt, mouth shape, kit accent / pattern, head and wrist
// gear, and `marks(k)`: its own markings / species features, built from a few toon primitives.
//   k = { H (head-space mesh), U (upper-body mesh), dab (flat patch on the skull), toon, basic, noOL, mBody, mBelly, mDark, tc, ty, tz, h, col }
const LOOKS = {
  cat:     { iris: 0x86c45c, lid: 0,  mouth: 'philtrum', accent: 0xffd76a, kit: 'sash',    gear: 'bandana', wrist: 'tape', tailRings: true, earW: 1.5, cheek: [0.215, -0.052, 0.272],
    marks: (k) => { const m = k.toon(shadeHex(k.col.body, -0.45));   // tabby: three forehead stripes above the band, two per cheek
      for (const i of [-1, 0, 1]) k.stripe([i * 0.11, 0.31, 0.06], [i * 0.07, 0.215, 0.25], 0.042, m);
      for (const sd of [-1, 1]) for (let q = 0; q < 2; q++) k.stripe([sd * 0.37, 0.07 - q * 0.08, -0.02], [sd * 0.285, 0.05 - q * 0.06, 0.19], 0.04, m); } },
  bunny:   { iris: 0xb02f7c, irisLo: 0xe884bd, lid: 0, mouth: 'bun',      accent: 0xfff0d8, kit: 'sleeves', gear: 'band',     wrist: 'band', splay: true,
    marks: (k) => { k.patch(0, -0.105, 0.28, 0.17, 0.115, k.toon(0xffffff), { bulge: 0.08 }); } },   // white muzzle on sand fur
  bear:    { iris: 0xd9902f, lid: 0,  mouth: 'smile',     accent: 0xf0dcb4, kit: 'plain',   gear: 'band',   wrist: 'double', smallEars: 0.085,
    marks: (k) => {   // moon-bear chest crescent
      const cr = k.U(new THREE.TorusGeometry(0.16, 0.034, 6, 16, Math.PI), k.mBelly, 0, k.tc + 0.27 * k.ty - 0.03, 0.05); cr.rotation.set(Math.PI / 2 + 0.5, 0, Math.PI); cr.scale.z = 0.6; k.noOL(cr); } },
  panda:   { iris: 0x8fc866, lid: 0,  mouth: 'smile',        accent: 0x6fbf5b, kit: 'side',    gear: 'leaf', wrist: 'band', cheek: [0.165, -0.12, 0.274] },
  fox:     { iris: 0xe39a2a, lid: -0.1, mouth: 'smirk',    accent: 0x3b2a24, kit: 'sash',    gear: 'none',   wrist: 'double', earW: 1.3, earDip: 0x3b2a24, mouthR: 0.034, mouthT: 0.006,
    marks: (k) => { k.patch(0, -0.19, 0.24, 0.44, 0.14, k.mBelly, { bulge: 0.03, rings: 5, seg: 32 });   // one white lower-face mask
      const tf = k.U(new THREE.SphereGeometry(0.1, 16, 12), k.mBelly, 0, k.tc + 0.27 * k.ty - 0.14, 0.235 * k.tz); tf.scale.set(1.3, 0.85, 0.4); k.noOL(tf); } },   // white chest ruff
  frog:    { iris: 0xf0b429, lid: 0,  mouth: 'frog',     accent: 0xff9d3c, kit: 'plain',   gear: 'none',    wrist: 'band', pads: 0xff9d3c, eyeX: 0.215, badgeY: -0.085,
    marks: (k) => {
      const bk = k.H(new THREE.SphereGeometry(0.2, 12, 8), k.toon(shadeHex(k.col.body, -0.22)), 0, 0.12, -0.14); bk.scale.set(1.2, 0.7, 0.9); k.noOL(bk);
      for (const sd of [-1, 1]) { const ns = k.H(new THREE.SphereGeometry(0.012, 6, 4), k.mDark, sd * 0.035, 0.065, 0.325); ns.scale.set(1, 0.8, 0.5); k.noOL(ns); } } },
  penguin: { iris: 0x9cc4e4, lid: 0, mouth: 'none',     accent: 0xffd23f, kit: 'side',    gear: 'none',    wrist: 'band',
    marks: (k) => { const m = k.toon(0xffd23f);   // crest: three rounded feather tufts fanning outward from the outer brow
      for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) { const a = 0.3 + i * 0.42, len = 0.1 - i * 0.012, dir = new THREE.Vector3(sd * Math.cos(a), Math.sin(a), -0.3).normalize();
        const f = k.H(new THREE.SphereGeometry(len, 10, 8), m, sd * 0.215 + dir.x * len * 0.75, 0.15 + dir.y * len * 0.75, 0.17 + dir.z * len * 0.75); f.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); f.scale.set(0.34, 1, 0.3); }
      const sm = k.H(new THREE.TorusGeometry(0.034, 0.0065, 4, 10, Math.PI * 0.7), k.mDark, 0, -0.112, 0.318); sm.rotation.z = Math.PI * 1.15; sm.rotation.x = -0.2; k.noOL(sm); } },   // small smile under the beak
  duck:    { iris: 0xf0c24a, lid: 0, mouth: 'none',     accent: 0xffffff, kit: 'sleeves', gear: 'none',    wrist: 'tape', headCol: 0x2a9d7f, bill: 0xd9b23a,
    marks: (k) => { const teal = k.toon(0x2a9d7f);
      k.band(-0.7, 0.13, k.toon(0xffffff));   // white neck ring low on the head, where it shows
      const curl = k.H(new THREE.TorusGeometry(0.05, 0.02, 5, 12, Math.PI * 1.4), teal, 0.02, 0.36, -0.02); curl.rotation.set(0, Math.PI / 2, 0.4);
      const tc2 = k.U(new THREE.TorusGeometry(0.045, 0.018, 5, 12, Math.PI * 1.5), teal, 0, 0.44, -0.27 * k.tz - 0.1); tc2.rotation.y = Math.PI / 2;
      const sm = k.H(new THREE.TorusGeometry(0.04, 0.007, 4, 12, Math.PI * 0.7), k.toon(0x163f33), 0, -0.14, 0.297); sm.rotation.z = Math.PI * 1.15; sm.rotation.x = 0.35; k.noOL(sm); } },   // small smile line under the bill
  hamster: { iris: 0x6a4a3a, lid: 0, mouth: 'smile',      accent: 0xffe6c4, kit: 'plain',   gear: 'band', wrist: 'band', smallEars: 0.078, noHem: true, badgeY: -0.085,
    marks: (k) => { const m = k.toon(shadeHex(k.col.body, -0.2)), parts = [];   // fur tuft
      for (const i of [-1, 0, 1]) { const t = k.H(new THREE.ConeGeometry(0.036, 0.13 - Math.abs(i) * 0.025, 6), m, i * 0.04, 0.345, 0.04); t.rotation.set(0.3, 0, -i * 0.5); parts.push(t); } k.fuse(parts, m); } },
  dog:     { iris: 0xb9772e, lid: 0,  mouth: 'open',    accent: 0x9a6638, kit: 'side',    gear: 'bandana',    wrist: 'tape',
    marks: (k) => { k.patch(0.17 * k.h, 0.275, 0.02, 0.12, 0.085, k.toon(k.col.earCol), { rot: 0.5 * k.h }); } },   // caramel crown patch (the eye patch is on the other side)
  sheep:   { iris: 0xe0a63a, lid: 0,  mouth: 'smile',     accent: 0xcfa77a, kit: 'sleeves', gear: 'none',     wrist: 'band', eyeX2: 0.11, cheek: [0.14, -0.1, 0.3],
    marks: (k) => { const horn = k.toon(0xcdbb9c);
      for (const sd of [-1, 1]) {   // smooth curled ram horns: tapered spiral tube, closed at both ends, root buried in the wool
        const args = [0.115, 0.055, 0.05, 0.006, Math.PI / 2 - 0.35, -Math.PI - 0.5, 0.075];
        const hn = k.H(hornGeo(...args, 0), horn, sd * 0.4, 0.09, 0.0); hn.rotation.y = Math.PI / 2; hn.scale.z = sd; k.noOL(hn);
        const ol = new THREE.Mesh(hornGeo(...args, 0.011), OUTLINE); ol.userData.noOutline = true; ol.userData.isOutline = true; ol.userData.ownGeo = true; hn.add(ol); } } },
  koala:   { iris: 0x45c4c9, lid: 0,  mouth: 'smile',     accent: 0x7fbf6a, kit: 'side',    gear: 'none',    wrist: 'band', badgeY: -0.085,
    marks: (k) => { const lf = k.toon(0x9fc4ad); k.patch(0, -0.2, 0.26, 0.2, 0.1, k.toon(0xffffff), { bulge: 0.05, seg: 28 });   // soft white chin patch
      // eucalyptus sprig tucked by the ear: a thin twig with round grey-green coin leaves
      const tw = k.H(new THREE.CapsuleGeometry(0.008, 0.2, 2, 6), k.toon(0x8a6a52), -0.2, 0.325, 0.13); tw.rotation.z = 1.05; k.noOL(tw);
      for (const [x, y, r] of [[-0.3, 0.4, 0.034], [-0.245, 0.315, 0.04], [-0.19, 0.365, 0.04]]) { const l = k.H(new THREE.SphereGeometry(r, 12, 8), lf, x, y, 0.14); l.scale.z = 0.28; } } },
  tiger:   { iris: 0x6fd0d8, lid: -0.12, mouth: 'open',    accent: 0x2b2220, kit: 'sash',    gear: 'band', wrist: 'double',
    marks: (k) => { const parts = [], wm = k.toon(0xffffff);   // two small symmetric fangs at the top of the open mouth
      for (const sd of [-1, 1]) { const f = k.H(new THREE.ConeGeometry(0.011, 0.03, 5), wm, sd * 0.032, -0.113, 0.4); f.rotation.x = Math.PI; parts.push(f); } k.fuse(parts, wm);
} },
  otter:   { iris: 0xe6b450, lid: 0, mouth: 'smile',    accent: 0xffd9c2, kit: 'plain',   gear: 'goggles', wrist: 'band', noHem: true,
    marks: (k) => { const face = k.H(new THREE.SphereGeometry(0.25, 22, 14), k.mBelly, 0, -0.08, 0.12); face.scale.set(1.22, 0.78, 0.86); } },
  unicorn: { iris: 0xa06bd6, lid: 0, mouth: 'smile',    accent: 0xc5a3ff, kit: 'sleeves', gear: 'none',     wrist: 'band', muzzle: 0xf3cfe6,
    marks: (k) => {   // forelock: three separate pastel locks falling to one side, behind the horn
      for (const [x, y, z, r, rz, col] of [[-0.1, 0.325, 0.1, 0.075, 0.35, 0xff9fd6], [-0.19, 0.275, 0.14, 0.07, 0.8, 0x9fd8ff], [-0.26, 0.19, 0.14, 0.06, 1.2, 0xc5a3ff]]) { const l = k.H(new THREE.SphereGeometry(r, 12, 8), k.toon(col), x, y, z); l.scale.set(1.4, 0.66, 0.8); l.rotation.z = rz; }
      for (const sd of [-1, 1]) for (const [x, y, z, col] of [[0.3, 0.06, -0.17, 0x9fd8ff], [0.305, -0.06, -0.19, 0xffe18a], [0.27, -0.17, -0.2, 0xff9fd6]]) { const l = k.H(new THREE.SphereGeometry(0.07, 10, 8), k.toon(col), sd * x, y, z); l.scale.set(0.7, 1.2, 0.8); l.rotation.z = sd * 0.25; } } },   // mane tufts down the back of the head
  dragon:  { iris: 0xffc93c, lid: 0, mouth: 'none',     accent: 0xff8a6b, kit: 'hoop',    gear: 'none',    wrist: 'double', fin: 0xffc93c, horn: 0xe0c592,
    marks: (k) => { { const sm = k.H(new THREE.TorusGeometry(0.04, 0.008, 4, 12, Math.PI * 0.8), k.mDark, 0, -0.15, 0.44); sm.rotation.z = Math.PI * 1.1; sm.rotation.x = -0.25; k.noOL(sm); } const n = k.H(new THREE.ConeGeometry(0.03, 0.08, 10), k.toon(0xe0c592), 0, 0.02, 0.4); n.rotation.x = 0.9; k.noOL(n);
      for (let i = 0; i < 3; i++) { const f = k.cut(k.H(new THREE.ConeGeometry(0.04, 0.1, 3), k.toon(0xffc93c), 0, 0.36 - i * 0.05, 0.04 - i * 0.12)); f.rotation.x = -0.3 - i * 0.5; f.scale.x = 0.3; } } },
};
// tapered tube along a flat spiral (xy plane, drifting along z): smooth normals, closed tip; `grow` fattens it for the outline shell
function hornGeo(R0, R1, r0, r1, a0, a1, rise, grow) {
  const n = 22, m = 8, pos = [], nor = [], idx = [];
  const C = (t) => { const a = a0 + (a1 - a0) * t, R = R0 + (R1 - R0) * t; return new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R, rise * t); };
  let T = null; const T0 = C(0.01).sub(C(0)).normalize();
  for (let i = 0; i <= n; i++) {
    const t = i / n, c = C(t), a = a0 + (a1 - a0) * t; T = C(Math.min(1, t + 0.01)).sub(C(Math.max(0, t - 0.01))).normalize();
    const B = T.clone().cross(new THREE.Vector3(Math.cos(a), Math.sin(a), 0)).normalize(), N = B.clone().cross(T), r = r0 + (r1 - r0) * t + grow;
    for (let j = 0; j < m; j++) { const p = j / m * Math.PI * 2, d = N.clone().multiplyScalar(Math.cos(p)).addScaledVector(B, Math.sin(p)); pos.push(c.x + d.x * r, c.y + d.y * r, c.z + d.z * r); nor.push(d.x, d.y, d.z); }
  }
  const tip = C(1).addScaledVector(T, r1 + grow); pos.push(tip.x, tip.y, tip.z); nor.push(T.x, T.y, T.z);
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { const a = i * m + j, b = (i + 1) * m + j, c = i * m + (j + 1) % m, d = (i + 1) * m + (j + 1) % m; idx.push(a, c, b, c, d, b); }
  for (let j = 0; j < m; j++) idx.push(n * m + j, n * m + (j + 1) % m, (n + 1) * m);
  const root = C(0).addScaledVector(T0, -(r0 + grow) * 0.5); pos.push(root.x, root.y, root.z); nor.push(-T0.x, -T0.y, -T0.z);
  for (let j = 0; j < m; j++) idx.push((j + 1) % m, j, (n + 1) * m + 1);
  const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); ge.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); ge.setIndex(idx); return ge;
}
// head gear (detachable group in head space). Bands are fitted to the skull: a cone frustum cut from the unit sphere,
// tilted back, inside a group squashed like the skull - so they follow the head, sit on the forehead and are never wider than it.
function buildHeadGear(kind, teamColor, accent, P, fy, at) {
  const gr = new THREE.Group(); gr.name = 'headGear'; if (kind === 'none') return gr;
  const mk = (geo, mat, x, y, z, par, ol) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (!ol) m.userData.noOutline = true; (par || gr).add(m); return m; };
  const team = toon(teamColor, { side: THREE.DoubleSide }), acc = toon(accent, { side: THREE.DoubleSide });
  const AX = [0.34 * P.sq[0], 0.34 * P.sq[1], 0.34 * P.sq[2]];
  const fit = new THREE.Group(); fit.scale.set(AX[0], AX[1], AX[2]);
  const ring = (d, w, mat, off = 1.035, tilt = 0.14) => {
    if (!fit.parent) gr.add(fit);
    const rr = (y) => Math.sqrt(Math.max(0.01, 1 - y * y)) * off;
    const b = mk(new THREE.CylinderGeometry(rr(d + w / 2), rr(d - w / 2), w, 36, 1, true), mat, 0, d * Math.cos(tilt), -d * Math.sin(tilt), fit); b.rotation.x = -tilt; return b;
  };
  if (kind === 'bow') {   // two rounded lobes, a knot and two short tails, pinned beside the ear
    const bg = new THREE.Group(); gr.add(bg); bg.rotation.set(-0.3, 0.35, -0.45);
    if (at) bg.position.set(at[0] * P.sq[0] / 1.08, at[1] * fy, at[2] * P.sq[2] / 0.98); else bg.position.set(AX[0] * 0.45 * 1.08, AX[1] * 0.8 * 1.08, AX[2] * 0.4 * 1.08);
    const teamS = toon(teamColor), dk = toon(shadeHex(teamColor, -0.3));
    for (const sd of [-1, 1]) {
      const lobe = mk(new THREE.SphereGeometry(0.064, 12, 8), teamS, sd * 0.06, 0.005, 0, bg, true); lobe.scale.set(1.0, 0.78, 0.5); lobe.rotation.z = sd * 0.3;
      const tl = mk(new THREE.ConeGeometry(0.03, 0.085, 5), teamS, sd * 0.03, -0.05, -0.005, bg, true); tl.rotation.z = Math.PI + sd * 0.45; tl.scale.z = 0.5;
    }
    const kn = mk(new THREE.SphereGeometry(0.03, 10, 8), dk, 0, 0, 0.018, bg); kn.scale.set(0.85, 1.1, 0.8); return gr;
  }
  if (kind === 'leaf') { for (const [x, r] of [[0.3, -0.6], [0.34, -1.2]]) { const l = mk(new THREE.SphereGeometry(0.07, 8, 6), toon(0x6fbf5b), x * P.sq[0], 0.2 * fy, 0.12); l.scale.set(0.4, 1.4, 0.18); l.rotation.z = r; } return gr; }
  if (kind === 'goggles') {   // swim goggles pushed right up to the crown: flat dark oval lenses (no glint - they must not read as a
    // second pair of eyes), a bridge between them and a strap running down to the nape
    const strap = toon(0x2f3340, { side: THREE.DoubleSide }), rimM = toon(teamColor), lens = basic(0x1f2733);
    ring(0.34, 0.07, strap, 1.03, 0.62);
    const place = (x, y, z, lift) => { const d = new THREE.Vector3(x, y, z).normalize(), n = new THREE.Vector3(d.x / AX[0], d.y / AX[1], d.z / AX[2]).normalize();
      const gg = new THREE.Group(); gg.position.set(d.x * AX[0] * lift, d.y * AX[1] * lift, d.z * AX[2] * lift); gg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n); gr.add(gg); return gg; };
    for (const sd of [-1, 1]) {
      const gg = place(sd * 0.27, 0.82, 0.57, 1.07); gg.rotateZ(-sd * 0.2); gg.scale.set(1.3, 0.82, 1);
      mk(new THREE.TorusGeometry(0.056, 0.016, 6, 20), rimM, 0, 0, 0, gg);
      mk(new THREE.CircleGeometry(0.054, 20), lens, 0, 0, 0.004, gg);
    }
    const br = place(0, 0.83, 0.57, 1.09); mk(new THREE.CapsuleGeometry(0.013, 0.05, 2, 6), rimM, 0, 0, 0, br).rotation.z = Math.PI / 2;
    return gr;
  }
  if (kind === 'visor') {   // baseball cap: dome over the top of the head, button, band and a brim tipped down over the brow
    if (!fit.parent) gr.add(fit);
    const cap = new THREE.Group(); cap.rotation.x = -0.2; fit.add(cap);
    const dk = toon(shadeHex(teamColor, -0.28), { side: THREE.DoubleSide });
    mk(new THREE.SphereGeometry(1.06, 28, 10, 0, Math.PI * 2, 0, Math.acos(0.26)), team, 0, 0, 0, cap, true);
    mk(new THREE.CylinderGeometry(1.035, 1.05, 0.09, 32, 1, true), dk, 0, 0.3, 0, cap);
    mk(new THREE.SphereGeometry(0.1, 10, 8), acc, 0, 1.07, 0, cap);
    const front = mk(new THREE.SphereGeometry(1.075, 14, 8, -0.5, 1.0, 0.5, 0.72), acc, 0, 0, 0, cap); front.rotation.y = 0;
    const brim = mk(new THREE.CylinderGeometry(0.9, 0.9, 0.11, 28, 1, false, -1.05, 2.1), dk, 0, 0.375, 0.44, cap, true); brim.rotation.x = 0.2; brim.scale.z = 1.1;   // leaves the dome at its front edge (no strip of forehead between cap and brim)
    return gr;
  }
  if (kind === 'ninja') {   // hood over the top and back of the head, headband with a metal plate, two tails
    if (!fit.parent) gr.add(fit);
    const hood = new THREE.Group(); hood.rotation.x = -0.25; fit.add(hood);
    mk(new THREE.SphereGeometry(1.06, 28, 12, 0, Math.PI * 2, 0, Math.acos(0.12)), team, 0, 0, 0, hood, true);
    ring(0.47, 0.11, acc, 1.075, 0.2); mk(new THREE.BoxGeometry(0.42, 0.16, 0.06), toon(0xc9d2e0), 0, 0.5, 0.98, fit).rotation.x = -0.45;
    mk(new THREE.SphereGeometry(0.13, 8, 6), acc, 0.25, 0.3, -1.0, fit);
    for (const a of [0.4, 1.0]) { const t = mk(new THREE.ConeGeometry(0.1, 0.62, 4), acc, 0.42, 0.1, -1.04, fit); t.rotation.set(-0.5, 0, -a - 1.2); t.scale.z = 0.4; }
    return gr;
  }
  if (kind === 'straw' || kind === 'tricorn') {   // hats with a brim: straw hat (round brim, ribbon) / captain's hat (three-cornered brim, feather)
    if (!fit.parent) gr.add(fit);
    const hat = new THREE.Group(); hat.position.set(0, 0.6, -0.02); hat.rotation.x = -0.14; fit.add(hat);
    const dk = toon(shadeHex(teamColor, -0.2), { side: THREE.DoubleSide });
    if (kind === 'straw') {
      mk(new THREE.SphereGeometry(0.82, 22, 8, 0, Math.PI * 2, 0, Math.PI / 2), team, 0, 0, 0, hat, true).scale.y = 0.72;
      mk(new THREE.CylinderGeometry(1.5, 1.56, 0.06, 32), team, 0, 0.02, 0, hat, true);
      mk(new THREE.CylinderGeometry(0.84, 0.85, 0.17, 28, 1, true), acc, 0, 0.12, 0, hat);
      mk(new THREE.TorusGeometry(1.53, 0.035, 5, 32), dk, 0, 0.02, 0, hat).rotation.x = Math.PI / 2;
    } else {
      mk(new THREE.SphereGeometry(0.9, 22, 8, 0, Math.PI * 2, 0, Math.PI / 2), team, 0, 0, 0, hat, true).scale.y = 1.0;
      const br = mk(new THREE.CylinderGeometry(1.55, 1.3, 0.3, 3), team, 0, 0.1, 0, hat, true); br.rotation.y = Math.PI;
      const tr = mk(new THREE.TorusGeometry(1.55, 0.06, 5, 3), acc, 0, 0.26, 0, hat); tr.rotation.set(Math.PI / 2, 0, Math.PI / 2);
      mk(new THREE.SphereGeometry(0.16, 10, 8), acc, 0, 0.45, 0.8, hat);
      const fe = mk(new THREE.SphereGeometry(0.2, 10, 8), toon(0xe0303a), 0.62, 0.55, -0.1, hat, true); fe.scale.set(0.4, 2.0, 0.7); fe.rotation.set(-0.5, 0, -0.35);
    }
    return gr;
  }
  if (kind === 'wizard' || kind === 'cowboy' || kind === 'chef') {   // tall hats standing on the crown of the head
    if (!fit.parent) gr.add(fit);
    const hat = new THREE.Group(); hat.position.set(0, 0.6, -0.02); hat.rotation.x = -0.14; fit.add(hat);
    const dk = toon(shadeHex(teamColor, -0.25), { side: THREE.DoubleSide });
    if (kind === 'wizard') {      // wide brim, tall cone with a bent tip, gold band and a star
      mk(new THREE.CylinderGeometry(1.42, 1.48, 0.07, 32), team, 0, 0.02, 0, hat, true);
      mk(new THREE.CylinderGeometry(0.42, 0.86, 0.9, 20), team, 0, 0.47, 0, hat, true);
      const tip = mk(new THREE.ConeGeometry(0.42, 0.95, 16), team, 0.0, 1.28, -0.14, hat, true); tip.rotation.x = -0.42;
      mk(new THREE.CylinderGeometry(0.8, 0.87, 0.16, 24, 1, true), acc, 0, 0.14, 0, hat);
      mk(new THREE.CircleGeometry(0.17, 5), basic(0xfff3c4), 0, 0.5, 0.69, hat).rotation.set(-0.45, 0, Math.PI / 10);
    } else if (kind === 'cowboy') {   // creased crown, brim rolled up at both sides
      const cr = mk(new THREE.SphereGeometry(0.82, 22, 8, 0, Math.PI * 2, 0, Math.PI / 2), team, 0, 0, 0, hat, true); cr.scale.set(0.95, 1.0, 1.1);
      mk(new THREE.SphereGeometry(0.3, 10, 6), dk, 0, 0.8, 0, hat).scale.set(0.5, 0.35, 2.2);
      mk(new THREE.CylinderGeometry(1.5, 1.55, 0.07, 32), team, 0, 0.03, 0, hat, true).scale.x = 0.92;
      for (const sd of [-1, 1]) { const rl = mk(new THREE.SphereGeometry(0.3, 10, 8), team, sd * 1.3, 0.2, 0, hat, true); rl.scale.set(0.55, 0.75, 3.6); rl.rotation.z = sd * 0.5; }
      mk(new THREE.CylinderGeometry(0.8, 0.84, 0.15, 24, 1, true), acc, 0, 0.13, 0, hat).scale.z = 1.1;
      mk(new THREE.BoxGeometry(0.2, 0.15, 0.05), toon(0xf2c230), 0, 0.13, 0.93, hat);
    } else {                      // chef: white band and a puffy top
      mk(new THREE.CylinderGeometry(0.78, 0.8, 0.62, 24), team, 0, 0.26, 0, hat, true);
      mk(new THREE.SphereGeometry(0.98, 18, 12), team, 0, 0.92, 0, hat, true).scale.set(1, 0.62, 1);
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; mk(new THREE.SphereGeometry(0.42, 10, 8), team, Math.sin(a) * 0.68, 0.98, Math.cos(a) * 0.68, hat, true); }
      mk(new THREE.CylinderGeometry(0.81, 0.81, 0.05, 24, 1, true), acc, 0, 0.02, 0, hat);
    }
    return gr;
  }
  if (kind === 'beanie') {   // knitted cap pulled down over the head, thick rim and a pompom
    if (!fit.parent) gr.add(fit);
    const bn = new THREE.Group(); bn.rotation.x = -0.2; fit.add(bn);
    mk(new THREE.SphereGeometry(1.07, 28, 10, 0, Math.PI * 2, 0, Math.acos(0.34)), team, 0, 0, 0, bn, true);
    mk(new THREE.TorusGeometry(1.03, 0.13, 8, 30), acc, 0, 0.34, 0, bn, true).rotation.x = Math.PI / 2;
    mk(new THREE.SphereGeometry(0.24, 12, 10), acc, 0, 1.2, 0, bn, true);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; mk(new THREE.SphereGeometry(0.07, 6, 5), acc, Math.sin(a) * 0.86, 0.66, Math.cos(a) * 0.86, bn); }
    return gr;
  }
  if (kind === 'diver') {   // dive mask pushed up on the brow, snorkel at the side
    ring(0.46, 0.1, toon(0x23232b, { side: THREE.DoubleSide }), 1.04, 0.2);
    const mg = new THREE.Group(); mg.position.set(0, 0.56, 0.9); mg.rotation.x = -0.5; fit.add(mg);
    mk(new THREE.SphereGeometry(0.42, 16, 10), toon(0x23232b), 0, 0, 0, mg, true).scale.set(1.5, 0.75, 0.55);
    mk(new THREE.SphereGeometry(0.36, 16, 10), basic(0x8fe9ff), 0, 0, 0.09, mg).scale.set(1.45, 0.68, 0.4);
    mk(new THREE.PlaneGeometry(0.3, 0.06), basic(0xffffff), -0.22, 0.1, 0.25, mg).rotation.z = 0.5;
    mk(new THREE.CylinderGeometry(0.075, 0.075, 1.1, 10), acc, 1.06, 0.6, 0.05, fit, true);
    const tp = mk(new THREE.TorusGeometry(0.16, 0.075, 8, 12, Math.PI), acc, 0.9, 1.15, 0.05, fit, true); mk(new THREE.CylinderGeometry(0.1, 0.1, 0.14, 10), toon(0xffffff), 1.06, 0.25, 0.05, fit);
    return gr;
  }
  if (kind === 'mohawk') {   // row of spikes from the brow to the nape
    if (!fit.parent) gr.add(fit);
    for (let i = 0; i < 7; i++) { const a = -0.75 + i * 0.36, sp = mk(new THREE.ConeGeometry(0.27, 0.86 - Math.abs(i - 2.5) * 0.06, 5), i % 2 ? acc : team, 0, Math.cos(a) * 1.18, -Math.sin(a) * 1.18 + 0.0, fit, true); sp.rotation.x = -a; sp.scale.x = 0.55; }
    return gr;
  }
  if (kind === 'deer') {   // deerstalker: cap with a peak in front and behind, ear flaps tied on top
    if (!fit.parent) gr.add(fit);
    const dc = new THREE.Group(); dc.rotation.x = -0.18; fit.add(dc); const dk = toon(shadeHex(teamColor, -0.25), { side: THREE.DoubleSide });
    mk(new THREE.SphereGeometry(1.06, 28, 10, 0, Math.PI * 2, 0, Math.acos(0.3)), team, 0, 0, 0, dc, true);
    for (const sd of [1, -1]) { const br = mk(new THREE.CylinderGeometry(0.95, 0.95, 0.12, 24, 1, false, -0.95, 1.9), dk, 0, 0.36, sd * 0.45, dc, true); br.rotation.set(sd * 0.3, sd > 0 ? 0 : Math.PI, 0); }
    for (const sd of [-1, 1]) { const fl = mk(new THREE.SphereGeometry(0.4, 12, 8), dk, sd * 0.5, 0.92, 0, dc, true); fl.scale.set(1.3, 0.3, 0.75); fl.rotation.z = -sd * 0.55; }
    for (const sd of [-1, 1]) { const bw = mk(new THREE.ConeGeometry(0.16, 0.3, 4), acc, sd * 0.17, 1.2, 0, dc, true); bw.rotation.z = sd * Math.PI / 2; bw.scale.z = 0.45; } mk(new THREE.SphereGeometry(0.09, 8, 6), toon(0xf2c230), 0, 1.2, 0.03, dc);
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; mk(new THREE.SphereGeometry(0.09, 6, 5), dk, Math.sin(a) * 0.95, 0.48, Math.cos(a) * 0.95, dc).scale.set(1, 1, 0.4); }
    return gr;
  }
  if (kind === 'robot') {   // metal skull cap, visor band with lights, ear bolts, antenna
    if (!fit.parent) gr.add(fit);
    const rc = new THREE.Group(); rc.rotation.x = -0.2; fit.add(rc);
    mk(new THREE.SphereGeometry(1.06, 28, 10, 0, Math.PI * 2, 0, Math.acos(0.3)), team, 0, 0, 0, rc, true);
    mk(new THREE.CylinderGeometry(1.06, 1.08, 0.2, 32, 1, true), toon(0x3a4254, { side: THREE.DoubleSide }), 0, 0.36, 0, rc);
    [0xff5e5e, 0x7dff9a, 0x5ad1ff].forEach((cc, i) => mk(new THREE.SphereGeometry(0.06, 8, 6), basic(cc), (i - 1) * 0.26, 0.36, 1.04 - Math.abs(i - 1) * 0.035, rc));
    for (const sd of [-1, 1]) { const bl = mk(new THREE.CylinderGeometry(0.2, 0.2, 0.16, 12), acc, sd * 1.06, 0.1, 0, fit, true); bl.rotation.z = Math.PI / 2; }
    mk(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), toon(0x3a4254), 0, 1.3, 0, rc); mk(new THREE.SphereGeometry(0.11, 10, 8), basic(0xff5e5e), 0, 1.6, 0, rc);
    return gr;
  }
  if (kind === 'halo') {   // gold ring floating above the head
    if (!fit.parent) gr.add(fit);
    const hl = mk(new THREE.TorusGeometry(0.62, 0.085, 8, 30), basic(0xffe18a), 0, 1.5, -0.05, fit); hl.rotation.x = Math.PI / 2 - 0.16;
    const g2 = mk(new THREE.TorusGeometry(0.62, 0.16, 8, 30), basic(0xfff3c4, { transparent: true, opacity: 0.35, depthWrite: false }), 0, 1.5, -0.05, fit); g2.rotation.x = Math.PI / 2 - 0.16;
    return gr;
  }
  if (kind === 'kabuto') {   // samurai helmet: bowl, gold crescent on the brow, flared neck guard
    if (!fit.parent) gr.add(fit);
    const kb = new THREE.Group(); kb.rotation.x = -0.2; fit.add(kb); const dk = toon(shadeHex(teamColor, -0.3), { side: THREE.DoubleSide });
    mk(new THREE.SphereGeometry(1.07, 28, 10, 0, Math.PI * 2, 0, Math.acos(0.26)), team, 0, 0, 0, kb, true);
    mk(new THREE.CylinderGeometry(1.08, 1.5, 0.5, 28, 1, true, Math.PI * 0.55, Math.PI * 1.9 - Math.PI), dk, 0, 0.08, 0, kb, true);
    mk(new THREE.CylinderGeometry(1.5, 1.52, 0.05, 28, 1, true, Math.PI * 0.55, Math.PI * 0.9), acc, 0, -0.16, 0, kb);
    const cr = mk(new THREE.TorusGeometry(0.62, 0.075, 6, 24, Math.PI * 0.9), acc, 0, 1.02, 0.86, kb, true); cr.rotation.set(-0.25, 0, Math.PI * 1.05); cr.scale.set(1, 1.25, 1);
    mk(new THREE.SphereGeometry(0.13, 10, 8), acc, 0, 0.62, 0.98, kb); mk(new THREE.CylinderGeometry(1.075, 1.085, 0.1, 32, 1, true), acc, 0, 0.3, 0, kb);
    return gr;
  }
  if (kind === 'horns') {   // two curved horns and a dark circlet
    ring(0.5, 0.07, toon(0x23232b, { side: THREE.DoubleSide }), 1.04, 0.16);
    for (const sd of [-1, 1]) { const hg = new THREE.Group(); hg.position.set(sd * 0.52, 0.78, 0.12); hg.rotation.z = -sd * 0.55; hg.scale.setScalar(1.45); fit.add(hg);
      mk(new THREE.CylinderGeometry(0.13, 0.2, 0.36, 10), team, 0, 0.16, 0, hg, true); const tp = mk(new THREE.ConeGeometry(0.135, 0.5, 10), acc, sd * 0.07, 0.52, 0, hg, true); tp.rotation.z = sd * 0.55; }
    return gr;
  }
  if (kind === 'antenna') {   // black band, two feelers with yellow tips
    ring(0.5, 0.09, team, 1.04, 0.16);
    for (const sd of [-1, 1]) { const st = mk(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6), team, sd * 0.36, 1.2, 0.2, fit); st.rotation.set(0.25, 0, -sd * 0.3); mk(new THREE.SphereGeometry(0.13, 10, 8), acc, sd * 0.46, 1.5, 0.28, fit, true); }
    return gr;
  }
  if (kind === 'dino') {   // dinosaur hood: teeth along the front edge, eyes on top, spikes down the middle
    if (!fit.parent) gr.add(fit);
    const dh = new THREE.Group(); dh.rotation.x = -0.26; fit.add(dh);
    mk(new THREE.SphereGeometry(1.08, 28, 12, 0, Math.PI * 2, 0, Math.acos(0.14)), team, 0, 0, 0, dh, true);
    for (let i = -3; i <= 3; i++) { const a = i * 0.2, t = mk(new THREE.ConeGeometry(0.075, 0.2, 4), toon(0xffffff), Math.sin(a) * 1.07, 0.06, Math.cos(a) * 1.07, dh); t.rotation.x = Math.PI; }
    for (const sd of [-1, 1]) { mk(new THREE.SphereGeometry(0.2, 12, 10), toon(0xffffff), sd * 0.42, 0.78, 0.66, dh, true); mk(new THREE.SphereGeometry(0.1, 8, 6), toon(0x1c1416), sd * 0.44, 0.8, 0.82, dh); }
    for (let i = 0; i < 4; i++) { const a = 0.15 + i * 0.42, sp = mk(new THREE.ConeGeometry(0.17, 0.36, 4), acc, 0, Math.cos(a) * 1.16, -Math.sin(a) * 1.16, dh, true); sp.rotation.x = -a; sp.scale.x = 0.5; }
    return gr;
  }
  if (kind === 'police') {   // peaked cap: wide flat top, band, short shiny peak, gold badge
    if (!fit.parent) gr.add(fit);
    const pc = new THREE.Group(); pc.rotation.x = -0.18; fit.add(pc); const blk = toon(0x16181f, { side: THREE.DoubleSide });
    mk(new THREE.SphereGeometry(1.06, 28, 8, 0, Math.PI * 2, 0, Math.acos(0.42)), team, 0, 0, 0, pc, true);
    mk(new THREE.CylinderGeometry(1.2, 0.98, 0.3, 28), team, 0, 0.74, 0, pc, true); mk(new THREE.CylinderGeometry(1.0, 1.04, 0.15, 28, 1, true), blk, 0, 0.5, 0, pc);
    const pk = mk(new THREE.CylinderGeometry(0.86, 0.86, 0.08, 24, 1, false, -0.85, 1.7), blk, 0, 0.42, 0.42, pc, true); pk.rotation.x = 0.26;
    mk(new THREE.CircleGeometry(0.17, 6), basic(0xf2c230), 0, 0.72, 1.12, pc).rotation.x = -0.2;
    return gr;
  }
  if (kind === 'flowers') {   // crown of flowers and leaves
    if (!fit.parent) gr.add(fit);
    const cols = [0xff9fd6, 0xffffff, 0xffe18a, 0xc59bff, 0xff7a9a];
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, y = 0.56 + Math.cos(a) * 0.1, r = Math.sqrt(1 - y * y) * 1.06;
      if (i % 2) { const lf = mk(new THREE.SphereGeometry(0.13, 8, 6), toon(0x6fbf5b), Math.sin(a) * r, y, Math.cos(a) * r, fit); lf.scale.set(1.4, 0.5, 0.7); lf.rotation.y = a; }
      else { mk(new THREE.SphereGeometry(0.17, 10, 8), toon(cols[(i / 2) % cols.length]), Math.sin(a) * r, y, Math.cos(a) * r, fit, true); mk(new THREE.SphereGeometry(0.07, 8, 6), toon(0xffd23f), Math.sin(a) * (r + 0.13), y, Math.cos(a) * (r + 0.13), fit); } }
    return gr;
  }
  if (kind === 'pumpkin') {   // pumpkin worn as a hat: ribs, stalk and a carved face
    if (!fit.parent) gr.add(fit);
    const pp = new THREE.Group(); pp.rotation.x = -0.22; fit.add(pp);
    mk(new THREE.SphereGeometry(1.1, 28, 12, 0, Math.PI * 2, 0, Math.acos(0.2)), team, 0, 0, 0, pp, true);
    for (let i = 0; i < 6; i++) { const rb = mk(new THREE.TorusGeometry(1.105, 0.02, 4, 20, Math.PI * 0.44), toon(shadeHex(teamColor, -0.25)), 0, 0, 0, pp); rb.rotation.set(0, i / 6 * Math.PI, Math.PI * 0.06); }
    mk(new THREE.CylinderGeometry(0.07, 0.12, 0.3, 8), acc, 0, 1.2, 0, pp, true).rotation.z = 0.25;
    for (const sd of [-1, 1]) mk(new THREE.CircleGeometry(0.15, 3), basic(0x2a1408), sd * 0.34, 0.62, 0.86, pp).rotation.set(-0.6, sd * 0.38, Math.PI / 2);
    for (let i = -2; i <= 2; i++) mk(new THREE.CircleGeometry(0.085, 3), basic(0x2a1408), i * 0.15, 0.36 + (i % 2 ? 0.035 : 0), 1.04 - Math.abs(i) * 0.02, pp).rotation.set(-0.3, i * 0.15, i % 2 ? Math.PI / 2 : -Math.PI / 2);
    return gr;
  }
  if (kind === 'astro') {   // glass bubble with a collar ring and an antenna
    if (!fit.parent) gr.add(fit);
    const gl = mk(new THREE.SphereGeometry(1.5, 28, 18), basic(0xbfe6ff, { transparent: true, opacity: 0.32, depthWrite: false }), 0, 0.12, 0.04, fit); gl.renderOrder = 4;
    const sh = mk(new THREE.SphereGeometry(1.51, 12, 6, 0.9, 0.5, 0.75, 0.55), basic(0xffffff, { transparent: true, opacity: 0.7, depthWrite: false }), 0, 0.12, 0.04, fit); sh.renderOrder = 5;
    const s2 = mk(new THREE.SphereGeometry(1.51, 8, 4, 2.0, 0.22, 1.0, 0.3), basic(0xffffff, { transparent: true, opacity: 0.7, depthWrite: false }), 0, 0.12, 0.04, fit); s2.renderOrder = 5;
    mk(new THREE.TorusGeometry(0.92, 0.17, 8, 28), team, 0, -0.98, 0, fit, true).rotation.x = Math.PI / 2;
    mk(new THREE.TorusGeometry(0.92, 0.06, 6, 28), acc, 0, -0.84, 0, fit).rotation.x = Math.PI / 2;
    mk(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 6), toon(0x8a93a6), 0.75, 1.55, 0, fit); mk(new THREE.SphereGeometry(0.09, 10, 8), toon(0xff5e5e), 0.75, 1.84, 0, fit);
    return gr;
  }
  if (kind === 'hero') {   // helmet with a crest from the brow to the nape and a band over the brow
    if (!fit.parent) gr.add(fit);
    const hm = new THREE.Group(); hm.rotation.x = -0.22; fit.add(hm);
    mk(new THREE.SphereGeometry(1.06, 28, 12, 0, Math.PI * 2, 0, Math.acos(0.2)), team, 0, 0, 0, hm, true);
    mk(new THREE.CylinderGeometry(1.04, 1.07, 0.12, 32, 1, true), acc, 0, 0.24, 0, hm);
    const cr = mk(new THREE.TorusGeometry(1.1, 0.1, 6, 20, Math.PI * 0.82), acc, 0, 0, 0, hm, true); cr.rotation.set(0, -Math.PI / 2, 0.3); cr.scale.z = 0.5;
    mk(new THREE.CircleGeometry(0.2, 5), basic(0xffffff), 0, 0.62, 0.9, hm).rotation.set(-0.6, 0, Math.PI / 10);
    return gr;
  }
  if (kind === 'crown' || kind === 'royal') {   // crown worn on top: band, points, gems ('royal': larger, with a velvet cap inside)
    const top = new THREE.Group(); top.position.set(0, 0.84, 0.05); top.rotation.x = -0.1; top.scale.setScalar(kind === 'royal' ? 1.55 : 1.3); fit.add(top); if (kind === 'royal') { mk(new THREE.SphereGeometry(0.37, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xc22a3a), 0, 0.14, 0, top).scale.y = 0.9; mk(new THREE.SphereGeometry(0.07, 8, 6), toon(0xffffff), 0, 0.5, 0, top); } if (!fit.parent) gr.add(fit);
    mk(new THREE.CylinderGeometry(0.4, 0.36, 0.2, 24, 1, true), team, 0, 0.1, 0, top, true);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; mk(new THREE.ConeGeometry(0.105, 0.24, 4), team, Math.sin(a) * 0.37, 0.31, Math.cos(a) * 0.37, top, true).rotation.y = a + Math.PI / 4;
      mk(new THREE.SphereGeometry(0.05, 8, 6), toon(i % 2 ? 0xff5e7a : 0x5ad1ff), Math.sin(a + 0.52) * 0.385, 0.1, Math.cos(a + 0.52) * 0.385, top); }
    mk(new THREE.TorusGeometry(0.37, 0.035, 6, 24), acc, 0, 0.0, 0, top).rotation.x = Math.PI / 2;
    return gr;
  }
  // 'band' / 'bandana': fitted sweatband with a thin accent stripe
  ring(0.44, 0.11, team); ring(0.44, 0.028, acc, 1.045);
  if (kind === 'bandana') {   // knot and two tails at the back
    mk(new THREE.SphereGeometry(0.14, 8, 6), team, 0.28, 0.3, -0.95, fit);
    for (const a of [0.5, 1.1]) { const t = mk(new THREE.ConeGeometry(0.1, 0.46, 4), team, 0.42, 0.14, -0.98, fit); t.rotation.set(-0.5, 0, -a - 1.2); t.scale.z = 0.4; }
  }
  return gr;
}
// in-match player size: the racket at full stretch reaches ~2.1 m, matching the sim's hit zone (REACH_H)
const PLAYER_SCALE = 0.92;
function buildCharacter(c, teamColor, scale, hand, gearIds) {
  const GL = {}, GI = {}; { const set = S.gearSet(gearIds); for (const k in set) { GL[k] = set[k].col; GI[k] = set[k].id; } }   // worn gear: colour and item id per slot
  const h = hand === 'L' ? 1 : -1;   // racket side: +x = left hand, -x = right hand (model faces +z)
  const P = Object.assign({ size: 1, torso: [1, 1.08, 0.88], head: 1.18, sq: [1.08, 0.95, 0.98], lift: 0, headY: 0, snout: 'cat', eye: 'big', foot: 1 }, SHAPES[c.id] || {});
  teamColor = teamColor || 0xff7a59;
  const V = LOOKS[c.id] || { iris: 0x6a8fd0, lid: 0.1, mouth: 'smile', accent: 0xffffff, kit: 'side', gear: 'band', wrist: 'band' };
  const root = new THREE.Group(), body = new THREE.Group();
  root.add(body); body.scale.setScalar((scale || 1.0) * (1 + (P.size - 1) * 0.5));   // species size differences kept subtle
  const mBody = toon(c.body), mBelly = toon(c.belly), mDark = toon(0x2b2220), mEarIn = toon(c.earIn);
  const mEar = c.earCol ? toon(c.earCol) : mBody;
  const mJersey = toon(teamColor), mTrim = toon(0xffffff), mShorts = toon(GL.shorts !== undefined ? GL.shorts : shadeHex(teamColor, -0.62)), mKit = GL.shirt !== undefined ? mJersey : toon(V.accent), mShirt = GL.shirt !== undefined ? toon(GL.shirt) : mJersey;   // a worn shirt colours the whole shirt; its trims then carry the team colour
  const mShoe = GL.shoes !== undefined ? toon(GL.shoes) : mTrim, mWristG = GL.wrist !== undefined ? toon(GL.wrist) : null;
  const limbMat = c.patches ? mDark : mBody;
  const pawMat = P.darkPaws ? toon(P.darkPaws) : limbMat;
  const mOrange = toon(0xffa94d);
  const noOL = (m) => { m.userData.noOutline = true; return m; };
  const add = (geo, mat, x, y, z, parent) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); (parent || body).add(m); return m; };
  const [tx, ty, tz] = P.torso;

  // ---- skeleton (v2): body > hips > waist/chest > (torso, head, arms);  hips > thigh > knee > ankle.
  // Every mesh keeps the position it had in v1, so the look is unchanged.
  const hipY = P.lift + 0.30, ankleY = 0.08;
  const hipsPv = SPAnim.pivot(body, 0, hipY, 0);
  const chestPv = SPAnim.pivot(hipsPv.inner, 0, P.lift + 0.40, 0);
  const upH = new THREE.Group(); upH.position.y = P.lift; hipsPv.inner.add(upH);   // hip-level parts (shorts)
  const up = new THREE.Group(); up.position.y = P.lift; chestPv.inner.add(up);      // everything above the waist
  const legs = [], feet = [];
  const legL = Math.max(0.1, P.lift + 0.27 - ankleY), L1 = legL / 2, L2 = legL / 2;
  for (const s of [-1, 1]) {
    const hx = s * 0.12 * Math.max(0.9, tx);
    const thigh = new THREE.Group(); thigh.position.set(hx, P.lift + 0.27, 0); hipsPv.inner.add(thigh);
    thigh.rotation.order = 'ZYX';
    const legMat = P.darkPaws ? pawMat : limbMat;
    add(new THREE.SphereGeometry(0.098, 14, 8), mShorts, 0, 0.0, 0, thigh);                 // hip ball: no gap under the shorts when the thigh swings
    // shorts leg. Default: to just above the knee, flared. Gear: p_light = short running cut, p_flex = tights over the knee, p_pro = long and baggy with a side stripe
    const pk = ({ nj_pants: 'p_flex', hr_pants: 'p_flex', bc_pants: 'p_light', ry_pants: 'p_pro', as_pants: 'p_pro', pr_pants: 'p_pro', wz_pants: 'p_pro', cb_pants: 'p_pro', ch_pants: 'p_pro', wn_pants: 'p_flex', dv_pants: 'p_flex', rk_pants: 'p_flex', dt_pants: 'p_pro', rb_pants: 'p_pro', an_pants: 'p_pro', sm_pants: 'p_pro', dm_pants: 'p_flex', pk_pants: 'p_flex', be_pants: 'p_light', fa_pants: 'p_light', dn_pants: 'p_pro', po_pants: 'p_pro' })[GI.shorts] || GI.shorts, tight = pk === 'p_flex';
    const lgLen = 0.08 + (pk === 'p_light' ? Math.min(L1 * 0.4, 0.05) : Math.min(L1 * 0.9, 0.12)), lgR = tight ? 0.092 : pk === 'p_pro' ? 0.138 : pk === 'p_light' ? 0.116 : 0.122;
    const lg = add(new THREE.CylinderGeometry(tight ? 0.096 : 0.1, lgR, lgLen, 16), mShorts, 0, 0.08 - lgLen / 2, 0, thigh); lg.rotation.z = s * 0.08;
    if (!tight) { const lgHem = add(new THREE.TorusGeometry(lgR - 0.001, pk === 'p_pro' ? 0.013 : 0.009, 6, 20), pk === 'p_pro' ? toon(0x2a1f5a) : mTrim, 0, 0.08 - lgLen + 0.012, 0, thigh); lgHem.rotation.set(Math.PI / 2, s * 0.08, 0); noOL(lgHem); }
    if (pk === 'p_pro') { const st = add(new THREE.BoxGeometry(0.012, lgLen * 0.92, 0.05), toon(0x2a1f5a), s * 0.118, 0.08 - lgLen / 2, 0, thigh); st.rotation.z = s * 0.2; noOL(st); }
    if (pk === 'p_light') { const sl = add(new THREE.SphereGeometry(0.03, 8, 6), mTrim, s * 0.108, 0.08 - lgLen + 0.03, 0.01, thigh); sl.scale.set(0.35, 1.2, 1.3); noOL(sl); }
    add(new THREE.CapsuleGeometry(tight ? 0.081 : 0.078, Math.max(0.01, L1 - 0.04), 4, 12), tight ? mShorts : legMat, 0, -L1 / 2, -0.005, thigh);   // thigh
    const knee = new THREE.Group(); knee.position.set(0, -L1, 0); thigh.add(knee);
    add(new THREE.SphereGeometry(tight ? 0.077 : 0.074, 12, 8), tight ? mShorts : legMat, 0, 0, -0.008, knee);                   // knee cap: smooth bend, no kink
    if (tight) { const kr = add(new THREE.TorusGeometry(0.07, 0.011, 6, 18), toon(0x9fd0ff), 0, -0.05, -0.01, knee); kr.rotation.x = Math.PI / 2; noOL(kr); }
    add(new THREE.CapsuleGeometry(0.066, Math.max(0.01, L2 - 0.03), 4, 12), legMat, 0, -L2 / 2, -0.012, knee);    // shin, a little slimmer
    const ankle = new THREE.Group(); ankle.position.set(0, -L2, 0); knee.add(ankle); ankle.userData.side = s;
    const sk = ({ bc_shoes: 's_run', nj_shoes: 's_run', as_shoes: 's_spring', pr_shoes: 's_pro', ry_shoes: 's_pro', hr_shoes: 's_pro', cb_shoes: 's_pro', wz_shoes: 's_run', ch_shoes: 's_run', wn_shoes: 's_spring', dv_shoes: 's_run', rk_shoes: 's_pro', dt_shoes: 's_run', rb_shoes: 's_spring', an_shoes: 's_run', sm_shoes: 's_run', dm_shoes: 's_pro', po_shoes: 's_pro', dn_shoes: 's_spring', be_shoes: 's_run', fa_shoes: 's_run', pk_shoes: 's_run' })[GI.shoes] || GI.shoes, wing = () => { for (const [y, r, l] of [[0.07, -0.5, 0.11], [0.045, -0.85, 0.085]]) { const w = add(new THREE.ConeGeometry(0.028, l, 5), toon(0xffffff), s * 0.088, y, -0.05, ankle); w.rotation.set(-1.25, 0, r * s * 0.4); w.scale.x = 0.45; noOL(w); } };
    if (P.webbed) {
      const shoe = add(new THREE.SphereGeometry(0.1, 14, 10), mOrange, 0, -0.04, 0.05, ankle); shoe.scale.set(1.25, 0.42, 1.7);
      for (const t of [-1, 0, 1]) add(new THREE.SphereGeometry(0.035, 8, 6), mOrange, t * 0.07, -0.05, 0.2, ankle).scale.set(1, 0.6, 1.2);
      if (sk) {   // webbed feet wear the gear as ankle wraps
        noOL(add(new THREE.CylinderGeometry(0.074, 0.08, sk === 's_pro' ? 0.085 : 0.055, 16), mShoe, 0, sk === 's_pro' ? 0.045 : 0.03, -0.01, ankle));
        if (sk === 's_spring') { const r = add(new THREE.TorusGeometry(0.08, 0.014, 6, 18), toon(0xffd23f), 0, 0.005, -0.01, ankle); r.rotation.x = Math.PI / 2; noOL(r); }
        if (sk === 's_run') { const r = add(new THREE.TorusGeometry(0.076, 0.008, 6, 18), mTrim, 0, 0.04, -0.01, ankle); r.rotation.x = Math.PI / 2; noOL(r); }
        if (GI.shoes === 's_pro') wing();
      }
    } else if (sk) {
      const fz = 0.02 + (P.foot - 1) * 0.06, lowY = sk === 's_run' ? 0.52 : 0.62;
      const sock = add(new THREE.CylinderGeometry(0.074, 0.08, 0.06, 18), mTrim, 0, 0.04, -0.02, ankle); noOL(sock);
      const shoe = add(new THREE.SphereGeometry(0.1, 18, 12), mShoe, 0, -0.02, fz, ankle); shoe.scale.set(0.95, lowY, 1.45 * P.foot);
      const toe = add(new THREE.SphereGeometry(0.06, 10, 8), sk === 's_pro' ? toon(0xffffff) : mShoe, 0, -0.035, fz + 0.1 * P.foot, ankle); toe.scale.set(1.25, 0.75, 1.0); noOL(toe);
      if (sk === 's_run') {         // low and sleek: thin white sole, racing stripe on the outside
        const sole = add(new THREE.CylinderGeometry(0.098, 0.098, 0.018, 18), mTrim, 0, -0.064, fz, ankle); sole.scale.set(0.95, 1, 1.45 * P.foot); noOL(sole);
        for (const dz of [-0.02, 0.035]) { const st = add(new THREE.SphereGeometry(0.03, 8, 6), mTrim, s * 0.088, -0.015, fz + dz, ankle); st.scale.set(0.3, 1.25, 0.5); st.rotation.x = -0.5; noOL(st); }
      } else if (sk === 's_spring') {   // thick bouncy sole with an air bubble at the heel
        const sole = add(new THREE.CylinderGeometry(0.102, 0.106, 0.05, 18), toon(0xffd23f), 0, -0.07, fz, ankle); sole.scale.set(0.97, 1, 1.47 * P.foot); noOL(sole);
        const bub = add(new THREE.SphereGeometry(0.038, 10, 8), toon(0x5ad1ff), 0, -0.068, fz - 0.115 * P.foot, ankle); noOL(bub);
        const lace = add(new THREE.SphereGeometry(0.03, 10, 8), mTrim, 0, 0.012, fz + 0.045, ankle); lace.scale.set(1.3, 0.45, 1.4); noOL(lace);
      } else {                      // s_pro: high-top with a white toe cap and a little wing
        const sole = add(new THREE.CylinderGeometry(0.098, 0.098, 0.028, 18), toon(0x2a1f5a), 0, -0.062, fz, ankle); sole.scale.set(0.95, 1, 1.45 * P.foot); noOL(sole);
        noOL(add(new THREE.CylinderGeometry(0.08, 0.09, 0.1, 18), mShoe, 0, 0.045, -0.015, ankle));
        const cuffR = add(new THREE.TorusGeometry(0.08, 0.012, 6, 18), toon(0x2a1f5a), 0, 0.094, -0.015, ankle); cuffR.rotation.x = Math.PI / 2; noOL(cuffR);
        if (GI.shoes === 's_pro') wing();
      }
    } else {
      const sock = add(new THREE.CylinderGeometry(0.074, 0.08, 0.06, 18), mTrim, 0, 0.04, -0.02, ankle); noOL(sock);
      const fz = 0.02 + (P.foot - 1) * 0.06;
      const shoe = add(new THREE.SphereGeometry(0.1, 18, 12), mShoe, 0, -0.02, fz, ankle); shoe.scale.set(0.95, 0.62, 1.45 * P.foot);
      const toe = add(new THREE.SphereGeometry(0.06, 10, 8), mShoe, 0, -0.035, fz + 0.1 * P.foot, ankle); toe.scale.set(1.25, 0.75, 1.0); noOL(toe);   // rounded toe box
      const lace = add(new THREE.SphereGeometry(0.03, 10, 8), mJersey, 0, 0.012, fz + 0.045, ankle); lace.scale.set(1.3, 0.45, 1.4); noOL(lace);  // team-colour tongue / laces
      const sole = add(new THREE.CylinderGeometry(0.098, 0.098, 0.028, 18), mJersey, 0, -0.062, fz, ankle); sole.scale.set(0.95, 1, 1.45 * P.foot); noOL(sole);
    }
    legs.push({ side: s, parent: hipsPv.inner, thigh, knee, ankle, L1, L2, hx });
    feet.push(ankle);
  }
  const U = (geo, mat, x, y, z) => add(geo, mat, x, y, z, up);
  const tc = 0.52 + (ty - 1.08) * 0.27;            // torso centre: grows upward so the bottom stays on the shorts
  const shorts = add(new THREE.CylinderGeometry(0.225, 0.215, 0.1, 18), mShorts, 0, 0.37, 0, upH); shorts.scale.set(tx, 1, 0.88 * tz);
  const thC = Math.acos(Math.max(-0.98, Math.min(0, (0.345 - tc) / (0.27 * ty))));   // the shirt stops at the waistband; the rounded underside belongs to the shorts (no bodysuit tip between the legs)
  const torso = U(new THREE.SphereGeometry(0.27, 20, 16, 0, Math.PI * 2, 0, thC), mShirt, 0, tc, 0); torso.scale.set(tx, ty, tz);
  const seat = add(new THREE.SphereGeometry(0.27, 20, 6, 0, Math.PI * 2, thC, Math.PI - thC), mShorts, 0, tc, 0, upH); seat.scale.set(tx, ty, tz);
  const hemD = tc - 0.362, hem = U(new THREE.TorusGeometry(0.27 * Math.sqrt(1 - Math.pow(hemD / (0.27 * ty), 2)) + 0.003, 0.011, 6, 30), GL.shirt !== undefined ? toon(shadeHex(GL.shirt, -0.2)) : mKit, 0, tc - hemD, 0); hem.rotation.x = Math.PI / 2; hem.scale.set(tx, tz, 1); noOL(hem); if (V.noHem) up.remove(hem);   // a full ring on the torso surface
  const collar = U(new THREE.TorusGeometry(0.13, 0.026, 8, 22), mKit, 0, tc + 0.27 * ty - 0.07, 0.0); collar.rotation.x = Math.PI / 2; noOL(collar);
  if (GI.shirt) { /* gear shirt: its own pattern, added below */ }
  else if (V.kit === 'hoop') { const hp = U(new THREE.TorusGeometry(0.268, 0.02, 6, 26), mKit, 0, tc + 0.03, 0); hp.rotation.x = Math.PI / 2; hp.scale.set(tx, tz, 1); noOL(hp); }
  else if (V.kit === 'sash') { const sa = U(new THREE.TorusGeometry(0.262, 0.022, 6, 26), mKit, 0, tc + 0.02, 0); sa.rotation.set(Math.PI / 2, 0.62 * -h, 0); sa.scale.set(tx * 1.02, tz * 1.02, ty); noOL(sa); }
  const idx = Math.max(0, S.CHARS.findIndex((x) => x.id === c.id));
  const num = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.26), new THREE.MeshBasicMaterial({ map: jerseyNumberTex([7, 3, 10, 5, 9, 1, 4, 8, 2, 11, 6, 12, 23, 13, 99, 88][idx] || idx + 1, '#' + shadeHex(teamColor, -0.45).toString(16).padStart(6, '0')), transparent: true, depthWrite: false }));
  num.position.set(0, tc + 0.03, -0.243 * tz - 0.005); num.rotation.y = Math.PI; up.add(num);
  { const bx = 0.11 * tx, by = 0.1 + (V.badgeY || 0), ea = 0.27 * tx, eb = 0.27 * ty, ec = 0.27 * tz, bz = ec * Math.sqrt(Math.max(0.05, 1 - Math.pow(bx / ea, 2) - Math.pow(by / eb, 2)));
    const bn = new THREE.Vector3(bx / (ea * ea), by / (eb * eb), bz / (ec * ec)).normalize(), bq = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), bn);
    for (const [r, l, m] of [[0.05, 0.008, toon(0xffffff)], [0.032, 0.011, toon(shadeHex(teamColor, -0.3))]]) { const d = U(new THREE.CircleGeometry(r, 20), m, bx + bn.x * l, tc + by + bn.y * l, bz + bn.z * l); d.quaternion.copy(bq); noOL(d); } }
  if (P.wool) {   // fluffy wool collar and hip ruff poking out of the kit
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; U(new THREE.SphereGeometry(0.07, 8, 6), toon(0xfdfbf7), Math.cos(a) * 0.17 * tx, tc + 0.27 * ty - 0.05, Math.sin(a) * 0.14 * tz); }
  }

  const earJoints = [];
  // ---- head: features are placed on a skull of radius 0.34 squashed by P.sq
  const head = new THREE.Group(); head.position.y = tc + 0.27 * ty + 0.18 + P.headY; up.add(head);
  const hs = new THREE.Group(); hs.scale.setScalar(P.head); head.add(hs);
  const fx = P.sq[0] / 1.08, fy = P.sq[1] / 0.95, fz = P.sq[2] / 0.98;
  const H = (geo, mat, x, y, z) => add(geo, mat, x * fx, y * fy, z * fz, hs);
  const skull = add(new THREE.SphereGeometry(0.34, 32, 24), V.headCol ? toon(V.headCol) : c.id === 'sheep' ? mBelly : mBody, 0, 0, 0, hs); skull.scale.set(...P.sq);
  const id = c.id;
  // ---- soft outline shells (v7). The stock outline is a uniformly inflated back-face hull; where another part pierces that
  // hull behind the silhouette (ear roots, horns, wool) the hull showed as a stray arc across the part. A soft shell is the
  // same hull with a per-vertex thickness that fades to nothing next to the given meshes. `cutters`: parts growing out of
  // the skull (its hull fades around them); `softSkin`: parts whose own hull fades where they sink into the skull.
  const cutters = [], softSkin = [];
  const toHs = (m) => { const M = new THREE.Matrix4(); for (let o = m; o && o !== hs; o = o.parent) { o.updateMatrix(); M.premultiply(o.matrix); } return M; };
  const sdfOf = (m) => {   // approximate signed distance (head units) to a sphere / cone / capsule mesh
    const p = m.geometry.parameters, gt = m.geometry.type; let f;
    if (!p) return null;
    if (gt === 'SphereGeometry' && !(p.thetaLength < Math.PI)) f = (q) => q.length() - p.radius;
    else if (gt === 'ConeGeometry') { const kk = p.height / Math.hypot(p.height, p.radius); f = (q) => Math.max((Math.hypot(q.x, q.z) - p.radius * (0.5 - q.y / p.height)) * kk, -p.height / 2 - q.y); }
    else if (gt === 'CapsuleGeometry') { const L = (p.length !== undefined ? p.length : p.height) / 2; f = (q) => { q.y -= clamp(q.y, -L, L); return q.length() - p.radius; }; }
    else return null;
    const inv = toHs(m).invert(), q = new THREE.Vector3(), F = (x, y, z) => f(q.set(x, y, z).applyMatrix4(inv)), e = 0.004;
    return (v) => { const d = F(v.x, v.y, v.z); if (d <= 0) return d; return d * e / Math.max(1e-6, Math.hypot(F(v.x + e, v.y, v.z) - d, F(v.x, v.y + e, v.z) - d, F(v.x, v.y, v.z + e) - d)); };
  };
  const softShell = (m, geo, cut, r0, r1) => {   // geo: hull geometry in m's own space (displaced in place)
    if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
    const M = toHs(m), pos = geo.attributes.position, v = new THREE.Vector3(), l = new THREE.Vector3(), kk = clamp(0.018 / m.geometry.boundingSphere.radius, 0.03, 0.4);
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i); l.copy(v).multiplyScalar(1 + kk).applyMatrix4(M); let w = 1;
      for (const sd of cut) { w = Math.min(w, clamp((sd(l) - r0) / (r1 - r0), 0, 1)); if (!w) break; }
      w = w * w * (3 - 2 * w); v.multiplyScalar(1 + kk * w - 0.012 * (1 - w)); pos.setXYZ(i, v.x, v.y, v.z);
    }
    const o = new THREE.Mesh(geo, OUTLINE); o.userData.noOutline = true; o.userData.isOutline = true; o.userData.ownGeo = true; m.userData.noOutline = true; m.add(o); return o;
  };
  const AX = [0.34 * P.sq[0], 0.34 * P.sq[1], 0.34 * P.sq[2]];
  const udir = (x, y, z) => new THREE.Vector3(x / 0.3672, y / 0.323, z / 0.3332).normalize();   // H coordinates -> direction on the unit skull
  const surfMesh = (pts, idx, mat) => {   // pts: [unit direction, lift]
    const pos = [], nor = [];
    for (const [d, l] of pts) { pos.push(d.x * AX[0] * l, d.y * AX[1] * l, d.z * AX[2] * l); const n = new THREE.Vector3(d.x / AX[0], d.y / AX[1], d.z / AX[2]).normalize(); nor.push(n.x, n.y, n.z); }
    const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); ge.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); ge.setIndex(idx);
    const m = new THREE.Mesh(ge, mat); m.userData.noOutline = true; hs.add(m); return m;
  };
  // elliptical patch hugging the skull: centre (x, y, z) and radii ru / rv in H units; `bulge` domes the middle (muzzle patches)
  const patch = (x, y, z, ru, rv, mat, o = {}) => {
    const c0 = udir(x, y, z), t1 = new THREE.Vector3(0, 1, 0).cross(c0).normalize(), t2 = c0.clone().cross(t1);
    const rot = o.rot || 0, lift = o.lift || 1.012, bulge = o.bulge || 0, RN = o.rings || 4, N = o.seg || 24, pts = [[c0.clone(), lift + bulge]], idx = [];
    for (let i = 1; i <= RN; i++) for (let j = 0; j < N; j++) {
      const a = j / N * Math.PI * 2, rho = i / RN, u = Math.cos(a) * ru / 0.34 * rho, v = Math.sin(a) * rv / 0.34 * rho;
      pts.push([c0.clone().addScaledVector(t1, u * Math.cos(rot) - v * Math.sin(rot)).addScaledVector(t2, u * Math.sin(rot) + v * Math.cos(rot)).normalize(), lift + bulge * (1 - rho * rho)]);
    }
    for (let j = 0; j < N; j++) idx.push(0, 1 + j, 1 + (j + 1) % N);
    for (let i = 1; i < RN; i++) for (let j = 0; j < N; j++) { const a = 1 + (i - 1) * N + j, b = 1 + (i - 1) * N + (j + 1) % N; idx.push(a, a + N, b + N, a, b + N, b); }
    return surfMesh(pts, idx, mat);
  };
  // horizontal band round the skull at unit height d (-1 chin .. 1 crown), width w
  const band = (d, w, mat, off = 1.02) => {
    const rr = (y) => Math.sqrt(Math.max(0.01, 1 - y * y)) * off, gq = new THREE.Group(); gq.scale.set(AX[0], AX[1], AX[2]); hs.add(gq);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(rr(d + w / 2), rr(d - w / 2), w, 32, 1, true), mat); b.position.y = d; b.userData.noOutline = true; gq.add(b); return b;
  };
  // tapered stripe on the skull from a (blunt, wide) to b (point), both in H coordinates
  const stripe = (a, b, w, mat, o = {}) => {
    const A = udir(...a), B = udir(...b), side = A.clone().cross(B).normalize(), n = o.seg || 7, lift = o.lift || 1.02, pts = [], idx = [];
    for (let i = 0; i <= n; i++) { const t = i / n, d = A.clone().lerp(B, t).normalize(), hw = w / 0.34 / 2 * Math.pow(1 - t, 0.75) * Math.min(1, 0.45 + t * 4);
      pts.push([d.clone().addScaledVector(side, hw).normalize(), lift], [d.clone().addScaledVector(side, -hw).normalize(), lift]); }
    for (let i = 0; i < n; i++) idx.push(2 * i, 2 * i + 1, 2 * i + 3, 2 * i, 2 * i + 3, 2 * i + 2);
    return surfMesh(pts, idx, mat);
  };
  // face colour patches
  if (id === 'penguin') {   // own mask: two cheek lobes meeting under the beak (a dark widow's peak between the eyes)
    for (const s of [-1, 1]) patch(s * 0.15, -0.02, 0.3, 0.105, 0.185, toon(0xffffff), { rot: -s * 0.12, seg: 28 });
    patch(0, -0.175, 0.27, 0.28, 0.125, toon(0xffffff), { seg: 28 });
  }
  if (id === 'cat') patch(0, -0.17, 0.27, 0.45, 0.143, mBelly, { bulge: 0.1, rings: 6, seg: 32 });   // pale lower face (the panda is white already)
  if (id === 'sheep') {
    // wool: a flat-top fringe across the brow and big side puffs (no single top puff)
    const wool = toon(0xfdfbf7), sz = (x, y) => 0.3332 * Math.sqrt(Math.max(0.04, 1 - Math.pow(x / 0.3672, 2) - Math.pow(y / 0.323, 2)));
    for (let i = 0; i < 11; i++) { const a = -0.75 + i * (Math.PI + 1.5) / 10, x = Math.cos(a) * 0.29, y = Math.sin(a) * 0.255 + 0.015; cutters.push(H(new THREE.SphereGeometry(i % 2 ? 0.085 : 0.095, 10, 8), wool, x, y, sz(x, y))); }   // woolly rim framing the face
    for (let i = 0; i < 7; i++) { const a = Math.PI + (i / 6 - 0.5) * 2.4; cutters.push(H(new THREE.SphereGeometry(0.13, 10, 8), wool, Math.sin(a) * 0.27, 0.2, Math.cos(a) * 0.24 - 0.03)); }
    cutters.push(H(new THREE.SphereGeometry(0.15, 10, 8), wool, 0, 0.23, -0.03));
  }
  if (P.spots) for (const [x, y, z, r] of [[0.0, 0.2, 0.22, 0.05], [-0.22, 0.12, 0.12, 0.04], [0.24, 0.06, 0.14, 0.035], [0.1, 0.28, 0.05, 0.03]]) { const sp = H(new THREE.SphereGeometry(r, 8, 6), toon(shadeHex(c.body, -0.3)), x, y, z); sp.scale.z = 0.4; sp.lookAt(0, 0, 0); noOL(sp); }
  if (P.spot) { const sp = H(new THREE.SphereGeometry(0.1, 16, 12), toon(c.earCol || 0x8d6e63), 0.13 * -h, 0.04, 0.26); sp.scale.set(1.1, 1.0, 0.45); noOL(sp); }
  // snouts / beaks / mouths
  const mouthW = (y, z) => {
    const arc = (x, r, len, rz) => { const mo = H(new THREE.TorusGeometry(r, V.mouthT || 0.008, 4, 12, len), mDark, x, y, z); mo.rotation.z = rz; mo.rotation.x = -0.25; noOL(mo); return mo; };
    const bar = (len, x, yy, rz) => { const b = H(new THREE.CapsuleGeometry(0.007, len, 2, 6), mDark, x, yy, z + 0.004); b.rotation.z = rz; noOL(b); };
    switch (V.mouth) {
      case 'philtrum': bar(0.035, 0, y + 0.03, 0); arc(0, 0.05, Math.PI * 0.7, Math.PI * 1.15); break;      // short line down from the nose, one shallow curve
      case 'smile': arc(0, 0.045, Math.PI * 0.8, Math.PI * 1.1); break;
      case 'bun': bar(0.018, 0, y + 0.02, 0); for (const sd of [-1, 1]) arc(sd * 0.027, 0.027, Math.PI * 0.8, Math.PI * 1.1); break;   // nose line + two small curves
      case 'smirk': arc(0.012 * -h, V.mouthR || 0.05, Math.PI * 0.62, Math.PI * 1.05 + 0.25 * -h); break;                   // lopsided
      case 'open': { const o = H(new THREE.SphereGeometry(0.046, 10, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mDark, 0, y + 0.035, z + 0.004); o.scale.set(1.25, 1.25, 0.5); noOL(o); const tg = H(new THREE.SphereGeometry(0.024, 8, 6), toon(0xff8a8a), 0, y - 0.006, z + 0.016); tg.scale.set(1.2, 0.7, 0.4); noOL(tg); break; }
      case 'o': { const o = H(new THREE.SphereGeometry(0.02, 8, 6), mDark, 0, y + 0.01, z); o.scale.set(1.1, 0.8, 0.5); noOL(o); break; }
      case 'tri': { const t = H(new THREE.ConeGeometry(0.02, 0.03, 3), mDark, 0, y + 0.012, z); t.rotation.x = Math.PI; t.scale.z = 0.4; noOL(t); break; }
      default: break;   // 'none', 'frog': the snout code draws it
    }
  };
  const nose = (r, y, z, sx = 1.3, sy = 0.85, mat = mDark) => { const n = H(new THREE.SphereGeometry(r, 10, 8), mat, 0, y, z); n.scale.set(sx, sy, 0.8); return noOL(n); };
  switch (P.snout) {
    case 'cat': nose(0.034, -0.07, 0.35, 1.3, 0.85, toon(0xff8a8a)); mouthW(-0.115, 0.33); break;
    case 'bunny': {
      nose(0.03, -0.06, 0.355, 1.2, 0.9, toon(0xff8fa8)); mouthW(-0.105, 0.35);
      break;
    }
    case 'muzzle': {
      const mz = H(new THREE.SphereGeometry(0.15, 14, 10), id === 'panda' ? toon(0xffffff) : mBelly, 0, -0.1, 0.27); mz.scale.set(1.15, 0.78, id === 'bear' ? 0.72 : id === 'panda' ? 0.62 : 0.85); if (id === 'panda') noOL(mz); else if (id === 'dog') softSkin.push([mz, 0.02, 0.1]);
      const mzd = id === 'bear' ? -0.02 : id === 'panda' ? -0.035 : 0; nose(id === 'dog' ? 0.05 : 0.045, -0.04, 0.4 + mzd, 1.35, 0.85); mouthW(-0.135, 0.38 + mzd);
      if (P.tongue) { const tg = H(new THREE.SphereGeometry(0.035, 8, 6), toon(0xff7a8a), 0.01, -0.175, 0.36); tg.scale.set(1, 1.3, 0.5); noOL(tg); }
      break;
    }
    case 'pointed': {   // fox: long white muzzle ending in a black nose
      const mz = H(new THREE.SphereGeometry(0.12, 16, 12), mBelly, 0, -0.1, 0.3); mz.scale.set(0.95, 0.7, 1.25); softSkin.push([mz, 0.07, 0.25]);   // short rounded muzzle, small nose on its tip, smirk below (soft hull: no second arc under the mouth)
      nose(0.021, -0.058, 0.44, 1.3, 0.9); mouthW(-0.108, 0.437); break;
    }
    case 'frog': { const mouth = H(new THREE.TorusGeometry(0.2, 0.013, 4, 22, Math.PI), mDark, 0, -0.04, 0.27); mouth.rotation.z = Math.PI; mouth.scale.y = 0.6; noOL(mouth); break; }
    case 'beak': { const b = H(new THREE.ConeGeometry(0.06, 0.16, 10), mOrange, 0, -0.08, 0.38); b.rotation.x = Math.PI / 2; b.scale.set(1.3, 1, 0.7); break; }
    case 'bill': {
      const billM = toon(V.bill || 0xffa94d);   // narrow bill with a darker nail at the tip
      const b = H(new THREE.SphereGeometry(0.1, 18, 10), billM, 0, -0.07, 0.35); b.scale.set(1.2, 0.43, 1.6); noOL(b);   // ~15% larger; no outline shell (it showed as a dark smear under the bill)
      const b2 = H(new THREE.SphereGeometry(0.085, 12, 8), toon(shadeHex(V.bill || 0xffa94d, -0.06)), 0, -0.1, 0.335); b2.scale.set(1.0, 0.26, 1.25); noOL(b2);   // lower bill, no dark smear
      const split = H(new THREE.TorusGeometry(0.1, 0.006, 4, 18, Math.PI), mDark, 0, -0.088, 0.35); split.rotation.x = Math.PI / 2 + 0.13; split.scale.set(1.1, 1.46, 1); noOL(split);   // bill split line
      for (const s of [-1, 1]) { const ns = H(new THREE.SphereGeometry(0.009, 6, 4), mDark, s * 0.03, -0.037, 0.45); ns.scale.set(1, 0.5, 1.7); noOL(ns);
        const cn = H(new THREE.CapsuleGeometry(0.0065, 0.03, 2, 5), mDark, s * 0.124, -0.073, 0.345); cn.rotation.z = -s * 0.7; noOL(cn); }   // upturned mouth corners
      break;
    }
    case 'hamster': {
      nose(0.025, -0.05, 0.342, 1.2, 0.9, toon(0xff8fa8)); mouthW(-0.09, 0.31);   // on the fur between the two pouches
      for (const s of [-1, 1]) { const t = H(new THREE.BoxGeometry(0.026, 0.04, 0.02), toon(0xffffff), s * 0.015, -0.13, 0.312); noOL(t); }
      break;
    }
    case 'sheep': {
      patch(0, -0.15, 0.29, 0.125, 0.09, toon(0xf3e3d0), { bulge: 0.07, seg: 28 });   // one clean face tone (the skull itself) + a short pale muzzle
      nose(0.026, -0.105, 0.35, 1.4, 0.8, toon(0x2b2220)); mouthW(-0.13, 0.315); break;
    }
    case 'koala': { const n = nose(0.05, -0.05, 0.335, 1.0, 1.5, toon(0x4a3f3c)); n.scale.z = 0.6; mouthW(-0.15, 0.285); break; }
    case 'otter': {
      for (const s of [-1, 1]) { const ch = H(new THREE.SphereGeometry(0.1, 20, 14), mBelly, s * 0.07, -0.1, 0.28); ch.scale.set(1, 0.75, 0.8); }
      nose(0.04, -0.05, 0.37, 1.4, 0.8); mouthW(-0.112, 0.345); break;
    }
    case 'horse': {   // unicorn: long soft muzzle with nostrils
      const mz = H(new THREE.CapsuleGeometry(0.12, 0.12, 10, 22), toon(V.muzzle || c.belly), 0, -0.12, 0.3); mz.rotation.x = Math.PI / 2 - 0.25; mz.scale.set(1.1, 1, 0.9); noOL(mz);
      for (const s of [-1, 1]) { const ns = H(new THREE.SphereGeometry(0.015, 6, 4), toon(0xb86a9a), s * 0.04, -0.055, 0.465); ns.scale.set(0.8, 1.2, 0.5); noOL(ns); }
      mouthW(-0.1, 0.467);
      break;
    }
    case 'dragon': {
      const mz = H(new THREE.SphereGeometry(0.16, 20, 14), mBody, 0, -0.11, 0.27); mz.scale.set(1.1, 0.72, 1.15); softSkin.push([mz, 0.04, 0.14]);
      for (const s of [-1, 1]) { { const ns = H(new THREE.SphereGeometry(0.02, 14, 10), mDark, s * 0.06, -0.06, 0.45); ns.scale.z = 0.6; noOL(ns); } const tt = H(new THREE.ConeGeometry(0.018, 0.045, 4), toon(0xffffff), s * 0.08, -0.19, 0.38); tt.rotation.x = Math.PI; noOL(tt); }
      break;
    }
  }
  if (c.stripes) {   // tiger: forehead, cheek stripes
    for (const i of [-1, 0, 1]) stripe([i * 0.115, 0.31, 0.06], [i * 0.075, 0.212, 0.26], 0.05, mDark);
    for (const s of [-1, 1]) for (let q = 0; q < 3; q++) stripe([s * 0.37, 0.08 - q * 0.09, -0.02], [s * (q === 1 ? 0.255 : 0.275), 0.05 - q * 0.066, 0.2], 0.05, mDark);
  }
  if (P.whiskers) for (const s of [-1, 1]) for (let k = 0; k < 2; k++) {
    const dir = new THREE.Vector3(s * 0.94, k ? -0.26 : 0.06, 0.08).normalize(), WL = 0.112;
    const w = H(new THREE.CylinderGeometry(0.0045, 0.0025, WL, 4), mDark, s * 0.165 + dir.x * WL / 2, -0.12 - k * 0.03 + dir.y * WL / 2, 0.288 + dir.z * WL / 2); w.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir); noOL(w);
  }
  if (P.pouches) for (const s of [-1, 1]) { const p = H(new THREE.SphereGeometry(0.16, 20, 14), mBody, s * 0.205, -0.135, 0.08); p.scale.set(1, 0.85, 0.9); softSkin.push([p, 0, 0.03]); }   // full cheeks: face colour, merged into the head silhouette (no own outline on the face)
  if (P.tuft) for (let i = -1; i <= 1; i++) { const t = H(new THREE.ConeGeometry(0.03, 0.14, 6), mBody, i * 0.04, 0.36, 0.05); t.rotation.z = -i * 0.4; t.rotation.x = -0.3; }

  const dab = (x, y, z, r, mat, sx = 1, sy = 1) => { const d = H(new THREE.SphereGeometry(r, 10, 8), mat, x, y, z); d.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(x * fx, y * fy, z * fz).normalize()); d.scale.set(sx, sy, 0.35); noOL(d); return d; };
  // fuse static sibling meshes (same parent hs, same material) into one draw call
  const fuse = (parts, mat) => {
    const pos = [], nor = [];
    for (const m of parts) { m.updateMatrix(); const ge = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(m.matrix); for (const v of ge.attributes.position.array) pos.push(v); for (const v of ge.attributes.normal.array) nor.push(v); ge.dispose(); m.geometry.dispose(); hs.remove(m); }
    const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); ge.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    const out = new THREE.Mesh(ge, mat); hs.add(out); return noOL(out);
  };
  if (V.marks) V.marks({ H, U, dab, fuse, patch, stripe, band, toon, basic, noOL, cut: (m) => { cutters.push(m); return m; }, mBody, mBelly, mDark, tc, ty, tz, h, col: c });
  const eyeAt = [];
  const eyeRim = [], eyeIris = [], eyePupil = [], eyeGlint = [], cheek = [], eyeLo = [];
  const mIris = toon(V.iris), mPupil = toon(0x1c1416), mLid = toon(0x2a1c1a);
  for (const s of [-1, 1]) {
    if (c.patches) patch(s * 0.14, 0.012, 0.275, 0.08, 0.122, mDark, { rot: s * 0.95, lift: 1.016, seg: 28 });   // small tilted ovals laid on the skull (a sphere here poked out of the silhouette)
    // eyes
    const frog = P.eye === 'frog';
    const fxe = V.eyeX || 0.17;
    const ex = frog ? s * fxe : s * (V.eyeX2 || 0.125), ey = frog ? 0.25 : 0.02, ez = (frog ? 0.19 : 0.29) + (frog ? 0.05 : 0) + (V.eyeZ || 0);
    if (frog) H(new THREE.SphereGeometry(0.115, 14, 10), mBody, s * fxe, 0.23, 0.1);   // eye bump (no white ball behind the eye: it showed from the side)
    // house-style eye (v3): big round eye - dark rim, large coloured iris, big pupil, the shared wedge highlight plus a
    // tiny second sparkle, and a soft curved upper lid. Both eyes are fused per material after the loop.
    const er = V.eyeR || (P.eye === 'dot' ? 0.062 : 0.074), wide = 0.94, tall = P.eye === 'fierce' ? 0.98 : 1.06; eyeAt.push([ex, ey, ez, er]);
    const rim = H(new THREE.SphereGeometry(er * 1.1, 14, 10), mLid, ex, ey, ez - 0.006); rim.scale.set(wide, tall, 0.45); eyeRim.push(rim);
    const iris = H(new THREE.SphereGeometry(er, 14, 10), mIris, ex, ey - er * 0.02, ez + 0.006); iris.scale.set(wide * 0.95, tall * 0.95, 0.45); eyeIris.push(iris);
    if (V.irisLo) { const lo = H(new THREE.SphereGeometry(er, 14, 6, 0, Math.PI * 2, Math.PI * 0.56, Math.PI * 0.44), toon(V.irisLo), ex, ey - er * 0.02, ez + 0.012); lo.scale.set(wide * 0.95, tall * 0.95, 0.45); eyeLo.push(lo); }   // lighter lower half of the iris
    const pupil = H(new THREE.SphereGeometry(er * 0.62, 10, 8), mPupil, ex, ey - er * 0.06, ez + 0.024); pupil.scale.set(0.9, 1.05, 0.4); eyePupil.push(pupil);
    const glint = H(new THREE.ConeGeometry(er * 0.3, er * 0.8, 3), basic(0xffffff), ex + 0.018, ey + er * 0.38, ez + 0.04); glint.rotation.z = -0.55; glint.scale.z = 0.25; eyeGlint.push(glint);
    const spark = H(new THREE.SphereGeometry(er * 0.13, 6, 4), basic(0xffffff), ex - 0.02, ey - er * 0.36, ez + 0.04); eyeGlint.push(spark);
    const sleepy = P.eye === 'sleepy';
    if (sleepy) { const lid = H(new THREE.SphereGeometry(er * 1.14, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.3), mBody, ex, ey + er * 0.12, ez + 0.012); lid.scale.set(0.95, 1.0, 0.62); lid.rotation.x = 0.15; noOL(lid); }
    const lidArc = H(new THREE.TorusGeometry(er * 1.08, 0.0085, 4, 10, Math.PI * 0.62), mLid, ex, ey + er * (sleepy ? -0.25 : 0.02), ez + 0.012); lidArc.scale.set(wide, tall, 1);
    lidArc.rotation.z = Math.PI * 0.19 - s * V.lid; eyeRim.push(lidArc);
    // house cheek mark: two short warm dashes (not a blush oval)
    const CK = V.cheek || [0.2, -0.085, 0.275];
    for (let d = 0; d < 2; d++) { const ck = H(new THREE.CapsuleGeometry(0.0075, 0.03, 2, 5), mPupil, s * (CK[0] + d * 0.026), CK[1] - d * 0.004, CK[2] - d * 0.012); ck.rotation.z = s * 0.5; cheek.push(ck); }
    // ears / horns
    let ear = new THREE.Group();
    const E = P.bigEars || 1;
    switch (c.ear) {
      case 'cat': {
        const W = V.earW || 1, pyr = (r, hh) => new THREE.ConeGeometry(r, hh, 4).rotateY(Math.PI / 4);   // square base facing front
        add(pyr(0.12 * E * W, 0.22 * E), mEar, 0, 0, 0, ear).scale.z = 0.5;
        noOL(add(pyr(0.078 * E * W, 0.15 * E), mEarIn, 0, -0.03 * E, 0.024 * E * W, ear)).scale.z = 0.4;
        if (V.earDip) { const tp = add(pyr(0.12 * E * W * 0.42, 0.22 * E * 0.42), toon(V.earDip), 0, 0.22 * E * 0.29, 0, ear); tp.scale.set(1.12, 1, 0.66); noOL(tp); }
        ear.position.set(s * 0.19 * fx, 0.29 * fy + (E - 1) * 0.06 + (W - 1) * 0.1, -0.02); ear.rotation.z = -s * 0.32; break;
      }
      case 'bunny':
        if (V.lop) {   // lop ears: hang from the sides of the head, one flicked forward
          add(new THREE.CapsuleGeometry(0.075, 0.36, 4, 10), mEar, 0, -0.22, 0, ear).scale.z = 0.6; add(new THREE.CapsuleGeometry(0.042, 0.26, 4, 8), mEarIn, 0, -0.24, 0.036, ear).scale.z = 0.45;
          ear.position.set(s * 0.26, 0.27 * fy, -0.03); ear.rotation.set(s > 0 ? 0.55 : -0.1, 0, s * 0.42); break;
        }
        add(new THREE.CapsuleGeometry(0.085, 0.33, 4, 10), mEar, 0, 0, 0, ear).scale.z = 0.65; add(new THREE.CapsuleGeometry(0.05, 0.2, 4, 8), mEarIn, 0, -0.02, 0.04, ear).scale.z = 0.5;   // shorter, fatter ears
        if (V.earTip) { const tp = add(new THREE.SphereGeometry(0.089, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), toon(V.earTip), 0, 0.15, 0, ear); tp.scale.set(1.03, 1.3, 0.7); }   // dipped ear tips
        ear.position.set(s * (V.earTip || V.splay ? 0.15 : 0.13), 0.47 * fy, -0.04); ear.rotation.set(-0.12, 0, -s * (V.earTip || V.splay ? (s === h ? 0.42 : 0.2) : 0.13)); break;   // upright; the dipped pair splays, one ear wider
      case 'floppy': {
        const e = add(new THREE.SphereGeometry(0.14, 12, 10), mEar, 0, -0.08, 0, ear); e.scale.set(0.6, 1.6, 0.42);
        ear.position.set(s * 0.33 * fx, 0.08, -0.02); ear.rotation.z = s * 0.25; break;
      }
      case 'sheep': {
        const e = add(new THREE.SphereGeometry(0.08, 10, 8), mEarIn, 0, 0, 0, ear); e.scale.set(1.25, 0.55, 0.5);
        ear.position.set(s * 0.345, -0.03, 0.1); ear.rotation.z = -s * 1.0; break;
      }
      case 'koala':
        add(new THREE.SphereGeometry(0.2, 14, 10), mEar, 0, 0, 0, ear).scale.z = 0.5;
        { const fl = add(new THREE.SphereGeometry(0.105, 16, 10), toon(0xf4f6fa), 0, -0.01, 0.075, ear); fl.scale.z = 0.45; noOL(fl); for (let q = 0; q < 5; q++) { const a = -0.6 + q * 0.8; add(new THREE.SphereGeometry(0.06, 8, 6), mEar, s * Math.cos(a) * 0.17, Math.sin(a) * 0.17, 0, ear).scale.z = 0.6; } }   // one soft fluff patch, scalloped fluffy rim
        ear.position.set(s * 0.36 * fx, 0.2, -0.02); break;
      case 'unicorn':
        if (s > 0) {
          const hn = H(new THREE.ConeGeometry(0.085, 0.42, 12), toon(0xffd23f), 0, 0.42, 0.27); hn.rotation.x = 0.45;   // thick horn rising from the forehead, in front of the mane
          for (const [rt, rb, hh, y] of [[0.014, 0.105, 0.365, 0.0525], [0.105, 0.087, 0.085, -0.1725]]) { const ho = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, hh, 12, 1, true), OUTLINE); ho.position.y = y; ho.userData.noOutline = true; ho.userData.isOutline = true; ho.userData.ownGeo = true; hn.add(ho); } noOL(hn); cutters.push(hn);   // constant-width outline (the stock hull vanished on the cone)
          for (const f of [0.42, 0.6, 0.78]) { const r = H(new THREE.TorusGeometry(0.085 * (1 - f) + 0.003, 0.009, 4, 12), toon(0xffb84d), 0, 0.231 + 0.378 * f, 0.179 + 0.183 * f); r.rotation.x = Math.PI / 2 + 0.45; noOL(r); }
          [0xff9fd6, 0x9fd8ff, 0xc5a3ff, 0xffe18a, 0x9ef0b8, 0xff9fd6].forEach((col, i) => H(new THREE.SphereGeometry(0.085, 10, 8), toon(col), (i % 2 ? 0.035 : -0.035), 0.2 - i * 0.085, -0.3 - i * 0.012).scale.set(1.15, 1.35, 0.8));
        }
        add(new THREE.SphereGeometry(0.075, 12, 10), mEar, 0, 0, 0, ear).scale.set(0.72, 1.6, 0.45); noOL(add(new THREE.SphereGeometry(0.05, 10, 8), mEarIn, 0, -0.005, 0.02, ear)).scale.set(0.6, 1.55, 0.4); ear.position.set(s * 0.23 * fx, 0.33 * fy, -0.03); ear.rotation.z = -s * 0.45;
        break;
      case 'dragon': {
        const hn = add(new THREE.ConeGeometry(0.055, 0.26, 12), toon(V.horn || 0xffd23f), 0, 0.1, 0, ear); hn.rotation.x = -0.5; noOL(add(new THREE.CylinderGeometry(0.0335, 0.057, 0.11, 12), toon(shadeHex(V.horn || 0xffd23f, -0.22)), 0, -0.075, 0, hn));
        ear.position.set(s * 0.15 * fx, 0.3 * fy, -0.08); ear.rotation.z = -s * 0.35;
        const fin = add(new THREE.ConeGeometry(0.06, 0.21, 3), toon(V.fin || 0x5cb874), 0, 0, 0, hs); cutters.push(fin); fin.position.set(s * 0.365 * fx, 0.04, 0.03); fin.rotation.z = -s * 1.4; fin.scale.z = 0.3;
        break;
      }
      case 'round': {
        const r = V.smallEars || (c.id === 'bear' || c.id === 'panda' ? 0.11 : c.id === 'hamster' ? 0.075 : c.id === 'otter' ? 0.065 : 0.1);
        add(new THREE.SphereGeometry(r, 18, 12), mEar, 0, 0, 0, ear).scale.z = 0.6; noOL(add(new THREE.SphereGeometry(r * 0.58, 14, 10), mEarIn, 0, 0, 0.04, ear)).scale.z = 0.5;
        if (c.id === 'otter') ear.position.set(s * 0.3 * fx, 0.13, -0.02); else ear.position.set(s * 0.24 * fx, 0.26 * fy, 0.03);
        break;
      }
      default: ear = null;
    }
    if (ear) {
      hs.add(ear); if (c.ear !== 'floppy') ear.traverse((o) => { if (o.isMesh && !o.userData.noOutline) cutters.push(o); });
      // soft ears wobble more (long bunny ears, floppy dog ears, big koala ears); horns stay rigid
      const soft = { bunny: 1, floppy: 1.2, koala: 0.5, cat: 0.35, round: 0.3, sheep: 0.6, unicorn: 0.3 }[c.ear] || 0;
      if (soft) earJoints.push({ g: ear, rx: ear.rotation.x, rz: ear.rotation.z, s, soft });
    }
  }
  // sweatband in team colour
  if (cutters.length) softShell(skull, new THREE.SphereGeometry(0.34, 64, 40), cutters.map(sdfOf).filter(Boolean), 0.02, 0.08);
  if (softSkin.length) { const sk = [sdfOf(skull)]; for (const [m, r0, r1] of softSkin) softShell(m, m.geometry.clone(), sk, r0, r1); }
  fuse(eyeRim, mLid); fuse(eyeIris, mIris); fuse(eyePupil, mPupil); fuse(eyeGlint, basic(0xffffff)); fuse(cheek, toon(0xff9a7a)); if (eyeLo.length) fuse(eyeLo, toon(V.irisLo));
  // ---- gear: shirt patterns, neck and back items (all hang on the chest, so they follow the upper body)
  const surfZ = (y) => 0.27 * tz * Math.sqrt(Math.max(0.02, 1 - Math.pow((y - tc) / (0.27 * ty), 2)));   // torso front at height y
  const hoop = (y, tube, mat) => { const r = U(new THREE.TorusGeometry(0.27 * Math.sqrt(Math.max(0.02, 1 - Math.pow((y - tc) / (0.27 * ty), 2))) + 0.003, tube, 6, 28), mat, 0, y, 0); r.rotation.x = Math.PI / 2; r.scale.set(tx, tz, 1); return noOL(r); };
  if (GI.shirt === 't_cool') { hoop(tc + 0.075, 0.011, mTrim); hoop(tc + 0.0, 0.011, mTrim); hoop(tc - 0.07, 0.011, mTrim); }
  else if (GI.shirt === 't_comp') {   // dark compression top: neon seams down both sides and a neon collar
    const neon = toon(0x7dff9a);
    for (const sd of [-1, 1]) { const sm = U(new THREE.TorusGeometry(0.272, 0.011, 6, 26, Math.PI * 0.86), neon, 0, tc, 0); sm.rotation.set(0, sd * 0.62, -Math.PI * 0.43); sm.scale.set(tz * 1.02, ty * 1.01, 1); noOL(sm); }
    hoop(tc + 0.2, 0.012, neon);
  } else if (GI.shirt === 't_pro') {   // champion jersey: dark chest band, white piping, star on the chest
    const navy = toon(0x2a1f5a); hoop(tc + 0.045, 0.034, navy); hoop(tc + 0.085, 0.008, mTrim); hoop(tc + 0.005, 0.008, mTrim);
    const sy = tc + 0.15, star = U(new THREE.CircleGeometry(0.036, 5), basic(0xffffff), -0.085 * h, sy, surfZ(sy) * 0.93 + 0.012); star.rotation.set(-0.35, -0.3 * h, Math.PI / 10); noOL(star);
  }
  // glasses: in head space, in front of the eyes (they follow the head)
  const faceG = new THREE.Group(); faceG.name = 'faceGear'; hs.add(faceG);
  if (GI.face && eyeAt.length === 2) {
    const kind = GI.face, exA = Math.abs(eyeAt[0][0]) * fx, gy = eyeAt[0][1] * fy, gz = eyeAt[0][2] * fz + (GI.face === 'e_sport' ? 0.05 : GI.face === 'e_shade' ? 0.042 : 0.036);   // close to the face: seen from the side the lenses must not hang in the air
    const sx = kind === 'e_sport' ? 1.12 : kind === 'e_shade' ? 1.18 : 1.04, sy = kind === 'e_sport' ? 0.88 : kind === 'e_shade' ? 0.86 : 1.08, tube = kind === 'e_shade' ? 0.016 : kind === 'e_sport' ? 0.02 : 0.009;
    const R = Math.min(eyeAt[0][3] * 1.2, (exA - 0.012) / (sx * 0.955));
    const FG = (geo, mat, x, y, z, par) => noOL(add(geo, mat, x, y, z, par || faceG));
    const rod = (a, b, r, mat) => { const d = new THREE.Vector3().subVectors(b, a), len = d.length(), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); const hl = FG(new THREE.CylinderGeometry(r + 0.007, r + 0.007, len + 0.01, 6), OUTLINE, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); hl.quaternion.copy(q); hl.userData.isOutline = true;
      const m = FG(new THREE.CylinderGeometry(r, r, len, 6), mat, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); m.quaternion.copy(q); return m; };
    const frameM = toon(kind === 'e_sport' ? GL.face : kind === 'e_shade' ? 0x1d1f27 : 0xf2c230);
    const lensM = kind === 'e_sport' ? basic(0xbfeaff, { transparent: true, opacity: 0.36, depthWrite: false }) : kind === 'e_shade' ? basic(0x14161d) : basic(0xff9d3c, { transparent: true, opacity: 0.8, depthWrite: false });
    const shine = basic(0xffffff, { transparent: true, opacity: 0.7, depthWrite: false });
    const AXx = 0.34 * P.sq[0], AXz = 0.34 * P.sq[2], sideX = AXx * 1.04 * Math.sqrt(Math.max(0.2, 1 - Math.pow(gy / (0.34 * P.sq[1]), 2)));   // head half-width at eye height
    for (const s of [-1, 1]) {
      const lg = new THREE.Group(); lg.position.set(s * exA, gy - (kind === 'e_pro' ? R * 0.12 : 0), gz); lg.rotation.y = s * 0.36; faceG.add(lg);
      if (kind !== 'e_pro') { const dp = kind === 'e_sport' ? 0.05 : 0.026;   // the frame runs back to the face (goggle cup / thick rim)
        const hl = FG(new THREE.CylinderGeometry(R + tube + 0.007, R + tube + 0.012, dp, 24, 1, true), OUTLINE, 0, 0, -dp / 2, lg); hl.rotation.x = Math.PI / 2; hl.scale.set(sx, 1, sy); hl.userData.isOutline = true;
        const cup = FG(new THREE.CylinderGeometry(R + tube * 0.6, R + tube + 0.004, dp, 24, 1, true), kind === 'e_sport' ? toon(shadeHex(GL.face, -0.18), { side: THREE.DoubleSide }) : toon(0x1d1f27, { side: THREE.DoubleSide }), 0, 0, -dp / 2, lg); cup.rotation.x = Math.PI / 2; cup.scale.set(sx, 1, sy); }
      { const hl = FG(new THREE.TorusGeometry(R, tube + 0.008, 6, 24), OUTLINE, 0, 0, 0, lg); hl.scale.set(sx, sy, 1); hl.userData.isOutline = true; }
      FG(new THREE.TorusGeometry(R, tube, 6, 24), frameM, 0, 0, 0.001, lg).scale.set(sx, sy, 1);
      const ln = FG(new THREE.CircleGeometry(R, 24), lensM, 0, 0, 0.002, lg); ln.scale.set(sx, sy, 1); ln.renderOrder = 2;
      const sh = FG(new THREE.PlaneGeometry(R * 0.62, R * 0.13), shine, -R * 0.22, R * 0.34, 0.007, lg); sh.rotation.z = 0.62; sh.renderOrder = 3;
      if (kind !== 'e_sport') { const tr = kind === 'e_shade' ? 0.012 : 0.007, zm = gz * 0.6, a = new THREE.Vector3(s * (exA + R * sx * 0.93), gy + R * 0.25, gz - 0.035), m = new THREE.Vector3(s * (sideX * Math.sqrt(Math.max(0.1, 1 - Math.pow(zm / AXz, 2))) + 0.012), gy + 0.035, zm), b = new THREE.Vector3(s * (sideX + 0.006), gy + 0.03, -0.02); rod(a, m, tr, frameM); rod(m, b, tr, frameM); }
    }
    const bx = Math.max(0.004, exA - R * sx * 0.9);
    rod(new THREE.Vector3(-bx, gy + R * sy * 0.2, gz + 0.022), new THREE.Vector3(bx, gy + R * sy * 0.2, gz + 0.022), kind === 'e_pro' ? 0.007 : tube * 0.8, frameM);
    if (kind === 'e_pro') rod(new THREE.Vector3(-bx - 0.02, gy + R * sy * 0.62, gz + 0.012), new THREE.Vector3(bx + 0.02, gy + R * sy * 0.62, gz + 0.012), 0.006, frameM);
    if (kind === 'e_sport') {   // elastic strap round the back of the head
      const st = new THREE.Group(); st.position.y = gy; st.scale.set(sideX / 1.04, 0.34, AXz * sideX / (AXx * 1.04)); faceG.add(st);
      const hl = FG(new THREE.TorusGeometry(1.03, 0.1, 6, 40, Math.PI * 2 - 0.96), OUTLINE, 0, 0, 0, st); hl.rotation.set(Math.PI / 2, 0, Math.PI / 2 + 0.48); hl.userData.isOutline = true;
      const r = FG(new THREE.TorusGeometry(1.03, 0.075, 6, 40, Math.PI * 2 - 0.96), toon(shadeHex(GL.face, -0.25)), 0, 0, 0, st); r.rotation.set(Math.PI / 2, 0, Math.PI / 2 + 0.48);   // a wide band standing proud of the head, running into both goggle cups
    }
  }
  const neckG = new THREE.Group(); neckG.name = 'neckGear'; up.add(neckG);
  const backG = new THREE.Group(); backG.name = 'backGear'; up.add(backG);
  const NK = (geo, mat, x, y, z, ol) => { const m = add(geo, mat, x, y, z, neckG); if (!ol) noOL(m); return m; }, BK = (geo, mat, x, y, z, ol) => { const m = add(geo, mat, x, y, z, backG); if (!ol) noOL(m); return m; };
  const cy = tc + 0.27 * ty - 0.07;                 // collar height
  const chestZ = (x, y) => 0.27 * tz * Math.sqrt(Math.max(0.03, 1 - Math.pow((y - tc) / (0.27 * ty), 2) - Math.pow(x / (0.27 * tx), 2)));
  // a necklace lies on the chest in a U from the shoulders down to mid-chest, so it shows below the chin
  const lace = (u, lift, D = 0.14, W = 0.17) => { const x = u * W * tx, y = cy - 0.045 - D * (1 - u * u); return new THREE.Vector3(x, y, chestZ(x, y) + lift); };
  const laceTube = (r, mat, D, W, ol) => { const pts = []; for (let k = -8; k <= 8; k++) pts.push(lace(k / 8, r * 0.8, D, W)); const cv = new THREE.CatmullRomCurve3(pts), hl = NK(new THREE.TubeGeometry(cv, 36, r + 0.008, 7), OUTLINE, 0, 0, 0); hl.userData.isOutline = true; return NK(new THREE.TubeGeometry(cv, 36, r, 7), mat, 0, 0, 0); };
  // a flat strip lying on the chest from (x0,y0) to (x1,y1): w wide, standing t proud of the shirt
  const strip = (x0, y0, x1, y1, w, t, mat, back) => { if (!back) strip(x0 - (x1 - x0) * 0.03, y0 - (y1 - y0) * 0.03, x1 + (x1 - x0) * 0.03, y1 + (y1 - y0) * 0.03, w + 0.022, t - 0.005, basic(0x2a1d18, { side: THREE.DoubleSide }), true); const N = 6, pos = [], idx = [];
    for (let k = 0; k <= N; k++) { const x = x0 + (x1 - x0) * k / N, y = y0 + (y1 - y0) * k / N, dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), px = -dy / L * w / 2, py = dx / L * w / 2;
      for (const sd of [-1, 1]) { const xx = x + px * sd, yy = y + py * sd; pos.push(xx, yy, chestZ(xx, yy) + t); } }
    for (let k = 0; k < N; k++) { const a = k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); ge.setIndex(idx); ge.computeVertexNormals();
    return NK(ge, mat, 0, 0, 0); };
  const DS = { side: THREE.DoubleSide };
  if (GI.neck === 'n_towel') {      // towel over the shoulders, both ends hanging down the chest with a blue stripe
    const tw = toon(0xffffff, DS), bl = toon(0x4fb8e8, DS);
    for (const sd of [-1, 1]) { strip(sd * 0.125 * tx, cy - 0.02, sd * 0.1 * tx, tc - 0.075, 0.1, 0.02, tw); strip(sd * 0.103 * tx, tc - 0.03, sd * 0.1 * tx, tc - 0.052, 0.1, 0.024, bl, true);
      const sh = NK(new THREE.SphereGeometry(0.075, 12, 8), toon(0xffffff), sd * 0.15 * tx, cy + 0.0, 0.02, true); sh.scale.set(1.0, 0.55, 1.5); }
  } else if (GI.neck === 'n_chain') {   // gold chain on the chest with a large gem
    laceTube(0.012, toon(0xf2c230), 0.13);
    const pb = lace(0, 0.03, 0.13); NK(new THREE.OctahedronGeometry(0.06), toon(GL.neck), pb.x, pb.y - 0.045, pb.z + 0.004, true).scale.set(0.8, 1.2, 0.5);
    NK(new THREE.SphereGeometry(0.02, 8, 6), toon(0xf2c230), pb.x, pb.y + 0.005, pb.z);
  } else if (GI.neck === 'n_medal') {   // wide red and blue ribbon in a V, big gold medal with a star
    const my = tc + 0.0;
    strip(-0.13 * tx, cy - 0.03, -0.012, my + 0.05, 0.05, 0.012, toon(0x3f6fd9, DS)); strip(0.13 * tx, cy - 0.03, 0.012, my + 0.05, 0.05, 0.014, toon(0xd9483b, DS));
    const md = NK(new THREE.CylinderGeometry(0.078, 0.078, 0.02, 24), toon(0xf2c230), 0, my, chestZ(0, my) + 0.03, true); md.rotation.x = Math.PI / 2 - 0.12;
    const mr = NK(new THREE.TorusGeometry(0.06, 0.008, 5, 24), toon(0xffe9a8), 0, my, chestZ(0, my) + 0.042); mr.rotation.x = -0.12;
    const ms = NK(new THREE.CircleGeometry(0.042, 5), basic(0xfff3c4), 0, my, chestZ(0, my) + 0.043); ms.rotation.set(-0.12, 0, Math.PI / 10);
  } else if (GI.neck === 'n_bell') {    // red collar lying on the chest with a big gold bell
    laceTube(0.024, toon(GL.neck), 0.075, 0.17, true);
    const pb = lace(0, 0.05, 0.075); NK(new THREE.SphereGeometry(0.062, 14, 10), toon(0xf2c230), pb.x, pb.y - 0.05, pb.z, true);
    NK(new THREE.BoxGeometry(0.012, 0.05, 0.014), toon(0x5a3d12), pb.x, pb.y - 0.075, pb.z + 0.056); NK(new THREE.SphereGeometry(0.016, 8, 6), toon(0x5a3d12), pb.x, pb.y - 0.047, pb.z + 0.06);
    NK(new THREE.TorusGeometry(0.063, 0.006, 5, 20), toon(0xffe9a8), pb.x, pb.y - 0.05, pb.z).rotation.x = Math.PI / 2;
  } else if (GI.neck === 'n_bow') {     // big bow tie under the chin on a white collar
    laceTube(0.014, toon(0xffffff), 0.05, 0.17);
    const pb = lace(0, 0.045, 0.085), dk = toon(shadeHex(GL.neck, -0.28));
    for (const sd of [-1, 1]) { const lb = NK(new THREE.ConeGeometry(0.075, 0.13, 4), toon(GL.neck), sd * 0.08, pb.y, pb.z, true); lb.rotation.z = sd * Math.PI / 2; lb.scale.z = 0.42;
      NK(new THREE.BoxGeometry(0.01, 0.07, 0.01), dk, sd * 0.07, pb.y, pb.z + 0.03); }
    NK(new THREE.SphereGeometry(0.034, 10, 8), dk, 0, pb.y, pb.z + 0.014, true).scale.set(0.9, 1.2, 0.8);
  } else if (GI.neck === 'n_pearl') {   // string of large pearls on the chest (one mesh) with a pink pearl in the middle
    const pos = [], nor = [], hp = [], hn = [], N = 15;
    for (let i = 0; i < N; i++) { const q = lace((i / (N - 1)) * 2 - 1, 0.022, 0.13), ge = new THREE.SphereGeometry(0.029, 10, 8).toNonIndexed().translate(q.x, q.y, q.z);
      for (const v of ge.attributes.position.array) pos.push(v); for (const v of ge.attributes.normal.array) nor.push(v); ge.dispose();
      const g2 = new THREE.SphereGeometry(0.037, 10, 8).toNonIndexed().translate(q.x, q.y, q.z); for (const v of g2.attributes.position.array) hp.push(v); for (const v of g2.attributes.normal.array) hn.push(v); g2.dispose(); }
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); bg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute(hp, 3)); hg.setAttribute('normal', new THREE.Float32BufferAttribute(hn, 3)); NK(hg, OUTLINE, 0, 0, 0).userData.isOutline = true;
    NK(bg, toon(GL.neck), 0, 0, 0);
    const pb = lace(0, 0.03, 0.13); NK(new THREE.SphereGeometry(0.046, 14, 10), toon(0xff9fc4), pb.x, pb.y - 0.03, pb.z, true);
  }
  const bz = -surfZ(tc + 0.03);                     // torso back
  if (GI.back === 'b_pack') {       // small backpack with a water bottle in the side pocket
    const bp = BK(new THREE.SphereGeometry(0.15, 14, 10), toon(GL.back), 0, tc + 0.03, bz - 0.05, true); bp.scale.set(1.0, 1.15, 0.62);
    const fl = BK(new THREE.SphereGeometry(0.12, 12, 8), toon(shadeHex(GL.back, 0.25)), 0, tc + 0.1, bz - 0.085); fl.scale.set(1.0, 0.55, 0.5);
    BK(new THREE.SphereGeometry(0.018, 8, 6), toon(0xffd23f), 0, tc + 0.06, bz - 0.145);
    BK(new THREE.CapsuleGeometry(0.03, 0.09, 3, 8), toon(0x8fe07a), 0.165, tc - 0.01, bz - 0.04, true); BK(new THREE.CylinderGeometry(0.02, 0.02, 0.03, 8), toon(0xffffff), 0.165, tc + 0.085, bz - 0.04);
    for (const sd of [-1, 1]) { const stp = BK(new THREE.TorusGeometry(0.272, 0.014, 6, 24), toon(shadeHex(GL.back, -0.3)), sd * 0.105, tc + 0.02, 0); stp.rotation.y = Math.PI / 2; stp.scale.set(tz * 1.02, ty * 0.96, 1); }
  } else if (GI.back === 'b_bag') {   // racket bag slung across the back
    const bag = BK(new THREE.CapsuleGeometry(0.085, 0.42, 4, 12), toon(GL.back), 0, tc + 0.05, bz - 0.075, true); bag.rotation.z = -0.6 * h; bag.scale.z = 0.7;
    for (const k of [-0.13, 0.13]) { const bd = BK(new THREE.TorusGeometry(0.087, 0.012, 6, 16), toon(0xffffff), -Math.sin(-0.6 * h) * k, tc + 0.05 + Math.cos(0.6) * k, bz - 0.075); bd.rotation.set(Math.PI / 2, 0, 0); bd.rotation.z = -0.6 * h; bd.rotation.order = 'ZXY'; bd.scale.z = 1; }
    const hd = BK(new THREE.CylinderGeometry(0.014, 0.014, 0.16, 8), toon(0x3a3a46), Math.sin(0.6 * h) * 0.34, tc + 0.05 + Math.cos(0.6) * 0.34, bz - 0.075); hd.rotation.z = -0.6 * h;
    const stp = BK(new THREE.TorusGeometry(0.266, 0.016, 6, 26), toon(shadeHex(GL.back, -0.35)), 0, tc + 0.02, 0); stp.rotation.set(Math.PI / 2, 0.62 * h, 0); stp.scale.set(tx * 1.03, tz * 1.03, ty);
  } else if (GI.back === 'b_wings') {   // a pair of little feathered wings
    for (const sd of [-1, 1]) {
      const wg2 = new THREE.Group(); wg2.position.set(sd * 0.08, tc + 0.1, bz - 0.03); wg2.rotation.set(0.15, sd * 0.5, -sd * 0.25); backG.add(wg2);
      for (const [x, y, len, rot] of [[0.1, 0.1, 0.2, 0.9], [0.15, 0.03, 0.19, 1.35], [0.15, -0.05, 0.16, 1.8], [0.1, -0.1, 0.12, 2.25]]) {
        const f = add(new THREE.SphereGeometry(0.05, 10, 8), toon(GL.back), sd * x, y, -0.02, wg2); f.scale.set(0.62, len / 0.1, 0.3); f.rotation.z = -sd * rot; }
      const rt = add(new THREE.SphereGeometry(0.06, 10, 8), toon(0xffffff), sd * 0.03, 0, 0, wg2); rt.scale.set(1, 1.1, 0.5); noOL(rt);
    }
  }
  const setHead = { nj_head: ['ninja', 0xc22a3a], bc_head: ['straw', 0xe0303a], pr_head: ['tricorn', 0xf2c230], as_head: ['astro', 0x4f8fe8], ry_head: ['royal', 0xfff3c4], hr_head: ['hero', 0xffd23f], wz_head: ['wizard', 0xf2c230], cb_head: ['cowboy', 0x3a2a1a], wn_head: ['beanie', 0xffffff], ch_head: ['chef', 0xdfe5ee], dv_head: ['diver', 0xff8a3d], rk_head: ['mohawk', 0x7dff9a], dt_head: ['deer', 0x5a3d22], rb_head: ['robot', 0xffd23f], an_head: ['halo', 0xffe18a], sm_head: ['kabuto', 0xf2c230], dm_head: ['horns', 0xffb84d], be_head: ['antenna', 0xffd23f], dn_head: ['dino', 0xffd23f], po_head: ['police', 0xf2c230], fa_head: ['flowers', 0xffffff], pk_head: ['pumpkin', 0x4f8f3a] }[GI.head];
  // ---- outfit sets: shirt details and back pieces
  const decal = (geo, mat, x, y, lift, par) => { const z = chestZ(x, y), n = new THREE.Vector3(x / Math.pow(0.27 * tx, 2), (y - tc) / Math.pow(0.27 * ty, 2), z / Math.pow(0.27 * tz, 2)).normalize();
    const m = add(geo, mat, x + n.x * lift, y + n.y * lift, z + n.z * lift, par || up); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n); return noOL(m); };
  const seam = (x0, y0, x1, y1, r, mat) => { const pts = []; for (let k = 0; k <= 8; k++) { const x = x0 + (x1 - x0) * k / 8, y = y0 + (y1 - y0) * k / 8; pts.push(new THREE.Vector3(x, y, chestZ(x, y) + 0.004)); } return noOL(U(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, r, 5), mat, 0, 0, 0)); };
  const gold = toon(0xf2c230);
  if (GI.shirt === 'nj_shirt') { const gr2 = toon(0x8a93a6); seam(0.14 * tx, cy - 0.01, -0.05 * tx, tc - 0.09, 0.013, gr2); seam(-0.14 * tx, cy - 0.01, 0.02 * tx, tc - 0.02, 0.013, gr2); hoop(tc - 0.105, 0.024, toon(0xc22a3a)); decal(new THREE.BoxGeometry(0.05, 0.055, 0.02), toon(0xc22a3a), 0.1 * h, tc - 0.105, 0.012); }
  else if (GI.shirt === 'ry_shirt') { for (const dy of [0.13, 0.05, -0.03]) decal(new THREE.SphereGeometry(0.02, 8, 6), gold, 0, tc + dy, 0.006); hoop(tc - 0.115, 0.014, gold); seam(-0.035 * tx, cy - 0.02, -0.035 * tx, tc - 0.1, 0.006, gold); seam(0.035 * tx, cy - 0.02, 0.035 * tx, tc - 0.1, 0.006, gold);
    for (const sd of [-1, 1]) { const ep = U(new THREE.SphereGeometry(0.07, 12, 8), gold, sd * 0.205 * tx, tc + 0.19, 0); ep.scale.set(1.15, 0.5, 1.1); for (let q = -1; q <= 1; q++) noOL(U(new THREE.SphereGeometry(0.018, 6, 5), gold, sd * 0.255 * tx, tc + 0.165, q * 0.045)); } }
  else if (GI.shirt === 'as_shirt') { const bl = toon(0x4f8fe8); hoop(tc + 0.165, 0.013, bl); hoop(tc - 0.105, 0.018, bl); decal(new THREE.BoxGeometry(0.15, 0.095, 0.03), toon(0x5a6478), 0, tc + 0.055, 0.008); [0xff5e5e, 0x7dff9a, 0xffd23f].forEach((cc, i) => decal(new THREE.SphereGeometry(0.016, 8, 6), basic(cc), (i - 1) * 0.045, tc + 0.07, 0.027)); decal(new THREE.BoxGeometry(0.1, 0.014, 0.01), basic(0xbfeaff), 0, tc + 0.03, 0.026); }
  else if (GI.shirt === 'pr_shirt') { const rd = toon(0xc22a3a); for (const dy of [0.15, 0.085, 0.02, -0.045]) hoop(tc + dy, 0.016, rd); hoop(tc - 0.11, 0.026, toon(0x5a3d22)); decal(new THREE.BoxGeometry(0.06, 0.06, 0.02), gold, 0, tc - 0.11, 0.016); }
  else if (GI.shirt === 'bc_shirt') { const wh = basic(0xffffff), ye = basic(0xffd23f), pk2 = basic(0xff8fb8);
    for (const [x, dy, k] of [[-0.1, 0.13, 0], [0.09, 0.1, 1], [-0.02, 0.03, 1], [-0.17, 0.0, 1], [0.16, -0.01, 0], [0.06, -0.07, 0], [-0.09, -0.08, 1], [0.21, 0.09, 1], [-0.22, 0.1, 0]]) { const f = decal(new THREE.CircleGeometry(0.036, 5), k ? wh : pk2, x * tx, tc + dy, 0.006); f.rotateZ(x * 9); decal(new THREE.CircleGeometry(0.012, 8), ye, x * tx, tc + dy, 0.009); } }
  else if (GI.shirt === 'hr_shirt') { const ye = toon(0xffd23f); decal(new THREE.CircleGeometry(0.085, 24), basic(0xffd23f), 0, tc + 0.07, 0.007); decal(new THREE.CircleGeometry(0.058, 5), basic(0xe0303a), 0, tc + 0.07, 0.01).rotateZ(Math.PI / 10); hoop(tc - 0.105, 0.026, ye); decal(new THREE.BoxGeometry(0.07, 0.06, 0.02), toon(0xffffff), 0, tc - 0.105, 0.016); }
  const cape = (col, clasp) => {   // hangs from the shoulders to the knees, open at the front
    const cp = BK(new THREE.SphereGeometry(0.3, 20, 10, Math.PI * 1.06, Math.PI * 0.88, 0.42, 1.22), toon(col, { side: THREE.DoubleSide }), 0, tc - 0.12, -0.015); cp.scale.set(tx * 1.14, ty * 1.3, tz * 1.3);
    const rl = BK(new THREE.TorusGeometry(0.155, 0.032, 8, 22), toon(clasp), 0, cy + 0.005, 0, true); rl.rotation.x = Math.PI / 2;
    BK(new THREE.SphereGeometry(0.03, 10, 8), gold, 0, cy - 0.02, 0.165);
  };
  if (GI.back === 'ry_back') cape(GL.back, 0xffffff);
  else if (GI.back === 'hr_back') cape(GL.back, 0xffd23f);
  else if (GI.back === 'nj_back') {   // wooden sword slung across the back
    const sw = BK(new THREE.CapsuleGeometry(0.03, 0.5, 3, 8), toon(GL.back), 0, tc + 0.05, bz - 0.06, true); sw.rotation.z = -0.6 * h; sw.scale.z = 0.6;
    const at = (k) => [Math.sin(0.6 * h) * k, tc + 0.05 + Math.cos(0.6) * k, bz - 0.06];
    const gd = BK(new THREE.BoxGeometry(0.11, 0.022, 0.05), gold, ...at(0.27), true); gd.rotation.z = -0.6 * h;
    const hd = BK(new THREE.CylinderGeometry(0.02, 0.02, 0.15, 8), toon(0x2b2f45), ...at(0.355)); hd.rotation.z = -0.6 * h;
    const stp = BK(new THREE.TorusGeometry(0.266, 0.014, 6, 26), toon(0x2b2f45), 0, tc + 0.02, 0); stp.rotation.set(Math.PI / 2, 0.62 * h, 0); stp.scale.set(tx * 1.03, tz * 1.03, ty);
  } else if (GI.back === 'as_back') {   // jetpack: two tanks, nozzles and flames
    BK(new THREE.BoxGeometry(0.2, 0.2, 0.09), toon(GL.back), 0, tc + 0.04, bz - 0.05, true);
    for (const sd of [-1, 1]) { BK(new THREE.CapsuleGeometry(0.062, 0.2, 4, 10), toon(0xf4f6fa), sd * 0.105, tc + 0.04, bz - 0.085, true);
      BK(new THREE.CylinderGeometry(0.04, 0.058, 0.06, 10), toon(0x5a6478), sd * 0.105, tc - 0.15, bz - 0.085);
      const fl = BK(new THREE.ConeGeometry(0.045, 0.16, 8), basic(0xff8a3d), sd * 0.105, tc - 0.26, bz - 0.085); fl.rotation.x = Math.PI; const f2 = BK(new THREE.ConeGeometry(0.024, 0.1, 8), basic(0xffe18a), sd * 0.105, tc - 0.235, bz - 0.085); f2.rotation.x = Math.PI; }
    for (const sd of [-1, 1]) { const stp = BK(new THREE.TorusGeometry(0.272, 0.014, 6, 24), toon(0x5a6478), sd * 0.105, tc + 0.02, 0); stp.rotation.y = Math.PI / 2; stp.scale.set(tz * 1.02, ty * 0.96, 1); }
  } else if (GI.back === 'pr_back') {   // treasure chest carried like a backpack
    BK(new THREE.BoxGeometry(0.3, 0.17, 0.15), toon(GL.back), 0, tc - 0.005, bz - 0.075, true);
    const lid = BK(new THREE.CylinderGeometry(0.076, 0.076, 0.3, 14, 1, false, 0, Math.PI), toon(shadeHex(GL.back, -0.18)), 0, tc + 0.08, bz - 0.075, true); lid.rotation.set(0, 0, Math.PI / 2); lid.rotation.order = 'ZXY'; lid.rotation.x = -Math.PI / 2;
    for (const k of [-0.1, 0.1]) BK(new THREE.BoxGeometry(0.03, 0.26, 0.162), gold, k, tc + 0.03, bz - 0.075);
    BK(new THREE.SphereGeometry(0.026, 8, 6), gold, 0, tc + 0.07, bz - 0.158);
    for (const sd of [-1, 1]) { const stp = BK(new THREE.TorusGeometry(0.272, 0.014, 6, 24), toon(0x5a3d22), sd * 0.105, tc + 0.02, 0); stp.rotation.y = Math.PI / 2; stp.scale.set(tz * 1.02, ty * 0.96, 1); }
  } else if (GI.back === 'bc_back') {   // swim ring round the waist
    const ry = tc - 0.09, rr2 = 0.27 * Math.sqrt(Math.max(0.05, 1 - Math.pow((ry - tc) / (0.27 * ty), 2))) + 0.06;
    const rg = BK(new THREE.TorusGeometry(rr2, 0.075, 10, 30), toon(GL.back), 0, ry, 0, true); rg.rotation.x = Math.PI / 2; rg.scale.set(tx, tz, 1);
    for (let q = 0; q < 5; q++) { const wq = BK(new THREE.TorusGeometry(rr2, 0.078, 10, 6, 0.5), toon(0xffffff), 0, ry, 0); wq.rotation.set(Math.PI / 2, 0, q * Math.PI * 0.4 + 0.3); wq.scale.set(tx, tz, 1); }
  }
  // ---- more sets: wizard, cowboy, winter, chef
  if (GI.shirt === 'wz_shirt') { for (const [x, dy, r] of [[-0.11, 0.13, 0.03], [0.1, 0.09, 0.04], [-0.03, 0.02, 0.026], [0.16, -0.03, 0.03], [-0.16, -0.02, 0.036], [0.03, -0.08, 0.03], [0.22, 0.11, 0.026], [-0.22, 0.09, 0.026]]) decal(new THREE.CircleGeometry(r, 5), basic(0xffe18a), x * tx, tc + dy, 0.006).rotateZ(x * 7); hoop(tc - 0.115, 0.016, gold); }
  else if (GI.shirt === 'cb_shirt') { const br = toon(0x7a5230, DS); for (const sd of [-1, 1]) strip(sd * 0.17 * tx, cy - 0.03, sd * 0.135 * tx, tc - 0.115, 0.115, 0.008, br); decal(new THREE.CircleGeometry(0.04, 5), basic(0xf2c230), 0.14 * tx * -h, tc + 0.1, 0.014).rotateZ(Math.PI / 10); hoop(tc - 0.115, 0.022, toon(0x3a2a1a)); decal(new THREE.BoxGeometry(0.07, 0.055, 0.02), gold, 0, tc - 0.115, 0.014); }
  else if (GI.shirt === 'wn_shirt') { const wh = toon(0xffffff); hoop(tc + 0.115, 0.014, wh); hoop(tc - 0.045, 0.014, wh); hoop(tc - 0.115, 0.02, toon(0xd9483b));
    for (let k = -5; k <= 5; k++) { const d = decal(new THREE.CircleGeometry(0.026, 4), basic(k % 2 ? 0xffffff : 0xd9483b), k * 0.047 * tx, tc + 0.035, 0.006); d.rotateZ(Math.PI / 4); } }
  else if (GI.shirt === 'ch_shirt') { const dkb = toon(0x3a3a46); for (const sx2 of [-0.05, 0.05]) for (const dy of [0.1, 0.03, -0.04]) decal(new THREE.SphereGeometry(0.018, 8, 6), dkb, sx2 * tx, tc + dy, 0.004);
    strip(-0.12 * tx, cy - 0.035, 0.12 * tx, cy - 0.035, 0.05, 0.012, toon(0xd9483b, DS)); decal(new THREE.CircleGeometry(0.06, 3), basic(0xd9483b), 0, cy - 0.095, 0.014).rotateZ(-Math.PI / 2); hoop(tc - 0.115, 0.012, dkb); }
  if (GI.back === 'wz_back') cape(GL.back, 0xf2c230);
  else if (GI.back === 'cb_back') {   // coiled rope hanging on the back
    for (const [r, k] of [[0.13, 0], [0.105, 1], [0.08, 2]]) { const rp = BK(new THREE.TorusGeometry(r, 0.02, 6, 22), toon(k % 2 ? shadeHex(GL.back, -0.15) : GL.back), 0, tc + 0.04, bz - 0.035 - k * 0.012, k === 0); }
    const kn = BK(new THREE.CapsuleGeometry(0.02, 0.12, 3, 6), toon(GL.back), 0.1, tc - 0.1, bz - 0.04, true); kn.rotation.z = 0.5;
    const stp = BK(new THREE.TorusGeometry(0.266, 0.014, 6, 26), toon(0x7a5230), 0, tc + 0.02, 0); stp.rotation.set(Math.PI / 2, 0.62 * h, 0); stp.scale.set(tx * 1.03, tz * 1.03, ty);
  } else if (GI.back === 'wn_back') {   // snowboard strapped across the back
    const sb = BK(new THREE.CapsuleGeometry(0.085, 0.5, 4, 12), toon(GL.back), 0, tc + 0.06, bz - 0.05, true); sb.rotation.z = -0.55 * h; sb.scale.z = 0.22;
    for (const k of [-0.13, 0.13]) { const bd = BK(new THREE.BoxGeometry(0.15, 0.05, 0.03), toon(0x2b2f45), -Math.sin(-0.55 * h) * k, tc + 0.06 + Math.cos(0.55) * k, bz - 0.075); bd.rotation.z = -0.55 * h; }
    const st2 = BK(new THREE.BoxGeometry(0.03, 0.5, 0.012), toon(0xffffff), 0, tc + 0.06, bz - 0.071); st2.rotation.z = -0.55 * h;
    const stp = BK(new THREE.TorusGeometry(0.266, 0.014, 6, 26), toon(0x2b2f45), 0, tc + 0.02, 0); stp.rotation.set(Math.PI / 2, 0.62 * h, 0); stp.scale.set(tx * 1.03, tz * 1.03, ty);
  } else if (GI.back === 'ch_back') {   // frying pan carried on the back
    const pan = BK(new THREE.CylinderGeometry(0.15, 0.125, 0.045, 22), toon(GL.back), 0, tc + 0.08, bz - 0.055, true); pan.rotation.x = Math.PI / 2;
    BK(new THREE.CylinderGeometry(0.12, 0.12, 0.01, 22), toon(0x5a6478), 0, tc + 0.08, bz - 0.08).rotation.x = Math.PI / 2;
    const hd = BK(new THREE.CapsuleGeometry(0.02, 0.2, 3, 8), toon(0x7a5230), 0.13 * h, tc - 0.1, bz - 0.055, true); hd.rotation.z = 0.62 * h;
    const stp = BK(new THREE.TorusGeometry(0.266, 0.014, 6, 26), toon(0x5a3d22), 0, tc + 0.02, 0); stp.rotation.set(Math.PI / 2, -0.62 * h, 0); stp.scale.set(tx * 1.03, tz * 1.03, ty);
  }
  // ---- sets: diver, rock, detective, robot, angel, samurai
  if (GI.shirt === 'dv_shirt') { const ye = toon(0xffd23f); for (const sd of [-1, 1]) seam(sd * 0.2 * tx, cy - 0.02, sd * 0.17 * tx, tc - 0.11, 0.012, ye); seam(0, cy - 0.03, 0, tc - 0.11, 0.007, toon(0xc9d2e0)); hoop(tc + 0.2, 0.014, ye); decal(new THREE.BoxGeometry(0.03, 0.04, 0.012), toon(0xc9d2e0), 0, cy - 0.05, 0.008); }
  else if (GI.shirt === 'rk_shirt') { const sv = toon(0xc9d2e0); seam(0.13 * tx, cy - 0.01, -0.06 * tx, tc - 0.11, 0.008, sv); for (const sd of [-1, 1]) for (let q = -1; q <= 1; q++) noOL(U(new THREE.ConeGeometry(0.018, 0.04, 5), sv, sd * (0.2 + q * 0.035) * tx, tc + 0.215 - Math.abs(q) * 0.012, q * 0.03));
    decal(new THREE.CircleGeometry(0.05, 5), basic(0xff3d9a), -0.11 * tx * h, tc + 0.07, 0.006).rotateZ(Math.PI / 10); hoop(tc - 0.115, 0.02, sv); for (let k = -4; k <= 4; k++) decal(new THREE.SphereGeometry(0.012, 6, 5), toon(0x3a3a46), k * 0.05 * tx, tc - 0.115, 0.016); }
  else if (GI.shirt === 'dt_shirt') { const br = toon(0x5a3d22), dkc = toon(shadeHex(GL.shirt, -0.22), DS); for (const sx2 of [-0.06, 0.06]) for (const dy of [0.09, 0.02, -0.05]) decal(new THREE.SphereGeometry(0.02, 8, 6), br, sx2 * tx, tc + dy, 0.004);
    for (const sd of [-1, 1]) strip(sd * 0.15 * tx, cy - 0.03, sd * 0.03 * tx, tc + 0.13, 0.085, 0.008, dkc); hoop(tc - 0.11, 0.024, br); decal(new THREE.BoxGeometry(0.07, 0.06, 0.02), gold, 0, tc - 0.11, 0.014); }
  else if (GI.shirt === 'rb_shirt') { const dk2 = toon(0x3a4254); hoop(tc + 0.17, 0.016, dk2); hoop(tc - 0.11, 0.02, dk2); decal(new THREE.BoxGeometry(0.2, 0.12, 0.03), dk2, 0, tc + 0.045, 0.008);
    [0xff5e5e, 0x7dff9a, 0xffd23f, 0x5ad1ff].forEach((cc, i) => decal(new THREE.BoxGeometry(0.03, 0.05 + (i % 2) * 0.025, 0.012), basic(cc), (i - 1.5) * 0.045, tc + 0.045, 0.028)); for (const sd of [-1, 1]) decal(new THREE.SphereGeometry(0.02, 8, 6), toon(0xc9d2e0), sd * 0.17 * tx, tc + 0.13, 0.004); }
  else if (GI.shirt === 'an_shirt') { hoop(tc - 0.1, 0.02, gold); hoop(tc + 0.2, 0.014, gold); seam(0, cy - 0.04, 0, tc - 0.1, 0.008, gold); decal(new THREE.CircleGeometry(0.045, 5), basic(0xffe18a), 0.1 * tx * -h, tc + 0.08, 0.006).rotateZ(Math.PI / 10); }
  else if (GI.shirt === 'sm_shirt') { const dk3 = toon(0x2a2440); for (const dy of [0.14, 0.06, -0.02, -0.1]) { hoop(tc + dy, 0.024, dk3); hoop(tc + dy + 0.027, 0.007, gold); }
    for (const sd of [-1, 1]) { const sp = U(new THREE.BoxGeometry(0.16, 0.035, 0.2), toon(GL.shirt), sd * 0.235 * tx, tc + 0.185, 0); sp.rotation.z = -sd * 0.35; noOL(U(new THREE.BoxGeometry(0.165, 0.012, 0.205), gold, sd * 0.245 * tx, tc + 0.165, 0)).rotation.z = -sd * 0.35; }
    decal(new THREE.CircleGeometry(0.04, 16), basic(0xf2c230), 0, tc + 0.1, 0.03); }
  const strapX = (col) => { const stp = BK(new THREE.TorusGeometry(0.266, 0.014, 6, 26), toon(col), 0, tc + 0.02, 0); stp.rotation.set(Math.PI / 2, 0.62 * h, 0); stp.scale.set(tx * 1.03, tz * 1.03, ty); };
  if (GI.back === 'dv_back') {   // air tank with a valve
    BK(new THREE.CapsuleGeometry(0.085, 0.24, 4, 12), toon(GL.back), 0, tc + 0.03, bz - 0.08, true); BK(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 8), toon(0xc9d2e0), 0, tc + 0.25, bz - 0.08); BK(new THREE.BoxGeometry(0.1, 0.02, 0.03), toon(0x3a4254), 0, tc + 0.285, bz - 0.08);
    for (const dy of [0.11, -0.05]) { const bd = BK(new THREE.TorusGeometry(0.087, 0.012, 6, 16), toon(0x23232b), 0, tc + dy, bz - 0.08); bd.rotation.x = Math.PI / 2; } strapX(0x23232b);
  } else if (GI.back === 'rk_back') {   // electric guitar across the back
    const gg = new THREE.Group(); gg.position.set(0, tc + 0.02, bz - 0.06); gg.rotation.z = 0.6 * h; backG.add(gg);
    add(new THREE.SphereGeometry(0.12, 14, 10), toon(GL.back), 0, -0.12, 0, gg).scale.set(1.15, 0.95, 0.3); add(new THREE.SphereGeometry(0.09, 14, 10), toon(GL.back), 0, 0.02, 0, gg).scale.set(1.1, 0.9, 0.3);
    noOL(add(new THREE.BoxGeometry(0.045, 0.36, 0.025), toon(0x3a2a1a), 0, 0.24, -0.01, gg)); add(new THREE.BoxGeometry(0.075, 0.09, 0.03), toon(0x23232b), 0, 0.46, -0.01, gg);
    noOL(add(new THREE.BoxGeometry(0.07, 0.05, 0.012), toon(0xc9d2e0), 0, -0.1, -0.04, gg)); noOL(add(new THREE.BoxGeometry(0.012, 0.5, 0.008), toon(0xc9d2e0), 0, 0.14, -0.03, gg)); strapX(0x23232b);
  } else if (GI.back === 'dt_back') {   // big magnifying glass
    const mg2 = new THREE.Group(); mg2.position.set(0, tc + 0.07, bz - 0.05); mg2.rotation.z = -0.5 * h; backG.add(mg2);
    add(new THREE.TorusGeometry(0.13, 0.022, 8, 24), toon(GL.back), 0, 0.05, 0, mg2); noOL(add(new THREE.CircleGeometry(0.125, 24), basic(0xbfeaff, { transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }), 0, 0.05, 0, mg2));
    noOL(add(new THREE.PlaneGeometry(0.09, 0.02), basic(0xffffff, { side: THREE.DoubleSide }), -0.04, 0.1, -0.004, mg2)).rotation.z = 0.6; add(new THREE.CapsuleGeometry(0.022, 0.16, 3, 8), toon(0x5a3d22), 0, -0.19, 0, mg2); strapX(0x5a3d22);
  } else if (GI.back === 'rb_back') {   // battery block with charge bars and two aerials
    BK(new THREE.BoxGeometry(0.26, 0.24, 0.1), toon(GL.back), 0, tc + 0.03, bz - 0.06, true); [0x7dff9a, 0x7dff9a, 0xffd23f].forEach((cc, i) => BK(new THREE.BoxGeometry(0.05, 0.14, 0.012), basic(cc), (i - 1) * 0.07, tc + 0.03, bz - 0.114));
    for (const sd of [-1, 1]) { BK(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 5), toon(0xc9d2e0), sd * 0.1, tc + 0.25, bz - 0.06).rotation.z = -sd * 0.25; BK(new THREE.SphereGeometry(0.022, 8, 6), basic(0xff5e5e), sd * 0.125, tc + 0.345, bz - 0.06); }
    for (const sd of [-1, 1]) { const stp = BK(new THREE.TorusGeometry(0.272, 0.014, 6, 24), toon(0x3a4254), sd * 0.105, tc + 0.02, 0); stp.rotation.y = Math.PI / 2; stp.scale.set(tz * 1.02, ty * 0.96, 1); }
  } else if (GI.back === 'an_back') {   // large feathered wings
    for (const sd of [-1, 1]) { const wg3 = new THREE.Group(); wg3.position.set(sd * 0.07, tc + 0.12, bz - 0.03); wg3.rotation.set(0.1, sd * 0.45, -sd * 0.15); backG.add(wg3);
      for (const [x, y, len, rot] of [[0.14, 0.2, 0.34, 0.75], [0.24, 0.1, 0.34, 1.15], [0.27, -0.02, 0.3, 1.5], [0.24, -0.13, 0.26, 1.85], [0.17, -0.22, 0.2, 2.2], [0.09, -0.27, 0.14, 2.6]]) { const f = add(new THREE.SphereGeometry(0.06, 10, 8), toon(GL.back), sd * x, y, -0.02, wg3); f.scale.set(0.7, len / 0.12, 0.28); f.rotation.z = -sd * rot; }
      noOL(add(new THREE.SphereGeometry(0.09, 10, 8), toon(0xfff3c4), sd * 0.05, 0.02, 0, wg3)).scale.set(1.2, 1.5, 0.5); }
  } else if (GI.back === 'sm_back') {   // war banner on a pole
    const bn = new THREE.Group(); bn.position.set(0.1 * h, tc - 0.02, bz - 0.06); bn.rotation.set(-0.5, 0, -0.5 * h); backG.add(bn);   // leans out past the head so it shows from every side
    add(new THREE.CylinderGeometry(0.014, 0.014, 0.95, 6), toon(0x3a2a1a), 0, 0.42, 0, bn);
    add(new THREE.BoxGeometry(0.24, 0.46, 0.014), toon(GL.back, DS), 0.135 * h, 0.62, 0, bn); noOL(add(new THREE.CircleGeometry(0.07, 16), basic(0xf2c230, DS), 0.135 * h, 0.68, -0.009, bn)); noOL(add(new THREE.CircleGeometry(0.07, 16), basic(0xf2c230, DS), 0.135 * h, 0.68, 0.009, bn));
    noOL(add(new THREE.BoxGeometry(0.24, 0.035, 0.016), toon(0xffffff), 0.135 * h, 0.46, 0, bn)); noOL(add(new THREE.SphereGeometry(0.03, 8, 6), gold, 0, 0.91, 0, bn)); strapX(0x2a2440);
  }
  // ---- sets: bee, police, pumpkin, dino, fairy, demon
  if (GI.shirt === 'be_shirt') { const bk = toon(0x23232b); for (const dy of [0.13, 0.03, -0.07]) hoop(tc + dy, 0.03, bk); }
  else if (GI.shirt === 'po_shirt') { const nv = toon(0x16224a, DS); strip(0, cy - 0.04, 0, tc - 0.06, 0.05, 0.01, nv); decal(new THREE.CircleGeometry(0.036, 3), basic(0x16224a), 0, tc - 0.085, 0.012).rotateZ(-Math.PI / 2);
    decal(new THREE.CircleGeometry(0.042, 6), basic(0xf2c230), 0.13 * tx * -h, tc + 0.1, 0.008); for (const sd of [-1, 1]) { const ep = U(new THREE.BoxGeometry(0.11, 0.02, 0.07), toon(0x16224a), sd * 0.21 * tx, tc + 0.215, 0); ep.rotation.z = -sd * 0.3; noOL(ep); } hoop(tc - 0.115, 0.022, toon(0x16181f)); decal(new THREE.BoxGeometry(0.06, 0.05, 0.02), gold, 0, tc - 0.115, 0.014); }
  else if (GI.shirt === 'pk_shirt') { const wh = toon(0xffffff); seam(0, cy - 0.04, 0, tc - 0.1, 0.012, wh); for (const dy of [0.13, 0.07, 0.01, -0.05]) for (const sd of [-1, 1]) seam(sd * 0.02, tc + dy, sd * (0.15 - Math.abs(dy - 0.04) * 0.25) * tx, tc + dy + 0.02, 0.011, wh); }
  else if (GI.shirt === 'dn_shirt') { const bl = decal(new THREE.CircleGeometry(0.15, 24), basic(0xf4f0b8), 0, tc + 0.0, 0.004); bl.scale.set(1, 1.25, 1); for (const dy of [0.09, 0.03, -0.03, -0.09]) decal(new THREE.PlaneGeometry(0.2 - Math.abs(dy) * 0.6, 0.007), basic(0xd9d08a), 0, tc + dy, 0.007);
    for (const [x, dy] of [[-0.2, 0.12], [0.21, 0.08], [-0.22, -0.02], [0.22, -0.05]]) decal(new THREE.CircleGeometry(0.03, 10), basic(0x2e7d32), x * tx, tc + dy, 0.006); }
  else if (GI.shirt === 'fa_shirt') { const wh = toon(0xffffff); hoop(tc - 0.115, 0.028, wh); hoop(tc + 0.2, 0.016, wh);
    const pb = lace(0, 0.03, 0.1); for (const sd of [-1, 1]) { const lb = U(new THREE.ConeGeometry(0.055, 0.1, 4), wh, sd * 0.06, pb.y, pb.z); lb.rotation.z = sd * Math.PI / 2; lb.scale.z = 0.42; } noOL(U(new THREE.SphereGeometry(0.026, 8, 6), toon(0xffd23f), 0, pb.y, pb.z + 0.012));
    for (const [x, dy, cc] of [[-0.14, 0.02, 0xffffff], [0.15, 0.0, 0xffe18a], [-0.05, -0.05, 0xc59bff], [0.07, -0.06, 0xffffff], [0.2, 0.1, 0xc59bff], [-0.21, 0.1, 0xffe18a]]) decal(new THREE.CircleGeometry(0.028, 5), basic(cc), x * tx, tc + dy, 0.006); }
  else if (GI.shirt === 'dm_shirt') { const fl1 = basic(0xff7a1f), fl2 = basic(0xffd23f); for (let k = -5; k <= 5; k++) { decal(new THREE.CircleGeometry(0.055 + (k % 2 ? 0.02 : 0), 3), fl1, k * 0.045 * tx, tc - 0.075 + (k % 2 ? 0.015 : 0), 0.006).rotateZ(Math.PI / 2); decal(new THREE.CircleGeometry(0.028, 3), fl2, k * 0.045 * tx, tc - 0.09, 0.009).rotateZ(Math.PI / 2); }
    hoop(tc - 0.118, 0.022, toon(0x16181f)); decal(new THREE.CircleGeometry(0.05, 5), basic(0xff3d2a), 0, tc + 0.1, 0.006).rotateZ(-Math.PI / 10 + Math.PI); hoop(tc + 0.2, 0.014, toon(0xff7a1f)); }
  const fan = (col, col2, sd, n, len, wide, y0) => { const wg4 = new THREE.Group(); wg4.position.set(sd * 0.07, tc + y0, bz - 0.03); wg4.rotation.set(0.1, sd * 0.5, 0); backG.add(wg4);
    for (let i = 0; i < n; i++) { const a = 0.55 + i * (1.5 / n), m = add(new THREE.ConeGeometry(wide, len * (1 - i * 0.1), 3), toon(i % 2 ? col2 : col, DS), sd * Math.sin(a) * len * 0.5, Math.cos(a) * len * 0.5, -0.02 - i * 0.004, wg4); m.rotation.z = -sd * a; m.scale.z = 0.12; } return wg4; };
  if (GI.back === 'dm_back') { for (const sd of [-1, 1]) { const w = fan(GL.back, 0x8a1020, sd, 4, 0.56, 0.13, 0.14); const bone = add(new THREE.CylinderGeometry(0.014, 0.014, 0.42, 5), toon(0x23232b), sd * 0.15, 0.13, -0.035, w); bone.rotation.z = -sd * 0.85; noOL(bone); noOL(add(new THREE.ConeGeometry(0.02, 0.06, 5), toon(0xfff3c4), sd * 0.31, 0.275, -0.035, w)); } }
  else if (GI.back === 'be_back') {   // two pairs of clear wings and a stinger
    const wm = basic(GL.back, { transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide });
    for (const sd of [-1, 1]) for (const [y, len, rot] of [[0.14, 0.3, 1.0], [0.02, 0.22, 1.7]]) { const w = BK(new THREE.SphereGeometry(0.07, 12, 8), wm, sd * (0.08 + Math.sin(rot) * len * 0.5), tc + y + Math.cos(rot) * len * 0.5, bz - 0.04); w.scale.set(0.9, len / 0.14, 0.12); w.rotation.set(0, sd * 0.4, -sd * rot); w.renderOrder = 3;
      const hl = BK(new THREE.TorusGeometry(0.07, 0.006, 4, 20), toon(0x8fb8d9), w.position.x, w.position.y, w.position.z - 0.002); hl.scale.set(0.9, len / 0.14, 1); hl.rotation.copy(w.rotation); }
    const stg = BK(new THREE.ConeGeometry(0.035, 0.13, 8), toon(0x23232b), 0, tc - 0.1, bz - 0.06, true); stg.rotation.x = -2.2;
  } else if (GI.back === 'dn_back') {   // thick tail with spikes
    const segs = [[0.1, -0.02, 0.105], [0.05, -0.12, 0.085], [0.0, -0.21, 0.062], [-0.03, -0.29, 0.04]];
    segs.forEach(([y, z, r], i) => { BK(new THREE.SphereGeometry(r, 12, 10), toon(GL.back), 0, tc - 0.18 + y, bz + z, true).scale.set(1, 0.9, 1.5); if (i < 3) { const sp = BK(new THREE.ConeGeometry(0.03, 0.08, 4), toon(0xffd23f), 0, tc - 0.18 + y + r * 0.95, bz + z - 0.01, true); sp.scale.x = 0.5; } });
  } else if (GI.back === 'po_back') {   // baton across the back
    const bt = BK(new THREE.CapsuleGeometry(0.024, 0.44, 3, 8), toon(GL.back), 0, tc + 0.05, bz - 0.055, true); bt.rotation.z = -0.6 * h;
    const hd2 = BK(new THREE.CapsuleGeometry(0.02, 0.08, 3, 6), toon(GL.back), Math.sin(0.6 * h) * 0.13 + 0.05 * h, tc + 0.05 + Math.cos(0.6) * 0.13 - 0.04, bz - 0.055, true); hd2.rotation.z = 0.95 * h; strapX(0x16181f);
  } else if (GI.back === 'fa_back') {   // butterfly wings: two large upper, two small lower, white dots
    for (const sd of [-1, 1]) for (const [y, len, rot, cc, wd] of [[0.13, 0.36, 0.95, GL.back, 1.5], [0.0, 0.24, 1.9, 0xff9fd6, 1.3]]) { const cx = sd * (0.07 + Math.sin(rot) * len * 0.5), cyw = tc + y + Math.cos(rot) * len * 0.5;
      const w = BK(new THREE.SphereGeometry(0.07, 14, 10), toon(cc), cx, cyw, bz - 0.04, true); w.scale.set(wd, len / 0.14, 0.14); w.rotation.set(0, sd * 0.4, -sd * rot);
      const d = BK(new THREE.SphereGeometry(0.028, 8, 6), toon(0xffffff), cx + sd * 0.03, cyw + 0.03, bz - 0.052); d.scale.z = 0.3; }
    BK(new THREE.CapsuleGeometry(0.02, 0.2, 3, 6), toon(0x5a3d6a), 0, tc + 0.06, bz - 0.04);
  } else if (GI.back === 'pk_back') {   // witch's broom
    const bg2 = new THREE.Group(); bg2.position.set(0, tc + 0.04, bz - 0.06); bg2.rotation.z = -0.6 * h; backG.add(bg2);
    add(new THREE.CylinderGeometry(0.014, 0.014, 0.62, 6), toon(GL.back), 0, 0.06, 0, bg2); add(new THREE.ConeGeometry(0.085, 0.24, 10), toon(0xe0b84a), 0, -0.33, 0, bg2).rotation.x = 0; noOL(add(new THREE.CylinderGeometry(0.045, 0.05, 0.035, 10), toon(0xc22a3a), 0, -0.24, 0, bg2)); strapX(0x5a3d22);
  }
  const headGear = setHead ? buildHeadGear(setHead[0], GL.head, setHead[1], P, fy, V.gearAt) : GI.head === 'h_band' ? buildHeadGear('bandana', GL.head, 0xffffff, P, fy, V.gearAt) : GI.head === 'h_focus' ? buildHeadGear('visor', GL.head, 0xffffff, P, fy, V.gearAt)
    : GI.head === 'h_pro' ? buildHeadGear('crown', GL.head, 0xfff3c4, P, fy, V.gearAt) : buildHeadGear(V.gear, teamColor, V.accent, P, fy, V.gearAt); hs.add(headGear);
  const wristGear = [];
  // back / tails
  const back = -0.26 * tz;
  // segmented tail: joints at the hips, each segment tapers r0 -> r1 along its local +y; rx = bend from the previous one.
  // Each segment is an ellipsoid overlapping the next (reads as one smooth tapered tail) with its own
  // constant-thickness outline (the shared outline helper scales uniformly and bulges on long thin parts).
  const tailJoints = [];
  const TAIL_GEO = new THREE.SphereGeometry(1, 16, 10);
  function ellip(parent, y, a, b, c, mat) {
    const e = new THREE.Mesh(TAIL_GEO, mat); e.position.y = y; e.scale.set(a, b, c); e.userData.noOutline = true; parent.add(e);
    const T = 0.016, o = new THREE.Mesh(TAIL_GEO, OUTLINE);
    o.scale.set(1 + T / a, 1 + T / b, 1 + T / c); o.userData.noOutline = true; o.userData.isOutline = true; e.add(o);
    return e;
  }
  function tailChain(y, z, segs, mat, deco) {
    let parent = new THREE.Group(); parent.position.set(0, y, z); upH.add(parent);
    let off = 0;
    segs.forEach((sg, i) => {
      const g = new THREE.Group(); g.position.y = off; g.rotation.x = sg.rx; parent.add(g);
      const m = sg.mat || mat, r = (sg.r0 + sg.r1) / 2, fl = sg.flat || 1;
      const half = sg.len * 0.62 + r * 0.9;   // generous overlap: neighbours blend into one tapered shape, not beads
      ellip(g, sg.len * 0.5, r * fl, sg.cone ? sg.len * 0.75 : half, r / fl, m);
      const rec = { g, len: sg.len, r0: sg.r0, rx: sg.rx, k: (i + 1) / segs.length };
      if (deco) deco(rec, i);
      tailJoints.push(rec);
      parent = g; off = sg.len * (sg.fluff ? 0.62 : 0.72);
    });
  }
  if (c.id === 'dragon') {
    for (let i = 0; i < 4; i++) { const sp = U(new THREE.ConeGeometry(0.05, 0.13, 4), toon(V.fin || 0xffd23f), 0, tc + 0.25 - i * 0.14, back - 0.02 + i * 0.01); sp.rotation.x = -0.6; }
    for (const s of [-1, 1]) { const wing = U(new THREE.ConeGeometry(0.2, 0.42, 3), toon(V.fin || 0x5cb874), s * 0.32, tc + 0.22, back); wing.rotation.set(0.5, 0, -s * 1.05); wing.scale.z = 0.22; }
    // dragon tail: thick tapering chain with golden spikes along the top
    tailChain(0.3, back - 0.04, [
      { len: 0.17, r0: 0.095, r1: 0.08, rx: -1.3 }, { len: 0.17, r0: 0.08, r1: 0.06, rx: 0.15 },
      { len: 0.15, r0: 0.06, r1: 0.04, rx: 0.2 }, { len: 0.13, r0: 0.04, r1: 0.016, rx: 0.25, cone: true },
    ], mBody, (seg, i) => { const sp = add(new THREE.ConeGeometry(0.03 - i * 0.004, 0.075, 6), toon(V.fin || 0xffd23f), 0, seg.len * 0.5, -seg.r0 * 0.85, seg.g); sp.rotation.x = -0.5; });
  } else if (c.tail === 'fox') {   // big fluffy brush tail that swells, then a white tip
    tailChain(0.4, back - 0.02, [
      { len: 0.1, r0: 0.07, r1: 0.1, rx: -1.0, fluff: true }, { len: 0.12, r0: 0.11, r1: 0.13, rx: 0.3, fluff: true },
      { len: 0.12, r0: 0.13, r1: 0.11, rx: 0.3, fluff: true }, { len: 0.1, r0: 0.1, r1: 0.06, rx: 0.25, fluff: true, mat: mBelly },
    ], mBody);
  } else if (c.id === 'otter') {   // thick, flat rudder tail held low
    tailChain(0.24, back - 0.02, [
      { len: 0.17, r0: 0.085, r1: 0.075, rx: -1.7, flat: 1.25 }, { len: 0.17, r0: 0.075, r1: 0.058, rx: 0.1, flat: 1.35 },
      { len: 0.15, r0: 0.058, r1: 0.032, rx: 0.1, flat: 1.45 }, { len: 0.1, r0: 0.032, r1: 0.014, rx: 0.08, flat: 1.5, cone: true },
    ], mBody);
  } else if (c.tail === 'long') {   // cat / dog / tiger: one smooth S-curve that sways
    const tipMat = c.id === 'dog' ? mBelly : mBody;
    tailChain(0.38, back - 0.02, [
      { len: 0.11, r0: 0.046, r1: 0.044, rx: -1.15 }, { len: 0.11, r0: 0.044, r1: 0.042, rx: 0.35 },
      { len: 0.11, r0: 0.042, r1: 0.04, rx: 0.4 }, { len: 0.1, r0: 0.04, r1: 0.038, rx: 0.35 },
      { len: 0.085, r0: 0.038, r1: 0.032, rx: -0.15, mat: tipMat },
    ], mBody, c.stripes || V.tailRings ? (seg, i) => { if (i < 4) { const r = add(new THREE.TorusGeometry(seg.r0 + 0.003, 0.011, 6, 18), c.stripes ? mDark : toon(shadeHex(c.body, -0.45)), 0, seg.len * 0.55, 0, seg.g); r.rotation.x = Math.PI / 2; noOL(r); } } : null);
  } else if (c.id === 'unicorn') {   // rainbow tail: soft flowing locks
    const cols = [0xff9fd6, 0x9fd8ff, 0xc5a3ff, 0xffe18a, 0x9ef0b8];
    tailChain(0.42, back - 0.02, cols.map((col, i) => ({ len: 0.1, r0: 0.07 - i * 0.008, r1: 0.064 - i * 0.008, rx: i === 0 ? -2.2 : 0.16, fluff: true, mat: toon(col) })), mBody);
  } else if (c.id === 'duck' || c.id === 'penguin') {
    const t = U(new THREE.ConeGeometry(0.08, 0.14, 6), c.id === 'duck' ? mBody : mDark, 0, 0.36, back - 0.06); t.rotation.x = c.id === 'duck' ? -2.2 : -1.9; t.scale.z = 0.5;
  } else if (c.tail === 'puff') U(new THREE.SphereGeometry(c.id === 'sheep' ? 0.12 : c.id === 'bunny' ? 0.1 : 0.08, 10, 8), c.id === 'panda' ? mDark : c.id === 'sheep' ? toon(0xfdfbf7) : mBelly, 0, 0.36, back - 0.02);

  // ---- arms: shoulder -> upper arm -> elbow -> forearm -> wrist (rest pose hangs down, -y)
  const shX = clamp(0.27 * tx, 0.23, 0.33), shY = tc + 0.13;
  const mkArm = (side) => {
    const sh = new THREE.Group(); sh.position.set(shX * side, shY, 0.0); up.add(sh);
    const tk = GI.shirt, longSl = tk === 't_comp';   // t_cool: sleeveless; t_comp: long sleeves to the elbow; t_pro: dark cuffs
    add(new THREE.SphereGeometry(0.076, 14, 10), tk === 't_cool' ? limbMat : tk ? mShirt : V.kit === 'sleeves' ? mKit : mShirt, 0, 0, 0, sh);   // sleeve
    if (tk !== 't_cool') { const cuff = add(new THREE.TorusGeometry(0.058, tk === 't_pro' ? 0.016 : 0.012, 6, 18), tk === 't_pro' ? toon(0x2a1f5a) : tk === 't_comp' ? toon(0x7dff9a) : V.kit === 'sleeves' ? mShirt : mKit, 0, longSl ? -0.15 : -0.045, 0, sh); cuff.rotation.x = Math.PI / 2; cuff.scale.setScalar(longSl ? 0.86 : 1); noOL(cuff); }   // sleeve hem
    add(new THREE.CapsuleGeometry(longSl ? 0.049 : 0.046, 0.095, 4, 12), longSl ? mShirt : limbMat, 0, -0.088, 0, sh);              // upper arm
    const el = new THREE.Group(); el.position.set(0, -0.165, 0); sh.add(el);
    add(new THREE.SphereGeometry(0.047, 12, 8), limbMat, 0, 0, 0, el);                          // elbow
    add(new THREE.CapsuleGeometry(0.042, 0.085, 4, 12), P.darkPaws ? pawMat : limbMat, 0, -0.07, 0, el); // forearm
    if (P.armStripes) for (const y of [-0.03, -0.075]) { const r = add(new THREE.TorusGeometry(0.043, 0.01, 4, 12), mDark, 0, y, 0, el); r.rotation.x = Math.PI / 2; noOL(r); }
    const wg = new THREE.Group(); wg.name = 'wristGear'; el.add(wg); wristGear.push(wg);
    if (GI.wrist === 'w_band') {          // thick terry band with a red stripe
      noOL(add(new THREE.CylinderGeometry(0.056, 0.056, 0.056, 16), mWristG, 0, -0.11, 0, wg)); noOL(add(new THREE.CylinderGeometry(0.0575, 0.0575, 0.012, 16), toon(0xe8503a), 0, -0.11, 0, wg));
    } else if (GI.wrist === 'w_weight') {   // heavy training cuff with bolts
      add(new THREE.CylinderGeometry(0.066, 0.066, 0.075, 16), mWristG, 0, -0.105, 0, wg);
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; noOL(add(new THREE.SphereGeometry(0.012, 6, 5), toon(0xffd23f), Math.sin(a) * 0.066, -0.105, Math.cos(a) * 0.066, wg)); }
      for (const y of [-0.07, -0.14]) { const r = add(new THREE.TorusGeometry(0.066, 0.008, 6, 18), toon(0x8a8fa8), 0, y, 0, wg); r.rotation.x = Math.PI / 2; noOL(r); }
    } else if (GI.wrist === 'w_pro') {     // forearm sleeve with dark bands
      noOL(add(new THREE.CapsuleGeometry(0.047, 0.085, 4, 12), mWristG, 0, -0.07, 0, wg));
      for (const y of [-0.03, -0.125]) { const r = add(new THREE.TorusGeometry(0.048, 0.009, 6, 18), toon(0x2a1f5a), 0, y, 0, wg); r.rotation.x = Math.PI / 2; noOL(r); }
    } else if (V.wrist === 'double') for (const y of [-0.1, -0.128]) noOL(add(new THREE.CylinderGeometry(0.05, 0.05, 0.016, 14), mWristG || mKit, 0, y, 0, wg));
    else noOL(add(new THREE.CylinderGeometry(0.05, 0.05, V.wrist === 'tape' ? 0.06 : 0.04, 14), mWristG || (V.wrist === 'tape' ? mTrim : mKit), 0, V.wrist === 'tape' ? -0.108 : -0.115, 0, wg));
    const paw = add(new THREE.SphereGeometry(0.06, 14, 12), V.pads ? toon(V.pads) : pawMat, 0, -0.155, 0, el); paw.scale.set(1.05, 1.0, 1.12);
    const wr = new THREE.Group(); wr.position.set(0, -0.155, 0); el.add(wr);
    return { sh, el, wr };
  };
  const F = mkArm(-h), A = mkArm(h);
  const free = F.sh, arm = A.sh, wrist = A.wr;
  wrist.scale.setScalar(1.15);   // a slightly long racket so the smaller players still reach the hit zone
  // racket in the paw, pointing on from the forearm (-y); the butt sticks out a little behind the paw
  add(new THREE.CylinderGeometry(0.021, 0.021, 0.24, 12), gripMat, 0, -0.03, 0, wrist);          // towel grip
  add(new THREE.CylinderGeometry(0.026, 0.024, 0.022, 12), toon(0x2f2f3a), 0, 0.095, 0, wrist);   // butt cap
  const collar2 = add(new THREE.CylinderGeometry(0.021, 0.024, 0.025, 12), mJersey, 0, -0.16, 0, wrist); noOL(collar2);
  add(new THREE.CylinderGeometry(0.011, 0.008, 0.34, 8), toon(0x3a3a46), 0, -0.34, 0, wrist);   // shaft
  const throat = add(new THREE.ConeGeometry(0.032, 0.09, 8), mJersey, 0, -0.53, 0, wrist); noOL(throat); // T-joint
  // racket head. Gear: r_light = slim teardrop, r_heavy = thick frame with weights at the top, r_pro = black and gold with tinted strings
  const rkS = ({ bc_racket: ['r_light', 'rings', 0xffffff], wn_racket: ['r_light', 'rings', 0xffffff], dv_racket: ['r_light', 'leaf', 0xff7a9a], be_racket: ['r_light', 'rings', 0x23232b], nj_racket: ['r_light', 'guard', 0xc22a3a], pr_racket: ['r_heavy', 'gem', 0xf2c230], cb_racket: ['r_heavy', 'star', 0xf2c230], ch_racket: ['r_heavy', 'rings', 0xc9d2e0], rk_racket: ['r_heavy', 'spikes', 0xc9d2e0], dt_racket: ['r_light', 'guard', 0x5a3d22], po_racket: ['r_heavy', 'star', 0xf2c230], pk_racket: ['r_heavy', 'leaf', 0x4f8f3a], as_racket: ['r_heavy', 'flame', 0xff8a3d], ry_racket: ['r_pro', 'gem', 0xc22a3a], hr_racket: ['r_heavy', 'star', 0xffd23f], wz_racket: ['r_light', 'star', 0xffe18a], rb_racket: ['r_heavy', 'cog', 0x5ad1ff], dn_racket: ['r_heavy', 'teeth', 0xffffff], fa_racket: ['r_light', 'bow', 0xffffff], an_racket: ['r_light', 'wings', 0xffe18a], sm_racket: ['r_pro', 'guard', 0xf2c230], dm_racket: ['r_pro', 'horns', 0xffb84d] })[GI.racket];   // set rackets: [frame shape, ornament, accent colour]
  const rk = rkS ? rkS[0] : GI.racket, fTube = rk === 'r_light' ? 0.011 : rk === 'r_heavy' ? 0.025 : rk === 'r_pro' ? 0.018 : 0.016, fSx = rk === 'r_light' ? 0.72 : rk === 'r_heavy' ? 0.86 : 0.8, fSy = rk === 'r_light' ? 1.2 : rk === 'r_heavy' ? 1.08 : 1.12;
  const frame = add(new THREE.TorusGeometry(0.15, fTube, 8, 32), toon(rk === 'r_pro' ? 0x23202e : GL.racket !== undefined ? GL.racket : 0x2f2f3a), 0, -0.71, 0, wrist); frame.scale.set(fSx, fSy, 1);   // string face looks forward (toward the net) like a forehand grip
  const paint = add(new THREE.TorusGeometry(0.15, rk === 'r_pro' ? 0.011 : 0.007, 6, 32, Math.PI * (rk === 'r_pro' ? 1.25 : 0.9)), rk === 'r_pro' ? toon(GL.racket) : rk ? mTrim : mJersey, 0, -0.71, 0, wrist); paint.scale.set(fSx * 1.05, fSy * 1.035, 1.12); paint.rotation.set(0, 0, Math.PI * (rk === 'r_pro' ? 0.875 : 1.05)); noOL(paint);
  if (rk === 'r_heavy') for (const sd of [-1, 1]) noOL(add(new THREE.SphereGeometry(0.03, 10, 8), toon(0x3a3a46), sd * 0.085, -0.71 - 0.135, 0, wrist));
  if (rk === 'r_pro') { const gl = add(new THREE.TorusGeometry(0.15, 0.03, 6, 32), new THREE.MeshBasicMaterial({ color: 0xffd76a, transparent: true, opacity: 0.22, depthWrite: false }), 0, -0.71, 0, wrist); gl.scale.set(fSx, fSy, 0.4); noOL(gl); noOL(add(new THREE.CylinderGeometry(0.0125, 0.0095, 0.34, 8), toon(GL.racket), 0, -0.34, 0, wrist)); }
  const strings = add(new THREE.CircleGeometry(0.145, 22), new THREE.MeshBasicMaterial({ map: stringTex, color: rk === 'r_pro' ? 0xffe9a8 : rk === 'r_light' ? 0xd8f3ff : rk === 'r_heavy' ? 0xffd0c8 : 0xffffff, transparent: true, opacity: rk ? 0.92 : 0.8, side: THREE.DoubleSide, depthWrite: false }), 0, -0.71, 0, wrist);
  strings.scale.set(fSx, fSy, 1);
  if (rkS) {   // a set racket: the ornament that makes it that set's racket
    const W = (geo, mat, x, y, z, ol) => { const m = add(geo, mat, x, y, z, wrist); if (!ol) noOL(m); return m; }, ac = toon(rkS[2]), top = -0.71 - 0.15 * fSy, thr = -0.71 + 0.15 * fSy, D2 = { side: THREE.DoubleSide };
    switch (rkS[1]) {
      case 'rings': for (const y of [-0.26, -0.33, -0.4, -0.47]) W(new THREE.TorusGeometry(0.017, 0.008, 5, 12), ac, 0, y, 0).rotation.x = Math.PI / 2; break;
      case 'guard': W(new THREE.CylinderGeometry(0.055, 0.055, 0.014, 14), ac, 0, -0.185, 0, true); W(new THREE.SphereGeometry(0.022, 8, 6), ac, 0, 0.02, 0); break;
      case 'gem': W(new THREE.OctahedronGeometry(0.04), ac, 0, thr + 0.03, 0, true).scale.set(0.8, 1.2, 0.6); W(new THREE.TorusGeometry(0.03, 0.007, 5, 12), toon(0xf2c230), 0, thr + 0.03, 0).scale.set(0.9, 1.3, 1); break;
      case 'star': for (const z of [0.012, -0.012]) W(new THREE.CircleGeometry(0.055, 5), basic(rkS[2], D2), 0, thr + 0.035, z).rotation.z = Math.PI / 10 + Math.PI; break;
      case 'spikes': for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, sp = W(new THREE.ConeGeometry(0.014, 0.045, 5), ac, Math.sin(a) * 0.15 * fSx * 1.12, -0.71 + Math.cos(a) * 0.15 * fSy * 1.1, 0); sp.rotation.z = -a; } break;
      case 'teeth': for (let i = -3; i <= 3; i++) { const a = Math.PI + i * 0.3, sp = W(new THREE.ConeGeometry(0.016, 0.05, 4), ac, Math.sin(a) * 0.15 * fSx * 1.1, -0.71 + Math.cos(a) * 0.15 * fSy * 1.1, 0); sp.rotation.z = -a; } break;
      case 'horns': for (const sd of [-1, 1]) { const hn = W(new THREE.ConeGeometry(0.024, 0.1, 8), ac, sd * 0.07, top - 0.03, 0, true); hn.rotation.z = Math.PI - sd * 0.45; } for (const [x, l] of [[-0.03, 0.06], [0, 0.085], [0.03, 0.06]]) W(new THREE.ConeGeometry(0.016, l, 5), basic(0xff7a1f), x, top - 0.02 - l / 2, 0).rotation.z = Math.PI; break;
      case 'flame': for (const [x, l, cc] of [[-0.035, 0.08, 0xff7a1f], [0, 0.12, 0xff7a1f], [0.035, 0.08, 0xff7a1f], [0, 0.07, 0xffe18a]]) W(new THREE.ConeGeometry(0.022, l, 6), basic(cc), x, 0.06 + l / 2, cc === 0xffe18a ? 0.012 : 0); W(new THREE.CylinderGeometry(0.028, 0.02, 0.05, 8), toon(0x5a6478), 0, 0.04, 0, true); break;
      case 'cog': { const cg = W(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 8), toon(0x5a6478), 0, thr + 0.03, 0, true); cg.rotation.x = Math.PI / 2; W(new THREE.SphereGeometry(0.018, 8, 6), basic(rkS[2]), 0, thr + 0.03, 0.014); W(new THREE.SphereGeometry(0.018, 8, 6), basic(rkS[2]), 0, thr + 0.03, -0.014); break; }
      case 'wings': for (const sd of [-1, 1]) for (const [y, len, rot] of [[0.05, 0.13, 1.0], [0.01, 0.1, 1.5]]) { const w = W(new THREE.SphereGeometry(0.03, 8, 6), toon(0xffffff), sd * (0.02 + Math.sin(rot) * len * 0.5), thr + 0.03 + y - Math.cos(rot) * len * 0.2, 0, true); w.scale.set(0.7, len / 0.06, 0.3); w.rotation.z = -sd * rot; } W(new THREE.TorusGeometry(0.035, 0.007, 5, 14), basic(rkS[2]), 0, top - 0.05, 0).rotation.x = Math.PI / 2; break;
      case 'leaf': for (const sd of [-1, 1]) { const lf = W(new THREE.SphereGeometry(0.035, 8, 6), ac, sd * 0.035, thr + 0.035, 0, true); lf.scale.set(0.55, 1.4, 0.3); lf.rotation.z = -sd * 0.8; } break;
      case 'bow': for (const sd of [-1, 1]) { const lb = W(new THREE.ConeGeometry(0.035, 0.065, 4), ac, sd * 0.04, thr + 0.03, 0, true); lb.rotation.z = sd * Math.PI / 2; lb.scale.z = 0.45; } W(new THREE.SphereGeometry(0.016, 8, 6), toon(0xffd23f), 0, thr + 0.03, 0.01); break;
    }
  }
  addOutlines(body, 0.018);
  root.traverse((m) => { if (m.isMesh && !m.userData.isOutline && !(m.material && m.material.transparent)) m.castShadow = true; });
  scene.add(root);
  const mdl = { root, body, head, arm, armEl: A.el, wrist, free, freeEl: F.el, freeWr: F.wr, feet, h, hips: hipsPv.p,
    rig: { hips: hipsPv.p, chest: chestPv.p, hipY, ankleY, legs },
    netRoom: Math.max(1, P.size * P.head * P.sq[0] / 1.274) * (c.ear === 'koala' ? 1.2 : 1),   // big-headed characters need more room in front of them at the net
    gear: { headGear, wristGear, shoes: feet, neck: neckG, back: backG, face: faceG, torso, shorts } };   // detachable groups for the later gear system
  // dive clearance, measured once from this model's own meshes: how far the lying body has to be lifted for the torso
  // to rest on the floor, and how far the head tips back so the face / snout does not go through it
  {
    const V = new THREE.Vector3(), sets = { torso: [], head: [] };
    body.traverse((o) => {
      if (!o.isMesh || o.userData.isOutline) return;
      let part = 'torso';
      for (let q = o; q && q !== body; q = q.parent) {
        if (q === head) { part = 'head'; break; }
        if (q === arm || q === free || legs.some((l) => l.thigh === q)) { part = null; break; }
      }
      if (part) sets[part].push(o);
    });
    const low = (list) => {
      root.updateMatrixWorld(true); let lo = Infinity;
      for (const o of list) { const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i++) { V.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); if (V.y < lo) lo = V.y; } }
      return lo;
    };
    const keep = [body.rotation.x, body.position.y, head.rotation.x];
    body.rotation.x = 1.25; body.position.y = 0.13;
    let lift = Math.max(0, 0.005 - low(sets.torso)); body.position.y += lift;
    let bestX = 0, bestLo = -Infinity;
    for (let hx = 0; hx >= -1.2001; hx -= 0.075) { head.rotation.x = hx; const lo = low(sets.head); if (lo > bestLo) { bestLo = lo; bestX = hx; } if (lo >= 0.005) break; }
    if (bestLo < 0.005) lift += 0.005 - bestLo;
    mdl.diveLift = lift; mdl.diveHeadX = bestX;
    body.rotation.x = keep[0]; body.position.y = keep[1]; head.rotation.x = keep[2]; root.updateMatrixWorld(true);
  }
  for (const leg of legs) SPAnim.legIK(mdl, leg, new THREE.Vector3(leg.hx, ankleY, 0.03), 0, 0);   // stand: feet flat on the floor
  setArm(mdl, 'arm', POSE.ready, 0, 0); setArm(mdl, 'free', FREE.rest, 0, 0);
  // secondary motion: tail and soft ears lag behind the body like springs (call once per frame after posing)
  const sp = { x: 0, vx: 0, z: 0, vz: 0, e: 0, ve: 0, prev: null, pyaw: null };
  const wpos = new THREE.Vector3(), wq = new THREE.Quaternion(), hq = new THREE.Quaternion(), eul = new THREE.Euler();
  mdl.update = (dt, t) => {
    if (!(dt > 0)) return;
    dt = Math.min(dt, 0.05);
    hipsPv.p.getWorldPosition(wpos); hipsPv.p.getWorldQuaternion(wq);
    eul.setFromQuaternion(wq, 'YXZ');
    let vF = 0, vS = 0, vY = 0, yawV = 0;
    if (sp.prev) {
      const dx = (wpos.x - sp.prev.x) / dt, dy = (wpos.y - sp.prev.y) / dt, dz = (wpos.z - sp.prev.z) / dt;
      const sy = Math.sin(eul.y), cy = Math.cos(eul.y);
      vF = dx * sy + dz * cy; vS = dx * cy - dz * sy; vY = dy;
      let dyaw = eul.y - sp.pyaw; while (dyaw > Math.PI) dyaw -= 2 * Math.PI; while (dyaw < -Math.PI) dyaw += 2 * Math.PI;
      yawV = dyaw / dt;
    }
    sp.prev = sp.prev || new THREE.Vector3(); sp.prev.copy(wpos); sp.pyaw = eul.y;
    // targets: moving forward lifts the tail back, sideways / turning swings it, falling flicks it up; plus a lazy idle wag
    const tx = clamp(vF * 0.09 - vY * 0.05, -0.6, 0.6) + Math.sin(t * 1.7) * 0.05;
    const tz = clamp(-vS * 0.12 - yawV * 0.06, -0.8, 0.8) + Math.sin(t * 2.3 + 1) * 0.12;
    const te = clamp(-vY * 0.08 + vF * 0.03, -0.5, 0.5);
    const K = 70, C = 9;   // spring stiffness / damping
    sp.vx += ((tx - sp.x) * K - sp.vx * C) * dt; sp.x += sp.vx * dt;
    sp.vz += ((tz - sp.z) * K - sp.vz * C) * dt; sp.z += sp.vz * dt;
    sp.ve += ((te - sp.e) * 110 - sp.ve * 10) * dt; sp.e += sp.ve * dt;
    for (const j of tailJoints) { j.g.rotation.x = j.rx + sp.x * j.k; j.g.rotation.z = sp.z * j.k * 0.8; }
    for (const e of earJoints) { e.g.rotation.x = e.rx + sp.e * e.soft * 0.6; e.g.rotation.z = e.rz - e.s * sp.z * e.soft * 0.15 + e.s * Math.abs(sp.e) * e.soft * 0.1; }
  };
  return mdl;
}

function buildShuttle() {
  const g = new THREE.Group();
  const cork = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xfff4e0)); g.add(cork);
  const cb = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 12), toon(0xff7a59)); cb.position.y = -0.01; g.add(cb);
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.085, 0.12, 14, 1, true), lambert(0xffffff, { side: THREE.DoubleSide, transparent: true, opacity: 0.92 }));
  skirt.position.y = -0.08; g.add(skirt);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.004, 4, 16), basic(0x6b8cff)); ring.rotation.x = Math.PI / 2; ring.position.y = -0.06; g.add(ring);
  addOutlines(g, 0.008); g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  g.scale.setScalar(1.8); scene.add(g); return g;
}

const spriteCache = new Map();
function emojiSprite(e) {
  if (!spriteCache.has(e)) {
    const tex = canvasTex(128, 128, (g) => {
      g.fillStyle = '#fff'; g.beginPath(); g.arc(64, 58, 50, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(52, 100); g.lineTo(64, 124); g.lineTo(76, 100); g.fill();
      g.font = '64px "Segoe UI Emoji","Apple Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e, 64, 62);
    });
    keepTex.add(tex); spriteCache.set(e, tex);
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: spriteCache.get(e), depthTest: false }));
  s.scale.set(0.8, 0.8, 1); s.renderOrder = 10; return s;
}
function nameSprite(text, color) {
  const tex = canvasTex(256, 64, (g, w) => {
    g.font = '800 30px Nunito, Segoe UI, sans-serif'; const tw = Math.min(w - 8, g.measureText(text).width + 28);
    g.fillStyle = color; g.beginPath();
    if (g.roundRect) g.roundRect((w - tw) / 2, 8, tw, 46, 23); else g.rect((w - tw) / 2, 8, tw, 46);
    g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, 32, w - 30);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.scale.set(1.05, 0.27, 1); s.renderOrder = 9; return s;
}

// trail, markers, rings
const TRAIL_N = 18;
const trailGeo = new THREE.BufferGeometry();
trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL_N * 3), 3));
const trail = new THREE.Points(trailGeo, new THREE.PointsMaterial({ color: 0xfff3b0, size: 0.11, transparent: true, opacity: 0.85, depthWrite: false }));
trail.frustumCulled = false; trail.visible = false; scene.add(trail);
const trailPts = [];
const dropGeo = new THREE.BufferGeometry();
dropGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
const dropLine = new THREE.LineSegments(dropGeo, new THREE.LineDashedMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, dashSize: 0.12, gapSize: 0.1 }));
dropLine.frustumCulled = false; dropLine.visible = false; scene.add(dropLine);
// service courts lit up before each serve (server's box + the receiver's diagonal box)
const serveBoxes = [0xff7a59, 0x6b8cff].map((c) => {
  const b = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), basic(c, { transparent: true, opacity: 0.22, depthWrite: false }));
  b.rotation.x = -Math.PI / 2; b.position.y = 0.03; b.visible = false; scene.add(b); return b;
});
function updateServeBoxes(m, t) {
  const show = m.state === 'serve' && m.athletes[m.serverIdx];
  for (const b of serveBoxes) b.visible = !!(settings.showServeBox && show);   // optional (off by default)
  if (!show) return;
  const T = m.athletes[m.serverIdx].team, right = m.score[T] % 2 === 0;
  const W = m.doubles ? S.DBL_W : S.HALF_W, back = m.doubles ? S.HALF_L - S.LONG_SERVE : S.HALF_L;
  [T, 1 - T].forEach((team, k) => {
    const b = serveBoxes[k], sx = S.sgn(team) * (right ? 1 : -1), sz = S.sgn(team);
    b.scale.set(W, back - S.SHORT_LINE, 1);
    b.position.x = sx * W / 2; b.position.z = sz * (S.SHORT_LINE + back) / 2;
    b.material.color.setHex(team === session.myTeam ? 0xff7a59 : 0x6b8cff);
    b.material.opacity = 0.3 + Math.sin(t * 4) * 0.08;
  });
}
const marker = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.33, 32), basic(0xffffff, { transparent: true, opacity: 0.95, depthWrite: false }));
marker.rotation.x = -Math.PI / 2; marker.position.y = 0.045; marker.visible = false; scene.add(marker);
// an X inside the ring when the shuttle is going out (so in/out never depends on telling two colours apart)
const markerX = new THREE.Group();
for (const r of [Math.PI / 4, -Math.PI / 4]) { const bar = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.08), basic(0xff3b3b, { transparent: true, opacity: 0.95, depthWrite: false })); bar.rotation.z = r; markerX.add(bar); }
const markerDot = new THREE.Mesh(new THREE.CircleGeometry(0.1, 20), basic(0xffffff, { transparent: true, opacity: 0.95, depthWrite: false }));
const markerEdge = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.38, 32), basic(0x14122e, { transparent: true, opacity: 0.85, depthWrite: false }));
markerEdge.position.z = -0.002; markerEdge.renderOrder = 19;
const markerDotEdge = new THREE.Mesh(new THREE.CircleGeometry(0.14, 20), basic(0x14122e, { transparent: true, opacity: 0.85, depthWrite: false }));
markerDotEdge.position.z = -0.001;
marker.add(markerEdge); marker.add(markerX); marker.add(markerDotEdge); marker.add(markerDot);
// always drawn on top so the call is visible even when a player is standing on the spot
for (const mm of [marker, markerDot, ...markerX.children]) { mm.material.depthTest = false; mm.renderOrder = 21; }
for (const mm of [markerEdge, markerDotEdge]) { mm.material.depthTest = false; mm.renderOrder = 20; }
const reachRing = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.06, 40), basic(0xffffff, { transparent: true, opacity: 0.25, depthWrite: false }));
reachRing.rotation.x = -Math.PI / 2; reachRing.position.y = 0.04; reachRing.visible = false; scene.add(reachRing);
// aim preview: where the charged shot will land
const aimMark = new THREE.Group(); aimMark.visible = false; scene.add(aimMark);
const aimRing = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.55, 36), basic(0xff7a59, { transparent: true, opacity: 0.9, depthWrite: false }));
const aimDot = new THREE.Mesh(new THREE.CircleGeometry(0.16, 24), basic(0xffffff, { transparent: true, opacity: 0.95, depthWrite: false }));
const aimBand = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.7), basic(0xff7a59, { transparent: true, opacity: 0.25, depthWrite: false }));
for (const o of [aimRing, aimDot, aimBand]) { o.rotation.x = -Math.PI / 2; o.renderOrder = 3; aimMark.add(o); }
aimMark.position.y = 0.05;
const timingRing = new THREE.Mesh(new THREE.RingGeometry(0.94, 1.0, 48), basic(0xffd23f, { transparent: true, opacity: 0.9, depthWrite: false }));
timingRing.rotation.x = -Math.PI / 2; timingRing.position.y = 0.042; timingRing.visible = false; scene.add(timingRing);
let shuttleMesh = null, shuttleShadow = null;

// ================================================================ session
let session = null;
let excite = 0;
let paused = false;

function makeView(start) {
  const doubles = start.mode === '2v2';
  return {
    opts: { mode: start.mode, points: start.points, games: start.games || 1, venue: start.venue }, doubles, games: [0, 0], gameNo: 1, halfW: doubles ? S.DBL_W : S.HALF_W,
    athletes: start.slots.map((s, i) => ({
      i, team: doubles ? (i < 2 ? 0 : 1) : (i < 1 ? 0 : 1), name: s.name, char: s.char, hand: s.hand, ctrl: s.ctrl, st: S.charStats(s.char, s.gear), gear: s.gear || [],
      assist: s.ctrl === 'human' ? 1 : 0,                                            // the server plays every human with the same hit help
      diff: s.ctrl === 'bot' && Number.isInteger(s.diff) ? s.diff : undefined,       // server bots: difficulty (newer servers send it)
      x: 0, z: 0, jumpY: 0, vx: 0, vz: 0, swingT: -1, swingHigh: true, diveT: -1, recoverT: 0, diveDx: 0, diveDz: 0, mood: 0, emote: 0, splitT: 0,
      stats: {},
    })),
    shuttle: { p: { x: 0, y: 1, z: 0 }, v: { x: 0, y: 0, z: 0 }, live: false, held: true, netted: false, landed: false, last: -1, lastTeam: -1, pred: null },
    score: [0, 0], state: 'serve', stateT: 0, serverIdx: 0, wind: { x: 0, z: 0 }, events: [], rally: 0,
  };
}

function beginSession(kind, m, me, extra) {
  endSession();
  if (document.activeElement && document.activeElement !== document.body && document.activeElement.blur) document.activeElement.blur();   // leave any menu/chat box
  hideScreens();
  session = Object.assign({ kind, m, me, myTeam: me >= 0 ? m.athletes[me].team : 0, acc: 0, snaps: [], presentationEvents: [], maxDeficit: 0, over: false }, extra || {});
  setVenue(m.opts.venue);
  const mates = new Set(m.athletes.filter((a) => a.team === session.myTeam).map((a) => a.i));
  session.models = m.athletes.map((a) => {
    const model = buildCharacter(charById(a.char), mates.has(a.i) ? 0xff7a59 : 0x6b8cff, PLAYER_SCALE, a.hand, a.gear);
    const shadow = blob(0.95);
    let tag = null;
    if (kind !== 'local' || m.doubles) {
      tag = nameSprite(a.i === me ? 'Bạn' : a.name, mates.has(a.i) ? '#ff7a59' : '#6b8cff');
      model.root.add(tag); tag.position.y = 1.95;
    }
    return { model, shadow, tag, emoteSprite: null, emoteShown: 0, yaw: a.team === 0 ? Math.PI : 0 };
  });
  shuttleMesh = buildShuttle(); shuttleShadow = blob(0.4);
  session.officials = settings.gfx >= 1 ? buildOfficials() : null;   // umpire + scoreboard are scenery: left out at the low graphics level
  trailPts.length = 0;
  $('hud').classList.remove('hidden');
  $('over').classList.add('hidden'); $('pause').classList.add('hidden');
  $('touch').classList.toggle('hidden', !(isTouch && me >= 0));
  $('chatBtn').classList.toggle('hidden', kind === 'local' || !settings.chat);
  $('emoteBtn').classList.toggle('hidden', me < 0);
  $('pauseBtn').classList.toggle('hidden', kind === 'watch');
  $('spectBar').classList.toggle('hidden', kind !== 'watch');
  $('ping').classList.toggle('hidden', kind === 'local');
  $('chatLog').innerHTML = '';
  const teamNames = (t) => m.athletes.filter((a) => a.team === t).map((a) => (a.i === me ? 'Bạn' : a.name)).join(' & ');
  const L = session.myTeam;
  $('nameA').textContent = $('nameA').title = teamNames(L); $('nameB').textContent = $('nameB').title = teamNames(1 - L);
  session.gamesTxt = '';
  setTargetText();
  $('venueName').textContent = S.VENUES[m.opts.venue].name;
  $('wind').classList.toggle('hidden', S.VENUES[m.opts.venue].wind === 'none');
  lastScore = '';
  updateScore();
  paused = false;
  const help = $('ctrlHelp');
  if (me >= 0) {
    const K = (a) => '<kbd>' + esc(keyLabel(keymap[a])) + '</kbd>';
    const runTxt = kind === 'local' && settings.assist >= 1 ? 'chạy (đứng yên thì tự chạy tới cầu)' : kind === 'local' ? 'chạy tới dưới quả cầu' : 'chạy tới dưới quả cầu (online không tự chạy)';
    help.innerHTML = settings.ctrl === 'simple' ? (isTouch
      ? '<span>' + icon('stick') + 'Chạm bên trái</span><span>' + runTxt + '</span><span>' + icon('shuttle') + 'Nút cú đánh</span><span><b>PHÔNG</b> đánh cao · <b>ĐẬP</b> đập/tạt · <b>BỎ NHỎ</b> sát lưới · <b>NHẢY</b> rồi ĐẬP = đập trên cao</span><span>' + icon('clock') + 'Bấm sớm</span><span>cũng được — cầu tới vợt là tự vung</span><span>' + icon('target') + 'Kéo cần</span><span>sang trái/phải lúc đã bấm = đánh về góc đó</span>'
      : '<span><kbd>W A S D</kbd></span><span>' + runTxt + '</span><span>' + K('hit') + ' / chuột trái</span><span><b>Phông cầu</b> (đánh cao, an toàn)</span><span>' + K('smash') + ' / chuột phải</span><span><b>Đập</b> khi cầu cao · <b>tạt</b> khi cầu ngang người</span><span>' + K('drop') + '</span><span><b>Bỏ nhỏ</b> sát lưới</span><span>' + K('jump') + '</span><span><b>Nhảy</b> — nhảy rồi bấm ' + K('smash') + ' = đập trên cao</span><span>' + icon('clock') + 'Bấm sớm</span><span>cũng được — cầu tới vợt là tự vung · <kbd>A</kbd>/<kbd>D</kbd> chọn góc</span>')
      : isTouch
      ? '<span>' + icon('stick') + 'Chạm bên trái</span><span>' + runTxt + '</span><span>' + icon('shuttle') + 'Giữ <b>ĐÁNH</b></span><span>nạp lực, <b>thả ra để đánh</b></span><span>' + icon('bolt') + 'Lực</span><span><b>nhẹ</b> bỏ nhỏ · <b>vừa</b> phông · <b>đầy</b> đập</span><span>' + icon('target') + 'Đang giữ</span><span>kéo cần <b>trái/phải</b> = đánh về góc đó</span>'
      : '<span><kbd>W A S D</kbd></span><span>' + runTxt + '</span><span>Giữ <kbd>Space</kbd> / chuột</span><span>nạp lực, <b>thả ra để đánh</b></span><span>' + icon('bolt') + 'Lực</span><span><b>nhẹ</b> = bỏ nhỏ · <b>vừa</b> = phông cầu · <b>đầy</b> = đập</span><span>' + icon('target') + 'Đang giữ</span><span><kbd>A</kbd>/<kbd>D</kbd> = <b>đánh sang trái/phải</b></span><span>' + icon('sparkle') + 'Vòng xanh</span><span>lúc thả đẹp nhất · <kbd>C</kbd> đổi góc nhìn</span>';
    // only for the first few matches; any key / tap closes it (the full guide is in the menu)
    if (settings.helpN < 4) {
      settings.helpN++; saveAll();
      help.classList.remove('hidden'); help.style.animation = 'none'; void help.offsetWidth; help.style.animation = '';
      clearTimeout(help._t); help._t = setTimeout(() => help.classList.add('hidden'), 6000);
    } else help.classList.add('hidden');
  } else help.classList.add('hidden');
  Sound.whistle();
  if (me >= 0 && !P.venues.includes(S.VENUES[m.opts.venue].id)) { P.venues.push(S.VENUES[m.opts.venue].id); saveAll(); }
}

function endSession() {
  if (!session) return;
  aimMark.visible = false;
  for (const md of session.models) { scene.remove(md.model.root); disposeTree(md.model.root); scene.remove(md.shadow); disposeTree(md.shadow); }
  if (session.officials) session.officials.dispose();
  if (shuttleMesh) { scene.remove(shuttleMesh); disposeTree(shuttleMesh); shuttleMesh = null; }
  if (shuttleShadow) { scene.remove(shuttleShadow); disposeTree(shuttleShadow); shuttleShadow = null; }
  marker.visible = reachRing.visible = timingRing.visible = trail.visible = dropLine.visible = false;
  for (const b of serveBoxes) b.visible = false;
  session = null;
  $('hud').classList.add('hidden'); $('touch').classList.add('hidden');
  $('emoteWheel').classList.add('hidden'); $('chatForm').classList.add('hidden');
}

function startLocal(opts) {
  const d = opts.diff;
  const oppPool = S.CHARS.filter((c) => c.id !== profile.char && !c.unlock);
  const pick = () => oppPool.splice(Math.floor(Math.random() * oppPool.length), 1)[0].id;
  const names = BOT_NAMES.slice().sort(() => Math.random() - 0.5);
  const botHand = () => (Math.random() < 0.18 ? 'L' : 'R');
  const slots = [{ name: profile.name, char: profile.char, ctrl: 'human', assist: settings.assist, hand: settings.hand, gear: myGear() }];
  if (opts.mode === '2v2') slots.push({ name: names[0], char: pick(), ctrl: 'bot', diff: 3, hand: botHand() });   // the partner bot always plays at master level
  slots.push({ name: opts.oppName || names[1], char: opts.opp || pick(), ctrl: 'bot', diff: d, hand: botHand() });
  if (opts.mode === '2v2') slots.push({ name: names[2], char: pick(), ctrl: 'bot', diff: d, hand: botHand() });
  const venueIdx = opts.venue < 0 ? Math.floor(Math.random() * S.VENUES.length) : opts.venue;
  const m = S.createMatch({ mode: opts.mode, points: opts.points, games: opts.games || 1, venue: venueIdx, slots, hitStop: settings.hitStop, autoSplit: settings.autoSplit });
  beginSession('local', m, 0, { localOpts: opts, snapCam: true, tourRound: opts.tourRound });
}

// ================================================================ input
const keys = {};
const edges = { hit: false, jump: false, dive: false, emote: 0, power: -1 };
// hold-to-charge hitting
const CHARGE_TIME = 0.75;
const hold = { on: false, t0: 0, last: 0, shownUntil: 0 };
const chargeNow = () => (hold.on ? clamp((performance.now() - hold.t0) / 1000 / CHARGE_TIME, 0, 1) : 0);
// simple controls: one key per shot; each maps to a fixed power the sim understands
const SHOT_POWER = { hit: 0.55, smash: 0.9, drop: 0.12 };
const queued = { power: -1, until: 0 };
function pressShot(kind) {
  if (!session || session.me < 0 || paused || session.over) return;
  const p = SHOT_POWER[kind];
  edges.hit = true; edges.power = p;
  hold.last = p; hold.shownUntil = performance.now() + 450;
  queued.power = p; queued.until = performance.now() + 1500;
  if (tm.shown && tm.t !== null) tm.press = tm.t;   // mark on the timing meter where you pressed
  const meA = session.m.athletes[session.me];
  if (kind === 'smash' && meA && meA.sta !== undefined && meA.sta < 0.15) popup('Hết sức bật nhảy!', 'bad', { x: meA.x, y: 2.1, z: meA.z });   // too tired: K plays a drive
}
const isShotKey = (act) => act === 'hit' || act === 'smash' || act === 'drop';
function startHold() {
  if (!session || session.me < 0 || paused || session.over || hold.on) return;
  hold.on = true; hold.t0 = performance.now();
}
function releaseHold() {
  if (!hold.on) return;
  const p = chargeNow();
  hold.on = false; hold.last = p; hold.shownUntil = performance.now() + 450;
  edges.hit = true; edges.power = p;
}
const touchVec = { x: 0, y: 0 };
let rebinding = null;
// only a VISIBLE text box counts as typing (a hidden room-chat box that kept focus used to swallow every key in a match)
const typing = () => { const a = document.activeElement; return !!a && (a.tagName === 'INPUT' || a.tagName === 'SELECT' || a.tagName === 'TEXTAREA') && a.offsetParent !== null; };
function actionFor(k) {
  for (const a in keymap) if (keymap[a] === k) return a;
  return ({ arrowup: 'up', arrowdown: 'down', arrowleft: 'left', arrowright: 'right', ' ': 'jump', shift: 'dive' })[k] || null;
}
addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  Sound.init();
  if (rebinding) { e.preventDefault(); if (k !== 'escape') { keymap[rebinding] = k; saveAll(); } rebinding = null; renderKeys(); return; }
  if (typing()) { if (k === 'escape') document.activeElement.blur(); return; }
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  if (!session) return;
  // Movement stays latched until keyup; one-shot actions must not repeat when held.
  if (e.repeat) return;
  if (k === 'escape' || k === 'p') { togglePause(); return; }
  const act = actionFor(k);
  if (act === 'chat' && session.kind !== 'local' && settings.chat) { e.preventDefault(); openChat(); return; }
  if (k === 'c') { cycleCam(); return; }
  if (/^[1-8]$/.test(k)) { if (session.me >= 0) edges.emote = +k; return; }
  if (act === 'emote') { if (session.me >= 0) $('emoteWheel').classList.toggle('hidden'); return; }
  if (isShotKey(act) && !keys[act]) { if (act === 'hit' && settings.ctrl === 'charge') startHold(); else pressShot(act); }
  else if (!keys[act] && (act === 'jump' || act === 'dive')) edges[act] = true;
  if (act) keys[act] = true;
});
const closeHelp = () => { const h = $('ctrlHelp'); if (h && !h.classList.contains('hidden')) h.classList.add('hidden'); };
addEventListener('pointerdown', closeHelp, true);
addEventListener('keyup', (e) => {
  if (session) closeHelp(); const act = actionFor(e.key.toLowerCase()); if (act) keys[act] = false; if (act === 'hit') releaseHold(); });
addEventListener('pointerup', (e) => { if (e.pointerType === 'mouse' && e.button === 0) releaseHold(); });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; hold.on = false; if (session && session.kind === 'local' && !paused && !session.over) togglePause(); });

function readMove() {
  let x = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), y = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
  x += touchVec.x; y += touchVec.y;
  const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
  return { x, y };
}

const isTouch = ('ontouchstart' in window || navigator.maxTouchPoints > 0) && !(window.matchMedia && matchMedia('(pointer:fine)').matches);
canvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'mouse' || !session || session.me < 0 || paused) return;
  Sound.init();
  if (e.button === 0) { if (settings.ctrl === 'charge') startHold(); else pressShot('hit'); }
  else if (e.button === 2) pressShot('smash');
  else if (e.button === 1) { e.preventDefault(); pressShot('drop'); }
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
(function setupTouch() {
  const stick = $('stick'), knob = $('knob'), zone = $('stickZone');
  let id = null, cx = 0, cy = 0;
  zone.addEventListener('pointerdown', (e) => {
    id = e.pointerId; zone.setPointerCapture(id); cx = e.clientX; cy = e.clientY;
    const half = stick.offsetWidth / 2;
    stick.style.left = (cx - half) + 'px'; stick.style.top = (cy - half) + 'px'; stick.style.bottom = 'auto'; stick.style.right = 'auto';
    stick.classList.add('active'); move(e); Sound.init();
  });
  zone.addEventListener('pointermove', (e) => { if (e.pointerId === id) move(e); });
  const end = (e) => { if (e.pointerId !== id) return; id = null; touchVec.x = touchVec.y = 0; knob.style.transform = ''; stick.classList.remove('active'); stick.style.left = ''; stick.style.top = ''; stick.style.bottom = ''; stick.style.right = ''; };
  zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
  function move(e) {
    const R = 56 * settings.touch, dead = 0.14 * R;     // generous radius, radial dead zone, full speed at the rim
    let dx = e.clientX - cx, dy = e.clientY - cy; const l = Math.hypot(dx, dy);
    if (l > R) { dx *= R / l; dy *= R / l; }
    knob.style.transform = `translate(${dx}px,${dy}px)`;
    const m = Math.min(l, R), k = m > dead ? (m - dead) / (R - dead) / m : 0;
    touchVec.x = dx * k; touchVec.y = dy * k;
  }
  const buzz = () => { try { if (navigator.vibrate) navigator.vibrate(10); } catch (err) { /* not allowed: ignore */ } };
  document.querySelectorAll('.tb').forEach((b) => {
    const pad = document.createElement('i'); pad.className = 'pad'; b.appendChild(pad);   // invisible padding: bigger target than drawing
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer */ } const k = b.dataset.k; buzz();
      if (k === 'hit' && settings.ctrl === 'charge') startHold(); else if (isShotKey(k)) pressShot(k); else edges[k] = true;
      b.classList.add('down'); Sound.init();
    });
    const up = () => { b.classList.remove('down'); if (b.dataset.k === 'hit') releaseHold(); };
    b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up);
  });
  // the touch layer never scrolls, zooms, selects or opens a context menu
  const layer = $('touch');
  for (const type of ['contextmenu', 'selectstart', 'dblclick', 'gesturestart', 'gesturechange']) layer.addEventListener(type, (e) => e.preventDefault());
  layer.addEventListener('touchmove', (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });
  if (isTouch) for (const type of ['gesturestart', 'gesturechange']) document.addEventListener(type, (e) => e.preventDefault());
})();

// ================================================================ HUD helpers
function setHint(t) {
  const el = $('hint'); if (el.textContent === t) return;
  el.textContent = t;
  if (isTouch) { el.classList.remove('show'); if (t) { void el.offsetWidth; el.classList.add('show'); } }   // touch HUD declutter: show briefly, then fade
}
let lastScore = '';
function setTargetText() {
  const m = session.m, L = session.myTeam, g = m.games || [0, 0];
  const bo = (m.opts.games || 1) > 1;
  const txt = 'tới ' + m.opts.points + (bo ? ` · Ván ${m.gameNo || 1}` : '');
  const sub = bo ? `Ván thắng ${g[L]} – ${g[1 - L]}` : (session.tourRound !== undefined ? TOUR[session.tourRound].name : '');
  const key = txt + sub;
  if (session.gamesTxt === key) return;
  session.gamesTxt = key;
  $('target').innerHTML = esc(txt) + (sub ? '<small>' + esc(sub) + '</small>' : '');
}
function updateStamina() {
  const m = session.m, L = session.myTeam;
  const mine = session.me >= 0 ? m.athletes[session.me] : m.athletes.find((a) => a.team === L);
  const opp = m.athletes.filter((a) => a.team !== L).reduce((x, y) => ((y.sta ?? 1) < (x.sta ?? 1) ? y : x));
  for (const [id, a] of [['staA', mine], ['staB', opp]]) {
    const el = $(id); if (!el || !a) continue;
    const v = a.sta === undefined ? 1 : a.sta;
    el.firstChild.style.width = Math.round(v * 100) + '%';
    el.classList.toggle('mid', v < 0.6 && v >= 0.3); el.classList.toggle('low', v < 0.3);
  }
}
function updateScore(bump) {
  if (!session) return;
  updateStamina();
  setTargetText();
  const sc = session.m.score, L = session.myTeam;
  const key = sc[0] + ':' + sc[1];
  if (key === lastScore && bump === undefined) return;
  $('scoreA').textContent = sc[L]; $('scoreB').textContent = sc[1 - L];
  if (bump !== undefined) { const el = $(bump === L ? 'scoreA' : 'scoreB'); el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  lastScore = key;
}
const tmpV = new THREE.Vector3();
function popup(text, cls, pos) {
  const el = document.createElement('div'); el.className = 'pop ' + (cls || ''); el.textContent = text;
  if (isTouch && !pos && session && session.me >= 0) { const me = session.m.athletes[session.me]; pos = { x: me.x, y: 1.7 + (me.jumpY || 0), z: me.z }; }
  let x = viewW / 2, y = viewH * 0.36;
  if (pos) { tmpV.set(pos.x, pos.y, pos.z).project(camera); x = (tmpV.x + 1) / 2 * viewW; y = (1 - tmpV.y) / 2 * viewH; }
  el.style.left = clamp(x, 60, viewW - 60) + 'px'; el.style.top = clamp(y, 60, viewH - 60) + 'px';
  $('popups').appendChild(el); setTimeout(() => el.remove(), isTouch ? 520 : 1000);
}
function toast(title, sub, ic) {
  const el = document.createElement('div'); el.className = 'toast';
  el.innerHTML = (ic ? icon(ic) : '') + esc(title) + (sub ? `<small>${esc(sub)}</small>` : '');
  $('toasts').appendChild(el); setTimeout(() => el.remove(), 4000);
}
function chatLine(from, text) {
  const el = document.createElement('div');
  el.innerHTML = (from ? `<b>${esc(from)}:</b> ` : '') + esc(text);
  $('chatLog').appendChild(el);
  while ($('chatLog').children.length > 6) $('chatLog').firstChild.remove();
  setTimeout(() => el.remove(), 9000);
}
function openChat() { $('chatForm').classList.remove('hidden'); $('chatInput').focus(); }
$('chatForm').addEventListener('submit', (e) => {
  e.preventDefault(); const t = $('chatInput').value.trim();
  if (t) Net.send({ t: 'chat', text: t });
  $('chatInput').value = ''; $('chatInput').blur(); $('chatForm').classList.add('hidden');
});
$('chatInput').addEventListener('blur', () => setTimeout(() => $('chatForm').classList.add('hidden'), 100));
$('chatBtn').onclick = openChat;
(function buildEmoteWheel() {
  const w = $('emoteWheel');
  EMOTES.forEach((e, i) => {
    const b = document.createElement('button'); b.innerHTML = `${e}<small>${i + 1}</small>`;
    b.onclick = () => { edges.emote = i + 1; w.classList.add('hidden'); };
    w.appendChild(b);
  });
  $('emoteBtn').onclick = () => w.classList.toggle('hidden');
})();

// ---- rejoin: the server keeps the seat (a bot plays it) while the match runs; this bar is the way back in
function renderRejoin() {
  const o = Net.rejoin, show = !!(o && o.id) && !(session && !session.over);
  $('rejoinBar').classList.toggle('hidden', !show);
  if (show) $('rejoinText').textContent = 'Trận của bạn vẫn đang chạy' + (o.score ? ' · ' + o.score[0] + ' – ' + o.score[1] : '') + ', bot đang đánh thay';
}
$('rejoinBtn').onclick = () => { Sound.init(); Sound.boop(); if (Net.rejoin && Net.rejoin.id) Net.send({ t: 'rejoin', id: Net.rejoin.id }); };
$('rejoinX').onclick = () => { Net.rejoin = null; renderRejoin(); };
// ---- someone asks to trade seats with me
let swapAskT = null;
function showSwapAsk(msg) {
  const el = $('roomAsk'); clearTimeout(swapAskT);
  el.innerHTML = `<span><b>${esc(msg.name)}</b> muốn đổi chỗ với bạn</span><button class="pill" data-ok="1">Đồng ý</button><button class="pill" data-ok="0">Không</button>`;
  el.classList.remove('hidden'); Sound.pop();
  const done = (ok) => { clearTimeout(swapAskT); el.classList.add('hidden'); Net.send({ t: 'swapReply', from: msg.from, ok }); };
  el.querySelectorAll('button').forEach((b) => { b.onclick = () => done(b.dataset.ok === '1'); });
  swapAskT = setTimeout(() => done(false), 20000);
}

// ================================================================ gear / shop (the server owns items and gold; this shows them and sends requests)
const myGear = () => (wallet && wallet.equip && wallet.items ? Object.values(wallet.equip).filter((id) => wallet.items.includes(id)).map((id) => (wallet.lv && wallet.lv[id] ? id + '+' + wallet.lv[id] : id)) : []);
let gearSlot = 'racket', gearTry = null, gearTrySet = null;
// what the stage character wears: my gear, with the item being looked at swapped into its slot
function previewGear() {
  const worn = myGear(), g = gearTry && S.gearById(gearTry);
  if (screen === 'shop' && gearSlot === 'sets' && gearTrySet) { const ps = S.GEAR.filter((x) => x.set === gearTrySet), sl = new Set(ps.map((x) => x.slot)); return worn.filter((id) => !sl.has(S.gearById(id).slot)).concat(ps.map((x) => x.id)); }
  return g ? worn.filter((id) => S.gearById(id).slot !== g.slot).concat(g.id) : worn;
}
const STAT_NAMES = { spd: 'Tốc độ', jmp: 'Bật nhảy', pow: 'Lực đập', rch: 'Tầm với', ctl: 'Khéo léo', sta: 'Thể lực' };
const gearModChips = (mods) => Object.entries(mods).filter(([, v]) => Math.abs(v) > 1e-9).map(([k, v]) => `<em class="${v > 0 ? 'up' : 'dn'}">${v > 0 ? '+' : '−'}${Math.round(Math.abs(v) * 100) / 100} ${STAT_NAMES[k]}</em>`).join('');
function renderGearStats(c, shown) {
  const eff = S.effStats(c.id, shown);
  $('gearStats').innerHTML = Object.keys(STAT_NAMES).map((k) => {
    const d = Math.round((eff[k] - c.stats[k]) * 100) / 100;
    return `<span>${STAT_NAMES[k]}</span><div class="bar"><i style="width:${Math.min(100, eff[k] / 7 * 100)}%"></i></div><b class="${d > 0 ? 'up' : d < 0 ? 'dn' : ''}">${d > 0 ? '+' + d : d < 0 ? '−' + Math.abs(d) : ''}</b>`;
  }).join('');
}
// Wardrobe: wear what you already own. Slot tiles stand round the character; the panel lists the owned items of the chosen slot
// and compares the picked one with what is worn now.
// drag an owned item onto a slot tile or onto the character to wear it; drag a worn tile away to take it off.
// Mouse: drag starts after a few pixels. Touch: press and hold (a plain swipe still scrolls the list).
let wdDrag = null, wdDragEnd = 0;
function wdDragInit() {
  const clearHot = () => document.querySelectorAll('.wd-slot.hot').forEach((e) => e.classList.remove('hot'));
  const target = (d, x, y) => {     // what dropping here would do: 'on', 'off' or null
    const el = document.elementFromPoint(x, y); if (!el) return null;
    const tile = el.closest && el.closest('.wd-slot'), inPanel = el.closest && el.closest('.panel');
    if (d.from === 'inv') return tile || !inPanel ? 'on' : null;
    return tile ? null : 'off';
  };
  const begin = (d, x, y) => {
    const it = S.gearById(d.id); d.on = true;
    d.ghost = document.createElement('div'); d.ghost.className = 'wd-ghost r' + it.rar; d.ghost.innerHTML = gearIconImg(d.id); document.body.appendChild(d.ghost);
    document.body.classList.add('wd-dragging');
    const tile = document.querySelector(`#wdSlots .wd-slot[data-slot="${it.slot}"]`); if (tile && d.from === 'inv') tile.classList.add('drop');
    if (d.touch && navigator.vibrate) { try { navigator.vibrate(12); } catch (e) { /* not allowed */ } }
    move(d, x, y);
  };
  const move = (d, x, y) => {
    d.ghost.style.left = x + 'px'; d.ghost.style.top = y + 'px';
    const act = target(d, x, y); clearHot(); d.ghost.classList.toggle('ok', !!act); d.ghost.classList.toggle('off', act === 'off');
    if (act === 'on') { const tile = document.querySelector(`#wdSlots .wd-slot[data-slot="${S.gearById(d.id).slot}"]`); if (tile) tile.classList.add('hot'); }
  };
  const start = (ev, id, from) => {
    if (ev.button > 0 || !id || screen !== 'gear') return;
    if (wdDrag) clearTimeout(wdDrag.timer);
    const d = wdDrag = { id, from, x0: ev.clientX, y0: ev.clientY, pid: ev.pointerId, on: false, touch: ev.pointerType === 'touch', ghost: null, timer: 0 };
    if (d.touch) d.timer = setTimeout(() => { if (wdDrag === d && !d.on) begin(d, d.x0, d.y0); }, 260);
  };
  $('wdInv').addEventListener('pointerdown', (ev) => { const el = ev.target.closest('.wd-item'); if (el) start(ev, el.dataset.item, 'inv'); });
  $('wdSlots').addEventListener('pointerdown', (ev) => { const el = ev.target.closest('.wd-slot'), it = el && S.gearSet(myGear())[el.dataset.slot]; if (it) start(ev, it.id, 'slot'); });
  window.addEventListener('pointermove', (ev) => {
    const d = wdDrag; if (!d || ev.pointerId !== d.pid) return;
    if (!d.on) {
      if (Math.hypot(ev.clientX - d.x0, ev.clientY - d.y0) < 9) return;
      if (d.touch) { clearTimeout(d.timer); wdDrag = null; return; }     // a swipe: let the list scroll
      begin(d, ev.clientX, ev.clientY);
    } else move(d, ev.clientX, ev.clientY);
  });
  const end = (ev, cancelled) => {
    const d = wdDrag; if (!d || ev.pointerId !== d.pid) return;
    clearTimeout(d.timer); wdDrag = null; if (!d.on) return;
    const act = cancelled ? null : target(d, ev.clientX, ev.clientY), it = S.gearById(d.id);
    d.ghost.remove(); document.body.classList.remove('wd-dragging'); clearHot(); document.querySelectorAll('.wd-slot.drop').forEach((e) => e.classList.remove('drop'));
    wdDragEnd = performance.now();
    if (act) { Sound.boop(); gearTry = null; gearSlot = it.slot; Net.send({ t: 'equip', slot: it.slot, id: act === 'on' ? it.id : null }); showPreview(true); renderGear(); }
  };
  window.addEventListener('pointerup', (ev) => end(ev, false)); window.addEventListener('pointercancel', (ev) => end(ev, true));
  window.addEventListener('touchmove', (ev) => { if (wdDrag && wdDrag.on && ev.cancelable) ev.preventDefault(); }, { passive: false });
  window.addEventListener('contextmenu', (ev) => { if (wdDrag) ev.preventDefault(); });
}
function renderGear() {
  if (gearSlot === 'sets' || gearSlot === 'chests') gearSlot = 'head';
  if (!wdDragInit.done) { wdDragInit.done = true; wdDragInit(); }
  const c = charById(profile.char), worn = myGear(), set = S.gearSet(worn), shown = previewGear(), items = (wallet && wallet.items) || [];
  const slotName = (S.GEAR_SLOTS.find((s) => s[0] === gearSlot) || ['', ''])[1], cur = set[gearSlot] || null;
  $('wdSlots').innerHTML = S.GEAR_SLOTS.map(([k, n]) => { const it = set[k]; return `<button class="wd-slot${k === gearSlot ? ' on' : ''}${it ? ' r' + it.rar : ' empty'}" data-slot="${k}">${it ? gearIconImg(it.id) : '<i>+</i>'}<span>${n}</span></button>`; }).join('');
  const own = S.GEAR.filter((it) => it.slot === gearSlot && items.includes(it.id));
  $('wdSlotName').textContent = slotName; $('wdCount').textContent = wallet ? `${own.length}/${S.GEAR.filter((it) => it.slot === gearSlot).length} món đã có` : '';
  $('wdInv').innerHTML = !wallet ? '<p class="tiny">Đang kết nối máy chủ… Trang bị cần có mạng.</p>'
    : own.length ? own.map((it) => `<button class="wd-item r${it.rar}${cur && cur.id === it.id ? ' worn' : ''}${gearTry === it.id ? ' on' : ''}" data-item="${it.id}">${gearIconImg(it.id)}<span>${esc(it.name)}</span>${cur && cur.id === it.id ? '<em>Đang mặc</em>' : ''}</button>`).join('')
    : `<div class="wd-none"><p>Bạn chưa có món nào cho ô <b>${esc(slotName)}</b>.</p><button class="pill buy" id="wdToShop">Đến cửa hàng</button></div>`;
  const pick = gearTry && S.gearById(gearTry).slot === gearSlot ? S.gearById(gearTry) : cur;
  const setsHtml = S.setBonus(worn).map((b) => `<div class="wd-cmp wd-set"><small>Bộ <b>${esc(b.name)}</b> ${b.n}/6 · ${b.bonus ? 'đang cộng <b>+' + b.bonus + ' ' + STAT_NAMES[b.stat] + '</b>' : 'mặc 3 món để được cộng ' + STAT_NAMES[b.stat]}</small></div>`).join('');
  if (!pick) $('wdDetail').innerHTML = setsHtml;
  else {
    const isWorn = !!cur && cur.id === pick.id;
    let cmp = '';
    if (!isWorn && cur) {
      const diff = {}; for (const k of Object.keys(STAT_NAMES)) { const d = (pick.mods[k] || 0) - (cur.mods[k] || 0); if (Math.abs(d) > 1e-9) diff[k] = d; }
      cmp = `<div class="wd-cmp"><small>So với <b>${esc(cur.name)}</b> đang mặc:</small><div class="mods">${gearModChips(diff) || '<em>Như nhau</em>'}</div></div>`;
    } else if (!isWorn) cmp = '<div class="wd-cmp"><small>Ô này đang trống — mặc vào là được cộng nguyên chỉ số của món.</small></div>';
    $('wdDetail').innerHTML = `<div class="wd-card r${pick.rar}"><div class="wd-big">${gearIconImg(pick.id)}</div><div class="gi"><b>${esc(pick.name)}</b><span class="rar">${S.GEAR_RARITY[pick.rar]}</span>` +
      `<div class="mods">${gearModChips(pick.mods)}</div><small>${esc(pick.desc)}</small></div></div>${cmp}` +
      `<button class="cta" id="wdAct" data-act="${isWorn ? 'off' : 'on'}">${isWorn ? 'Tháo ra' : 'Mặc vào'}</button>` + setsHtml;
    { const lv = (wallet.lv || {})[pick.id] || 0, R = wallet.rules || {}, need = (R.upSp || [10, 20, 30, 50, 80])[lv], have = (wallet.sh || {})[pick.id] || 0, own = Math.min(need || 0, have), uni = ((need || 0) - own) * ((R.uniRate || [1, 2, 4, 8])[pick.rar]), sh = wallet.shards || 0;
      $('wdAct').insertAdjacentHTML('afterend', `<div class="wd-up"><span>Cấp <b>${lv}</b>/${S.GEAR_MAX_LV}${lv ? ' · chỉ số chính +' + (lv / 10) : ''}</span>` +
        (lv < S.GEAR_MAX_LV ? `<button class="pill buy shd" id="wdUp" ${sh >= uni ? '' : 'disabled'}>Nâng cấp</button><div class="wd-sp"><i class="shard sp"></i>Mảnh ${esc(pick.name)}: <b>${have}/${need}</b><i class="bar"><u style="width:${Math.min(100, have / need * 100)}%"></u></i></div>` +
          `<small>${uni ? 'Còn thiếu ' + (need - own) + ' mảnh → bù bằng <i class="shard"></i>' + uni + ' mảnh vạn năng (bạn có ' + sh + ')' : 'Đủ mảnh của món này.'} Mở rương ra trùng món này sẽ được ${(R.dup || [10])[pick.rar] || 10} mảnh.</small>` : '<em>Tối đa</em>') + '</div>');
      if ($('wdUp')) $('wdUp').onclick = () => { Sound.boop(); Net.send({ t: 'upgradeGear', id: pick.id }); }; }
    $('wdAct').onclick = () => { Sound.boop(); Net.send({ t: 'equip', slot: pick.slot, id: isWorn ? null : pick.id }); gearTry = null; };
  }
  renderGearStats(c, shown);
  const trying = pick && !(cur && cur.id === pick.id);
  $('stageName').innerHTML = `${esc(c.name)}<small>Sức mạnh ${S.powerOf(c.id, shown)}${trying ? ' · đang thử ' + esc(pick.name) : ''}</small>`;
  $('wdPower').textContent = 'Sức mạnh ' + S.powerOf(c.id, shown);
  $('wdSlots').querySelectorAll('button').forEach((b) => { b.onclick = () => { if (performance.now() - wdDragEnd < 400) return; gearSlot = b.dataset.slot; gearTry = null; Sound.boop(); showPreview(true); renderGear(); }; });
  $('wdInv').querySelectorAll('.wd-item').forEach((b) => {
    const id = b.dataset.item;
    b.onclick = () => { if (performance.now() - wdDragEnd < 400) return; gearTry = id; Sound.boop(); showPreview(true); renderGear(); };
    b.ondblclick = () => { Sound.boop(); gearTry = null; Net.send({ t: 'equip', slot: gearSlot, id }); };
  });
  if ($('wdToShop')) $('wdToShop').onclick = () => { Sound.boop(); const s = gearSlot; go('shop'); gearSlot = s; renderShop(); showPreview(true); };
}
// Shop: buy new items (they can be tried on first). Wearing and taking off happens in the wardrobe.
function renderShop() {
  const c = charById(profile.char), shown = previewGear(), set = S.gearSet(myGear());
  const gold = wallet ? wallet.gold : 0, items = (wallet && wallet.items) || [];
  $('gearGold').textContent = wallet ? wallet.gold : '…';
  $('gearTabs').innerHTML = [['chests', 'Rương'], ['sets', 'Bộ đồ']].concat(S.GEAR_SLOTS).map(([k, n]) => `<button data-slot="${k}" class="${k === gearSlot ? 'on' : ''}">${n}</button>`).join('');
  $('gearList').innerHTML = !wallet ? '<p class="tiny">Đang kết nối máy chủ… Cửa hàng cần có mạng.</p>' : S.GEAR.filter((it) => it.slot === gearSlot).map((it) => {
    const own = items.includes(it.id), on = set[it.slot] && set[it.slot].id === it.id;
    const cc = ((wallet && wallet.rules && wallet.rules.craft) || [20, 60, 150])[it.rar], sh = wallet ? wallet.shards || 0 : 0;
    const btn = own ? `<span class="own">${on ? 'Đang mặc' : 'Đã có'}</span>` : it.set ? `<button class="pill buy shd" data-act="craft" ${sh >= cc ? '' : 'disabled'}><i class="shard"></i>${cc}</button>` : `<button class="pill buy" data-act="buy" ${gold >= it.price ? '' : 'disabled'}><i class="coin"></i>${it.price}</button>`;
    return `<div class="gear-item r${it.rar}${gearTry === it.id ? ' try' : ''}" data-item="${it.id}"><span class="ic">${gearIconImg(it.id)}</span>` +
      `<div class="gi"><b>${esc(it.name)}</b><span class="rar">${S.GEAR_RARITY[it.rar]}</span><div class="mods">${gearModChips(it.mods)}</div><small>${esc(it.desc)}</small></div>${btn}</div>`;
  }).join('');
  const tryIt = gearTry && S.gearById(gearTry);
  $('stageName').innerHTML = `${esc(c.name)}<small>Sức mạnh ${S.powerOf(c.id, shown)}${tryIt ? ' · đang thử ' + esc(tryIt.name) : ''}</small>`;
  $('gearTabs').querySelectorAll('button').forEach((b) => { b.onclick = () => { gearSlot = b.dataset.slot; gearTry = null; gearTrySet = null; Sound.boop(); showPreview(true); renderShop(); }; });
  if (gearSlot === 'chests') {   // chests: a random item you do not own yet
    const gems = wallet ? wallet.gems || 0 : 0, tot = S.GEAR.length, have = items.length, gr = (wallet && wallet.gemRules) || {}, dupR = ((wallet && wallet.rules) || {}).dup || [5, 15, 40], crR = ((wallet && wallet.rules) || {}).craft || [20, 60, 150];
    $('gearList').innerHTML = !wallet ? '<p class="tiny">Đang kết nối máy chủ… Cửa hàng cần có mạng.</p>' : (wallet.chests || []).map((ch, i) => {
      const od = ch.odds.map((o, k) => o ? `<em class="r${k}">${S.GEAR_RARITY[k]} ${o}%</em>` : '').join('');
      return `<div class="gear-item chest-row r${i}" data-chest="${ch.id}"><span class="chest t${i}"><i></i></span><div class="gi"><b>${esc(ch.name)}</b><div class="mods">${od}</div><small>Ra một món ngẫu nhiên. Trùng món đã có thì nhận mảnh của món đó.</small></div><div class="chest-pay">` +
        (ch.gold ? `<button class="pill buy" data-pay="gold" ${gold >= ch.gold ? '' : 'disabled'}><i class="coin"></i>${ch.gold}</button>` : '') +
        (ch.gems ? `<button class="pill buy gemb" data-pay="gems" ${gems >= ch.gems ? '' : 'disabled'}><i class="gem"></i>${ch.gems}</button>` : '') + '</div></div>';
    }).join('') + ((wallet && wallet.rules && wallet.rules.packs) || []).map((k) => `<div class="gear-item chest-row pack-row r0" data-pack="${k.id}"><span class="shard big"></span><div class="gi"><b>${k.shards} mảnh vạn năng</b><small>Thay cho mảnh riêng của bất kỳ món nào khi nâng cấp, và để ghép món của bộ đồ.</small></div><div class="chest-pay">` +
      (k.gems ? `<button class="pill buy gemb" ${gems >= k.gems ? '' : 'disabled'}><i class="gem"></i>${k.gems}</button>` : `<button class="pill buy" ${gold >= k.gold ? '' : 'disabled'}><i class="coin"></i>${k.gold}</button>`) + '</div></div>').join('') +
      `<p class="tiny shop-hint">Mỗi món có mảnh riêng: mở rương trùng món đã có được ${dupR[0]} mảnh của món đó, dùng để nâng cấp món đó. Mảnh vạn năng bù cho mảnh còn thiếu (1 mảnh riêng = 1 / 2 / 4 / 8 vạn năng theo bậc) và ghép món của bộ đồ (${crR[0]} / ${crR[1]} / ${crR[2]} / ${crR[3] || 400}).</p>` +
      `<p class="tiny shop-hint">Bạn đang có ${have}/${tot} món. Kim cương: thắng online +${gr.online || 1}, vô địch Giải đấu +${gr.champ || 10} (mỗi ngày một lần), đăng nhập ngày thứ 7 +${gr.streak7 || 5}.</p>`;
    $('stageName').innerHTML = `${esc(c.name)}<small>Sức mạnh ${S.powerOf(c.id, shown)}</small>`;
    $('gearList').querySelectorAll('.chest-row button').forEach((b) => { b.onclick = () => { Sound.boop(); const row = b.closest('.chest-row'); if (row.dataset.pack) Net.send({ t: 'buyShards', id: row.dataset.pack }); else Net.send({ t: 'openChest', id: row.dataset.chest, pay: b.dataset.pay }); }; });
    return;
  }
  if (gearSlot === 'sets') {   // outfit sets: try a whole set on, buy the missing pieces in one go
    $('gearList').innerHTML = !wallet ? '<p class="tiny">Đang kết nối máy chủ… Cửa hàng cần có mạng.</p>' : S.GEAR_SETS.map((st) => {
      const ps = S.GEAR.filter((g) => g.set === st.id), own = ps.filter((g) => items.includes(g.id)).length, cost = Math.ceil((((wallet.rules || {}).setGems) || [60, 150, 320])[ps[0].rar] * (ps.length - own) / ps.length), myGems = wallet.gems || 0;
      return `<div class="gear-item set-row r${ps[0].rar}${gearTrySet === st.id ? ' try' : ''}" data-set="${st.id}"><div class="gi"><b>Bộ ${esc(st.name)}</b><span class="rar">${S.GEAR_RARITY[ps[0].rar]} · có ${own}/${ps.length}</span>` +
        `<div class="set-ics">${ps.map((g) => `<span class="ic${items.includes(g.id) ? ' has' : ''}">${gearIconImg(g.id)}</span>`).join('')}</div><small>${STAT_NAMES[st.stat]}: mặc 3 món +0.25 · 5 món +0.5 · đủ ${ps.length} món +0.75</small></div>` +
        (cost ? `<button class="pill buy gemb" data-act="buyset" ${myGems >= cost ? '' : 'disabled'}><i class="gem"></i>${cost}</button>` : '<span class="own">Đã đủ bộ</span>') + '</div>';
    }).join('');
    const ts = gearTrySet && S.GEAR_SETS.find((x) => x.id === gearTrySet);
    $('stageName').innerHTML = `${esc(c.name)}<small>Sức mạnh ${S.powerOf(c.id, shown)}${ts ? ' · đang thử bộ ' + esc(ts.name) : ''}</small>`;
    $('gearList').querySelectorAll('.set-row').forEach((row) => {
      const id = row.dataset.set;
      row.onclick = () => { gearTrySet = id; Sound.boop(); showPreview(true); renderShop(); };
      const b = row.querySelector('button');
      if (b) b.onclick = (ev) => { ev.stopPropagation(); Sound.boop(); Net.send({ t: 'buySet', id }); };
    });
    return;
  }
  $('gearList').querySelectorAll('.gear-item').forEach((row) => {
    const id = row.dataset.item;
    row.onclick = () => { gearTry = id; Sound.boop(); showPreview(true); renderShop(); };
    const b = row.querySelector('button');
    if (b) b.onclick = (ev) => { ev.stopPropagation(); Sound.boop(); gearTry = null; Net.send({ t: b.dataset.act === 'craft' ? 'craftGear' : 'buyGear', id }); };
  });
}

// ================================================================ economy (the server owns every number; the client only shows them)
// chest opened: show what came out, with a button to wear it at once
function chestPop(ch) {
  const it = S.gearById(ch.item); if (!it) return;
  let el = $('chestPop'); if (!el) { el = document.createElement('div'); el.id = 'chestPop'; document.body.appendChild(el); }
  el.className = 'chest-pop r' + it.rar;
  el.innerHTML = `<div class="cp-card"><small>Bạn nhận được</small><div class="cp-ic">${gearIconImg(it.id)}</div><b>${esc(it.name)}</b><span class="rar">${S.GEAR_RARITY[it.rar]}</span><div class="mods">${gearModChips(it.mods)}</div>` +
    (ch.dup ? `<p class="cp-dup">Bạn đã có món này → nhận <b><i class="shard sp"></i>${ch.shards} mảnh ${esc(it.name)}</b><br><small>Dùng để nâng cấp chính món này trong Trang bị.</small></p><div class="cp-btn"><button class="cta" id="cpClose">Nhận mảnh</button></div></div>`
      : `<div class="cp-btn"><button class="cta" id="cpWear">Mặc ngay</button><button class="pill" id="cpClose">Đóng</button></div></div>`);
  const close = () => { el.className = 'chest-pop hidden'; };
  $('cpClose').onclick = () => { Sound.boop(); close(); };
  if ($('cpWear')) $('cpWear').onclick = () => { Sound.boop(); Net.send({ t: 'equip', slot: it.slot, id: it.id }); close(); };
}
function onWallet(msg) {
  wallet = { gold: msg.gold, owned: msg.owned, prices: msg.prices, login: msg.login, quests: msg.quests, localLeft: msg.localLeft, items: msg.items || [], equip: msg.equip || {}, gems: msg.gems || 0, shards: msg.shards || 0, sh: msg.sh || {}, lv: msg.lv || {}, rules: msg.rules || {}, chests: msg.chests || [], gemRules: msg.gemRules || {} };
  document.querySelectorAll('.gemN').forEach((b) => { b.textContent = wallet.gems; }); document.querySelectorAll('.shardN').forEach((b) => { b.textContent = wallet.shards; });
  if (msg.note) { if (msg.note.ok) { Sound.ach(); toast(msg.note.why, msg.note.spent ? '−' + msg.note.spent : '', 'check'); } else toast(msg.note.why, '', 'lock'); }
  store.set('sp.wallet', wallet);
  if (!isUnlocked(charById(profile.char))) { profile.char = 'cat'; saveAll(); Net.profile(); }
  const g = msg.grant;
  if (g && g.gold > 0) {
    Sound.ach();
    if (!$('over').classList.contains('hidden')) $('overAch').insertAdjacentHTML('afterbegin', `<div class="toast"><i class="coin"></i>+${g.gold} vàng<small>${esc(g.why)}</small></div>`);
    else toast('+' + g.gold + ' vàng', g.why, 'star');
  } else if (g && g.why && (screen === 'rewards' || !$('over').classList.contains('hidden'))) toast(g.why, '', 'clock');
  if (g && g.gems > 0) { if (!$('over').classList.contains('hidden')) $('overAch').insertAdjacentHTML('afterbegin', `<div class="toast"><i class="gem"></i>+${g.gems} kim cương</div>`); else toast('+' + g.gems + ' kim cương', g.why, 'star'); }
  const ch = msg.chest; if (ch && ch.ok) { Sound.ach(); chestPop(ch); } else if (ch) toast(ch.why, '', 'lock');
  const b = msg.bought;
  if (b && b.ok) { profile.char = b.char; infoChar = b.char; saveAll(); Net.profile(); Sound.ach(); toast('Đã mở khoá ' + charById(b.char).name, '−' + b.spent + ' vàng', 'check'); showPreview(true); }
  else if (b) toast(b.why, '', 'lock');
  const bg = msg.boughtGear;
  if (bg && bg.ok) { Sound.ach(); toast(bg.why, '−' + bg.spent + ' vàng · đã mặc', 'check'); } else if (bg) toast(bg.why, '', 'lock');
  renderWallet();
}
function renderWallet() {
  $('homeGold').textContent = wallet ? wallet.gold : '…';
  const n = wallet ? (wallet.login.can ? 1 : 0) + wallet.quests.filter((q) => q.prog >= q.goal && !q.claimed).length : 0;
  $('rewardDot').textContent = n; $('rewardDot').classList.toggle('hidden', !n); $('rewardsBtn').classList.toggle('can', !!n);
  if (screen === 'rewards') renderRewards();
  if (screen === 'chars') renderChars();
  if (screen === 'gear') { renderGear(); showPreview(true); }
  if (screen === 'shop') { renderShop(); showPreview(true); }
  if (screen === 'home') { const c = charById(profile.char); $('homeChar').textContent = c.name + ' · Sức mạnh ' + S.powerOf(c.id, myGear()); }
}
function renderRewards() {
  const el = $('rewardsBody');
  if (!wallet) { el.innerHTML = '<p class="tiny">Đang kết nối máy chủ… Vàng và nhiệm vụ cần có mạng.</p>'; return; }
  const L = wallet.login, done = L.can ? L.streak - 1 : L.streak;
  const days = L.rewards.map((r, i) => `<div class="login-day${i < done ? ' done' : ''}${L.can && i === L.streak - 1 ? ' now' : ''}"><small>Ngày ${i + 1}</small><b><i class="coin"></i>${r}</b></div>`).join('');
  const quests = wallet.quests.map((q) => {
    const ok = q.prog >= q.goal;
    return `<div class="quest"><div class="q-main"><b>${esc(q.name)}</b><div class="q-bar"><i style="width:${Math.round(q.prog / q.goal * 100)}%"></i></div><small>${q.prog}/${q.goal}</small></div>` +
      `<button class="pill" data-quest="${q.id}" ${ok && !q.claimed ? '' : 'disabled'}>${q.claimed ? 'Đã nhận' : `<i class="coin"></i>${q.reward}`}</button></div>`;
  }).join('');
  el.innerHTML = `<p class="gold-line"><span class="gold-chip"><i class="coin"></i><b>${wallet.gold}</b></span></p>` +
    `<h3>Quà đăng nhập</h3><div class="login-row">${days}</div>` +
    `<button class="cta" id="loginClaim" ${L.can ? '' : 'disabled'}>${L.can ? `Nhận quà ngày ${L.streak} · ${L.reward} vàng` : 'Hôm nay đã nhận · mai quay lại nhé'}</button>` +
    `<h3>Nhiệm vụ hôm nay</h3>${quests}` +
    `<p class="tiny">Thắng bot: 20–60 vàng tuỳ độ khó · thắng online: 60 vàng. Vàng đấu bot hôm nay còn nhận được: ${wallet.localLeft}.</p>`;
  $('loginClaim').onclick = () => { Sound.boop(); Net.send({ t: 'claimLogin' }); };
  el.querySelectorAll('[data-quest]').forEach((b) => { b.onclick = () => { Sound.boop(); Net.send({ t: 'claimQuest', id: b.dataset.quest }); }; });
}

// ================================================================ events
const LABELS = { perfect: ['Perfect!', 'perfect'], good: ['Tốt', 'good'], late: ['Muộn!', 'bad'], early: ['Sớm!', 'bad'], smash: ['ĐẬP!', 'smash'], save: ['Cứu!', 'good'] };
function handleEvent(e) {
  const m = session.m, me = session.me;
  switch (e.type) {
    case 'hit': {
      if (session.models[e.i]) {
        const md = session.models[e.i];
        md.checkAt = { x: e.x, y: e.y, z: e.z };
        if (matchClipsEnabled) md.strokeEvent = { ...e, receivedClock: m.clock, athleteX: m.athletes[e.i].x, athleteZ: m.athletes[e.i].z };
        if (matchClipsEnabled && session.kind !== 'local') md.evSwingStart = e.c !== undefined && session.simNow !== undefined ? clamp(session.simNow - e.c, 0, 0.1) : 0;
      }
      const p = clamp(e.speed / 30, 0, 1);
      if (e.shot === 'smash') { Sound.smash(); excite = Math.min(1, excite + 0.4); camShake = Math.max(camShake, e.i === me ? 0.22 : 0.12) * (0.6 + 0.4 * clamp(e.q, 0, 1)); } else Sound.hit(p);
      if (e.label && (e.i === me || e.label === 'smash' || (me < 0 && e.label === 'perfect'))) {
        const [t, c] = LABELS[e.label]; popup(t, c, { x: e.x, y: e.y + 0.6, z: e.z });
        if (e.label === 'perfect' && e.i === me) Sound.perfect();
      }
      m.rally = (m.rally || 0) + 1;
      trailPts.length = 0;
      break;
    }
    case 'swing': if (e.i === me) Sound.whoosh(); break;
    case 'jump': if (e.i === me) Sound.jump(); break;
    case 'net': Sound.net(); break;
    case 'tired': { const a = m.athletes[e.i]; if (a) popup(e.i === me ? 'Mệt rồi!' : (a.team === session.myTeam ? 'Đồng đội mệt' : 'Đối thủ đuối sức!'), e.i === me ? 'bad' : 'gp', { x: a.x, y: 2.1, z: a.z }); break; }
    case 'netcord': Sound.net(); popup('Chạm lưới… vẫn qua!', 'gp', { x: m.shuttle.p.x, y: 2.2, z: 0 }); break;
    case 'interval': setTimeout(() => toast('Nghỉ giữa ván', e.ends ? 'Ván quyết định: hai bên đổi sân (gió đổi chiều)' : 'Uống nước, lau mồ hôi…', 'pause'), 900); break;
    case 'ends': if (S.VENUES[m.opts.venue].wind !== 'none') setTimeout(() => toast('Đổi sân', 'Gió giờ thổi theo chiều ngược lại', 'swap'), 1400); break;
    case 'land': Sound.land(); break;
    case 'emote': Sound.pop(); break;
    case 'serve': m.rally = 0; break;
    case 'point': {
      if (session.officials) session.officials.onPoint(e);
      const mine = e.team === session.myTeam;
      const why = e.why === 'winner' ? (me < 0 ? 'Điểm!' : mine ? 'Ghi điểm!' : 'Mất điểm') : e.why;
      popup(why, 'point ' + (mine || me < 0 ? '' : 'lose'));
      excite = mine || me < 0 ? 1 : 0.55;
      if ((mine || me < 0) && settings.gfx >= 1) confettiBurst(session.myTeam === 0 || me < 0 ? 1 : -1);
      Sound.cheer(mine);
      m.score = e.score.slice();
      updateScore(e.team);
      const def = m.score[1 - session.myTeam] - m.score[session.myTeam];
      session.maxDeficit = Math.max(session.maxDeficit, def);
      if (e.gamePoint >= 0) {
        const mp = e.matchPoint && (m.opts.games || 1) > 1;
        const mine2 = e.gamePoint === session.myTeam || me < 0;
        setTimeout(() => popup(mp ? (mine2 ? 'Match point!' : 'Match point đối thủ') : (mine2 ? 'Game point!' : 'Game point đối thủ'), 'gp'), 700);
      }
      break;
    }
    case 'game': {
      if (e.games) m.games = e.games.slice();
      const mine = e.team === session.myTeam;
      setTimeout(() => popup(me < 0 ? `Hết ván ${e.gameNo}` : mine ? `Thắng ván ${e.gameNo}!` : `Thua ván ${e.gameNo}`, 'point ' + (mine || me < 0 ? '' : 'lose')), 900);
      const L = session.myTeam;
      setTimeout(() => toast(`Ván ${e.gameNo}: ${e.score[L]} – ${e.score[1 - L]}`, `Tỉ số ván: ${e.games[L]} – ${e.games[1 - L]} · nghỉ giữa ván…`), 1300);
      break;
    }
    case 'gameStart':
      m.gameNo = e.gameNo; m.score = [0, 0]; lastScore = ''; updateScore();
      if (session.officials) session.officials.reset();
      popup(`Ván ${e.gameNo}`, 'gp'); Sound.whistle();
      break;
    case 'over':
      if (session.kind === 'local') finishMatch({ winner: e.winner, score: e.score, games: e.games, gameScores: e.gameScores, stats: m.athletes.map((a) => a.stats), longest: m.longest });
      break;
  }
}

// ================================================================ match end / progress
function finishMatch(res) {
  if (!session || session.over) return;
  session.over = true;
  paused = false; $('pause').classList.add('hidden');
  const me = session.me, m = session.m;
  const won = res.winner === session.myTeam;
  $('touch').classList.add('hidden'); setHint('');
  $('overTitle').innerHTML = me < 0 ? 'Kết thúc trận' : won ? 'Bạn thắng!' + icon('cup') : 'Thua mất rồi';
  const L = session.myTeam;
  const multi = res.gameScores && res.gameScores.length > 1;
  $('overScore').innerHTML = multi
    ? `${res.games[L]} – ${res.games[1 - L]}<small class="games-line">${res.gameScores.map((g) => g[L] + '-' + g[1 - L]).join(' · ')}</small>`
    : `${res.score[L]} – ${res.score[1 - L]}`;
  const tr = session.tourRound;
  let tourMsg = '', champ = false;
  if (tr !== undefined && me >= 0) {
    if (won) {
      tour.round = tr + 1; tour.best = Math.max(tour.best, tour.round);
      if (tour.round >= TOUR.length) { champ = true; tour.cups++; tour.round = 0; tour.runs++; tourMsg = icon('cup', 'gold') + 'VÔ ĐỊCH GIẢI ĐẤU! Cúp thứ ' + tour.cups; }
      else tourMsg = icon('check', 'green') + 'Vào vòng tiếp: ' + esc(TOUR[tour.round].name);
    } else { tourMsg = icon('x', 'red') + 'Bị loại ở ' + esc(TOUR[tr].name) + ' — giải đấu bắt đầu lại từ Vòng loại'; tour.round = 0; tour.runs++; }
    if (champ) $('overTitle').innerHTML = 'VÔ ĐỊCH!' + icon('cup');
  }
  const st = (me >= 0 && res.stats[me]) || { perfect: 0, smash: 0, hits: 0, diveSaves: 0, winners: 0, errors: 0 };
  $('overStats').innerHTML = [['Perfect', st.perfect], ['Đập cầu', st.smash], ['Rally dài nhất', res.longest || 0], ['Cú đánh', st.hits], ['Ghi điểm trực tiếp', st.winners], ['Cứu cầu', st.diveSaves]]
    .map(([k, v]) => `<div><b>${v || 0}</b><small>${k}</small></div>`).join('');
  $('overAch').innerHTML = '';
  $('rematchInfo').textContent = '';
  $('again').classList.toggle('hidden', session.kind === 'watch');
  $('again').textContent = session.kind === 'local' ? (tr !== undefined ? (won && !champ ? 'Trận tiếp: ' + TOUR[tour.round].name + ' ›' : 'Đấu giải mới') : 'Đấu lại') : 'Tái đấu';
  if (tourMsg) $('rematchInfo').innerHTML = tourMsg;
  if (me >= 0) {
    if (won) Sound.win(); else Sound.lose();
    if (session.kind === 'local') Net.send({ t: 'localResult', win: won, champ: !!champ, diff: session.localOpts ? session.localOpts.diff : 0, dur: Math.round(m.clock || 0) });   // the server decides the gold
    P.matches++; if (won) { P.wins++; P.streak++; P.bestStreak = Math.max(P.bestStreak, P.streak); } else P.streak = 0;
    P.perfect += st.perfect || 0; P.smash += st.smash || 0; P.diveSaves += st.diveSaves || 0; P.hits += st.hits || 0;
    P.longest = Math.max(P.longest, res.longest || 0);
    if (session.kind === 'online') { P.onlinePlayed++; if (won) P.onlineWins++; }
    history.unshift({ won, s: [res.score[L], res.score[1 - L]], mode: m.opts.mode, kind: session.kind, diff: session.localOpts ? session.localOpts.diff : -1, venue: m.opts.venue, opp: m.athletes.filter((a) => a.team !== L).map((a) => a.name).join(' & '), t: Date.now() });
    history.length = Math.min(history.length, 25);
    const ctx = { won, st, champ, games: m.opts.games || 1, longest: res.longest || 0, kind: session.kind, diff: session.localOpts ? session.localOpts.diff : -1, mode: m.opts.mode, oppScore: res.score[1 - L], maxDeficit: session.maxDeficit };
    const fresh = [];
    for (const a of ACH) if (!achieved[a.id] && a.test(ctx)) { achieved[a.id] = Date.now(); fresh.push(a); }
    saveAll();
    fresh.forEach((a, i) => {
      const unlock = S.CHARS.find((c) => c.unlock === a.id);
      const html = `<div class="toast">${achIcon(a)}Thành tích mới: ${esc(a.name)}<small>${esc(a.desc)}${unlock ? ' · Mở khoá nhân vật: ' + faceImg(unlock.id) + esc(unlock.name) : ''}</small></div>`;
      $('overAch').insertAdjacentHTML('beforeend', html);
      setTimeout(() => Sound.ach(), 600 + i * 400);
    });
  }
  setTimeout(() => { if (session && session.over) $('over').classList.remove('hidden'); }, 400);
}

$('again').onclick = () => {
  if (!session) return;
  if (session.kind === 'local' && session.tourRound !== undefined) startTour();
  else if (session.kind === 'local') startLocal(session.localOpts);
  else { Net.send({ t: 'rematch' }); $('rematchInfo').textContent = 'Đang chờ đối thủ đồng ý…'; }
};
$('toMenu').onclick = () => {
  const kind = session && session.kind, wasTour = !!(session && session.tourRound !== undefined);
  $('over').classList.add('hidden');
  endSession();
  if (kind === 'online') { Net.send({ t: 'exitMatch' }); go(Net.room ? 'room' : 'online'); }
  else if (kind === 'watch') { Net.send({ t: 'unspectate' }); go(Net.room ? 'room' : 'online'); }
  else go(wasTour ? 'tour' : 'home');
};

function togglePause() {
  if (!session || session.over || session.kind === 'watch') return;
  paused = !paused;
  $('pause').classList.toggle('hidden', !paused);
  $('pauseOnline').classList.toggle('hidden', session.kind === 'local');
  $('restart').classList.toggle('hidden', session.kind !== 'local');
  setCamBtn();
}
$('resume').onclick = togglePause;
$('pauseBtn').onclick = togglePause;
$('restart').onclick = () => { paused = false; $('pause').classList.add('hidden'); const tr = session.tourRound; if (tr !== undefined) startTour(); else startLocal(session.localOpts); };
$('quit').onclick = () => {
  const kind = session && session.kind;
  paused = false; $('pause').classList.add('hidden');
  endSession();
  if (kind === 'online') { Net.send({ t: 'leaveMatch' }); go(Net.room ? 'room' : 'online'); } else go('home');
};
$('stopWatch').onclick = () => { Net.send({ t: 'unspectate' }); endSession(); go('online'); };

// ================================================================ animation
// Authored match clips are ON by default (verified 2026-11-15: all venues, low gfx, phones, online, spectate, 2v2);
// add ?matchClips=0 to the address to fall back to the old procedural swing.
const matchClipsEnabled = new URLSearchParams(location.search).get('matchClips') !== '0';
// Selection uses court-facing coordinates, not the old swing's racket-alignment yaw.
function selectMatchStroke(a, h, e) {
  const facing = a.team === 0 ? Math.PI : 0;
  const lateral = (e.x - a.x) * Math.cos(facing) - (e.z - a.z) * Math.sin(facing);
  const bh = lateral * h < -0.08, suffix = bh ? 'Bh' : 'Fh';
  const near = Math.abs(e.z) < 2.2;
  if (e.shot === 'serveHigh') return 'misc_serveHighFH';
  if (e.shot === 'serveShort') return 'misc_serveShortBH';
  if (e.shot === 'smash') return bh ? 'rear_rhSmash' : 'rear_smash';
  if (e.shot === 'drive') return 'mid_drive' + suffix;
  if (e.shot === 'clear' && e.y > 1.35) return bh ? 'rear_bhClear' : 'rear_clear';
  if (e.shot === 'lift' || e.shot === 'clear') return near ? 'net_lift' + (bh ? 'BH' : 'FH') : 'mid_lift' + suffix;
  if (e.shot === 'drop' && e.y > 1.35 && !near) return bh ? 'rear_bhDrop' : 'rear_drop';
  if (e.shot === 'drop' || e.shot === 'net') return 'net_shot' + (bh ? 'BH' : 'FH');
  return null;
}
// <shot-prediction>
// Which shots can the next hit produce at a predicted contact height? Mirrors of sim.js humanShot and
// botChooseShot (tests/shot-prediction-regression.js keeps them in step). Presentation only.
function humanShotAt(a, y, iy, pw) {
  const az = Math.abs(a.z);
  if (pw !== undefined) {
    if (y < 1.05) return pw < 0.4 ? 'net' : 'lift';
    if (y > 1.45 && (a.jumpY > 0.25 || a.assist) && pw >= 0.72 && a.sta >= 0.15) return 'smash';
    if (pw < 0.35) return y < 1.75 ? 'net' : 'drop';
    if (pw >= 0.72 && y > 1.35) return 'drive';
    return 'clear';
  }
  if ((a.jumpY > 0.25 || (a.assist && y > 1.7)) && y > 1.6 && iy <= 0.4) return 'smash';
  if (y < 1.05) return iy < -0.4 ? 'net' : (iy > 0.4 ? 'lift' : (az < 2.6 ? 'net' : 'lift'));
  if (iy > 0.4) return y < 1.75 ? 'net' : 'drop';
  if (iy < -0.4) return y > 1.58 && az > 2.5 ? 'smash' : 'drive';
  return 'clear';
}
// Every shot botChooseShot can return for this bot at this contact height (its choice is random until the hit).
function botShotOptions(b, y, diffs) {
  const d = diffs[b.diff], az = Math.abs(b.z), out = [];
  const add = (s) => { if (!out.includes(s)) out.push(s); };
  if (y > 1.58 && az < 5.6 && b.sta >= 0.15 && d.smash > 0) { add('smash'); if (d.smash * Math.min(1, Math.max(0.25, b.sta / 0.6)) >= 1) return out; }
  if (y < 1.05) { if (az < 2.6) add('net'); add('lift'); return out; }
  for (let shot of ['clear', 'drop', 'drive']) {
    if (shot === 'drive' && y < 1.5) shot = az < 3 ? 'net' : 'clear';
    if (shot === 'drop' && y < 1.75) shot = 'net';
    add(shot);
  }
  return out;
}
// Nothing known about the hitter's intent (online snapshots carry no plan or buffered press; no button pressed yet).
function genericShots(y) {
  if (y < 1.05) return ['net', 'lift'];
  const out = ['clear', 'drive'];
  if (y > 1.45) out.push('smash');
  out.push(y < 1.75 ? 'net' : 'drop');
  return out;
}
// </shot-prediction>
function predictedShots(m, a, at, y) {
  if (!session) return genericShots(y);
  if (a.ctrl === 'bot') return S.DIFF[a.diff] ? botShotOptions(at, y, S.DIFF) : genericShots(y);
  if (session.kind !== 'local') return genericShots(y);
  const inp = a.input || {}, iy = +inp.y || 0;
  if (a.hitQueue > 0) return [humanShotAt(at, y, iy, a.hitPower)];                                   // buffered press
  if (inp.hold && a.assist >= 1) return [humanShotAt(at, y, iy, clamp(inp.holdPower || 0, 0, 1))];   // held button
  if (a.assist >= 2 && !(m.opts && m.opts.autoSave === false)) return [humanShotAt(at, y, iy, 0.5)]; // auto hit
  return genericShots(y);
}
// Clips the hit can select at the predicted contact, through the same selector the hit path uses.
function prepClips(m, a, h, pred) {
  const at = pred.ax === undefined ? a : { ...a, x: pred.ax, z: pred.az }, clips = [];
  for (const shot of predictedShots(m, a, at, pred.shotY === undefined ? pred.y : pred.shotY)) {
    const c = selectMatchStroke(at, h, { x: pred.x, y: pred.y, z: pred.z, shot });
    if (c && !clips.includes(c)) clips.push(c);
  }
  return clips;
}
// Where and when will this athlete actually hit the incoming shuttle? Walks the sim's own hit conditions forward
// (mirrors of tickBot / tickHuman; presentation only, the simulation is untouched).
function predictMatchContact(m, a) {
  const s = m.shuttle, sg = S.sgn(a.team), DT = S.DT, local = !!session && session.kind === 'local';
  const bot = a.ctrl === 'bot' && !!S.DIFF[a.diff], inp = a.input || {};
  if (bot && a.plan && a.plan.leave) return null;                     // it has judged the shuttle out
  const mode = bot ? 'bot' : !local ? 'first' : a.hitQueue > 0 ? 'first' : inp.hold && a.assist >= 1 ? 'hold'
    : a.assist >= 2 && !(m.opts && m.opts.autoSave === false) ? 'auto' : 'first';
  const p = { x: s.p.x, y: s.p.y, z: s.p.z }, v = { x: s.v.x, y: s.v.y, z: s.v.z }, at = { ...a };
  if (bot) at._extra = a.plan && a.plan.p && a.plan.p.desperate && a.diff > 0 ? 0.35 : 0;
  const speed = Math.hypot(a.vx, a.vz);
  // a bot runs to (tx, tz) and stops there; anyone else is assumed to keep their velocity
  const toTarget = bot && a.tx !== undefined ? Math.hypot(a.tx - a.x, a.tz - a.z) : Infinity;
  let jy = a.jumpY || 0, vy = a.vy || 0;
  for (let k = 0; k < 70; k++) {
    const travel = Math.min(speed * k * DT, toTarget), ux = speed > 1e-6 ? a.vx / speed : 0, uz = speed > 1e-6 ? a.vz / speed : 0;
    at.x = a.x + ux * travel; at.z = a.z + uz * travel;
    if (bot && a.jumpAt > 0 && m.clock + k * DT >= a.jumpAt && jy === 0 && vy === 0) { vy = a.st.jumpVy * (1 - 0.15 * S.fatigue(a)); jy = 0.001; }
    at.jumpY = jy;
    const r = S.inReachAt(at, p);
    const ok = r.ok && (!(local || bot) || p.z * sg > 0.05) && (mode === 'first'
      || (mode === 'bot' && (v.y < 0 || r.dh < 0.55 || p.y < 1.2))
      || (mode === 'hold' && v.y < 0 && (r.dh < 0.65 || p.y < 1.25))
      || (mode === 'auto' && v.y < 0 && (p.y < 0.55 || r.dh < 0.7 || p.y < 1.3)));
    if (ok) {
      const pred = { t: k * DT, x: p.x, y: p.y, z: p.z, ax: at.x, az: at.z, jy };
      if (local && !bot && a.assist && a.sta >= 0.15) {
        // assisted smash: the sim takes the contact up to this height on the hit tick and starts the jump there
        const shots = predictedShots(m, a, at, p.y), lifted = 2.05 + (a.st.jumpVy - 4.94) * 0.2 + 0.30 * (1 - 0.15 * S.fatigue(a));
        if (shots.length === 1 && shots[0] === 'smash' && p.y < lifted) { pred.shotY = p.y; pred.y = lifted; pred.lift = true; }
      }
      return pred;
    }
    S.stepShuttle(p, v, DT, m.wind); if (p.y <= 0) return null;
    if (jy > 0 || vy > 0) { vy -= 13 * DT; jy += vy * DT; if (jy <= 0) { jy = 0; vy = 0; } }
  }
  return null;
}
// Bounded joint fitting: no teleporting the body/racket, no changing the simulation.
const matchFitJoints = mdl => [[mdl.arm.rotation,'x',-3.2,1.5], [mdl.arm.rotation,'z',-1.6,1.6],
    [mdl.armEl.rotation,'x',-2.6,0.05], [mdl.armEl.rotation,'z',-0.6,0.6], [mdl.wrist.rotation,'x',-1.5,1.5], [mdl.wrist.rotation,'y',-1.2,1.2], [mdl.rig.chest.rotation,'y',-0.45,0.45], [mdl.rig.chest.rotation,'x',-0.22,0.22]];
// Project a start pose onto the solver's joint limits. A quaternion has two Euler readings
// (a,b,c) and (a+pi, pi-b, c+pi); each is clamped and the one that moves the joint least is kept.
// Ties keep the reading whose middle angle is within +-pi/2: the branch every authored pose lives in.
function projectMatchFit(mdl) {
  const joints = matchFitJoints(mdl), wrap = v => Math.atan2(Math.sin(v), Math.cos(v));
  let moved = 0;
  for (const node of [mdl.arm, mdl.armEl, mdl.wrist, mdl.rig.chest]) {
    const r = node.rotation, o = r.order.toLowerCase(), original = node.quaternion.clone();
    const readings = [{ x: r.x, y: r.y, z: r.z }, { x: r.x, y: r.y, z: r.z }];
    readings[1][o[0]] = wrap(r[o[0]] + Math.PI); readings[1][o[1]] = wrap(Math.PI - r[o[1]]); readings[1][o[2]] = wrap(r[o[2]] + Math.PI);
    readings.sort((p, q) => Math.abs(p[o[1]]) - Math.abs(q[o[1]]));   // authored branch first
    let best = null;
    for (const reading of readings) {
      const v = { ...reading };
      for (const [jr, k, lo, hi] of joints) if (jr === r) v[k] = clamp(v[k], lo, hi);
      const angle = new THREE.Quaternion().setFromEuler(new THREE.Euler(v.x, v.y, v.z, r.order)).angleTo(original);
      if (!best || angle < best.angle - 1e-9) best = { v, angle };
    }
    r.set(best.v.x, best.v.y, best.v.z);
    moved = Math.max(moved, best.angle);
  }
  return moved;
}
function fitMatchRacket(mdl, target, weight) {
  const tip = new THREE.Vector3(0, -0.71, 0), world = new THREE.Vector3();
  const joints = matchFitJoints(mdl);
  // The coordinate search only clamps trial steps, so it must be entered with a feasible pose.
  projectMatchFit(mdl);
  if (window.__captureContactRig) window.__captureContactRig(mdl, target, weight);
  // Each trial only changes chest / shoulder / elbow / wrist: refresh just that chain (chest pivot down to the wrist)
  // instead of the whole athlete (about 150 nodes) - same matrices, a fraction of the work. The solver runs on every
  // prediction and stroke frame and was the reason frames hitched right at the contact.
  let chain = mdl.fitChain;
  if (!chain) { chain = []; for (let n = mdl.wrist; n; n = n.parent) { chain.unshift(n); if (n === mdl.rig.chest) break; } mdl.fitChain = chain; }
  mdl.root.updateMatrixWorld(true);
  const distance = () => {
    for (const n of chain) { n.updateMatrix(); n.matrixWorld.multiplyMatrices(n.parent.matrixWorld, n.matrix); }
    return world.copy(tip).applyMatrix4(mdl.wrist.matrixWorld).distanceTo(target);
  };
  for (const step of [0.32,0.16,0.08,0.04,0.02]) for (let pass=0; pass<6; pass++) for (const [r,k,lo,hi] of joints) {
    const original=r[k]; let best=distance(), value=original;
    for (const sign of [-1,1]) { r[k]=clamp(original+sign*step*weight,lo,hi); const d=distance(); if(d<best){best=d;value=r[k];} }
    r[k]=value;
  }
  for (const [r,k,lo,hi] of joints) if (!(r[k] >= lo && r[k] <= hi)) {
    (window.__matchFitBoundViolations ||= []).push({ axis: k, value: r[k], lo, hi });
    console.assert(false, 'fitMatchRacket left a joint outside its limits', k, r[k], lo, hi);
  }
  return distance();
}
// Analytic two-bone start: fold the elbow hinge until the racket head is as far from the shoulder as the target is,
// then swing the shoulder so the head points at the target. Wrist, elbow side angle and chest are left as posed.
const foldSh = new THREE.Vector3(), foldTip = new THREE.Vector3();
function foldMatchArm(mdl, target) {
  mdl.root.updateMatrixWorld(true);
  mdl.arm.getWorldPosition(foldSh);
  const want = foldSh.distanceTo(target), original = clamp(mdl.armEl.rotation.x, -2.6, 0.05);
  const head = (x) => { mdl.armEl.rotation.x = x; mdl.armEl.updateMatrixWorld(true); return mdl.wrist.localToWorld(foldTip.set(0, -0.71, 0)).distanceTo(foldSh); };
  let bestX = original, bestGap = Math.abs(head(original) - want);
  for (let i = 0; i <= 53; i++) {           // 0.05 rad steps over the hinge range; ties keep the fold nearest the posed one
    const x = -2.6 + i * 0.05, gap = Math.abs(head(x) - want);
    if (gap < bestGap - 1e-6 || (gap < bestGap + 1e-6 && Math.abs(x - original) < Math.abs(bestX - original))) { bestGap = gap; bestX = x; }
  }
  head(bestX);
  const from = foldTip.clone().sub(foldSh), to = target.clone().sub(foldSh);
  if (from.lengthSq() < 1e-8 || to.lengthSq() < 1e-8) return;
  const swing = new THREE.Quaternion().setFromUnitVectors(from.normalize(), to.normalize());
  const armWorld = mdl.arm.getWorldQuaternion(new THREE.Quaternion()), parentWorld = mdl.arm.parent.getWorldQuaternion(new THREE.Quaternion());
  mdl.arm.quaternion.copy(parentWorld.invert().multiply(swing).multiply(armWorld));
}
// Clean solve = better of (posed start, analytic fold start). The fold must win by more than 1 cm.
function fitMatchClean(mdl, target) {
  const nodes = [mdl.arm, mdl.armEl, mdl.wrist, mdl.rig.chest], start = nodes.map(n => n.quaternion.clone());
  const posedError = fitMatchRacket(mdl, target, 1), posed = nodes.map(n => n.quaternion.clone());
  nodes.forEach((n, i) => n.quaternion.copy(start[i]));
  foldMatchArm(mdl, target);
  const foldError = fitMatchRacket(mdl, target, 1);
  if (window.__matchFoldTrace) window.__matchFoldTrace({ posed: posedError, fold: foldError });
  if (foldError < posedError - 0.01) return foldError;
  nodes.forEach((n, i) => n.quaternion.copy(posed[i]));
  return posedError;
}
// Preparation aim. `store[key]` holds the last SOLVED correction (relative to `aimBase`, the contact pose being aimed):
// the next solve warm-starts from it, so the solution stays in one branch while the target and the body move. Another
// branch is taken only when it is better by 3 cm and there is still time to travel there (or the kept one misses by
// 10 cm). Returns the correction to SHOW: `shown` moved toward the solution so that it gets there by the predicted
// contact time `tLeft` (never slower than 8 rad/s).
function trackMatchAim(store, key, mdl, nodes, aimBase, target, shown, tLeft, dt) {
  const cleanError = fitMatchClean(mdl, target), cleanSolved = nodes.map(n => n.quaternion.clone());
  if (store[key]) {
    nodes.forEach((n, i) => n.quaternion.copy(aimBase[i]).multiply(store[key][i]));
    const keptError = fitMatchRacket(mdl, target, 1);
    const switchBranch = keptError > 0.10 || (tLeft > 0.12 && keptError > cleanError + 0.03);
    if (switchBranch && cleanError < keptError) nodes.forEach((n, i) => n.quaternion.copy(cleanSolved[i]));
  }
  store[key] = nodes.map((n, i) => aimBase[i].clone().invert().multiply(n.quaternion));
  const frames = Math.max(1, Math.round(tLeft / dt));
  return store[key].map((q, i) => { const angle = shown[i].angleTo(q); return shown[i].clone().slerp(q, angle ? Math.min(1, Math.max(8 * dt, angle / frames) / angle) : 1); });
}
// Racket-head position in the model's own frame (neutral stance) at a clip's authored contact pose.
// Joint Euler values are restored exactly: later code reads them component-wise.
function clipHeadLocal(md, clip) {
  const cache = md.clipHead || (md.clipHead = {});
  if (!cache[clip]) {
    const mdl = md.model, nodes = [mdl.body, mdl.rig.chest, mdl.arm, mdl.armEl, mdl.wrist];
    const keep = nodes.map(n => [n.rotation.x, n.rotation.y, n.rotation.z]), keepY = mdl.body.position.y;
    nodes.forEach(n => n.rotation.set(0, 0, 0)); mdl.body.position.y = 0;
    setArm(mdl, 'arm', SPAnim.sample(clip, SPAnim.CLIPS[clip].contact).arm, 0, 0); mdl.root.updateMatrixWorld(true);
    const v = mdl.wrist.localToWorld(new THREE.Vector3(0, -0.71, 0)); mdl.root.worldToLocal(v);
    cache[clip] = { x: v.x, y: v.y, z: v.z, r: Math.hypot(v.x, v.z), ang: Math.atan2(v.x, v.z) };
    nodes.forEach((n, i) => n.rotation.set(keep[i][0], keep[i][1], keep[i][2])); mdl.body.position.y = keepY;
  }
  return cache[clip];
}
const legTgt = new THREE.Vector3();
function animateAthlete(a, md, dt, t, m) {
  const mdl = md.model, facing = a.team === 0 ? Math.PI : 0;
  const previousFacing = mdl.root.rotation.y;
  const previousSolved=[mdl.arm,mdl.armEl,mdl.wrist,mdl.rig.chest].map(n=>n.quaternion.clone());
  md.frameNo = (md.frameNo || 0) + 1;
  if (matchClipsEnabled && session && session.kind !== 'local') {
    if (md.evSwingStart !== undefined) { md.evSwingT = md.evSwingStart; md.evSwingStart = undefined; }
    else if (md.evSwingT >= 0) { md.evSwingT += dt; if (md.evSwingT > 0.45) md.evSwingT = -1; }
    md.rawSwingAge = a.swingT >= 0 ? (md.rawSwingAge || 0) + dt : 0;
    // no hit event 0.25 s after the snapshots say "swinging": a miss - play that swing from its start (not from the middle)
    a.swingT = md.evSwingT >= 0 ? md.evSwingT : (md.rawSwingAge > 0.25 ? md.rawSwingAge - 0.25 : -1);
    if (dt > 0) a.vy = md.prevJumpY === undefined ? 0 : (a.jumpY - md.prevJumpY) / dt;        // snapshots carry no vertical speed
    md.prevJumpY = a.jumpY;
  }
  mdl.root.position.set(a.x, a.jumpY, a.z);
  // Restore clip-owned joints before the procedural path; clips never own simulation travel.
  if (md.matchClip && mdl.rig) {
    mdl.rig.hips.position.y = mdl.rig.hipY;
    mdl.rig.hips.rotation.set(0, 0, 0);
    mdl.rig.chest.rotation.set(0, 0, 0);
    md.matchClip = null;
  }
  let yaw = facing;
  const s = m.shuttle;
  // before the serve, server and receiver square up to each other across the diagonal; otherwise watch the shuttle
  const srv = m.state === 'serve' ? m.athletes[m.serverIdx] : null;
  const rcv = srv && m.receiverIdx !== undefined ? m.athletes[m.receiverIdx] : null;
  let lookAt = null;
  if (srv && rcv && (a === srv || a === rcv)) lookAt = a === srv ? rcv : srv;
  else if (s.live || (s.held && a !== srv)) lookAt = s.p;
  if (lookAt) {
    const ang = Math.atan2(lookAt.x - a.x, lookAt.z - a.z);
    let diff = ang - facing; while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2;
    yaw = facing + clamp(diff, -0.9, 0.9) * (srv && (a === srv || a === rcv) ? 0.85 : 0.6);
  }
  // predict where the shuttle will reach this player's racket (drives the visual swing so the racket meets it)
  md.pred = null;
  if (s.live && !s.netted && s.lastTeam !== a.team && (a.swingT < 0 || a.swingT > 0.2) && a.diveT < 0) {
    const p = { x: s.p.x, y: s.p.y, z: s.p.z }, v = { x: s.v.x, y: s.v.y, z: s.v.z };
    // Opt-in clips: the athlete keeps travelling until contact, so test reach from where it will be.
    // Presentation only; the simulation's own reach test and positions are untouched.
    if (matchClipsEnabled && !debugPose) { md.pred = predictMatchContact(m, a); if (md.pred) md.pred.type = swingType(md.pred.y); }
    else for (let k = 0; k < 70; k++) {
      if (S.inReachAt(a, p).ok) { md.pred = { t: k * S.DT, x: p.x, y: p.y, z: p.z, type: swingType(p.y) }; break; }
      S.stepShuttle(p, v, S.DT, m.wind); if (p.y <= 0) break;
    }
  }
  if (md.pred && matchClipsEnabled && !debugPose) {
    // Swing family by contact height relative to the athlete at contact: a jump moves the body, not the swing
    // (a bot can leap 1 m and meet the shuttle at waist height; the overhead pose cannot reach down there).
    md.pred.type = swingType(md.pred.y - md.pred.jy);
    md.pred.clips = prepClips(m, a, mdl.h, md.pred);
    md.pred.clip = md.pred.clips.length === 1 ? md.pred.clips[0]
      : md.prepClip && md.pred.clips.includes(md.prepClip) ? md.prepClip   // already preparing it and it is still possible: keep it
      : null;                                                             // shot unknown: neutral preparation
  }
  md.prepClip = md.pred ? md.pred.clip || null : null;
  if (md.pred && md.pred.t < 0.6) md.lastPred = Object.assign({ at: t }, md.pred);
  if (matchClipsEnabled && session && session.kind === 'online' && a.i === session.me)
    session.meSyncWant = (md.pred && md.pred.t < 0.35) || (md.stroke && md.stroke.elapsed < 0.2) || md.strokeEvent ? 1 : 0;
  // turn so the racket side faces the contact point (overhead: almost square on; side-arm: well turned)
  const cp = md.pred && md.pred.t < 0.6 ? md.pred : (a.swingT >= 0 && a.swingT < 0.25 && md.lastPred && t - md.lastPred.at < 0.5 ? md.lastPred : null);
  // where this model's racket head sits (in its own frame) at the contact frame of each swing type
  if (!md.headLocal) {
    md.headLocal = {};
    const keepRot = mdl.body.rotation.x, keepY = mdl.body.position.y;
    mdl.body.rotation.x = 0; mdl.body.position.y = 0;           // measure in the neutral stance
    for (const ty of ['hi', 'mid', 'lo']) {
      setArm(mdl, 'arm', swingPose(ty, 0.38), 0, 0); mdl.root.updateMatrixWorld(true);
      const v = mdl.wrist.localToWorld(new THREE.Vector3(0, -0.71, 0)); mdl.root.worldToLocal(v);
      md.headLocal[ty] = { x: v.x, y: v.y, z: v.z, r: Math.hypot(v.x, v.z), ang: Math.atan2(v.x, v.z) };
    }
    mdl.body.rotation.x = keepRot; mdl.body.position.y = keepY;
  }
  let lungeT = 0, crouch = 0, rise = 0, lungeStep = null;
  if (cp) {
    const stance = cp === md.pred && cp.ax !== undefined;
    const dx = cp.x - (stance ? cp.ax : a.x), dz = cp.z - (stance ? cp.az : a.z), dist = Math.hypot(dx, dz);
    let hl = md.headLocal[cp.type];
    if (matchClipsEnabled && !debugPose) {
      // Known shot: lean / lunge / rise for the clip that will be shown. Unknown shot: the neutral swing's contact
      // region, kept through the hit (cp.clip === null) so the root never re-targets in the middle of a stroke.
      const ev = md.strokeEvent;
      const reachClip = cp.clip !== undefined ? cp.clip : ev ? selectMatchStroke(a, mdl.h, ev) : md.stroke ? md.stroke.clip : null;
      if (reachClip) hl = clipHeadLocal(md, reachClip);
    }
    yaw = Math.atan2(dx, dz) - hl.ang;                         // turn so the racket head lines up with the shuttle
    lungeT = clamp(dist - hl.r, -0.2, 0.55);                    // step / lean in to close the gap
    // while the prediction is live the body is placed for the jump height it will have AT contact (a constant target);
    // an assisted smash is met by rising early: the sim only starts that jump on the hit tick
    const dh = cp.y - (hl.y + (stance && cp.jy !== undefined ? cp.jy : a.jumpY));
    crouch = clamp(-dh * 0.8, 0, 0.34);                         // bend down for low shuttles
    rise = clamp(dh, 0, cp.lift ? 0.95 : 0.6);                  // go up on the toes / hop for high ones
    md.lungeDir = dist > 0.01 ? { x: dx / dist, z: dz / dist } : md.lungeDir;
    if (matchClipsEnabled && !debugPose) {
      // The racket head lines up with the target only once the body has finished turning, and the turn is rate
      // limited. Step by what is still missing at the facing the body actually has (same 0.55 m limit).
      const c = Math.cos(previousFacing), s = Math.sin(previousFacing);
      const lx = dx - (hl.x * c + hl.z * s), lz = dz - (hl.z * c - hl.x * s), ll = Math.hypot(lx, lz), k = ll > 0.55 ? 0.55 / ll : 1;
      lungeStep = { x: lx * k, z: lz * k };
    }
  }
  // ease in quickly while the shuttle arrives, then settle back after the hit
  const near = cp && cp.t !== undefined && cp === md.pred ? clamp(1 - cp.t / 0.35, 0, 1) : cp ? 1 : 0;
  if (matchClipsEnabled && !debugPose && cp && cp === md.pred && near > 0) {
    // Time to contact is known: close the remaining gap linearly so the vertical placement (rise / crouch) is complete on the contact
    // frame. A damped chase of the ramp is still ~20% short there, which costs reach on high / wide contacts.
    const f = Math.min(1, dt / Math.max(cp.t, dt));
    md.lunge = damp(md.lunge || 0, lungeT * near, 16, dt);   // horizontal: unchanged damped chase
    const vmax = 4 * dt;   // m per frame; jump take-off speeds are 4.5-5.3 m/s
    md.crouch = (md.crouch || 0) + clamp((crouch - (md.crouch || 0)) * f, -vmax, vmax);
    md.rise = (md.rise || 0) + clamp((rise - (md.rise || 0)) * f, -vmax, vmax);
  } else {
    md.lunge = damp(md.lunge || 0, lungeT * near, cp ? 16 : 5, dt);
    md.crouch = damp(md.crouch || 0, crouch * near, cp ? 16 : 5, dt);
    const riseBefore = md.rise || 0;
    md.rise = damp(riseBefore, rise * near, cp ? 18 : 6, dt);
    if (matchClipsEnabled && !debugPose) md.rise = riseBefore + clamp(md.rise - riseBefore, -4 * dt, 4 * dt);   // never faster than a jump take-off
  }
  if (matchClipsEnabled && !debugPose) {
    const v = md.lungeVec || (md.lungeVec = { x: 0, z: 0 }), rate = cp ? 16 : 5;
    v.x = damp(v.x, lungeStep ? lungeStep.x * near : 0, rate, dt); v.z = damp(v.z, lungeStep ? lungeStep.z * near : 0, rate, dt);
    mdl.root.position.set(a.x + v.x, a.jumpY + md.rise, a.z + v.z);
  } else if (md.lungeDir) mdl.root.position.set(a.x + md.lungeDir.x * md.lunge, a.jumpY + md.rise, a.z + md.lungeDir.z * md.lunge);
  if (a.diveT >= 0 && (a.diveDx || a.diveDz)) {
    yaw = Math.atan2(a.diveDx, a.diveDz);
    // diving toward the net from close up: lie along the net instead of through it
    const sgT = S.sgn(a.team), dl = Math.hypot(a.diveDx, a.diveDz), toNet = -sgT * a.diveDz / dl, most = clamp((Math.abs(a.z) - 0.45) / 1.3, 0, 1);
    if (toNet > most) { const ph = Math.acos(most), sd = a.diveDx >= 0 ? 1 : -1; yaw = Math.atan2(sd * Math.sin(ph), -sgT * Math.cos(ph)); }
  }
  let dy = yaw - md.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
  md.yaw += dy * (1 - Math.exp(-12 * dt));
  // Clip-facing is acquired during prediction, not snapped at the hit event.
  if (matchClipsEnabled) {
    const desired = md.clipFacing !== undefined ? md.clipFacing
      : cp ? facing + clamp(Math.atan2(Math.sin(md.yaw - facing), Math.cos(md.yaw - facing)), -1.2, 1.2) : md.yaw;
    const turn = Math.atan2(Math.sin(desired - previousFacing), Math.cos(desired - previousFacing));
    mdl.root.rotation.y = previousFacing + clamp(turn, -3.2 * dt, 3.2 * dt);
    md.clipFacing = undefined;
  } else mdl.root.rotation.y = md.yaw;
  const speed = Math.hypot(a.vx, a.vz);
  // ---- locomotion: the step cycle advances with distance travelled (no foot sliding)
  const run = Math.min(1, speed / 3.2);
  md.phase = (md.phase || 0) + speed / 0.62 * Math.PI * dt;
  const sinY = Math.sin(md.yaw), cosY = Math.cos(md.yaw);
  const fwd = (a.vx * sinY + a.vz * cosY) / Math.max(0.01, speed), side = (a.vx * cosY - a.vz * sinY) / Math.max(0.01, speed);
  // acceleration (from the change in velocity) makes the body lean into starts and lean back on stops
  const ax = md.pvx === undefined ? 0 : (a.vx - md.pvx) / Math.max(dt, 1e-3), az = md.pvz === undefined ? 0 : (a.vz - md.pvz) / Math.max(dt, 1e-3);
  md.pvx = a.vx; md.pvz = a.vz;
  const accF = clamp((ax * sinY + az * cosY) / 30, -1, 1), accS = clamp((ax * cosY - az * sinY) / 30, -1, 1);
  md.accF = damp(md.accF || 0, accF, 10, dt); md.accS = damp(md.accS || 0, accS, 10, dt);
  let by = Math.abs(Math.sin(md.phase)) * 0.055 * run;                       // two bounces per stride
  if (speed < 0.3) by += Math.sin(t * 2.6 + a.i * 1.7) * 0.012;                // idle: on the toes, breathing
  if (a.splitT > 0) by += Math.sin((0.28 - a.splitT) / 0.28 * Math.PI) * 0.1;
  // landing squash / take-off stretch
  if (md.wasAir && a.jumpY === 0) md.landT = 0.2;
  md.wasAir = a.jumpY > 0;
  md.landT = Math.max(0, (md.landT || 0) - dt);
  const squash = md.landT > 0 ? Math.sin(md.landT / 0.2 * Math.PI) * 0.12 : (a.vy > 0.5 ? -0.05 : 0);
  if (mdl.body.userData.s0 === undefined) mdl.body.userData.s0 = mdl.body.scale.x;   // the model's own size
  const s0 = mdl.body.userData.s0;
  mdl.body.scale.set(s0 * (1 + squash * 0.5), s0 * (1 - squash), s0 * (1 + squash * 0.5));
  let tiltX = (fwd * 0.12 * run) + md.accF * 0.18;                              // lean into the run / brake
  let tiltZ = -(side * 0.1 * run) - md.accS * 0.16 + (speed < 0.3 ? Math.sin(t * 1.3 + a.i) * 0.03 : 0);
  if (a.diveT >= 0 || a.recoverT > 0) {
    const k = a.diveT >= 0 ? Math.min(1, a.diveT / 0.12) : Math.min(1, a.recoverT / 0.2);
    tiltX = 1.25 * k; by = (0.13 + (mdl.diveLift || 0)) * k;   // lifted so belly/face rest on the floor when lying forward
  }
  if (m.state === 'point' || m.state === 'gameBreak' || m.state === 'overPending' || m.state === 'over') {
    if (a.mood > 0) by += Math.abs(Math.sin(t * 9)) * 0.25; else tiltX = 0.25;
  }
  const fat = S.fatigue(a);
  if (fat > 0 && a.diveT < 0 && a.recoverT <= 0) { tiltX += 0.16 * fat; by += Math.sin(t * 7) * 0.02 * fat; }   // hunched, panting
  // low reach / lunge lean - but not on top of the dive pose: lying flat is already as low as the body goes (a crouch
  // left over from the reach used to push the chest and shoulders 0.3 m under the floor during dives)
  const lying = matchClipsEnabled && (a.diveT >= 0 || a.recoverT > 0) ? (a.diveT >= 0 ? Math.min(1, a.diveT / 0.12) : Math.min(1, a.recoverT / 0.2)) : 0;
  by -= (md.crouch || 0) * (1 - lying); tiltX += ((md.crouch || 0) * 0.9 + Math.max(0, md.lunge || 0) * 0.5) * (1 - lying);
  // how far the body is actually lying: follows the dive ramp, and on the way up stays with the (slower) body tilt, so
  // the lift and the raised chin are not dropped while the body is still pitched forward
  md.lie = Math.max(a.diveT >= 0 ? Math.min(1, a.diveT / 0.12) : a.recoverT > 0 ? Math.min(1, a.recoverT / 0.2) : 0,
    Math.min(md.lie || 0, Math.min(1, Math.max(0, mdl.body.rotation.x / 1.25))));
  if (md.lie > 0) by = Math.max(by, (0.13 + (mdl.diveLift || 0)) * md.lie);
  if (a.team !== undefined) {   // net guard: the room the pose needs in front of it (more when lying toward the net) is kept clear of the net plane
    const sgT = S.sgn(a.team), toNet = Math.max(0, -sgT * Math.cos(mdl.root.rotation.y));
    const lean = Math.max(md.lie, clamp(mdl.body.rotation.x / 1.25, 0, 1));   // lying, or just bent forward
    const need = (0.48 + toNet * (0.26 + lean * 1.15)) * (mdl.netRoom || 1), push = Math.max(0, need - mdl.root.position.z * sgT);
    md.netPush = push > (md.netPush || 0) ? push : damp(md.netPush || 0, push, 8, dt);
    mdl.root.position.z += sgT * md.netPush;
  }
  mdl.body.position.y = by;
  mdl.body.rotation.x = damp(mdl.body.rotation.x, tiltX, 14, dt);
  mdl.body.rotation.z = damp(mdl.body.rotation.z, tiltZ, 10, dt);
  // feet step along the direction of travel (forward/back or shuffling sideways) and lift off the floor
  if (mdl.rig) {
    // feet stay on the floor (the body bob/crouch bends the knees instead of lifting the feet)
    const bs = mdl.body.scale.y || 1, stance = speed < 0.3 ? 1.35 : 1.05;
    for (const leg of mdl.rig.legs) {
      const ph = md.phase + (leg.side > 0 ? 0 : Math.PI), stride = 0.13 * run;
      SPAnim.legIK(mdl, leg, legTgt.set(leg.hx * stance + Math.cos(ph) * stride * side * 0.8, mdl.rig.ankleY + Math.max(0, Math.sin(ph)) * 0.07 * run - mdl.body.position.y / bs, 0.03 + Math.cos(ph) * stride * fwd), Math.sin(ph) * 0.35 * run * fwd, 0);
    }
  }
  // head: small idle drift, droops when tired, glances toward the shuttle
  mdl.head.rotation.z = Math.sin(t * 1.7 + a.i * 2.1) * 0.04 - tiltZ * 0.4;
  mdl.head.rotation.x = damp(mdl.head.rotation.x, S.fatigue(a) * 0.18 - tiltX * 0.3, 4, dt);
  if (md.lie > 0) mdl.head.rotation.x = Math.min(mdl.head.rotation.x, (mdl.diveHeadX || 0) * md.lie);   // lying: chin up, face stays above the floor
  if (s.live || s.held) {
    const la = Math.atan2(s.p.x - a.x, s.p.z - a.z) - md.yaw;
    const hy = clamp(Math.atan2(Math.sin(la), Math.cos(la)), -0.6, 0.6);
    mdl.head.rotation.y = damp(mdl.head.rotation.y, hy, 6, dt);
  } else mdl.head.rotation.y = damp(mdl.head.rotation.y, Math.sin(t * 0.5 + a.i) * 0.2, 2, dt);
  // racket arm
  const sh = m.shuttle, holding = m.state === 'serve' && a.i === m.serverIdx && sh.held;
  const incoming = sh.live && !sh.netted && sh.lastTeam !== a.team;
  let pose = POSE.ready, rate = 10, fpose = FREE.rest;
  // a new swing started: if we were tracking an incoming shuttle it was a real hit, so the racket is
  // already at the contact frame (k = 0.38); otherwise it is a fresh swing from the start
  if (a.swingT >= 0 && !(md.prevSwingT >= 0 && a.swingT >= md.prevSwingT)) {
    let lp = md.lastPred && t - md.lastPred.at < 0.2 ? md.lastPred : null;
    // not predicted (e.g. a quick exchange), but the shuttle is right here: treat it as the contact anyway
    if (!lp && sh.live && Math.hypot(sh.p.x - a.x, sh.p.z - a.z) < 1.6) { lp = md.lastPred = { at: t, x: sh.p.x, y: sh.p.y, z: sh.p.z, type: swingType(sh.p.y) }; }
    md.swingMode = lp ? 'contact' : 'fresh';
    md.swingKind = lp ? lp.type : swingType(a.swingHigh ? 2 : 0.8);
  }
  md.prevSwingT = a.swingT;
  if (a.swingT >= 0) {
    const k = md.swingMode === 'contact' ? 0.38 + clamp(a.swingT / 0.4, 0, 1) * 0.62 : clamp(a.swingT / 0.4, 0, 1);
    pose = swingPose(md.swingKind, k); rate = 0; if (md.swingKind === 'hi' && k < 0.6) fpose = FREE.up;
  }
  else if (md.pred && md.pred.t < 0.55 && a.diveT < 0 && a.recoverT <= 0) {
    // wind up so the swing arrives exactly when the shuttle does
    const pt = md.pred.t, k = pt <= 0.26 ? 0.12 + (1 - pt / 0.26) * 0.26 : 0.12 * (1 - (pt - 0.26) / 0.29);
    pose = swingPose(md.pred.type, k); rate = pt <= 0.26 ? 0 : 14; if (md.pred.type === 'hi') fpose = FREE.up;
  }
  else if (a.diveT >= 0 || a.recoverT > 0) { pose = POSE.dive; fpose = FREE.dive; }
  else if (a.mood > 0 && (m.state === 'point' || m.state === 'gameBreak')) { pose = mixPose(POSE.cheer, POSE.ready, 0.5 + Math.sin(t * 10) * 0.5); fpose = FREE.up; }
  else if (holding) { pose = POSE.serve; fpose = FREE.hold; }
  else if (hold.on && session && a.i === session.me) { const c = chargeNow(); pose = mixPose(POSE.ready, POSE.cockHi, c); mdl.body.position.y -= c * 0.06; }
  else if (incoming) {
    // get the racket back early as the shuttle comes in
    const d = Math.hypot(sh.p.x - a.x, sh.p.z - a.z);
    const prep = clamp(1 - (d - 0.6) / 2.2, 0, 1);
    if (prep > 0) { const hi = sh.p.y > 1.45; pose = mixPose(POSE.ready, hi ? POSE.cockHi : POSE.cockLo, prep * 0.85); if (hi) fpose = mixPose(FREE.rest, FREE.up, prep); }
  }
  // the non-racket arm swings opposite the legs while running
  if (fpose === FREE.rest && run > 0.05) fpose = { s: [FREE.rest.s[0] + Math.sin(md.phase) * 0.7 * run * Math.sign(fwd || 1), FREE.rest.s[1]], e: [FREE.rest.e[0] - 0.3 * run, FREE.rest.e[1]], w: 0 };
  if (debugPose && session && a.i === session.me) { pose = debugPose.k !== undefined ? swingPose(debugPose.hi, debugPose.k) : POSE[debugPose.name]; fpose = debugPose.free ? FREE[debugPose.free] : fpose; rate = 0; }
  if (matchClipsEnabled && !debugPose) { mdl.arm.rotation.y = 0; mdl.armEl.rotation.y = 0; mdl.wrist.rotation.y = 0; mdl.wrist.rotation.z = 0; }
  setArm(mdl, 'arm', pose, rate, dt);
  setArm(mdl, 'free', fpose, debugPose ? 0 : 9, dt);
  if (matchClipsEnabled && !debugPose) {
    const ev = md.strokeEvent;
    if (ev) {
      const clip = selectMatchStroke(a, mdl.h, ev);
      md.stroke = clip ? { clip, elapsed: 0, event: ev } : null;
      md.strokeEvent = null;
    }
    if (m.state !== 'rally' || a.diveT >= 0 || a.recoverT > 0) md.stroke = null;
    let stroke = md.stroke, clip = stroke && stroke.clip, ct;
    if (!holding) md.serveClipTime = 0;
    if (stroke) ct = SPAnim.CLIPS[clip].contact + stroke.elapsed;
    else if (holding) {
      // While the shuttle is held, settle into the authored service preparation.
      // Release timing remains authoritative; never delay input or the physics.
      // Shot choice is unknowable until input: shared neutral preparation avoids a false high-serve windup.
      clip = null;
      md.serveClipTime = 0;
    }
    else if (md.pred && md.pred.t < 0.3 && incoming && a.diveT < 0) {
      // Preparation uses the clip the hit will select when that is already determined; the hit event still decides.
      clip = md.pred.clip || null;
      ct = clip ? Math.max(0, SPAnim.CLIPS[clip].contact - md.pred.t) : 0;
    }
    // Unknown shot: no clip is assumed. What every candidate shares is the contact point.
    if (!clip && !stroke && !holding && md.pred && md.pred.t < 0.3 && incoming && a.swingT < 0 && a.diveT < 0 && a.recoverT <= 0 && mdl.rig) {
      const layerNodes=[mdl.arm,mdl.armEl,mdl.wrist,mdl.rig.chest];
      // Independent poses (never the damped Euler values of the last rendered frame).
      const setBase=(p)=>{mdl.arm.rotation.set(p.s[0],0,p.s[1]*mdl.h); mdl.armEl.rotation.set(p.e[0],0,p.e[1]*mdl.h); mdl.wrist.rotation.set(p.w,0,0); mdl.rig.chest.rotation.set(0,0,0);};
      // 1. Aim: fit the neutral swing's own contact pose to the predicted contact point. That correction varies
      //    slowly (only with the prediction and the body), so the 8 rad/s slew keeps up with it.
      const hit=swingPose(md.pred.type,0.38), fitTarget=new THREE.Vector3(md.pred.x,md.pred.y,md.pred.z);
      setBase(hit);
      const hitBase=layerNodes.map(n=>n.quaternion.clone());
      if(!md.neutralCorrection) md.neutralCorrection=layerNodes.map(()=>new THREE.Quaternion());   // enter from no correction, slewed like every later frame
      const correction=trackMatchAim(md,'neutralAim',mdl,layerNodes,hitBase,fitTarget,md.neutralCorrection,md.pred.t,dt);
      md.neutralCorrection=correction.map(q=>q.clone());
      // 2. Show: the neutral swing, carrying the aim in as the shuttle arrives; at contact it is the fitted contact
      //    pose, which the hit frame then starts from. A low swing goes from ready straight to its contact pose:
      //    its drawn-back start passes through the floor (the floor guard would pop the wrist).
      const u=clamp((0.3-md.pred.t)/0.3,0,1);
      setBase(md.pred.type!=='hi' ? mixPose(POSE.ready,hit,u*u*(3-2*u)) : pose);   // side-arm and low wind-ups can dip under the floor (floor-guard pop)
      const base=layerNodes.map(n=>n.quaternion.clone()), w=clamp(1-md.pred.t/0.2,0,1), weight=w*w*(3-2*w);
      layerNodes.forEach((n,i)=>n.quaternion.copy(base[i]).multiply(new THREE.Quaternion().slerp(correction[i],weight)));
      md.matchClip='neutralPrep';   // owner label: crossfades in and out, chest restored before the next frame
    } else { md.neutralCorrection=null; md.neutralAim=null; }
    if (clip) {
      const contact = SPAnim.CLIPS[clip].contact, length = SPAnim.clipLength(clip);
      const q = SPAnim.sample(clip, ct);
      // Layer authored arms over distance-driven feet. Recovery yields gradually to locomotion.
      const blend = stroke ? clamp((length - ct) / 0.22, 0, 1) : holding ? clamp(ct/0.2,0,1) : clamp((0.3-md.pred.t)/0.12,0,1);
      // Independent authored state: never derive it from last rendered corrected Euler angles.
      const ap=mixPose(pose,q.arm,blend);
      const armNodes=[mdl.arm,mdl.armEl,mdl.wrist];
      const clean=[new THREE.Quaternion().setFromEuler(new THREE.Euler(ap.s[0],0,ap.s[1]*mdl.h,'XYZ')),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(ap.e[0],0,ap.e[1]*mdl.h,'XYZ')),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(ap.w,0,0,'XYZ'))];
      const boundary=(m.state==='serve'?'serve':'rally')+':'+clip;
      if(!md.armLayer || md.armLayer.boundary!==boundary || (stroke && stroke.elapsed===0)) {
        md.armLayer={boundary,authored:clean.map(q=>q.clone()),correction:null};
      }
      md.armLayer.authored=clean.map(q=>q.clone());
      armNodes.forEach((n,i)=>n.quaternion.copy(md.armLayer.authored[i]));
      setArm(mdl, 'free', mixPose(fpose,q.free,blend), 0, dt);
      const target = stroke ? stroke.event : md.pred;
      if (target && (!stroke || stroke.elapsed < 0.16)) {
        // Measure the selected clip's contact pose, not the old hi/mid/lo calibration.
        // Temporarily sampling joints does not render or move the root/feet.
        const rotations = [mdl.arm, mdl.armEl, mdl.wrist].map(n => n.quaternion.clone());
        const contactPose = SPAnim.sample(clip, contact);
        setArm(mdl, 'arm', contactPose.arm, 0, 0);
        mdl.root.updateMatrixWorld(true);
        const localTip = mdl.wrist.localToWorld(new THREE.Vector3(0,-0.71,0));
        mdl.root.worldToLocal(localTip);
        [mdl.arm, mdl.armEl, mdl.wrist].forEach((n,i)=>n.quaternion.copy(rotations[i]));
        const dx=target.x-(target.ax===undefined?a.x:target.ax), dz=target.z-(target.az===undefined?a.z:target.az);
        const desired=Math.atan2(dx,dz)-Math.atan2(localTip.x,localTip.z);
        const relative=Math.atan2(Math.sin(desired-facing),Math.cos(desired-facing));
        md.clipFacing=facing+clamp(relative,-1.2,1.2);
      }

      const w = stroke ? clamp(1-stroke.elapsed/0.16,0,1) : holding ? 0 : clamp(1-md.pred.t/0.2,0,1);
      const layerNodes=[mdl.arm,mdl.armEl,mdl.wrist,mdl.rig.chest];
      const base=layerNodes.map(n=>n.quaternion.clone());
      // Preparation aims the clip's own contact pose (its correction varies slowly, so the slew keeps up and the hit
      // frame starts from a racket that is already there); a running stroke is fitted where it is.
      let aim=base;
      if(!stroke && w>0){
        const cpose=SPAnim.sample(clip,contact).arm;
        aim=[new THREE.Quaternion().setFromEuler(new THREE.Euler(cpose.s[0],0,cpose.s[1]*mdl.h,'XYZ')),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(cpose.e[0],0,cpose.e[1]*mdl.h,'XYZ')),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(cpose.w,0,0,'XYZ')), base[3].clone()];
        layerNodes.forEach((n,i)=>n.quaternion.copy(aim[i]));
      }
      if(w>0){
        if(stroke && stroke.elapsed===0){
          md.armLayer.correction=base.map((q,i)=>q.clone().invert().multiply(previousSolved[i]));
        }
        // Solver warm start is a separate pose, not next frame's authored data.
        const fitTarget=new THREE.Vector3(target.x,target.y,target.z);
        if(stroke && stroke.elapsed===0) mdl.rig.chest.quaternion.copy(previousSolved[3]);   // clips do not author the chest: start it where it was rendered
        let fitError=0, fitStart='clean', tracked=null;
        if(!stroke){
          // preparation: branch-stable aim, shown correction arrives by the predicted contact time
          if(!md.armLayer.correction) md.armLayer.correction=layerNodes.map(()=>new THREE.Quaternion());
          tracked=trackMatchAim(md.armLayer,'aim',mdl,layerNodes,aim,fitTarget,md.armLayer.correction,md.pred.t,dt);
        } else fitError=fitMatchClean(mdl,fitTarget);
        if(stroke && md.armLayer.correction){
          // Lower contact error wins; an exact tie keeps the warm start (continuity).
          const cleanSolved=layerNodes.map(n=>n.quaternion.clone());
          layerNodes.forEach((n,i)=>n.quaternion.copy(aim[i]).multiply(md.armLayer.correction[i]));
          const warmError=fitMatchRacket(mdl,fitTarget,1);
          if(window.__matchFitTrace) window.__matchFitTrace({player:a.i,clip,clock:m.clock,first:!!(stroke && stroke.elapsed===0),stroke:!!stroke,clean:fitError,warm:warmError});
          if(warmError<=fitError+0.02){fitError=warmError;fitStart='warm';}   // warm keeps unless beaten by more than the finest solver step
          else layerNodes.forEach((n,i)=>n.quaternion.copy(cleanSolved[i]));
        }
        let correction=tracked || layerNodes.map((n,i)=>aim[i].clone().invert().multiply(n.quaternion));
        if(!tracked && md.armLayer.correction && !(stroke && stroke.elapsed===0)) correction=correction.map((q,i)=>{
          const prev=md.armLayer.correction[i],angle=prev.angleTo(q);
          return prev.clone().slerp(q,angle?Math.min(1,8*dt/angle):1);
        });
        md.armLayer.correction=correction.map(q=>q.clone());
        const weight=w*w*(3-2*w);
        layerNodes.forEach((n,i)=>n.quaternion.copy(base[i]).multiply(new THREE.Quaternion().slerp(correction[i],weight)));
      }else{
        md.armLayer.correction=null;
        layerNodes.forEach((n,i)=>n.quaternion.copy(base[i]));
      }
      md.matchClip = clip;
      if (stroke) {
        if (stroke.elapsed === 0) {
          mdl.root.updateMatrixWorld(true);
          const hp=mdl.wrist.localToWorld(new THREE.Vector3(0,-0.71,0));
          md.clipMeasurement = {clip,shot:target.shot,team:a.team,hand:mdl.h,character:a.char,contactTime:ct,expected:contact,
            receivedClock:target.receivedClock,renderClock:m.clock,target:[target.x,target.y,target.z],
            athleteAtEvent:[target.athleteX,target.athleteZ],athleteAtRender:[a.x,a.z],
            error:hp.distanceTo(new THREE.Vector3(target.x,target.y,target.z))};
          (window.__matchClipHits ||= []).push(md.clipMeasurement);
          if(window.__matchClipHits.length>1000) window.__matchClipHits.shift();
        }
        stroke.elapsed += dt;
        if (ct >= length) {
          md.stroke=null;
          // Save the outgoing full-body pose before ready takes ownership.
          md.readyHandoff={elapsed:0,nodes:[mdl.body,mdl.rig.hips,mdl.rig.chest,mdl.head,...mdl.rig.legs.flatMap(l=>[l.thigh,l.knee,l.ankle])].map(node=>({node,p:node.position.clone(),q:node.quaternion.clone()}))};
        }
      }
    }
  }
  if(md.readyHandoff && (md.stroke || cp || a.swingT>=0 || a.diveT>=0 || speed>=0.3 || m.state!=='rally')) md.readyHandoff=null;
  if (matchClipsEnabled && !debugPose && holding && mdl.rig && !md.stroke) {
    const p=POSE.serve, holdNodes=[mdl.arm,mdl.armEl,mdl.wrist,mdl.rig.chest];
    mdl.arm.rotation.set(p.s[0],0,p.s[1]*mdl.h); mdl.armEl.rotation.set(p.e[0],0,p.e[1]*mdl.h); mdl.wrist.rotation.set(p.w,0,0); mdl.rig.chest.rotation.set(0,0,0);
    const holdTarget=new THREE.Vector3(sh.p.x,sh.p.y,sh.p.z), holdClean=holdNodes.map(n=>n.quaternion.clone());
    const holdGap=()=>{mdl.root.updateMatrixWorld(true);return mdl.wrist.localToWorld(new THREE.Vector3(0,-0.71,0)).distanceTo(holdTarget);};
    // The target is static while held: keep the last solution until it drifts past the solver's finest step (~2 cm).
    if(md.holdSolved) holdNodes.forEach((n,i)=>n.quaternion.copy(md.holdSolved[i]));
    if(!md.holdSolved || holdGap()>md.holdGapSolved+0.02){
      const warmError=md.holdSolved?fitMatchRacket(mdl,holdTarget,1):Infinity, warmSolved=holdNodes.map(n=>n.quaternion.clone());
      holdNodes.forEach((n,i)=>n.quaternion.copy(holdClean[i]));
      if(fitMatchClean(mdl,holdTarget)+0.02>=warmError) holdNodes.forEach((n,i)=>n.quaternion.copy(warmSolved[i]));
      md.holdSolved=holdNodes.map(n=>n.quaternion.clone()); md.holdGapSolved=holdGap();
    }
    // Shown pose slews from the last rendered pose at the fitted layer's existing 8 rad/s limit.
    holdNodes.forEach((n,i)=>{const to=n.quaternion.clone(), angle=previousSolved[i].angleTo(to); n.quaternion.copy(previousSolved[i]).slerp(to,angle>0?Math.min(1,8*dt/angle):1);});
    md.matchClip='serveHold';
  } else md.holdSolved=null;
  if(md.armLayer && (!md.matchClip || a.diveT>=0 || m.state!=='rally')) md.armLayer=null;
  // Opt-in first integration: only grounded, stationary rally readiness/split-step.
  // Shot prediction, serves, movement, dives and all contact poses stay procedural.
  if (matchClipsEnabled && mdl.rig && m.state === 'rally' && speed < 0.3 &&
      a.jumpY === 0 && a.diveT < 0 && a.recoverT <= 0 && a.swingT < 0 &&
      !md.stroke && !cp && !(hold.on && session && a.i === session.me) && !debugPose) {
    const name = a.splitT > 0 ? 'splitStep' : 'ready';
    const clipTime = name === 'splitStep' ? clamp((0.28 - a.splitT) / 0.28, 0, 1) * 0.6 : t;
    if (!md.readyHandoff && md.readyFrame !== md.frameNo - 1)   // fresh entry: blend in from the pose it has now
      md.readyHandoff={elapsed:0,nodes:[mdl.body,mdl.rig.hips,mdl.rig.chest,mdl.head,...mdl.rig.legs.flatMap(l=>[l.thigh,l.knee,l.ankle])].map(node=>({node,p:node.position.clone(),q:node.quaternion.clone()}))};
    md.readyFrame = md.frameNo;
    mdl.body.position.y = 0;
    mdl.body.rotation.x = 0; mdl.body.rotation.z = 0;
    SPAnim.apply(mdl, SPAnim.sample(name, clipTime), { noJump: true });
    if(md.readyHandoff) {
      const handoff=md.readyHandoff, u=clamp(handoff.elapsed/0.22,0,1), blend=u*u*(3-2*u);
      for(const prev of handoff.nodes) {
        const targetP=prev.node.position.clone(),targetQ=prev.node.quaternion.clone();
        prev.node.position.copy(prev.p).lerp(targetP,blend);
        prev.node.quaternion.copy(prev.q).slerp(targetQ,blend);
      }
      handoff.elapsed+=dt;
      if(u>=1)md.readyHandoff=null;
    }
    md.matchClip = name;
  }
  if (matchClipsEnabled && mdl.rig && !debugPose) {
    const owner = md.stroke ? 'stroke' : (md.matchClip || 'procedural');
    if (owner !== md.armOwner) md.armFade = owner === 'stroke' || md.armOwner === undefined ? null : { elapsed: 0, from: previousSolved };
    md.armOwner = owner;
    if (md.armFade) {
      md.armFade.elapsed += dt;
      const u = clamp(md.armFade.elapsed / 0.1, 0, 1), k = u * u * (3 - 2 * u);
      const layerOwned = owner !== 'procedural' && owner !== 'ready' && owner !== 'splitStep';
      [mdl.arm, mdl.armEl, mdl.wrist, mdl.rig.chest].forEach((n, i) => {
        if (i === 3 && !layerOwned) return;   // chest belongs to locomotion / ready handoff there
        const to = n.quaternion.clone(); n.quaternion.copy(md.armFade.from[i]).slerp(to, k);
      });
      if (u >= 1) md.armFade = null;
    }
  }
  if (matchClipsEnabled && !debugPose && mdl.rig) {
    // Continuous guard: blend the racket arm toward a pose that is clear of the floor (ready; lying in a dive: racket
    // held up) by the smallest amount that lifts the racket clear. The wrist-bending guard below is the safety net.
    mdl.root.updateMatrixWorld(true);
    const low = () => { let mn = 9; for (const y of [-0.4, -0.6, -0.71, -0.86]) mn = Math.min(mn, mdl.wrist.localToWorld(guardV.set(0, y, 0)).y); return mn; };
    if (low() < 0.06) {
      const nodes = [mdl.arm, mdl.armEl, mdl.wrist], from = nodes.map(n => n.quaternion.clone());
      for (const p of [POSE.ready, POSE.cockHi, POSE.hitHi]) {
      const safe = [new THREE.Quaternion().setFromEuler(new THREE.Euler(p.s[0], 0, p.s[1] * mdl.h, 'XYZ')), new THREE.Quaternion().setFromEuler(new THREE.Euler(p.e[0], 0, p.e[1] * mdl.h, 'XYZ')), new THREE.Quaternion().setFromEuler(new THREE.Euler(p.w, 0, 0, 'XYZ'))];
      const set = (u) => { nodes.forEach((n, i) => n.quaternion.copy(from[i]).slerp(safe[i], u)); mdl.arm.updateMatrixWorld(true); return low(); };
      let lo = 0, hi = 1;
      if (set(1) >= 0.06) { for (let i = 0; i < 7; i++) { const mid = (lo + hi) / 2; if (set(mid) >= 0.06) hi = mid; else lo = mid; } set(hi); break; }
      set(0);
      }
    }
  }
  floorGuard(mdl);
  if (matchClipsEnabled && md.checkAt && md.clipMeasurement) {
    mdl.root.updateMatrixWorld(true);
    const hp = mdl.wrist.localToWorld(new THREE.Vector3(0,-0.71,0));
    const c = md.checkAt;
    md.clipMeasurement.postGuardError = hp.distanceTo(new THREE.Vector3(c.x,c.y,c.z));
    md.clipMeasurement.racketAtRender = hp.toArray();
    md.clipMeasurement = null;
  }
  if (matchClipsEnabled) {
    mdl.root.updateMatrixWorld(true);
    const tip=mdl.wrist.localToWorld(new THREE.Vector3(0,-0.71,0));
    const joints=[mdl.root,mdl.arm,mdl.armEl,mdl.wrist].map(n=>n.quaternion.clone());
    if(md.continuity && window.__captureClipSequence) window.__captureClipSequence({player:a.i,clip:md.matchClip||null,dt,
      racketDelta:tip.distanceTo(md.continuity.tip), angles:joints.map((q,i)=>q.angleTo(md.continuity.joints[i])),
      clock:m.clock,root:[a.x,a.jumpY,a.z]});
    md.continuity={tip,joints};
  }
  if (mdl.update) mdl.update(dt, t);   // tail / ear secondary motion
  if (md.checkAt && window.__contacts) {   // debug: how far the drawn racket head is from the shuttle at contact
    const hp = mdl.wrist.localToWorld(new THREE.Vector3(0, -0.71, 0)), c = md.checkAt;
    const hl = md.headLocal && md.headLocal[md.swingKind], ad = Math.hypot(c.x - a.x, c.z - a.z);
    window.__contacts.push({ d: +Math.hypot(hp.x - c.x, hp.y - c.y, hp.z - c.z).toFixed(2), dy: +(hp.y - c.y).toFixed(2), dxz: +Math.hypot(hp.x - c.x, hp.z - c.z).toFixed(2), h: +c.y.toFixed(2), reachDist: +ad.toFixed(2), headR: hl ? +hl.r.toFixed(2) : null, headY: hl ? +hl.y.toFixed(2) : null, lunge: +(md.lunge || 0).toFixed(2), swingT: +a.swingT.toFixed(2), yawErr: +(Math.atan2(Math.sin(md.yaw - yaw), Math.cos(md.yaw - yaw))).toFixed(2), kind: md.swingKind, mode: md.swingMode });
  }
  md.checkAt = null;
  md.shadow.position.set(a.x, 0.032, a.z);
  md.shadow.scale.setScalar(1 - Math.min(0.5, a.jumpY * 0.4));
  if (a.emote !== md.emoteShown) {
    if (md.emoteSprite) { mdl.root.remove(md.emoteSprite); md.emoteSprite.material.dispose(); md.emoteSprite = null; }
    if (a.emote) { md.emoteSprite = emojiSprite(EMOTES[a.emote - 1] || '❤️'); mdl.root.add(md.emoteSprite); md.emoteBorn = t; }
    md.emoteShown = a.emote;
  }
  if (md.emoteSprite) { const k = Math.min(1, (t - md.emoteBorn) * 6); md.emoteSprite.position.y = 2.35 + Math.sin(t * 4) * 0.05; md.emoteSprite.scale.setScalar(0.85 * k); }
}

// confetti burst from above the court when you score
const CONF_N = 260;
const confetti = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.12, 0.07), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }), CONF_N);
confetti.frustumCulled = false; confetti.visible = false; scene.add(confetti);
const confP = Array.from({ length: CONF_N }, () => ({ x: 0, y: -10, z: 0, vx: 0, vy: 0, vz: 0, r: 0, w: 0, life: 0 }));
{ const cc = [0xff5e7a, 0xffc94d, 0x6b8cff, 0x5bbf8a, 0xc58cff, 0xffffff, 0x7fe3ff], c = new THREE.Color(); for (let i = 0; i < CONF_N; i++) confetti.setColorAt(i, c.setHex(cc[i % cc.length])); }
let confLive = 0;
function confettiBurst(zs) {
  for (const p of confP) {
    p.x = rand(-6, 6); p.y = rand(6, 9); p.z = zs * rand(1, 8);
    p.vx = rand(-1.5, 1.5); p.vy = rand(-1, 2); p.vz = rand(-1.5, 1.5); p.r = rand(0, 6); p.w = rand(4, 11); p.life = rand(3, 4.5);
  }
  confLive = 4.5; confetti.visible = true;
}
const confD = new THREE.Object3D();
function confettiTick(dt) {
  if (confLive <= 0) return;
  confLive -= dt;
  for (let i = 0; i < CONF_N; i++) {
    const p = confP[i];
    p.life -= dt; p.vy = Math.max(p.vy - 4 * dt, -1.1); p.vx *= 1 - dt * 0.8; p.vz *= 1 - dt * 0.8;
    p.x += (p.vx + Math.sin(p.r) * 0.4) * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.r += p.w * dt;
    confD.position.set(p.x, p.life > 0 && p.y > 0.05 ? p.y : -20, p.z); confD.rotation.set(p.r, p.r * 0.7, p.r * 0.3); confD.updateMatrix();
    confetti.setMatrixAt(i, confD.matrix);
  }
  confetti.instanceMatrix.needsUpdate = true;
  if (confLive <= 0) confetti.visible = false;
}

const upV = new THREE.Vector3(0, 1, 0), vdir = new THREE.Vector3();
function animateShuttle(m) {
  const s = m.shuttle;
  shuttleMesh.position.set(s.p.x, s.p.y + 0.05, s.p.z);
  if (s.held) {
    shuttleMesh.quaternion.setFromUnitVectors(upV, vdir.set(0, -1, 0));
    const md = session.models[m.serverIdx];
    if (md && md.model.freeWr) { md.model.freeWr.updateMatrixWorld(true); md.model.freeWr.localToWorld(vdir.set(0, -0.03, 0.05)); shuttleMesh.position.set(vdir.x, vdir.y - 0.05, vdir.z); }
  }
  else if (s.live) { vdir.set(s.v.x, s.v.y, s.v.z); if (vdir.lengthSq() > 0.01) shuttleMesh.quaternion.setFromUnitVectors(upV, vdir.normalize()); }
  else shuttleMesh.quaternion.setFromUnitVectors(upV, vdir.set(0.3, -0.2, 0.9).normalize());
  const vp = shuttleMesh.position;   // visual position (follows the server's paw while held)
  shuttleShadow.position.set(vp.x, 0.034, vp.z);
  shuttleShadow.scale.setScalar(Math.max(0.55, 1.15 - s.p.y * 0.08));
  if (s.live) { trailPts.push(s.p.x, s.p.y, s.p.z); if (trailPts.length > TRAIL_N * 3) trailPts.splice(0, 3); }
  const arr = trailGeo.attributes.position.array, n = trailPts.length / 3;
  for (let i = 0; i < TRAIL_N; i++) {
    const j = Math.max(0, Math.min(n - 1, i - (TRAIL_N - n)));
    arr[i * 3] = n ? trailPts[j * 3] : s.p.x; arr[i * 3 + 1] = n ? trailPts[j * 3 + 1] : s.p.y; arr[i * 3 + 2] = n ? trailPts[j * 3 + 2] : s.p.z;
  }
  trailGeo.attributes.position.needsUpdate = true;
  trail.visible = settings.showTrail && s.live;   // optional (off by default)
  // guide line under the shuttle: an aid for games vs bots only
  dropLine.visible = settings.dropLine && session.kind === 'local' && (s.live || s.held) && s.p.y > 0.25;
  if (dropLine.visible) {
    const d = dropGeo.attributes.position.array;
    d[0] = vp.x; d[1] = vp.y; d[2] = vp.z; d[3] = vp.x; d[4] = 0.04; d[5] = vp.z;
    dropGeo.attributes.position.needsUpdate = true; dropLine.computeLineDistances();
  }
}

function updatePowerBar() {
  const bar = $('powerBar'), btn = $('hitBtn');
  const now = performance.now();
  const show = session && session.me >= 0 && !session.over && (hold.on || now < hold.shownUntil);
  const v = hold.on ? chargeNow() : hold.last;
  if (btn) btn.style.setProperty('--p', hold.on ? v.toFixed(3) : 0);
  if (!show) { bar.classList.add('hidden'); return; }
  const a = session.m.athletes[session.me];
  tmpV.set(a.x, 2.2 + a.jumpY, a.z).project(camera);
  bar.style.left = ((tmpV.x + 1) / 2 * viewW) + 'px'; bar.style.top = ((1 - tmpV.y) / 2 * viewH) + 'px';
  bar.classList.remove('hidden');
  bar.classList.toggle('full', hold.on && v >= 1);
  $('pbFill').style.height = (v * 100) + '%';
  const sh = session.m.shuttle.p;
  $('pbLabel').textContent = settings.ctrl === 'simple' && !hold.on
    ? (v < 0.35 ? 'Bỏ nhỏ' : v < 0.72 ? 'Phông cầu' : (sh.y > 2.0 ? 'ĐẬP!' : 'Tạt nhanh'))
    : v < 0.35 ? 'Nhẹ · bỏ nhỏ' : v < 0.72 ? 'Vừa · phông cầu' : (sh.y > 2.0 ? 'Mạnh · ĐẬP!' : 'Mạnh · tạt nhanh');
}
function updateAids(t) {
  const m = session.m, me = session.me, s = m.shuttle;
  const mine = me >= 0 ? m.athletes[me] : null;
  const incoming = s.live && !s.netted && s.lastTeam !== session.myTeam;
  const pr = s.pred;
  const sideOK = me < 0 || (pr && pr.z * S.sgn(session.myTeam) > 0);
  // landing call (white = in, red X = out): optional; on by default vs bots, off by default online
  const markerOn = session.kind === 'local' ? settings.marker : settings.markerOnline;
  marker.visible = !!(markerOn && s.live && pr && sideOK && !s.netted);
  if (marker.visible) {
    marker.position.x = pr.x; marker.position.z = pr.z;
    marker.material.color.setHex(pr.inside ? 0xffffff : 0xff3b3b);
    markerX.visible = !pr.inside; markerDot.visible = markerDotEdge.visible = pr.inside;
    marker.material.opacity = 0.85 + Math.sin(t * 8) * 0.12;
  }
  aimMark.visible = false;
  const queuedNow = mine && !hold.on && queued.power >= 0 && performance.now() < queued.until && (session.kind !== 'local' || mine.hitQueue > 0);
  if (mine && (hold.on || queuedNow) && m.state === 'rally') {
    const c = hold.on ? chargeNow() : queued.power, sg = S.sgn(session.myTeam), mv = readMove();
    const ax = mv.x > 0.35 ? 1 : mv.x < -0.35 ? -1 : 0;
    const W = m.doubles ? 2.6 : 2.2;
    let depth;
    if (c < 0.35) depth = lerp(0.8, 2.4, c / 0.35);
    else if (c < 0.72) depth = lerp(4.3, m.doubles ? 5.8 : 6.1, (c - 0.35) / 0.37);
    else depth = lerp(3.4, 5.4, (c - 0.72) / 0.28);
    aimMark.visible = settings.showAim;   // optional (off by default)
    aimMark.position.x = ax * (W - 0.38) * sg; aimMark.position.z = -sg * depth;
    const col = c < 0.35 ? 0x5bbf8a : c < 0.72 ? 0xffc94d : 0xff5e5e;
    aimRing.material.color.setHex(col); aimBand.material.color.setHex(col);
    aimRing.visible = aimDot.visible = ax !== 0;
    aimBand.visible = !aimRing.visible;
    if (aimBand.visible) { aimMark.position.x = 0; aimBand.scale.x = W * 2; }
    aimRing.scale.setScalar(1 + Math.sin(t * 10) * 0.08);
  }
  if (!mine) { reachRing.visible = timingRing.visible = false; return; }
  reachRing.visible = settings.showReach && (m.state === 'rally' || m.state === 'serve');   // optional (off by default)
  reachRing.position.set(mine.x, 0.04, mine.z);
  reachRing.scale.setScalar(mine.st.reach * 1.05);
  const r = incoming ? S.inReachAt(mine, s.p) : { ok: false };
  reachRing.material.opacity = r.ok ? 0.75 : 0.22;
  reachRing.material.color.setHex(r.ok ? 0xffd23f : 0xff9a7a);
  reachRing.material.opacity = r.ok ? 0.8 : 0.45;
  timingRing.visible = false;
  if (settings.ring && incoming && m.state === 'rally') {
    const p = { x: s.p.x, y: s.p.y, z: s.p.z }, v = { x: s.v.x, y: s.v.y, z: s.v.z };
    let tEnter = -1;
    for (let k = 0; k < 180; k++) {
      if (S.inReachAt(mine, p).ok) { tEnter = k * S.DT; break; }
      S.stepShuttle(p, v, S.DT, m.wind);
      if (p.y <= 0) break;
    }
    // timing meter: time until the shuttle reaches your racket (sim seconds); negative = it is already there
    const nowS = performance.now() / 1000 * TIME_SCALE;
    if (r.ok) { if (tm.since < 0) tm.since = nowS; } else tm.since = -1;
    if (tEnter >= 0) tm.hY = p.y;                      // height where it will meet the racket
    const tt = r.ok ? -(nowS - tm.since) : tEnter;
    if ((tEnter >= 0 && tEnter < 1.6) || r.ok) showMeter(tt, r.ok ? s.p.y : tm.hY, mine);
    else hideMeter();
  } else hideMeter();
}

// ---- timing meter: a dot slides toward the "racket" line; press while it is in green = Perfect, yellow = Good
const tm = { since: -1, t: null, press: null, hY: 1.5, el: null, shown: false, zonesFor: null };
// zones in sim seconds before contact, matching sim.js: assisted = up to 0.38 s early or 0.2 s after it arrives is Perfect,
// earlier presses lose quality slowly; 'Chuyên' = the swing must meet the shuttle 0.035..0.15 s after pressing
const TM_RANGE = [-0.45, 1.6];
function tmZones(assist) {
  return assist ? [['late', -0.45, -0.2], ['perf', -0.2, 0.38], ['good', 0.38, 1.0], ['early', 1.0, 1.6]]
    : [['late', -0.45, 0], ['good', 0, 0.035], ['perf', 0.035, 0.15], ['good', 0.15, 0.24], ['early', 0.24, 1.6]];
}
const tmX = (t) => ((clamp(t, TM_RANGE[0], TM_RANGE[1]) - TM_RANGE[0]) / (TM_RANGE[1] - TM_RANGE[0])) * 100;
function buildMeter() {
  const st = document.createElement('style');
  st.textContent = `.touchui #tmeter{bottom:auto;top:calc(76px + env(safe-area-inset-top))}
#tmeter{position:fixed;left:50%;bottom:calc(10px + env(safe-area-inset-bottom));transform:translateX(-50%);width:min(420px,78vw);pointer-events:none;z-index:6;opacity:0;transition:opacity .15s}
#tmeter.on{opacity:1}
#tmeter .tm-hint{text-align:center;color:#fff;font-weight:800;font-size:13px;margin-bottom:5px;text-shadow:0 2px 3px rgba(0,0,0,.6)}
#tmeter .tm-hint b{color:#ffd23f}
#tmeter .tm-bar{position:relative;height:16px;border-radius:9px;background:rgba(20,18,40,.7);border:2px solid rgba(255,255,255,.85)}
#tmeter .z{position:absolute;top:0;bottom:0}
#tmeter .z.perf{background:#3fd47f}#tmeter .z.good{background:#ffc94d}#tmeter .z.early,#tmeter .z.late{background:rgba(255,94,94,.75)}
#tmeter .z:first-child{border-radius:7px 0 0 7px}#tmeter .z:nth-last-child(4){border-radius:0 7px 7px 0}
#tmeter .tm-mid{position:absolute;top:-6px;bottom:-6px;width:3px;margin-left:-1.5px;background:#fff;border-radius:2px;box-shadow:0 0 6px #fff}
#tmeter .tm-dot{position:absolute;top:50%;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;background:#fff;border:3px solid #2b2340;box-shadow:0 2px 6px rgba(0,0,0,.4)}
#tmeter .tm-press{position:absolute;top:-9px;bottom:-9px;width:4px;margin-left:-2px;background:#ff3fa4;border-radius:2px;display:none}
#tmeter .tm-cap{position:relative;height:13px;color:rgba(255,255,255,.9);font-size:10.5px;font-weight:800;margin-top:3px;text-shadow:0 1px 2px rgba(0,0,0,.6)}
#tmeter .tm-cap span{position:absolute;transform:translateX(-50%);white-space:nowrap}`;
  document.head.appendChild(st);
  const el = document.createElement('div'); el.id = 'tmeter';
  el.innerHTML = '<div class="tm-hint"></div><div class="tm-bar"></div><div class="tm-cap"></div>';
  $('hud').appendChild(el); tm.el = el;
}
function showMeter(t, h, mine) {
  if (!tm.el) buildMeter();
  const el = tm.el, bar = el.querySelector('.tm-bar'), assist = mine.assist ? 1 : 0;
  if (tm.zonesFor !== assist) {
    bar.innerHTML = tmZones(assist).map(([c, a, b]) => `<i class="z ${c}" style="left:${tmX(a)}%;width:${tmX(b) - tmX(a)}%"></i>`).join('')
      + `<s class="tm-mid" style="left:${tmX(0)}%"></s><u class="tm-press"></u><b class="tm-dot"></b>`;
    el.querySelector('.tm-cap').innerHTML = `<span style="left:${tmX(-0.35)}%">muộn</span><span style="left:${tmX(0)}%">▲ chạm vợt</span><span style="left:${tmX(assist ? 0.8 : 0.6)}%">sớm</span><span style="left:${tmX(1.45)}%">quá sớm</span>`;
    tm.zonesFor = assist;
  }
  bar.querySelector('.tm-dot').style.left = tmX(t) + '%';
  const pr = bar.querySelector('.tm-press');
  if (tm.press !== null) { pr.style.display = 'block'; pr.style.left = tmX(tm.press) + '%'; } else pr.style.display = 'none';
  tm.t = t;
  // what each key does at this contact height (same rules as the sim's shot choice)
  const K = (a) => keyLabel(keymap[a]);
  const jumpNote = mine.assist ? '' : ' (nhảy)';
  const txt = h > 1.6 ? `Cầu cao: <b>${K('smash')}</b> = ĐẬP${jumpNote} · <b>${K('hit')}</b> = phông · <b>${K('drop')}</b> = bỏ nhỏ`
    : h > 1.2 ? `Ngang người: <b>${K('smash')}</b> = tạt nhanh · <b>${K('hit')}</b> = phông · <b>${K('drop')}</b> = bỏ lưới`
    : h > 1.05 ? `Cầu thấp: <b>${K('hit')}</b>/<b>${K('smash')}</b> = phông lên · <b>${K('drop')}</b> = bỏ lưới`
    : `Cầu sát đất: <b>${K('hit')}</b>/<b>${K('smash')}</b> = lốp lên · <b>${K('drop')}</b> = bỏ lưới`;
  const hint = el.querySelector('.tm-hint'); if (hint.innerHTML !== txt) hint.innerHTML = txt;
  if (!tm.shown) { el.classList.add('on'); tm.shown = true; }
  tm.hideAt = 0;
}
function hideMeter() {
  tm.since = -1;
  if (!tm.shown) { tm.press = null; return; }
  // linger a moment after the hit so you can see where your press landed
  const n = performance.now();
  if (!tm.hideAt) tm.hideAt = n + 700;
  if (n >= tm.hideAt) { tm.el.classList.remove('on'); tm.shown = false; tm.hideAt = 0; tm.press = null; }
}

const camPos = new THREE.Vector3(0, 7, 14), camLook = new THREE.Vector3(0, 1, -2);
let camShake = 0;   // smash impact
let camOverride = null, debugSpeed = 1, freeCam = null, debugPose = null;
const HIGH_FOV = [36, 50];   // [landscape, portrait]
let camExtra = 0;            // extra fov added while a high shuttle would leave the top of the screen
const shuttleNdc = new THREE.Vector3();
function updateCamera(dt, t) {
  const portrait = viewH > viewW;
  let tx, ty, tz, lx, ly, lz;
  if (!session && (screen === 'chars' || screen === 'gear' || screen === 'shop' || screen === 'home')) {
    const side = portrait ? 0 : screen === 'home' ? 0.55 : 1.35;
    const lob = portrait && screen === 'home';   // lobby on a tall screen: the character stands just above the buttons, a little closer
    tx = side; ty = portrait ? 1.95 : 1.8; tz = 3.2 + (lob ? 6.3 : portrait ? 7.2 : 5.6); lx = side; ly = lob ? 0.35 : portrait ? -1.0 : 1.2; lz = 3.2;
    if (screen === 'gear' || screen === 'shop') {   // dressing room: move in on the part of the body being dressed ([look height, distance])
      const f = gearSlot === 'head' ? [1.62, 4.4] : gearSlot === 'face' ? [1.56, 3.5] : gearSlot === 'neck' ? [1.3, 3.5] : gearSlot === 'sets' || gearSlot === 'chests' ? [1.05, 5.3] : gearSlot === 'shoes' ? [0.62, 3.5] : gearSlot === 'racket' ? [1.4, 5.2] : gearSlot === 'shorts' ? [0.95, 3.7] : gearSlot === 'wrist' ? [1.1, 3.6] : [1.25, 3.9];
      const d = f[1] * (portrait ? 1.5 : 1);
      tz = 3.2 + d; ty = f[0] + 0.4; ly = f[0] - (portrait ? 0.3 * d : 0); tx = lx = portrait ? 0 : 1.35 * d / 5.6;
    }
  } else if (!session) {
    const a = t * 0.15;
    tx = Math.sin(a) * 2.4; ty = 2.6; tz = 3.2 + Math.cos(a) * 1.0 + 4.4; lx = 0; ly = 1.2; lz = 3.2;
  } else {
    const sg = S.sgn(session.myTeam);
    const me = session.me >= 0 ? session.m.athletes[session.me] : null;
    const px = me ? me.x * sg : 0, pz = me ? Math.abs(me.z) : 4;
    const mode = session.me < 0 && settings.cam === 'close' ? 'high' : settings.cam;
    if (mode === 'close') {
      tx = px * 0.45; ty = portrait ? 9.5 : 6.6; tz = Math.max(pz, 2) + (portrait ? 9.5 : 7.4);
      lx = px * 0.2; ly = 0.6; lz = portrait ? -2.2 : -1.6;
      if (session.m.doubles) { ty += 1.6; tz += 1.6; }
    } else if (mode === 'full') {
      tx = 0; ty = portrait ? 25 : 17.5; tz = portrait ? 10 : 9.5; lx = 0; ly = 0; lz = portrait ? 0.3 : 0.6;
    } else {
      const o = camOverride || {};
      tx = o.tx !== undefined ? o.tx : px * 0.25; ty = o.ty || (portrait ? 15.5 : 11.3); tz = (o.tz || (portrait ? 15 : 14.0)) + (pz - 4) * 0.35;
      lx = px * 0.1; ly = 0; lz = o.lz !== undefined ? o.lz : (portrait ? 1.1 : 1.6);   // aim a bit toward your end so your half is fully on screen
    }
    if (mode !== 'full') {
      const sh = session.m.shuttle;
      if (sh.live && sh.p.y > 2.6) {
        const k = Math.min(1, (sh.p.y - 2.6) / 5);
        ly += k * 2.4;                                         // look up with the shuttle
        lz = lerp(lz, sh.p.z * sg, k * 0.35);                  // and a little toward where it is
      }
    }
    tx *= sg; tz *= sg; lx *= sg; lz *= sg;
  }
  const k = session && session.snapCam ? 60 : 3;
  if (session) session.snapCam = false;
  camPos.x = damp(camPos.x, tx, k, dt); camPos.y = damp(camPos.y, ty, k, dt); camPos.z = damp(camPos.z, tz, k, dt);
  camLook.x = damp(camLook.x, lx, k, dt); camLook.y = damp(camLook.y, ly, k, dt); camLook.z = damp(camLook.z, lz, k, dt);
  // per-mode lens: the in-match 'high' view uses a long lens so the far half doesn't shrink
  const portrait2 = viewH > viewW;
  let fov = portrait2 ? 60 : 44;
  if (session && (session.me < 0 && settings.cam === 'close' ? 'high' : settings.cam) === 'high') fov = (camOverride && camOverride.fov) || (portrait2 ? HIGH_FOV[1] : HIGH_FOV[0]);
  if (freeCam) {   // debug: fixed camera for close-up screenshots
    camera.position.set(...freeCam.pos); camera.lookAt(...freeCam.look);
    if (camera.fov !== freeCam.fov) { camera.fov = freeCam.fov; camera.updateProjectionMatrix(); }
    if (venue && venue.overhead) for (const it of venue.overhead) it.o.visible = freeCam.pos[1] < it.y - 0.6;
    return;
  }
  const followShuttle = session && shuttleMesh;
  if (!followShuttle) camExtra = 0;
  fov += camExtra;
  if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
  camera.position.copy(camPos);
  if (camShake > 0.002) { camShake = damp(camShake, 0, 9, dt); camera.position.x += (Math.random() - 0.5) * camShake; camera.position.y += (Math.random() - 0.5) * camShake; }
  camera.lookAt(camLook);
  // keep a high shuttle on screen: widen the lens while it is near / past the top edge, relax once it drops
  if (followShuttle) {
    camera.updateMatrixWorld();
    const sp = session.m.shuttle.p;
    const live = session.m.shuttle.live;
    // exact lens so the shuttle stays below the score bar AND your own player stays on screen
    const base = fov - camExtra, aspect = camera.aspect;
    let tanNeed = 0;
    const fit = (x, y, z, mY, mX) => {
      shuttleNdc.set(x, y, z).applyMatrix4(camera.matrixWorldInverse);
      const fwd = -shuttleNdc.z; if (fwd < 0.5) return;
      tanNeed = Math.max(tanNeed, (shuttleNdc.y > 0 ? shuttleNdc.y / mY : -shuttleNdc.y / 0.92) / fwd, Math.abs(shuttleNdc.x) / fwd / mX / aspect);
    };
    if (live) {
      fit(sp.x, sp.y + 0.45, sp.z, 0.8, 0.9);
      fit(sp.x, sp.y - 0.12, sp.z, 0.8, 0.9);
      const mine = session.me >= 0 ? session.m.athletes[session.me] : null;
      if (mine) fit(mine.x, 0, mine.z, 0.8, 0.9);
    }
    const need = tanNeed ? 2 * Math.atan(tanNeed) * 180 / Math.PI : 0;
    const want = clamp(need - base, 0, 34);
    // widen quickly (never let the shuttle slip out), relax slowly
    camExtra = want > camExtra ? want : damp(camExtra, want, 1.6, dt);
    const fittedFov = base + camExtra;
    if (Math.abs(camera.fov - fittedFov) > 0.01) { camera.fov = fittedFov; camera.updateProjectionMatrix(); }
  }
  // Both online sides need an unobstructed near baseline, not just the local player's end.
  if (venue && venue.endStands) for (const stand of venue.endStands) {
    stand.visible = !session || camera.position.z * stand.userData.endStand <= 0;
  }
  // hide ceiling gear that would hang between the camera and the court, and the light beams during play
  if (venue && venue.overhead) for (const it of venue.overhead) it.o.visible = camPos.y < it.y - 3;
  if (venue && venue.beams) for (const b of venue.beams) b.visible = !session;
}

function updateWindHud() {
  const w = session.m.wind;
  const str = Math.hypot(w.x, w.z);
  $('windText').textContent = 'Gió ' + str.toFixed(1); $('windText').dataset.n = str.toFixed(1);
  const sg = S.sgn(session.myTeam);
  $('windArrow').style.transform = `rotate(${Math.atan2(w.z * sg, w.x * sg)}rad)`;
  if (venue && venue.flags) for (const f of venue.flags) {
    f.rotation.y = -Math.atan2(w.z, w.x) + Math.sin(performance.now() / 120 + f.position.x) * 0.15 * (0.3 + str);
  }
}

// touch controls v2: size from the canvas's real CSS box (dynamic viewport), never from innerWidth/innerHeight, which
// on phones can disagree with the box while the URL bar animates or right after a rotation (stretched picture).
var viewW = innerWidth, viewH = innerHeight;   // var: read by HUD helpers defined earlier in the file
function resize() {
  const w = Math.max(1, canvas.clientWidth || innerWidth), h = Math.max(1, canvas.clientHeight || innerHeight);
  viewW = w; viewH = h;
  const pr = settings.gfx === 0 ? 0.75 : settings.gfx === 1 ? Math.min(devicePixelRatio, 1.25) : Math.min(devicePixelRatio, 2);
  renderer.setPixelRatio(pr);
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.fov = w < h ? 60 : 44; camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
if (window.visualViewport) visualViewport.addEventListener('resize', resize);
addEventListener('orientationchange', () => { resize(); setTimeout(resize, 120); setTimeout(resize, 500); });

// ================================================================ officials: umpire + flip scoreboard
const flipTexCache = new Map();
function flipCardTex(n, col) {
  const key = n + ':' + col;
  if (flipTexCache.has(key)) return flipTexCache.get(key);
  const t = canvasTex(128, 160, (g, w, h) => {
    g.fillStyle = col; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, h / 2 - 1, w, 2);          // the fold of a real flip card
    g.fillStyle = '#ffffff'; g.font = '900 118px Nunito, Segoe UI, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(n), w / 2, h / 2 + 6);
  });
  keepTex.add(t); flipTexCache.set(key, t); return t;
}
function buildOfficials() {
  const m = session.m, L = session.myTeam, sgL = S.sgn(L);
  const grp = new THREE.Group(); scene.add(grp);
  const teamCol = (t) => (t === L ? '#ff7a59' : '#6b8cff');
  const res = { grp, cards: [], anim: [], keeperT: -1, signalT: -1, signalTeam: 0 };
  // ---- umpire on the chair (faces the court, follows the shuttle with its head)
  const seat = venue && venue.seat;
  if (seat) {
    const ump = buildCharacter(charById('penguin'), 0x26324f, 0.95, 'L');
    ump.wrist.visible = false;
    ump.root.position.set(seat.x - 0.22, seat.y - 0.36, 0); ump.root.rotation.y = -Math.PI / 2;
    setArm(ump, 'arm', { s: [-0.2, 0.15], e: [-0.7, -0.2], w: 0 }, 0, 0); setArm(ump, 'free', { s: [-0.2, 0.15], e: [-0.7, -0.2], w: 0 }, 0, 0);
    scene.remove(ump.root); grp.add(ump.root);
    res.ump = ump;
  }
  // ---- flip scoreboard on the other side, angled toward your end
  const board = new THREE.Group();
  board.position.set(-(S.DBL_W + 1.45), 0, sgL * 0.6);
  board.rotation.y = Math.PI / 2 - sgL * 0.55;
  const frameM = toon(0x2b2340), legM = toon(0x9aa0ad);
  for (const dx of [-0.62, 0.62]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 8), legM); leg.position.set(dx, 0.5, 0); board.add(leg); }
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.9, 0.08), frameM); back.position.set(0, 1.3, 0); board.add(back);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.5, 8), legM); bar.rotation.z = Math.PI / 2; bar.position.set(0, 1.76, 0.06); board.add(bar);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(1.46, 0.16), new THREE.MeshBasicMaterial({ map: boardTex('ĐIỂM SỐ', '#2b2340', '#ffd23f', 512, 56) }));
  label.position.set(0, 1.86, 0.045); board.add(label);
  // one card stack per team: left = your team, right = opponents (as seen from your end)
  [L, 1 - L].forEach((team, k) => {
    const x = (k === 0 ? -0.36 : 0.36);
    const mat = new THREE.MeshBasicMaterial({ map: flipCardTex(m.score[team], teamCol(team)) });
    const card = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.75), mat); card.position.set(x, 1.29, 0.05); board.add(card);
    for (const rx of [-0.15, 0.15]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 6, 12), legM); ring.position.set(x + rx, 1.68, 0.06); board.add(ring); }
    res.cards[team] = { card, x, team, shown: m.score[team] };
  });
  grp.add(board); res.board = board;
  // ---- score keeper standing beside the board
  const keeper = buildCharacter(charById('koala'), 0x2e9e62, 0.9, 'L');
  keeper.wrist.visible = false;
  scene.remove(keeper.root); board.add(keeper.root);
  keeper.root.position.set(0.98, 0, 0.32); keeper.root.rotation.y = -0.5;
  res.keeper = keeper;
  res.flip = (team, n) => {
    const c = res.cards[team]; if (!c || c.shown === n) return;
    // the old number flips over the top hinge, revealing the new one underneath
    const hinge = new THREE.Group(); hinge.position.set(c.x, 1.665, 0.06); board.add(hinge);
    const old = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.75), new THREE.MeshBasicMaterial({ map: flipCardTex(c.shown, teamCol(team)), side: THREE.DoubleSide }));
    old.position.y = -0.375; hinge.add(old);
    c.card.material.map = flipCardTex(n, teamCol(team)); c.card.material.needsUpdate = true;
    c.shown = n;
    res.anim.push({ hinge, old, t: 0 });
    res.keeperT = 0; res.keeperX = c.x;
  };
  res.clapT = -9;
  res.onPoint = (e) => {
    res.signalT = 0; res.signalTeam = e.team;
    if ((e.rally || 0) >= 10) res.clapT = -1.4;   // a great rally earns a little applause after the flip
    setTimeout(() => { if (session && session.officials === res) { res.flip(0, e.score[0]); res.flip(1, e.score[1]); } }, 650);
  };
  res.reset = () => { res.flip(0, 0); res.flip(1, 0); };
  const tv = new THREE.Vector3();
  const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  // poses (x: forward(-)/back(+) from hanging down, z: outward)
  const K_REST = { s: [0.3, 0.18], e: [-0.7, -0.45], w: 0 };      // paws behind the back
  const K_REACH = { s: [-2.8, 0.22], e: [-0.12, 0], w: 0 };        // up to the top of the card
  const K_PULL = { s: [-1.5, 0.3], e: [-0.7, 0], w: 0 };           // pulling it over
  const K_CLAP = { s: [-0.9, 0.05], e: [-1.2, -0.35], w: 0 };
  const U_REST = { s: [-0.35, 0.12], e: [-1.0, -0.3], w: 0 };      // paws on the lap
  const U_SIG = { s: [-0.15, 1.72], e: [0, 0], w: 0 };             // arm straight out to the winning side
  const U_DIP = { s: [-0.05, 0.4], e: [-0.4, 0], w: 0 };
  let kLook = 0, kGlanceAt = 3, kGlance = 0, uGlanceAt = 4, uGlance = 0;
  res.update = (t, dt) => {
    const m2 = session.m, sp = m2.shuttle.p, rally = m2.state === 'rally';
    for (let i = res.anim.length - 1; i >= 0; i--) {
      const a = res.anim[i]; a.t += dt;
      // the keeper grabs the card first, then pulls it over the hinge
      a.hinge.rotation.x = -ease((a.t - 0.28) / 0.42) * Math.PI * 0.97;
      if (a.t > 0.95) { board.remove(a.hinge); a.old.geometry.dispose(); a.old.material.dispose(); res.anim.splice(i, 1); }
    }
    // ---- keeper: reach up, pull the card over, let go; otherwise shifts weight and watches the play
    if (res.keeperT >= 0) { res.keeperT += dt; if (res.keeperT > 1.25) res.keeperT = -1; }
    let kPose = K_REST, kFree = K_REST, kRate = 7;
    if (res.keeperT >= 0) {
      const kt = res.keeperT;
      kPose = kt < 0.28 ? mixPose(K_REST, K_REACH, ease(kt / 0.28)) : kt < 0.7 ? mixPose(K_REACH, K_PULL, ease((kt - 0.28) / 0.42)) : mixPose(K_PULL, K_REST, ease((kt - 0.7) / 0.55));
      kRate = 0;
    } else if (res.clapT > -2) {
      res.clapT += dt;
      if (res.clapT > 1.2) res.clapT = -9;
      else if (res.clapT > 0) { const cl = Math.abs(Math.sin(res.clapT * 13)); kPose = { s: K_CLAP.s, e: [K_CLAP.e[0], -0.35 - cl * 0.35], w: 0 }; kFree = kPose; kRate = 0; }
    }
    setArm(keeper, 'arm', kPose, kRate, dt); setArm(keeper, 'free', kFree, kRate, dt);
    keeper.body.rotation.z = Math.sin(t * 0.45) * 0.05;                       // weight from foot to foot
    keeper.body.position.y = Math.sin(t * 1.5) * 0.006 + (res.keeperT >= 0 ? Math.sin(Math.min(1, res.keeperT / 0.5) * Math.PI) * 0.04 : 0);
    // look: at the card while flipping, at the shuttle during rallies, otherwise glance around
    keeper.root.updateMatrixWorld(true);
    keeper.root.worldToLocal(tv.set(sp.x, sp.y, sp.z));
    if (t > kGlanceAt) { kGlance = (Math.random() - 0.5) * 1.4; kGlanceAt = t + 2.5 + Math.random() * 4; }
    const kT = res.keeperT >= 0 ? 0.9 : rally ? clamp(Math.atan2(tv.x, tv.z), -1.1, 1.1) : kGlance;
    kLook = damp(kLook, kT, res.keeperT >= 0 ? 8 : 3.5, dt);
    keeper.head.rotation.y = kLook;
    keeper.head.rotation.x = damp(keeper.head.rotation.x, res.keeperT >= 0 ? -0.25 : res.clapT > 0 ? 0.1 : Math.sin(t * 0.9) * 0.04, 6, dt);
    // ---- umpire
    if (res.ump) {
      const u = res.ump;
      u.root.updateMatrixWorld(true);
      u.root.worldToLocal(tv.set(sp.x, sp.y, sp.z));
      const toShuttle = clamp(Math.atan2(tv.x, tv.z), -1.2, 1.2);
      if (res.signalT >= 0) { res.signalT += dt; if (res.signalT > 1.9) res.signalT = -1; }
      const st = res.signalT, rightSide = res.signalTeam === 0;   // umpire faces -x, so its right hand points to +z (team 0's end)
      // signal: small anticipation dip, snap out, hold, lower
      let sig = null;
      if (st >= 0) sig = st < 0.12 ? mixPose(U_REST, U_DIP, ease(st / 0.12)) : st < 0.32 ? mixPose(U_DIP, U_SIG, ease((st - 0.12) / 0.2)) : st < 1.4 ? U_SIG : mixPose(U_SIG, U_REST, ease((st - 1.4) / 0.5));
      setArm(u, 'arm', sig && rightSide ? sig : U_REST, sig ? 0 : 8, dt);
      setArm(u, 'free', sig && !rightSide ? sig : U_REST, sig ? 0 : 8, dt);
      // head: tracks the shuttle in play, looks to the winning side when calling, glances at the board between points
      if (t > uGlanceAt) { uGlance = Math.random() < 0.5 ? -0.55 * sgL : (Math.random() - 0.5) * 1.2; uGlanceAt = t + 3 + Math.random() * 4; }
      const uT = st >= 0 && st < 1.4 ? (rightSide ? 1.0 : -1.0) : rally || m2.state === 'serve' ? toShuttle : uGlance;
      u.head.rotation.y = damp(u.head.rotation.y, uT, rally ? 7 : 4, dt);
      // leans in during the rally, settles back between points; breathes
      u.body.rotation.x = damp(u.body.rotation.x, rally ? 0.14 : 0.02, 3, dt);
      u.body.rotation.z = damp(u.body.rotation.z, st >= 0 && st < 1.4 ? (rightSide ? -0.08 : 0.08) : 0, 6, dt);
      u.body.position.y = Math.sin(t * 1.3) * 0.008;
      u.head.rotation.x = damp(u.head.rotation.x, rally ? 0.06 : Math.sin(t * 0.8) * 0.03, 4, dt);
    }
  };
  res.dispose = () => { scene.remove(grp); disposeTree(grp); };
  return res;
}

// ================================================================ local + online per-frame
function frameLocal(rdt) {
  const m = session.m, a = m.athletes[session.me];
  if (paused || session.over) { edges.hit = edges.jump = edges.dive = false; edges.emote = 0; hold.on = false; return; }
  const mv = readMove();
  a.input.x = mv.x; a.input.y = mv.y;
  if (edges.hit) { a.input.hit = true; a.input.power = edges.power; }
  a.input.hold = hold.on; a.input.holdPower = chargeNow();
  if (edges.jump) a.input.jump = true;
  if (edges.dive) a.input.dive = true;
  if (edges.emote) a.input.emote = edges.emote;
  edges.hit = edges.jump = edges.dive = false; edges.emote = 0;
  session.acc += rdt * TIME_SCALE * debugSpeed;
  while (session.acc >= S.DT) { session.acc -= S.DT; S.step(m); }
  const evs = m.events.splice(0);
  for (const e of evs) { if (!session) break; handleEvent(e); }
}

const INTERP = 0.1;
// Keep effects on the same receipt-time timeline as interpolated snapshots.
// Separate from snaps so pruning the interpolation buffer never loses events.
function presentOnlineEvents(owner, at) {
  const queue = owner.presentationEvents;
  while (session === owner && queue.length && queue[0].at <= at + 1e-9) {
    const item = queue.shift(); // consume before callbacks (including match end)
    if (item.result) finishMatch(item.result);
    else for (const e of item.events) {
      if (session !== owner) return;
      handleEvent(e);
    }
  }
}
const netIn = { h: 0, j: 0, d: 0, e: 0, em: 0, p: -1, lastSend: 0, last: '' };
function frameOnline(rdt, now) {
  const m = session.m;
  if (session.me >= 0 && !session.over) {
    const mv = paused ? { x: 0, y: 0 } : readMove();
    let changed = false;
    if (!paused) {
      if (edges.hit) { netIn.h++; netIn.p = edges.power; changed = true; }
      if (edges.jump) { netIn.j++; changed = true; }
      if (edges.dive) { netIn.d++; changed = true; }
      if (edges.emote) { netIn.e++; netIn.em = edges.emote; changed = true; }
    }
    edges.hit = edges.jump = edges.dive = false; edges.emote = 0;
    const hp = chargeNow();
    const sig = mv.x.toFixed(2) + mv.y.toFixed(2) + (hold.on ? 'H' + hp.toFixed(1) : '');
    if (changed || (sig !== netIn.last && now - netIn.lastSend > 33) || now - netIn.lastSend > 250) {
      Net.send({ t: 'input', x: +mv.x.toFixed(2), y: +mv.y.toFixed(2), h: netIn.h, j: netIn.j, d: netIn.d, e: netIn.e, em: netIn.em, p: +netIn.p.toFixed(2), hd: hold.on ? 1 : 0, hp: +hp.toFixed(2), lag: +(INTERP + Net.rtt).toFixed(3) });
      netIn.last = sig; netIn.lastSend = now;
    }
  }
  const snaps = session.snaps;
  const rt = now / 1000 - INTERP;
  if (!snaps.length) { presentOnlineEvents(session, rt); return; }
  while (snaps.length > 2 && snaps[1].at <= rt) snaps.shift();
  const A = snaps[0], B = snaps[1] || snaps[0];
  const k = B === A ? 1 : clamp((rt - A.at) / (B.at - A.at), 0, 1);
  const sa = A.s, sb = B.s;
  const st0 = matchClipsEnabled && k < 1 ? sa : sb;   // state at the drawn time (the later snapshot already says "rally" before the serve is shown)
  m.state = st0.st; m.stateT = st0.sT; m.serverIdx = st0.srv; if (st0.rcv !== undefined) m.receiverIdx = st0.rcv; m.wind.x = sb.w[0]; m.wind.z = sb.w[1];
  m.score = sb.sc.slice(); if (sb.g) m.games = sb.g.slice();
  const sh = m.shuttle, ha = sa.sh, hb = sb.sh;
  const jump = Math.hypot(hb[0] - ha[0], hb[2] - ha[2]) > 3;
  sh.p.x = jump ? hb[0] : lerp(ha[0], hb[0], k); sh.p.y = jump ? hb[1] : lerp(ha[1], hb[1], k); sh.p.z = jump ? hb[2] : lerp(ha[2], hb[2], k);
  if (matchClipsEnabled && !jump && B !== A && (ha[6] & 1) && (hb[7] !== ha[7] || hb[8] !== ha[8])) {
    // the hit event that comes with the later snapshot says where (and, on newer servers, when) the shuttle was hit:
    // fly it to that point by that time and hold it there until the hit is shown
    const item = session.presentationEvents.find((q) => q.at === B.at && q.events), hit = item && item.events.find((e) => e.type === 'hit');
    if (hit) {
      const kHit = hit.c !== undefined && sa.c !== undefined && sb.c > sa.c ? clamp((hit.c - sa.c) / (sb.c - sa.c), 0.05, 1) : 0.5, u = Math.min(1, k / kHit);
      sh.p.x = lerp(ha[0], hit.x, u); sh.p.y = lerp(ha[1], hit.y, u); sh.p.z = lerp(ha[2], hit.z, u);
    } else { const ahead = clamp(rt - A.at, 0, 0.04); sh.p.x = ha[0] + ha[3] * ahead; sh.p.y = Math.max(0, ha[1] + ha[4] * ahead); sh.p.z = ha[2] + ha[5] * ahead; }
  }
  const early = matchClipsEnabled && !jump && k < 1, hs = early ? ha : hb, ss = early ? sa : sb;   // state at the drawn time (the later snapshot once its time is reached - that is when its events are shown)
  sh.v.x = hs[3]; sh.v.y = hs[4]; sh.v.z = hs[5];
  sh.live = !!(hs[6] & 1); sh.held = !!(hs[6] & 2); sh.netted = !!(hs[6] & 4); sh.landed = !!(hs[6] & 8); sh.last = hs[7]; sh.lastTeam = hs[8];
  sh.pred = ss.pr ? { x: ss.pr[0], z: ss.pr[1], inside: !!ss.pr[2] } : null;
  const latest = snaps[snaps.length - 1].s;
  session.simNow = sa.c !== undefined && sb.c !== undefined ? lerp(sa.c, sb.c, k) : undefined;
  session.meSync = matchClipsEnabled ? damp(session.meSync || 0, session.meSyncWant || 0, session.meSyncWant ? 14 : 6, rdt) : 0;
  m.athletes.forEach((a, i) => {
    if (i === session.me) {
      S.applyAthleteSnap(a, latest.a[i]);
      // my own athlete answers the stick at once (predicted locally), then settles onto the server's position
      const P = session.mePred || (session.mePred = { x: a.x, z: a.z, vx: a.vx, vz: a.vz, t: 0, h: [] });
      const mvp = paused || session.over ? { x: 0, y: 0 } : readMove();
      S.predictSelf(P, a, mvp.x, mvp.y, Math.min(0.3, Net.rtt + 0.02), rdt, (m.state === 'rally' || m.state === 'serve') && a.diveT < 0 && a.recoverT <= 0, m.state === 'serve' ? 14 : 6);
      a.x = P.x; a.z = P.z; a.vx = P.vx; a.vz = P.vz;
      if (session.meSync > 0.001) {   // around a hit: onto the interpolated timeline the shuttle and the hit event are on
        const va = sa.a[i], vb = sb.a[i], w = session.meSync;
        a.x = lerp(a.x, lerp(va[0], vb[0], k), w); a.z = lerp(a.z, lerp(va[1], vb[1], k), w); a.jumpY = lerp(a.jumpY, lerp(va[2], vb[2], k), w);
      }
    } else {
      const va = sa.a[i], vb = sb.a[i];
      S.applyAthleteSnap(a, matchClipsEnabled && k < 1 ? va : vb);
      a.x = lerp(va[0], vb[0], k); a.z = lerp(va[1], vb[1], k); a.jumpY = lerp(va[2], vb[2], k);
    }
  });
  // The first snapshot is displayed immediately (there is no earlier sample).
  presentOnlineEvents(session, Math.max(rt, A.at));
}

// ================================================================ main loop
let last = performance.now(), fpsN = 0, fpsT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  if (now - last < 12.5) return;   // 90 / 120 Hz screens: draw at most ~60 times a second (half the work, same game speed)
  const elapsed = Math.max(0, (now - last) / 1000); last = now;
  const rdt = Math.min(0.05, elapsed);
  const t = now / 1000;
  fpsN++; fpsT += elapsed; if (fpsT > 0.5) { $('fps').textContent = Math.round(fpsN / fpsT) + ' FPS'; fpsN = 0; fpsT = 0; }
  if (session) {
    if (session.kind === 'local') frameLocal(rdt); else frameOnline(rdt, now);
  }
  if (session) {
    const m = session.m;
    session.models.forEach((md, i) => animateAthlete(m.athletes[i], md, rdt, t, m));
    animateShuttle(m);
    if (session.officials) session.officials.update(t, rdt);
    updateAids(t);
    updateServeBoxes(m, t);
    updatePowerBar();
    updateWindHud();
    updateScore();
    const me = session.me;
    if (m.state === 'serve' && me >= 0 && !session.over) {
      const srvTeam = m.athletes[m.serverIdx].team, even = m.score[srvTeam] % 2 === 0;
      const box = even ? 'Ô phải (điểm chẵn)' : 'Ô trái (điểm lẻ)';
      if (m.serverIdx === me) setHint(box + ' · ' + (settings.ctrl === 'charge' ? (isTouch ? 'Chạm: giao ngắn · Giữ: giao cao' : `${keyLabel(keymap.hit)}: chạm nhanh = giao ngắn · giữ rồi thả = giao cao`)
        : isTouch ? 'PHÔNG: giao cao · BỎ NHỎ: giao ngắn' : `${keyLabel(keymap.hit)}: giao cao · ${keyLabel(keymap.drop)}: giao ngắn`));
      else setHint('Chờ giao cầu · ' + box);
      const left = Math.ceil(S.SERVE_CLOCK - m.stateT);
      $('serveClock').classList.toggle('hidden', !(m.serverIdx === me && left <= 10));
      if ($('serveClock').dataset.v !== String(left)) { $('serveClock').dataset.v = left; $('serveClock').innerHTML = icon('clock') + left; }
    } else { setHint(''); $('serveClock').classList.add('hidden'); }
    if (session.kind !== 'local') $('ping').textContent = Math.round(Net.rtt * 1000) + ' ms';
  }
  if (preview) {
    const st = t - previewSwing;
    previewTurn = damp(previewTurn, (screen === 'gear' || screen === 'shop') && gearSlot === 'back' ? Math.PI : 0, 6, rdt);   // back items: the character turns round to show them
    preview.root.rotation.y = (screen === 'chars' || screen === 'gear' || screen === 'shop' || screen === 'home' ? -0.35 + Math.sin(t * 0.7) * 0.35 : Math.sin(t * 0.8) * 0.5) + previewTurn;
    preview.body.position.y = Math.abs(Math.sin(t * 3)) * 0.1 + (st < 0.6 ? Math.sin(st / 0.6 * Math.PI) * 0.45 : 0);
    if (preview.podium) { const sg = preview.podium.userData.stars; sg.rotation.y = t * 0.5; sg.children.forEach((c, i) => { c.position.y = 0.6 + (i % 3) * 0.5 + Math.sin(t * 2 + i) * 0.12; c.rotation.y = t * 3; }); }
    if (st < 0.7) setArm(preview, 'arm', swingPose(true, st / 0.7), 0, rdt);
    else setArm(preview, 'arm', mixPose(POSE.ready, POSE.cockLo, 0.12 + Math.sin(t * 2.2) * 0.12), 8, rdt);
    setArm(preview, 'free', st < 0.3 ? FREE.up : FREE.rest, 8, rdt);
  }
  excite = damp(excite, 0, 0.8, rdt);
  if (venue) {
    venue.crowd(t, excite);
    for (const f of venueFx) f(t, rdt);
    confettiTick(rdt);
    if (venue.extra) venue.extra(t, rdt, session ? session.m.wind : { x: 0.3, z: 0 });
  }
  $('fps').classList.toggle('hidden', !settings.fps);
  updateCamera(rdt, t);
  renderer.render(scene, camera);
}

// ================================================================ UI screens
let preview = null;
let infoChar = null;
let previewSwing = -1, previewTurn = 0;
function showPreview(on) {
  if (preview) { scene.remove(preview.root); disposeTree(preview.root); if (preview.podium) { scene.remove(preview.podium); disposeTree(preview.podium); } preview = null; }
  if (on && !session) {
    setVenue(0);
    const id = screen === 'chars' && infoChar ? infoChar : profile.char;
    preview = buildCharacter(charById(id), 0xff7a59, 1.35, settings.hand, screen === 'gear' || screen === 'shop' ? previewGear() : id === profile.char ? myGear() : []); preview.root.position.set(0, 0.32, 3.2);
    const pod = new THREE.Group(); pod.position.set(0, 0, 3.2);
    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.35, 0.22, 48), toon(0x2b2340)); p1.position.y = 0.11; pod.add(p1);
    const p2 = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.18, 0.12, 48), toon(0xfff6ea)); p2.position.y = 0.27; p2.receiveShadow = true; pod.add(p2);
    const glow = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.035, 8, 64), basic(0xffd23f)); glow.rotation.x = Math.PI / 2; glow.position.y = 0.2; pod.add(glow);
    const glow2 = new THREE.Mesh(new THREE.TorusGeometry(1.14, 0.02, 6, 64), basic(0xff7a59)); glow2.rotation.x = Math.PI / 2; glow2.position.y = 0.335; pod.add(glow2);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.2, 6, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff1c4, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.y = 3.3; pod.add(beam);
    const stars = new THREE.Group();
    for (let i = 0; i < 10; i++) { const st = new THREE.Mesh(new THREE.OctahedronGeometry(0.06), basic([0xffd23f, 0xffffff, 0xff9fb8][i % 3])); const a = i / 10 * Math.PI * 2; st.position.set(Math.cos(a) * 1.45, 0.5 + (i % 3) * 0.5, Math.sin(a) * 1.45); stars.add(st); }
    pod.add(stars); pod.userData.stars = stars;
    scene.add(pod); preview.podium = pod;
    previewSwing = performance.now() / 1000;
  }
}
const CAM_NAMES = { high: 'Trên cao', close: 'Sau lưng', full: 'Toàn sân' };
function setCamBtn() { $('camBtn').innerHTML = icon('camera') + 'Góc nhìn: ' + CAM_NAMES[settings.cam]; }
function cycleCam() {
  const order = ['high', 'close', 'full'];
  settings.cam = order[(order.indexOf(settings.cam) + 1) % 3]; saveAll();
  setCamBtn();
  if (session) toast('Góc nhìn: ' + CAM_NAMES[settings.cam], '', 'camera');
}
$('camBtn').onclick = cycleCam;
const SCREENS = ['home', 'bot', 'tour', 'chars', 'gear', 'shop', 'rewards', 'ach', 'stats', 'settings', 'guide', 'online', 'room'];
let screen = 'home';
function hideScreens() { for (const s of SCREENS) $('s-' + s).classList.add('hidden'); $('stageName').classList.add('hidden'); $('wdSlots').classList.add('hidden'); showPreview(false); }
let charsBack = 'home';
function go(name) {
  if (session && !session.over) return;
  endSession();
  if (name === 'chars' && screen !== 'chars') { charsBack = screen; infoChar = profile.char; }
  screen = name; gearTry = null; renderRejoin();
  $('stageName').classList.toggle('hidden', name !== 'chars' && name !== 'gear' && name !== 'shop'); $('stageName').classList.toggle('wd', name === 'gear');
  $('wdSlots').classList.toggle('hidden', name !== 'gear'); $('rejoinBar').classList.toggle('lobby', name === 'home');   // at the lobby the rejoin bar sits under the top bar, clear of the buttons
  for (const s of SCREENS) $('s-' + s).classList.toggle('hidden', s !== name);
  $('searching').classList.add('hidden'); $('over').classList.add('hidden');
  showPreview(true);
  ({ home: renderHome, bot: renderBot, tour: renderTour, chars: renderChars, ach: renderAch, gear: renderGear, shop: renderShop, rewards: renderRewards, stats: renderStats, settings: renderSettings, online: enterOnline, room: renderRoom }[name] || (() => {}))();
}
document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => { Sound.init(); Sound.boop(); go(b.dataset.go); }));

function seg(id, getter, setter) {
  const el = $(id);
  const sync = () => el.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === String(getter())));
  el.querySelectorAll('button').forEach((b) => { b.onclick = () => { setter(b.dataset.v); sync(); Sound.boop(); }; });
  sync(); return sync;
}

function renderHome() {
  const c = charById(profile.char);
  $('homeFace').innerHTML = faceImg(c.id); $('homeName').textContent = profile.name; $('homeChar').textContent = c.name + ' · Sức mạnh ' + S.powerOf(c.id, myGear());
  renderWallet();
  $('homeStats').textContent = `${P.matches} trận · ${P.wins} thắng · ${Object.keys(achieved).length}/${ACH.length} thành tích`;
  $('homeTour').textContent = tour.cups ? `${tour.cups} cúp · đang ở ${TOUR[tour.round].name}` : tour.round ? `Đang ở ${TOUR[tour.round].name} · cố lên!` : '5 vòng đấu loại trực tiếp';
}

function renderTour() {
  fillChip($('tourChar'));
  $('tourCups').innerHTML = `<b>${tour.cups}</b> ${icon('cup', 'gold')}<br>vào sâu nhất: ${tour.cups ? 'Vô địch' : tour.best ? TOUR[Math.min(tour.best, TOUR.length - 1)].name : '—'}`;
  const next = TOUR[tour.round];
  $('tourInfo').textContent = tour.round === 0 ? 'Thắng liền 5 trận để giành cúp. Thua một trận là bị loại, phải đấu lại từ đầu!' : `Đang ở ${next.name}. Thua là bị loại — tập trung nhé!`;
  $('tourList').innerHTML = TOUR.map((r, i) => {
    const c = charById(r.opp), v = S.VENUES[r.venue];
    const cls = i < tour.round ? 'done' : i === tour.round ? 'next' : 'lock';
    const st = i < tour.round ? icon('check') + 'Đã thắng' : i === tour.round ? icon('play') + 'Trận tiếp' : icon('lock');
    return `<div class="tour-row ${cls}${i === TOUR.length - 1 ? ' final' : ''}"><span class="tf">${i === TOUR.length - 1 ? icon('cup') : faceImg(c.id)}</span>`
      + `<span class="tn"><b>${esc(r.name)} · ${esc(r.oppName)}</b><small>Bot ${esc(S.DIFF[r.diff].name)} · ${esc(v.name)} · ${r.points} điểm${r.games > 1 ? ' · 3 ván' : ''}</small></span><span class="ts">${st}</span></div>`;
  }).join('');
  $('tourStart').textContent = 'Vào trận: ' + next.name + ' ›';
  $('tourReset').classList.toggle('hidden', tour.round === 0);
}
function startTour() {
  const r = TOUR[tour.round];
  startLocal({ mode: '1v1', diff: r.diff, points: r.points, games: r.games, venue: r.venue, opp: r.opp, oppName: r.oppName, tourRound: tour.round });
}
$('tourStart').onclick = () => { Sound.init(); startTour(); };
$('tourReset').onclick = () => { tour.round = 0; saveAll(); renderTour(); Sound.boop(); };
$('tourChar').onclick = () => { Sound.boop(); go('chars'); };

const botOpts = Object.assign({ mode: '1v1', diff: 1, points: 11, games: 1, venue: 0 }, store.get('sp.botOpts', {}));
const VENUE_COLORS = { gym: 'linear-gradient(135deg,#f6b98f,#e58f63)', arena: 'linear-gradient(135deg,#2f3d7a,#151b33)', roof: 'linear-gradient(135deg,#ff8a65,#6a4c9c)', beach: 'linear-gradient(135deg,#7fd0f5,#d9b77a)', park: 'linear-gradient(135deg,#8fd47e,#4f9f4a)', snow: 'linear-gradient(135deg,#a9cdee,#6f93bb)' };
const WIND_TAG = { none: '', steady: icon('wind'), gusty: icon('gust'), any: icon('swirl') };
function venueCards(el, getter, setter, allowRandom) {
  el.innerHTML = '';
  const list = (allowRandom ? [{ id: 'random', name: 'Ngẫu nhiên', desc: 'Để số phận quyết định', wind: 'rand' }] : []).concat(S.VENUES);
  list.forEach((v, i) => {
    const idx = allowRandom ? i - 1 : i;
    const b = document.createElement('button');
    b.className = 'venue' + (getter() === idx ? ' on' : '');
    b.style.background = VENUE_COLORS[v.id] || 'linear-gradient(135deg,#ffb38a,#ff7a59)';
    b.innerHTML = `<span class="wind-tag">${WIND_TAG[v.wind] !== undefined ? WIND_TAG[v.wind] : icon('dice')}</span><b>${esc(v.name)}</b><small>${esc(v.desc)}</small>`;
    b.onclick = () => { setter(idx); el.querySelectorAll('.venue').forEach((x) => x.classList.toggle('on', x === b)); Sound.boop(); };
    el.appendChild(b);
  });
}
function fillChip(el) {
  const c = charById(profile.char);
  el.querySelector('.pf').innerHTML = faceImg(c.id); el.querySelector('.pn').textContent = c.name; el.querySelector('.pk').textContent = c.kind + ' · ' + profile.name;
}
$('botChar').onclick = () => { Sound.boop(); go('chars'); };
$('onChar').onclick = () => { Sound.boop(); go('chars'); };
const backTarget = () => (charsBack === 'chars' || !charsBack ? 'home' : charsBack);
$('charsBack').onclick = () => { Sound.boop(); go(backTarget()); };
$('charsDone').onclick = () => {
  Sound.boop();
  if (charsBack === 'bot') { startLocal(Object.assign({}, botOpts)); return; }
  go(backTarget());
};
function renderBot() {
  fillChip($('botChar'));
  seg('botAssist', () => settings.assist, (v) => { settings.assist = +v; saveAll(); Net.profile(); });
  const save = () => store.set('sp.botOpts', botOpts);
  seg('botMode', () => botOpts.mode, (v) => { botOpts.mode = v; save(); });
  seg('botDiff', () => botOpts.diff, (v) => { botOpts.diff = +v; save(); });
  seg('botPts', () => botOpts.points, (v) => { botOpts.points = +v; save(); });
  seg('botGames', () => botOpts.games, (v) => { botOpts.games = +v; save(); });
  venueCards($('botVenues'), () => botOpts.venue, (v) => { botOpts.venue = v; save(); }, true);
}
$('botStart').onclick = () => { Sound.init(); startLocal(Object.assign({}, botOpts)); };

function renderChars() {
  const grid = $('charGrid'); grid.innerHTML = '';
  infoChar = infoChar || profile.char;
  S.CHARS.forEach((c) => {
    const ok = isUnlocked(c);
    const b = document.createElement('button');
    b.className = 'char' + (c.id === profile.char ? ' on' : '') + (ok ? '' : ' locked');
    const col = '#' + c.body.toString(16).padStart(6, '0');
    b.innerHTML = `${ok ? '' : `<span class="lock">${icon('lock')}</span>`}<div class="dot" style="background:${col}40">${faceImg(c.id)}</div><small>${esc(c.name)}</small>`;
    b.onclick = () => {
      infoChar = c.id;
      if (ok) { profile.char = c.id; saveAll(); Net.profile(); }
      showPreview(true); Sound.boop(); renderChars();
    };
    grid.appendChild(b);
  });
  const c = charById(infoChar), ok = isUnlocked(c);
  const req = c.unlock ? ACH.find((a) => a.id === c.unlock) : null, price = charPrice(c.id);
  const bars = [['Tốc độ', 'spd'], ['Bật nhảy', 'jmp'], ['Lực đập', 'pow'], ['Tầm với', 'rch'], ['Khéo léo', 'ctl'], ['Thể lực', 'sta']]
    .map(([n, k]) => `<span>${n}</span><div class="bar"><i style="width:${c.stats[k] * 20}%"></i></div>`).join('');
  // the buy button sits under the character on the stage (not in the side panel, where it pushed the list into scrolling)
  $('stageName').innerHTML = `${esc(c.name)}<small>${esc(c.kind)}${ok ? '' : ' · ' + icon('lock') + ' Chưa mở khoá'}</small>` +
    (!ok && price ? `<button class="stage-buy" id="charBuy" ${wallet && wallet.gold >= price ? '' : 'disabled'}><i class="coin"></i>Mua · ${price} vàng</button><small class="need">Bạn có ${wallet ? wallet.gold : 0} vàng${wallet && wallet.gold < price ? ' · còn thiếu ' + (price - wallet.gold) : ''}</small>` : '');
  $('charsDone').textContent = charsBack === 'bot' ? 'Chọn & vào trận' : charsBack === 'room' ? 'Chọn & về phòng' : 'Chọn';
  $('charsDone').disabled = !ok;
  $('charInfo').innerHTML = `<h3>${faceImg(c.id)}${esc(c.name)} <small style="color:var(--ink2)">· ${esc(c.kind)}</small></h3><p>${esc(c.desc)}</p>` +
    (ok ? '' : (req ? `<p>${icon('lock')} Mở khoá: <b>${esc(req.name)}</b>, ${esc(req.desc)}${price ? ' · hoặc mua bằng vàng' : ''}</p>` : '') +
      '') + `<div class="bars">${bars}</div>`;
  if ($('charBuy')) $('charBuy').onclick = () => { Sound.boop(); Net.send({ t: 'buyChar', id: c.id }); };
}
$('nameInput').addEventListener('change', () => { profile.name = $('nameInput').value.trim().slice(0, 18) || randomName(); $('nameInput').value = profile.name; saveAll(); Net.profile(); });
// first launch: ask for a name once. Players who already have a server identity are not asked again.
if (profile.named === undefined) profile.named = !!profile.id;
function askName() {
  if (profile.named) return;
  $('firstName').value = profile.name; $('nameAsk').classList.remove('hidden');
  $('firstRand').onclick = () => { $('firstName').value = randomName(); Sound.init(); Sound.boop(); };
  const done = () => { profile.name = $('firstName').value.trim().slice(0, 18) || randomName(); profile.named = true; saveAll(); Net.profile(); $('nameAsk').classList.add('hidden'); Sound.init(); Sound.boop(); if (screen === 'home') renderHome(); };
  $('firstOk').onclick = done; $('firstName').onkeydown = (e) => { if (e.key === 'Enter') done(); };
}
$('randName').onclick = () => { profile.name = randomName(); $('nameInput').value = profile.name; saveAll(); Net.profile(); Sound.boop(); };

function renderAch() {
  $('achList').innerHTML = ACH.map((a) => {
    const got = achieved[a.id];
    const unlock = S.CHARS.find((c) => c.unlock === a.id);
    return `<div class="ach ${got ? '' : 'no'}"><div class="ic">${achIcon(a)}</div><div><b>${esc(a.name)}</b><small>${esc(a.desc)}</small>${unlock ? '<span class="ach-gift">' + faceImg(unlock.id) + 'Mở khoá ' + esc(unlock.name) + '</span>' : ''}</div>${got ? `<em>${icon('check')} ${new Date(got).toLocaleDateString('vi-VN')}</em>` : ''}</div>`;
  }).join('');
}
function renderStats() {
  const rate = P.matches ? Math.round(P.wins / P.matches * 100) : 0;
  const items = [['Trận đã chơi', P.matches], ['Trận thắng', P.wins], ['Tỉ lệ thắng', rate + '%'], ['Chuỗi thắng dài nhất', P.bestStreak], ['Cú Perfect', P.perfect], ['Cú đập', P.smash],
    ['Rally dài nhất', P.longest], ['Cứu cầu thành công', P.diveSaves], ['Thắng online', P.onlineWins], ['Trận online', P.onlinePlayed], ['Sân đã chơi', P.venues.length + '/' + S.VENUES.length], ['Thành tích', Object.keys(achieved).length + '/' + ACH.length]];
  $('statGrid').innerHTML = items.map(([k, v]) => `<div class="stat"><b>${v}</b><small>${k}</small></div>`).join('');
  $('historyList').innerHTML = history.length ? history.map((h) => `<div class="hist"><span class="r ${h.won ? 'w' : 'l'}">${h.won ? 'Thắng' : 'Thua'}</span><b>${h.s[0]}–${h.s[1]}</b><span>vs ${esc(h.opp)}</span><span>${h.kind === 'online' ? icon('globe') + ' Online' : icon('bot') + ' ' + (S.DIFF[h.diff] ? S.DIFF[h.diff].name : '')} · ${h.mode} · ${esc((S.VENUES[h.venue] || {}).name || '')}</span></div>`).join('') : '<div class="empty">Chưa có trận nào.</div>';
}

function renderSettings() {
  $('setVol').value = settings.vol;
  $('setFps').checked = settings.fps; $('setMarker').checked = settings.marker; $('setMarkerOnline').checked = settings.markerOnline;
  for (const [id, key] of AID_TOGGLES) $(id).checked = settings[key]; $('setDropLine').checked = settings.dropLine; $('setRing').checked = settings.ring;
  $('nameInput').value = profile.name;
  $('setHitStop').checked = settings.hitStop; $('setSplit').checked = settings.autoSplit; $('setChat').checked = settings.chat;
  $('setTouch').value = settings.touch; $('setServer').value = settings.server; $('setTouchSwap').checked = !!settings.touchSwap;
  seg('setTouchSize', () => String(settings.touch), (v) => { settings.touch = +v; $('setTouch').value = settings.touch; document.documentElement.style.setProperty('--tscale', settings.touch); saveAll(); });
  seg('setCam', () => settings.cam, (v) => { settings.cam = v; saveAll(); setCamBtn(); });
  seg('setAssist', () => settings.assist, (v) => { settings.assist = +v; saveAll(); Net.profile(); });
  seg('setCtrl', () => settings.ctrl, (v) => { settings.ctrl = v; saveAll(); syncCtrlUI(); });
  seg('setHand', () => settings.hand, (v) => { settings.hand = v; saveAll(); Net.profile(); showPreview(true); });
  seg('setGfx', () => settings.gfx, (v) => {
    settings.gfx = +v; saveAll(); renderer.shadowMap.enabled = settings.gfx >= 1;
    const size = settings.gfx >= 2 ? 2048 : 1024;
    if (sun.shadow.mapSize.x !== size || sun.shadow.mapSize.y !== size) {
      sun.shadow.mapSize.set(size, size);
      if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
      if (sun.shadow.mapPass) { sun.shadow.mapPass.dispose(); sun.shadow.mapPass = null; }
      sun.shadow.needsUpdate = true;
    }
    scene.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => { m.needsUpdate = true; }); });
    resize(); setVenue(venue ? venue.idx : 0, true);
  });
  renderKeys();
}
$('setVol').oninput = (e) => { settings.vol = +e.target.value; Sound.init(); Sound.setVol(settings.vol); saveAll(); };
for (const [id, key] of [...AID_TOGGLES, ['setFps', 'fps'], ['setMarker', 'marker'], ['setMarkerOnline', 'markerOnline'], ['setDropLine', 'dropLine'], ['setRing', 'ring'], ['setHitStop', 'hitStop'], ['setSplit', 'autoSplit'], ['setChat', 'chat']]) $(id).onchange = (e) => { settings[key] = e.target.checked; saveAll(); };
$('setTouch').oninput = (e) => { settings.touch = +e.target.value; document.documentElement.style.setProperty('--tscale', settings.touch); saveAll(); };
$('setTouchSwap').onchange = (e) => { settings.touchSwap = e.target.checked; document.body.classList.toggle('tswap', settings.touchSwap); saveAll(); };
$('setServer').onchange = (e) => { settings.server = e.target.value.trim(); saveAll(); Net.reconnect(); };
const keyLabel = (k) => ({ ' ': 'Space', enter: 'Enter', shift: 'Shift', control: 'Ctrl', alt: 'Alt', arrowup: '↑', arrowdown: '↓', arrowleft: '←', arrowright: '→', escape: 'Esc' })[k] || k.toUpperCase();
function renderKeys() {
  $('keyList').innerHTML = Object.keys(DEFAULT_KEYS).map((a) => `<div class="key">${KEY_NAMES[a]}<button data-a="${a}" class="${rebinding === a ? 'wait' : ''}">${rebinding === a ? 'Nhấn phím…' : esc(keyLabel(keymap[a]))}</button></div>`).join('');
  $('keyList').querySelectorAll('button').forEach((b) => { b.onclick = () => { rebinding = b.dataset.a; renderKeys(); }; });
}
$('resetKeys').onclick = () => { keymap = Object.assign({}, DEFAULT_KEYS); saveAll(); renderKeys(); };

// ================================================================ network
const Net = {
  ws: null, ok: false, rtt: 0.06, room: null, lobby: null, pendingJoin: null, searching: false, searchStart: 0, retry: 0,
  url() {
    if (settings.server) return settings.server;
    if (location.protocol === 'http:' || location.protocol === 'https:') return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host;
    return 'ws://localhost:3040';
  },
  connect() {
    if (this.ws && this.ws.readyState <= 1) return;
    this.status('Đang kết nối…', false);
    let ws;
    try { ws = new WebSocket(this.url()); } catch (e) { this.status('Địa chỉ server không hợp lệ', false); return; }
    this.ws = ws;
    ws.onopen = () => { this.send({ t: 'hello', backup: store.get('sp.backup', null) || undefined, id: profile.id, secret: profile.secret, name: profile.name, char: profile.char, assist: settings.assist, hand: settings.hand }); this.retry = 0; };
    ws.onmessage = (ev) => { let msg; try { msg = JSON.parse(ev.data); } catch (e) { return; } this.onMsg(msg); };
    ws.onclose = () => {
      const was = this.ok; this.ok = false; this.ws = null; this.room = null;
      this.status('Mất kết nối · đang thử lại…', false);
      if (session && session.kind !== 'local') { if (session.kind === 'online' && !session.over) this.autoRejoin = session.netId; toast('Mất kết nối tới máy chủ', this.autoRejoin ? 'Bot đánh thay · sẽ tự vào lại khi có mạng' : ''); session.over = true; go('online'); }
      this.rejoin = null; renderRejoin();
      setTimeout(() => this.connect(), Math.min(8000, 1000 * ++this.retry));   // the wallet needs the server on every screen, so always retry
    };
    ws.onerror = () => this.status('Không kết nối được server', false);
  },
  reconnect() { if (this.ws) { this.ws.onclose = null; this.ws.close(); this.ws = null; } this.ok = false; this.connect(); },
  send(o) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(o)); },
  profile() { this.send({ t: 'profile', name: profile.name, char: profile.char, assist: settings.assist, hand: settings.hand }); },
  status(text, ok) { const el = $('netStatus'); el.textContent = text; el.classList.toggle('ok', ok); },
  onMsg(msg) {
    switch (msg.t) {
      case 'wallet': onWallet(msg); break;
      case 'rejoinOffer':
        this.rejoin = msg.id ? msg : null;
        // dropped out of a match by a lost connection: go straight back in
        if (msg.id && this.autoRejoin === msg.id && !session) { toast('Đang vào lại trận…', '', 'refresh'); this.send({ t: 'rejoin', id: msg.id }); }
        this.autoRejoin = null; renderRejoin();
        break;
      case 'swapAsk': if (screen === 'room' && !session) showSwapAsk(msg); else this.send({ t: 'swapReply', from: msg.from, ok: false }); break;
      case 'backup': store.set('sp.backup', msg.v); break;
      case 'welcome':
        this.ok = true; profile.id = msg.id; profile.secret = msg.secret; saveAll();
        this.status(`● Online · ${msg.online} người`, true);
        this.send({ t: 'lobby' });
        if (this.pendingJoin) { this.send({ t: 'joinRoom', code: this.pendingJoin }); this.pendingJoin = null; }
        break;
      case 'pong': { const r = (performance.now() - msg.c) / 1000; this.rtt = this.rtt * 0.7 + r * 0.3; break; }
      case 'lobby': this.lobby = msg; this.status(`● Online · ${msg.online} người`, true); renderLobby(); break;
      case 'leaderboard': renderBoard(msg.top); break;
      case 'queued': this.searching = true; this.searchStart = performance.now(); $('searchTime').textContent = '0 giây'; $('searching').classList.remove('hidden'); break;
      case 'unqueued': case 'found':
        this.searching = false; $('searching').classList.add('hidden');
        if (msg.t === 'found') toast('Đã tìm thấy đối thủ!');
        break;
      case 'room':
        this.room = msg.room;
        // Keep the result screen (and rematch controls) until an explicit exit.
        // A room broadcast is not an exitMatch acknowledgement.
        if (session) break;
        // Room broadcasts (including character changes) must not close the picker.
        if (screen === 'chars' && charsBack === 'room' && !session) {
          if (!msg.room) { charsBack = 'online'; go('online'); }
          break;
        }
        if (msg.room) { if (screen !== 'room' || session) go('room'); else renderRoom(); }
        else if (screen === 'room') go('online');
        break;
      case 'kicked': this.room = null; toast(msg.reason || 'Bạn đã rời phòng'); if (screen === 'room') go('online'); break;
      case 'start': {
        this.searching = false; $('searching').classList.add('hidden'); $('over').classList.add('hidden');
        this.rejoin = null; this.autoRejoin = null; $('rejoinBar').classList.add('hidden');
        const view = makeView(msg);
        if (msg.you >= 0) view.athletes[msg.you].assist = 1;   // server plays everyone at the same level online
        beginSession(msg.you >= 0 ? 'online' : 'watch', view, msg.you, { netId: msg.id, snapCam: true });
        netIn.h = netIn.j = netIn.d = netIn.e = 0;
        break;
      }
      case 'snap': {
        if (!session || session.kind === 'local' || session.netId !== msg.id) break;
        const at = performance.now() / 1000;
        session.snaps.push({ at, s: msg.s });
        if (session.snaps.length > 30) session.snaps.shift();
        session.presentationEvents.push({ at, events: msg.ev });
        break;
      }
      case 'over':
        if (session && session.netId === msg.id && !session.over) {
          session.presentationEvents.push({ at: performance.now() / 1000, result: msg });
        }
        break;
      case 'rematchVote': $('rematchInfo').textContent = `Tái đấu: ${msg.n}/${msg.of} người đồng ý`; break;
      case 'chat':
        if (session && settings.chat) chatLine(msg.from, msg.text);
        else if (!session) roomChatLine(msg.from, msg.text);
        break;
      case 'notice': toast(msg.text); break;
      case 'error': toast(msg.text); break;
    }
  },
};
setInterval(() => { if (Net.ok) Net.send({ t: 'ping', c: performance.now() }); }, 2000);
setInterval(() => {
  if (Net.ok && screen === 'online' && !session) Net.send({ t: 'lobby' });
  if (Net.searching) $('searchTime').textContent = Math.floor((performance.now() - Net.searchStart) / 1000) + ' giây';
}, 1000);

let onTab = 'play';
const createOpts = { mode: '1v1', points: 11, games: 1, venue: -1, open: true };
function enterOnline() {
  fillChip($('onChar'));
  Net.connect();
  if (Net.ok) { Net.send({ t: 'lobby' }); Net.status(`● Online · ${(Net.lobby && Net.lobby.online) || 1} người`, true); }
  document.querySelectorAll('#onTabs button').forEach((b) => { b.onclick = () => { onTab = b.dataset.tab; showTab(); Sound.boop(); }; });
  showTab();
  const sel = $('crVenue');
  sel.innerHTML = `<option value="-1">Sân ngẫu nhiên</option>` + S.VENUES.map((v, i) => `<option value="${i}">${esc(v.name)}</option>`).join('');
  sel.value = String(createOpts.venue);
  seg('crMode', () => createOpts.mode, (v) => { createOpts.mode = v; });
  seg('crPts', () => createOpts.points, (v) => { createOpts.points = +v; });
  seg('crGames', () => createOpts.games, (v) => { createOpts.games = +v; });
  seg('crOpen', () => (createOpts.open ? '1' : '0'), (v) => { createOpts.open = v === '1'; });
}
function showTab() {
  document.querySelectorAll('#onTabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === onTab));
  for (const t of ['play', 'rooms', 'board']) $('tab-' + t).classList.toggle('hidden', t !== onTab);
  if (onTab === 'board') Net.send({ t: 'leaderboard' });
  if (onTab === 'rooms') { Net.send({ t: 'lobby' }); renderLobby(); }
}
$('crVenue').onchange = (e) => { createOpts.venue = +e.target.value; };
const needNet = () => { if (!Net.ok) { toast('Chưa kết nối được server', 'Chạy "node server.js" rồi mở http://localhost:3040'); Net.connect(); return false; } return true; };
$('quickBtn').onclick = () => { if (needNet()) Net.send({ t: 'quick' }); };
$('stopSearch').onclick = () => Net.send({ t: 'unquick' });
$('createRoom').onclick = () => { if (needNet()) { $('roomChat').innerHTML = ''; Net.send(Object.assign({ t: 'createRoom' }, createOpts)); } };
$('joinBtn').onclick = () => { const c = $('joinCode').value.trim().toUpperCase(); if (c && needNet()) { $('roomChat').innerHTML = ''; Net.send({ t: 'joinRoom', code: c }); } };
$('refreshLobby').onclick = () => Net.send({ t: 'lobby' });

function renderLobby() {
  const L = Net.lobby;
  if (!L) return;
  $('roomList').innerHTML = L.rooms.length ? L.rooms.map((r) => {
    const n = r.slots.filter(Boolean).length;
    const host = r.slots.find((s) => s && s.id === r.host) || r.slots.find(Boolean) || { name: '?' };
    return `<div class="item">${icon(r.mode === '2v2' ? 'users' : 'user', 'lg')}<div class="grow"><b>Phòng của ${esc(host.name)}</b><small>${r.mode} · tới ${r.points}${(r.games || 1) > 1 ? ' · 3 ván' : ''} · ${r.venue < 0 ? 'Sân ngẫu nhiên' : esc(S.VENUES[r.venue].name)} · ${n}/${r.slots.length} người</small></div><button class="pill solid" data-join="${esc(r.code)}">Vào</button></div>`;
  }).join('') : '<div class="empty">Chưa có phòng mở nào. Tạo một phòng đi!</div>';
  $('matchList').innerHTML = L.matches.length ? L.matches.map((m) => {
    const half = m.names.length / 2;
    return `<div class="item">${icon('shuttle', 'lg')}<div class="grow"><b>${esc(m.names.slice(0, half).join(' & '))} <span style="color:var(--accent)">${m.score[0]}–${m.score[1]}</span> ${esc(m.names.slice(half).join(' & '))}</b><small>${m.mode} · ${esc(S.VENUES[m.venue].name)} · ${m.watchers} người xem</small></div><button class="pill" data-watch="${esc(m.id)}">${icon('eye')}Xem</button></div>`;
  }).join('') : '<div class="empty">Không có trận nào đang diễn ra.</div>';
  $('roomList').querySelectorAll('[data-join]').forEach((b) => { b.onclick = () => { $('roomChat').innerHTML = ''; Net.send({ t: 'joinRoom', code: b.dataset.join }); }; });
  $('matchList').querySelectorAll('[data-watch]').forEach((b) => { b.onclick = () => Net.send({ t: 'spectate', id: b.dataset.watch }); });
}
function renderBoard(top) {
  $('board').innerHTML = top.length ? top.map((p, i) => `<div class="item ${p.me ? 'me' : ''}"><b style="width:28px">${i < 3 ? icon('medal', ['gold', 'silver', 'bronze'][i] + ' lg') : i + 1}</b><div class="grow"><b>${esc(p.name)}</b><small>${p.played} trận · tỉ lệ thắng ${p.played ? Math.round(p.wins / p.played * 100) : 0}%</small></div><b>${p.wins} ${icon('cup', 'gold')}</b></div>`).join('') : '<div class="empty">Chưa ai thắng online. Hãy là người đầu tiên!</div>';
}

function renderRoom() {
  const r = Net.room;
  if (!r) return;
  $('roomCode').textContent = r.code;
  const isHost = r.host === profile.id;
  $('roomInfo').textContent = `${r.mode} · tới ${r.points}${(r.games || 1) > 1 ? ' · 3 ván thắng 2' : ' · 1 ván'} · ${r.venue < 0 ? 'Sân ngẫu nhiên' : S.VENUES[r.venue].name} · ${r.open ? 'Phòng mở, ai cũng vào được' : 'Chỉ bạn bè có mã/link'}`;
  const per = r.mode === '2v2' ? 2 : 1;
  const seated = r.slots.some((s) => s && s.id === profile.id), bench = r.bench || [];
  const slotHtml = (i) => {
    const s = r.slots[i];
    if (!s) return `<div class="slot open" data-slot="${i}">＋ ${seated ? 'Chuyển sang đây' : 'Vào chơi ở đây'} <small style="margin-left:auto">(bot nếu trống)</small></div>`;
    const c = charById(s.char);
    const mine = s.id === profile.id;
    return `<div class="slot ${mine ? 'mine' : 'other'}" ${mine ? 'data-me="1"' : `data-slot="${i}"`}><span class="f">${faceImg(c.id)}</span>${esc(s.name)}${mine ? ' (bạn)<span class="chg">đổi</span>' : ''}${s.power ? `<span class="pw">${s.power}</span>` : ''}${s.id === r.host ? '<span class="host">Chủ phòng</span>' : ''}</div>`;
  };
  let a = '', b = '';
  for (let i = 0; i < per; i++) a += slotHtml(i);
  for (let i = per; i < per * 2; i++) b += slotHtml(i);
  $('roomTeams').innerHTML = `<div class="team"><h4>Đội A</h4>${a}</div><div class="team b"><h4>Đội B</h4>${b}</div>`;
  // the bench: in the room but not playing; they watch the match and can take a seat or ask to trade
  $('roomBench').innerHTML = `<h4>${icon('eye')}Ngồi xem <small>${bench.length ? '' : '· chưa có ai'}</small>${seated ? '<button class="pill" id="benchDown">Xuống xem</button>' : ''}</h4>` +
    bench.map((s) => `<span class="who${s.id === profile.id ? ' mine' : ''}">${faceImg(s.char)}${esc(s.name)}${s.id === profile.id ? ' (bạn)' : ''}${s.id === r.host ? ' · chủ phòng' : ''}</span>`).join('') +
    `<p class="tiny">${seated ? 'Bấm vào chỗ của người khác để đổi chỗ' + (isHost ? '' : ' (họ cần đồng ý)') + ', hoặc bấm chỗ trống để chuyển sang.' : 'Bấm chỗ trống để vào chơi, hoặc bấm vào một người để xin đổi chỗ.'}</p>`;
  if ($('benchDown')) $('benchDown').onclick = () => { Sound.boop(); Net.send({ t: 'swap', slot: -1 }); };
  const meSlot = $('roomTeams').querySelector('[data-me]'); if (meSlot) meSlot.onclick = () => { Sound.boop(); go('chars'); };
  $('roomTeams').querySelectorAll('[data-slot]').forEach((el) => { el.onclick = () => { Sound.boop(); Net.send({ t: 'swap', slot: +el.dataset.slot }); }; });
  $('roomHost').classList.toggle('hidden', !isHost);
  if (isHost) {
    seg('rmMode', () => r.mode, (v) => Net.send({ t: 'roomSet', mode: v }));
    seg('rmPts', () => r.points, (v) => Net.send({ t: 'roomSet', points: +v }));
    seg('rmGames', () => r.games || 1, (v) => Net.send({ t: 'roomSet', games: +v }));
    seg('rmOpen', () => (r.open ? '1' : '0'), (v) => Net.send({ t: 'roomSet', open: v === '1' }));
    const sel = $('rmVenue');
    sel.innerHTML = `<option value="-1">Sân ngẫu nhiên</option>` + S.VENUES.map((v, i) => `<option value="${i}">${esc(v.name)}</option>`).join('');
    sel.value = String(r.venue);
    sel.onchange = () => Net.send({ t: 'roomSet', venue: +sel.value });
  }
  const filled = r.slots.filter(Boolean).length;
  $('roomStart').classList.toggle('hidden', !isHost);
  $('roomStart').textContent = filled < r.slots.length ? `Bắt đầu (bot vào ${r.slots.length - filled} chỗ trống)` : 'Bắt đầu trận';
  $('roomWait').textContent = r.state === 'playing' ? 'Phòng đang thi đấu.' : isHost ? 'Gửi mã phòng hoặc link cho bạn bè để cùng chơi.' : 'Đang chờ chủ phòng bắt đầu…';
}
function roomChatLine(from, text) {
  const el = document.createElement('div');
  if (!from) el.className = 'sys';
  el.innerHTML = from ? `<b>${esc(from)}:</b> ${esc(text)}` : esc(text);
  $('roomChat').appendChild(el); $('roomChat').scrollTop = 1e6;
}
$('roomChatForm').addEventListener('submit', (e) => { e.preventDefault(); const t = $('roomChatInput').value.trim(); if (t) Net.send({ t: 'chat', text: t }); $('roomChatInput').value = ''; });
$('roomStart').onclick = () => Net.send({ t: 'start' });
$('leaveRoom').onclick = () => { Net.send({ t: 'leaveRoom' }); Net.room = null; $('roomChat').innerHTML = ''; go('online'); };
$('copyLink').onclick = () => {
  if (!Net.room) return;
  const base = location.protocol.startsWith('http') ? location.origin + location.pathname : 'http://localhost:3040/';
  const link = base + '?room=' + Net.room.code;
  (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject(new Error('no clipboard'))).then(() => toast('Đã sao chép link', link), () => toast('Link phòng', link));
};

// ================================================================ boot
function syncCtrlUI() { $('hitSub').textContent = settings.ctrl === 'charge' ? 'giữ = mạnh' : 'đánh cao'; }
syncCtrlUI();
document.documentElement.style.setProperty('--tscale', settings.touch);
if (isTouch) document.body.classList.add('touchui');
document.body.classList.toggle('tswap', !!settings.touchSwap);   // touch controls v2: mirrored layout
resize();
const roomParam = new URLSearchParams(location.search).get('room');
if (roomParam) { Net.pendingJoin = roomParam.toUpperCase(); go('online'); } else go('home');
askName();
Net.connect();   // the wallet (gold, owned characters, rewards) lives on the server, so connect from the start
window.__sp = () => session && { kind: session.kind, state: session.m.state, score: session.m.score.slice(), me: session.me, last: session.m.shuttle.last, rally: session.m.rally, over: session.over };
window.__spDebug = { Net, startLocal, go, contactFit: fitMatchRacket, matchClips: () => ({ enabled: matchClipsEnabled, clips: session ? session.models.map(md => md.matchClip || null) : [] }),
  lab: { THREE, scene, buildCharacter, charById, setVenue, disposeTree, hideScreens, camera, setFree: (c) => { freeCam = c; }, chars: S.CHARS }, setCam: (o) => { camOverride = o; }, speed: (k) => { debugSpeed = k; }, pose: (p) => { debugPose = p; }, meter: () => (tm.shown ? tm.t : null),
  // camera placed in the player's own frame (x = its left, z = forward)
  camAt: (pos, look, fov) => { const r = session.models[session.me].model.root; r.updateMatrixWorld(true); const P = r.localToWorld(new THREE.Vector3(...pos)), L = r.localToWorld(new THREE.Vector3(...look)); freeCam = { pos: [P.x, P.y, P.z], look: [L.x, L.y, L.z], fov: fov || 40 }; },
  // racket rig in the player's own frame (x = its left, y up, z = forward) for a given pose
  rig: (pose) => { const md = session.models[session.me].model; if (pose) setArm(md, 'arm', pose, 0, 0); md.root.updateMatrixWorld(true); const W = (o2, y) => +o2.localToWorld(new THREE.Vector3(0, y, 0)).y.toFixed(2); const f = (o, y) => { const v = o.localToWorld(new THREE.Vector3(0, y, 0)); md.root.worldToLocal(v); return [+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(2)]; }; return { elbow: f(md.armEl, 0), paw: f(md.wrist, 0), head: f(md.wrist, -0.71), h: md.h, worldY: { paw: W(md.wrist, 0), head: W(md.wrist, -0.71), freePaw: W(md.freeWr, 0) } }; },
  // lowest racket point for every pose and every frame of both swings (must stay above the floor)
  poseScan: () => {
    const md = session.models[session.me].model, out = {};
    const low = (p) => { setArm(md, 'arm', p, 0, 0); floorGuard(md); md.root.updateMatrixWorld(true); let mn = 9; for (const y of [0, -0.3, -0.56, -0.71, -0.86]) mn = Math.min(mn, md.wrist.localToWorld(new THREE.Vector3(0, y, 0)).y); return +mn.toFixed(2); };
    for (const k in POSE) out[k] = low(POSE[k]);
    for (const hi of [true, false]) { let mn = 9; for (let k = 0; k <= 1.0001; k += 0.02) mn = Math.min(mn, low(swingPose(hi, k))); out[hi ? 'swingHigh' : 'swingLow'] = mn; }
    return out;
  },
  pawOffset: () => { if (!session || !shuttleMesh) return null; const a = session.m.athletes[session.m.serverIdx]; return { dx: shuttleMesh.position.x - a.x, y: shuttleMesh.position.y, dz: shuttleMesh.position.z - a.z, team: a.team, hand: a.hand }; }, freeCam: (c) => { freeCam = c; },
  // screen position of the shuttle and your player (-1..1, 1 = top edge), for camera tests
  ndc: () => { if (!session) return null; const v = new THREE.Vector3(); const sp = session.m.shuttle.p; v.set(sp.x, sp.y, sp.z).project(camera); const r = { sy: v.y, sx: v.x, live: session.m.shuttle.live, h: sp.y, fov: camera.fov }; const a = session.m.athletes[session.me]; v.set(a.x, 0, a.z).project(camera); r.py = v.y; return r; } };
requestAnimationFrame(frame);
// render every character's portrait in the background (menus use them; each is ~1 small render)
setTimeout(() => { queuePortrait(profile.char); S.CHARS.forEach((c) => queuePortrait(c.id)); }, 200);
})();
