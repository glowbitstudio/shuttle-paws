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
const LOCAL_WIN = [20, 30, 45, 60], LOCAL_LOSS = 8;                  // by bot difficulty 0..3
const ONLINE_WIN = 60, ONLINE_LOSS = 20;
const LOCAL_DAILY_CAP = 600;                                        // gold per day from unverified local matches
const LOCAL_MIN_GAP_MS = 45000, LOCAL_MIN_DUR = 40;                 // one claim per 45 s, match at least 40 s long
const LOGIN_REWARDS = [50, 60, 70, 80, 100, 120, 200];              // day 1..7 of a streak, then it starts over
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
    t: 'wallet', gold: e.gold, owned: e.owned.slice(), prices: PRICES, free: FREE_CHARS,
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
  e.gold += gold; progress(e, win, true);
  return { gold, why: win ? 'Thắng trận online' : 'Hoàn thành trận online' };
}
// local match reported by the client: bounded
function grantLocal(p, msg, now) {
  const e = ensure(p, now);
  const dur = +msg.dur || 0, diff = Math.max(0, Math.min(3, msg.diff | 0)), win = !!msg.win;
  if (dur < LOCAL_MIN_DUR) return { gold: 0, why: 'Trận quá ngắn, không tính thưởng' };
  if (now - e.local.last < LOCAL_MIN_GAP_MS) return { gold: 0, why: 'Vừa nhận thưởng trận trước, chờ một chút' };
  e.local.last = now; progress(e, win, false);
  const want = win ? LOCAL_WIN[diff] : LOCAL_LOSS, gold = Math.max(0, Math.min(want, LOCAL_DAILY_CAP - e.local.gold));
  e.local.gold += gold; e.gold += gold;
  return { gold, why: gold < want ? 'Đã chạm trần vàng đấu bot hôm nay' : win ? 'Thắng trận' : 'Hoàn thành trận' };
}
function claimLogin(p, now) {
  const e = ensure(p, now), d = dayOf(now);
  if (e.login.day === d) return { gold: 0, why: 'Hôm nay đã nhận rồi' };
  const streak = e.login.day === d - 1 ? e.login.streak % LOGIN_REWARDS.length + 1 : 1;
  e.login = { day: d, streak };
  const gold = LOGIN_REWARDS[streak - 1]; e.gold += gold;
  return { gold, why: 'Quà đăng nhập ngày ' + streak };
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

// ---- gear: owned items and what is worn (one per slot). The catalogue (prices, stats) is in sim.js.
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

module.exports = { buyGear, equip, equipped, ensure, view, grantOnline, grantLocal, claimLogin, claimQuest, buyChar, canUse, dayOf, PRICES, FREE_CHARS, MUST_OWN, QUESTS, LOGIN_REWARDS, LOCAL_DAILY_CAP, START_GOLD, LOCAL_WIN, LOCAL_LOSS, ONLINE_WIN, ONLINE_LOSS };
