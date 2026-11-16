# One-off: gear catalogue + stat rules in sim.js, ownership / equip in economy.js, server wiring.
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def patch(name,reps):
    p=ROOT/name;s=p.read_bytes().decode('utf-8');nl='\r\n' if '\r\n' in s else '\n'
    for a,b in reps:
        a=a.replace('\n',nl);b=b.replace('\n',nl);assert s.count(a)==1,(name,s.count(a),a[:80]);s=s.replace(a,b)
    p.write_bytes(s.encode('utf-8'))
GEAR='''// ---- gear. Every item trades something for something (no pure buffs); rarer items trade on better terms.
// mods are in character-stat points (the same 1..5 scale as CHARS.stats). Net value per item: common +0.25, rare +0.5, epic +0.75.
const GEAR_SLOTS = [['racket', 'Vợt'], ['shoes', 'Giày'], ['shirt', 'Áo'], ['shorts', 'Quần'], ['wrist', 'Băng tay'], ['head', 'Đội đầu']];
const GEAR_RARITY = ['Thường', 'Hiếm', 'Sử thi'];
const GEAR = [
  { id: 'r_light', slot: 'racket', rar: 0, price: 300,  col: 0x4fb8e8, name: 'Vợt nhẹ',            mods: { ctl: 0.75, pow: -0.5 }, desc: 'Vung nhanh, đặt cầu chuẩn hơn nhưng đập yếu đi.' },
  { id: 'r_heavy', slot: 'racket', rar: 1, price: 900,  col: 0xd9483b, name: 'Vợt nặng đầu',       mods: { pow: 1, sta: -0.5 }, desc: 'Đập mạnh hẳn, đổi lại tốn sức hơn.' },
  { id: 'r_pro',   slot: 'racket', rar: 2, price: 2200, col: 0xf2c230, name: 'Vợt carbon',         mods: { pow: 0.75, ctl: 0.5, sta: -0.5 }, desc: 'Mạnh và chuẩn, nhưng cứng nên mau mỏi tay.' },
  { id: 's_run',   slot: 'shoes',  rar: 0, price: 300,  col: 0x53c27a, name: 'Giày chạy',          mods: { spd: 0.75, jmp: -0.5 }, desc: 'Đế mỏng: chạy nhanh hơn, bật nhảy kém đi.' },
  { id: 's_spring',slot: 'shoes',  rar: 1, price: 900,  col: 0x8a5cf0, name: 'Giày đệm lò xo',     mods: { jmp: 1, spd: -0.5 }, desc: 'Bật cao, nhưng đế dày nên chạy chậm hơn.' },
  { id: 's_pro',   slot: 'shoes',  rar: 2, price: 2200, col: 0xf2c230, name: 'Giày thi đấu',       mods: { spd: 1, jmp: 0.25, sta: -0.5 }, desc: 'Nhanh và nảy; bó chân nên xuống sức sớm hơn.' },
  { id: 't_cool',  slot: 'shirt',  rar: 0, price: 300,  col: 0x7fd6e8, name: 'Áo lưới thoáng',     mods: { sta: 0.75, pow: -0.5 }, desc: 'Mát, đỡ mệt; vải mỏng nên thiếu lực tì.' },
  { id: 't_comp',  slot: 'shirt',  rar: 1, price: 900,  col: 0x2b2f45, name: 'Áo bó cơ',           mods: { sta: 1, jmp: -0.5 }, desc: 'Giữ sức rất tốt, hơi gò khi bật nhảy.' },
  { id: 't_pro',   slot: 'shirt',  rar: 2, price: 2200, col: 0xf2c230, name: 'Áo thi đấu',         mods: { sta: 1, spd: 0.25, pow: -0.5 }, desc: 'Bền sức và nhẹ; không hợp lối đánh lực.' },
  { id: 'p_light', slot: 'shorts', rar: 0, price: 300,  col: 0xe86a9a, name: 'Quần ngắn nhẹ',      mods: { jmp: 0.75, sta: -0.5 }, desc: 'Dễ bật nhảy, nhưng hở nên mau mất sức.' },
  { id: 'p_flex',  slot: 'shorts', rar: 1, price: 900,  col: 0x3f6fd9, name: 'Quần co giãn',       mods: { spd: 0.5, jmp: 0.5, pow: -0.5 }, desc: 'Di chuyển thoải mái, bớt lực trụ khi đập.' },
  { id: 'p_pro',   slot: 'shorts', rar: 2, price: 2200, col: 0xf2c230, name: 'Quần thi đấu',       mods: { jmp: 1, spd: 0.25, ctl: -0.5 }, desc: 'Bật rất cao; tiếp đất mạnh nên kém khéo.' },
  { id: 'w_band',  slot: 'wrist',  rar: 0, price: 300,  col: 0xffffff, name: 'Băng thấm mồ hôi',   mods: { ctl: 0.75, pow: -0.5 }, desc: 'Tay khô, cầm chắc; hơi cộm khi đập.' },
  { id: 'w_weight',slot: 'wrist',  rar: 1, price: 900,  col: 0x3a3a46, name: 'Băng tạ',            mods: { pow: 1, ctl: -0.5 }, desc: 'Nặng tay: đập mạnh, khó đánh tinh tế.' },
  { id: 'w_pro',   slot: 'wrist',  rar: 2, price: 2200, col: 0xf2c230, name: 'Băng cổ tay pro',    mods: { ctl: 1, rch: 0.25, sta: -0.5 }, desc: 'Cổ tay vững và với xa hơn; bó nên mau mỏi.' },
  { id: 'h_band',  slot: 'head',   rar: 0, price: 300,  col: 0xe8503a, name: 'Băng đầu',           mods: { sta: 0.75, ctl: -0.5 }, desc: 'Mồ hôi không vào mắt, đỡ mệt; hơi vướng tầm nhìn.' },
  { id: 'h_focus', slot: 'head',   rar: 1, price: 900,  col: 0x2f8f6a, name: 'Băng tập trung',     mods: { ctl: 1, jmp: -0.5 }, desc: 'Đánh chuẩn hơn; chặt nên ngại bật cao.' },
  { id: 'h_pro',   slot: 'head',   rar: 2, price: 2200, col: 0xf2c230, name: 'Băng nhà vô địch',   mods: { rch: 0.75, ctl: 0.5, spd: -0.5 }, desc: 'Đọc cầu sớm, với xa; tự tin quá nên chậm chân.' },
];
const GEAR_STAT_CAP = 2;                                   // gear can move one stat by at most +-2 points in total
const STAT_KEYS = ['spd', 'jmp', 'pow', 'rch', 'ctl', 'sta'];
const gearById = (id) => GEAR.find((g) => g.id === id) || null;
// one item per slot (later ids win); unknown ids are ignored
function gearSet(ids) { const by = {}; for (const id of ids || []) { const g = gearById(id); if (g) by[g.slot] = g; } return by; }
function gearMods(ids) {
  const out = { spd: 0, jmp: 0, pow: 0, rch: 0, ctl: 0, sta: 0 }, set = gearSet(ids);
  for (const k in set) for (const s in set[k].mods) out[s] += set[k].mods[s];
  for (const s of STAT_KEYS) out[s] = clamp(out[s], -GEAR_STAT_CAP, GEAR_STAT_CAP);
  return out;
}
// the character's six stats with gear applied (fractional; each stays within 0.5..7)
function effStats(id, gear) {
  const c = CHARS.find((c) => c.id === id) || CHARS[0], m = gearMods(gear), out = {};
  for (const s of STAT_KEYS) out[s] = clamp(c.stats[s] + m[s], 0.5, 7);
  return out;
}
// power rating = net stat points x 100 (1800 for any character without gear)
function powerOf(id, gear) { const e = effStats(id, gear); return Math.round(STAT_KEYS.reduce((a, s) => a + e[s], 0) * 100); }

function charStats(id, gear) {
  const s = effStats(id, gear);
'''
patch('sim.js',[
 ("function charStats(id) {\n  const c = CHARS.find((c) => c.id === id) || CHARS[0];\n  const s = c.stats;\n", GEAR),
 ("    endurance: 1 + (3 - (s.sta || 3)) * 0.055,", "    endurance: 1 + (3 - s.sta) * 0.055,"),
 ("ignoreHit: false, st: charStats(s.char), assist:", "ignoreHit: false, st: charStats(s.char, s.gear), gear: Object.values(gearSet(s.gear)).map((g) => g.id), assist:"),
 ("  CHARS, DIFF, VENUES, SHOTS, charStats, fatigue,", "  CHARS, DIFF, VENUES, SHOTS, charStats, fatigue,\n  GEAR, GEAR_SLOTS, GEAR_RARITY, GEAR_STAT_CAP, gearById, gearSet, gearMods, effStats, powerOf,"),
])
ECO='''// ---- gear: owned items and what is worn (one per slot). The catalogue (prices, stats) is in sim.js.
function buyGear(p, id, now) {
  const e = ensure(p, now), g = Sim.gearById(id);
  if (!g || e.items.includes(g.id)) return { ok: false, why: 'Không mua được món này' };
  if (e.gold < g.price) return { ok: false, why: 'Chưa đủ vàng (thiếu ' + (g.price - e.gold) + ')' };
  e.gold -= g.price; e.items.push(g.id); e.equip[g.slot] = g.id;      // worn straight away
  return { ok: true, item: g.id, spent: g.price, why: 'Đã mua ' + g.name };
}
// wear an owned item, or take a slot off (id = null)
function equip(p, slot, id, now) {
  const e = ensure(p, now);
  if (!Sim.GEAR_SLOTS.some((s) => s[0] === slot)) return { ok: false };
  if (id === null || id === undefined || id === '') { delete e.equip[slot]; return { ok: true }; }
  const g = Sim.gearById(id);
  if (!g || g.slot !== slot || !e.items.includes(g.id)) return { ok: false };
  e.equip[slot] = g.id; return { ok: true };
}
// ids worn right now (only owned, known items)
function equipped(p, now) { const e = ensure(p, now); return Object.values(e.equip).filter((id) => e.items.includes(id) && Sim.gearById(id)); }

module.exports = { buyGear, equip, equipped, '''
patch('economy.js',[
 ("const DAY_MS = 86400000,", "const Sim = require('./sim.js');\nconst DAY_MS = 86400000,"),
 ("  const e = p.eco;\n  if (e.quests.day !== d)", "  const e = p.eco;\n  if (!e.items) e.items = [];\n  if (!e.equip) e.equip = {};\n  if (e.quests.day !== d)"),
 ("    t: 'wallet', gold: e.gold, owned: e.owned.slice(), prices: PRICES, free: FREE_CHARS,", "    t: 'wallet', gold: e.gold, owned: e.owned.slice(), prices: PRICES, free: FREE_CHARS,\n    items: e.items.slice(), equip: Object.assign({}, e.equip),"),
 ("module.exports = { ", ECO),
])
patch('server.js',[
 ("  const slots = players.map((c, i) => (c ? { name: c.name, char: c.char, hand: c.hand || 'R', ctrl: 'human', assist: 1 }", "  const slots = players.map((c, i) => (c ? { name: c.name, char: c.char, hand: c.hand || 'R', ctrl: 'human', assist: 1, gear: Eco.equipped(data.players[c.id], Date.now()) }"),
 ("{ name: a.name, char: a.char, hand: a.hand, ctrl: a.ctrl, diff: a.diff } : { name: a.name, char: a.char, hand: a.hand, ctrl: a.ctrl }))", "{ name: a.name, char: a.char, hand: a.hand, ctrl: a.ctrl, diff: a.diff } : { name: a.name, char: a.char, hand: a.hand, ctrl: a.ctrl, gear: a.gear }))"),
 ("  buyChar(c, msg) {", "  buyGear(c, msg) { const p = data.players[c.id], boughtGear = Eco.buyGear(p, clean(msg.id, 20), Date.now()); save(); send(c, Object.assign(Eco.view(p, Date.now()), { boughtGear })); },\n  equip(c, msg) { const p = data.players[c.id]; Eco.equip(p, clean(msg.slot, 10), msg.id ? clean(msg.id, 20) : null, Date.now()); save(); send(c, Eco.view(p, Date.now())); },\n  buyChar(c, msg) {"),
 ("    slots: r.slots.map((c) => (c ? { id: c.id, name: c.name, char: c.char } : null)),", "    slots: r.slots.map((c) => (c ? { id: c.id, name: c.name, char: c.char, power: Sim.powerOf(c.char, Eco.equipped(data.players[c.id], Date.now())) } : null)),"),
])
print('core ok')
