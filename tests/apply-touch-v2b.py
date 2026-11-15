# One-shot patch on top of apply-touch-v2.py: declutter the HUD on touch devices and keep only 4 buttons under the right
# thumb (2026-11-13, user report from a phone: "HUD hides the court", "too many buttons on one side").
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def patch(name,reps,append=None):
    p=ROOT/name;s=p.read_bytes().decode('utf-8');crlf='\r\n' in s
    assert 'touch controls v2' in s and 'touch HUD declutter' not in s,name
    for old,new in reps:
        if crlf: old=old.replace('\n','\r\n');new=new.replace('\n','\r\n')
        assert s.count(old)==1,(name,s.count(old),old[:70])
        s=s.replace(old,new)
    if append: s=s.rstrip('\r\n')+('\r\n' if crlf else '\n')+(append.replace('\n','\r\n') if crlf else append)
    p.write_bytes(s.encode('utf-8'))
patch('style.css',[],append='''
/* ================= touch HUD declutter (2026-11-13) =================
   On touch devices the HUD is one slim line on the top edge (wind | score + stamina | menu icons); the timing meter is a
   thin bar by the player's side; popups are small and brief; hints fade away; only 4 buttons sit under the right thumb
   (the dive button moves above the stick on the other side). */
.touchui #score{top:max(3px,env(safe-area-inset-top));padding:2px 6px;gap:6px;border-radius:14px;max-width:calc(100vw - 196px);box-shadow:0 2px 8px rgba(0,0,0,.25);background:rgba(32,26,48,.78)}
.touchui #score .side{gap:5px}
.touchui #score .side span{font-size:11px;max-width:64px}
.touchui #score b{font-size:17px;line-height:22px;min-width:26px;padding:0 5px;border-radius:9px}
.touchui #score .mid{font-size:9.5px;line-height:1.05;padding:0}
.touchui #score .mid #venueName,.touchui #score .mid small{display:none}
.touchui #score .sta{height:3px}
.touchui #wind{top:max(5px,env(safe-area-inset-top));left:max(8px,env(safe-area-inset-left));transform:none;padding:1px 7px;gap:4px;font-size:11px;background:rgba(32,26,48,.7);box-shadow:none}
.touchui #windArrow{font-size:13px}
.touchui #wind #windText{font-size:0}                      /* "Gió 1.2" -> just the number (set by ::after from data) */
.touchui #wind #windText::after{content:attr(data-n);font-size:11px}
.touchui #topBtns{top:max(3px,env(safe-area-inset-top));right:max(8px,env(safe-area-inset-right));flex-direction:row;gap:6px}
.touchui #topBtns .round{width:40px;height:40px;opacity:.85}
.touchui #ping{top:max(34px,calc(env(safe-area-inset-top) + 30px));left:max(8px,env(safe-area-inset-left));font-size:10px;padding:1px 6px}
.touchui #fps{top:max(52px,calc(env(safe-area-inset-top) + 48px));left:max(8px,env(safe-area-inset-left));font-size:10px;padding:1px 6px}
/* hints: one small line under the top bar, gone after a few seconds */
.touchui #hint{top:calc(34px + env(safe-area-inset-top));bottom:auto;font-size:11.5px;line-height:1.2;padding:3px 10px;max-width:min(64vw,330px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:rgba(32,26,48,.72);opacity:0}
.touchui #hint.show{animation:touchhint 3.4s forwards}
@keyframes touchhint{0%{opacity:0}8%{opacity:1}80%{opacity:1}100%{opacity:0}}
.touchui #serveClock{top:calc(34px + env(safe-area-inset-top));bottom:auto;left:auto;right:max(8px,env(safe-area-inset-right));transform:none;top:calc(48px + env(safe-area-inset-top));font-size:11px;padding:1px 7px}
.touchui #ctrlHelp{display:none}                             /* the buttons are labelled; no help card over the court */
/* popups: small, by the player, quick */
.touchui .pop{font-size:14px;-webkit-text-stroke:2px #2a1f5a;text-shadow:0 2px 0 #2a1f5a;animation:pop .5s forwards}
.touchui .pop.perfect{font-size:16px}
/* timing meter: thin and short, no captions */
body.touchui #tmeter{width:min(220px,46vw);opacity:0}
body.touchui #tmeter.on{opacity:.8}
body.touchui #tmeter .tm-hint,body.touchui #tmeter .tm-cap{display:none}
body.touchui #tmeter .tm-bar{height:9px;border-width:1.5px}
body.touchui #tmeter .tm-mid{top:-3px;bottom:-3px}
body.touchui #tmeter .tm-dot{width:13px;height:13px;margin:-6.5px 0 0 -6.5px;border-width:2px}
body.touchui #tmeter .tm-press{top:-4px;bottom:-4px}
/* right thumb: PHONG + DAP + BO NHO + NHAY only. Dive: a small button above the resting stick on the other side. */
#tbtns .tb.dive{--d:52px;right:auto;left:calc(max(14px,env(safe-area-inset-left)) + 14px*var(--tscale));
  bottom:calc(max(14px,env(safe-area-inset-bottom)) + 150px*var(--tscale));opacity:.75}
body.tswap #tbtns .tb.dive{left:auto;right:calc(max(14px,env(safe-area-inset-right)) + 14px*var(--tscale))}
@media (orientation:landscape) and (max-height:480px){
  #tbtns .tb.dive{--dx:0px;--dy:0px}
  .touchui #hint{top:calc(34px + env(safe-area-inset-top));font-size:11.5px;padding:3px 10px;max-width:44vw}
  body.touchui #tmeter{top:auto;bottom:calc(8px + env(safe-area-inset-bottom));width:min(220px,30vw)}   /* bottom centre, between the thumbs */
  .touchui #serveClock{top:calc(48px + env(safe-area-inset-top))}
  .touchui #score{top:max(3px,env(safe-area-inset-top));padding:2px 6px} .touchui #score b{font-size:17px}
  .touchui #topBtns{top:max(3px,env(safe-area-inset-top))}
}
@media (orientation:portrait){
  body.touchui #tmeter{top:auto;bottom:calc(max(14px,env(safe-area-inset-bottom)) + 196px*var(--tscale));width:min(220px,52vw)}
}
''')
patch('game.js',[
# hints fade away on touch devices
('''function setHint(t) { if ($('hint').textContent !== t) $('hint').textContent = t; }
''','''function setHint(t) {
  const el = $('hint'); if (el.textContent === t) return;
  el.textContent = t;
  if (isTouch) { el.classList.remove('show'); if (t) { void el.offsetWidth; el.classList.add('show'); } }   // touch HUD declutter: show briefly, then fade
}
'''),
# popups without a position used to sit in the middle of the court view: on touch they go by the player's racket side
('''  const el = document.createElement('div'); el.className = 'pop ' + (cls || ''); el.textContent = text;
  let x = viewW / 2, y = viewH * 0.36;
''','''  const el = document.createElement('div'); el.className = 'pop ' + (cls || ''); el.textContent = text;
  if (isTouch && !pos && session && session.me >= 0) { const me = session.m.athletes[session.me]; pos = { x: me.x, y: 1.7 + (me.jumpY || 0), z: me.z }; }
  let x = viewW / 2, y = viewH * 0.36;
'''),
('''  $('popups').appendChild(el); setTimeout(() => el.remove(), 1000);
''','''  $('popups').appendChild(el); setTimeout(() => el.remove(), isTouch ? 520 : 1000);
'''),
# wind: number only for the compact touch line
('''  $('windText').textContent = 'Gió ' + str.toFixed(1);
''','''  $('windText').textContent = 'Gió ' + str.toFixed(1); $('windText').dataset.n = str.toFixed(1);
'''),
])
print('patched style.css, game.js (touch HUD declutter)')
