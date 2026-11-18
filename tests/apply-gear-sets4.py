# One-off patch: ten more outfit sets of 2..5 pieces (thief, doctor, boxer, knight, Tet, football, student, ice, hunter, idol): 32 sets, 198 items.
# Set bonus tiers now depend on the size of the set; a set's diamond price is per piece.
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
 item('fb_shirt', 'shirt', 0, 0x2f8f6a, 'Áo đấu sọc', '{ spd: 0.75, ctl: -0.5 }', 'Chạy cánh không biết mỏi; vội nên kém chuẩn.', 'football'),
 item('fb_pants', 'shorts', 0, 0xffffff, 'Quần đá bóng', '{ jmp: 0.75, sta: -0.5 }', 'Bật đánh đầu rất cao; tốn sức.', 'football'),
 item('fb_shoes', 'shoes', 0, 0x23232b, 'Giày đinh', '{ spd: 0.75, jmp: -0.5 }', 'Bám sân, bứt tốc; đinh cứng nên bật kém.', 'football'),
 item('st_face', 'face', 0, 0x23232b, 'Kính cận', '{ ctl: 0.75, rch: -0.5 }', 'Nhìn rõ từng sợi lông cầu; ngại với xa.', 'student'),
 item('st_shirt', 'shirt', 0, 0xffffff, 'Áo đồng phục', '{ sta: 0.75, pow: -0.5 }', 'Gọn gàng, bền bỉ; hiền nên đập nhẹ.', 'student'),
 item('st_neck', 'neck', 0, 0xe0303a, 'Khăn quàng đỏ', '{ ctl: 0.75, spd: -0.5 }', 'Chăm ngoan, đánh chuẩn; không chạy nhảy lung tung.', 'student'),
 item('st_back', 'back', 0, 0x3f6fd9, 'Cặp sách', '{ sta: 0.75, jmp: -0.5 }', 'Đeo quen nên lưng khỏe; nặng nên khó bật.', 'student'),
 item('th_face', 'face', 1, 0x23232b, 'Mặt nạ đạo chích', '{ spd: 1, ctl: -0.5 }', 'Thoắt ẩn thoắt hiện; che mắt nên kém chuẩn.', 'thief'),
 item('th_shirt', 'shirt', 1, 0xf4f6fa, 'Áo sọc kẻ trộm', '{ spd: 0.5, jmp: 0.5, pow: -0.5 }', 'Nhẹ nhàng leo trèo; không quen dùng sức.', 'thief'),
 item('th_back', 'back', 1, 0xc9a66b, 'Bao chiến lợi phẩm', '{ rch: 1, spd: -0.5 }', 'Tay dài quen với đồ; vác nặng nên chậm.', 'thief'),
 item('dc_head', 'head', 1, 0xc9d2e0, 'Gương khám bệnh', '{ ctl: 1, pow: -0.5 }', 'Soi kỹ từng đường cầu; nhẹ tay.', 'doctor'),
 item('dc_shirt', 'shirt', 1, 0xffffff, 'Áo blouse', '{ sta: 1, spd: -0.5 }', 'Trực đêm quen rồi, rất bền; áo dài nên chậm.', 'doctor'),
 item('dc_neck', 'neck', 1, 0x3a4254, 'Ống nghe', '{ ctl: 0.5, rch: 0.5, pow: -0.5 }', 'Nghe được nhịp cầu; không dùng sức.', 'doctor'),
 item('dc_wrist', 'wrist', 1, 0xffffff, 'Đồng hồ bác sĩ', '{ ctl: 1, jmp: -0.5 }', 'Đúng từng giây; cẩn thận nên ít bật.', 'doctor'),
 item('bx_head', 'head', 1, 0xd9483b, 'Mũ bảo hộ quyền anh', '{ sta: 1, ctl: -0.5 }', 'Chịu đòn tốt; che tai mắt nên kém khéo.', 'boxer'),
 item('bx_wrist', 'wrist', 1, 0xd9483b, 'Găng đấm bốc', '{ pow: 1, ctl: -0.5 }', 'Mỗi cú đập như một cú đấm; to nên vụng.', 'boxer'),
 item('bx_pants', 'shorts', 1, 0xd9483b, 'Quần đấm bốc', '{ pow: 0.5, spd: 0.5, jmp: -0.5 }', 'Di chuyển lắt léo, trụ khỏe; rộng nên khó bật.', 'boxer'),
 item('hu_head', 'head', 1, 0x3d7a3a, 'Mũ thợ săn', '{ rch: 1, pow: -0.5 }', 'Mắt tinh như cú, với xa; nhẹ tay.', 'hunter'),
 item('hu_back', 'back', 1, 0x7a5230, 'Ống tên', '{ rch: 0.5, ctl: 0.5, spd: -0.5 }', 'Ngắm là trúng; vướng lưng nên chậm.', 'hunter'),
 item('hu_wrist', 'wrist', 1, 0x7a5230, 'Bao tay da', '{ ctl: 1, pow: -0.5 }', 'Tay vững như kéo cung; không đập mạnh.', 'hunter'),
 item('kn_head', 'head', 2, 0xc9d2e0, 'Mũ giáp hiệp sĩ', '{ sta: 1, pow: 0.25, spd: -0.5 }', 'Không gì làm nao núng; nặng nên chậm.', 'knight'),
 item('kn_shirt', 'shirt', 2, 0xb8c2d4, 'Giáp bạc', '{ sta: 1, ctl: 0.25, jmp: -0.5 }', 'Vững như thành; giáp nặng khó bật.', 'knight'),
 item('kn_shoes', 'shoes', 2, 0x9aa5b8, 'Giày sắt', '{ pow: 1, sta: 0.25, spd: -0.5 }', 'Trụ cực chắc; bước nặng nề.', 'knight'),
 item('kn_back', 'back', 2, 0x3f6fd9, 'Khiên tròn', '{ sta: 1, rch: 0.25, spd: -0.5 }', 'Che chắn phía sau; vác khiên nên chậm.', 'knight'),
 item('kn_racket', 'racket', 2, 0xc9d2e0, 'Vợt kiếm bạc', '{ pow: 1, ctl: 0.25, sta: -0.5 }', 'Chém cầu như chém gió; mau mỏi tay.', 'knight'),
 item('tt_head', 'head', 2, 0xc22a3a, 'Khăn đóng đỏ', '{ ctl: 1, sta: 0.25, jmp: -0.5 }', 'Trang trọng, điềm tĩnh; không tiện bật nhảy.', 'tet'),
 item('tt_shirt', 'shirt', 2, 0xc22a3a, 'Áo dài gấm', '{ ctl: 1, rch: 0.25, pow: -0.5 }', 'Thướt tha mà chuẩn xác; không dùng sức.', 'tet'),
 item('tt_neck', 'neck', 2, 0xc22a3a, 'Bao lì xì', '{ sta: 1, ctl: 0.25, spd: -0.5 }', 'Có lộc nên khỏe cả năm; giữ kỹ nên đi chậm.', 'tet'),
 item('tt_back', 'back', 2, 0xff9fb8, 'Cành đào', '{ jmp: 1, ctl: 0.25, pow: -0.5 }', 'Xuân về, lòng nhẹ bẫng; sợ rụng hoa nên đập nhẹ.', 'tet'),
 item('id_face', 'face', 2, 0xff3d9a, 'Kính ngôi sao', '{ spd: 1, jmp: 0.25, ctl: -0.5 }', 'Tỏa sáng trên sân; chói nên kém chuẩn.', 'idol'),
 item('id_neck', 'neck', 2, 0xff3d9a, 'Nơ sân khấu', '{ jmp: 1, ctl: 0.25, pow: -0.5 }', 'Nhảy như trên sân khấu; không quen đập mạnh.', 'idol'),
 item('ic_head', 'head', 3, 0x7fe3ff, 'Vương miện băng', '{ ctl: 1, rch: 0.5, spd: -0.5 }', 'Lạnh lùng, chính xác tuyệt đối; lạnh nên chậm.', 'ice'),
 item('ic_shirt', 'shirt', 3, 0xcfeeff, 'Áo băng tuyết', '{ sta: 1, ctl: 0.5, pow: -0.5 }', 'Không bao giờ đổ mồ hôi; giòn nên đập nhẹ.', 'ice'),
 item('ic_neck', 'neck', 3, 0xbfeaff, 'Mặt dây bông tuyết', '{ rch: 1, ctl: 0.5, jmp: -0.5 }', 'Đóng băng đường cầu từ xa; nặng nên bật kém.', 'ice'),
 item('ic_back', 'back', 3, 0x9fe0ff, 'Cánh pha lê băng', '{ jmp: 1, sta: 0.5, pow: -0.5 }', 'Lướt trên gió lạnh; mỏng nên thiếu lực.', 'ice'),
 item('ic_racket', 'racket', 3, 0x7fe3ff, 'Vợt băng', '{ ctl: 1, pow: 0.5, sta: -0.5 }', 'Sắc như băng nhọn; lạnh tay nên mau mỏi.', 'ice'),
])
patch('sim.js', [
 ("];\n// outfit sets: wearing 3 pieces", ITEMS + "];\n// outfit sets: wearing 3 pieces"),
 ("{ id: 'fairy', name: 'Tiên bướm', stat: 'jmp' }, { id: 'demon', name: 'Ác quỷ', stat: 'pow' }];",
  "{ id: 'fairy', name: 'Tiên bướm', stat: 'jmp' }, { id: 'demon', name: 'Ác quỷ', stat: 'pow' },\n"
  "  { id: 'football', name: 'Cầu thủ', stat: 'spd' }, { id: 'student', name: 'Học sinh', stat: 'ctl' }, { id: 'thief', name: 'Đạo chích', stat: 'spd' }, { id: 'doctor', name: 'Bác sĩ', stat: 'ctl' },\n"
  "  { id: 'boxer', name: 'Võ sĩ', stat: 'pow' }, { id: 'hunter', name: 'Thợ săn', stat: 'rch' }, { id: 'knight', name: 'Hiệp sĩ', stat: 'sta' }, { id: 'tet', name: 'Tết', stat: 'ctl' },\n"
  "  { id: 'idol', name: 'Thần tượng', stat: 'jmp' }, { id: 'ice', name: 'Băng giá', stat: 'ctl' }];\n"
  "// bonus tiers by the size of the set: [pieces worn, bonus]\n"
  "const SET_TIERS = { 2: [[2, 0.25]], 3: [[2, 0.25], [3, 0.5]], 4: [[2, 0.25], [4, 0.5]], 5: [[3, 0.25], [5, 0.5]], 6: [[3, 0.25], [5, 0.5], [6, 0.75]] };\n"
  "const setSize = (id) => GEAR.filter((g) => g.set === id).length, setTiers = (id) => SET_TIERS[setSize(id)] || [];"),
 ("n: n[s.id], bonus: n[s.id] >= 6 ? 0.75 : n[s.id] >= 5 ? 0.5 : n[s.id] >= 3 ? 0.25 : 0 }));", "n: n[s.id], size: setSize(s.id), bonus: setTiers(s.id).reduce((b, t) => (n[s.id] >= t[0] ? t[1] : b), 0) }));"),
 ("  GEAR, GEAR_SLOTS, GEAR_SETS, setBonus,", "  GEAR, GEAR_SLOTS, GEAR_SETS, setBonus, setTiers, setSize,"),
])
patch('economy.js', [
 ("return ps.length ? Math.ceil(SET_GEMS[ps[0].rar] * miss / ps.length) : 0; };", "return ps.length ? Math.ceil(SET_GEMS[ps[0].rar] * miss / 6) : 0; };   // SET_GEMS is the price of six pieces; smaller sets cost less"),
])
HEAD = r"""  if (kind === 'mirror') {   // doctor's head mirror on a band
    ring(0.5, 0.09, team, 1.04, 0.16);
    const md = mk(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 20), acc, 0.18, 0.6, 0.92, fit, true); md.rotation.set(Math.PI / 2 - 0.55, 0, 0); mk(new THREE.CircleGeometry(0.24, 20), basic(0xeaf6ff), 0.18, 0.62, 0.96, fit).rotation.x = -0.55; mk(new THREE.SphereGeometry(0.05, 8, 6), toon(0x3a4254), 0.18, 0.62, 0.975, fit);
    return gr;
  }
  if (kind === 'pad') {   // boxing head guard: padded cap open on top, cheek pads
    if (!fit.parent) gr.add(fit);
    const pg = new THREE.Group(); pg.rotation.x = -0.2; fit.add(pg);
    mk(new THREE.SphereGeometry(1.08, 28, 8, 0, Math.PI * 2, 0.5, Math.acos(0.16) - 0.5), team, 0, 0, 0, pg, true);
    mk(new THREE.TorusGeometry(0.53, 0.09, 8, 24), acc, 0, 0.94, 0, pg).rotation.x = Math.PI / 2; mk(new THREE.TorusGeometry(1.07, 0.07, 8, 30), acc, 0, 0.18, 0, pg).rotation.x = Math.PI / 2;
    for (const sd of [-1, 1]) mk(new THREE.SphereGeometry(0.34, 12, 10), team, sd * 0.95, -0.12, 0.42, fit, true).scale.set(0.5, 1.1, 0.9);
    return gr;
  }
  if (kind === 'turban') {   // khăn đóng: stacked rolls of cloth, higher at the back
    if (!fit.parent) gr.add(fit);
    const tb = new THREE.Group(); tb.rotation.x = -0.22; fit.add(tb);
    for (let i = 0; i < 4; i++) { const y = 0.36 + i * 0.13, r = Math.sqrt(1 - y * y) * 1.05; mk(new THREE.TorusGeometry(r, 0.09, 8, 30), i === 1 ? acc : team, 0, y, 0, tb, i === 0 || i === 3).rotation.x = Math.PI / 2; }
    mk(new THREE.SphereGeometry(1.0, 20, 6, 0, Math.PI * 2, 0, Math.acos(0.72)), toon(shadeHex(teamColor, -0.2)), 0, 0, 0, tb);
    return gr;
  }
"""
BODY = r"""  // ---- smaller sets: thief, doctor, boxer, knight, Tet, football, student, ice, hunter, idol
  const boxAt = (w, hh, col, x, y, lift) => decal(new THREE.BoxGeometry(w, hh, 0.012), toon(col), x, y, lift);
  if (GI.shirt === 'th_shirt') { const bk = toon(0x23232b); for (const dy of [0.17, 0.09, 0.01, -0.07]) hoop(tc + dy, 0.026, bk); }
  else if (GI.shirt === 'dc_shirt') { boxAt(0.035, 0.1, 0xe0303a, 0.12 * tx * -h, tc + 0.09, 0.006); boxAt(0.1, 0.035, 0xe0303a, 0.12 * tx * -h, tc + 0.09, 0.007); boxAt(0.09, 0.07, 0xdfe5ee, 0.12 * tx * h, tc - 0.04, 0.006); seam(0, cy - 0.04, 0, tc - 0.11, 0.006, toon(0xc9d2e0)); for (const dy of [0.1, 0.03, -0.04]) decal(new THREE.SphereGeometry(0.014, 8, 6), toon(0x9aa5b8), 0.03 * tx, tc + dy, 0.004); }
  else if (GI.shirt === 'kn_shirt') { const dk4 = toon(0x6a7386); hoop(tc + 0.19, 0.016, dk4); hoop(tc - 0.11, 0.022, dk4); boxAt(0.045, 0.19, 0x3f6fd9, 0, tc + 0.04, 0.006); boxAt(0.15, 0.045, 0x3f6fd9, 0, tc + 0.075, 0.007); for (const sd of [-1, 1]) { const sp = U(new THREE.SphereGeometry(0.085, 12, 8), toon(GL.shirt), sd * 0.215 * tx, tc + 0.19, 0); sp.scale.set(1.15, 0.6, 1.15); } }
  else if (GI.shirt === 'tt_shirt') { for (const [x, dy] of [[-0.12, 0.1], [0.13, 0.05], [-0.04, 0.0], [0.08, -0.06], [-0.16, -0.05], [0.2, 0.13], [-0.21, 0.07]]) { decal(new THREE.CircleGeometry(0.034, 16), basic(0xf2c230), x * tx, tc + dy, 0.006); decal(new THREE.PlaneGeometry(0.016, 0.016), basic(0xc22a3a), x * tx, tc + dy, 0.009); }
    seam(-0.02 * tx, cy - 0.03, 0.13 * tx * -h, tc + 0.12, 0.008, gold); for (const k of [0, 1, 2]) decal(new THREE.SphereGeometry(0.016, 8, 6), gold, (0.02 + k * 0.045) * tx * -h, cy - 0.05 - k * 0.045, 0.006); hoop(tc - 0.115, 0.014, gold); }
  else if (GI.shirt === 'fb_shirt') { const wh = toon(0xffffff); for (const x of [-0.19, -0.095, 0, 0.095, 0.19]) seam(x * tx, cy - 0.01 - Math.abs(x) * 0.25, x * tx * 0.95, tc - 0.11, 0.016, wh); hoop(tc + 0.2, 0.014, wh); }
  else if (GI.shirt === 'st_shirt') { boxAt(0.08, 0.075, 0xe6ecf5, 0.12 * tx * h, tc + 0.07, 0.005); boxAt(0.05, 0.05, 0x3f6fd9, 0.12 * tx * h, tc + 0.075, 0.009); seam(0, cy - 0.04, 0, tc - 0.11, 0.006, toon(0xc9d2e0)); for (const dy of [0.09, 0.02, -0.05]) decal(new THREE.SphereGeometry(0.013, 8, 6), toon(0x9aa5b8), 0, tc + dy, 0.006); hoop(tc - 0.115, 0.012, toon(0x3f6fd9)); }
  else if (GI.shirt === 'ic_shirt') { for (const [x, dy, r] of [[-0.11, 0.11, 0.04], [0.11, 0.06, 0.05], [-0.02, -0.02, 0.036], [0.19, -0.04, 0.03], [-0.19, -0.03, 0.036]]) { decal(new THREE.CircleGeometry(r, 6), basic(0xffffff), x * tx, tc + dy, 0.006); decal(new THREE.CircleGeometry(r * 0.45, 6), basic(0x7fe3ff), x * tx, tc + dy, 0.009).rotateZ(Math.PI / 6); } hoop(tc - 0.115, 0.016, toon(0x7fe3ff)); hoop(tc + 0.2, 0.014, toon(0xffffff)); }
  if (GI.back === 'th_back') {   // sack over the shoulder
    BK(new THREE.SphereGeometry(0.17, 14, 12), toon(GL.back), 0.03 * h, tc - 0.01, bz - 0.1, true).scale.set(1, 1.15, 0.85); BK(new THREE.CylinderGeometry(0.03, 0.06, 0.08, 8), toon(GL.back), 0.03 * h, tc + 0.2, bz - 0.09, true); BK(new THREE.TorusGeometry(0.05, 0.012, 5, 14), toon(0x7a5230), 0.03 * h, tc + 0.165, bz - 0.09).rotation.x = Math.PI / 2;
    BK(new THREE.CylinderGeometry(0.045, 0.045, 0.012, 14), gold, 0.03 * h, tc + 0.0, bz - 0.245).rotation.x = Math.PI / 2; strapX(0x7a5230);
  } else if (GI.back === 'kn_back') {   // round shield with a rim and a cross
    const sh2 = BK(new THREE.CylinderGeometry(0.2, 0.2, 0.035, 26), toon(GL.back), 0, tc + 0.04, bz - 0.06, true); sh2.rotation.x = Math.PI / 2;
    BK(new THREE.TorusGeometry(0.2, 0.018, 6, 28), toon(0xc9d2e0), 0, tc + 0.04, bz - 0.07); BK(new THREE.BoxGeometry(0.04, 0.3, 0.012), toon(0xffffff), 0, tc + 0.04, bz - 0.082); BK(new THREE.BoxGeometry(0.3, 0.04, 0.012), toon(0xffffff), 0, tc + 0.06, bz - 0.083); BK(new THREE.SphereGeometry(0.03, 10, 8), gold, 0, tc + 0.06, bz - 0.09); strapX(0x5a3d22);
  } else if (GI.back === 'tt_back') {   // peach-blossom branch
    const br2 = new THREE.Group(); br2.position.set(0.05 * h, tc - 0.05, bz - 0.06); br2.rotation.set(-0.35, 0, -0.45 * h); backG.add(br2);
    add(new THREE.CylinderGeometry(0.01, 0.018, 0.85, 6), toon(0x5a3d22), 0, 0.38, 0, br2); const tw = add(new THREE.CylinderGeometry(0.008, 0.012, 0.3, 5), toon(0x5a3d22), 0.08 * h, 0.52, 0, br2); tw.rotation.z = -0.7 * h; noOL(tw);
    for (const [x, y] of [[0, 0.82], [0.03, 0.66], [-0.03, 0.52], [0.16, 0.62], [0.1, 0.5], [0.02, 0.36], [-0.03, 0.22]]) { noOL(add(new THREE.SphereGeometry(0.045, 8, 6), toon(GL.back), x * h, y, 0, br2)); noOL(add(new THREE.SphereGeometry(0.016, 6, 5), toon(0xffd23f), x * h, y, 0.04, br2)); noOL(add(new THREE.SphereGeometry(0.016, 6, 5), toon(0xffd23f), x * h, y, -0.04, br2)); }
    strapX(0x8a1020);
  } else if (GI.back === 'st_back') {   // school bag
    BK(new THREE.BoxGeometry(0.3, 0.26, 0.12), toon(GL.back), 0, tc + 0.02, bz - 0.07, true); BK(new THREE.BoxGeometry(0.31, 0.11, 0.125), toon(shadeHex(GL.back, -0.25)), 0, tc + 0.1, bz - 0.072); BK(new THREE.BoxGeometry(0.05, 0.05, 0.02), toon(0xffd23f), 0, tc + 0.05, bz - 0.137);
    for (const sd of [-1, 1]) { const stp = BK(new THREE.TorusGeometry(0.272, 0.014, 6, 24), toon(shadeHex(GL.back, -0.3)), sd * 0.105, tc + 0.02, 0); stp.rotation.y = Math.PI / 2; stp.scale.set(tz * 1.02, ty * 0.96, 1); }
  } else if (GI.back === 'ic_back') { for (const sd of [-1, 1]) { const w = fan(GL.back, 0xffffff, sd, 5, 0.6, 0.085, 0.14); w.traverse((o) => { if (o.isMesh) { o.material = basic(o.material.color.getHex(), { transparent: true, opacity: 0.78, depthWrite: false, side: THREE.DoubleSide }); o.renderOrder = 3; } }); } }
  else if (GI.back === 'hu_back') {   // quiver with three arrows
    const qv = new THREE.Group(); qv.position.set(0, tc + 0.03, bz - 0.07); qv.rotation.z = -0.5 * h; backG.add(qv);
    add(new THREE.CylinderGeometry(0.065, 0.05, 0.38, 12), toon(GL.back), 0, 0, 0, qv); noOL(add(new THREE.TorusGeometry(0.066, 0.01, 5, 14), gold, 0, 0.17, 0, qv)).rotation.x = Math.PI / 2;
    for (const [x, z] of [[-0.03, 0], [0.03, 0.01], [0, -0.03]]) { noOL(add(new THREE.CylinderGeometry(0.006, 0.006, 0.26, 5), toon(0xe6d2a8), x, 0.3, z, qv)); noOL(add(new THREE.ConeGeometry(0.03, 0.09, 4), toon(0xd9483b), x, 0.4, z, qv)).scale.z = 0.3; }
    strapX(0x5a3d22);
  }
"""
NECK = r"""  } else if (GI.neck === 'dc_neck') {   // stethoscope
    laceTube(0.012, toon(GL.neck), 0.15); const pb = lace(0, 0.03, 0.15); NK(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 16), toon(0xc9d2e0), pb.x, pb.y - 0.04, pb.z + 0.004, true).rotation.x = Math.PI / 2;
    for (const sd of [-1, 1]) { const q = lace(sd, 0.02, 0.15); NK(new THREE.SphereGeometry(0.02, 8, 6), toon(0xc9d2e0), q.x, q.y + 0.01, q.z); }
  } else if (GI.neck === 'tt_neck') {   // red envelope on a gold cord
    laceTube(0.008, toon(0xf2c230), 0.12); const pb = lace(0, 0.03, 0.12); NK(new THREE.BoxGeometry(0.085, 0.12, 0.016), toon(GL.neck), pb.x, pb.y - 0.06, pb.z + 0.004, true); NK(new THREE.CircleGeometry(0.024, 14), basic(0xf2c230), pb.x, pb.y - 0.065, pb.z + 0.014); NK(new THREE.BoxGeometry(0.085, 0.022, 0.018), toon(0xf2c230), pb.x, pb.y - 0.012, pb.z + 0.005);
  } else if (GI.neck === 'st_neck') {   // red scarf tied in front
    const rd = toon(GL.neck, DS); for (const sd of [-1, 1]) strip(sd * 0.16 * tx, cy - 0.04, 0, cy - 0.12, 0.075, 0.014, rd);
    for (const sd of [-1, 1]) strip(0, cy - 0.12, sd * 0.045, cy - 0.23, 0.05, 0.02, rd); NK(new THREE.SphereGeometry(0.028, 10, 8), toon(shadeHex(GL.neck, -0.2)), 0, cy - 0.12, chestZ(0, cy - 0.12) + 0.03, true);
  } else if (GI.neck === 'ic_neck') {   // snowflake on a silver chain
    laceTube(0.008, toon(0xdfe5ee), 0.13); const pb = lace(0, 0.03, 0.13);
    for (let k = 0; k < 3; k++) { const b = NK(new THREE.BoxGeometry(0.014, 0.13, 0.012), toon(0xffffff), pb.x, pb.y - 0.06, pb.z + 0.004); b.rotation.z = k * Math.PI / 3; } NK(new THREE.OctahedronGeometry(0.028), toon(GL.neck), pb.x, pb.y - 0.06, pb.z + 0.012, true);
"""
patch('game.js', [
 ("  if (kind === 'astro') {   // glass bubble", HEAD + "  if (kind === 'astro') {   // glass bubble"),
 ("pk_head: ['pumpkin', 0x4f8f3a] }[GI.head];", "pk_head: ['pumpkin', 0x4f8f3a], dc_head: ['mirror', 0xc9d2e0], bx_head: ['pad', 0xffffff], tt_head: ['turban', 0xf2c230], kn_head: ['hero', 0xc22a3a], ic_head: ['crown', 0xffffff], hu_head: ['cowboy', 0x5a3d22] }[GI.head];"),
 ("  const headGear = setHead ?", BODY + "  const headGear = setHead ?"),
 ("dn_pants: 'p_pro', po_pants: 'p_pro' }", "dn_pants: 'p_pro', po_pants: 'p_pro', bx_pants: 'p_pro', fb_pants: 'p_light' }"),
 ("fa_shoes: 's_run', pk_shoes: 's_run' }", "fa_shoes: 's_run', pk_shoes: 's_run', kn_shoes: 's_pro', fb_shoes: 's_run' }"),
 ("dm_racket: ['r_pro', 'horns', 0xffb84d] })[GI.racket];", "dm_racket: ['r_pro', 'horns', 0xffb84d], kn_racket: ['r_pro', 'guard', 0x3f6fd9], ic_racket: ['r_light', 'gem', 0xffffff] })[GI.racket];"),
 # wrist and face items of sets reuse the basic shapes in their own colour
 ("    if (GI.wrist === 'w_band') {", "    const WK = ({ dc_wrist: 'w_band', bx_wrist: 'w_weight', hu_wrist: 'w_pro' })[GI.wrist] || GI.wrist;\n    if (WK === 'w_band') {"),
 ("    } else if (GI.wrist === 'w_weight') {", "    } else if (WK === 'w_weight') {"),
 ("    } else if (GI.wrist === 'w_pro') {", "    } else if (WK === 'w_pro') {"),
 ("    const kind = GI.face, exA = Math.abs(eyeAt[0][0]) * fx, gy = eyeAt[0][1] * fy, gz = eyeAt[0][2] * fz + (GI.face === 'e_sport' ? 0.05 : GI.face === 'e_shade' ? 0.042 : 0.036);",
  "    const kind = ({ st_face: 'e_pro', id_face: 'e_shade', th_face: 'e_sport' })[GI.face] || GI.face, ownCol = kind !== GI.face, exA = Math.abs(eyeAt[0][0]) * fx, gy = eyeAt[0][1] * fy, gz = eyeAt[0][2] * fz + (kind === 'e_sport' ? 0.05 : kind === 'e_shade' ? 0.042 : 0.036);"),
 ("    const frameM = toon(kind === 'e_sport' ? GL.face : kind === 'e_shade' ? 0x1d1f27 : 0xf2c230);", "    const frameM = toon(ownCol || kind === 'e_sport' ? GL.face : kind === 'e_shade' ? 0x1d1f27 : 0xf2c230);"),
 ("      const ln = FG(new THREE.CircleGeometry(R, 24), lensM, 0, 0, 0.002, lg); ln.scale.set(sx, sy, 1); ln.renderOrder = 2;\n      const sh = FG(", "      if (GI.face === 'th_face') { /* a mask: eye holes, no lenses */ } else {\n      const ln = FG(new THREE.CircleGeometry(R, 24), lensM, 0, 0, 0.002, lg); ln.scale.set(sx, sy, 1); ln.renderOrder = 2;\n      const sh = FG("),
 ("sh.rotation.z = 0.62; sh.renderOrder = 3;\n", "sh.rotation.z = 0.62; sh.renderOrder = 3; }\n"),
 ("  } else if (GI.neck === 'n_bow') {", NECK + "  } else if (GI.neck === 'n_bow' || GI.neck === 'id_neck') {"),
 ("<small>${STAT_NAMES[st.stat]}: mặc 3 món +0.25 · 5 món +0.5 · đủ ${ps.length} món +0.75</small>", "<small>${STAT_NAMES[st.stat]}: ${S.setTiers(st.id).map((t) => 'mặc ' + t[0] + ' món +' + t[1]).join(' · ')}</small>"),
 ("Bộ <b>${esc(b.name)}</b> ${b.n}/6 ·", "Bộ <b>${esc(b.name)}</b> ${b.n}/${b.size} ·"),
 ("'mặc 3 món để được cộng ' + STAT_NAMES[b.stat]", "'mặc ' + S.setTiers(b.id)[0][0] + ' món để được cộng ' + STAT_NAMES[b.stat]"),
])
patch('tests/economy-regression.js', [
 ("assert.equal(S.GEAR.length, 162); assert.equal(new Set(S.GEAR.map((g) => g.id)).size, 162);", "assert.equal(S.GEAR.length, 198); assert.equal(new Set(S.GEAR.map((g) => g.id)).size, 198);"),
 ("assert.equal(S.GEAR_SETS.length, 22);", "assert.equal(S.GEAR_SETS.length, 32);"),
 ("assert.equal(ps.length, 6); assert.equal(new Set(ps.map((g) => g.slot)).size, 6);", "assert(ps.length >= 2 && ps.length <= 6, st.id); assert.equal(new Set(ps.map((g) => g.slot)).size, ps.length); assert(S.setTiers(st.id).length >= 1 && S.setTiers(st.id).slice(-1)[0][0] === ps.length, 'the top tier needs the whole set');"),
])
patch('tests/chest-regression.js', [
 ("assert(!E.buySet(p, 'ninja', T0).ok, 'already complete');", "assert(!E.buySet(p, 'ninja', T0).ok, 'already complete'); assert.equal(E.setPrice({ items: [] }, 'idol'), Math.ceil(380 * 2 / 6)); assert.deepEqual(S.setBonus(['id_face', 'id_neck']).map((b) => [b.n, b.size, b.bonus]), [[2, 2, 0.25]]); assert.equal(S.setBonus(['th_face', 'th_shirt', 'th_back'])[0].bonus, 0.5);"),
])
print('ok')
