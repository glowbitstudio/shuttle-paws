# Usage: online-stream-probe.py <ws url> [seconds]   -- raw connection from ONE headless page: starts a room match vs a server bot and
# measures the snapshot stream: arrival gaps (jitter), how fast the server's match clock runs against real time, and ping round trip.
# Env SP_PROXY = proxy for the browser (leave unset for LAN addresses).
import sys,json,os
from playwright.sync_api import sync_playwright
URL=sys.argv[1];SEC=int(sys.argv[2]) if len(sys.argv)>2 else 20
JS="""async ([url,sec])=>{
 const ws=new WebSocket(url);const out={snaps:[],rtt:[]};let started=false,t0=0;
 await new Promise((ok,no)=>{ws.onopen=ok;ws.onerror=()=>no(new Error('ws error'));setTimeout(()=>no(new Error('ws timeout')),30000);});
 const send=(o)=>ws.send(JSON.stringify(o));
 ws.onmessage=(e)=>{const m=JSON.parse(e.data),now=performance.now();
  if(m.t==='room'&&!started){started=true;send({t:'start'});}
  if(m.t==='snap'){if(!t0)t0=now;out.snaps.push([now-t0,m.s.c]);}
  if(m.t==='pong'&&m.c)out.rtt.push(now-m.c);};
 send({t:'hello',id:null,secret:null,name:'Do',char:'cat',assist:1,hand:'R'});
 setTimeout(()=>send({t:'createRoom',mode:'1v1',points:11,games:1,open:0,venue:0}),800);
 const pg=setInterval(()=>send({t:'ping',c:performance.now()}),1000);
 await new Promise(r=>setTimeout(r,sec*1000+4000));clearInterval(pg);ws.close();return out;}"""
with sync_playwright() as p:
    PX=os.environ.get('SP_PROXY')
    b=p.chromium.launch(headless=True,proxy={'server':PX} if PX else None);pg=b.new_page();pg.set_default_timeout(120000)
    pg.goto('about:blank');r=pg.evaluate(JS,[URL,SEC]);b.close()
s=r['snaps']
if len(s)<10: print(json.dumps({'error':'few snapshots','n':len(s),'rtt':r['rtt'][:5]}));sys.exit(1)
gaps=sorted(s[i][0]-s[i-1][0] for i in range(1,len(s)))
wall=(s[-1][0]-s[0][0])/1000;sim=s[-1][1]-s[0][1]
rt=sorted(r['rtt'])
print(json.dumps({'url':URL,'snapshots':len(s),'perSecond':round(len(s)/wall,1),'gapMs':{'median':round(gaps[len(gaps)//2]),'p95':round(gaps[int(len(gaps)*.95)]),'max':round(gaps[-1])},
 'gapsOver100ms':sum(1 for g in gaps if g>100),'matchClockSpeed':round(sim/wall,3),'pingMs':{'median':round(rt[len(rt)//2]) if rt else None,'max':round(rt[-1]) if rt else None}}))
