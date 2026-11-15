'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
function load(file){let seed=12345;const math=Object.create(Math);math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);const box={module:{exports:{}},Math:math};let src=fs.readFileSync(file,'utf8');src=src.replace('  DT, G, DRAG,','  _test: {useStamina, restAll, awardPoint, moveAthlete, doHit, tickHuman, tickBot, tired},\n  DT, G, DRAG,');vm.runInNewContext(src,box);return box.module.exports;}
const after=load(path.join(__dirname,'../sim.js')),before=load(path.join(__dirname,'stamina-before.js'));
function create(S,id,points=21){return S.createMatch({mode:'1v1',points,games:3,venue:0,firstServe:0,moveAssist:false,autoSave:false,slots:[{char:id,ctrl:'human',assist:1},{char:'cat',ctrl:'human',assist:1}]});}
function shot(S,m,type){m.state='rally';m.serveShot=false;m.shuttle.p={x:0,y:2.5,z:3};S._test.doHit(m,m.athletes[0],type,{x:0,z:-5},1);m.events.length=0;}
function run(S,m,seconds){m.state='rally';const a=m.athletes[0];for(let i=0;i<seconds*120;i++){a.x=0;a.z=4;S._test.moveAthlete(m,a,1,0,a.st.speed,S.DT);}}
// Controlled representative workload, not a claim about live rally distributions:
// alternating 11-8 / 21-18 game; each rally 8 seconds full running, 3 clears,
// 1 net shot, and one smash every other rally. Real point/interval recovery runs.
function game(S,id,P,heavy=false){const m=create(S,id,P);let n=0;while(m.state!=='gameBreak'&&m.state!=='overPending'){
 run(S,m,8);if(heavy){for(let j=0;j<4;j++)shot(S,m,'smash');}else{for(let j=0;j<3;j++)shot(S,m,'clear');shot(S,m,'net');if(n%2===0)shot(S,m,'smash');}
 const winner=n<(P-3)*2?n%2:0;S._test.awardPoint(m,winner,'script');n++;if(n>70)throw Error('bad script');}
 return m.athletes[0].sta;}
function percent(x){return +(x*100).toFixed(1)}
const rows=after.CHARS.map(c=>({id:c.id,oldMult:before.charStats(c.id).endurance,newMult:after.charStats(c.id).endurance,old11:percent(game(before,c.id,11)),new11:percent(game(after,c.id,11)),old21:percent(game(before,c.id,21)),new21:percent(game(after,c.id,21)),oldHeavy:percent(game(before,c.id,11,true)),newHeavy:percent(game(after,c.id,11,true))}));console.table(rows);
// 2026-11 rebalance: stamina stat spreads drain/recovery 0.89x..1.11x (was 0.92x..1.08x), recovery is divided by the same factor, and the
// between-point rest now restores 1% + 5% of the missing bar (was a flat 1.4%) so long games settle instead of bottoming out.
// Original spread (<.2) and floors (>.45 / >.1) still hold; only the ceiling moves on purpose: <.85 -> <.9 (measured .875 at 11 pts).
for(const P of [11,21]){const values=after.CHARS.map(c=>game(after,c.id,P));console.log('workload',P,'min',Math.min(...values).toFixed(3),'max',Math.max(...values).toFixed(3));assert(Math.max(...values)-Math.min(...values)<.2);assert(Math.max(...values)<.9);assert(Math.min(...values)>(P===11?.45:.1));}
// same-endurance characters still land together: the spread comes only from the stamina stat
for(const P of [11]){const by={};for(const c of after.CHARS){const k=c.stats.sta;(by[k]=by[k]||[]).push(game(after,c.id,P));}for(const k in by)assert(Math.max(...by[k])-Math.min(...by[k])<.02);const mean=k=>by[k].reduce((a,b)=>a+b)/by[k].length;const ks=Object.keys(by).map(Number).sort((a,b)=>a-b);for(let i=1;i<ks.length;i++)assert(mean(ks[i])>mean(ks[i-1]));}
for(const c of after.CHARS){let m=create(after,c.id),a=m.athletes[0];const E=after.charStats(c.id).endurance;assert(E>=.89-1e-9&&E<=1.11+1e-9);const costs={};for(const type of ['net','clear','smash']){a.sta=1;shot(after,m,type);costs[type]=1-a.sta;}assert(costs.smash>costs.clear&&costs.clear>costs.net);assert(costs.smash<.025);
 a.sta=1;for(let j=0;j<20;j++)shot(after,m,'smash');assert(Math.abs(a.sta-(1-.28*E))<1e-6&&a.sta>.68&&a.sta<.76);   // was .70-.75 for everyone; now .28 x endurance (cat still .72)
 a.sta=1;run(after,m,60);assert(a.sta>1-.1*E&&a.sta<1-.07*E);   // was .90-.93 for everyone; now scales with endurance (cat unchanged)
 a.sta=1;m.state='rally';a.jumpY=0;a.vy=0;a.input.jump=true;after._test.tickHuman(m,a,after.DT);assert(1-a.sta>costs.clear);assert(1-a.sta<costs.smash);
 a.sta=.4;after._test.restAll(m,.12);assert(Math.abs(a.sta-(.4+.12/E))<1e-9);   // recovery is now divided by endurance (cat still .52)after._test.restAll(m,1);assert.equal(a.sta,1);
 let last=-1;for(let i=100;i>=0;i--){a.sta=i/100;const f=after.fatigue(a);assert(f>=last);last=f;assert(after._test.tired.move(a)>=.75);}
 m=create(after,c.id);a=m.athletes[0];a.sta=.2;m.state='gameBreak';m.stateT=3.3;after.step(m);assert(Math.abs(a.sta-(.2+.28/E))<1e-9);   // cat still .48
}
console.log('PASS all '+after.CHARS.length+' characters: 11/21-point workload range, non-perpetual consumption, 20-smash reserve, running, action hierarchy, monotone fatigue, interval/rest and game recovery');
