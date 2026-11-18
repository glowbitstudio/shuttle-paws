# One-off patch: shards (duplicates from chests, bought in packs), crafting set pieces from shards, item upgrade levels, whole sets sold for diamonds.
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

patch('sim.js', [
 ("const gearById = (id) => GEAR.find((g) => g.id === id) || null;",
  "// a worn item may carry its upgrade level as a suffix: 'r_pro+2'\n"
  "const GEAR_MAX_LV = 3, GEAR_LV_STEP = 0.1;\n"
  "const gearBase = (id) => String(id == null ? '' : id).split('+')[0], gearLv = (id) => Math.max(0, Math.min(GEAR_MAX_LV, (String(id == null ? '' : id).split('+')[1] | 0)));\n"
  "const gearById = (id) => { const b = gearBase(id); return GEAR.find((g) => g.id === b) || null; };\n"
  "// each level adds 0.1 to the item's strongest plus\n"
  "function gearAtLv(g, lv) { if (!lv) return g; let best = null; for (const k in g.mods) if (g.mods[k] > 0 && (best === null || g.mods[k] > g.mods[best])) best = k;\n"
  "  const mods = Object.assign({}, g.mods); if (best) mods[best] = Math.round((mods[best] + GEAR_LV_STEP * lv) * 100) / 100; return Object.assign({}, g, { lv, mods }); }"),
 ("function gearSet(ids) { const by = {}; for (const id of ids || []) { const g = gearById(id); if (g) by[g.slot] = g; } return by; }",
  "function gearSet(ids) { const by = {}; for (const id of ids || []) { const g = gearById(id); if (g) by[g.slot] = gearAtLv(g, gearLv(id)); } return by; }"),
 ("  GEAR, GEAR_SLOTS, GEAR_SETS, setBonus,", "  GEAR, GEAR_SLOTS, GEAR_SETS, setBonus, GEAR_MAX_LV, gearBase, gearLv, gearAtLv,"),
])

ECO = """// ---- shards: a duplicate from a chest turns into shards; shards craft a missing item or upgrade an owned one. Whole sets are sold for diamonds.
const DUP_SHARDS = [5, 15, 40], CRAFT_COST = [20, 60, 150], UP_COST = [[8, 20, 40], [16, 40, 80], [32, 80, 160]];   // by rarity (UP_COST[rarity][level])
const SET_GEMS = [60, 150, 320];                                    // a complete 5-piece set by rarity; owned pieces are taken off the price
const SHARD_PACKS = [{ id: 's0', shards: 5, gold: 400, gems: 0 }, { id: 's1', shards: 25, gold: 0, gems: 10 }, { id: 's2', shards: 80, gold: 0, gems: 28 }];
const setPrice = (e, sid) => { const ps = Sim.GEAR.filter((g) => g.set === sid), miss = ps.filter((g) => !e.items.includes(g.id)).length; return ps.length ? Math.ceil(SET_GEMS[ps[0].rar] * miss / ps.length) : 0; };
function buySet(p, sid, now) {
  const e = ensure(p, now), ps = Sim.GEAR.filter((g) => g.set === sid), price = setPrice(e, sid);
  if (!ps.length || !price) return { ok: false, why: 'Không mua được bộ này' };
  if (e.gems < price) return { ok: false, why: 'Chưa đủ kim cương (thiếu ' + (price - e.gems) + ')' };
  e.gems -= price; for (const g of ps) { if (!e.items.includes(g.id)) e.items.push(g.id); e.equip[g.slot] = g.id; }
  return { ok: true, set: sid, spent: price, why: 'Đã mua cả bộ, đã mặc' };
}
function craftGear(p, id, now) {
  const e = ensure(p, now), g = Sim.gearById(id);
  if (!g || e.items.includes(g.id)) return { ok: false, why: 'Không ghép được món này' };
  const cost = CRAFT_COST[g.rar]; if (e.shards < cost) return { ok: false, why: 'Chưa đủ mảnh (thiếu ' + (cost - e.shards) + ')' };
  e.shards -= cost; e.items.push(g.id);
  return { ok: true, item: g.id, spent: cost, why: 'Đã ghép ' + g.name };
}
function upgradeGear(p, id, now) {
  const e = ensure(p, now), g = Sim.gearById(id), lv = g ? e.lv[g.id] || 0 : 0;
  if (!g || !e.items.includes(g.id)) return { ok: false, why: 'Bạn chưa có món này' };
  if (lv >= Sim.GEAR_MAX_LV) return { ok: false, why: 'Món này đã ở cấp cao nhất' };
  const cost = UP_COST[g.rar][lv]; if (e.shards < cost) return { ok: false, why: 'Chưa đủ mảnh (thiếu ' + (cost - e.shards) + ')' };
  e.shards -= cost; e.lv[g.id] = lv + 1;
  return { ok: true, item: g.id, lv: lv + 1, spent: cost, why: g.name + ' lên cấp ' + (lv + 1) };
}
function buyShards(p, id, now) {
  const e = ensure(p, now), k = SHARD_PACKS.find((x) => x.id === id);
  if (!k) return { ok: false, why: 'Không có gói này' };
  if (k.gems) { if (e.gems < k.gems) return { ok: false, why: 'Chưa đủ kim cương (thiếu ' + (k.gems - e.gems) + ')' }; e.gems -= k.gems; }
  else { if (e.gold < k.gold) return { ok: false, why: 'Chưa đủ vàng (thiếu ' + (k.gold - e.gold) + ')' }; e.gold -= k.gold; }
  e.shards += k.shards;
  return { ok: true, shards: k.shards, why: '+' + k.shards + ' mảnh' };
}
"""
patch('economy.js', [
 ("// ---- gear: owned items and what is worn", ECO + "// ---- gear: owned items and what is worn"),
 ("  if (typeof e.gems !== 'number') e.gems = 0;\n", "  if (typeof e.gems !== 'number') e.gems = 0;\n  if (typeof e.shards !== 'number') e.shards = 0;\n  if (!e.lv) e.lv = {};\n"),
 ("gems: e.gems, chests: CHESTS,", "gems: e.gems, shards: e.shards, lv: Object.assign({}, e.lv), rules: { dup: DUP_SHARDS, craft: CRAFT_COST, up: UP_COST, setGems: SET_GEMS, packs: SHARD_PACKS }, chests: CHESTS,"),
 # chests roll among every item of the rarity; an owned one becomes shards
 ("  const left = Sim.GEAR.filter((g) => !e.items.includes(g.id));\n  if (!left.length) return { ok: false, why: 'Bạn đã có đủ mọi món đồ rồi' };\n", ""),
 ("  let pool = []; for (const k of [rar, 2, 1, 0]) { pool = left.filter((g) => g.rar === k); if (pool.length) break; }   // that rarity is complete: the next better one, then lower\n",
  "  const pool = Sim.GEAR.filter((g) => g.rar === rar);\n"),
 ("  if (gems) e.gems -= price; else e.gold -= price; e.items.push(g.id);\n  return { ok: true, chest: c.id, item: g.id, rar: g.rar, spent: price, pay: gems ? 'gems' : 'gold' };",
  "  if (gems) e.gems -= price; else e.gold -= price;\n  const dup = e.items.includes(g.id), shards = dup ? DUP_SHARDS[g.rar] : 0;   // already owned: it comes out as shards\n  if (dup) e.shards += shards; else e.items.push(g.id);\n  return { ok: true, chest: c.id, item: g.id, rar: g.rar, dup, shards, spent: price, pay: gems ? 'gems' : 'gold' };"),
 ("  if (!g || e.items.includes(g.id)) return { ok: false, why: 'Không mua được món này' };\n  if (e.gold < g.price)",
  "  if (!g || e.items.includes(g.id)) return { ok: false, why: 'Không mua được món này' };\n  if (g.set) return { ok: false, why: 'Món của bộ đồ: mua cả bộ bằng kim cương, mở rương hoặc ghép mảnh' };\n  if (e.gold < g.price)"),
 ("return Object.values(e.equip).filter((id) => e.items.includes(id) && Sim.gearById(id)); }", "return Object.values(e.equip).filter((id) => e.items.includes(id) && Sim.gearById(id)).map((id) => (e.lv[id] ? id + '+' + e.lv[id] : id)); }"),
 ("module.exports = { openChest,", "module.exports = { buySet, craftGear, upgradeGear, buyShards, setPrice, DUP_SHARDS, CRAFT_COST, UP_COST, SET_GEMS, SHARD_PACKS, openChest,"),
])
patch('server.js', [
 ("  openChest(c, msg) {", "  buySet(c, msg) { const p = data.players[c.id], note = Eco.buySet(p, clean(msg.id, 12), Date.now()); save(); send(c, Object.assign(Eco.view(p, Date.now()), { note })); },\n"
  "  craftGear(c, msg) { const p = data.players[c.id], note = Eco.craftGear(p, clean(msg.id, 20), Date.now()); save(); send(c, Object.assign(Eco.view(p, Date.now()), { note })); },\n"
  "  upgradeGear(c, msg) { const p = data.players[c.id], note = Eco.upgradeGear(p, clean(msg.id, 20), Date.now()); save(); send(c, Object.assign(Eco.view(p, Date.now()), { note })); },\n"
  "  buyShards(c, msg) { const p = data.players[c.id], note = Eco.buyShards(p, clean(msg.id, 4), Date.now()); save(); send(c, Object.assign(Eco.view(p, Date.now()), { note })); },\n"
  "  openChest(c, msg) {"),
])

patch('game.js', [
 ("const myGear = () => (wallet && wallet.equip && wallet.items ? Object.values(wallet.equip).filter((id) => wallet.items.includes(id)) : []);",
  "const myGear = () => (wallet && wallet.equip && wallet.items ? Object.values(wallet.equip).filter((id) => wallet.items.includes(id)).map((id) => (wallet.lv && wallet.lv[id] ? id + '+' + wallet.lv[id] : id)) : []);"),
 ("gems: msg.gems || 0, chests: msg.chests || [],", "gems: msg.gems || 0, shards: msg.shards || 0, lv: msg.lv || {}, rules: msg.rules || {}, chests: msg.chests || [],"),
 ("document.querySelectorAll('.gemN').forEach((b) => { b.textContent = wallet.gems; });", "document.querySelectorAll('.gemN').forEach((b) => { b.textContent = wallet.gems; }); document.querySelectorAll('.shardN').forEach((b) => { b.textContent = wallet.shards; });\n  if (msg.note) { if (msg.note.ok) { Sound.ach(); toast(msg.note.why, msg.note.spent ? '−' + msg.note.spent : '', 'check'); } else toast(msg.note.why, '', 'lock'); }"),
 # chest reveal: a duplicate shows the shards it became
 ("`<div class=\"cp-btn\"><button class=\"cta\" id=\"cpWear\">Mặc ngay</button><button class=\"pill\" id=\"cpClose\">Đóng</button></div></div>`;",
  "(ch.dup ? `<p class=\"cp-dup\">Bạn đã có món này → đổi thành <b><i class=\"shard\"></i>${ch.shards} mảnh</b></p><div class=\"cp-btn\"><button class=\"cta\" id=\"cpClose\">Nhận mảnh</button></div></div>`\n"
  "      : `<div class=\"cp-btn\"><button class=\"cta\" id=\"cpWear\">Mặc ngay</button><button class=\"pill\" id=\"cpClose\">Đóng</button></div></div>`);"),
 ("  $('cpWear').onclick = () => {", "  if ($('cpWear')) $('cpWear').onclick = () => {"),
 # shop rows: set pieces are crafted from shards, not bought with gold
 ("    const btn = own ? `<span class=\"own\">${on ? 'Đang mặc' : 'Đã có'}</span>` : `<button class=\"pill buy\" data-act=\"buy\" ${gold >= it.price ? '' : 'disabled'}><i class=\"coin\"></i>${it.price}</button>`;",
  "    const cc = ((wallet && wallet.rules && wallet.rules.craft) || [20, 60, 150])[it.rar], sh = wallet ? wallet.shards || 0 : 0;\n"
  "    const btn = own ? `<span class=\"own\">${on ? 'Đang mặc' : 'Đã có'}</span>` : it.set ? `<button class=\"pill buy shd\" data-act=\"craft\" ${sh >= cc ? '' : 'disabled'}><i class=\"shard\"></i>${cc}</button>` : `<button class=\"pill buy\" data-act=\"buy\" ${gold >= it.price ? '' : 'disabled'}><i class=\"coin\"></i>${it.price}</button>`;"),
 ("    if (b) b.onclick = (ev) => { ev.stopPropagation(); Sound.boop(); gearTry = null; Net.send({ t: 'buyGear', id }); };", "    if (b) b.onclick = (ev) => { ev.stopPropagation(); Sound.boop(); gearTry = null; Net.send({ t: b.dataset.act === 'craft' ? 'craftGear' : 'buyGear', id }); };"),
 # sets: sold for diamonds
 ("cost = ps.filter((g) => !items.includes(g.id)).reduce((a, g) => a + g.price, 0);", "cost = Math.ceil((((wallet.rules || {}).setGems) || [60, 150, 320])[ps[0].rar] * (ps.length - own) / ps.length), myGems = wallet.gems || 0;"),
 ("(cost ? `<button class=\"pill buy\" data-act=\"buyset\" ${gold >= cost ? '' : 'disabled'}><i class=\"coin\"></i>${cost}</button>` : '<span class=\"own\">Đã đủ bộ</span>') + '</div>';",
  "(cost ? `<button class=\"pill buy gem\" data-act=\"buyset\" ${myGems >= cost ? '' : 'disabled'}><i class=\"gem\"></i>${cost}</button>` : '<span class=\"own\">Đã đủ bộ</span>') + '</div>';"),
 ("      if (b) b.onclick = (ev) => { ev.stopPropagation(); Sound.boop(); for (const g of S.GEAR) if (g.set === id && !wallet.items.includes(g.id)) Net.send({ t: 'buyGear', id: g.id }); };",
  "      if (b) b.onclick = (ev) => { ev.stopPropagation(); Sound.boop(); Net.send({ t: 'buySet', id }); };"),
 # chests tab: shard packs and the rules
 ("    }).join('') + `<p class=\"tiny shop-hint\">Bạn đang có ${have}/${tot} món.",
  "    }).join('') + ((wallet && wallet.rules && wallet.rules.packs) || []).map((k) => `<div class=\"gear-item chest-row pack-row r0\" data-pack=\"${k.id}\"><span class=\"shard big\"></span><div class=\"gi\"><b>${k.shards} mảnh</b><small>Dùng để ghép món của bộ đồ và nâng cấp đồ.</small></div><div class=\"chest-pay\">` +\n"
  "      (k.gems ? `<button class=\"pill buy gem\" ${gems >= k.gems ? '' : 'disabled'}><i class=\"gem\"></i>${k.gems}</button>` : `<button class=\"pill buy\" ${gold >= k.gold ? '' : 'disabled'}><i class=\"coin\"></i>${k.gold}</button>`) + '</div></div>').join('') +\n"
  "      `<p class=\"tiny shop-hint\">Món đã có sẽ đổi thành mảnh: Thường ${dupR[0]}, Hiếm ${dupR[1]}, Sử thi ${dupR[2]}. Ghép một món: ${crR[0]} / ${crR[1]} / ${crR[2]} mảnh.</p>` +\n"
  "      `<p class=\"tiny shop-hint\">Bạn đang có ${have}/${tot} món."),
 ("    const gems = wallet ? wallet.gems || 0 : 0, tot = S.GEAR.length, have = items.length, gr = (wallet && wallet.gemRules) || {};",
  "    const gems = wallet ? wallet.gems || 0 : 0, tot = S.GEAR.length, have = items.length, gr = (wallet && wallet.gemRules) || {}, dupR = ((wallet && wallet.rules) || {}).dup || [5, 15, 40], crR = ((wallet && wallet.rules) || {}).craft || [20, 60, 150];"),
 ("    $('gearList').querySelectorAll('.chest-row button').forEach((b) => { b.onclick = () => { Sound.boop(); Net.send({ t: 'openChest', id: b.closest('.chest-row').dataset.chest, pay: b.dataset.pay }); }; });",
  "    $('gearList').querySelectorAll('.chest-row button').forEach((b) => { b.onclick = () => { Sound.boop(); const row = b.closest('.chest-row'); if (row.dataset.pack) Net.send({ t: 'buyShards', id: row.dataset.pack }); else Net.send({ t: 'openChest', id: row.dataset.chest, pay: b.dataset.pay }); }; });"),
 # wardrobe card: level and upgrade
 ("    $('wdAct').onclick = () => {", "    { const lv = (wallet.lv || {})[pick.id] || 0, up = (((wallet.rules || {}).up) || [[8, 20, 40], [16, 40, 80], [32, 80, 160]])[pick.rar][lv], sh = wallet.shards || 0;\n"
  "      $('wdAct').insertAdjacentHTML('afterend', `<div class=\"wd-up\"><span>Cấp <b>${lv}</b>/${S.GEAR_MAX_LV}${lv ? ' · chỉ số chính +' + (lv / 10) : ''}</span>` + (lv < S.GEAR_MAX_LV ? `<button class=\"pill buy shd\" id=\"wdUp\" ${sh >= up ? '' : 'disabled'}>Nâng cấp <i class=\"shard\"></i>${up}</button>` : '<em>Tối đa</em>') + `<small>Bạn có <i class=\"shard\"></i>${sh} mảnh</small></div>`);\n"
  "      if ($('wdUp')) $('wdUp').onclick = () => { Sound.boop(); Net.send({ t: 'upgradeGear', id: pick.id }); }; }\n"
  "    $('wdAct').onclick = () => {"),
])
patch('index.html', [
 ('<b id="gearGold">…</b></span><span class="gold-chip gem-chip"><i class="gem"></i><b class="gemN">0</b></span>', '<b id="gearGold">…</b></span><span class="gold-chip gem-chip"><i class="gem"></i><b class="gemN">0</b></span><span class="gold-chip gem-chip"><i class="shard"></i><b class="shardN">0</b></span>'),
])
patch('style.css', [
 (".gem-chip{margin-left:6px}", ".shard{display:inline-block;width:13px;height:15px;margin-right:5px;vertical-align:-2px;clip-path:polygon(50% 0,100% 38%,72% 100%,18% 100%,0 42%);background:linear-gradient(135deg,#fff6c9,#ffb84d 50%,#e0662a)}.shard.big{flex:none;width:52px;height:58px;margin:0 7px}\n"
  ".pill.buy.shd{background:linear-gradient(180deg,#ffd9a0,#ff9a3d);color:#3b1c00}.wd-up{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:2px 0 8px;font-size:13px}.wd-up small{flex-basis:100%;opacity:.75;font-size:12px}.wd-up em{font-style:normal;color:#7ff0a8;font-weight:800}\n"
  ".cp-dup{margin:8px 0 0;font-size:14px}.cp-dup b{color:#ffd76a}\n.gem-chip{margin-left:6px}"),
])
print('ok')
