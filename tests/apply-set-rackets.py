# One-off patch: every outfit set gets its own racket (6th piece, own ornament): 22 more items (162). Set bonus: 3 -> +0.25, 5 -> +0.5, all 6 -> +0.75.
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
# key, set, rarity, colour, name, plus, second plus, minus, description, shape, ornament, accent
R = [
 ('bc', 'beach', 0, 0xff8a3d, 'Vợt bãi biển', 'ctl', None, 'pow', 'Nhẹ như đánh chơi trên cát; không dùng để đập mạnh.', 'r_light', 'rings', 0xffffff),
 ('wn', 'winter', 0, 0xd9483b, 'Vợt kẹo gậy', 'ctl', None, 'spd', 'Ngọt tay, đặt cầu chuẩn; lạnh tay nên chậm.', 'r_light', 'rings', 0xffffff),
 ('dv', 'diver', 0, 0x23b5c9, 'Vợt san hô', 'rch', None, 'pow', 'Dài tay như bơi sải; mảnh nên đập nhẹ.', 'r_light', 'leaf', 0xff7a9a),
 ('be', 'bee', 0, 0xffd23f, 'Vợt tổ ong', 'pow', None, 'sta', 'Chích một phát đau điếng; hăng nên mau mệt.', 'r_light', 'rings', 0x23232b),
 ('nj', 'ninja', 1, 0x2b2f45, 'Vợt bóng đêm', 'ctl', None, 'pow', 'Ra đòn không tiếng động, cực chuẩn; nhẹ nên thiếu lực.', 'r_light', 'guard', 0xc22a3a),
 ('pr', 'pirate', 1, 0x7a5230, 'Vợt thuyền trưởng', 'pow', None, 'ctl', 'Nặng như mái chèo, đập mạnh; khó tinh tế.', 'r_heavy', 'gem', 0xf2c230),
 ('cb', 'cowboy', 1, 0x9a6a3a, 'Vợt cao bồi', 'rch', None, 'ctl', 'Quăng như thòng lọng, với xa; hơi ẩu.', 'r_heavy', 'star', 0xf2c230),
 ('ch', 'chef', 1, 0x3a3a46, 'Vợt chảo gang', 'pow', None, 'spd', 'Vung như lật chảo, rất lực; nặng tay.', 'r_heavy', 'rings', 0xc9d2e0),
 ('rk', 'rock', 1, 0x23232b, 'Vợt đinh tán', 'pow', None, 'ctl', 'Quẩy tới bến; đập bừa nên kém chuẩn.', 'r_heavy', 'spikes', 0xc9d2e0),
 ('dt', 'detective', 1, 0xc9a66b, 'Vợt suy luận', 'ctl', None, 'pow', 'Tính trước từng đường cầu; không dùng sức.', 'r_light', 'guard', 0x5a3d22),
 ('po', 'police', 1, 0x2f5fd9, 'Vợt công lý', 'ctl', None, 'jmp', 'Chuẩn mực từng cú đánh; nghiêm nên ít bật.', 'r_heavy', 'star', 0xf2c230),
 ('pk', 'pumpkin', 1, 0xff8a1f, 'Vợt bí ngô', 'rch', None, 'sta', 'Dài và ma quái; cầm lâu mỏi tay.', 'r_heavy', 'leaf', 0x4f8f3a),
 ('as', 'astro', 2, 0xf4f6fa, 'Vợt phản lực', 'pow', 'jmp', 'ctl', 'Có động cơ đẩy sau mỗi cú đập; khó điều khiển.', 'r_heavy', 'flame', 0xff8a3d),
 ('ry', 'royal', 2, 0xf2c230, 'Quyền trượng hoàng gia', 'ctl', 'rch', 'spd', 'Uy nghi, chính xác; nặng nên chậm.', 'r_pro', 'gem', 0xc22a3a),
 ('hr', 'hero', 2, 0xe0303a, 'Vợt sấm sét', 'pow', 'spd', 'ctl', 'Giáng xuống như sét; mạnh quá khó kiểm soát.', 'r_heavy', 'star', 0xffd23f),
 ('wz', 'wizard', 2, 0x6a3fd0, 'Gậy phép', 'ctl', 'rch', 'pow', 'Điều cầu bằng phép thuật; không cần sức.', 'r_light', 'star', 0xffe18a),
 ('rb', 'robot', 2, 0x8a93a6, 'Vợt cơ khí', 'pow', 'sta', 'jmp', 'Pít-tông trợ lực mỗi cú đánh; nặng nên khó bật.', 'r_heavy', 'cog', 0x5ad1ff),
 ('dn', 'dino', 2, 0x4caf50, 'Vợt răng nanh', 'pow', 'rch', 'ctl', 'Ngoạm lấy cầu mà quật; thô bạo.', 'r_heavy', 'teeth', 0xffffff),
 ('fa', 'fairy', 2, 0xff9fd6, 'Vợt cánh hoa', 'ctl', 'jmp', 'pow', 'Nhẹ như cánh hoa, rất khéo; không có lực.', 'r_light', 'bow', 0xffffff),
 ('an', 'angel', 3, 0xfffaf0, 'Vợt thiên sứ', 'ctl', 'rch', 'pow', 'Mỗi cú đánh đều được dẫn lối; không nỡ đập mạnh.', 'r_light', 'wings', 0xffe18a),
 ('sm', 'samurai', 3, 0xa3242f, 'Vợt katana', 'pow', 'ctl', 'sta', 'Một nhát dứt điểm, sắc và chuẩn; dồn sức nên mau mệt.', 'r_pro', 'guard', 0xf2c230),
 ('dm', 'demon', 3, 0x8a1020, 'Vợt địa ngục', 'pow', 'rch', 'ctl', 'Rực lửa mỗi cú đập; hung bạo khó kiểm soát.', 'r_pro', 'horns', 0xffb84d),
]
PRICE = [300, 900, 2200, 5000]; A = [0.75, 1, 1, 1]; B = [0, 0, 0.25, 0.5]
items = ''; rk = []
for k, st, rar, col, name, p1, p2, m, desc, shape, orn, acc in R:
    mods = '{ %s: %s%s, %s: -0.5 }' % (p1, A[rar], (', %s: %s' % (p2, B[rar])) if p2 else '', m)
    assert (p2 is None) == (rar < 2)
    items += "  { id: '%s_racket', slot: 'racket', set: '%s', rar: %d, price: %d, col: 0x%06x, name: '%s', mods: %s, desc: '%s' },\n" % (k, st, rar, PRICE[rar], col, name, mods, desc)
    rk.append("%s_racket: ['%s', '%s', 0x%06x]" % (k, shape, orn, acc))
patch('sim.js', [
 ("];\n// outfit sets: wearing 3 pieces", items + "];\n// outfit sets: wearing 3 pieces"),
 ("bonus: n[s.id] >= 5 ? 0.5 : n[s.id] >= 3 ? 0.25 : 0 }));", "bonus: n[s.id] >= 6 ? 0.75 : n[s.id] >= 5 ? 0.5 : n[s.id] >= 3 ? 0.25 : 0 }));"),
])
patch('economy.js', [("const SET_GEMS = [60, 150, 320, 700];", "const SET_GEMS = [75, 180, 380, 820];")])
ORN = r"""  if (rkS) {   // a set racket: the ornament that makes it that set's racket
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
"""
patch('game.js', [
 ("  const rk = GI.racket, fTube =", "  const rkS = ({ " + ', '.join(rk) + " })[GI.racket];   // set rackets: [frame shape, ornament, accent colour]\n  const rk = rkS ? rkS[0] : GI.racket, fTube ="),
 ("  strings.scale.set(fSx, fSy, 1);\n  addOutlines(body, 0.018);", "  strings.scale.set(fSx, fSy, 1);\n" + ORN + "  addOutlines(body, 0.018);"),
 ("<small>Mặc 3 món: +0.25 ${STAT_NAMES[st.stat]} · đủ 5 món: +0.5 ${STAT_NAMES[st.stat]}</small>", "<small>${STAT_NAMES[st.stat]}: mặc 3 món +0.25 · 5 món +0.5 · đủ ${ps.length} món +0.75</small>"),
 ("Bộ <b>${esc(b.name)}</b> ${b.n}/5 ·", "Bộ <b>${esc(b.name)}</b> ${b.n}/6 ·"),
])
patch('style.css', [(".set-ics .ic{width:42px;height:42px;", ".set-ics .ic{width:36px;height:36px;")])
patch('tests/economy-regression.js', [
 ("assert.equal(S.GEAR.length, 140); assert.equal(new Set(S.GEAR.map((g) => g.id)).size, 140);", "assert.equal(S.GEAR.length, 162); assert.equal(new Set(S.GEAR.map((g) => g.id)).size, 162);"),
 ("assert.equal(ps.length, 5); assert.equal(new Set(ps.map((g) => g.slot)).size, 5);", "assert.equal(ps.length, 6); assert.equal(new Set(ps.map((g) => g.slot)).size, 6);"),
 ("assert.equal(S.gearMods(nj).spd, Math.min(2, raw(nj) + 0.5));\n  assert.deepEqual(S.setBonus(nj).map((b) => [b.id, b.n, b.bonus]), [['ninja', 5, 0.5]]);", "assert.equal(S.gearMods(nj.slice(0, 5)).spd, Math.min(2, raw(nj.slice(0, 5)) + 0.5)); assert.equal(S.gearMods(nj).spd, Math.min(2, raw(nj) + 0.75));\n  assert.deepEqual(S.setBonus(nj).map((b) => [b.id, b.n, b.bonus]), [['ninja', 6, 0.75]]);"),
])
patch('tests/chest-regression.js', [
 ("assert.equal(E.setPrice(p.eco, 'ninja'), 150); assert(!E.buySet(p, 'ninja', T0).ok, 'no diamonds'); p.eco.shards = 60; E.craftGear(p, 'nj_head', T0); assert.equal(E.setPrice(p.eco, 'ninja'), 120);\n  p.eco.gems = 120;", "assert.equal(E.setPrice(p.eco, 'ninja'), 180); assert(!E.buySet(p, 'ninja', T0).ok, 'no diamonds'); p.eco.shards = 60; E.craftGear(p, 'nj_head', T0); assert.equal(E.setPrice(p.eco, 'ninja'), 150);\n  p.eco.gems = 150;"),
 ("'angel') === 700 &&", "'angel') === 820 &&"),
])
patch('tests/shop-economy-ui-check.py', [("Object.values(__w().equip).filter(i=>i.startsWith('nj_')).length\")", "Object.values(__w().equip).filter(i=>i.startsWith('nj_')).length\")  # 6 with the set racket")])
print('ok')
