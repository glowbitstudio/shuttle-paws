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
// the module must stay private and the server must route every economy change through it
const server = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
assert(!/PUBLIC = new Set\(\[[^\]]*economy/.test(server), 'economy.js must not be served');
for (const h of ['localResult', 'claimLogin', 'claimQuest', 'buyChar', 'wallet']) assert(server.includes(h + '(c'), h);
assert(server.includes('ownedChar(c, msg.char)'));
console.log('PASS economy: start state, grandfathered character, local grants (min length, rate limit, clamped input, daily cap), online grants, quests, login streak, day boundary, purchases, ownership');
