#!/bin/sh
# Win rate of a baseline 3/3/3/3/3/3 bot wearing each full outfit set (5 pieces + set bonus), and the strongest 9-slot outfit, against the same bot without gear.
cd "$(dirname "$0")/.."
node -e "
const S=require('./sim');const out=[];
const spec=(ids)=>{const m=S.gearMods(ids);return Object.keys(m).filter(k=>m[k]).map(k=>k+'='+(3+m[k])).join(',');};
for(const st of S.GEAR_SETS)out.push(st.id+' '+spec(S.GEAR.filter(g=>g.set===st.id).map(g=>g.id)));
const set=(id,lv)=>S.GEAR.filter(g=>g.set===id).map(g=>g.id+(lv?'+'+lv:''));
out.push('samurai-lv5 '+spec(set('samurai',5)));out.push('angel-lv5 '+spec(set('angel',5)));out.push('ninja-lv5 '+spec(set('ninja',5)));
out.push('samurai+4epic '+spec(set('samurai').concat(['r_pro','w_pro','e_pro','n_medal'])));
out.push('samurai-lv5+4epic-lv5 '+spec(set('samurai',5).concat(['r_pro+5','w_pro+5','e_pro+5','n_medal+5'])));
out.push('basic9 '+spec(['r_pro','s_pro','t_pro','p_pro','w_pro','h_pro','e_pro','n_medal','b_wings']));
console.log(out.join('\n'));" | while read name spec; do
  r=$(node tests/balance-marginal.js --one "$spec" --games ${GAMES:-200} --diff 3 --points 11 | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s.slice(s.indexOf("{")));console.log(j.win+"% +-"+j.ci95+" over "+j.games+" games")})')
  echo "$name [$spec] -> $r"
done
