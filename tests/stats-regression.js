'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict');
function load(name){let seed=123;const math=Object.create(Math);math.random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);const box={module:{exports:{}},Math:math};let src=fs.readFileSync(path.join(__dirname,name),'utf8').replace('  DT, G, DRAG,','  _hit: doHit,\n  DT, G, DRAG,');vm.runInNewContext(src,box);return box.module.exports}
function match(S,id){return S.createMatch({mode:'1v1',points:11,venue:0,firstServe:0,moveAssist:false,autoSave:false,slots:[{char:id,ctrl:'human',assist:1},{char:'cat',ctrl:'human',assist:1}]})}
function rally(m){m.state='rally';m.clock=1;Object.assign(m.shuttle,{held:false,live:false,landed:true});m.athletes[0].x=0;m.athletes[0].z=4;}
function measure(file,id){const S=load(file),m=match(S,id),a=m.athletes[0];rally(m);a.input.x=1;for(let i=0;i<30;i++)S.step(m);const sprint=a.x;a.input.x=0;a.input.jump=true;let peak=0;for(let i=0;i<150;i++){S.step(m);peak=Math.max(peak,a.jumpY)}
 const sm=match(S,id),h=sm.athletes[0];rally(sm);h.x=0;h.z=3;h.input.hit=true;h.input.power=.85;Object.assign(sm.shuttle,{held:false,live:true,landed:false,last:1,lastTeam:1,p:{x:0,y:1.7,z:3},v:{x:0,y:-1,z:0}});S.step(sm);const hit=sm.events.find(e=>e.type==='hit');assert(hit&&hit.shot==='smash');
 return {spd:S.charStats(id).speed,sprint,peak,reach:1.05*S.charStats(id).reach*1.08,smash:hit.speed,contact:hit.y};}
const S=load('../sim.js');const table=S.CHARS.map(c=>{const a=measure('stats-before.js',c.id),b=measure('../sim.js',c.id);return{id:c.id,sprintOld:+a.sprint.toFixed(3),sprint:+b.sprint.toFixed(3),jumpOld:+a.peak.toFixed(3),jump:+b.peak.toFixed(3),reach:+b.reach.toFixed(3),smashOld:+a.smash.toFixed(1),smash:+b.smash.toFixed(1),contact:+b.contact.toFixed(2)}});console.table(table);
const fast=measure('../sim.js','bunny'),slow=measure('../sim.js','bear');assert(fast.sprint/slow.sprint>1.06);assert(measure('../sim.js','frog').peak/slow.peak>1.2);assert(measure('../sim.js','panda').reach/measure('../sim.js','frog').reach>1.015);assert(measure('../sim.js','bear').smash>measure('../sim.js','hamster').smash*1.12);
// Second pass (user decision: skill-based game, stats are flavour worth ~+5..10 pp per +2 points): every spread was roughly halved again.
// Thresholds: sprint 1.12 -> 1.06 (measured 1.085), jump peak 1.5 -> 1.2 (1.27), reach 1.04 -> 1.015 (1.021), smash speed 1.2 -> 1.12 (1.165).
// 2026-11 rebalance (tests/balance-marginal.js): speed and reach were worth ~+40 pp win rate per +2 stat points, 3x any other stat,
// so their spreads were narrowed on purpose. Thresholds above follow the new formulas: sprint 1.2 -> 1.12 (spd 5 vs 2), reach 1.2 -> 1.04 (rch 5 vs 2).
// Isolate control while preserving other stats: same RNG, shot, target and q.
function accuracy(file,ctl,q){const S=load(file),m=match(S,'cat'),a=m.athletes[0];a.st.control=ctl;rally(m);m.shuttle.p={x:0,y:2,z:3};S._hit(m,a,'clear',{x:1,z:-5},q);return {v:{...m.shuttle.v},land:S.simLand(m.shuttle.p,m.shuttle.v,m.wind)}}
for(const file of ['stats-before.js','../sim.js']){const low=accuracy(file,.8,.75),high=accuracy(file,1.2,.75);const err=r=>Math.hypot(r.land.x-1,r.land.z+5);console.log(file,'same Good clear low/high control landing errors:',err(low).toFixed(3),err(high).toFixed(3));if(file==='../sim.js')assert(err(high)<err(low));else assert.deepEqual(low.v,high.v);const p=accuracy(file,.8,1),r=accuracy(file,1.2,1);assert.deepEqual(p.v,r.v);}
// Assisted actual human path uses control too: same delayed buffered press and shot.
function buffered(ctl){const S=load('../sim.js'),m=match(S,'cat'),a=m.athletes[0];rally(m);a.x=0;a.z=3;a.st.control=ctl;a.hitQueue=.2;a.hitPower=.5;Object.assign(m.shuttle,{live:true,landed:false,lastTeam:1,last:1,p:{x:0,y:1.7,z:3},v:{x:0,y:-1,z:0}});S.step(m);assert(m.events.some(e=>e.type==='hit'));return m.shuttle.v;}
assert.notDeepEqual(buffered(.8),buffered(1.2));
console.log('PASS actual human sprint/jump/assisted smash, reach tradeoffs, Good accuracy with identical input, Perfect invariant, assisted buffered control');
