# One-off patch: six more outfit sets (demon, bee, dino, police, fairy, pumpkin): 22 sets, 140 items.
from pathlib import Path
import os; os.chdir(Path(__file__).resolve().parents[1])
def patch(name, pairs):
    s = open(name, encoding='utf-8', newline='').read()
    for old, new in pairs:
        for eol in ('\n', '\r\n'):
            o = old.replace('\n', eol)
            if s.count(o) == 1: s = s.replace(o, new.replace('\n', eol)); break
        else: raise AssertionError((name, old[:80]))
    open(name, 'w', encoding='utf-8', newline='').write(s)
def item(id, slot, rar, col, name, mods, desc, st):
    return "  { id: '%s', slot: '%s', set: '%s', rar: %d, price: %d, col: 0x%06x, name: '%s', mods: %s, desc: '%s' },\n" % (id, slot, st, rar, [300, 900, 2200, 5000][rar], col, name, mods, desc)
ITEMS = ''.join([
 item('be_head', 'head', 0, 0x23232b, 'Râu ong', '{ spd: 0.75, pow: -0.5 }', 'Đánh hơi đường cầu, lao nhanh; nhỏ con nên đập nhẹ.', 'bee'),
 item('be_shirt', 'shirt', 0, 0xffd23f, 'Áo sọc ong', '{ sta: 0.75, ctl: -0.5 }', 'Chăm chỉ không biết mệt; vội nên kém khéo.', 'bee'),
 item('be_pants', 'shorts', 0, 0x23232b, 'Quần ong', '{ jmp: 0.75, sta: -0.5 }', 'Bật như cất cánh; tốn sức.', 'bee'),
 item('be_shoes', 'shoes', 0, 0xffd23f, 'Giày mật', '{ spd: 0.75, jmp: -0.5 }', 'Chạy vo ve khắp sân; dính nên bật kém.', 'bee'),
 item('be_back', 'back', 0, 0xbfeaff, 'Cánh ong', '{ jmp: 0.75, ctl: -0.5 }', 'Vỗ cánh bật cao; rung nên kém chính xác.', 'bee'),
 item('po_head', 'head', 1, 0x1f3f8a, 'Mũ cảnh sát', '{ ctl: 1, spd: -0.5 }', 'Nghiêm túc, chuẩn xác; đứng nghiêm nên chậm.', 'police'),
 item('po_shirt', 'shirt', 1, 0x2f5fd9, 'Áo cảnh phục', '{ sta: 0.5, ctl: 0.5, jmp: -0.5 }', 'Kỷ luật và bền bỉ; áo cứng nên khó bật.', 'police'),
 item('po_pants', 'shorts', 1, 0x1f2f5a, 'Quần cảnh phục', '{ sta: 1, spd: -0.5 }', 'Tuần tra cả ngày không mỏi; không vội được.', 'police'),
 item('po_shoes', 'shoes', 1, 0x23232b, 'Giày tuần tra', '{ spd: 1, jmp: -0.5 }', 'Đuổi kịp mọi đường cầu; đế cứng nên bật kém.', 'police'),
 item('po_back', 'back', 1, 0x23232b, 'Dùi cui', '{ pow: 1, ctl: -0.5 }', 'Ra đòn dứt khoát; mạnh tay nên kém tinh tế.', 'police'),
 item('pk_head', 'head', 1, 0xff8a1f, 'Mũ bí ngô', '{ rch: 1, spd: -0.5 }', 'Dọa đối thủ, với xa; đầu to nên chậm.', 'pumpkin'),
 item('pk_shirt', 'shirt', 1, 0x23232b, 'Áo bộ xương', '{ spd: 0.5, jmp: 0.5, pow: -0.5 }', 'Nhẹ tênh, nhanh và bật tốt; toàn xương nên thiếu lực.', 'pumpkin'),
 item('pk_pants', 'shorts', 1, 0x23232b, 'Quần bộ xương', '{ spd: 1, sta: -0.5 }', 'Chạy lạch cạch rất nhanh; mau rã rời.', 'pumpkin'),
 item('pk_shoes', 'shoes', 1, 0xff8a1f, 'Giày bí ngô', '{ jmp: 1, ctl: -0.5 }', 'Nảy như quả bí lăn; khó kiểm soát.', 'pumpkin'),
 item('pk_back', 'back', 1, 0x9a6a3a, 'Chổi phù thủy', '{ rch: 1, pow: -0.5 }', 'Quét được cầu ở xa; chổi nhẹ nên đập yếu.', 'pumpkin'),
 item('dn_head', 'head', 2, 0x4caf50, 'Mũ khủng long', '{ pow: 1, rch: 0.25, ctl: -0.5 }', 'Gầm lên rồi đập; hung hăng nên kém khéo.', 'dino'),
 item('dn_shirt', 'shirt', 2, 0x4caf50, 'Áo khủng long', '{ sta: 1, pow: 0.25, spd: -0.5 }', 'Da dày, lì đòn; to xác nên chậm.', 'dino'),
 item('dn_pants', 'shorts', 2, 0x3d8f41, 'Quần khủng long', '{ pow: 1, sta: 0.25, jmp: -0.5 }', 'Chân trụ khổng lồ; nặng nên khó bật.', 'dino'),
 item('dn_shoes', 'shoes', 2, 0x3d8f41, 'Chân khủng long', '{ pow: 1, jmp: 0.25, spd: -0.5 }', 'Dậm một cái rung sân; bước nặng nề.', 'dino'),
 item('dn_back', 'back', 2, 0x4caf50, 'Đuôi khủng long', '{ rch: 1, pow: 0.25, spd: -0.5 }', 'Giữ thăng bằng khi với xa; đuôi dài vướng chân.', 'dino'),
 item('fa_head', 'head', 2, 0xff9fd6, 'Vòng hoa', '{ ctl: 1, sta: 0.25, pow: -0.5 }', 'Dịu dàng, khéo léo; không quen đập mạnh.', 'fairy'),
 item('fa_shirt', 'shirt', 2, 0xff9fd6, 'Áo tiên hoa', '{ jmp: 1, ctl: 0.25, pow: -0.5 }', 'Nhẹ như cánh hoa; mỏng nên thiếu lực.', 'fairy'),
 item('fa_pants', 'shorts', 2, 0xc59bff, 'Váy cánh hoa', '{ jmp: 1, spd: 0.25, sta: -0.5 }', 'Xoay và bật nhẹ nhàng; múa nhiều nên mau mệt.', 'fairy'),
 item('fa_shoes', 'shoes', 2, 0xfff0a8, 'Giày phấn hoa', '{ spd: 1, jmp: 0.25, pow: -0.5 }', 'Lướt trên đầu ngón chân; nhẹ nên trụ yếu.', 'fairy'),
 item('fa_back', 'back', 2, 0x7fe3ff, 'Cánh bướm', '{ jmp: 1, rch: 0.25, ctl: -0.5 }', 'Bay lên đón cầu; chao liệng nên khó chuẩn.', 'fairy'),
 item('dm_head', 'head', 3, 0x8a1020, 'Sừng ác quỷ', '{ pow: 1, spd: 0.5, ctl: -0.5 }', 'Hung hãn tột độ, đập như trời giáng; mất bình tĩnh.', 'demon'),
 item('dm_shirt', 'shirt', 3, 0x5a0c18, 'Áo lửa địa ngục', '{ pow: 1, sta: 0.5, jmp: -0.5 }', 'Sức nóng không tắt; áo nặng nên khó bật.', 'demon'),
 item('dm_pants', 'shorts', 3, 0x2a0a10, 'Quần bóng đêm', '{ spd: 1, pow: 0.5, sta: -0.5 }', 'Lao tới như bóng ma; hao sức.', 'demon'),
 item('dm_shoes', 'shoes', 3, 0x8a1020, 'Móng quỷ', '{ spd: 1, jmp: 0.5, ctl: -0.5 }', 'Bám sân, bứt tốc cực mạnh; khó dừng chuẩn.', 'demon'),
 item('dm_back', 'back', 3, 0x5a1030, 'Cánh dơi', '{ jmp: 1, pow: 0.5, sta: -0.5 }', 'Vọt lên rồi bổ xuống; vỗ cánh nhiều nên mau mệt.', 'demon'),
])
patch('sim.js', [
 ("];\n// outfit sets: wearing 3 pieces", ITEMS + "];\n// outfit sets: wearing 3 pieces"),
 ("{ id: 'angel', name: 'Thiên thần', stat: 'jmp' }, { id: 'samurai', name: 'Samurai', stat: 'pow' }];",
  "{ id: 'angel', name: 'Thiên thần', stat: 'jmp' }, { id: 'samurai', name: 'Samurai', stat: 'pow' },\n  { id: 'bee', name: 'Ong chăm chỉ', stat: 'spd' }, { id: 'police', name: 'Cảnh sát', stat: 'ctl' }, { id: 'pumpkin', name: 'Bí ngô', stat: 'rch' }, { id: 'dino', name: 'Khủng long', stat: 'pow' },\n  { id: 'fairy', name: 'Tiên bướm', stat: 'jmp' }, { id: 'demon', name: 'Ác quỷ', stat: 'pow' }];"),
])
HEAD = r"""  if (kind === 'horns') {   // two curved horns and a dark circlet
    ring(0.5, 0.07, toon(0x23232b, { side: THREE.DoubleSide }), 1.04, 0.16);
    for (const sd of [-1, 1]) { const hg = new THREE.Group(); hg.position.set(sd * 0.52, 0.8, 0.12); hg.rotation.z = -sd * 0.55; fit.add(hg);
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
"""
BODY = r"""  // ---- sets: bee, police, pumpkin, dino, fairy, demon
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
  if (GI.back === 'dm_back') { for (const sd of [-1, 1]) { const w = fan(GL.back, 0x3a0a20, sd, 4, 0.42, 0.1, 0.12); const bone = add(new THREE.CylinderGeometry(0.014, 0.014, 0.42, 5), toon(0x23232b), sd * 0.15, 0.13, -0.035, w); bone.rotation.z = -sd * 0.85; noOL(bone); noOL(add(new THREE.ConeGeometry(0.02, 0.06, 5), toon(0xfff3c4), sd * 0.31, 0.275, -0.035, w)); } }
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
"""
patch('game.js', [
 ("  if (kind === 'astro') {   // glass bubble", HEAD + "  if (kind === 'astro') {   // glass bubble"),
 ("sm_head: ['kabuto', 0xf2c230] }[GI.head];", "sm_head: ['kabuto', 0xf2c230], dm_head: ['horns', 0x23232b], be_head: ['antenna', 0xffd23f], dn_head: ['dino', 0xffd23f], po_head: ['police', 0xf2c230], fa_head: ['flowers', 0xffffff], pk_head: ['pumpkin', 0x4f8f3a] }[GI.head];"),
 ("  const headGear = setHead ?", BODY + "  const headGear = setHead ?"),
 ("an_pants: 'p_pro', sm_pants: 'p_pro' }", "an_pants: 'p_pro', sm_pants: 'p_pro', dm_pants: 'p_flex', pk_pants: 'p_flex', be_pants: 'p_light', fa_pants: 'p_light', dn_pants: 'p_pro', po_pants: 'p_pro' }"),
 ("an_shoes: 's_run', sm_shoes: 's_run' }", "an_shoes: 's_run', sm_shoes: 's_run', dm_shoes: 's_pro', po_shoes: 's_pro', dn_shoes: 's_spring', be_shoes: 's_run', fa_shoes: 's_run', pk_shoes: 's_run' }"),
])
patch('tests/economy-regression.js', [
 ("assert.equal(S.GEAR.length, 110); assert.equal(new Set(S.GEAR.map((g) => g.id)).size, 110);", "assert.equal(S.GEAR.length, 140); assert.equal(new Set(S.GEAR.map((g) => g.id)).size, 140);"),
 ("assert.equal(S.GEAR_SETS.length, 16);", "assert.equal(S.GEAR_SETS.length, 22);"),
])
print('ok')
