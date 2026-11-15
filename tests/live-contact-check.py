# Usage: live-contact-check.py <port> <game.js file to serve> <out json> [frame steps in sim ticks, default 1,2,4,8]
# Is the 28-32 cm "contact error" seen in real-time headless play a frame-rate artefact or a real error?
# The page's real main loop (frame -> frameLocal -> S.step ... -> animateAthlete) is driven by hand: requestAnimationFrame
# is captured and called with a fixed time step. With a step of exactly one sim tick the stroke frame IS the hit tick; with
# larger steps the hit happens inside the frame and the first drawn stroke frame is up to (step-1) ticks late.
# A scripted human (assist 1, presses PHONG / DAP / BO NHO in turn while the shuttle is incoming) rallies against a bot.
# Recorded per clip contact: racket-head-to-contact error on the first drawn stroke frame, sim ticks between the hit tick
# and that frame, the frame interval, how far the hitter moved in between, and the error on the last drawn frame BEFORE the
# hit. ONE headless browser, one page per step size, sequential.
from pathlib import Path
import json,sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1];GAME=ROOT/sys.argv[2];OUT=ROOT/sys.argv[3]
STEPS=[int(x) for x in (sys.argv[4] if len(sys.argv)>4 else '1,2,4,8').split(',')]
HOOK='''window.__live=(function(){
 let seed=20261115;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const stepOrig=S.step;let hitClock=[];
 S.step=function(m){const n=m.events.length;const r=stepOrig.apply(this,arguments);for(let i=n;i<m.events.length;i++){const e=m.events[i];if(e.type==='hit'){e.simClock=m.clock;e.hx=m.athletes[e.i].x;e.hz=m.athletes[e.i].z;}}return r;};
 let presses=0,lastPress=-1,prevTip=[null,null],rows=[];
 return {start(){startLocal({diff:2,mode:'1v1',points:21,venue:0});window.__matchClipHits=[];},
  run(frames,stepTicks){let now=performance.now()+1000;const stepMs=stepTicks*1000/120;
   for(let f=0;f<frames&&session&&!session.over;f++){
    const m=session.m,a=m.athletes[session.me],s=m.shuttle,sg=S.sgn(a.team);
    if(m.state==='serve'&&m.serverIdx===session.me&&m.stateT>1.0&&m.clock-lastPress>0.6){pressShot(presses%2?'drop':'hit');lastPress=m.clock;presses++;}
    else if(m.state==='rally'&&s.live&&!s.netted&&s.lastTeam!==a.team&&s.p.z*sg>0.05&&!(a.hitQueue>0)&&a.swingT<0&&m.clock-lastPress>0.25){pressShot(['hit','smash','drop'][presses%3]);lastPress=m.clock;presses++;}
    const before=window.__matchClipHits.length;
    // racket heads as drawn on the previous frame (the last picture before a hit that happens in this frame)
    const tipsBefore=session.models.map(md=>md.model.wrist.localToWorld(new THREE.Vector3(0,-0.71,0)));
    now+=stepMs;window.__raf(now);
    if(!session)break;
    for(let k=before;k<window.__matchClipHits.length;k++){const h=window.__matchClipHits[k];const tg=new THREE.Vector3(...h.target);
     const idx=session.m.athletes.findIndex(x=>x.team===h.team&&Math.abs(x.x-h.athleteAtRender[0])<1e-6);
     rows.push({shot:h.shot,clip:h.clip,team:h.team,stepTicks,error:h.error,ticksAfterHit:Math.round((h.renderClock-h.simClock)/S.DT),hitterMoved:Math.hypot(h.athleteAtRender[0]-h.hx,h.athleteAtRender[1]-h.hz),errorOnFrameBeforeHit:idx>=0?tipsBefore[idx].distanceTo(tg):null});}
   }
   return rows;}};})();
'''
out={}
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader'])
    for st in STEPS:
        ctx=b.new_context(viewport={'width':320,'height':200});errs=[]
        ctx.add_init_script("window.requestAnimationFrame=(fn)=>{window.__raf=fn;return 0;};localStorage.setItem('sp.settings',JSON.stringify({helpN:99,gfx:0,vol:0,assist:1}));")
        pg=ctx.new_page();pg.set_default_timeout(1800000);pg.on('pageerror',lambda e:errs.append(str(e)[:300]));pg.route('https://**/*',lambda r:r.abort())
        src=GAME.read_bytes().decode('utf-8')
        # the hit measurement keeps the event's sim clock / hitter position (diagnostic fields only)
        src=src.replace("receivedClock:target.receivedClock,renderClock:m.clock,","receivedClock:target.receivedClock,renderClock:m.clock,simClock:target.simClock,hx:target.hx,hz:target.hz,",1)
        assert 'simClock:target.simClock' in src
        pg.route('**/game.js',lambda r,_q=None,src=src:r.fulfill(status=200,content_type='application/javascript',body=src.replace('window.__spDebug = {',HOOK+'window.__spDebug = {',1)))
        pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object" && typeof __raf === "function"')
        pg.evaluate('()=>__live.start()')
        rows=pg.evaluate('([f,s])=>__live.run(f,s)',[int(120*45/st),st])
        out[st]={'rows':rows,'errors':errs};ctx.close()
        e=[r['error'] for r in rows]
        print(f"step {st} ticks ({st*1000/120:.1f} ms/frame): contacts {len(rows)} mean {sum(e)/max(1,len(e))*100:.1f} cm max {max(e or [0])*100:.1f} cm; ticks after hit {sorted(set(r['ticksAfterHit'] for r in rows))}; page errors {errs}")
    b.close()
OUT.write_text(json.dumps(out,indent=1))
for st,v in out.items():
    print('--- step',st)
    for r in v['rows']: print(f"  {r['shot']:10s} {r['clip']:17s} team{r['team']} error {r['error']*100:5.1f} cm  ticksAfterHit {r['ticksAfterHit']}  hitterMoved {r['hitterMoved']*100:5.1f} cm  frameBeforeHit {('%.1f cm'%(r['errorOnFrameBeforeHit']*100)) if r['errorOnFrameBeforeHit'] is not None else '-'}")
