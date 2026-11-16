# Usage: online-move-feel.py <port> [extra latency ms]  -- ONE headless page plays a room match vs a server bot on a local server.
# Holds "D" and samples the drawn x of the player's own athlete every frame: time from key press to first visible movement,
# number of frames in which the athlete did not move while running (stepping), biggest single-frame jump, and the gap to the server's position.
# Extra latency is added to every message in both directions inside the page.
from pathlib import Path
import json,sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1];LAT=int(sys.argv[2]) if len(sys.argv)>2 else 0
HOOK="window.__me=()=>session&&session.m&&session.me>=0?{x:session.m.athletes[session.me].x,sx:session.snaps.length?session.snaps[session.snaps.length-1].s.a[session.me][0]:null,st:session.m.state}:null;\n"
LATJS="""(()=>{const L=%d;if(!L)return;const W=window.WebSocket;window.WebSocket=function(u,p){const ws=new W(u,p);const send=ws.send.bind(ws);ws.send=(d)=>setTimeout(()=>{if(ws.readyState===1)send(d)},L);
 let h=null;Object.defineProperty(ws,'onmessage',{set(f){h=f;},get(){return h;}});ws.addEventListener('message',(e)=>setTimeout(()=>h&&h(e),L));return ws;};window.WebSocket.OPEN=1;})();"""%LAT
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader']);ctx=b.new_context(viewport={'width':900,'height':600});pg=ctx.new_page();pg.set_default_timeout(120000)
    ctx.add_init_script(LATJS+"localStorage.setItem('sp.settings',JSON.stringify({helpN:99,gfx:0,vol:0}));localStorage.setItem('sp.profile',JSON.stringify({name:'Thu',char:'cat',id:null,secret:null,named:true}));")
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:300]))
    pg.route('https://**/*',lambda r:r.abort())
    pg.route('**/game.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=(ROOT/'game.js').read_bytes().decode('utf-8').replace('window.__spDebug = {',HOOK+'window.__spDebug = {',1)))
    pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object" && __spDebug.Net.ok')
    pg.evaluate("()=>__spDebug.Net.send({t:'createRoom',mode:'1v1',points:11,games:1,open:0,venue:0})");pg.wait_for_timeout(1200+2*LAT)
    pg.evaluate("()=>__spDebug.Net.send({t:'start'})");pg.wait_for_function("__me()&&(__me().st==='serve'||__me().st==='rally')");pg.wait_for_timeout(1500)
    pg.evaluate("()=>{window.__s=[];const f=()=>{const v=__me();if(v)__s.push([performance.now(),v.x,v.sx]);if(__s.length<400)requestAnimationFrame(f);};requestAnimationFrame(f);}")
    pg.wait_for_timeout(300);t0=pg.evaluate("()=>performance.now()");pg.keyboard.down('d');pg.wait_for_timeout(900);pg.keyboard.up('d');pg.wait_for_timeout(700)
    s=pg.evaluate("()=>__s");b.close()
x0=[v for v in s if v[0]<=t0][-1][1]
first=next((v[0]-t0 for v in s if v[0]>t0 and abs(v[1]-x0)>0.01),None)
run=[v for v in s if v[0]>t0+250 and v[0]<t0+850]
d=[abs(run[i][1]-run[i-1][1]) for i in range(1,len(run))]
gap=[abs(v[1]-v[2]) for v in run if v[2] is not None]
end=s[-1]
print(json.dumps({'latencyAddedMs':LAT,'msToFirstMove':round(first) if first is not None else None,'framesWhileRunning':len(d),'stuckFrames':sum(1 for v in d if v<0.002),
 'maxStepM':round(max(d),3) if d else None,'medianStepM':round(sorted(d)[len(d)//2],3) if d else None,'maxGapToServerM':round(max(gap),2) if gap else None,
 'restGapToServerM':round(abs(end[1]-end[2]),3) if end[2] is not None else None,'errors':errs}))
