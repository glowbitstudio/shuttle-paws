# Usage: room-rejoin-ui-check.py <port> <out dir>
# ONE headless browser, three pages (lobby screens; one short match). Checks the room bench / swap request UI and the
# "Vào lại trận" bar after leaving an online match, then rejoins through the bar. Screenshots for a visual read.
from pathlib import Path
import json,sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1];OUT=ROOT/sys.argv[2];OUT.mkdir(exist_ok=True)
HOOK="window.__net=()=>Net;window.__scr=()=>screen;window.__ses=()=>session&&{kind:session.kind,me:session.me,over:!!session.over};\n"
res={};errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader'])
    def page(name,vp):
        ctx=b.new_context(viewport=vp,is_mobile=vp['width']<500,has_touch=vp['width']<500);pg=ctx.new_page();pg.set_default_timeout(120000)
        ctx.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({helpN:99,gfx:0,vol:0}));localStorage.setItem('sp.profile',JSON.stringify({name:'%s',char:'cat',id:null,secret:null,named:true}));"%name)
        pg.on('pageerror',lambda e:errs.append(name+' '+str(e)[:300]));pg.on('console',lambda m:errs.append(name+' CONSOLE '+m.text[:200]) if m.type=='error' and 'ERR_FAILED' not in m.text and 'favicon' not in m.text else None)
        pg.route('https://**/*',lambda r:r.abort())
        pg.route('**/game.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=(ROOT/'game.js').read_bytes().decode('utf-8').replace('window.__spDebug = {',HOOK+'window.__spDebug = {',1)))
        pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object" && __net().ok')
        return pg
    A=page('An',{'width':900,'height':700});B=page('Binh',{'width':390,'height':780});C=page('Chi',{'width':900,'height':700})
    A.evaluate("()=>__net().send({t:'createRoom',mode:'1v1',open:true})");A.wait_for_function("__scr()==='room'")
    code=A.evaluate('()=>__net().room.code')
    for pg in (B,C):
        pg.evaluate("(c)=>__net().send({t:'joinRoom',code:c})",code);pg.wait_for_function("__scr()==='room'")
    C.wait_for_function("__net().room.bench.length===1");C.wait_for_timeout(2500)
    res['bench']=C.evaluate("()=>({seats:__net().room.slots.map(s=>s&&s.name),bench:__net().room.bench.map(s=>s.name),text:document.getElementById('roomBench').innerText.slice(0,160)})")
    C.screenshot(path=str(OUT/'bench-view-chi.png'))
    # Chi asks for Binh's seat -> Binh sees the prompt and agrees
    C.click('#roomTeams .slot.other >> nth=1');B.wait_for_selector('#roomAsk:not(.hidden)');B.wait_for_timeout(1500);B.screenshot(path=str(OUT/'swap-ask-binh-phone.png'))
    B.click('#roomAsk button[data-ok="1"]');C.wait_for_function("__net().room.slots[1]&&__net().room.slots[1].name==='Chi'")
    res['afterSwap']=C.evaluate("()=>({seats:__net().room.slots.map(s=>s&&s.name),bench:__net().room.bench.map(s=>s.name)})")
    # Chi steps down again with the button, Binh takes the free seat by tapping it
    C.click('#benchDown');C.wait_for_function("__net().room.bench.length===2");B.click('#roomTeams .slot.open');B.wait_for_function("__net().room.slots[1]&&__net().room.slots[1].name==='Binh'")
    res['afterDownUp']=B.evaluate("()=>({seats:__net().room.slots.map(s=>s&&s.name),bench:__net().room.bench.map(s=>s.name)})")
    # start: An + Binh play, Chi watches
    A.click('#roomStart')
    for pg in (A,B,C): pg.wait_for_function("__ses()")
    res['sessions']=[pg.evaluate('()=>__ses()') for pg in (A,B,C)]
    # Binh leaves through the pause menu -> bar on the menu -> rejoin
    B.wait_for_timeout(1500);B.evaluate("()=>document.getElementById('quit').click()");B.wait_for_selector('#rejoinBar:not(.hidden)');B.wait_for_timeout(1200)
    res['barText']=B.evaluate("()=>document.getElementById('rejoinText').textContent");res['screenAfterQuit']=B.evaluate('()=>__scr()')
    B.screenshot(path=str(OUT/'rejoin-bar-binh-phone.png'))
    B.click('#rejoinBtn');B.wait_for_function("__ses()&&__ses().kind==='online'");res['rejoined']=B.evaluate('()=>__ses()');res['barHiddenInMatch']=B.evaluate("()=>document.getElementById('rejoinBar').classList.contains('hidden')")
    b.close()
print(json.dumps({'results':res,'errors':errs},ensure_ascii=False,indent=1))
