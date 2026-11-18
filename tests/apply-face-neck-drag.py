# One-off patch: 9th gear slot "face" (glasses, 3 items), three more neck items, drag-and-drop in the wardrobe.
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
def patch(name, pairs):
    p = ROOT / name; s = p.read_bytes().decode('utf-8')
    if name == 'sim.js' and "'e_sport'" in s: return          # already applied
    for old, new in pairs:
        for eol in ('\n', '\r\n'):                             # files differ (and style.css is mixed): use the line ending the anchor has
            o = old.replace('\n', eol)
            if s.count(o) == 1: s = s.replace(o, new.replace('\n', eol)); break
        else: raise AssertionError((name, old[:90]))
    p.write_bytes(s.encode('utf-8'))

# ---------------------------------------------------------------- sim.js
patch('sim.js', [
 ("['head', 'Đội đầu'], ['neck', 'Cổ'], ['back', 'Lưng']];", "['head', 'Đội đầu'], ['face', 'Kính'], ['neck', 'Cổ'], ['back', 'Lưng']];"),
 ("  { id: 'n_towel', slot: 'neck',",
  "  { id: 'e_sport', slot: 'face',   rar: 0, price: 300,  col: 0x4fb8e8, name: 'Kính thể thao',      mods: { ctl: 0.75, rch: -0.5 }, desc: 'Nhìn cầu rõ, đánh chuẩn hơn; dây đeo vướng nên với kém.' },\n"
  "  { id: 'e_shade', slot: 'face',   rar: 1, price: 900,  col: 0x23262f, name: 'Kính râm',           mods: { spd: 0.5, pow: 0.5, ctl: -0.5 }, desc: 'Ngầu nên chạy hăng, đập hăng; tối nên kém chính xác.' },\n"
  "  { id: 'e_pro',   slot: 'face',   rar: 2, price: 2200, col: 0xf2c230, name: 'Kính phi công',      mods: { rch: 1, ctl: 0.25, sta: -0.5 }, desc: 'Thấy cầu từ xa, với sớm; căng mắt nên mau mệt.' },\n"
  "  { id: 'n_towel', slot: 'neck',"),
 ("  { id: 'b_pack',  slot: 'back',",
  "  { id: 'n_bell',  slot: 'neck',   rar: 0, price: 300,  col: 0xe8503a, name: 'Vòng cổ chuông',     mods: { spd: 0.75, ctl: -0.5 }, desc: 'Chuông reo rộn ràng, chạy hăng; leng keng nên mất tập trung.' },\n"
  "  { id: 'n_bow',   slot: 'neck',   rar: 1, price: 900,  col: 0x8a5cf0, name: 'Nơ cổ',              mods: { ctl: 0.5, jmp: 0.5, pow: -0.5 }, desc: 'Lịch lãm: khéo và nhẹ chân; ngại đập mạnh.' },\n"
  "  { id: 'n_pearl', slot: 'neck',   rar: 2, price: 2200, col: 0xfff6ee, name: 'Vòng ngọc trai',     mods: { sta: 0.75, ctl: 0.5, pow: -0.5 }, desc: 'Thư thái, bền sức và khéo; quý quá nên không dám đập hết lực.' },\n"
  "  { id: 'b_pack',  slot: 'back',"),
])

# ---------------------------------------------------------------- game.js
FACE = r"""  // glasses: in head space, in front of the eyes (they follow the head)
  const faceG = new THREE.Group(); faceG.name = 'faceGear'; hs.add(faceG);
  if (GI.face && eyeAt.length === 2) {
    const kind = GI.face, exA = Math.abs(eyeAt[0][0]) * fx, gy = eyeAt[0][1] * fy, gz = eyeAt[0][2] * fz + 0.062;
    const sx = kind === 'e_sport' ? 1.16 : kind === 'e_shade' ? 1.2 : 1.05, sy = kind === 'e_sport' ? 0.86 : kind === 'e_shade' ? 0.88 : 1.1, tube = kind === 'e_shade' ? 0.016 : kind === 'e_sport' ? 0.02 : 0.009;
    const R = Math.min(eyeAt[0][3] * 1.42, (exA - 0.012) / (sx * 0.955));
    const FG = (geo, mat, x, y, z, par) => noOL(add(geo, mat, x, y, z, par || faceG));
    const rod = (a, b, r, mat) => { const d = new THREE.Vector3().subVectors(b, a), m = FG(new THREE.CylinderGeometry(r, r, d.length(), 6), mat, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return m; };
    const frameM = toon(kind === 'e_sport' ? GL.face : kind === 'e_shade' ? 0x1d1f27 : 0xf2c230);
    const lensM = kind === 'e_sport' ? basic(0xbfeaff, { transparent: true, opacity: 0.36, depthWrite: false }) : kind === 'e_shade' ? basic(0x14161d) : basic(0xff9d3c, { transparent: true, opacity: 0.8, depthWrite: false });
    const shine = basic(0xffffff, { transparent: true, opacity: 0.7, depthWrite: false });
    const AXx = 0.34 * P.sq[0], AXz = 0.34 * P.sq[2];
    for (const s of [-1, 1]) {
      const lg = new THREE.Group(); lg.position.set(s * exA, gy - (kind === 'e_pro' ? R * 0.12 : 0), gz); lg.rotation.y = s * 0.3; faceG.add(lg);
      FG(new THREE.TorusGeometry(R, tube, 6, 24), frameM, 0, 0, 0, lg).scale.set(sx, sy, 1);
      const ln = FG(new THREE.CircleGeometry(R, 24), lensM, 0, 0, 0.002, lg); ln.scale.set(sx, sy, 1); ln.renderOrder = 2;
      const sh = FG(new THREE.PlaneGeometry(R * 0.62, R * 0.13), shine, -R * 0.22, R * 0.34, 0.007, lg); sh.rotation.z = 0.62; sh.renderOrder = 3;
      if (kind !== 'e_sport') rod(new THREE.Vector3(s * (exA + R * sx * 0.93), gy + R * 0.25, gz - 0.035), new THREE.Vector3(s * AXx * 1.05, gy + 0.035, 0.02), kind === 'e_shade' ? 0.012 : 0.007, frameM);
    }
    const bx = Math.max(0.004, exA - R * sx * 0.9);
    rod(new THREE.Vector3(-bx, gy + R * sy * 0.2, gz + 0.022), new THREE.Vector3(bx, gy + R * sy * 0.2, gz + 0.022), kind === 'e_pro' ? 0.007 : tube * 0.8, frameM);
    if (kind === 'e_pro') rod(new THREE.Vector3(-bx - 0.02, gy + R * sy * 0.62, gz + 0.012), new THREE.Vector3(bx + 0.02, gy + R * sy * 0.62, gz + 0.012), 0.006, frameM);
    if (kind === 'e_sport') {   // elastic strap round the back of the head
      const st = new THREE.Group(); st.position.y = gy; st.scale.set(AXx, 0.34, AXz); faceG.add(st);
      const r = FG(new THREE.TorusGeometry(1.035, 0.05, 6, 36, Math.PI * 2 - 1.3), toon(0x2f3340), 0, 0, 0, st); r.rotation.set(Math.PI / 2, 0, Math.PI / 2 + 0.65);
    }
  }
"""
NECK = r"""  } else if (GI.neck === 'n_bell') {    // collar with a little gold bell
    const cl = NK(new THREE.TorusGeometry(0.15, 0.024, 8, 24), toon(GL.neck), 0, cy - 0.005, 0.01, true); cl.rotation.x = Math.PI / 2 + 0.25;
    const by = cy - 0.075, bzf = Math.max(surfZ(by) * 0.9, 0.15) + 0.045;
    NK(new THREE.SphereGeometry(0.044, 12, 10), toon(0xf2c230), 0, by, bzf, true);
    NK(new THREE.BoxGeometry(0.009, 0.034, 0.012), toon(0x5a3d12), 0, by - 0.016, bzf + 0.04); NK(new THREE.SphereGeometry(0.011, 6, 5), toon(0x5a3d12), 0, by + 0.004, bzf + 0.043);
    for (const k of [-1, 1]) NK(new THREE.SphereGeometry(0.013, 6, 5), toon(0xffe9a8), k * 0.085, cy - 0.03, 0.135);
  } else if (GI.neck === 'n_bow') {     // bow tie on a thin white collar
    const cl = NK(new THREE.TorusGeometry(0.15, 0.014, 6, 24), toon(0xffffff), 0, cy - 0.005, 0.01); cl.rotation.x = Math.PI / 2 + 0.25;
    const by = cy - 0.055, bzf = Math.max(surfZ(by) * 0.9, 0.15) + 0.04, dk = toon(shadeHex(GL.neck, -0.28));
    for (const sd of [-1, 1]) { const lb = NK(new THREE.ConeGeometry(0.052, 0.095, 4), toon(GL.neck), sd * 0.058, by, bzf, true); lb.rotation.z = sd * Math.PI / 2; lb.scale.z = 0.45;
      const cr = NK(new THREE.BoxGeometry(0.008, 0.05, 0.008), dk, sd * 0.05, by, bzf + 0.022); }
    NK(new THREE.SphereGeometry(0.024, 10, 8), dk, 0, by, bzf + 0.012).scale.set(0.9, 1.2, 0.8);
  } else if (GI.neck === 'n_pearl') {   // string of pearls (one mesh) with a larger pink pearl in front
    const pg = new THREE.Group(); pg.position.set(0, cy - 0.025, 0.02); pg.rotation.x = Math.PI / 2 + 0.42; neckG.add(pg);
    const pos = [], nor = [], N = 24;
    for (let i = 0; i < N; i++) { const a = (i + 0.5) / N * Math.PI * 2, ge = new THREE.SphereGeometry(0.0195, 8, 6).toNonIndexed().translate(Math.cos(a) * 0.158, Math.sin(a) * 0.158 * 1.12, 0);
      for (const v of ge.attributes.position.array) pos.push(v); for (const v of ge.attributes.normal.array) nor.push(v); ge.dispose(); }
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); bg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    noOL(add(bg, toon(GL.neck), 0, 0, 0, pg));
    noOL(add(new THREE.SphereGeometry(0.031, 12, 10), toon(0xff9fc4), 0, 0.158 * 1.12 + 0.012, 0.004, pg));
  }
"""
DRAG = r"""// drag an owned item onto a slot tile or onto the character to wear it; drag a worn tile away to take it off.
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
"""
patch('game.js', [
 # eye positions for the glasses
 ("  const eyeRim = [], eyeIris = [],", "  const eyeAt = [];\n  const eyeRim = [], eyeIris = [],"),
 (", wide = 0.94, tall = P.eye === 'fierce' ? 0.98 : 1.06;", ", wide = 0.94, tall = P.eye === 'fierce' ? 0.98 : 1.06; eyeAt.push([ex, ey, ez, er]);"),
 ("  const neckG = new THREE.Group(); neckG.name = 'neckGear'; up.add(neckG);", FACE + "  const neckG = new THREE.Group(); neckG.name = 'neckGear'; up.add(neckG);"),
 ("    const ms = NK(new THREE.CircleGeometry(0.03, 5), basic(0xfff3c4), 0, my + 0.002, surfZ(my) * 0.93 + 0.05); ms.rotation.set(-0.25, 0, Math.PI / 10);\n  }\n",
  "    const ms = NK(new THREE.CircleGeometry(0.03, 5), basic(0xfff3c4), 0, my + 0.002, surfZ(my) * 0.93 + 0.05); ms.rotation.set(-0.25, 0, Math.PI / 10);\n" + NECK),
 ("neck: neckG, back: backG, torso, shorts } };", "neck: neckG, back: backG, face: faceG, torso, shorts } };"),
 # icons
 ("    : slot === 'head' ? [mdl.head] : slot === 'neck' ? [mdl.gear.neck] : [mdl.gear.back, mdl.gear.torso];",
  "    : slot === 'head' ? [mdl.head] : slot === 'face' ? [mdl.gear.face] : slot === 'neck' ? [mdl.gear.neck] : [mdl.gear.back, mdl.gear.torso];"),
 ("  if (slot === 'shirt') box.expandByScalar(0.09);", "  if (slot === 'shirt') box.expandByScalar(0.09);\n  if (slot === 'face') box.expandByScalar(0.05);"),
 # camera
 ("const f = gearSlot === 'head' ? [1.62, 4.4] :", "const f = gearSlot === 'head' ? [1.62, 4.4] : gearSlot === 'face' ? [1.56, 3.5] : gearSlot === 'neck' ? [1.3, 3.5] :"),
 # wardrobe: drag + click guards
 ("function renderGear() {\n", DRAG + "function renderGear() {\n  if (!wdDragInit.done) { wdDragInit.done = true; wdDragInit(); }\n"),
 ("  $('wdSlots').querySelectorAll('button').forEach((b) => { b.onclick = () => { gearSlot = b.dataset.slot;",
  "  $('wdSlots').querySelectorAll('button').forEach((b) => { b.onclick = () => { if (performance.now() - wdDragEnd < 400) return; gearSlot = b.dataset.slot;"),
 ("    b.onclick = () => { gearTry = id; Sound.boop(); showPreview(true); renderGear(); };\n    b.ondblclick",
  "    b.onclick = () => { if (performance.now() - wdDragEnd < 400) return; gearTry = id; Sound.boop(); showPreview(true); renderGear(); };\n    b.ondblclick"),
])

patch('index.html', [
 ('      <div id="wdInv" class="wd-inv"></div>\n', '      <div id="wdInv" class="wd-inv"></div>\n      <p class="tiny wd-hint">Kéo món đồ thả vào nhân vật để mặc · kéo ô đang mặc ra ngoài để tháo. Trên điện thoại: nhấn giữ rồi kéo.</p>\n'),
])
patch('style.css', [
 (".gear-item .own{flex:none;font-size:12px;font-weight:800;color:#7ff0a8;white-space:nowrap}\n#gearTabs{grid-template-columns:repeat(4,1fr)}",
  ".gear-item .own{flex:none;font-size:12px;font-weight:800;color:#7ff0a8;white-space:nowrap}\n#gearTabs{grid-template-columns:repeat(5,1fr)}\n"
  ".wd-item,.wd-slot{-webkit-touch-callout:none;user-select:none;-webkit-user-select:none}.wd-item img,.wd-slot img{pointer-events:none;-webkit-user-drag:none}\n"
  ".wd-ghost{position:fixed;z-index:999;width:84px;height:84px;margin:-46px 0 0 -42px;border-radius:18px;border:3px solid var(--rar);background:var(--rar-bg);pointer-events:none;padding:4px;box-shadow:0 14px 26px rgba(0,0,0,.45);transform:rotate(-6deg) scale(1.06);opacity:.92}\n"
  ".wd-ghost.ok{border-color:#7ff0a8;box-shadow:0 0 0 4px rgba(127,240,168,.45),0 14px 26px rgba(0,0,0,.45)}.wd-ghost.off{border-color:#ff8a7a;box-shadow:0 0 0 4px rgba(255,138,122,.45),0 14px 26px rgba(0,0,0,.45)}\n"
  ".wd-slot.drop{border-color:#7ff0a8;border-style:solid;animation:wdPulse .8s ease-in-out infinite}\n"
  ".wd-slot.hot{transform:scale(1.18);box-shadow:0 0 0 4px rgba(127,240,168,.5),0 0 26px rgba(127,240,168,.8)}\n"
  "@keyframes wdPulse{50%{box-shadow:0 0 0 6px rgba(127,240,168,.35),0 5px 0 rgba(0,0,0,.35)}}\n"
  "body.wd-dragging,body.wd-dragging *{cursor:grabbing !important}\n.wd-hint{margin:-2px 0 8px;opacity:.7;color:#fff}"),
 ("bottom:calc(52vh + 20px);grid-template-columns:repeat(8,1fr);gap:4px;padding:0 8px;", "bottom:calc(52vh + 20px);grid-template-columns:repeat(9,1fr);gap:3px;padding:0 6px;"),
 (".wd-slot span{font-size:9px;line-height:1;white-space:nowrap}", ".wd-slot span{font-size:8px;line-height:1;white-space:nowrap}"),
])
patch('tests/economy-regression.js', [
 ("// ---- gear catalogue: 3 items in each of the 8 slots,", "// ---- gear catalogue: 9 slots, each with at least one item of every rarity (neck has two of each),"),
 ("assert.equal(S.GEAR.length, 24); assert.equal(new Set(S.GEAR.map((g) => g.id)).size, 24); assert.equal(S.GEAR_SLOTS.length, 8);",
  "assert.equal(S.GEAR.length, 30); assert.equal(new Set(S.GEAR.map((g) => g.id)).size, 30); assert.equal(S.GEAR_SLOTS.length, 9);"),
 ("assert.deepEqual(S.GEAR.filter((g) => g.slot === slot).map((g) => g.rar), [0, 1, 2], slot);",
  "assert.deepEqual([...new Set(S.GEAR.filter((g) => g.slot === slot).map((g) => g.rar))].sort(), [0, 1, 2], slot);"),
 ("assert.equal(S.powerOf('cat', best), 2400);", "assert.equal(S.powerOf('cat', best), 2450);"),
])
print('ok')
