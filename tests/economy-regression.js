'use strict';
// Economy rules (server side): starting state, grants, caps, daily login streak, quests, purchases, ownership check.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const E = require('../economy'), S = require('../sim');
const DAY = 86400000, T0 = Date.UTC(2026, 10, 16, 3, 0, 0);          // 10:00 Vietnam time
// every priced / free id is a real character, nothing is both free and priced, all 16 are covered
for (const id of [...E.FREE_CHARS, ...Object.keys(E.PRICES)]) assert(S.CHARS.some((c) => c.id === id), id);
assert.equal(new Set([...E.FREE_CHARS, ...Object.keys(E.PRICES)]).size, S.CHARS.length);
for (const id of E.MUST_OWN) assert(E.PRICES[id] > 0);
// new player
let p = {}; E.ensure(p, T0, 'cat');
assert.equal(p.eco.gold, E.START_GOLD); assert.deepEqual(p.eco.owned, E.FREE_CHARS);
// a player from before the shop keeps the priced character they were using
let old = {}; E.ensure(old, T0, 'fox'); assert(old.eco.owned.includes('fox')); assert(E.canUse(old, 'fox', T0)); assert(!E.canUse(p, 'fox', T0));
assert(E.canUse(p, 'cat', T0)); assert(E.canUse(p, 'dragon', T0));    // achievement characters are not gated here
// local grants: too short, then ok, then rate-limited
assert.equal(E.grantLocal(p, { win: true, diff: 3, dur: 10 }, T0).gold, 0);
assert.equal(E.grantLocal(p, { win: true, diff: 3, dur: 120 }, T0).gold, E.LOCAL_WIN[3]);
assert.equal(E.grantLocal(p, { win: true, diff: 3, dur: 120 }, T0 + 5000).gold, 0);
assert.equal(E.grantLocal(p, { win: false, diff: 0, dur: 120 }, T0 + 60000).gold, E.LOCAL_LOSS);
assert.equal(E.grantLocal(p, { win: true, diff: 99, dur: 1e9 }, T0 + 120000).gold, E.LOCAL_WIN[3]);   // bad input is clamped
assert.equal(p.eco.gold, E.START_GOLD + 2 * E.LOCAL_WIN[3] + E.LOCAL_LOSS);
// daily cap on local gold; it resets the next day
let q = {}; E.ensure(q, T0, 'cat'); let t = T0, got = 0;
for (let i = 0; i < 40; i++) { t += 60000; got += E.grantLocal(q, { win: true, diff: 3, dur: 100 }, t).gold; }
assert.equal(got, E.LOCAL_DAILY_CAP); assert.equal(E.view(q, t).localLeft, 0);
assert.equal(E.grantLocal(q, { win: true, diff: 3, dur: 100 }, t + DAY).gold, E.LOCAL_WIN[3]);
// online grants are not capped
assert.equal(E.grantOnline(q, true, t).gold, E.ONLINE_WIN); assert.equal(E.grantOnline(q, false, t).gold, E.ONLINE_LOSS);
// quests: progress, claim once, not before done, reset next day
let r = {}; E.ensure(r, T0, 'cat');
assert.equal(E.claimQuest(r, 'play3', T0).gold, 0);
E.grantOnline(r, true, T0); E.grantOnline(r, true, T0); E.grantOnline(r, false, T0);
let v = E.view(r, T0); assert.deepEqual(v.quests.map((x) => x.prog), [3, 2, 1]);
const before = r.eco.gold;
assert.equal(E.claimQuest(r, 'play3', T0).gold, 60); assert.equal(E.claimQuest(r, 'play3', T0).gold, 0); assert.equal(E.claimQuest(r, 'nope', T0).gold, 0);
assert.equal(E.claimQuest(r, 'win2', T0).gold, 80); assert.equal(E.claimQuest(r, 'online1', T0).gold, 100); assert.equal(r.eco.gold, before + 240);
v = E.view(r, T0 + DAY); assert(v.quests.every((x) => x.prog === 0 && !x.claimed));
// daily login: once a day, streak grows on consecutive days, wraps after 7, restarts after a gap
let l = {}; E.ensure(l, T0, 'cat'); const g0 = l.eco.gold; let sum = 0;
assert(E.view(l, T0).login.can); assert.equal(E.view(l, T0).login.reward, E.LOGIN_REWARDS[0]);
for (let d = 0; d < 8; d++) { const g = E.claimLogin(l, T0 + d * DAY).gold; assert.equal(g, E.LOGIN_REWARDS[d % 7], 'day ' + d); sum += g; assert.equal(E.claimLogin(l, T0 + d * DAY + 1000).gold, 0); assert(!E.view(l, T0 + d * DAY).login.can); }
assert.equal(l.eco.gold, g0 + sum);
assert.equal(E.claimLogin(l, T0 + 10 * DAY).gold, E.LOGIN_REWARDS[0]);   // missed two days: back to day 1
// day boundary is midnight Vietnam time (17:00 UTC)
assert.equal(E.dayOf(Date.UTC(2026, 10, 16, 16, 59)) + 1, E.dayOf(Date.UTC(2026, 10, 16, 17, 1)));
// purchases
let b = {}; E.ensure(b, T0, 'cat');
assert(!E.buyChar(b, 'fox', T0).ok); assert(!E.buyChar(b, 'cat', T0).ok); assert(!E.buyChar(b, 'constructor', T0).ok); assert(!E.buyChar(b, 'nobody', T0).ok);
b.eco.gold = 700; const bought = E.buyChar(b, 'fox', T0); assert(bought.ok); assert.equal(b.eco.gold, 100); assert(E.canUse(b, 'fox', T0)); assert(!E.buyChar(b, 'fox', T0).ok);
assert(b.eco.gold >= 0);
// ---- gear catalogue: 9 slots, each with at least one item of every rarity (neck has two of each), unique ids, every item has a plus and a minus, net value by rarity
assert.equal(S.GEAR.length, 162); assert.equal(new Set(S.GEAR.map((g) => g.id)).size, 162); assert.equal(S.GEAR_SLOTS.length, 9);
for (const [slot] of S.GEAR_SLOTS) assert.deepEqual([...new Set(S.GEAR.filter((g) => g.slot === slot).map((g) => g.rar))].sort().slice(0, 3), [0, 1, 2], slot);
for (const g of S.GEAR) {
  const v = Object.values(g.mods); assert(v.some((x) => x > 0) && v.some((x) => x < 0), g.id + ' must trade something');
  assert(Math.abs(v.reduce((x, y) => x + y, 0) - [0.25, 0.5, 0.75, 1][g.rar]) < 1e-9, g.id + ' net'); assert(g.price > 0 && g.name && g.desc);
}
// no gear = exactly the old numbers; power 1800 for everyone; best set stays under the cap
for (const c of S.CHARS) { assert.deepEqual(S.charStats(c.id), S.charStats(c.id, [])); assert.equal(S.powerOf(c.id), 1800); }
const best = S.GEAR.filter((g) => g.rar === 2).map((g) => g.id);
{ const pw = S.powerOf('cat', best); assert(pw > 1800 && pw <= 1800 + 9 * 75 + 50, 'all-epic outfit power ' + pw); }
// outfit sets: 6 sets of 5 pieces in 5 different slots; 3 pieces +0.25, 5 pieces +0.5 on the set's stat
assert.equal(S.GEAR_SETS.length, 22); for (const st of S.GEAR_SETS) { const ps = S.GEAR.filter((g) => g.set === st.id); assert.equal(ps.length, 6); assert.equal(new Set(ps.map((g) => g.slot)).size, 6); assert.equal(new Set(ps.map((g) => g.rar)).size, 1); }
{ const nj = S.GEAR.filter((g) => g.set === 'ninja').map((g) => g.id), raw = (ids) => ids.reduce((a, id) => a + (S.gearById(id).mods.spd || 0), 0);
  assert.equal(S.gearMods(nj.slice(0, 2)).spd, raw(nj.slice(0, 2))); assert.equal(S.gearMods(nj.slice(0, 3)).spd, Math.min(2, raw(nj.slice(0, 3)) + 0.25)); assert.equal(S.gearMods(nj.slice(0, 5)).spd, Math.min(2, raw(nj.slice(0, 5)) + 0.5)); assert.equal(S.gearMods(nj).spd, Math.min(2, raw(nj) + 0.75));
  assert.deepEqual(S.setBonus(nj).map((b) => [b.id, b.n, b.bonus]), [['ninja', 6, 0.75]]); assert.deepEqual(S.setBonus(['r_light']), []); }  //   // 9 epics = +675, one stat runs into the +2 cap assert(Object.values(S.gearMods(best)).every((x) => Math.abs(x) <= S.GEAR_STAT_CAP));
// one item per slot, unknown ids ignored, the stat really moves in the match
assert.equal(S.powerOf('cat', ['r_light', 'r_heavy', 'bogus']), 1850);
assert(S.charStats('cat', ['r_heavy']).power > S.charStats('cat').power); assert(S.charStats('cat', ['r_heavy']).endurance > S.charStats('cat').endurance);
const gm = S.createMatch({ mode: '1v1', points: 11, venue: 0, slots: [{ name: 'a', char: 'cat', ctrl: 'human', gear: ['s_run', 'nope'] }, { name: 'b', char: 'cat', ctrl: 'bot', diff: 1 }] });
assert.deepEqual(gm.athletes[0].gear, ['s_run']); assert(gm.athletes[0].st.speed > gm.athletes[1].st.speed); assert.deepEqual(gm.athletes[1].gear, []);
// ---- buying and wearing
let w = {}; E.ensure(w, T0, 'cat'); w.eco.gold = 1000;
assert(!E.buyGear(w, 'r_pro', T0).ok); assert(!E.buyGear(w, 'bogus', T0).ok); assert(!E.equip(w, 'racket', 'r_light', T0).ok);   // too dear, unknown, not owned
assert(E.buyGear(w, 'r_light', T0).ok); assert.equal(w.eco.gold, 700); assert(!E.buyGear(w, 'r_light', T0).ok);
assert.deepEqual(E.equipped(w, T0), ['r_light']);                                                           // worn on purchase
assert(E.buyGear(w, 's_run', T0).ok); assert.deepEqual(E.equipped(w, T0).sort(), ['r_light', 's_run']);
assert(!E.equip(w, 'shoes', 'r_light', T0).ok); assert(!E.equip(w, 'hat', 's_run', T0).ok);               // wrong slot, unknown slot
assert(E.equip(w, 'racket', null, T0).ok); assert.deepEqual(E.equipped(w, T0), ['s_run']);
assert(E.equip(w, 'racket', 'r_light', T0).ok); w.eco.equip.head = 'h_pro'; assert(!E.equipped(w, T0).includes('h_pro'));   // a forged record entry is not honoured
v = E.view(w, T0); assert.deepEqual(v.items.sort(), ['r_light', 's_run']); assert.equal(v.equip.racket, 'r_light'); assert.equal(w.eco.gold, 400);
// the module must stay private and the server must route every economy change through it
const server = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
assert(!/PUBLIC = new Set\(\[[^\]]*economy/.test(server), 'economy.js must not be served');
for (const h of ['localResult', 'claimLogin', 'claimQuest', 'buyChar', 'buyGear', 'equip', 'wallet']) assert(server.includes(h + '(c'), h);
assert(server.includes('ownedChar(c, msg.char)'));
console.log('PASS economy: start state, grandfathered character, local grants (min length, rate limit, clamped input, daily cap), online grants, quests, login streak, day boundary, purchases, ownership, gear catalogue / stat rules / buying / wearing');
