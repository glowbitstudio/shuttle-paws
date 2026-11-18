# One-off patch: six themed outfit sets (5 pieces each: head, shirt, shorts, shoes, back) with a set bonus, shown in the shop ("Bộ đồ" tab) and the wardrobe.
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
def patch(name, pairs, cuts=()):
    p = ROOT / name; s = p.read_bytes().decode('utf-8')
    for a, b, new in cuts:                                     # replace everything from anchor a up to (not including) anchor b
        i = s.index(a); j = s.index(b, i); eol = '\r\n' if '\r\n' in s[i:j] else '\n'; s = s[:i] + new.replace('\n', eol) + s[j:]
    for old, new in pairs:
        for eol in ('\n', '\r\n'):
            o = old.replace('\n', eol)
            if s.count(o) == 1: s = s.replace(o, new.replace('\n', eol)); break
        else: raise AssertionError((name, old[:90]))
    p.write_bytes(s.encode('utf-8'))

def item(id, slot, rar, col, name, mods, desc, st):
    price = [300, 900, 2200][rar]
    return "  { id: '%s', slot: '%s', set: '%s', rar: %d, price: %d, col: 0x%06x, name: '%s', mods: %s, desc: '%s' },\n" % (id, slot, st, rar, price, col, name, mods, desc)
ITEMS = ''.join([
 item('bc_head', 'head', 0, 0xf2d28a, 'Mũ rơm', '{ sta: 0.75, jmp: -0.5 }', 'Che nắng, đỡ mệt; vành rộng nên ngại bật cao.', 'beach'),
 item('bc_shirt', 'shirt', 0, 0x2ec4b6, 'Áo hoa đi biển', '{ spd: 0.75, pow: -0.5 }', 'Mát và nhẹ, chạy nhanh; vải mỏng nên thiếu lực.', 'beach'),
 item('bc_pants', 'shorts', 0, 0xff8a3d, 'Quần bơi', '{ jmp: 0.75, ctl: -0.5 }', 'Thoải mái bật nhảy; trơn nên kém khéo.', 'beach'),
 item('bc_shoes', 'shoes', 0, 0xffd23f, 'Dép quai hậu', '{ ctl: 0.75, spd: -0.5 }', 'Bám sân, đứng vững; dép nên chạy chậm.', 'beach'),
 item('bc_back', 'back', 0, 0xff5e7a, 'Phao bơi', '{ sta: 0.75, spd: -0.5 }', 'Vui là khỏe; vướng hông nên chậm chân.', 'beach'),
 item('nj_head', 'head', 1, 0x2b2f45, 'Khăn trùm ninja', '{ spd: 1, sta: -0.5 }', 'Nhẹ đầu, lướt nhanh; bí nên mau mệt.', 'ninja'),
 item('nj_shirt', 'shirt', 1, 0x2b2f45, 'Áo ninja', '{ ctl: 0.5, spd: 0.5, pow: -0.5 }', 'Gọn gàng, nhanh và khéo; không hợp đập lực.', 'ninja'),
 item('nj_pants', 'shorts', 1, 0x23263a, 'Quần ninja', '{ spd: 0.5, jmp: 0.5, sta: -0.5 }', 'Bó gọn, nhanh và bật tốt; bó nên mau mỏi.', 'ninja'),
 item('nj_shoes', 'shoes', 1, 0x2b2f45, 'Giày ninja', '{ spd: 1, pow: -0.5 }', 'Êm như mèo, chạy rất nhanh; đế mềm nên trụ yếu.', 'ninja'),
 item('nj_back', 'back', 1, 0x8a2f2f, 'Kiếm gỗ', '{ pow: 1, ctl: -0.5 }', 'Khí thế kiếm sĩ, đập mạnh; vướng lưng nên kém khéo.', 'ninja'),
 item('pr_head', 'head', 1, 0x2a2430, 'Mũ thuyền trưởng', '{ pow: 1, spd: -0.5 }', 'Oai phong, đập mạnh; mũ to nên chậm chân.', 'pirate'),
 item('pr_shirt', 'shirt', 1, 0xfff6e8, 'Áo sọc thủy thủ', '{ sta: 1, ctl: -0.5 }', 'Dẻo dai như dân đi biển; rộng nên kém khéo.', 'pirate'),
 item('pr_pants', 'shorts', 1, 0x7a5230, 'Quần ống rộng', '{ pow: 0.5, sta: 0.5, jmp: -0.5 }', 'Trụ vững, bền sức; rộng nên khó bật.', 'pirate'),
 item('pr_shoes', 'shoes', 1, 0x5a3d22, 'Bốt da', '{ pow: 1, jmp: -0.5 }', 'Trụ chắc, đập mạnh; nặng nên bật kém.', 'pirate'),
 item('pr_back', 'back', 1, 0x8a5a2b, 'Rương kho báu', '{ rch: 1, spd: -0.5 }', 'Tham nên với rất xa; nặng lưng nên chậm chân.', 'pirate'),
 item('as_head', 'head', 2, 0xf4f6fa, 'Mũ phi hành gia', '{ jmp: 1, rch: 0.25, ctl: -0.5 }', 'Bật như không trọng lực; kính dày nên kém khéo.', 'astro'),
 item('as_shirt', 'shirt', 2, 0xf4f6fa, 'Áo du hành', '{ sta: 1, jmp: 0.25, pow: -0.5 }', 'Có bình dưỡng khí, rất bền sức; cồng kềnh nên đập yếu.', 'astro'),
 item('as_pants', 'shorts', 2, 0xf4f6fa, 'Quần du hành', '{ jmp: 1, sta: 0.25, spd: -0.5 }', 'Bật cao; dày nên chạy chậm.', 'astro'),
 item('as_shoes', 'shoes', 2, 0xdfe5ee, 'Giày mặt trăng', '{ jmp: 1, ctl: 0.25, spd: -0.5 }', 'Đế nảy như trên mặt trăng; to nên chậm chân.', 'astro'),
 item('as_back', 'back', 2, 0x4f8fe8, 'Ba lô phản lực', '{ spd: 1, jmp: 0.25, ctl: -0.5 }', 'Phóng vèo vèo; đà lớn nên khó đánh tinh tế.', 'astro'),
 item('ry_head', 'head', 2, 0xf2c230, 'Vương miện hoàng gia', '{ ctl: 1, rch: 0.25, spd: -0.5 }', 'Điềm tĩnh, chính xác; nặng đầu nên chậm chân.', 'royal'),
 item('ry_shirt', 'shirt', 2, 0x6a3fd0, 'Áo hoàng tộc', '{ ctl: 1, sta: 0.25, pow: -0.5 }', 'Thanh lịch, đánh rất khéo; không hợp đập lực.', 'royal'),
 item('ry_pants', 'shorts', 2, 0xfff6ee, 'Quần hoàng tộc', '{ ctl: 1, jmp: 0.25, spd: -0.5 }', 'Bước đi khoan thai, chuẩn xác; không vội được.', 'royal'),
 item('ry_shoes', 'shoes', 2, 0xf2c230, 'Giày nạm vàng', '{ rch: 1, ctl: 0.25, jmp: -0.5 }', 'Bước dài, với xa; nặng nên bật kém.', 'royal'),
 item('ry_back', 'back', 2, 0xc22a3a, 'Áo choàng đỏ', '{ rch: 1, sta: 0.25, spd: -0.5 }', 'Tung áo choàng, với thật xa; vướng nên chậm chân.', 'royal'),
 item('hr_head', 'head', 2, 0xe0303a, 'Mũ siêu nhân', '{ pow: 1, jmp: 0.25, sta: -0.5 }', 'Sức mạnh chính nghĩa; hăng quá nên mau mệt.', 'hero'),
 item('hr_shirt', 'shirt', 2, 0xe0303a, 'Áo siêu nhân', '{ pow: 1, sta: 0.25, ctl: -0.5 }', 'Đập như sấm; mạnh tay nên kém tinh tế.', 'hero'),
 item('hr_pants', 'shorts', 2, 0x2f5fd9, 'Quần siêu nhân', '{ spd: 1, pow: 0.25, sta: -0.5 }', 'Lao đi như tên bắn; tốn sức.', 'hero'),
 item('hr_shoes', 'shoes', 2, 0xffd23f, 'Bốt siêu nhân', '{ spd: 1, jmp: 0.25, ctl: -0.5 }', 'Nhanh và nảy; đà lớn nên khó dừng chuẩn.', 'hero'),
 item('hr_back', 'back', 2, 0x2f5fd9, 'Áo choàng xanh', '{ pow: 1, spd: 0.25, ctl: -0.5 }', 'Bay vào đập cầu; áo bay phần phật nên kém khéo.', 'hero'),
])
patch('sim.js', [
 ("];\nconst GEAR_STAT_CAP = 2;", ITEMS +
  "];\n// outfit sets: wearing 3 pieces of one set adds +0.25 to the set's stat, all 5 pieces +0.5 (inside the same +-2 cap)\n"
  "const GEAR_SETS = [{ id: 'beach', name: 'Mùa hè', stat: 'sta' }, { id: 'ninja', name: 'Ninja', stat: 'spd' }, { id: 'pirate', name: 'Hải tặc', stat: 'pow' },\n"
  "  { id: 'astro', name: 'Phi hành gia', stat: 'jmp' }, { id: 'royal', name: 'Hoàng gia', stat: 'ctl' }, { id: 'hero', name: 'Siêu nhân', stat: 'pow' }];\n"
  "function setBonus(ids) {\n  const set = gearSet(ids), n = {}; for (const k in set) if (set[k].set) n[set[k].set] = (n[set[k].set] || 0) + 1;\n"
  "  return GEAR_SETS.filter((s) => n[s.id]).map((s) => ({ id: s.id, name: s.name, stat: s.stat, n: n[s.id], bonus: n[s.id] >= 5 ? 0.5 : n[s.id] >= 3 ? 0.25 : 0 }));\n}\n"
  "const GEAR_STAT_CAP = 2;"),
 ("  for (const k in set) for (const s in set[k].mods) out[s] += set[k].mods[s];\n", "  for (const k in set) for (const s in set[k].mods) out[s] += set[k].mods[s];\n  for (const b of setBonus(ids)) out[b.stat] += b.bonus;\n"),
 ("  GEAR, GEAR_SLOTS, GEAR_RARITY,", "  GEAR, GEAR_SLOTS, GEAR_SETS, setBonus, GEAR_RARITY,"),
])

HEAD = r"""  if (kind === 'ninja') {   // hood over the top and back of the head, headband with a metal plate, two tails
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
      mk(new THREE.SphereGeometry(0.86, 22, 8, 0, Math.PI * 2, 0, Math.PI / 2), team, 0, 0, 0, hat, true).scale.y = 0.6;
      const br = mk(new THREE.CylinderGeometry(1.5, 1.38, 0.2, 3), team, 0, 0.06, 0, hat, true); br.rotation.y = Math.PI;
      const tr = mk(new THREE.TorusGeometry(1.5, 0.05, 5, 3), acc, 0, 0.17, 0, hat); tr.rotation.set(Math.PI / 2, 0, Math.PI / 2);
      mk(new THREE.SphereGeometry(0.13, 10, 8), acc, 0, 0.3, 0.72, hat);
      const fe = mk(new THREE.SphereGeometry(0.2, 10, 8), toon(0xe0303a), 0.62, 0.55, -0.1, hat, true); fe.scale.set(0.4, 2.0, 0.7); fe.rotation.set(-0.5, 0, -0.35);
    }
    return gr;
  }
  if (kind === 'astro') {   // glass bubble with a collar ring and an antenna
    if (!fit.parent) gr.add(fit);
    const gl = mk(new THREE.SphereGeometry(1.5, 28, 18), basic(0xcfeeff, { transparent: true, opacity: 0.2, depthWrite: false }), 0, 0.12, 0.04, fit); gl.renderOrder = 4;
    const sh = mk(new THREE.SphereGeometry(1.51, 12, 6, 0.9, 0.5, 0.75, 0.55), basic(0xffffff, { transparent: true, opacity: 0.55, depthWrite: false }), 0, 0.12, 0.04, fit); sh.renderOrder = 5;
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
"""
BODY = r"""  // ---- outfit sets: shirt details and back pieces
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
    const cp = BK(new THREE.SphereGeometry(0.3, 20, 10, Math.PI * 1.06, Math.PI * 0.88, 0.42, 1.85), toon(col, { side: THREE.DoubleSide }), 0, tc - 0.12, -0.015); cp.scale.set(tx * 1.14, ty * 1.3, tz * 1.3);
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
"""
SHOP = r"""  if (gearSlot === 'sets') {   // outfit sets: try a whole set on, buy the missing pieces in one go
    $('gearList').innerHTML = !wallet ? '<p class="tiny">Đang kết nối máy chủ… Cửa hàng cần có mạng.</p>' : S.GEAR_SETS.map((st) => {
      const ps = S.GEAR.filter((g) => g.set === st.id), own = ps.filter((g) => items.includes(g.id)).length, cost = ps.filter((g) => !items.includes(g.id)).reduce((a, g) => a + g.price, 0);
      return `<div class="gear-item set-row r${ps[0].rar}${gearTrySet === st.id ? ' try' : ''}" data-set="${st.id}"><div class="gi"><b>Bộ ${esc(st.name)}</b><span class="rar">${S.GEAR_RARITY[ps[0].rar]} · có ${own}/${ps.length}</span>` +
        `<div class="set-ics">${ps.map((g) => `<span class="ic${items.includes(g.id) ? ' has' : ''}">${gearIconImg(g.id)}</span>`).join('')}</div><small>Mặc 3 món: +0.25 ${STAT_NAMES[st.stat]} · đủ 5 món: +0.5 ${STAT_NAMES[st.stat]}</small></div>` +
        (cost ? `<button class="pill buy" data-act="buyset" ${gold >= cost ? '' : 'disabled'}><i class="coin"></i>${cost}</button>` : '<span class="own">Đã đủ bộ</span>') + '</div>';
    }).join('');
    const ts = gearTrySet && S.GEAR_SETS.find((x) => x.id === gearTrySet);
    $('stageName').innerHTML = `${esc(c.name)}<small>Sức mạnh ${S.powerOf(c.id, shown)}${ts ? ' · đang thử bộ ' + esc(ts.name) : ''}</small>`;
    $('gearList').querySelectorAll('.set-row').forEach((row) => {
      const id = row.dataset.set;
      row.onclick = () => { gearTrySet = id; Sound.boop(); showPreview(true); renderShop(); };
      const b = row.querySelector('button');
      if (b) b.onclick = (ev) => { ev.stopPropagation(); Sound.boop(); for (const g of S.GEAR) if (g.set === id && !wallet.items.includes(g.id)) Net.send({ t: 'buyGear', id: g.id }); };
    });
    return;
  }
"""
patch('game.js', [
 ("  if (kind === 'crown') {   // small crown worn on top: band, five points, gems\n", HEAD + "  if (kind === 'crown' || kind === 'royal') {   // crown worn on top: band, points, gems ('royal': larger, with a velvet cap inside)\n"),
 ("top.rotation.x = -0.1; top.scale.setScalar(1.3); fit.add(top);", "top.rotation.x = -0.1; top.scale.setScalar(kind === 'royal' ? 1.55 : 1.3); fit.add(top); if (kind === 'royal') { mk(new THREE.SphereGeometry(0.37, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xc22a3a), 0, 0.14, 0, top).scale.y = 0.9; mk(new THREE.SphereGeometry(0.07, 8, 6), toon(0xffffff), 0, 0.5, 0, top); }"),
 ("  const headGear = GI.head === 'h_band' ?", "  const setHead = { nj_head: ['ninja', 0xc22a3a], bc_head: ['straw', 0xe0303a], pr_head: ['tricorn', 0xf2c230], as_head: ['astro', 0x4f8fe8], ry_head: ['royal', 0xfff3c4], hr_head: ['hero', 0xffd23f] }[GI.head];\n" + BODY +
  "  const headGear = setHead ? buildHeadGear(setHead[0], GL.head, setHead[1], P, fy, V.gearAt) : GI.head === 'h_band' ?"),
 # shapes shared with the basic items
 ("    const pk = GI.shorts, tight = pk === 'p_flex';", "    const pk = ({ nj_pants: 'p_flex', hr_pants: 'p_flex', bc_pants: 'p_light', ry_pants: 'p_pro', as_pants: 'p_pro', pr_pants: 'p_pro' })[GI.shorts] || GI.shorts, tight = pk === 'p_flex';"),
 ("    const sk = GI.shoes, wing = ", "    const sk = ({ bc_shoes: 's_run', nj_shoes: 's_run', as_shoes: 's_spring', pr_shoes: 's_pro', ry_shoes: 's_pro', hr_shoes: 's_pro' })[GI.shoes] || GI.shoes, wing = "),
 ("        if (sk === 's_pro') wing();\n", "        if (GI.shoes === 's_pro') wing();\n"),
 ("        wing();\n      }\n    } else {", "        if (GI.shoes === 's_pro') wing();\n      }\n    } else {"),
 # preview / shop / wardrobe
 ("let gearSlot = 'racket', gearTry = null;", "let gearSlot = 'racket', gearTry = null, gearTrySet = null;"),
 ("  const worn = myGear(), g = gearTry && S.gearById(gearTry);\n",
  "  const worn = myGear(), g = gearTry && S.gearById(gearTry);\n"
  "  if (screen === 'shop' && gearSlot === 'sets' && gearTrySet) { const ps = S.GEAR.filter((x) => x.set === gearTrySet), sl = new Set(ps.map((x) => x.slot)); return worn.filter((id) => !sl.has(S.gearById(id).slot)).concat(ps.map((x) => x.id)); }\n"),
 ("  $('gearTabs').innerHTML = S.GEAR_SLOTS.map(([k, n]) =>", "  $('gearTabs').innerHTML = [['sets', 'Bộ đồ']].concat(S.GEAR_SLOTS).map(([k, n]) =>"),
 ("  const tryIt = gearTry && S.gearById(gearTry);\n", "  const tryIt = gearTry && S.gearById(gearTry);\n".replace("  const tryIt", "  const tryIt")),
 ("  $('gearTabs').querySelectorAll('button').forEach((b) => { b.onclick = () => { gearSlot = b.dataset.slot; gearTry = null; Sound.boop(); showPreview(true); renderShop(); }; });\n  $('gearList').querySelectorAll('.gear-item').forEach((row) => {",
  "  $('gearTabs').querySelectorAll('button').forEach((b) => { b.onclick = () => { gearSlot = b.dataset.slot; gearTry = null; gearTrySet = null; Sound.boop(); showPreview(true); renderShop(); }; });\n" + SHOP +
  "  $('gearList').querySelectorAll('.gear-item').forEach((row) => {"),
 ("function renderGear() {\n  if (!wdDragInit.done)", "function renderGear() {\n  if (gearSlot === 'sets') gearSlot = 'head';\n  if (!wdDragInit.done)"),
 ("  if (!pick) $('wdDetail').innerHTML = '';\n", "  const setsHtml = S.setBonus(worn).map((b) => `<div class=\"wd-cmp wd-set\"><small>Bộ <b>${esc(b.name)}</b> ${b.n}/5 · ${b.bonus ? 'đang cộng <b>+' + b.bonus + ' ' + STAT_NAMES[b.stat] + '</b>' : 'mặc 3 món để được cộng ' + STAT_NAMES[b.stat]}</small></div>`).join('');\n  if (!pick) $('wdDetail').innerHTML = setsHtml;\n"),
 ("`<button class=\"cta\" id=\"wdAct\" data-act=\"${isWorn ? 'off' : 'on'}\">${isWorn ? 'Tháo ra' : 'Mặc vào'}</button>`;", "`<button class=\"cta\" id=\"wdAct\" data-act=\"${isWorn ? 'off' : 'on'}\">${isWorn ? 'Tháo ra' : 'Mặc vào'}</button>` + setsHtml;"),
 ("gearSlot === 'neck' ? [1.3, 3.5] :", "gearSlot === 'neck' ? [1.3, 3.5] : gearSlot === 'sets' ? [1.05, 5.3] :"),
])
patch('style.css', [
 ("#gearTabs{grid-template-columns:repeat(5,1fr)}", "#gearTabs{grid-template-columns:repeat(5,1fr)}\n.set-ics{display:flex;gap:4px;margin:5px 0 3px}.set-ics .ic{width:42px;height:42px;opacity:.5;border-radius:10px}.set-ics .ic.has{opacity:1;border-color:#7ff0a8}\n.gear-item.set-row{align-items:center}.wd-set small b{color:#ffd76a}"),
])
patch('tests/economy-regression.js', [
 ("assert.equal(S.GEAR.length, 30); assert.equal(new Set(S.GEAR.map((g) => g.id)).size, 30);", "assert.equal(S.GEAR.length, 60); assert.equal(new Set(S.GEAR.map((g) => g.id)).size, 60);"),
 ("assert.equal(S.powerOf('cat', best), 2450);", "{ const pw = S.powerOf('cat', best); assert(pw >= 2300 && pw <= 1800 + 9 * 75 + 50, 'best power ' + pw); }\n"
  "// outfit sets: 6 sets of 5 pieces in 5 different slots; 3 pieces +0.25, 5 pieces +0.5 on the set's stat\n"
  "assert.equal(S.GEAR_SETS.length, 6); for (const st of S.GEAR_SETS) { const ps = S.GEAR.filter((g) => g.set === st.id); assert.equal(ps.length, 5); assert.equal(new Set(ps.map((g) => g.slot)).size, 5); assert.equal(new Set(ps.map((g) => g.rar)).size, 1); }\n"
  "{ const nj = S.GEAR.filter((g) => g.set === 'ninja').map((g) => g.id), raw = (ids) => ids.reduce((a, id) => a + (S.gearById(id).mods.spd || 0), 0);\n"
  "  assert.equal(S.gearMods(nj.slice(0, 2)).spd, raw(nj.slice(0, 2))); assert.equal(S.gearMods(nj.slice(0, 3)).spd, Math.min(2, raw(nj.slice(0, 3)) + 0.25)); assert.equal(S.gearMods(nj).spd, Math.min(2, raw(nj) + 0.5));\n"
  "  assert.deepEqual(S.setBonus(nj).map((b) => [b.id, b.n, b.bonus]), [['ninja', 5, 0.5]]); assert.deepEqual(S.setBonus(['r_light']), []); }  //"),
])
print('ok')
