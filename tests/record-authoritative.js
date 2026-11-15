'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
let seed=89123;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const root=path.resolve(__dirname,'..'),S=require(path.join(root,'sim.js'));
// Usage: record-authoritative.js [output dir name] [ticks] [seed]. The output directory must not exist (inputs are immutable).
const output=path.join(root,process.argv[2]||'authoritative-replay-artifacts');const TICKS=+process.argv[3]||1800;const SEED0=+process.argv[4]||89123;seed=SEED0;if(process.argv[5]==='--dry'){const m=S.createMatch({mode:'1v1',points:21,games:1,venue:0,hitStop:false,autoSplit:true,slots:[{name:'Left',char:'cat',ctrl:'bot',diff:2,hand:'L'},{name:'Right',char:'frog',ctrl:'bot',diff:2,hand:'R'}]});const hits=[];for(let i=0;i<TICKS;i++){S.step(m,1/120);for(const e of m.events.splice(0))if(e.type==='hit')hits.push(i+':'+e.shot+':p'+e.i);}console.log(hits.join(' '));process.exit(0);}fs.mkdirSync(output);
const options={mode:'1v1',points:21,games:1,venue:0,hitStop:false,autoSplit:true,slots:[{name:'Left',char:'cat',ctrl:'bot',diff:2,hand:'L'},{name:'Right',char:'frog',ctrl:'bot',diff:2,hand:'R'}]};
const m=S.createMatch(options),dt=1/120,frames=[];
for(let i=0;i<TICKS;i++){S.step(m,dt);const events=m.events.splice(0);frames.push({tick:i,state:JSON.parse(JSON.stringify(m)),events});}
const bytes=JSON.stringify({dt,options,frames});fs.writeFileSync(path.join(output,'authoritative.json'),bytes);
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
fs.writeFileSync(path.join(output,'provenance.json'),JSON.stringify({initialSeed:SEED0,finalSeed:seed,dt,ticks:frames.length,simRawSHA256:hash(fs.readFileSync(path.join(root,'sim.js'))),gameRawSHA256:hash(fs.readFileSync(path.join(root,'game.js'))),inputSHA256:hash(bytes)},null,2));
fs.copyFileSync(path.join(root,'sim.js'),path.join(output,'sim.js.snapshot'));fs.copyFileSync(path.join(root,'game.js'),path.join(output,'game.js.snapshot'));
console.log('Recorded',frames.length,'ticks',hash(bytes));
