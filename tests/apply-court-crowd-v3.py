# One-off patch: the maps get their own court (built from geometry: mown bands, line strips, a wire net, square posts, a new umpire chair),
# their own crowd (two instanced meshes) and large props behind the benches. makeCourt / crowdFans are no longer used by the maps.
from pathlib import Path
import os; os.chdir(Path(__file__).resolve().parents[1])
s = open('game.js', encoding='utf-8', newline='').read()
NEW = r"""// ---- court of the maps: all geometry, no painted texture
function mapCourt(K, o) {
  const g = K.g, hex = (c) => parseInt(String(c).slice(1), 16), W = S.DBL_W, L = S.HALF_L, flat = (w, d, mat, x, y, z) => { const m = K.add(new THREE.PlaneGeometry(w, d), mat, x, y, z); m.rotation.x = -Math.PI / 2; m.receiveShadow = true; return m; };
  const slab = K.add(new THREE.BoxGeometry(W * 2 + 3.4, 0.06, L * 2 + 3.4), toon(o.edge), 0, 0, 0); slab.receiveShadow = true;
  flat(W * 2 + 3.1, L * 2 + 3.1, lambert(hex(o.runoff)), 0, 0.032, 0);
  const c0 = hex(o.court), bands = 8, bl = L * 2 / bands;                     // playing surface in mown bands
  for (let i = 0; i < bands; i++) flat(W * 2, bl, lambert(shadeHex(c0, i % 2 ? -0.07 : 0.05)), 0, 0.036, -L + bl * (i + 0.5));
  for (const sd of [-1, 1]) flat(W * 2, S.SHORT_LINE, lambert(shadeHex(c0, -0.16)), 0, 0.038, sd * S.SHORT_LINE / 2);   // the fore-court between the short service lines
  const lm = basic(hex(o.line)), T = 0.055, ln = (x1, z1, x2, z2) => flat(Math.abs(x2 - x1) + T, Math.abs(z2 - z1) + T, lm, (x1 + x2) / 2, 0.042, (z1 + z2) / 2);
  ln(-W, -L, W, -L); ln(-W, L, W, L); ln(-W, -L, -W, L); ln(W, -L, W, L); ln(-S.HALF_W, -L, -S.HALF_W, L); ln(S.HALF_W, -L, S.HALF_W, L);
  for (const sd of [-1, 1]) { ln(-W, sd * S.SHORT_LINE, W, sd * S.SHORT_LINE); ln(-W, sd * (L - S.LONG_SERVE), W, sd * (L - S.LONG_SERVE)); ln(0, sd * S.SHORT_LINE, 0, sd * L); }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.add(new THREE.CylinderGeometry(0.16, 0.16, 0.012, 14), basic(hex(o.line)), sx * (W + 1.3), 0.04, sz * (L + 1.3));   // corner dots of the run-off
  // net: a wire grid (one line mesh), tape on top, a band down each side
  const nw = W * 2 + 0.16, top = S.NET_H, bot = S.NET_H - 0.76, pts = [];
  for (let x = -nw / 2; x <= nw / 2 + 1e-6; x += 0.085) pts.push(x, bot, 0, x, top, 0);
  for (let y = bot; y <= top + 1e-6; y += 0.076) pts.push(-nw / 2, y, 0, nw / 2, y, 0);
  const ng = new THREE.BufferGeometry(); ng.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); g.add(new THREE.LineSegments(ng, new THREE.LineBasicMaterial({ color: 0x1c2030, transparent: true, opacity: 0.75 })));
  K.add(new THREE.BoxGeometry(nw, 0.085, 0.03), basic(0xffffff), 0, top - 0.04, 0); K.add(new THREE.BoxGeometry(nw, 0.025, 0.02), basic(0xffffff), 0, bot, 0);
  const pm = toon(o.post), pd = toon(shadeHex(o.post, -0.35));
  for (const sd of [-1, 1]) { const x = sd * (nw / 2 + 0.07); K.add(new THREE.BoxGeometry(0.04, 0.78, 0.035), basic(0xffffff), sd * nw / 2, top - 0.39, 0);
    const post = K.add(new THREE.BoxGeometry(0.1, top + 0.05, 0.1), pm, x, (top + 0.05) / 2, 0); post.castShadow = true; K.add(new THREE.BoxGeometry(0.13, 0.12, 0.13), pd, x, top - 0.25, 0);
    K.add(new THREE.OctahedronGeometry(0.085, 0), basic(0xffffff), x, top + 0.14, 0); K.add(new THREE.BoxGeometry(0.5, 0.07, 0.5), pd, x, 0.065, 0); K.add(new THREE.BoxGeometry(0.34, 0.07, 0.34), pm, x, 0.135, 0); }
  // umpire's high chair: slanted legs, round seat, curved back, rungs on the far side (the seat position is what the umpire model sits on)
  const ux = W + 1.3, um = toon(0xf4ead8), ud = toon(o.post), u = new THREE.Group(); u.position.set(ux, 0, 0); g.add(u);
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const lg = K.add(new THREE.CylinderGeometry(0.03, 0.04, 1.46, 6), um, dx * 0.3, 0.7, dz * 0.3, u); lg.rotation.set(dz * 0.09, 0, -dx * 0.09); lg.castShadow = true; }
  K.add(new THREE.CylinderGeometry(0.36, 0.36, 0.07, 16), ud, 0, 1.4, 0, u).castShadow = true;
  const bk = K.add(new THREE.CylinderGeometry(0.36, 0.36, 0.5, 14, 1, true, -0.9, 1.8), toon(o.post, { side: THREE.DoubleSide }), 0, 1.7, 0, u); bk.rotation.y = Math.PI / 2;
  for (let i = 0; i < 4; i++) K.add(new THREE.CylinderGeometry(0.02, 0.02, 0.56, 5), um, -0.3 + i * 0.012, 0.28 + i * 0.3, 0, u).rotation.x = Math.PI / 2;
  g.userData.seat = { x: ux, y: 1.43 };
  return [];
}
// ---- crowd of the maps: round little spectators, two instanced meshes (body, head), hopping more when the rally is exciting
function mapCrowd(g, seats, fill) {
  const used = seats.filter(() => Math.random() < fill), n = used.length, cols = [0xff8f6b, 0x5ad1ff, 0xffd23f, 0x7dff9a, 0xc59bff, 0xff9fd6, 0xffffff, 0xffb84d];
  const body = new THREE.InstancedMesh(new THREE.SphereGeometry(0.25, 10, 8), new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: toonGrad }), n);
  const head = new THREE.InstancedMesh(new THREE.SphereGeometry(0.19, 10, 8), new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: toonGrad }), n);
  const d = new THREE.Object3D(), col = new THREE.Color(), ph = used.map(() => Math.random() * 6.28), tall = used.map(() => 0.85 + Math.random() * 0.35), skin = [0xffe0c4, 0xf4c8a0, 0xd9a878, 0xfff0e0];
  for (let i = 0; i < n; i++) { body.setColorAt(i, col.setHex(cols[Math.floor(Math.random() * cols.length)])); head.setColorAt(i, col.setHex(skin[i % skin.length])); }
  g.add(body, head);
  const place = (t, ex) => { for (let i = 0; i < n; i++) { const st = used[i], hop = Math.max(0, Math.sin(t * (3 + ex * 5) + ph[i])) * (0.04 + ex * 0.22), y = st[1] + hop;
      d.position.set(st[0], y + 0.26 * tall[i], st[2]); d.rotation.set(0, st[3], Math.sin(t * 2 + ph[i]) * 0.06); d.scale.set(1, 1.15 * tall[i], 0.9); d.updateMatrix(); body.setMatrixAt(i, d.matrix);
      d.position.y = y + 0.62 * tall[i]; d.scale.set(1, 1, 1); d.updateMatrix(); head.setMatrixAt(i, d.matrix); }
    body.instanceMatrix.needsUpdate = true; head.instanceMatrix.needsUpdate = true; };
  place(0, 0);
  return (t, excite) => place(t, excite || 0);
}
"""
a = "// three rows of benches along both sides and behind the far end; returns the seats for the crowd\n"
assert s.count(a) == 1; s = s.replace(a, NEW + a)
old = "  const flags = makeCourt(g, { runoff: C.court[0], court: C.court[1], line: C.court[2], edge: C.court[3], post: C.court[4], flag: C.court[4], logo: 'PAWMINTON' });\n"
assert s.count(old) == 1; s = s.replace(old, "  const flags = mapCourt(K, { runoff: C.court[0], court: C.court[1], line: C.court[2], edge: C.court[3], post: C.court[4] });\n")
old = "crowd: crowdFans(g, seats, { fill: 0.85 }),"
assert s.count(old) == 1; s = s.replace(old, "crowd: mapCrowd(g, seats, 0.85),")
old = "for (const x of [-5.4, -2.7, 0, 2.7, 5.4]) ed(K, x, -10.25, n++); } }\n"
assert s.count(old) == 1
s = s.replace(old, old + "  { const ed = MAP_EDGE[id]; let n = 0; if (ed) for (const sd of [-1, 1]) for (const z of [-11, -6.5, -2, 2.5, 7]) {   // the same props, three times the size, behind the benches\n"
  "      const bg = new THREE.Group(); bg.position.set(sd * 13.4, 0, z); bg.scale.setScalar(3); g.add(bg); ed({ g: bg, fx: K.fx, add: (geo, mat, x, y, zz) => K.add(geo, mat, x, y, zz, bg) }, 0, 0, n++); } }\n")
open('game.js', 'w', encoding='utf-8', newline='').write(s)
print('ok')
