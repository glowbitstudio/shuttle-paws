'use strict';
// Shuttle Paws economy (server side only; never served to clients). Everything a player owns lives in the server's
// player record under `eco` and only changes through the functions below, so a client cannot give itself gold or characters.
// Local (vs bot) matches run in the browser and cannot be verified here: their rewards are small, rate-limited and capped per day.
const Sim = require('./sim.js');
const DAY_MS = 86400000, TZ_MS = 7 * 3600000;                       // days roll over at midnight Vietnam time
const dayOf = (now) => Math.floor((now + TZ_MS) / DAY_MS);

const FREE_CHARS = ['cat', 'bunny', 'bear', 'panda'];
// gold prices; characters that also have an achievement route in the client can be bought as a shortcut
const PRICES = { fox: 600, frog: 600, penguin: 800, duck: 800, hamster: 1200, dog: 1200, sheep: 1500, koala: 1500, tiger: 2000, otter: 2000, unicorn: 3000, dragon: 4000 };
// only these must be owned to be used online; the others can also be earned through client-side achievements (not verifiable here)
const MUST_OWN = ['fox', 'frog', 'penguin', 'duck'];
const START_GOLD = 200;
const LOCAL_WIN = [20, 30, 45, 60, 90], LOCAL_LOSS = 8;                  // by bot difficulty 0..3
const ONLINE_WIN = 60, ONLINE_LOSS = 20;
const LOCAL_DAILY_CAP = 600;                                        // gold per day from unverified local matches
const LOCAL_MIN_GAP_MS = 45000, LOCAL_MIN_DUR = 40;                 // one claim per 45 s, match at least 40 s long
const LOGIN_REWARDS = [50, 60, 70, 80, 100, 120, 200];              // day 1..7 of a streak, then it starts over
// diamonds: the second currency. Earned by winning online (verified), winning the tournament (once a day) and the 7th login day.
const GEM_ONLINE_WIN = 1, GEM_CHAMP = 10, GEM_STREAK7 = 5;
// chests: a random item the player does not own yet; odds = chance in % of a common / rare / epic item. gold or gems 0 = cannot be paid that way.
const CHESTS = [
  { id: 'c0', name: 'Rương Thường', gold: 250, gems: 0, odds: [78, 20, 2, 0] },
  { id: 'c1', name: 'Rương Hiếm', gold: 900, gems: 10, odds: [0, 76, 22, 2] },
  { id: 'c2', name: 'Rương Sử thi', gold: 0, gems: 30, odds: [0, 0, 88, 12] },
  { id: 'c3', name: 'Rương Huyền thoại', gold: 0, gems: 90, odds: [0, 0, 40, 60] },
];
// levels: experience from every finished match; level n starts at 40 * (n - 1)^2 xp; each new level pays one diamond
const levelOf = (xp) => Math.floor(Math.sqrt((xp || 0) / 40)) + 1, levelXp = (lv) => 40 * (lv - 1) * (lv - 1);
const XP_ONLINE = [12, 30], XP_LOCAL_WIN = [6, 9, 12, 16, 24], XP_LOCAL_LOSS = 4;
function addXp(e, n) { const l0 = levelOf(e.xp); e.xp = (e.xp || 0) + n; const up = levelOf(e.xp) - l0; if (up > 0) e.gems += up; return { xp: n, levelUp: up }; }
function openChest(p, id, pay, now, rnd) {
  const e = ensure(p, now), c = CHESTS.find((x) => x.id === id), gems = pay === 'gems', R = rnd || Math.random;
  const price = c ? (gems ? c.gems : c.gold) : 0;
  if (!c || !price) return { ok: false, why: 'Không mở được rương này' };
  if ((gems ? e.gems : e.gold) < price) return { ok: false, why: gems ? 'Chưa đủ kim cương (thiếu ' + (price - e.gems) + ')' : 'Chưa đủ vàng (thiếu ' + (price - e.gold) + ')' };
  let r = R() * 100, rar = c.odds.length - 1; for (let k = 0; k < c.odds.length; k++) { if (r < c.odds[k]) { rar = k; break; } r -= c.odds[k]; }
  const pool = Sim.GEAR.filter((g) => g.rar === rar);
  const g = pool[Math.min(pool.length - 1, Math.floor(R() * pool.length))];
  if (gems) e.gems -= price; else e.gold -= price;
  const dup = e.items.includes(g.id), shards = dup ? DUP_SHARDS[g.rar] : 0;   // already owned: it comes out as shards
  if (dup) e.sh[g.id] = (e.sh[g.id] || 0) + shards; else e.items.push(g.id);
  return { ok: true, chest: c.id, item: g.id, rar: g.rar, dup, shards, spent: price, pay: gems ? 'gems' : 'gold' };
}
const QUESTS = [
  { id: 'play3', name: 'Chơi 3 trận', key: 'play', goal: 3, reward: 60 },
  { id: 'win2', name: 'Thắng 2 trận', key: 'win', goal: 2, reward: 80 },
  { id: 'online1', name: 'Chơi 1 trận online', key: 'online', goal: 1, reward: 100 },
];

// make sure the record has an economy block for today (creates it for old players; `char` = the character they were using)
function ensure(p, now, char) {
  const d = dayOf(now);
  if (!p.eco) {
    p.eco = { gold: START_GOLD, owned: FREE_CHARS.slice(), login: { day: 0, streak: 0 }, quests: { day: d, prog: {}, claimed: [] }, local: { day: d, gold: 0, last: 0 } };
    if (MUST_OWN.includes(char)) p.eco.owned.push(char);            // players from before the shop keep the character they had picked
  }
  const e = p.eco;
  if (!e.items) e.items = [];
  if (typeof e.gems !== 'number') e.gems = 0;
  if (typeof e.xp !== 'number') e.xp = 0;
  if (typeof e.shards !== 'number') e.shards = 0;
  if (!e.lv) e.lv = {};
  if (!e.sh) e.sh = {};
  if (!e.equip) e.equip = {};
  if (e.quests.day !== d) e.quests = { day: d, prog: {}, claimed: [] };
  if (e.local.day !== d) e.local = { day: d, gold: 0, last: e.local.last || 0 };
  return e;
}
function view(p, now) {
  const e = ensure(p, now), d = dayOf(now);
  const canLogin = e.login.day !== d;
  const next = e.login.day === d - 1 ? e.login.streak % LOGIN_REWARDS.length + 1 : 1;   // the streak day a claim today would be
  return {
    t: 'wallet', xp: e.xp, level: levelOf(e.xp), levelAt: levelXp(levelOf(e.xp)), levelNext: levelXp(levelOf(e.xp) + 1), gold: e.gold, gems: e.gems, shards: e.shards, sh: Object.assign({}, e.sh), lv: Object.assign({}, e.lv), rules: { dup: DUP_SHARDS, craft: CRAFT_COST, upSp: UP_SP, uniRate: UNI_RATE, setGems: SET_GEMS, packs: SHARD_PACKS }, chests: CHESTS, gemRules: { online: GEM_ONLINE_WIN, champ: GEM_CHAMP, streak7: GEM_STREAK7 }, owned: e.owned.slice(), prices: PRICES, free: FREE_CHARS,
    items: e.items.slice(), equip: Object.assign({}, e.equip),
    login: { can: canLogin, streak: canLogin ? next : e.login.streak, reward: canLogin ? LOGIN_REWARDS[next - 1] : 0, rewards: LOGIN_REWARDS },
    quests: QUESTS.map((q) => ({ id: q.id, name: q.name, goal: q.goal, reward: q.reward, prog: Math.min(q.goal, e.quests.prog[q.key] || 0), claimed: e.quests.claimed.includes(q.id) })),
    localLeft: Math.max(0, LOCAL_DAILY_CAP - e.local.gold),
  };
}
function progress(e, win, online) {
  const pr = e.quests.prog;
  pr.play = (pr.play || 0) + 1; if (win) pr.win = (pr.win || 0) + 1; if (online) pr.online = (pr.online || 0) + 1;
}
// online match finished on this server: always trusted
function grantOnline(p, win, now) {
  const e = ensure(p, now), gold = win ? ONLINE_WIN : ONLINE_LOSS;
  e.gold += gold; progress(e, win, true); const x = addXp(e, XP_ONLINE[win ? 1 : 0]), gems = (win ? GEM_ONLINE_WIN : 0) + x.levelUp; e.gems += win ? GEM_ONLINE_WIN : 0;
  return { gold, gems, xp: x.xp, levelUp: x.levelUp, why: win ? 'Thắng trận online' : 'Hoàn thành trận online' };
}
// local match reported by the client: bounded
function grantLocal(p, msg, now) {
  const e = ensure(p, now);
  const dur = +msg.dur || 0, diff = Math.max(0, Math.min(4, msg.diff | 0)), win = !!msg.win;
  if (dur < LOCAL_MIN_DUR) return { gold: 0, why: 'Trận quá ngắn, không tính thưởng' };
  if (now - e.local.last < LOCAL_MIN_GAP_MS) return { gold: 0, why: 'Vừa nhận thưởng trận trước, chờ một chút' };
  e.local.last = now; progress(e, win, false);
  const want = win ? LOCAL_WIN[diff] : LOCAL_LOSS, gold = Math.max(0, Math.min(want, LOCAL_DAILY_CAP - e.local.gold));
  e.local.gold += gold; e.gold += gold;
  let gems = 0; if (msg.champ && win && e.champDay !== dayOf(now)) { e.champDay = dayOf(now); gems = GEM_CHAMP; e.gems += gems; }   // tournament title: once a day
  const x = addXp(e, win ? XP_LOCAL_WIN[diff] : XP_LOCAL_LOSS); gems += x.levelUp;
  return { gold, gems, xp: x.xp, levelUp: x.levelUp, why: gold < want ? 'Đã chạm trần vàng đấu bot hôm nay' : win ? 'Thắng trận' : 'Hoàn thành trận' };
}
function claimLogin(p, now) {
  const e = ensure(p, now), d = dayOf(now);
  if (e.login.day === d) return { gold: 0, why: 'Hôm nay đã nhận rồi' };
  const streak = e.login.day === d - 1 ? e.login.streak % LOGIN_REWARDS.length + 1 : 1;
  e.login = { day: d, streak };
  const gold = LOGIN_REWARDS[streak - 1]; e.gold += gold; const gems = streak === 7 ? GEM_STREAK7 : 0; e.gems += gems;
  return { gold, gems, why: 'Quà đăng nhập ngày ' + streak };
}
function claimQuest(p, id, now) {
  const e = ensure(p, now), q = QUESTS.find((x) => x.id === id);
  if (!q || e.quests.claimed.includes(q.id) || (e.quests.prog[q.key] || 0) < q.goal) return { gold: 0, why: 'Nhiệm vụ chưa xong' };
  e.quests.claimed.push(q.id); e.gold += q.reward;
  return { gold: q.reward, why: 'Nhiệm vụ: ' + q.name };
}
function buyChar(p, id, now) {
  const e = ensure(p, now), price = Object.prototype.hasOwnProperty.call(PRICES, id) ? PRICES[id] : null;
  if (price === null || e.owned.includes(id)) return { ok: false, why: 'Không mua được nhân vật này' };
  if (e.gold < price) return { ok: false, why: 'Chưa đủ vàng (thiếu ' + (price - e.gold) + ')' };
  e.gold -= price; e.owned.push(id);
  return { ok: true, char: id, spent: price, why: 'Đã mở khoá nhân vật' };
}
// may this player use the character online?
const canUse = (p, id, now) => !MUST_OWN.includes(id) || ensure(p, now).owned.includes(id);

// ---- shards: a duplicate from a chest turns into shards; shards craft a missing item or upgrade an owned one. Whole sets are sold for diamonds.
// Item shards (e.sh[id]): a duplicate from a chest gives DUP_SHARDS shards of that very item; they upgrade that item (UP_SP per level).
// Universal shards (e.shards, from packs) stand in for missing item shards at UNI_RATE universal per item shard (by rarity) and craft set pieces.
const DUP_SHARDS = [10, 10, 10, 10], UP_SP = [10, 20, 30, 50, 80], UNI_RATE = [1, 2, 4, 8], CRAFT_COST = [20, 60, 150, 400];   // by rarity (UP_COST[rarity][level])
const SET_GEMS = [75, 180, 380, 820];                                    // a complete 5-piece set by rarity; owned pieces are taken off the price
const SHARD_PACKS = [{ id: 's0', shards: 5, gold: 400, gems: 0 }, { id: 's1', shards: 25, gold: 0, gems: 10 }, { id: 's2', shards: 80, gold: 0, gems: 28 }];
const setPrice = (e, sid) => { const ps = Sim.GEAR.filter((g) => g.set === sid), miss = ps.filter((g) => !e.items.includes(g.id)).length; return ps.length ? Math.ceil(SET_GEMS[ps[0].rar] * miss / 6) : 0; };   // SET_GEMS is the price of six pieces; smaller sets cost less
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
  const cost = CRAFT_COST[g.rar]; if (e.shards < cost) return { ok: false, why: 'Chưa đủ mảnh vạn năng (thiếu ' + (cost - e.shards) + ')' };
  e.shards -= cost; e.items.push(g.id);
  return { ok: true, item: g.id, spent: cost, why: 'Đã ghép ' + g.name };
}
function upgradeGear(p, id, now) {
  const e = ensure(p, now), g = Sim.gearById(id), lv = g ? e.lv[g.id] || 0 : 0;
  if (!g || !e.items.includes(g.id)) return { ok: false, why: 'Bạn chưa có món này' };
  if (lv >= Sim.GEAR_MAX_LV) return { ok: false, why: 'Món này đã ở cấp cao nhất' };
  const need = UP_SP[lv], own = Math.min(need, e.sh[g.id] || 0), uni = (need - own) * UNI_RATE[g.rar];   // its own shards first, universal ones for the rest
  if (e.shards < uni) return { ok: false, why: 'Chưa đủ mảnh: cần thêm ' + (need - own) + ' mảnh ' + g.name + ' hoặc ' + uni + ' mảnh vạn năng (đang có ' + e.shards + ')' };
  if (own) e.sh[g.id] -= own; e.shards -= uni; e.lv[g.id] = lv + 1;
  return { ok: true, item: g.id, lv: lv + 1, own, uni, why: g.name + ' lên cấp ' + (lv + 1) };
}
function buyShards(p, id, now) {
  const e = ensure(p, now), k = SHARD_PACKS.find((x) => x.id === id);
  if (!k) return { ok: false, why: 'Không có gói này' };
  if (k.gems) { if (e.gems < k.gems) return { ok: false, why: 'Chưa đủ kim cương (thiếu ' + (k.gems - e.gems) + ')' }; e.gems -= k.gems; }
  else { if (e.gold < k.gold) return { ok: false, why: 'Chưa đủ vàng (thiếu ' + (k.gold - e.gold) + ')' }; e.gold -= k.gold; }
  e.shards += k.shards;
  return { ok: true, shards: k.shards, why: '+' + k.shards + ' mảnh vạn năng' };
}
// ---- gear: owned items and what is worn (one per slot). The catalogue (prices, stats) is in sim.js.
function buyGear(p, id, now) {
  const e = ensure(p, now), g = Sim.gearById(id);
  if (!g || e.items.includes(g.id)) return { ok: false, why: 'Không mua được món này' };
  if (g.set) return { ok: false, why: 'Món của bộ đồ: mua cả bộ bằng kim cương, mở rương hoặc ghép mảnh' };
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
function equipped(p, now) { const e = ensure(p, now); return Object.values(e.equip).filter((id) => e.items.includes(id) && Sim.gearById(id)).map((id) => (e.lv[id] ? id + '+' + e.lv[id] : id)); }

module.exports = { levelOf, levelXp, XP_ONLINE, XP_LOCAL_WIN, XP_LOCAL_LOSS, buySet, craftGear, upgradeGear, buyShards, setPrice, DUP_SHARDS, CRAFT_COST, UP_SP, UNI_RATE, SET_GEMS, SHARD_PACKS, openChest, CHESTS, GEM_ONLINE_WIN, GEM_CHAMP, GEM_STREAK7, buyGear, equip, equipped, ensure, view, grantOnline, grantLocal, claimLogin, claimQuest, buyChar, canUse, dayOf, PRICES, FREE_CHARS, MUST_OWN, QUESTS, LOGIN_REWARDS, LOCAL_DAILY_CAP, START_GOLD, LOCAL_WIN, LOCAL_LOSS, ONLINE_WIN, ONLINE_LOSS };
