const S=require(process.argv[2]);
function run({assist,pressAt,hold,out}){
  const m=S.createMatch({mode:'1v1',points:11,venue:0,firstServe:0,moveAssist:false,autoSave:false,slots:[{char:'cat',ctrl:'human',assist:1},{char:'cat',ctrl:'human',assist}]});
  const a=m.athletes[1]; const sg=Math.sign(a.z)||1;
  m.state='rally'; m.clock=1; m.wind={x:0,z:0};
  // shuttle launched from the far side toward the receiver; lands in (z=4) or long (out: beyond baseline)
  const p={x:0,y:2.2,z:-sg*3}, v={x:0,y:out?9:6,z:sg*(out?21:9)};
  Object.assign(m.shuttle,{held:false,live:true,landed:false,netted:false,last:0,lastTeam:0,p:{...p},v:{...v}});
  const r=S.simLand(p,v,m.wind); m.shuttle.pred={x:r.x,z:r.z,t:r.t,inside:Math.abs(r.z)<=S.HALF_L};
  a.x=0; a.z=sg*Math.min(Math.abs(r.z)-0.2,S.HALF_L-0.1);   // stand right where it comes down (at the baseline for the long one)
  let hit=false,t=0;
  while(m.shuttle.live&&t<600){ if(hold) a.input.hold=true,a.input.holdPower=.5; if(pressAt!==undefined&&t===pressAt){a.input.hit=true;a.input.power=.5;}
    S.step(m); if(m.shuttle.lastTeam===1) {hit=true;break;} t++; }
  return {hit,landZ:+Math.abs(r.z).toFixed(2),ticks:t};
}
for(const c of [{assist:1,pressAt:5},{assist:1,pressAt:5,out:true},{assist:1,hold:true},{assist:1,hold:true,out:true},{assist:0,hold:true},{assist:1},{assist:1,out:true}]) console.log(JSON.stringify(c),JSON.stringify(run(c)));
