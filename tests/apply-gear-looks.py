# One-off patch: 8 gear slots / 24 items, and every item has its own 3D shape on the character (not just a colour).
def load(p): return open(p,encoding='utf-8',newline='').read()
def save(p,s): open(p,'w',encoding='utf-8',newline='').write(s)
def rep(s,a,b,n=1):
    nl='\r\n' if '\r\n' in s else '\n'; a=a.replace('\n',nl); b=b.replace('\n',nl)
    assert s.count(a)==n,(a[:90],s.count(a)); return s.replace(a,b)
# ------------------------------------------------------------------ sim.js: two new slots, six new items
s=load('sim.js')
s=rep(s,"['wrist', 'Băng tay'], ['head', 'Đội đầu']];","['wrist', 'Băng tay'], ['head', 'Đội đầu'], ['neck', 'Cổ'], ['back', 'Lưng']];")
s=rep(s,"""  { id: 'h_pro',   slot: 'head',   rar: 2, price: 2200, col: 0xf2c230, name: 'Băng nhà vô địch',   mods: { rch: 0.75, ctl: 0.5, spd: -0.5 }, desc: 'Đọc cầu sớm, với xa; tự tin quá nên chậm chân.' },
""","""  { id: 'h_pro',   slot: 'head',   rar: 2, price: 2200, col: 0xf2c230, name: 'Vương miện vô địch', mods: { rch: 0.75, ctl: 0.5, spd: -0.5 }, desc: 'Đọc cầu sớm, với xa; tự tin quá nên chậm chân.' },
  { id: 'n_towel', slot: 'neck',   rar: 0, price: 300,  col: 0xffffff, name: 'Khăn lau mồ hôi',    mods: { sta: 0.75, spd: -0.5 }, desc: 'Lau khô nhanh, đỡ mệt; vướng cổ nên chạy chậm hơn.' },
  { id: 'n_chain', slot: 'neck',   rar: 1, price: 900,  col: 0x4fd6e0, name: 'Dây chuyền may mắn', mods: { ctl: 0.5, rch: 0.5, pow: -0.5 }, desc: 'Bình tĩnh và với xa hơn; ngại đập hết lực.' },
  { id: 'n_medal', slot: 'neck',   rar: 2, price: 2200, col: 0xf2c230, name: 'Huy chương vàng',    mods: { pow: 1, rch: 0.25, jmp: -0.5 }, desc: 'Khí thế nhà vô địch; nặng cổ nên bật kém hơn.' },
  { id: 'b_pack',  slot: 'back',   rar: 0, price: 300,  col: 0x2fa8a0, name: 'Balo nước',          mods: { sta: 0.75, jmp: -0.5 }, desc: 'Luôn có nước uống; đeo balo nên khó bật cao.' },
  { id: 'b_bag',   slot: 'back',   rar: 1, price: 900,  col: 0xd9483b, name: 'Túi vợt dự phòng',   mods: { pow: 1, spd: -0.5 }, desc: 'Vợt căng dây mới, đập mạnh; nặng lưng nên chậm chân.' },
  { id: 'b_wings', slot: 'back',   rar: 2, price: 2200, col: 0xfff3c4, name: 'Đôi cánh nhỏ',       mods: { jmp: 1, spd: 0.25, ctl: -0.5 }, desc: 'Bật cao như bay; đà lớn nên khó đánh tinh tế.' },
""")
s=rep(s,"name: 'Băng tập trung',     mods","name: 'Mũ lưỡi trai',       mods")
s=rep(s,"name: 'Băng đầu',           mods","name: 'Khăn buộc đầu',      mods")
s=rep(s,"name: 'Băng cổ tay pro',    mods","name: 'Bao tay thi đấu',    mods")
save('sim.js',s)
t=load('tests/economy-regression.js')
t=rep(t,"3 items in each of the 6 slots","3 items in each of the 8 slots")
t=rep(t,"assert.equal(S.GEAR.length, 18); assert.equal(new Set(S.GEAR.map((g) => g.id)).size, 18);","assert.equal(S.GEAR.length, 24); assert.equal(new Set(S.GEAR.map((g) => g.id)).size, 24); assert.equal(S.GEAR_SLOTS.length, 8);")
t=rep(t,"assert.equal(S.powerOf('cat', best), 2250);","assert.equal(S.powerOf('cat', best), 2400);")
save('tests/economy-regression.js',t)
# ------------------------------------------------------------------ game.js: shapes
g=load('game.js')
# head gear: three gear shapes
g=rep(g,"""  // 'band' / 'bandana': fitted sweatband with a thin accent stripe
  ring(0.44, 0.11, team); ring(0.44, 0.028, acc, 1.045);""","""  if (kind === 'visor') {   // sun visor: band + a wide brim over the brow
    ring(0.46, 0.13, team); ring(0.52, 0.03, acc, 1.045);
    const brim = mk(new THREE.CylinderGeometry(0.78, 0.78, 0.05, 28, 1, false, -1.05, 2.1), team, 0, 0.36, 0.5, fit, true); brim.rotation.x = 0.22;
    const edge = mk(new THREE.TorusGeometry(0.78, 0.03, 6, 24, 2.1), acc, 0, 0.36, 0.5, fit); edge.rotation.set(Math.PI / 2 + 0.22, 0, Math.PI / 2 - 1.05);
    return gr;
  }
  if (kind === 'crown') {   // small crown worn on top: band, five points, gems
    const top = new THREE.Group(); top.position.set(0, 0.86, 0.05); top.rotation.x = -0.1; fit.add(top); if (!fit.parent) gr.add(fit);
    mk(new THREE.CylinderGeometry(0.4, 0.36, 0.2, 24, 1, true), team, 0, 0.1, 0, top, true);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; mk(new THREE.ConeGeometry(0.105, 0.24, 4), team, Math.sin(a) * 0.37, 0.31, Math.cos(a) * 0.37, top, true).rotation.y = a + Math.PI / 4;
      mk(new THREE.SphereGeometry(0.05, 8, 6), toon(i % 2 ? 0xff5e7a : 0x5ad1ff), Math.sin(a + 0.52) * 0.385, 0.1, Math.cos(a + 0.52) * 0.385, top); }
    mk(new THREE.TorusGeometry(0.37, 0.035, 6, 24), acc, 0, 0.0, 0, top).rotation.x = Math.PI / 2;
    return gr;
  }
  // 'band' / 'bandana': fitted sweatband with a thin accent stripe
  ring(0.44, 0.11, team); ring(0.44, 0.028, acc, 1.045);""")
g=rep(g,"""  const headGear = GL.head !== undefined ? buildHeadGear(V.gear === 'none' ? 'band' : V.gear, GL.head, GL.head, P, fy, V.gearAt) : buildHeadGear(V.gear, teamColor, V.accent, P, fy, V.gearAt); hs.add(headGear);""",
"""  const headGear = GI.head === 'h_band' ? buildHeadGear('bandana', GL.head, 0xffffff, P, fy, V.gearAt) : GI.head === 'h_focus' ? buildHeadGear('visor', GL.head, 0xffffff, P, fy, V.gearAt)
    : GI.head === 'h_pro' ? buildHeadGear('crown', GL.head, 0xfff3c4, P, fy, V.gearAt) : buildHeadGear(V.gear, teamColor, V.accent, P, fy, V.gearAt); hs.add(headGear);""")
# gear ids by slot
g=rep(g,"  const GL = {}; { const set = S.gearSet(gearIds); for (const k in set) GL[k] = set[k].col; }   // worn gear: one colour per slot",
"  const GL = {}, GI = {}; { const set = S.gearSet(gearIds); for (const k in set) { GL[k] = set[k].col; GI[k] = set[k].id; } }   // worn gear: colour and item id per slot")
# legs: shorts shapes + shoes shapes
g=rep(g,"""    const lgLen = 0.08 + Math.min(L1 * 0.9, 0.12);                                           // shorts leg: down to just above the knee, flared, so it reads as shorts and not briefs
    const lg = add(new THREE.CylinderGeometry(0.1, 0.122, lgLen, 16), mShorts, 0, 0.08 - lgLen / 2, 0, thigh); lg.rotation.z = s * 0.08;
    const lgHem = add(new THREE.TorusGeometry(0.121, 0.009, 6, 20), mTrim, 0, 0.08 - lgLen + 0.012, 0, thigh); lgHem.rotation.set(Math.PI / 2, s * 0.08, 0); noOL(lgHem);   // white leg hem
    add(new THREE.CapsuleGeometry(0.078, Math.max(0.01, L1 - 0.04), 4, 12), legMat, 0, -L1 / 2, -0.005, thigh);   // thigh
    const knee = new THREE.Group(); knee.position.set(0, -L1, 0); thigh.add(knee);
    add(new THREE.SphereGeometry(0.074, 12, 8), legMat, 0, 0, -0.008, knee);                   // knee cap: smooth bend, no kink""",
"""    // shorts leg. Default: to just above the knee, flared. Gear: p_light = short running cut, p_flex = tights over the knee, p_pro = long and baggy with a side stripe
    const pk = GI.shorts, tight = pk === 'p_flex';
    const lgLen = 0.08 + (pk === 'p_light' ? Math.min(L1 * 0.4, 0.05) : Math.min(L1 * 0.9, 0.12)), lgR = tight ? 0.092 : pk === 'p_pro' ? 0.138 : pk === 'p_light' ? 0.116 : 0.122;
    const lg = add(new THREE.CylinderGeometry(tight ? 0.096 : 0.1, lgR, lgLen, 16), mShorts, 0, 0.08 - lgLen / 2, 0, thigh); lg.rotation.z = s * 0.08;
    if (!tight) { const lgHem = add(new THREE.TorusGeometry(lgR - 0.001, pk === 'p_pro' ? 0.013 : 0.009, 6, 20), pk === 'p_pro' ? toon(0x2a1f5a) : mTrim, 0, 0.08 - lgLen + 0.012, 0, thigh); lgHem.rotation.set(Math.PI / 2, s * 0.08, 0); noOL(lgHem); }
    if (pk === 'p_pro') { const st = add(new THREE.BoxGeometry(0.012, lgLen * 0.92, 0.05), toon(0x2a1f5a), s * 0.118, 0.08 - lgLen / 2, 0, thigh); st.rotation.z = s * 0.2; noOL(st); }
    if (pk === 'p_light') { const sl = add(new THREE.SphereGeometry(0.03, 8, 6), mTrim, s * 0.108, 0.08 - lgLen + 0.03, 0.01, thigh); sl.scale.set(0.35, 1.2, 1.3); noOL(sl); }
    add(new THREE.CapsuleGeometry(tight ? 0.081 : 0.078, Math.max(0.01, L1 - 0.04), 4, 12), tight ? mShorts : legMat, 0, -L1 / 2, -0.005, thigh);   // thigh
    const knee = new THREE.Group(); knee.position.set(0, -L1, 0); thigh.add(knee);
    add(new THREE.SphereGeometry(tight ? 0.077 : 0.074, 12, 8), tight ? mShorts : legMat, 0, 0, -0.008, knee);                   // knee cap: smooth bend, no kink
    if (tight) { const kr = add(new THREE.TorusGeometry(0.07, 0.011, 6, 18), toon(0x9fd0ff), 0, -0.05, -0.01, knee); kr.rotation.x = Math.PI / 2; noOL(kr); }""")
g=rep(g,"""    if (P.webbed) {
      const shoe = add(new THREE.SphereGeometry(0.1, 14, 10), mOrange, 0, -0.04, 0.05, ankle); shoe.scale.set(1.25, 0.42, 1.7);
      for (const t of [-1, 0, 1]) add(new THREE.SphereGeometry(0.035, 8, 6), mOrange, t * 0.07, -0.05, 0.2, ankle).scale.set(1, 0.6, 1.2);
    } else {""","""    const sk = GI.shoes, wing = () => { for (const [y, r, l] of [[0.07, -0.5, 0.11], [0.045, -0.85, 0.085]]) { const w = add(new THREE.ConeGeometry(0.028, l, 5), toon(0xffffff), s * 0.088, y, -0.05, ankle); w.rotation.set(-1.25, 0, r * s * 0.4); w.scale.x = 0.45; noOL(w); } };
    if (P.webbed) {
      const shoe = add(new THREE.SphereGeometry(0.1, 14, 10), mOrange, 0, -0.04, 0.05, ankle); shoe.scale.set(1.25, 0.42, 1.7);
      for (const t of [-1, 0, 1]) add(new THREE.SphereGeometry(0.035, 8, 6), mOrange, t * 0.07, -0.05, 0.2, ankle).scale.set(1, 0.6, 1.2);
      if (sk) {   // webbed feet wear the gear as ankle wraps
        noOL(add(new THREE.CylinderGeometry(0.074, 0.08, sk === 's_pro' ? 0.085 : 0.055, 16), mShoe, 0, sk === 's_pro' ? 0.045 : 0.03, -0.01, ankle));
        if (sk === 's_spring') { const r = add(new THREE.TorusGeometry(0.08, 0.014, 6, 18), toon(0xffd23f), 0, 0.005, -0.01, ankle); r.rotation.x = Math.PI / 2; noOL(r); }
        if (sk === 's_run') { const r = add(new THREE.TorusGeometry(0.076, 0.008, 6, 18), mTrim, 0, 0.04, -0.01, ankle); r.rotation.x = Math.PI / 2; noOL(r); }
        if (sk === 's_pro') wing();
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
        wing();
      }
    } else {""")
# shirt trims: gear shirts bring their own pattern
g=rep(g,"  if (V.kit === 'hoop') { const hp = U(","  if (GI.shirt) { /* gear shirt: its own pattern, added below */ }\n  else if (V.kit === 'hoop') { const hp = U(")
g=rep(g,"  const headGear = GI.head === 'h_band' ?",
"""  // ---- gear: shirt patterns, neck and back items (all hang on the chest, so they follow the upper body)
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
  const neckG = new THREE.Group(); neckG.name = 'neckGear'; up.add(neckG);
  const backG = new THREE.Group(); backG.name = 'backGear'; up.add(backG);
  const NK = (geo, mat, x, y, z, ol) => { const m = add(geo, mat, x, y, z, neckG); if (!ol) noOL(m); return m; }, BK = (geo, mat, x, y, z, ol) => { const m = add(geo, mat, x, y, z, backG); if (!ol) noOL(m); return m; };
  const cy = tc + 0.27 * ty - 0.07;                 // collar height
  if (GI.neck === 'n_towel') {      // towel round the neck, both ends hanging on the chest
    const tw = toon(0xffffff), r = NK(new THREE.TorusGeometry(0.15, 0.042, 8, 22), tw, 0, cy + 0.005, 0, true); r.rotation.x = Math.PI / 2; r.scale.set(1, 0.9, 0.8);
    for (const sd of [-1, 1]) { const y = cy - 0.1, e = NK(new THREE.CapsuleGeometry(0.04, 0.11, 3, 8), tw, sd * 0.085, y, surfZ(y) * 0.86 + 0.03, true); e.rotation.set(0.25, 0, -sd * 0.1); e.scale.z = 0.55;
      const st = NK(new THREE.BoxGeometry(0.082, 0.014, 0.012), toon(0x4fb8e8), sd * 0.085, y - 0.055, surfZ(y - 0.055) * 0.86 + 0.052); st.rotation.x = 0.25; }
  } else if (GI.neck === 'n_chain') {   // thin gold chain with a gem pendant
    const ch = NK(new THREE.TorusGeometry(0.155, 0.008, 6, 28), toon(0xf2c230), 0, cy - 0.025, 0.02); ch.rotation.x = Math.PI / 2 + 0.42; ch.scale.set(1, 1.12, 1);
    const py = cy - 0.1; NK(new THREE.OctahedronGeometry(0.034), toon(GL.neck), 0, py, surfZ(py) * 0.9 + 0.035).scale.set(0.8, 1.15, 0.6);
  } else if (GI.neck === 'n_medal') {   // ribbon in a V and a gold medal on the chest
    for (const sd of [-1, 1]) { const y = cy - 0.085, rb = NK(new THREE.BoxGeometry(0.036, 0.2, 0.01), toon(sd > 0 ? 0xd9483b : 0x3f6fd9), sd * 0.055, y, surfZ(y) * 0.9 + 0.03); rb.rotation.set(0.3, 0, sd * 0.5); }
    const my = cy - 0.185, md = NK(new THREE.CylinderGeometry(0.058, 0.058, 0.016, 20), toon(0xf2c230), 0, my, surfZ(my) * 0.93 + 0.04, true); md.rotation.x = Math.PI / 2 - 0.25;
    const ms = NK(new THREE.CircleGeometry(0.03, 5), basic(0xfff3c4), 0, my + 0.002, surfZ(my) * 0.93 + 0.05); ms.rotation.set(-0.25, 0, Math.PI / 10);
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
  const headGear = GI.head === 'h_band' ?""")
# arms: sleeves by shirt, wrist gear shapes
g=rep(g,"""    add(new THREE.SphereGeometry(0.076, 14, 10), V.kit === 'sleeves' ? mKit : mShirt, 0, 0, 0, sh);   // sleeve
    const cuff = add(new THREE.TorusGeometry(0.058, 0.012, 6, 18), V.kit === 'sleeves' ? mShirt : mKit, 0, -0.045, 0, sh); cuff.rotation.x = Math.PI / 2; noOL(cuff);   // sleeve hem
    add(new THREE.CapsuleGeometry(0.046, 0.095, 4, 12), limbMat, 0, -0.088, 0, sh);              // upper arm
    const el = new THREE.Group(); el.position.set(0, -0.165, 0); sh.add(el);
    add(new THREE.SphereGeometry(0.047, 12, 8), limbMat, 0, 0, 0, el);                          // elbow""",
"""    const tk = GI.shirt, longSl = tk === 't_comp';   // t_cool: sleeveless; t_comp: long sleeves to the elbow; t_pro: dark cuffs
    add(new THREE.SphereGeometry(0.076, 14, 10), tk === 't_cool' ? limbMat : tk ? mShirt : V.kit === 'sleeves' ? mKit : mShirt, 0, 0, 0, sh);   // sleeve
    if (tk !== 't_cool') { const cuff = add(new THREE.TorusGeometry(0.058, tk === 't_pro' ? 0.016 : 0.012, 6, 18), tk === 't_pro' ? toon(0x2a1f5a) : tk === 't_comp' ? toon(0x7dff9a) : V.kit === 'sleeves' ? mShirt : mKit, 0, longSl ? -0.15 : -0.045, 0, sh); cuff.rotation.x = Math.PI / 2; cuff.scale.setScalar(longSl ? 0.86 : 1); noOL(cuff); }   // sleeve hem
    add(new THREE.CapsuleGeometry(longSl ? 0.049 : 0.046, 0.095, 4, 12), longSl ? mShirt : limbMat, 0, -0.088, 0, sh);              // upper arm
    const el = new THREE.Group(); el.position.set(0, -0.165, 0); sh.add(el);
    add(new THREE.SphereGeometry(0.047, 12, 8), limbMat, 0, 0, 0, el);                          // elbow""")
g=rep(g,"""    if (V.wrist === 'double') for (const y of [-0.1, -0.128]) noOL(add(new THREE.CylinderGeometry(0.05, 0.05, 0.016, 14), mWristG || mKit, 0, y, 0, wg));
    else noOL(""","""    if (GI.wrist === 'w_band') {          // thick terry band with a red stripe
      noOL(add(new THREE.CylinderGeometry(0.056, 0.056, 0.056, 16), mWristG, 0, -0.11, 0, wg)); noOL(add(new THREE.CylinderGeometry(0.0575, 0.0575, 0.012, 16), toon(0xe8503a), 0, -0.11, 0, wg));
    } else if (GI.wrist === 'w_weight') {   // heavy training cuff with bolts
      add(new THREE.CylinderGeometry(0.066, 0.066, 0.075, 16), mWristG, 0, -0.105, 0, wg);
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; noOL(add(new THREE.SphereGeometry(0.012, 6, 5), toon(0xffd23f), Math.sin(a) * 0.066, -0.105, Math.cos(a) * 0.066, wg)); }
      for (const y of [-0.07, -0.14]) { const r = add(new THREE.TorusGeometry(0.066, 0.008, 6, 18), toon(0x8a8fa8), 0, y, 0, wg); r.rotation.x = Math.PI / 2; noOL(r); }
    } else if (GI.wrist === 'w_pro') {     // forearm sleeve with dark bands
      noOL(add(new THREE.CapsuleGeometry(0.047, 0.085, 4, 12), mWristG, 0, -0.07, 0, wg));
      for (const y of [-0.03, -0.125]) { const r = add(new THREE.TorusGeometry(0.048, 0.009, 6, 18), toon(0x2a1f5a), 0, y, 0, wg); r.rotation.x = Math.PI / 2; noOL(r); }
    } else if (V.wrist === 'double') for (const y of [-0.1, -0.128]) noOL(add(new THREE.CylinderGeometry(0.05, 0.05, 0.016, 14), mWristG || mKit, 0, y, 0, wg));
    else noOL(""")
# racket shapes
g=rep(g,"""  const frame = add(new THREE.TorusGeometry(0.15, 0.016, 8, 32), toon(GL.racket !== undefined ? GL.racket : 0x2f2f3a), 0, -0.71, 0, wrist); frame.scale.set(0.8, 1.12, 1);   // string face looks forward (toward the net) like a forehand grip
  const paint = add(new THREE.TorusGeometry(0.15, 0.007, 6, 32, Math.PI * 0.9), mJersey, 0, -0.71, 0, wrist); paint.scale.set(0.84, 1.16, 1.12); paint.rotation.set(0, 0, Math.PI * 1.05); noOL(paint);
  const strings = add(new THREE.CircleGeometry(0.145, 22), new THREE.MeshBasicMaterial({ map: stringTex, color: 0xffffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }), 0, -0.71, 0, wrist);
  strings.scale.set(0.8, 1.12, 1);""",
"""  // racket head. Gear: r_light = slim teardrop, r_heavy = thick frame with weights at the top, r_pro = black and gold with tinted strings
  const rk = GI.racket, fTube = rk === 'r_light' ? 0.011 : rk === 'r_heavy' ? 0.025 : rk === 'r_pro' ? 0.018 : 0.016, fSx = rk === 'r_light' ? 0.72 : rk === 'r_heavy' ? 0.86 : 0.8, fSy = rk === 'r_light' ? 1.2 : rk === 'r_heavy' ? 1.08 : 1.12;
  const frame = add(new THREE.TorusGeometry(0.15, fTube, 8, 32), toon(rk === 'r_pro' ? 0x23202e : GL.racket !== undefined ? GL.racket : 0x2f2f3a), 0, -0.71, 0, wrist); frame.scale.set(fSx, fSy, 1);   // string face looks forward (toward the net) like a forehand grip
  const paint = add(new THREE.TorusGeometry(0.15, rk === 'r_pro' ? 0.011 : 0.007, 6, 32, Math.PI * (rk === 'r_pro' ? 1.25 : 0.9)), rk === 'r_pro' ? toon(GL.racket) : rk ? mTrim : mJersey, 0, -0.71, 0, wrist); paint.scale.set(fSx * 1.05, fSy * 1.035, 1.12); paint.rotation.set(0, 0, Math.PI * (rk === 'r_pro' ? 0.875 : 1.05)); noOL(paint);
  if (rk === 'r_heavy') for (const sd of [-1, 1]) noOL(add(new THREE.SphereGeometry(0.03, 10, 8), toon(0x3a3a46), sd * 0.085, -0.71 - 0.135, 0, wrist));
  if (rk === 'r_pro') { const gl = add(new THREE.TorusGeometry(0.15, 0.03, 6, 32), new THREE.MeshBasicMaterial({ color: 0xffd76a, transparent: true, opacity: 0.22, depthWrite: false }), 0, -0.71, 0, wrist); gl.scale.set(fSx, fSy, 0.4); noOL(gl); noOL(add(new THREE.CylinderGeometry(0.0125, 0.0095, 0.34, 8), toon(GL.racket), 0, -0.34, 0, wrist)); }
  const strings = add(new THREE.CircleGeometry(0.145, 22), new THREE.MeshBasicMaterial({ map: stringTex, color: rk === 'r_pro' ? 0xffe9a8 : rk === 'r_light' ? 0xd8f3ff : rk === 'r_heavy' ? 0xffd0c8 : 0xffffff, transparent: true, opacity: rk ? 0.92 : 0.8, side: THREE.DoubleSide, depthWrite: false }), 0, -0.71, 0, wrist);
  strings.scale.set(fSx, fSy, 1);""")
g=rep(g,"    gear: { headGear, wristGear, shoes: feet } };","    gear: { headGear, wristGear, shoes: feet, neck: neckG, back: backG, torso, shorts } };")
save('game.js',g)
print('ok')
