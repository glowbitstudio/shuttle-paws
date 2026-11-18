# One-off patch: four more outfit sets (wizard, cowboy, winter, chef) -> 10 sets, 80 items.
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
    return "  { id: '%s', slot: '%s', set: '%s', rar: %d, price: %d, col: 0x%06x, name: '%s', mods: %s, desc: '%s' },\n" % (id, slot, st, rar, [300, 900, 2200][rar], col, name, mods, desc)
ITEMS = ''.join([
 item('wn_head', 'head', 0, 0xd9483b, 'Mũ len', '{ ctl: 0.75, jmp: -0.5 }', 'Ấm đầu, tỉnh táo; dày nên ngại bật cao.', 'winter'),
 item('wn_shirt', 'shirt', 0, 0x2f8f6a, 'Áo len', '{ sta: 0.75, spd: -0.5 }', 'Ấm người, bền sức; dày nên chạy chậm.', 'winter'),
 item('wn_pants', 'shorts', 0, 0x4a5578, 'Quần nỉ', '{ ctl: 0.75, pow: -0.5 }', 'Ôm chân, bước chuẩn; mềm nên thiếu lực trụ.', 'winter'),
 item('wn_shoes', 'shoes', 0, 0xffffff, 'Giày tuyết', '{ jmp: 0.75, spd: -0.5 }', 'Đế dày nảy tốt; nặng nên chậm chân.', 'winter'),
 item('wn_back', 'back', 0, 0x4fb8e8, 'Ván trượt tuyết', '{ spd: 0.75, ctl: -0.5 }', 'Máu tốc độ; vướng lưng nên kém khéo.', 'winter'),
 item('cb_head', 'head', 1, 0x9a6a3a, 'Mũ cao bồi', '{ rch: 1, jmp: -0.5 }', 'Mắt tinh, với xa; vành to nên ngại bật.', 'cowboy'),
 item('cb_shirt', 'shirt', 1, 0xc94f3a, 'Áo ghi-lê', '{ sta: 0.5, pow: 0.5, ctl: -0.5 }', 'Dẻo dai và khỏe; phóng khoáng nên kém tỉ mỉ.', 'cowboy'),
 item('cb_pants', 'shorts', 1, 0x3f6fd9, 'Quần bò', '{ sta: 1, jmp: -0.5 }', 'Bền bỉ; vải cứng nên khó bật.', 'cowboy'),
 item('cb_shoes', 'shoes', 1, 0x7a5230, 'Bốt cao bồi', '{ pow: 1, spd: -0.5 }', 'Trụ chắc, đập mạnh; gót cao nên chạy chậm.', 'cowboy'),
 item('cb_back', 'back', 1, 0xd9b36a, 'Cuộn dây thừng', '{ rch: 1, pow: -0.5 }', 'Quăng dây quen tay nên với xa; nhẹ tay khi đập.', 'cowboy'),
 item('ch_head', 'head', 1, 0xffffff, 'Mũ đầu bếp', '{ ctl: 1, spd: -0.5 }', 'Tỉ mỉ từng li; mũ cao nên chậm chân.', 'chef'),
 item('ch_shirt', 'shirt', 1, 0xffffff, 'Áo bếp', '{ ctl: 0.5, sta: 0.5, pow: -0.5 }', 'Khéo tay và quen đứng lâu; không quen đập mạnh.', 'chef'),
 item('ch_pants', 'shorts', 1, 0x3a3a46, 'Quần ca rô', '{ sta: 1, jmp: -0.5 }', 'Đứng bếp cả ngày không mỏi; rộng nên khó bật.', 'chef'),
 item('ch_shoes', 'shoes', 1, 0x2b2f45, 'Giày bếp', '{ ctl: 1, jmp: -0.5 }', 'Chống trượt, đứng vững; đế bẹt nên bật kém.', 'chef'),
 item('ch_back', 'back', 1, 0x3a3a46, 'Chảo rán', '{ pow: 1, spd: -0.5 }', 'Vung chảo quen tay nên đập mạnh; nặng lưng.', 'chef'),
 item('wz_head', 'head', 2, 0x4b2a9a, 'Mũ phù thủy', '{ rch: 1, ctl: 0.25, jmp: -0.5 }', 'Đoán trước đường cầu; mũ cao nên ngại bật.', 'wizard'),
 item('wz_shirt', 'shirt', 2, 0x4b2a9a, 'Áo sao đêm', '{ ctl: 1, rch: 0.25, pow: -0.5 }', 'Điều cầu như có phép; không hợp đập lực.', 'wizard'),
 item('wz_pants', 'shorts', 2, 0x2f2466, 'Quần pháp sư', '{ sta: 1, ctl: 0.25, spd: -0.5 }', 'Thong thả, bền sức; rộng nên chậm chân.', 'wizard'),
 item('wz_shoes', 'shoes', 2, 0x7a4fd6, 'Giày mũi cong', '{ rch: 1, jmp: 0.25, spd: -0.5 }', 'Bước dài kỳ lạ; mũi cong nên chạy chậm.', 'wizard'),
 item('wz_back', 'back', 2, 0x6a3fd0, 'Áo choàng tím', '{ ctl: 1, sta: 0.25, jmp: -0.5 }', 'Bình tĩnh tuyệt đối; áo dài nên khó bật.', 'wizard'),
])
patch('sim.js', [
 ("];\n// outfit sets: wearing 3 pieces", ITEMS + "];\n// outfit sets: wearing 3 pieces"),
 ("{ id: 'royal', name: 'Hoàng gia', stat: 'ctl' }, { id: 'hero', name: 'Siêu nhân', stat: 'pow' }];",
  "{ id: 'royal', name: 'Hoàng gia', stat: 'ctl' }, { id: 'hero', name: 'Siêu nhân', stat: 'pow' },\n  { id: 'winter', name: 'Mùa đông', stat: 'ctl' }, { id: 'cowboy', name: 'Cao bồi', stat: 'rch' }, { id: 'chef', name: 'Đầu bếp', stat: 'ctl' }, { id: 'wizard', name: 'Pháp sư', stat: 'rch' }];"),
])
HEAD = r"""  if (kind === 'wizard' || kind === 'cowboy' || kind === 'chef') {   // tall hats standing on the crown of the head
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
"""
BODY = r"""  // ---- more sets: wizard, cowboy, winter, chef
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
"""
patch('game.js', [
 ("  if (kind === 'astro') {   // glass bubble", HEAD + "  if (kind === 'astro') {   // glass bubble"),
 ("hr_head: ['hero', 0xffd23f] }[GI.head];", "hr_head: ['hero', 0xffd23f], wz_head: ['wizard', 0xf2c230], cb_head: ['cowboy', 0x3a2a1a], wn_head: ['beanie', 0xffffff], ch_head: ['chef', 0xdfe5ee] }[GI.head];"),
 ("  const headGear = setHead ?", BODY + "  const headGear = setHead ?"),
 ("ry_pants: 'p_pro', as_pants: 'p_pro', pr_pants: 'p_pro' }", "ry_pants: 'p_pro', as_pants: 'p_pro', pr_pants: 'p_pro', wz_pants: 'p_pro', cb_pants: 'p_pro', ch_pants: 'p_pro', wn_pants: 'p_flex' }"),
 ("ry_shoes: 's_pro', hr_shoes: 's_pro' }", "ry_shoes: 's_pro', hr_shoes: 's_pro', cb_shoes: 's_pro', wz_shoes: 's_run', ch_shoes: 's_run', wn_shoes: 's_spring' }"),
])
patch('tests/economy-regression.js', [
 ("assert.equal(S.GEAR.length, 60); assert.equal(new Set(S.GEAR.map((g) => g.id)).size, 60);", "assert.equal(S.GEAR.length, 80); assert.equal(new Set(S.GEAR.map((g) => g.id)).size, 80);"),
 ("assert.equal(S.GEAR_SETS.length, 6);", "assert.equal(S.GEAR_SETS.length, 10);"),
])
patch('tests/gear-all-chars.py', [("SETS=['bc','nj','pr','as','ry','hr']", "SETS=(os.environ.get('SETS') or 'bc,nj,pr,as,ry,hr').split(',')"), ("import sys,io\n", "import sys,io,os\n")])
print('ok')
