# One-off patch: clearer option screens (bot, tournament, online, settings, rewards, achievements, guide) + green "Quà" button when something can be claimed.
def load(p): return open(p,encoding='utf-8',newline='').read()
def save(p,s): open(p,'w',encoding='utf-8',newline='').write(s)
def rep(s,a,b):
    if '\r\n' in s: a=a.replace('\n','\r\n'); b=b.replace('\n','\r\n')
    assert s.count(a)==1,(a[:80],s.count(a)); return s.replace(a,b)
def between(s,a,b,new):
    i=s.index(a); j=s.index(b,i)
    if '\r\n' in s: new=new.replace('\n','\r\n')
    return s[:i]+new+s[j:]
h=load('index.html')
# ---- bot setup: one labelled row per choice, start button always in view
h=between(h,'      <div class="label">Nhân vật của bạn</div>','      <button class="cta" id="botStart">','''      <button class="profile-chip pick gone" id="botChar"><span class="pf"></span><span><b class="pn"></b><small class="pk"></small></span><em>Đổi ›</em></button>
      <div class="opt"><div class="opt-l"><b>Kiểu trận</b><small>Đánh đôi: bạn và một bot Cao thủ đấu với hai bot</small></div><div class="seg" id="botMode"><button data-v="1v1" class="on">Đánh đơn</button><button data-v="2v2">Đánh đôi</button></div></div>
      <div class="opt"><div class="opt-l"><b>Độ khó của bot</b><small>Thắng nhận 20 · 30 · 45 · 60 vàng theo độ khó</small></div><div class="seg" id="botDiff"><button data-v="0">Dễ</button><button data-v="1" class="on">Vừa</button><button data-v="2">Khó</button><button data-v="3">Cao thủ</button></div></div>
      <div class="opt"><div class="opt-l"><b>Độ dài trận</b><small>Số điểm mỗi ván và số ván</small></div><div class="opt-r"><div class="seg" id="botPts"><button data-v="11" class="on">11 điểm</button><button data-v="21">21 điểm</button></div><div class="seg" id="botGames"><button data-v="1" class="on">1 ván</button><button data-v="3">3 ván</button></div></div></div>
      <div class="opt"><div class="opt-l"><b>Hỗ trợ đánh</b><small>Dễ: máy tự đánh · Thường: tự chạy tới cầu · Chuyên: tự làm hết</small></div><div class="seg" id="botAssist"><button data-v="2">Dễ</button><button data-v="1">Thường</button><button data-v="0">Chuyên</button></div></div>
      <div class="opt col"><div class="opt-l"><b>Sân đấu</b></div><div class="venues" id="botVenues"></div></div>
''')
h=rep(h,'<button class="cta" id="botStart">','<button class="cta sticky" id="botStart">')
# ---- tournament
h=rep(h,'<button class="profile-chip pick" id="tourChar">','<button class="profile-chip pick gone" id="tourChar">')
h=rep(h,'<button class="cta" id="tourStart">','<button class="cta sticky" id="tourStart">')
# ---- online: labelled room options
h=rep(h,'<button class="profile-chip pick wide-chip" id="onChar">','<button class="profile-chip pick wide-chip gone" id="onChar">')
h=between(h,'          <b>Tạo phòng</b>','          <button class="pill solid" id="createRoom">','''          <b>Tạo phòng riêng</b><small class="card-hint">Tạo phòng rồi gửi mã cho bạn bè, hoặc để mở cho người khác vào.</small>
          <div class="opt-grid">
            <div><span>Kiểu trận</span><div class="seg sm" id="crMode"><button data-v="1v1" class="on">Đơn 1v1</button><button data-v="2v2">Đôi 2v2</button></div></div>
            <div><span>Ai vào được</span><div class="seg sm" id="crOpen"><button data-v="1" class="on">Ai cũng được</button><button data-v="0">Chỉ có mã</button></div></div>
            <div><span>Điểm mỗi ván</span><div class="seg sm" id="crPts"><button data-v="11" class="on">11</button><button data-v="21">21</button></div></div>
            <div><span>Số ván</span><div class="seg sm" id="crGames"><button data-v="1" class="on">1 ván</button><button data-v="3">3 ván</button></div></div>
            <div class="wide"><span>Sân đấu</span><select id="crVenue"></select></div>
          </div>
''')
h=rep(h,'<b>Vào phòng bạn bè</b>','<b>Vào phòng bằng mã</b>')
# ---- settings: smaller groups, shorter text
h=rep(h,'<div class="label">Lối chơi</div>','<div class="label">Điều khiển</div>')
h=rep(h,'''<small>Chuyên: tự canh từng nhịp · Thường: bấm sớm tối đa khoảng 1 giây vẫn tính, tự chạy tới cầu và tự về giữa sân khi bạn đứng yên, tự nhảy đập, bỏ qua cầu ra ngoài · Dễ: tự đánh luôn, bạn chỉ cần chọn hướng. <b>Chỉ dùng khi đấu bot</b> — online ai cũng tự chạy, tự canh như nhau</small>''','''<small>Dễ: máy tự đánh, bạn chỉ chọn hướng · Thường: tự chạy tới cầu, bấm sớm vẫn tính · Chuyên: tự làm hết. <b>Chỉ có tác dụng khi đấu bot.</b></small>''')
h=rep(h,'''<small>3 nút: mỗi cú một nút (phông · đập · bỏ nhỏ), bấm sớm cũng được · Nạp lực: một nút, giữ càng lâu càng mạnh (kiểu cũ)</small>''','''<small>3 nút: mỗi cú một nút · Nạp lực: một nút, giữ càng lâu càng mạnh</small>''')
h=rep(h,'        <label class="set">Điểm rơi khi đấu bot','      </div>\n      <div class="set-group">\n        <div class="label">Trợ giúp hiện trên sân</div>\n        <label class="set">Điểm rơi khi đấu bot')
h=rep(h,'        <label class="set">Hiện chat khi online <input type="checkbox" id="setChat"></label>\n','')
h=rep(h,'        <div class="set">Cỡ nút cảm ứng','      </div>\n      <div class="set-group">\n        <div class="label">Nút cảm ứng (điện thoại)</div>\n        <div class="set">Cỡ nút cảm ứng')
h=rep(h,'        <div class="label">Máy chủ online</div>\n','        <div class="label">Online</div>\n        <label class="set">Hiện chat khi online <input type="checkbox" id="setChat"></label>\n')
# ---- guide: shorter timing text
h=between(h,'<p>Bấm <b>bất cứ lúc nào khi cầu đang bay về phía bạn</b>','</div>\n        <div class="g"><b><svg class="ico" aria-hidden="true"><use href="#i-swap"/>'.replace('\n','\r\n') if '\r\n' in h else '</div>\n        <div class="g"><b><svg class="ico" aria-hidden="true"><use href="#i-swap"/>','''<p>Bấm <b>khi cầu đang bay về phía bạn</b> — cầu tới vợt là tự vung. Nhìn <b>thanh canh nhịp</b> dưới sân: bấm lúc chấm trắng ở vùng <b style="color:#2e9e62">xanh</b> = <b class="gold">Perfect</b> · <b class="gold">vàng</b> = Tốt · <b style="color:#e04848">đỏ</b> = lệch, dễ ra ngoài.</p>''')
save('index.html',h)
g=load('game.js')
g=rep(g,"$('rewardDot').textContent = n; $('rewardDot').classList.toggle('hidden', !n);","$('rewardDot').textContent = n; $('rewardDot').classList.toggle('hidden', !n); $('rewardsBtn').classList.toggle('can', !!n);")
g=rep(g,"<small>${esc(a.desc)}${unlock ? ' · Mở khoá ' + faceImg(unlock.id) + esc(unlock.name) : ''}</small></div>","<small>${esc(a.desc)}</small>${unlock ? '<span class=\"ach-gift\">' + faceImg(unlock.id) + 'Mở khoá ' + esc(unlock.name) + '</span>' : ''}</div>")
save('game.js',g)
c=load('style.css')
css='''
/* ---- option screens: one labelled row per choice; main button stays in view; "Quà" turns green when something can be claimed */
.gone{display:none!important}
.lobby-side .mini-btn.can{background:linear-gradient(180deg,#5fdc8f,#2aa860);border-color:#c9ffdc;box-shadow:0 4px 0 #17773b,0 0 18px rgba(95,224,138,.75);animation:canpulse 1.4s ease-in-out infinite}
@keyframes canpulse{50%{transform:translateY(-3px)}}
.opt{display:flex;align-items:center;justify-content:space-between;gap:8px 16px;flex-wrap:wrap;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.1)}
.opt.col{display:block;border-bottom:0}.opt.col .opt-l{margin-bottom:8px}
.opt-l{min-width:0}.opt-l b{display:block;font-family:var(--display);font-size:16px}.opt-l small{display:block;font-size:12px;opacity:.75;font-weight:600;margin-top:1px}
.opt-r{display:flex;gap:8px;flex-wrap:wrap}
.cta.sticky{position:sticky;bottom:0;z-index:3;margin-bottom:0}
.opt-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 14px;margin:10px 0}
.opt-grid>div>span{display:block;font-size:12px;font-weight:800;opacity:.8;margin-bottom:4px}
.opt-grid .wide{grid-column:1/-1}.opt-grid select{width:100%}
.card-hint{display:block;font-size:12px;opacity:.75}
#rewardsBody .cta{font-size:19px;padding:11px;margin:12px 0 4px}
.ach-gift{display:inline-flex;align-items:center;gap:5px;margin-top:5px;padding:2px 10px 2px 4px;border-radius:999px;background:rgba(255,215,106,.16);color:#ffd76a;font-size:12px;font-weight:800}
.ach-gift img{width:20px;height:20px;border-radius:50%}
@media (max-width:560px){
  .venues{grid-template-columns:1fr 1fr}.venue{min-height:0;padding:9px 30px 9px 10px}.venue small{display:none}
  .opt .seg button{padding-left:10px;padding-right:10px}
}
'''
if '\r\n' in c: css=css.replace('\n','\r\n')
save('style.css',c+css)
print('ok')
