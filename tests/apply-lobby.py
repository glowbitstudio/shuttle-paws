# One-off patch: home screen becomes a lobby (character on stage, top bar, side buttons, play buttons); landscape phone fix for stage screens.
def patch(p, reps, append=''):
    s=open(p,encoding='utf-8',newline='').read(); crlf='\r\n' in s
    fix=lambda t: t.replace('\n','\r\n') if crlf else t
    for a,b in reps:
        a=fix(a); b=fix(b)
        assert s.count(a)==1,(p,a[:70],s.count(a)); s=s.replace(a,b)
    open(p,'w',encoding='utf-8',newline='').write(s+fix(append))
ico=lambda n: '<i><svg class="ico" aria-hidden="true"><use href="#i-%s"/></svg></i>'%n
html=open('index.html',encoding='utf-8',newline='').read()
a=html.index('  <section id="s-home" class="screen">'); b=html.index('  <!-- Bot setup -->')
new='''  <section id="s-home" class="screen lobby">
    <div class="lobby-top">
      <button class="profile-chip" data-go="settings"><span id="homeFace"></span><span><b id="homeName">Khách</b><small id="homeChar">Mướp</small></span></button>
      <h1 class="logo"><em class="logo-ic"><svg class="ico" aria-hidden="true"><use href="#i-shuttle"/></svg></em>Shuttle <span>Paws</span></h1>
      <div class="lobby-cash"><span class="gold-chip"><i class="coin"></i><b id="homeGold">…</b></span><button class="round-btn" data-go="settings" aria-label="Cài đặt"><svg class="ico" aria-hidden="true"><use href="#i-gear"/></svg></button></div>
    </div>
    <div class="lobby-side">
      <button class="mini-btn" id="rewardsBtn" data-go="rewards">%s<span>Quà</span><em id="rewardDot" class="hidden"></em></button>
      <button class="mini-btn" data-go="ach">%s<span>Thành tích</span></button>
      <button class="mini-btn" data-go="stats">%s<span>Thống kê</span></button>
      <button class="mini-btn" data-go="guide">%s<span>Hướng dẫn</span></button>
    </div>
    <div class="lobby-char">
      <button data-go="chars">%sNhân vật</button>
      <button data-go="gear">%sTrang bị</button>
    </div>
    <div class="lobby-play">
      <button class="big-btn orange" data-go="bot">%sĐấu với Bot<small>1v1 hoặc 2v2</small></button>
      <button class="big-btn blue" data-go="online">%sChơi Online<small>Ghép trận, phòng, xem trận</small></button>
      <button class="big-btn gold wide-btn" data-go="tour">%sGiải đấu<small id="homeTour">5 vòng đấu loại trực tiếp</small></button>
      <p class="tiny" id="homeStats"></p>
    </div>
  </section>

'''%tuple(ico(n) for n in ('star','medal','chart','book','paw','shirt','bot','globe','cup'))
if '\r\n' in html: new=new.replace('\n','\r\n')
open('index.html','w',encoding='utf-8',newline='').write(html[:a]+new+html[b:])
patch('game.js',[
("  if (!session && (screen === 'chars' || screen === 'gear')) {\n    const side = portrait ? 0 : 1.35;",
 "  if (!session && (screen === 'chars' || screen === 'gear' || screen === 'home')) {\n    const side = portrait ? 0 : screen === 'home' ? 0.55 : 1.35;"),
("preview.root.rotation.y = screen === 'chars' || screen === 'gear' ? -0.35","preview.root.rotation.y = screen === 'chars' || screen === 'gear' || screen === 'home' ? -0.35"),
("$('homeChar').textContent = c.name + ' · ' + c.kind + ' · Sức mạnh ' + S.powerOf(c.id, myGear()); }","$('homeChar').textContent = c.name + ' · Sức mạnh ' + S.powerOf(c.id, myGear()); }"),
("$('homeChar').textContent = c.name + ' · ' + c.kind;","$('homeChar').textContent = c.name + ' · Sức mạnh ' + S.powerOf(c.id, myGear());"),
("'5 vòng đấu loại trực tiếp · giành cúp vô địch';","'5 vòng đấu loại trực tiếp';"),
])
css='''
/* ---- lobby (home): character on the stage, top bar, side buttons on the left, play buttons on the right (below on portrait) */
.screen.lobby{display:grid;grid-template-columns:auto 1fr min(340px,36vw);grid-template-rows:auto 1fr auto;grid-template-areas:"top top top" "side . play" "side char play";gap:10px 14px;align-items:stretch;justify-content:stretch;
  padding:max(12px,env(safe-area-inset-top)) max(18px,env(safe-area-inset-right)) max(14px,env(safe-area-inset-bottom)) max(18px,env(safe-area-inset-left));
  background:linear-gradient(180deg,rgba(16,14,48,.5) 0,transparent 24%,transparent 68%,rgba(16,14,48,.45) 100%);backdrop-filter:none;-webkit-backdrop-filter:none}
.lobby-top{grid-area:top;display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:0}
.lobby-top .profile-chip{margin:0;flex:none;min-width:0;background:linear-gradient(180deg,#3d43ad,#262a72);border-color:rgba(255,215,106,.6);text-align:left}
.lobby-top .profile-chip small{color:#ffd76a;white-space:nowrap}
.lobby-top .logo{font-size:36px;margin:0;flex:none}
.lobby-cash{display:flex;align-items:center;gap:8px;flex:none}
.lobby-cash .gold-chip{background:rgba(16,14,48,.75)}
.round-btn{width:44px;height:44px;flex:none;border-radius:50%;border:2px solid rgba(255,255,255,.3);background:linear-gradient(180deg,#4a50c0,#2a2e80);color:#fff;font-size:22px;display:grid;place-items:center;cursor:pointer;box-shadow:0 4px 0 rgba(0,0,0,.3)}
.round-btn:active{transform:translateY(3px);box-shadow:0 1px 0 rgba(0,0,0,.3)}
.lobby-side{grid-area:side;display:flex;flex-direction:column;gap:9px;align-self:center}
.lobby-side .mini-btn{width:78px;overflow:visible;background:linear-gradient(180deg,#3d43ad,#262a72);border:2px solid rgba(255,255,255,.22);box-shadow:0 4px 0 rgba(0,0,0,.32)}
.lobby-side #rewardDot{position:absolute;top:-7px;right:-7px;margin:0}
.lobby-char{grid-area:char;display:flex;justify-content:center;gap:10px;align-self:end;padding-bottom:2px}
.lobby-char button{display:inline-flex;align-items:center;gap:7px;border:0;border-radius:999px;padding:9px 20px;font-family:var(--display);font-weight:900;font-size:16px;color:#3b2a00;background:linear-gradient(180deg,#ffe08a,#ffb531);box-shadow:0 4px 0 #b97a00,0 8px 18px rgba(0,0,0,.3);cursor:pointer}
.lobby-char button i{font-style:normal;font-size:19px;display:inline-grid}
.lobby-char button:active{transform:translateY(3px);box-shadow:0 1px 0 #b97a00}
.screen.lobby .lobby-play{grid-area:play;display:flex;flex-direction:column;justify-content:center;gap:14px;align-self:center}
.screen.lobby .lobby-play .big-btn{display:grid;grid-template-columns:54px 1fr;column-gap:12px;row-gap:0;align-items:center;justify-items:start;text-align:left;font-size:22px;padding:14px 16px;line-height:1.15;width:100%}
.screen.lobby .lobby-play .big-btn i{grid-row:1/3;font-size:38px;justify-self:center}
.screen.lobby .lobby-play .big-btn small{grid-column:2;margin:0;font-size:12px;line-height:1.25}
.screen.lobby .lobby-play .tiny{margin:0;text-align:center;color:#fff;opacity:.85;text-shadow:0 1px 2px rgba(0,0,0,.6)}
@media (orientation:portrait),(max-width:700px){
  .screen.lobby{grid-template-columns:auto 1fr;grid-template-rows:auto 1fr auto auto;grid-template-areas:"top top" "side ." "char char" "play play";gap:8px 10px;padding-left:12px;padding-right:12px}
  .lobby-top .logo{display:none}
  .lobby-top .profile-chip{max-width:58vw;padding-right:12px}
  .lobby-side{align-self:start;margin-top:4px}
  .lobby-side .mini-btn{width:64px;font-size:11px;padding:7px 2px 5px}.lobby-side .mini-btn i{font-size:21px}
  .screen.lobby .lobby-play{display:grid;grid-template-columns:1fr 1fr;gap:10px;align-self:end}
  .screen.lobby .lobby-play .big-btn{display:flex;flex-direction:column;align-items:center;text-align:center;font-size:19px;padding:12px 6px 10px}
  .screen.lobby .lobby-play .big-btn.wide-btn{grid-column:1/3;flex-direction:row;justify-content:center;gap:10px;padding:10px 8px}
  .screen.lobby .lobby-play .big-btn.wide-btn small{display:none}
  .screen.lobby .lobby-play .tiny{grid-column:1/3}
}
@media (orientation:landscape) and (max-height:480px){
  .screen.lobby{gap:5px 10px;padding-top:6px;padding-bottom:6px;grid-template-columns:auto 1fr min(280px,36vw)}
  .lobby-top .logo{font-size:26px}
  .lobby-top .profile-chip{padding:3px 12px 3px 5px}.lobby-top .profile-chip>span:first-child{width:36px;height:36px}
  .round-btn{width:38px;height:38px;font-size:19px}
  .lobby-side{gap:6px}.lobby-side .mini-btn{width:66px;padding:4px 2px 3px;font-size:11px}.lobby-side .mini-btn i{font-size:18px}
  .screen.lobby .lobby-play{gap:9px}
  .screen.lobby .lobby-play .big-btn{padding:7px 12px;font-size:18px;grid-template-columns:40px 1fr}.screen.lobby .lobby-play .big-btn i{font-size:28px}
  .lobby-char button{padding:6px 14px;font-size:14px}
  /* character select / gear on a phone held sideways: panel on the right at full height, not a half-height sheet */
  .screen.stage{align-items:center;justify-content:flex-end;padding:8px}
  .screen.stage .panel.side{max-height:calc(100vh - 16px);width:min(400px,52vw);margin:0}
  body .stage-name{top:auto;bottom:10px;left:0;width:calc(100% - min(400px,52vw));font-size:22px}
}
'''
patch('style.css',[],css)
print('ok')
