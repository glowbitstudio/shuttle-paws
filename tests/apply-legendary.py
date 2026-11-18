# One-off patch: fourth rarity "Huyền thoại", upgrade levels 3 -> 5, a legendary chest, six more outfit sets (diver, rock, detective, robot, angel, samurai): 16 sets, 110 items.
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
 item('dv_head', 'head', 0, 0x23b5c9, 'Kính lặn ống thở', '{ sta: 0.75, ctl: -0.5 }', 'Thở đều, bền sức; kính trên trán hơi vướng.', 'diver'),
 item('dv_shirt', 'shirt', 0, 0x1f4f6a, 'Áo lặn', '{ spd: 0.75, pow: -0.5 }', 'Trơn như cá, lướt nhanh; bó nên thiếu lực.', 'diver'),
 item('dv_pants', 'shorts', 0, 0x1f4f6a, 'Quần lặn', '{ sta: 0.75, jmp: -0.5 }', 'Giữ ấm cơ, đỡ mỏi; bó nên khó bật.', 'diver'),
 item('dv_shoes', 'shoes', 0, 0xffd23f, 'Giày lội nước', '{ ctl: 0.75, spd: -0.5 }', 'Bám sàn ướt; đế dẻo nên chạy chậm.', 'diver'),
 item('dv_back', 'back', 0, 0xffc531, 'Bình dưỡng khí', '{ sta: 0.75, spd: -0.5 }', 'Không bao giờ hụt hơi; nặng lưng.', 'diver'),
 item('rk_head', 'head', 1, 0xff3d9a, 'Tóc mào gà', '{ pow: 1, ctl: -0.5 }', 'Máu lửa, đập mạnh; bốc quá nên kém chuẩn.', 'rock'),
 item('rk_shirt', 'shirt', 1, 0x23232b, 'Áo da đinh tán', '{ pow: 0.5, spd: 0.5, sta: -0.5 }', 'Ngầu và khỏe; da dày nên mau nóng người.', 'rock'),
 item('rk_pants', 'shorts', 1, 0x2b2f45, 'Quần bó rách gối', '{ spd: 1, jmp: -0.5 }', 'Chạy như trên sân khấu; bó nên khó bật.', 'rock'),
 item('rk_shoes', 'shoes', 1, 0x23232b, 'Bốt đế dày', '{ pow: 1, spd: -0.5 }', 'Dậm chân là rung sân; nặng nên chậm.', 'rock'),
 item('rk_back', 'back', 1, 0xd9483b, 'Đàn ghi-ta điện', '{ pow: 1, jmp: -0.5 }', 'Vung vợt như vung đàn; vướng nên khó bật.', 'rock'),
 item('dt_head', 'head', 1, 0x9a7a4a, 'Mũ thám tử', '{ ctl: 1, pow: -0.5 }', 'Quan sát tinh tường, đặt cầu chuẩn; nhẹ tay.', 'detective'),
 item('dt_shirt', 'shirt', 1, 0xc9a66b, 'Áo măng tô', '{ rch: 0.5, ctl: 0.5, spd: -0.5 }', 'Điềm đạm, với xa; áo dài nên chậm chân.', 'detective'),
 item('dt_pants', 'shorts', 1, 0x5a4a3a, 'Quần tây', '{ ctl: 1, jmp: -0.5 }', 'Bước chuẩn từng li; cứng nên khó bật.', 'detective'),
 item('dt_shoes', 'shoes', 1, 0x3a2a1a, 'Giày da êm', '{ spd: 1, pow: -0.5 }', 'Đi không tiếng động, nhanh; đế mỏng nên trụ yếu.', 'detective'),
 item('dt_back', 'back', 1, 0xf2c230, 'Kính lúp', '{ rch: 1, sta: -0.5 }', 'Soi ra đường cầu từ xa; căng mắt nên mau mệt.', 'detective'),
 item('rb_head', 'head', 2, 0x9aa5b8, 'Mũ rô-bốt', '{ ctl: 1, sta: 0.25, jmp: -0.5 }', 'Tính toán chính xác; nặng đầu nên khó bật.', 'robot'),
 item('rb_shirt', 'shirt', 2, 0x8a93a6, 'Giáp rô-bốt', '{ sta: 1, pow: 0.25, spd: -0.5 }', 'Pin trâu, không biết mệt; nặng nên chậm.', 'robot'),
 item('rb_pants', 'shorts', 2, 0x6a7386, 'Chân máy', '{ pow: 1, sta: 0.25, jmp: -0.5 }', 'Trụ vững như cột thép; khớp cứng nên khó bật.', 'robot'),
 item('rb_shoes', 'shoes', 2, 0x5a6478, 'Giày lò xo máy', '{ jmp: 1, pow: 0.25, ctl: -0.5 }', 'Bật bằng pít-tông; mạnh quá nên khó kiểm soát.', 'robot'),
 item('rb_back', 'back', 2, 0x4a5568, 'Khối pin', '{ sta: 1, spd: 0.25, ctl: -0.5 }', 'Sạc đầy năng lượng; rung nên kém khéo.', 'robot'),
 item('an_head', 'head', 3, 0xffe18a, 'Vòng hào quang', '{ ctl: 1, rch: 0.5, pow: -0.5 }', 'Tâm tĩnh như nước, thấy trước mọi đường cầu; không nỡ đập mạnh.', 'angel'),
 item('an_shirt', 'shirt', 3, 0xfffaf0, 'Áo thiên sứ', '{ sta: 1, ctl: 0.5, pow: -0.5 }', 'Nhẹ như mây, không biết mệt; hiền nên đập nhẹ.', 'angel'),
 item('an_pants', 'shorts', 3, 0xfffaf0, 'Quần mây', '{ jmp: 1, sta: 0.5, spd: -0.5 }', 'Bật lên như bay; lơ lửng nên chạy chậm.', 'angel'),
 item('an_shoes', 'shoes', 3, 0xffe18a, 'Giày ánh sáng', '{ spd: 1, jmp: 0.5, pow: -0.5 }', 'Lướt như tia sáng; nhẹ quá nên trụ yếu.', 'angel'),
 item('an_back', 'back', 3, 0xffffff, 'Đôi cánh thiên thần', '{ jmp: 1, rch: 0.5, ctl: -0.5 }', 'Bay lên đón cầu; sải cánh rộng nên khó tinh tế.', 'angel'),
 item('sm_head', 'head', 3, 0x8a1f2a, 'Mũ trụ samurai', '{ pow: 1, ctl: 0.5, spd: -0.5 }', 'Một nhát quyết định; mũ nặng nên chậm chân.', 'samurai'),
 item('sm_shirt', 'shirt', 3, 0xa3242f, 'Giáp samurai', '{ pow: 1, sta: 0.5, jmp: -0.5 }', 'Vững như thành; giáp nặng nên khó bật.', 'samurai'),
 item('sm_pants', 'shorts', 3, 0x2a2440, 'Quần hakama', '{ ctl: 1, pow: 0.5, spd: -0.5 }', 'Bước chân kiếm sĩ, chuẩn và chắc; rộng nên chậm.', 'samurai'),
 item('sm_shoes', 'shoes', 3, 0xd9b36a, 'Dép rơm', '{ spd: 1, ctl: 0.5, jmp: -0.5 }', 'Áp sát cực nhanh; đế phẳng nên bật kém.', 'samurai'),
 item('sm_back', 'back', 3, 0xc22a3a, 'Cờ hiệu', '{ pow: 1, rch: 0.5, sta: -0.5 }', 'Khí thế ra trận; vác cờ nên mau mệt.', 'samurai'),
])
patch('sim.js', [
 ("const GEAR_RARITY = ['Thường', 'Hiếm', 'Sử thi'];", "const GEAR_RARITY = ['Thường', 'Hiếm', 'Sử thi', 'Huyền thoại'];   // net value of an item: +0.25 / +0.5 / +0.75 / +1"),
 ("const GEAR_MAX_LV = 3,", "const GEAR_MAX_LV = 5,"),
 ("];\n// outfit sets: wearing 3 pieces", ITEMS + "];\n// outfit sets: wearing 3 pieces"),
 ("{ id: 'chef', name: 'Đầu bếp', stat: 'ctl' }, { id: 'wizard', name: 'Pháp sư', stat: 'rch' }];",
  "{ id: 'chef', name: 'Đầu bếp', stat: 'ctl' }, { id: 'wizard', name: 'Pháp sư', stat: 'rch' },\n  { id: 'diver', name: 'Thợ lặn', stat: 'sta' }, { id: 'rock', name: 'Rock', stat: 'pow' }, { id: 'detective', name: 'Thám tử', stat: 'ctl' }, { id: 'robot', name: 'Rô-bốt', stat: 'sta' },\n  { id: 'angel', name: 'Thiên thần', stat: 'jmp' }, { id: 'samurai', name: 'Samurai', stat: 'pow' }];"),
])
patch('economy.js', [
 ("const DUP_SHARDS = [5, 15, 40], CRAFT_COST = [20, 60, 150], UP_COST = [[8, 20, 40], [16, 40, 80], [32, 80, 160]];",
  "const DUP_SHARDS = [5, 15, 40, 100], CRAFT_COST = [20, 60, 150, 400], UP_COST = [1, 2, 4, 8].map((k) => [8, 20, 40, 70, 110].map((c) => c * k));"),
 ("const SET_GEMS = [60, 150, 320];", "const SET_GEMS = [60, 150, 320, 700];"),
 ("  { id: 'c0', name: 'Rương Thường', gold: 250, gems: 0, odds: [78, 20, 2] },\n  { id: 'c1', name: 'Rương Hiếm', gold: 900, gems: 10, odds: [0, 78, 22] },\n  { id: 'c2', name: 'Rương Sử thi', gold: 0, gems: 30, odds: [0, 0, 100] },\n",
  "  { id: 'c0', name: 'Rương Thường', gold: 250, gems: 0, odds: [78, 20, 2, 0] },\n  { id: 'c1', name: 'Rương Hiếm', gold: 900, gems: 10, odds: [0, 76, 22, 2] },\n  { id: 'c2', name: 'Rương Sử thi', gold: 0, gems: 30, odds: [0, 0, 88, 12] },\n  { id: 'c3', name: 'Rương Huyền thoại', gold: 0, gems: 90, odds: [0, 0, 40, 60] },\n"),
 ("  const r = R() * 100, rar = r < c.odds[0] ? 0 : r < c.odds[0] + c.odds[1] ? 1 : 2;", "  let r = R() * 100, rar = c.odds.length - 1; for (let k = 0; k < c.odds.length; k++) { if (r < c.odds[k]) { rar = k; break; } r -= c.odds[k]; }"),
])
HEAD = r"""  if (kind === 'diver') {   // dive mask pushed up on the brow, snorkel at the side
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
    for (let i = 0; i < 7; i++) { const a = -0.75 + i * 0.36, sp = mk(new THREE.ConeGeometry(0.2, 0.62 - Math.abs(i - 2.5) * 0.045, 5), i % 2 ? acc : team, 0, Math.cos(a) * 1.18, -Math.sin(a) * 1.18 + 0.0, fit, true); sp.rotation.x = -a; sp.scale.x = 0.55; }
    return gr;
  }
  if (kind === 'deer') {   // deerstalker: cap with a peak in front and behind, ear flaps tied on top
    if (!fit.parent) gr.add(fit);
    const dc = new THREE.Group(); dc.rotation.x = -0.18; fit.add(dc); const dk = toon(shadeHex(teamColor, -0.25), { side: THREE.DoubleSide });
    mk(new THREE.SphereGeometry(1.06, 28, 10, 0, Math.PI * 2, 0, Math.acos(0.3)), team, 0, 0, 0, dc, true);
    for (const sd of [1, -1]) { const br = mk(new THREE.CylinderGeometry(0.8, 0.8, 0.1, 24, 1, false, -0.9, 1.8), dk, 0, 0.4, sd * 0.42, dc, true); br.rotation.set(sd * 0.22, sd > 0 ? 0 : Math.PI, 0); }
    for (const sd of [-1, 1]) { const fl = mk(new THREE.SphereGeometry(0.4, 12, 8), dk, sd * 0.5, 0.92, 0, dc, true); fl.scale.set(1.3, 0.3, 0.75); fl.rotation.z = -sd * 0.55; }
    mk(new THREE.SphereGeometry(0.1, 8, 6), acc, 0, 1.12, 0, dc);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; mk(new THREE.CylinderGeometry(0.012, 0.012, 0.9, 4), acc, Math.sin(a) * 0.72, 0.7, Math.cos(a) * 0.72, dc).rotation.set(Math.cos(a) * 0.75, 0, -Math.sin(a) * 0.75); }
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
"""
BODY = r"""  // ---- sets: diver, rock, detective, robot, angel, samurai
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
    BK(new THREE.CylinderGeometry(0.013, 0.013, 0.78, 6), toon(0x3a2a1a), 0.06 * h, tc + 0.3, bz - 0.05, true);
    const fl = BK(new THREE.BoxGeometry(0.2, 0.42, 0.012), toon(GL.back, DS), 0.06 * h - 0.11 * h, tc + 0.45, bz - 0.05, true); BK(new THREE.CircleGeometry(0.06, 16), basic(0xf2c230, DS), -0.05 * h, tc + 0.5, bz - 0.058); BK(new THREE.BoxGeometry(0.2, 0.03, 0.014), toon(0xffffff), -0.05 * h, tc + 0.3, bz - 0.05);
    BK(new THREE.SphereGeometry(0.028, 8, 6), gold, 0.06 * h, tc + 0.7, bz - 0.05); strapX(0x2a2440);
  }
"""
patch('game.js', [
 ("  if (kind === 'astro') {   // glass bubble", HEAD + "  if (kind === 'astro') {   // glass bubble"),
 ("ch_head: ['chef', 0xdfe5ee] }[GI.head];", "ch_head: ['chef', 0xdfe5ee], dv_head: ['diver', 0xff8a3d], rk_head: ['mohawk', 0x7dff9a], dt_head: ['deer', 0x5a3d22], rb_head: ['robot', 0xffd23f], an_head: ['halo', 0xffe18a], sm_head: ['kabuto', 0xf2c230] }[GI.head];"),
 ("  const headGear = setHead ?", BODY + "  const headGear = setHead ?"),
 ("ch_pants: 'p_pro', wn_pants: 'p_flex' }", "ch_pants: 'p_pro', wn_pants: 'p_flex', dv_pants: 'p_flex', rk_pants: 'p_flex', dt_pants: 'p_pro', rb_pants: 'p_pro', an_pants: 'p_pro', sm_pants: 'p_pro' }"),
 ("ch_shoes: 's_run', wn_shoes: 's_spring' }", "ch_shoes: 's_run', wn_shoes: 's_spring', dv_shoes: 's_run', rk_shoes: 's_pro', dt_shoes: 's_run', rb_shoes: 's_spring', an_shoes: 's_run', sm_shoes: 's_run' }"),
])
patch('style.css', [
 (".r2{--rar:#d79bff;--rar-bg:linear-gradient(180deg,#a45fe0,#5d2ea3)}", ".r2{--rar:#d79bff;--rar-bg:linear-gradient(180deg,#a45fe0,#5d2ea3)}\n.r3{--rar:#ffb84d;--rar-bg:linear-gradient(180deg,#f0a030,#a8480f)}.wd-item.r3,.gear-item.r3,.wd-card.r3{box-shadow:0 0 14px rgba(255,184,77,.55),0 4px 0 rgba(0,0,0,.3)}"),
 (".chest.t2{", ".chest.t3{--c1:#ffd76a;--c2:#e08a1a;--c3:#fff;box-shadow:0 0 20px rgba(255,200,80,.95),0 4px 0 rgba(0,0,0,.3)}.chest.t2{"),
])
patch('tests/economy-regression.js', [
 ("assert.equal(S.GEAR.length, 80); assert.equal(new Set(S.GEAR.map((g) => g.id)).size, 80);", "assert.equal(S.GEAR.length, 110); assert.equal(new Set(S.GEAR.map((g) => g.id)).size, 110);"),
 ("assert.deepEqual([...new Set(S.GEAR.filter((g) => g.slot === slot).map((g) => g.rar))].sort(), [0, 1, 2], slot);", "assert.deepEqual([...new Set(S.GEAR.filter((g) => g.slot === slot).map((g) => g.rar))].sort().slice(0, 3), [0, 1, 2], slot);"),
 ("[0.25, 0.5, 0.75][g.rar]", "[0.25, 0.5, 0.75, 1][g.rar]"),
 ("assert.equal(S.GEAR_SETS.length, 10);", "assert.equal(S.GEAR_SETS.length, 16);"),
])
patch('tests/chest-regression.js', [
 ("assert.equal(E.view(p, T0).chests.length, 3);", "assert.equal(E.view(p, T0).chests.length, 4);"),
 ("  const c = E.CHESTS.find((x) => x.id === id), n = [0, 0, 0], rnd = lcg(77);", "  const c = E.CHESTS.find((x) => x.id === id), n = [0, 0, 0, 0], rnd = lcg(77);"),
 ("  for (let k = 0; k < 3; k++) assert(Math.abs(n[k] / N * 100 - c.odds[k]) < 3,", "  for (let k = 0; k < 4; k++) assert(Math.abs(n[k] / N * 100 - c.odds[k]) < 3,"),
 ("p.eco.shards = 16 + 40 + 80 + 5; E.equip(p, 'head', 'nj_head', T0);\n  for (let l = 1; l <= 3; l++)", "p.eco.shards = E.UP_COST[1].reduce((a, b) => a + b, 0) + 5; E.equip(p, 'head', 'nj_head', T0); assert.equal(S.GEAR_MAX_LV, 5); assert.deepEqual(E.UP_COST[1], [16, 40, 80, 140, 220]);\n  for (let l = 1; l <= 5; l++)"),
 ("assert.deepEqual(E.equipped(p, T0), ['nj_head+3']); assert.equal(S.gearMods(['nj_head+3']).spd, 1.3); assert.equal(S.gearMods(['nj_head']).spd, 1); assert.equal(S.gearMods(['nj_head+9']).spd, 1.3, 'level is capped');",
  "assert.deepEqual(E.equipped(p, T0), ['nj_head+5']); assert.equal(S.gearMods(['nj_head+3']).spd, 1.3); assert.equal(S.gearMods(['nj_head']).spd, 1); assert.equal(S.gearMods(['nj_head+9']).spd, 1.5, 'level is capped');"),
 ("assert(v.rules && v.rules.setGems.length === 3 &&", "assert(v.rules && v.rules.setGems.length === 4 && E.setPrice(P().eco || (E.ensure(p, T0), { items: [] }), 'angel') === 700 &&"),
])
print('ok')
