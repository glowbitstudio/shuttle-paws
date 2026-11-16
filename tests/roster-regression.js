'use strict';
// V2 roster: exactly the 16 original characters (no fan/chibi entries, no generated manifest roster).
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const S=require('../sim');
const old=['cat','bunny','bear','panda','fox','frog','penguin','duck','hamster','dog','sheep','koala','tiger','otter','unicorn','dragon'];
assert.deepEqual(S.CHARS.map(c=>c.id),old);
for(const c of S.CHARS) assert(!('tft' in c),c.id+' must not reference an external model');
const baseline=require('./stats-before');
// 2026-11 balance decision: no character may be stronger through a bigger stat total, so the original 16 records are no longer frozen.
// Everything except the stat values must still match the original record, and EVERY character's six stats (integers 1..5) must total 18.
// 2026-11-16: the 16 were redrawn in an own house style, so the fur colours are no longer frozen either.
const sansStats=c=>{const o={...c};delete o.stats;for(const k of ['body','belly','earIn','earCol'])delete o[k];return o;};
// 2026-11-13: dragon's description was rewritten after stat totals were equalised (it no longer is 'strong all round').
const sansText=(c)=>{const o=sansStats(c); if(c.id==='dragon') delete o.desc; return o;};
for(const id of old) assert.deepEqual(sansText(S.CHARS.find(c=>c.id===id)),sansText(baseline.CHARS.find(c=>c.id===id)));
for(const c of S.CHARS){assert.deepEqual(Object.keys(c.stats),['spd','jmp','pow','rch','ctl','sta']);assert.equal(Object.values(c.stats).reduce((a,b)=>a+b,0),18,c.id+' stat total');for(const v of Object.values(c.stats)){assert(Number.isInteger(v)&&v>=1&&v<=5);}}
// identity kept: an original top stat is still a top stat and an original lowest stat is still a lowest (ties may be broken)
for(const id of old){const n=S.CHARS.find(c=>c.id===id).stats,o=baseline.CHARS.find(c=>c.id===id).stats,ks=Object.keys(o);const hi=Math.max(...ks.map(k=>o[k])),lo=Math.min(...ks.map(k=>o[k])),nh=Math.max(...ks.map(k=>n[k])),nl=Math.min(...ks.map(k=>n[k]));assert(ks.filter(k=>o[k]===hi).some(k=>n[k]===nh),id+' top stat');assert(ks.filter(k=>o[k]===lo).some(k=>n[k]===nl),id+' low stat');}
assert(/dragon[^\n]*Đập như phun lửa/.test(fs.readFileSync(path.join(__dirname,'../sim.js'),'utf8')));
const server=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');
assert(server.includes('Sim.CHARS.some((c) => c.id === id)'));
for(const f of ['sim.js','game.js','server.js','index.html']) assert(!/tft-generated|staging\/khada|manifest\.json/.test(fs.readFileSync(path.join(__dirname,'..',f),'utf8')),f+' must stay free of chibi roster/assets');
console.log('PASS '+S.CHARS.length+' unique IDs = the 16 originals, records intact apart from stats, all stat totals = 18, identities kept, shared server validation, no chibi roster');
