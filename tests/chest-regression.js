'use strict';
// Chests and diamonds: prices, odds, never a duplicate, fallback when a rarity is complete, diamond sources and their limits.
const assert = require('node:assert/strict'), S = require('../sim'), E = require('../economy');
const T0 = Date.UTC(2026, 10, 18, 3), DAY = 86400000;
const P = () => ({ secret: 's', name: 'a', wins: 0, played: 0 });
const lcg = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
// prices and payment
{ const p = P(); E.ensure(p, T0); assert.equal(p.eco.gems, 0); assert.equal(E.view(p, T0).gems, 0); assert.equal(E.view(p, T0).chests.length, 3);
  assert(!E.openChest(p, 'c0', 'gold', T0).ok, 'not enough gold'); p.eco.gold = 250;
  const r = E.openChest(p, 'c0', 'gold', T0, lcg(1)); assert(r.ok && p.eco.gold === 0 && p.eco.items.includes(r.item) && r.spent === 250);
  assert(!E.openChest(p, 'c0', 'gems', T0).ok, 'common chest is gold only'); assert(!E.openChest(p, 'c2', 'gold', T0).ok, 'epic chest is diamonds only'); assert(!E.openChest(p, 'zz', 'gold', T0).ok);
  p.eco.gems = 29; assert(!E.openChest(p, 'c2', 'gems', T0).ok); p.eco.gems = 30; const e = E.openChest(p, 'c2', 'gems', T0, lcg(2)); assert(e.ok && e.rar === 2 && p.eco.gems === 0);
  assert(!Object.values(p.eco.equip).includes(e.item), 'a chest item is not worn by itself'); }
// odds over many openings, and never an item already owned
for (const [id, pay] of [['c0', 'gold'], ['c1', 'gold']]) {
  const c = E.CHESTS.find((x) => x.id === id), n = [0, 0, 0], rnd = lcg(77); let N = 4000;
  for (let i = 0; i < N; i++) { const p = P(); E.ensure(p, T0); p.eco.gold = 5000; const r = E.openChest(p, id, pay, T0, rnd); assert(r.ok); n[r.rar]++; }
  for (let k = 0; k < 3; k++) assert(Math.abs(n[k] / N * 100 - c.odds[k]) < 3, id + ' rarity ' + k + ': ' + (n[k] / N * 100).toFixed(1) + '% vs ' + c.odds[k]);
}
{ const p = P(); E.ensure(p, T0); p.eco.gold = 1e9; const rnd = lcg(5), got = new Set();
  for (let i = 0; i < S.GEAR.length; i++) { const r = E.openChest(p, 'c0', 'gold', T0, rnd); assert(r.ok, 'opening ' + i); assert(!got.has(r.item), 'duplicate ' + r.item); got.add(r.item); }
  assert.equal(got.size, S.GEAR.length, 'every item can come out; a complete rarity falls through to the others');
  const g0 = p.eco.gold; assert(!E.openChest(p, 'c0', 'gold', T0, rnd).ok); assert.equal(p.eco.gold, g0, 'nothing left: no charge'); }
// diamonds: online win, tournament title once a day, 7th login day
{ const p = P(); E.ensure(p, T0); assert.equal(E.grantOnline(p, true, T0).gems, 1); assert.equal(E.grantOnline(p, false, T0).gems, 0); assert.equal(p.eco.gems, 1);
  const a = E.grantLocal(p, { win: true, champ: true, diff: 3, dur: 120 }, T0); assert.equal(a.gems, 10);
  const b = E.grantLocal(p, { win: true, champ: true, diff: 3, dur: 120 }, T0 + 60000); assert.equal(b.gems, 0, 'one title a day');
  assert.equal(E.grantLocal(p, { win: false, champ: true, diff: 3, dur: 120 }, T0 + DAY).gems, 0, 'a lost final gives nothing');
  assert.equal(E.grantLocal(p, { win: true, champ: true, diff: 3, dur: 10 }, T0 + DAY + 60000).gems || 0, 0, 'too short');
  assert.equal(E.grantLocal(p, { win: true, champ: true, diff: 3, dur: 120 }, T0 + DAY + 120000).gems, 10); assert.equal(p.eco.gems, 21);
  const q = P(); let gems = 0; for (let d = 0; d < 7; d++) gems += E.claimLogin(q, T0 + d * DAY).gems; assert.equal(gems, 5); assert.equal(q.eco.gems, 5); }
console.log('PASS chests: prices, payment kinds, odds, no duplicates, complete-rarity fallback, no charge when nothing is left; diamonds from online wins, one tournament title a day, 7th login day');
