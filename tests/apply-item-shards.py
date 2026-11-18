# One-off patch: shards belong to an item. A duplicate from a chest gives shards of THAT item, which upgrade that item; the shared
# shards become "universal shards" (bought in packs) that fill in for missing item shards and craft set pieces.
from pathlib import Path
import os; os.chdir(Path(__file__).resolve().parents[1])
def patch(name, pairs, cuts=()):
    s = open(name, encoding='utf-8', newline='').read()
    for a, b, new in cuts:
        i = s.index(a); j = s.index(b, i) + len(b); s = s[:i] + new + s[j:]
    for old, new in pairs:
        for eol in ('\n', '\r\n'):
            o = old.replace('\n', eol)
            if s.count(o) == 1: s = s.replace(o, new.replace('\n', eol)); break
        else: raise AssertionError((name, old[:80]))
    open(name, 'w', encoding='utf-8', newline='').write(s)
patch('economy.js', [
 ("const DUP_SHARDS = [5, 15, 40, 100], CRAFT_COST = [20, 60, 150, 400], UP_COST = [1, 2, 4, 8].map((k) => [8, 20, 40, 70, 110].map((c) => c * k));",
  "// Item shards (e.sh[id]): a duplicate from a chest gives DUP_SHARDS shards of that very item; they upgrade that item (UP_SP per level).\n"
  "// Universal shards (e.shards, from packs) stand in for missing item shards at UNI_RATE universal per item shard (by rarity) and craft set pieces.\n"
  "const DUP_SHARDS = [10, 10, 10, 10], UP_SP = [10, 20, 30, 50, 80], UNI_RATE = [1, 2, 4, 8], CRAFT_COST = [20, 60, 150, 400];"),
 ("  if (dup) e.shards += shards; else e.items.push(g.id);", "  if (dup) e.sh[g.id] = (e.sh[g.id] || 0) + shards; else e.items.push(g.id);"),
 ("  if (!e.lv) e.lv = {};\n", "  if (!e.lv) e.lv = {};\n  if (!e.sh) e.sh = {};\n"),
 ("shards: e.shards, lv: Object.assign({}, e.lv), rules: { dup: DUP_SHARDS, craft: CRAFT_COST, up: UP_COST, setGems: SET_GEMS, packs: SHARD_PACKS },",
  "shards: e.shards, sh: Object.assign({}, e.sh), lv: Object.assign({}, e.lv), rules: { dup: DUP_SHARDS, craft: CRAFT_COST, upSp: UP_SP, uniRate: UNI_RATE, setGems: SET_GEMS, packs: SHARD_PACKS },"),
 ("  const cost = UP_COST[g.rar][lv]; if (e.shards < cost) return { ok: false, why: 'Chưa đủ mảnh (thiếu ' + (cost - e.shards) + ')' };\n  e.shards -= cost; e.lv[g.id] = lv + 1;\n  return { ok: true, item: g.id, lv: lv + 1, spent: cost, why: g.name + ' lên cấp ' + (lv + 1) };",
  "  const need = UP_SP[lv], own = Math.min(need, e.sh[g.id] || 0), uni = (need - own) * UNI_RATE[g.rar];   // its own shards first, universal ones for the rest\n"
  "  if (e.shards < uni) return { ok: false, why: 'Chưa đủ mảnh: cần thêm ' + (need - own) + ' mảnh ' + g.name + ' hoặc ' + uni + ' mảnh vạn năng (đang có ' + e.shards + ')' };\n"
  "  if (own) e.sh[g.id] -= own; e.shards -= uni; e.lv[g.id] = lv + 1;\n"
  "  return { ok: true, item: g.id, lv: lv + 1, own, uni, why: g.name + ' lên cấp ' + (lv + 1) };"),
 ("  const cost = CRAFT_COST[g.rar]; if (e.shards < cost) return { ok: false, why: 'Chưa đủ mảnh (thiếu ' + (cost - e.shards) + ')' };", "  const cost = CRAFT_COST[g.rar]; if (e.shards < cost) return { ok: false, why: 'Chưa đủ mảnh vạn năng (thiếu ' + (cost - e.shards) + ')' };"),
 ("  return { ok: true, shards: k.shards, why: '+' + k.shards + ' mảnh' };", "  return { ok: true, shards: k.shards, why: '+' + k.shards + ' mảnh vạn năng' };"),
 ("DUP_SHARDS, CRAFT_COST, UP_COST, SET_GEMS,", "DUP_SHARDS, CRAFT_COST, UP_SP, UNI_RATE, SET_GEMS,"),
])
UP = r"""    { const lv = (wallet.lv || {})[pick.id] || 0, R = wallet.rules || {}, need = (R.upSp || [10, 20, 30, 50, 80])[lv], have = (wallet.sh || {})[pick.id] || 0, own = Math.min(need || 0, have), uni = ((need || 0) - own) * ((R.uniRate || [1, 2, 4, 8])[pick.rar]), sh = wallet.shards || 0;
      $('wdAct').insertAdjacentHTML('afterend', `<div class="wd-up"><span>Cấp <b>${lv}</b>/${S.GEAR_MAX_LV}${lv ? ' · chỉ số chính +' + (lv / 10) : ''}</span>` +
        (lv < S.GEAR_MAX_LV ? `<button class="pill buy shd" id="wdUp" ${sh >= uni ? '' : 'disabled'}>Nâng cấp</button><div class="wd-sp"><i class="shard sp"></i>Mảnh ${esc(pick.name)}: <b>${have}/${need}</b><i class="bar"><u style="width:${Math.min(100, have / need * 100)}%"></u></i></div>` +
          `<small>${uni ? 'Còn thiếu ' + (need - own) + ' mảnh → bù bằng <i class="shard"></i>' + uni + ' mảnh vạn năng (bạn có ' + sh + ')' : 'Đủ mảnh của món này.'} Mở rương ra trùng món này sẽ được ${(R.dup || [10])[pick.rar] || 10} mảnh.</small>` : '<em>Tối đa</em>') + '</div>');
      if ($('wdUp')) $('wdUp').onclick = () => { Sound.boop(); Net.send({ t: 'upgradeGear', id: pick.id }); }; }
"""
patch('game.js', [
 ("shards: msg.shards || 0, lv: msg.lv || {},", "shards: msg.shards || 0, sh: msg.sh || {}, lv: msg.lv || {},"),
 ("`<p class=\"cp-dup\">Bạn đã có món này → đổi thành <b><i class=\"shard\"></i>${ch.shards} mảnh</b></p>", "`<p class=\"cp-dup\">Bạn đã có món này → nhận <b><i class=\"shard sp\"></i>${ch.shards} mảnh ${esc(it.name)}</b><br><small>Dùng để nâng cấp chính món này trong Trang bị.</small></p>"),
 ("<small>Ra một món ngẫu nhiên. Món đã có sẽ đổi thành mảnh.</small>", "<small>Ra một món ngẫu nhiên. Trùng món đã có thì nhận mảnh của món đó.</small>"),
 ("<b>${k.shards} mảnh</b><small>Dùng để ghép món của bộ đồ và nâng cấp đồ.</small>", "<b>${k.shards} mảnh vạn năng</b><small>Thay cho mảnh riêng của bất kỳ món nào khi nâng cấp, và để ghép món của bộ đồ.</small>"),
 ("`<p class=\"tiny shop-hint\">Món đã có sẽ đổi thành mảnh: Thường ${dupR[0]}, Hiếm ${dupR[1]}, Sử thi ${dupR[2]}. Ghép một món: ${crR[0]} / ${crR[1]} / ${crR[2]} mảnh.</p>` +",
  "`<p class=\"tiny shop-hint\">Mỗi món có mảnh riêng: mở rương trùng món đã có được ${dupR[0]} mảnh của món đó, dùng để nâng cấp món đó. Mảnh vạn năng bù cho mảnh còn thiếu (1 mảnh riêng = 1 / 2 / 4 / 8 vạn năng theo bậc) và ghép món của bộ đồ (${crR[0]} / ${crR[1]} / ${crR[2]} / ${crR[3] || 400}).</p>` +"),
], cuts=[("    { const lv = (wallet.lv || {})[pick.id] || 0, up = ", "Net.send({ t: 'upgradeGear', id: pick.id }); }; }\n", UP)])
patch('style.css', [
 (".cp-dup{margin:8px 0 0;font-size:14px}", ".shard.sp{filter:hue-rotate(150deg) saturate(1.4)}.wd-sp{flex-basis:100%;display:flex;align-items:center;gap:6px;font-size:13px}.wd-sp .bar{flex:1;height:8px;border-radius:99px;background:rgba(0,0,0,.35);overflow:hidden;display:block}.wd-sp .bar u{display:block;height:100%;background:linear-gradient(90deg,#7ff0a8,#3ecf7a)}\n.cp-dup{margin:8px 0 0;font-size:14px}"),
])
patch('tests/chest-regression.js', [
 ("  assert(dups > 0 && p.eco.shards === sh);", "  assert(dups > 0 && p.eco.shards === 0 && Object.values(p.eco.sh).reduce((a, b) => a + b, 0) === sh && Object.keys(p.eco.sh).every((id) => p.eco.items.includes(id)), 'duplicates give shards of that very item');"),
 ("p.eco.shards = E.UP_COST[1].reduce((a, b) => a + b, 0) + 5; E.equip(p, 'head', 'nj_head', T0); assert.equal(S.GEAR_MAX_LV, 5); assert.deepEqual(E.UP_COST[1], [16, 40, 80, 140, 220]);\n  for (let l = 1; l <= 5; l++) { const u = E.upgradeGear(p, 'nj_head', T0); assert(u.ok && u.lv === l); }\n  assert.equal(p.eco.shards, 5);",
  "E.equip(p, 'head', 'nj_head', T0); assert.equal(S.GEAR_MAX_LV, 5); assert.deepEqual(E.UP_SP, [10, 20, 30, 50, 80]);\n"
  "  p.eco.shards = 0; p.eco.sh.nj_head = 9; assert(!E.upgradeGear(p, 'nj_head', T0).ok, '9 of 10 item shards and no universal ones'); p.eco.sh.nj_head = 10; p.eco.sh.r_pro = 99;\n"
  "  let u = E.upgradeGear(p, 'nj_head', T0); assert(u.ok && u.lv === 1 && u.own === 10 && u.uni === 0 && p.eco.sh.nj_head === 0 && p.eco.sh.r_pro === 99, 'only its own shards are used');\n"
  "  p.eco.sh.nj_head = 5; p.eco.shards = 30 + 5; u = E.upgradeGear(p, 'nj_head', T0); assert(u.ok && u.own === 5 && u.uni === 30 && p.eco.shards === 5, 'rare item: 15 missing shards = 30 universal');\n"
  "  p.eco.shards = (30 + 50 + 80) * 2 + 5; for (let l = 3; l <= 5; l++) { u = E.upgradeGear(p, 'nj_head', T0); assert(u.ok && u.lv === l); }\n  assert.equal(p.eco.shards, 5);"),
 ("typeof v.shards === 'number' && v.lv);", "typeof v.shards === 'number' && v.lv && v.sh && v.rules.upSp.length === 5 && v.rules.uniRate.length === 4);"),
])
print('ok')
