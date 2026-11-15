/* Animation lab (v2 dev tool): open index.html?lab=1 to preview the new moves on any character. */
(function () {
'use strict';
if (!/[?&]lab=1/.test(location.search)) return;
const D = window.__spDebug && window.__spDebug.lab;
if (!D || !window.SPAnim) return;
const A = window.SPAnim, THREE = D.THREE;

D.hideScreens();
D.setVenue(0, true);
document.getElementById('hud').classList.add('hidden');

const st = { char: 'cat', hand: 'R', clip: 'jumpSmash', speed: 1, t: 0, pauseT: 0, cam: 'side', mdl: null, playing: true };
function build() {
  if (st.mdl) { D.scene.remove(st.mdl.root); D.disposeTree(st.mdl.root); }
  st.mdl = D.buildCharacter(D.charById(st.char), 0xff7a59, 1.2, st.hand);
  st.mdl.root.position.set(0, 0, Z0); st.mdl.root.rotation.y = 0;
  st.t = 0;
}

// camera presets around the player (model faces +z)
const Z0 = 3.4;   // stand in the middle of one half, away from the net
const CAMS = {
  side:  { pos: [-4.6, 1.7, 0.35], look: [0, 1.15, 0.1] },
  front: { pos: [1.0, 1.7, 4.7], look: [0, 1.15, 0] },
  back:  { pos: [0.6, 1.8, -4.0], look: [0, 1.0, 0.3] },
  game:  { pos: [0, 4.2, -5.6], look: [0, 0.6, 0.8] },
  wide:  { pos: [-5.2, 3.0, 1.2], look: [0, 0.8, -1.3] },
  top:   { pos: [0.01, 7.5, -1.2], look: [0, 0, -1.2] },
};
function setCam() { const c = CAMS[st.cam]; D.setFree({ pos: [c.pos[0], c.pos[1], c.pos[2] + Z0], look: [c.look[0], c.look[1], c.look[2] + Z0], fov: 38 }); }

// ---- UI
const css = document.createElement('style');
css.textContent = `#lab{position:fixed;left:12px;top:12px;z-index:50;max-height:calc(100vh - 24px);overflow-y:auto;background:rgba(27,29,74,.92);color:#fff;border:2px solid rgba(255,215,106,.5);border-radius:14px;padding:10px 12px;font:600 13px Nunito,Segoe UI,sans-serif;max-width:300px}
#lab b{display:block;color:#ffd76a;margin:6px 0 4px}#lab .row{display:flex;flex-wrap:wrap;gap:5px}
#lab button{border:0;border-radius:9px;padding:5px 9px;background:#3a3f8f;color:#fff;font:700 12px Nunito,Segoe UI,sans-serif;cursor:pointer}
#lab button.on{background:#ffb84d;color:#2b2340}#lab select{width:100%;border-radius:8px;padding:4px;font:600 12px Nunito,sans-serif}
#labT{margin-top:6px;font-size:12px;opacity:.85}
#labRep .rep{margin-top:5px}#labRep a{color:#ffd76a;cursor:pointer;font-weight:800}#labRep .iss{font-size:11.5px;opacity:.9;cursor:pointer;padding-left:6px}`;
document.head.appendChild(css);
const box = document.createElement('div'); box.id = 'lab';
const LABEL = { rearForehand: 'Lùi góc thuận tay', roundHead: 'Lùi góc trái: vòng đầu', rearBackhand: 'Lùi góc trái: trái tay', ready: 'Chờ cầu', splitStep: 'Nhún chuẩn bị', jumpSmash: 'Đập nhảy', netLunge: 'Lunge bỏ lưới', backhand: 'Trái tay', celebrate: 'Ăn mừng' };
box.innerHTML = `<b style="margin-top:0">🧪 Phòng thử động tác v2</b>
<div id="labClips">${(() => { const g = {}; for (const k in A.CLIPS) (g[A.CLIPS[k].group || 'Mẫu đầu tiên'] = g[A.CLIPS[k].group || 'Mẫu đầu tiên'] || []).push(k); return Object.entries(g).map(([name, ks]) => `<b>${name} (${ks.length})</b><div class="row">${ks.map((k) => `<button data-c="${k}" title="${k}">${A.CLIPS[k].label || LABEL[k] || k}</button>`).join('')}</div>`).join(''); })()}</div>
<b>Tốc độ</b><div class="row" id="labSpeed">${[1, 0.5, 0.25, 0.1].map((v) => `<button data-v="${v}">${v}×</button>`).join('')}<button id="labPause">⏯</button></div>
<b>Góc nhìn</b><div class="row" id="labCam">${Object.keys(CAMS).map((k) => `<button data-v="${k}">${{ side: 'Bên', front: 'Trước', back: 'Sau', game: 'Trong trận', wide: 'Rộng', top: 'Từ trên' }[k]}</button>`).join('')}</div>
<b>Nhân vật</b><select id="labChar">${D.chars.map((c) => `<option value="${c.id}">${c.name} · ${c.kind}</option>`).join('')}</select>
<div class="row" style="margin-top:5px" id="labHand"><button data-v="R">Tay phải</button><button data-v="L">Tay trái</button></div>
<div id="labT"></div>
<div class="row" style="margin-top:6px"><button id="labCheck">🔍 Đánh giá tất cả</button></div><div id="labRep"></div>`;
document.body.appendChild(box);
const sync = () => {
  box.querySelectorAll('#labClips button').forEach((b) => b.classList.toggle('on', b.dataset.c === st.clip));
  box.querySelectorAll('#labSpeed [data-v]').forEach((b) => b.classList.toggle('on', +b.dataset.v === st.speed));
  box.querySelectorAll('#labCam button').forEach((b) => b.classList.toggle('on', b.dataset.v === st.cam));
  box.querySelectorAll('#labHand button').forEach((b) => b.classList.toggle('on', b.dataset.v === st.hand));
};
box.querySelectorAll('#labClips button').forEach((b) => (b.onclick = () => { st.clip = b.dataset.c; st.t = 0; st.pauseT = 0; sync(); }));
box.querySelectorAll('#labSpeed [data-v]').forEach((b) => (b.onclick = () => { st.speed = +b.dataset.v; sync(); }));
box.querySelector('#labPause').onclick = () => { st.playing = !st.playing; };
box.querySelectorAll('#labCam button').forEach((b) => (b.onclick = () => { st.cam = b.dataset.v; setCam(); sync(); }));
box.querySelectorAll('#labHand button').forEach((b) => (b.onclick = () => { st.hand = b.dataset.v; build(); sync(); }));
box.querySelector('#labCheck').onclick = () => showReport();
box.querySelector('#labChar').onchange = (e) => { st.char = e.target.value; build(); };

// debug hooks for automated screenshots
window.__lab = { mdl: () => st.mdl, check: (clip) => (clip ? checkClip(clip) : checkAll()), set: (o) => { Object.assign(st, o); if (o.char || o.hand) build(); if (o.cam) setCam(); sync(); }, frame: (clip, t) => { st.clip = clip; st.t = t; st.playing = false; } };


// ------------------------------------------------------------------ automatic move checker
// Steps every clip at 60 fps (no rendering) and flags physical problems. window.__lab.check() returns the report.
const BASE = { x: 0, z: Z0, ry: 0, sc: 1.2 };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const RACKET_PTS = [[0, -0.2], [0, -0.34], [0, -0.53], [0, -0.71], [0.12, -0.71], [-0.12, -0.71], [0, -0.55], [0, -0.87]].map(([x, y]) => V(x, y, 0));
const LATE_WORDS = /muộn|sau lưng|đuổi|qua háng|lăn|lao|đổi tay|chặn|block|lốp|Lốp/i;
const ISSUE = {
  racketFloor: 'Vợt xuyên sàn', footSink: 'Chân lún sàn', bodySink: 'Thân / tay / đầu chạm sàn', kneeFloor: 'Gối chạm sàn',
  footFloat: 'Chân lơ lửng (lẽ ra phải đứng)', overreach: 'Chân bị kéo căng (không với tới)', racketHead: 'Vợt xuyên qua đầu',
  elbowBack: 'Khuỷu tay gập ngược', contactBehind: 'Chạm cầu ở sau người', contactLow: 'Cú trên cao nhưng vợt thấp',
};
// exact lowest world y of a mesh (full spheres / capsules analytically, everything else from its vertices)
const vtx = V(0, 0, 0);
function minY(o) {
  const g = o.geometry, e = o.matrixWorld.elements, P = g.parameters || {};
  const ry = Math.hypot(e[1], e[5], e[9]);   // how much a unit sphere stretches along world y
  if (g.type === 'SphereGeometry' && (P.phiLength === undefined || P.phiLength >= 6.28) && (P.thetaLength === undefined || P.thetaLength >= 3.14)) return e[13] - P.radius * ry;
  if (g.type === 'CapsuleGeometry') { const hl = P.length / 2; return Math.min(e[13] + e[5] * hl, e[13] - e[5] * hl) - P.radius * ry; }
  const pos = g.attributes.position; let mn = 9;
  for (let i = 0; i < pos.count; i++) { vtx.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); if (vtx.y < mn) mn = vtx.y; }
  return mn;
}
function minYTree(rootObj, skip) { let mn = 9; rootObj.traverse((o) => { if (!o.isMesh || o.userData.isOutline || (o.material && o.material.transparent)) return; if (skip) for (let a = o; a; a = a.parent) if (a === skip) return; mn = Math.min(mn, minY(o)); }); return mn; }
function checkClip(name) {
  const m = st.mdl, c = A.CLIPS[name], len = A.clipLength(name), R = m.rig;
  const iss = {};
  const hit = (k, t, v) => { const o = iss[k] || (iss[k] = { n: 0, worst: 0, t: t }); o.n++; if (v > o.worst) { o.worst = v; o.t = t; } };
  const box = new THREE.Box3(), skullBox = new THREE.Box3(), tmp = V(0, 0, 0), hc = V(0, 0, 0);
  const skull = m.head.children[0] && m.head.children[0].children[0];
  for (let t = 0; t <= len + 1e-6; t += 1 / 60) {
    const q = A.sample(name, t);
    A.apply(m, q, { base: BASE });
    m.root.updateMatrixWorld(true);
    const air = q.jump > 0.02;
    // racket points: floor + head
    let hr = 0;
    if (skull) { skull.getWorldPosition(hc); const ws = V(0, 0, 0); skull.getWorldScale(ws); hr = skull.geometry.parameters.radius * Math.min(ws.x, ws.y, ws.z) * 0.9; }
    let rMin = 9, inHead = 0;
    for (const pt of RACKET_PTS) {
      tmp.copy(pt); m.wrist.localToWorld(tmp);
      rMin = Math.min(rMin, tmp.y);
      if (skull && pt.y <= -0.34) inHead = Math.max(inHead, hr - tmp.distanceTo(hc));
    }
    if (rMin < -0.01) hit('racketFloor', t, -rMin);
    if (inHead > 0.02) hit('racketHead', t, inHead);
    // feet / legs / body
    for (const leg of R.legs) {
      const fy = minYTree(leg.ankle);
      const f = leg.side === m.h ? q.fR : q.fL;
      if (fy < -0.025) hit('footSink', t, -fy);
      if (!air && f[2] < 0.01 && fy > 0.07) hit('footFloat', t, fy);
      if ((leg.reachErr || 0) > 0.03) hit('overreach', t, leg.reachErr);
      tmp.set(0, 0, 0); leg.knee.localToWorld(tmp);
      if (tmp.y < 0.07) hit('kneeFloor', t, 0.07 - tmp.y);
    }
    // body = everything above the waist except the racket
    const bMin = minYTree(R.chest, m.wrist);
    if (bMin < 0.0) hit('bodySink', t, -bMin);
    if (q.arm.e[0] > 0.2) hit('elbowBack', t, q.arm.e[0]);
  }
  // contact check
  if (c.contact !== undefined) {
    const q = A.sample(name, c.contact); A.apply(m, q, { base: BASE }); m.root.updateMatrixWorld(true);
    const head = V(0, -0.71, 0); m.wrist.localToWorld(head);
    const cp = V(0, 0, 0); R.chest.localToWorld(cp);
    const fwd = V(0, 0, 1).transformDirection(R.chest.matrixWorld); fwd.y = 0; fwd.normalize();
    const ahead = head.clone().sub(cp).dot(fwd);
    const label = c.label || name;
    if (ahead < -0.18 && !LATE_WORDS.test(label)) hit('contactBehind', c.contact, -ahead);
    // overheads should meet the shuttle near this character's full stretch (short frogs reach less than tall bunnies)
    const qs = A.sample('ready', 0); qs.arm = A.armOf('hitHi'); A.apply(m, qs, { base: BASE }); m.root.updateMatrixWorld(true);
    const top = V(0, -0.71, 0); m.wrist.localToWorld(top);
    if (c.group === 'Cuối sân' && !LATE_WORDS.test(label) && head.y < top.y * 0.82) hit('contactLow', c.contact, top.y * 0.82 - head.y);
  }
  A.apply(m, A.sample(st.clip, st.t), { base: BASE });
  for (const k of c.allow || []) delete iss[k];
  const list = Object.entries(iss).map(([k, o]) => ({ key: k, what: ISSUE[k], frames: o.n, worst: +o.worst.toFixed(3), at: +o.t.toFixed(2) }));
  const score = Math.max(0, Math.round(100 - list.reduce((a, i) => a + Math.min(40, 6 + i.frames * 0.4 + i.worst * 120), 0)));
  return { clip: name, label: c.label || LABEL[name] || name, group: c.group || 'Mẫu đầu tiên', score, issues: list };
}
function checkAll() { return Object.keys(A.CLIPS).map(checkClip).sort((a, b) => a.score - b.score); }
function showReport() {
  const rep = checkAll(), bad = rep.filter((r) => r.issues.length);
  const avg = Math.round(rep.reduce((a, r) => a + r.score, 0) / rep.length);
  const el = document.getElementById('labRep');
  el.innerHTML = `<b>Đánh giá: ${rep.length} động tác · điểm TB ${avg} · ${bad.length} có lỗi</b>` + bad.map((r) => `<div class="rep"><a data-c="${r.clip}" data-t="${(r.issues[0] || {}).at || 0}">${r.score} · ${r.label}</a>${r.issues.map((i) => `<div class="iss" data-c="${r.clip}" data-t="${i.at}">– ${i.what} (${i.frames} khung, nặng nhất ${i.worst} tại ${i.at}s)</div>`).join('')}</div>`).join('');
  el.querySelectorAll('[data-c]').forEach((a) => (a.onclick = () => { st.clip = a.dataset.c; st.t = +a.dataset.t; st.playing = false; sync(); }));
}

build(); setCam(); sync();
let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const len = A.clipLength(st.clip), loopClip = A.CLIPS[st.clip].loop;
  if (st.playing) {
    if (!loopClip && st.t >= len) { st.pauseT += dt; if (st.pauseT > 0.7) { st.t = 0; st.pauseT = 0; } }
    else st.t += dt * st.speed;
  }
  A.apply(st.mdl, A.sample(st.clip, st.t), { base: { x: 0, z: Z0, ry: 0, sc: 1.2 } });
  if (st.mdl.update) st.mdl.update(dt, now / 1000);
  const rp = st.mdl.root.position, c0 = CAMS[st.cam];
  st.follow = st.follow || { x: 0, z: Z0 };
  st.follow.x += (rp.x - st.follow.x) * Math.min(1, dt * 4); st.follow.z += (rp.z - st.follow.z) * Math.min(1, dt * 4);
  if (!st.playing) { st.follow.x = rp.x; st.follow.z = rp.z; }
  D.setFree({ pos: [c0.pos[0] + st.follow.x, c0.pos[1], c0.pos[2] + st.follow.z], look: [c0.look[0] + st.follow.x, c0.look[1], c0.look[2] + st.follow.z], fov: 38 });
  const c = A.CLIPS[st.clip].contact;
  document.getElementById('labT').textContent = `t = ${Math.min(st.t, len).toFixed(2)} / ${len.toFixed(2)} s` + (c ? ` · chạm cầu ở ${c}s` + (Math.abs(st.t - c) < 0.03 ? '  ◀ CHẠM' : '') : '');
}
requestAnimationFrame(loop);
})();
