# One-off: client side of rejoin + room bench / seat swapping. Asserts every anchor occurs exactly once.
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def patch(name,reps,append=None):
    p=ROOT/name;s=p.read_bytes().decode('utf-8');nl='\r\n' if '\r\n' in s else '\n'
    for a,b in reps:
        a=a.replace('\n',nl);b=b.replace('\n',nl);assert s.count(a)==1,(name,s.count(a),a[:80]);s=s.replace(a,b)
    if append: s=s.rstrip()+nl+append.replace('\n',nl)+nl
    p.write_bytes(s.encode('utf-8'))
JS='''// ---- rejoin: the server keeps the seat (a bot plays it) while the match runs; this bar is the way back in
function renderRejoin() {
  const o = Net.rejoin, show = !!(o && o.id) && !(session && !session.over);
  $('rejoinBar').classList.toggle('hidden', !show);
  if (show) $('rejoinText').textContent = 'Trận của bạn vẫn đang diễn ra' + (o.score ? ' · ' + o.score[0] + ' – ' + o.score[1] : '') + ' (bot đang đánh thay)';
}
$('rejoinBtn').onclick = () => { Sound.init(); Sound.boop(); if (Net.rejoin && Net.rejoin.id) Net.send({ t: 'rejoin', id: Net.rejoin.id }); };
$('rejoinX').onclick = () => { Net.rejoin = null; renderRejoin(); };
// ---- someone asks to trade seats with me
let swapAskT = null;
function showSwapAsk(msg) {
  const el = $('roomAsk'); clearTimeout(swapAskT);
  el.innerHTML = `<span><b>${esc(msg.name)}</b> muốn đổi chỗ với bạn</span><button class="pill" data-ok="1">Đồng ý</button><button class="pill" data-ok="0">Không</button>`;
  el.classList.remove('hidden'); Sound.pop();
  const done = (ok) => { clearTimeout(swapAskT); el.classList.add('hidden'); Net.send({ t: 'swapReply', from: msg.from, ok }); };
  el.querySelectorAll('button').forEach((b) => { b.onclick = () => done(b.dataset.ok === '1'); });
  swapAskT = setTimeout(() => done(false), 20000);
}

'''
CSS='''
/* ---- rejoin bar, room bench, seat swap request */
#rejoinBar{position:fixed;left:50%;top:max(10px,env(safe-area-inset-top));transform:translateX(-50%);z-index:60;display:flex;align-items:center;gap:10px;max-width:94vw;
  padding:8px 10px 8px 16px;border-radius:999px;background:linear-gradient(180deg,#34399a,#232766);border:2px solid rgba(255,215,106,.7);color:#fff;font-weight:800;font-size:14px;box-shadow:0 8px 24px rgba(0,0,0,.35)}
#rejoinBar.hidden{display:none}
#rejoinBtn{background:linear-gradient(180deg,#ffd76a,#ffb531);color:#3b2a00}
#rejoinX{border:0;background:transparent;color:#cfd3ff;font-size:20px;cursor:pointer;padding:0 6px}
.slot.other{cursor:pointer}.slot .swp{font-size:11px;opacity:.7;margin-left:auto;white-space:nowrap}
.slot .host+.swp{margin-left:8px}
.bench{margin:10px 0 4px;padding:10px 12px;border-radius:14px;background:var(--card,rgba(255,255,255,.08));border:2px dashed rgba(255,255,255,.22)}
.bench h4{margin:0 0 6px;display:flex;align-items:center;gap:8px}.bench h4 small{font-weight:600;opacity:.75}
.bench .who{display:inline-flex;align-items:center;gap:6px;margin:0 8px 6px 0;padding:4px 10px 4px 4px;border-radius:999px;background:rgba(255,255,255,.12);font-weight:800;font-size:14px}
.bench .who img{width:26px;height:26px;border-radius:50%}
.bench .who.mine{outline:2px solid #ffd76a}
#benchDown{margin-left:auto}
#roomAsk{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:8px 0;padding:10px 12px;border-radius:14px;background:rgba(255,215,106,.16);border:2px solid rgba(255,215,106,.6)}
#roomAsk.hidden{display:none}#roomAsk span{flex:1;min-width:150px}
'''
patch('game.js',[
 ("// ================================================================ economy (the server owns every number", JS+"// ================================================================ economy (the server owns every number"),
 ("      case 'wallet': onWallet(msg); break;\n", "      case 'wallet': onWallet(msg); break;\n      case 'rejoinOffer':\n        this.rejoin = msg.id ? msg : null;\n        // dropped out of a match by a lost connection: go straight back in\n        if (msg.id && this.autoRejoin === msg.id && !session) { toast('Đang vào lại trận…', '', 'refresh'); this.send({ t: 'rejoin', id: msg.id }); }\n        this.autoRejoin = null; renderRejoin();\n        break;\n      case 'swapAsk': if (screen === 'room' && !session) showSwapAsk(msg); else this.send({ t: 'swapReply', from: msg.from, ok: false }); break;\n"),
 ("      if (session && session.kind !== 'local') { toast('Mất kết nối tới máy chủ'); session.over = true; go('online'); }\n      if (screen === 'online' || screen === 'room' || was) setTimeout(() => this.connect(), Math.min(8000, 1000 * ++this.retry));",
  "      if (session && session.kind !== 'local') { if (session.kind === 'online' && !session.over) this.autoRejoin = session.netId; toast('Mất kết nối tới máy chủ', this.autoRejoin ? 'Bot đánh thay · sẽ tự vào lại khi có mạng' : ''); session.over = true; go('online'); }\n      this.rejoin = null; renderRejoin();\n      setTimeout(() => this.connect(), Math.min(8000, 1000 * ++this.retry));   // the wallet needs the server on every screen, so always retry"),
 ("        this.searching = false; $('searching').classList.add('hidden'); $('over').classList.add('hidden');\n        const view = makeView(msg);", "        this.searching = false; $('searching').classList.add('hidden'); $('over').classList.add('hidden');\n        this.rejoin = null; this.autoRejoin = null; $('rejoinBar').classList.add('hidden');\n        const view = makeView(msg);"),
 ("  else if (kind === 'watch') { Net.send({ t: 'unspectate' }); go('online'); }", "  else if (kind === 'watch') { Net.send({ t: 'unspectate' }); go(Net.room ? 'room' : 'online'); }"),
 ("    if (!s) return `<div class=\"slot open\" data-slot=\"${i}\">＋ Chỗ trống <small style=\"margin-left:auto\">(bot nếu trống)</small></div>`;",
  "    if (!s) return `<div class=\"slot open\" data-slot=\"${i}\">＋ ${seated ? 'Chuyển sang đây' : 'Vào chơi ở đây'} <small style=\"margin-left:auto\">(bot nếu trống)</small></div>`;"),
 ("    return `<div class=\"slot ${mine ? 'mine' : ''}\" ${mine ? 'data-me=\"1\"' : ''}>", "    return `<div class=\"slot ${mine ? 'mine' : 'other'}\" ${mine ? 'data-me=\"1\"' : `data-slot=\"${i}\"`}>"),
 ("  const per = r.mode === '2v2' ? 2 : 1;\n  const slotHtml = (i) => {", "  const per = r.mode === '2v2' ? 2 : 1;\n  const seated = r.slots.some((s) => s && s.id === profile.id), bench = r.bench || [];\n  const slotHtml = (i) => {"),
 ("  $('roomTeams').innerHTML = `<div class=\"team\"><h4>Đội A</h4>${a}</div><div class=\"team b\"><h4>Đội B</h4>${b}</div>`;",
  "  $('roomTeams').innerHTML = `<div class=\"team\"><h4>Đội A</h4>${a}</div><div class=\"team b\"><h4>Đội B</h4>${b}</div>`;\n  // the bench: in the room but not playing; they watch the match and can take a seat or ask to trade\n  $('roomBench').innerHTML = `<h4>${icon('eye')}Ngồi xem <small>${bench.length ? '' : '· chưa có ai'}</small>${seated ? '<button class=\"pill\" id=\"benchDown\">Xuống xem</button>' : ''}</h4>` +\n    bench.map((s) => `<span class=\"who${s.id === profile.id ? ' mine' : ''}\">${faceImg(s.char)}${esc(s.name)}${s.id === profile.id ? ' (bạn)' : ''}${s.id === r.host ? ' · chủ phòng' : ''}</span>`).join('') +\n    `<p class=\"tiny\">${seated ? 'Bấm vào chỗ của người khác để đổi chỗ' + (isHost ? '' : ' (họ cần đồng ý)') + ', hoặc bấm chỗ trống để chuyển sang.' : 'Bấm chỗ trống để vào chơi, hoặc bấm vào một người để xin đổi chỗ.'}</p>`;\n  if ($('benchDown')) $('benchDown').onclick = () => { Sound.boop(); Net.send({ t: 'swap', slot: -1 }); };"),
 ("  $('roomTeams').querySelectorAll('[data-slot]').forEach((el) => { el.onclick = () => Net.send({ t: 'swap', slot: +el.dataset.slot }); });", "  $('roomTeams').querySelectorAll('[data-slot]').forEach((el) => { el.onclick = () => { Sound.boop(); Net.send({ t: 'swap', slot: +el.dataset.slot }); }; });"),
 ("  $('roomWait').textContent = isHost ? 'Gửi mã phòng hoặc link cho bạn bè để cùng chơi.' : 'Đang chờ chủ phòng bắt đầu…';", "  $('roomWait').textContent = r.state === 'playing' ? 'Phòng đang thi đấu.' : isHost ? 'Gửi mã phòng hoặc link cho bạn bè để cùng chơi.' : 'Đang chờ chủ phòng bắt đầu…';"),
 ("  screen = name;\n  for (const s of SCREENS)", "  screen = name; renderRejoin();\n  for (const s of SCREENS)"),
])
patch('index.html',[
 ("      <div class=\"teams\" id=\"roomTeams\"></div>\n", "      <div class=\"teams\" id=\"roomTeams\"></div>\n      <div class=\"bench\" id=\"roomBench\"></div>\n      <div id=\"roomAsk\" class=\"hidden\"></div>\n"),
 ("<!-- Pause -->\n", "<div id=\"rejoinBar\" class=\"hidden\"><span id=\"rejoinText\"></span><button class=\"pill\" id=\"rejoinBtn\">Vào lại trận</button><button id=\"rejoinX\" aria-label=\"Đóng\">×</button></div>\n\n<!-- Pause -->\n"),
])
patch('style.css',[],append=CSS)
print('client patched')
