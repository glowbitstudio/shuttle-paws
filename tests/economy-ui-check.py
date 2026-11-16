# Usage: economy-ui-check.py <port> <out dir>
# End to end against a running server: a fresh browser profile gets a wallet, claims the login gift, reports a local win,
# claims nothing it has not earned, cannot buy what it cannot afford, cannot pick a character it does not own.
# Screenshots: home, rewards, character select (locked priced character). ONE headless browser.
from pathlib import Path
import json,sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1];OUT=ROOT/sys.argv[2];OUT.mkdir(exist_ok=True)
HOOK="window.__w=()=>wallet;window.__prof=()=>profile;window.__pick=(id)=>{infoChar=id;renderChars();};\n"
out={}
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader']);errs=[]
    for name,vp in (('desktop',{'width':1100,'height':700}),('phone',{'width':390,'height':780})):
        ctx=b.new_context(viewport=vp,is_mobile=name=='phone',has_touch=name=='phone');pg=ctx.new_page();pg.set_default_timeout(120000)
        ctx.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({helpN:99,gfx:0,vol:0}));")
        pg.on('pageerror',lambda e:errs.append(str(e)[:300]));pg.on('console',lambda m:errs.append('CONSOLE '+m.text[:200]) if m.type=='error' and 'ERR_FAILED' not in m.text and 'favicon' not in m.text else None)
        pg.route('https://**/*',lambda r:r.abort())
        pg.route('**/game.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=(ROOT/'game.js').read_bytes().decode('utf-8').replace('window.__spDebug = {',HOOK+'window.__spDebug = {',1)))
        pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object" && __w() && __w().login')
        r={'start':pg.evaluate('()=>({gold:__w().gold,owned:__w().owned,can:__w().login.can})')}
        pg.wait_for_timeout(1500);pg.screenshot(path=str(OUT/f'{name}-home.png'))
        pg.evaluate("()=>__spDebug.go('rewards')");pg.wait_for_timeout(500);pg.screenshot(path=str(OUT/f'{name}-rewards-before.png'))
        pg.click('#loginClaim');pg.wait_for_function('!__w().login.can');r['afterLogin']=pg.evaluate('()=>__w().gold')
        pg.evaluate("()=>__spDebug.Net.send({t:'claimLogin'})");pg.wait_for_timeout(400);r['secondLogin']=pg.evaluate('()=>__w().gold')
        pg.evaluate("()=>__spDebug.Net.send({t:'claimQuest',id:'win2'})");pg.wait_for_timeout(400);r['unearnedQuest']=pg.evaluate('()=>__w().gold')
        pg.evaluate("()=>__spDebug.Net.send({t:'localResult',win:true,diff:3,dur:120})");pg.wait_for_timeout(500);r['afterLocalWin']=pg.evaluate('()=>__w().gold')
        pg.evaluate("()=>__spDebug.Net.send({t:'localResult',win:true,diff:3,dur:120})");pg.wait_for_timeout(500);r['spamLocalWin']=pg.evaluate('()=>__w().gold')
        pg.evaluate("()=>__spDebug.Net.send({t:'buyChar',id:'dragon'})");pg.wait_for_timeout(500);r['buyTooDear']=pg.evaluate('()=>({gold:__w().gold,owned:__w().owned.length})')
        pg.wait_for_timeout(4200);pg.screenshot(path=str(OUT/f'{name}-rewards-after.png'))
        pg.evaluate("()=>__spDebug.go('chars')");pg.wait_for_timeout(300);pg.evaluate("()=>__pick('fox')");pg.wait_for_timeout(6000)
        r['foxBuyDisabled']=pg.evaluate("()=>!!document.getElementById('charBuy')&&document.getElementById('charBuy').disabled");r['doneDisabled']=pg.evaluate("()=>document.getElementById('charsDone').disabled")
        pg.screenshot(path=str(OUT/f'{name}-chars-fox.png'))
        # forging the selected character locally does not get it past the server
        pg.evaluate("()=>{__prof().char='fox';__spDebug.Net.profile();__spDebug.Net.send({t:'wallet'});}");pg.wait_for_timeout(600);r['forgedCharAfterWallet']=pg.evaluate('()=>__prof().char')
        out[name]=r;ctx.close()
    b.close()
print(json.dumps({'results':out,'errors':errs},ensure_ascii=False,indent=1))
