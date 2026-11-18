'use strict';
// Chests, diamonds and shards: prices, odds, duplicates -> shards, crafting, upgrades, sets for diamonds, diamond sources and their limits.
const assert = require('node:assert/strict'), S = require('../sim'), E = require('../economy');
const T0 = Date.UTC(2026, 10, 18, 3), DAY = 86400000;
const P = () => ({ secret: 's', name: 'a', wins: 0, played: 0 });
const lcg = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
// prices and payment
{ const p = P(); E.ensure(p, T0); assert.equal(p.eco.gems, 0); assert.equal(E.view(p, T0).gems, 0); assert.equal(E.view(p, T0).chests.length, 4);
  assert(!E.openChest(p, 'c0', 'gold', T0).ok, 'not enough gold'); p.eco.gold = 250;
  const r = E.openChest(p, 'c0', 'gold', T0, lcg(1)); assert(r.ok && p.eco.gold === 0 && p.eco.items.includes(r.item) && r.spent === 250);
  assert(!E.openChest(p, 'c0', 'gems', T0).ok, 'common chest is gold only'); assert(!E.openChest(p, 'c2', 'gold', T0).ok, 'epic chest is diamonds only'); assert(!E.openChest(p, 'zz', 'gold', T0).ok);
  p.eco.gems = 29; assert(!E.openChest(p, 'c2', 'gems', T0).ok); p.eco.gems = 30; const e = E.openChest(p, 'c2', 'gems', T0, lcg(2)); assert(e.ok && e.rar === 2 && p.eco.gems === 0);
  assert(!Object.values(p.eco.equip).includes(e.item), 'a chest item is not worn by itself'); }
// odds over many openings, and never an item already owned
for (const [id, pay] of [['c0', 'gold'], ['c1', 'gold']]) {
  const c = E.CHESTS.find((x) => x.id === id), n = [0, 0, 0, 0], rnd = lcg(77); let N = 4000;
  for (let i = 0; i < N; i++) { const p = P(); E.ensure(p, T0); p.eco.gold = 5000; const r = E.openChest(p, id, pay, T0, rnd); assert(r.ok); n[r.rar]++; }
  for (let k = 0; k < 4; k++) assert(Math.abs(n[k] / N * 100 - c.odds[k]) < 3, id + ' rarity ' + k + ': ' + (n[k] / N * 100).toFixed(1) + '% vs ' + c.odds[k]);
}
// a duplicate turns into shards; nothing is lost and the item list never holds an id twice
{ const p = P(); E.ensure(p, T0); p.eco.gold = 1e9; const rnd = lcg(5); let dups = 0, sh = 0;
  for (let i = 0; i < 600; i++) { const r = E.openChest(p, 'c0', 'gold', T0, rnd); assert(r.ok); if (r.dup) { dups++; sh += r.shards; assert.equal(r.shards, E.DUP_SHARDS[r.rar]); } }
  assert(dups > 0 && p.eco.shards === sh); assert.equal(new Set(p.eco.items).size, p.eco.items.length); assert(p.eco.items.length > 60, 'most items turn up in 600 openings: ' + p.eco.items.length); }
// shards: craft a missing item, upgrade an owned one (3 levels, +0.1 on its strongest plus), packs
{ const p = P(); E.ensure(p, T0); assert(!E.craftGear(p, 'nj_head', T0).ok, 'no shards'); p.eco.shards = 60;
  const c = E.craftGear(p, 'nj_head', T0); assert(c.ok && p.eco.shards === 0 && p.eco.items.includes('nj_head')); assert(!E.craftGear(p, 'nj_head', T0).ok, 'already owned');
  assert(!E.upgradeGear(p, 'r_pro', T0).ok, 'not owned'); p.eco.shards = E.UP_COST[1].reduce((a, b) => a + b, 0) + 5; E.equip(p, 'head', 'nj_head', T0); assert.equal(S.GEAR_MAX_LV, 5); assert.deepEqual(E.UP_COST[1], [16, 40, 80, 140, 220]);
  for (let l = 1; l <= 5; l++) { const u = E.upgradeGear(p, 'nj_head', T0); assert(u.ok && u.lv === l); }
  assert.equal(p.eco.shards, 5); assert(!E.upgradeGear(p, 'nj_head', T0).ok, 'max level');
  assert.deepEqual(E.equipped(p, T0), ['nj_head+5']); assert.equal(S.gearMods(['nj_head+3']).spd, 1.3); assert.equal(S.gearMods(['nj_head']).spd, 1); assert.equal(S.gearMods(['nj_head+9']).spd, 1.5, 'level is capped');
  assert.equal(S.gearById('nj_head+3').id, 'nj_head'); assert.equal(S.powerOf('cat', ['nj_head+3']), S.powerOf('cat', ['nj_head']) + 30);
  p.eco.gold = 400; assert(E.buyShards(p, 's0', T0).ok && p.eco.gold === 0 && p.eco.shards === 10); assert(!E.buyShards(p, 's1', T0).ok); p.eco.gems = 10; assert(E.buyShards(p, 's1', T0).ok && p.eco.gems === 0 && p.eco.shards === 35); }
// sets: whole set for diamonds (owned pieces come off the price); set pieces are not sold one by one for gold
{ const p = P(); E.ensure(p, T0); p.eco.gold = 99999; assert(!E.buyGear(p, 'nj_head', T0).ok, 'set piece not sold for gold'); assert(E.buyGear(p, 'r_light', T0).ok);
  assert.equal(E.setPrice(p.eco, 'ninja'), 150); assert(!E.buySet(p, 'ninja', T0).ok, 'no diamonds'); p.eco.shards = 60; E.craftGear(p, 'nj_head', T0); assert.equal(E.setPrice(p.eco, 'ninja'), 120);
  p.eco.gems = 120; const b = E.buySet(p, 'ninja', T0); assert(b.ok && p.eco.gems === 0); assert.equal(S.GEAR.filter((g) => g.set === 'ninja').every((g) => p.eco.items.includes(g.id) && p.eco.equip[g.slot] === g.id), true);
  assert(!E.buySet(p, 'ninja', T0).ok, 'already complete'); assert(!E.buySet(p, 'nope', T0).ok); const v = E.view(p, T0); assert(v.rules && v.rules.setGems.length === 4 && E.setPrice(P().eco || (E.ensure(p, T0), { items: [] }), 'angel') === 700 && typeof v.shards === 'number' && v.lv); }
// diamonds: online win, tournament title once a day, 7th login day
{ const p = P(); E.ensure(p, T0); assert.equal(E.grantOnline(p, true, T0).gems, 1); assert.equal(E.grantOnline(p, false, T0).gems, 0); assert.equal(p.eco.gems, 1);
  const a = E.grantLocal(p, { win: true, champ: true, diff: 3, dur: 120 }, T0); assert.equal(a.gems, 10);
  const b = E.grantLocal(p, { win: true, champ: true, diff: 3, dur: 120 }, T0 + 60000); assert.equal(b.gems, 0, 'one title a day');
  assert.equal(E.grantLocal(p, { win: false, champ: true, diff: 3, dur: 120 }, T0 + DAY).gems, 0, 'a lost final gives nothing');
  assert.equal(E.grantLocal(p, { win: true, champ: true, diff: 3, dur: 10 }, T0 + DAY + 60000).gems || 0, 0, 'too short');
  assert.equal(E.grantLocal(p, { win: true, champ: true, diff: 3, dur: 120 }, T0 + DAY + 120000).gems, 10); assert.equal(p.eco.gems, 21);
  const q = P(); let gems = 0; for (let d = 0; d < 7; d++) gems += E.claimLogin(q, T0 + d * DAY).gems; assert.equal(gems, 5); assert.equal(q.eco.gems, 5); }
console.log('PASS chests: prices, payment kinds, odds, duplicates become shards; crafting, upgrade levels, shard packs, diamond-priced sets; diamonds from online wins, one tournament title a day, 7th login day');
