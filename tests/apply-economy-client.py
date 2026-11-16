# One-off: client side of the economy (wallet chip, rewards screen, buying characters, match rewards).
# Asserts every anchor occurs exactly once; keeps each file's line endings.
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def patch(name,reps,append=None):
    p=ROOT/name;s=p.read_bytes().decode('utf-8');nl='\r\n' if '\r\n' in s else '\n'
    for a,b in reps:
        a=a.replace('\n',nl);b=b.replace('\n',nl);assert s.count(a)==1,(name,s.count(a),a[:80]);s=s.replace(a,b)
    if append: s=s.rstrip()+nl+append.replace('\n',nl)+nl
    p.write_bytes(s.encode('utf-8'))

ECO_JS='''// ================================================================ economy (the server owns every number; the client only shows them)
function onWallet(msg) {
  wallet = { gold: msg.gold, owned: msg.owned, prices: msg.prices, login: msg.login, quests: msg.quests, localLeft: msg.localLeft };
  store.set('sp.wallet', wallet);
  if (!isUnlocked(charById(profile.char))) { profile.char = 'cat'; saveAll(); Net.profile(); }
  const g = msg.grant;
  if (g && g.gold > 0) {
    Sound.ach();
    if (!$('over').classList.contains('hidden')) $('overAch').insertAdjacentHTML('afterbegin', `<div class="toast"><i class="coin"></i>+${g.gold} vàng<small>${esc(g.why)}</small></div>`);
    else toast('+' + g.gold + ' vàng', g.why, 'star');
  } else if (g && g.why && (screen === 'rewards' || !$('over').classList.contains('hidden'))) toast(g.why, '', 'clock');
  const b = msg.bought;
  if (b && b.ok) { profile.char = b.char; infoChar = b.char; saveAll(); Net.profile(); Sound.ach(); toast('Đã mở khoá ' + charById(b.char).name, '−' + b.spent + ' vàng', 'check'); showPreview(true); }
  else if (b) toast(b.why, '', 'lock');
  renderWallet();
}
function renderWallet() {
  $('homeGold').textContent = wallet ? wallet.gold : '…';
  const n = wallet ? (wallet.login.can ? 1 : 0) + wallet.quests.filter((q) => q.prog >= q.goal && !q.claimed).length : 0;
  $('rewardDot').textContent = n; $('rewardDot').classList.toggle('hidden', !n);
  if (screen === 'rewards') renderRewards();
  if (screen === 'chars') renderChars();
}
function renderRewards() {
  const el = $('rewardsBody');
  if (!wallet) { el.innerHTML = '<p class="tiny">Đang kết nối máy chủ… Vàng và nhiệm vụ cần có mạng.</p>'; return; }
  const L = wallet.login, done = L.can ? L.streak - 1 : L.streak;
  const days = L.rewards.map((r, i) => `<div class="login-day${i < done ? ' done' : ''}${L.can && i === L.streak - 1 ? ' now' : ''}"><small>Ngày ${i + 1}</small><b><i class="coin"></i>${r}</b></div>`).join('');
  const quests = wallet.quests.map((q) => {
    const ok = q.prog >= q.goal;
    return `<div class="quest"><div class="q-main"><b>${esc(q.name)}</b><div class="q-bar"><i style="width:${Math.round(q.prog / q.goal * 100)}%"></i></div><small>${q.prog}/${q.goal}</small></div>` +
      `<button class="pill" data-quest="${q.id}" ${ok && !q.claimed ? '' : 'disabled'}>${q.claimed ? 'Đã nhận' : `<i class="coin"></i>${q.reward}`}</button></div>`;
  }).join('');
  el.innerHTML = `<p class="gold-line"><span class="gold-chip"><i class="coin"></i><b>${wallet.gold}</b></span></p>` +
    `<h3>Quà đăng nhập</h3><div class="login-row">${days}</div>` +
    `<button class="cta" id="loginClaim" ${L.can ? '' : 'disabled'}>${L.can ? `Nhận quà ngày ${L.streak} · ${L.reward} vàng` : 'Hôm nay đã nhận · mai quay lại nhé'}</button>` +
    `<h3>Nhiệm vụ hôm nay</h3>${quests}` +
    `<p class="tiny">Thắng bot: 20–60 vàng tuỳ độ khó · thắng online: 60 vàng. Vàng đấu bot hôm nay còn nhận được: ${wallet.localLeft}.</p>`;
  $('loginClaim').onclick = () => { Sound.boop(); Net.send({ t: 'claimLogin' }); };
  el.querySelectorAll('[data-quest]').forEach((b) => { b.onclick = () => { Sound.boop(); Net.send({ t: 'claimQuest', id: b.dataset.quest }); }; });
}

'''
CSS='''
/* ---- economy: wallet chip, rewards screen, buy button */
.wallet-row{display:flex;justify-content:center;align-items:center;gap:10px;margin:0 0 12px}
.gold-chip{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:999px;background:rgba(0,0,0,.28);border:2px solid rgba(255,215,106,.55);color:#ffd76a;font-weight:900;font-size:17px}
.coin{display:inline-block;width:16px;height:16px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff3b0,#ffc531 55%,#d99200);box-shadow:inset 0 -2px 0 rgba(0,0,0,.22);vertical-align:-2px;margin-right:4px;flex:none}
#rewardsBtn{position:relative}
#rewardDot{position:absolute;top:-7px;right:-7px;min-width:20px;height:20px;border-radius:10px;background:#ff4d6a;color:#fff;font-size:12px;font-style:normal;line-height:20px;text-align:center;padding:0 4px}
#rewardsBody h3{margin:16px 0 8px}
.gold-line{text-align:center;margin:0}
.login-row{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}
.login-day{text-align:center;border-radius:12px;padding:8px 2px;background:var(--card,rgba(255,255,255,.1));border:2px solid transparent}
.login-day small{display:block;opacity:.8;font-size:11px}.login-day b{font-size:14px;white-space:nowrap}
.login-day.done{opacity:.45}.login-day.now{border-color:#ffd76a;box-shadow:0 0 0 3px rgba(255,215,106,.2)}
.quest{display:flex;align-items:center;gap:10px;background:var(--card,rgba(255,255,255,.1));border-radius:14px;padding:10px 12px;margin-bottom:8px}
.quest .q-main{flex:1;min-width:0}.quest small{opacity:.8}
.q-bar{height:8px;border-radius:4px;background:rgba(0,0,0,.3);margin:5px 0 2px;overflow:hidden}.q-bar i{display:block;height:100%;background:#ffd76a;border-radius:4px}
.pill:disabled,.cta:disabled{opacity:.5;cursor:default}
#charBuy{margin:8px 0 4px;font-size:18px;padding:10px}
@media (max-width:520px){.login-row{grid-template-columns:repeat(4,1fr)}}
'''
patch('game.js',[
 ("const isUnlocked = (c) => !c.unlock || achieved[c.unlock];",
  "// wallet: last state the server sent (gold, owned characters, prices, login streak, quests); cached only for display\nlet wallet = store.get('sp.wallet', null);\nconst FREE_OWNED = ['cat', 'bunny', 'bear', 'panda'];\nconst ownedChars = () => (wallet && wallet.owned) || FREE_OWNED;\nconst charPrice = (id) => (wallet && wallet.prices && wallet.prices[id]) || 0;\n// usable = owned (free or bought with gold) or earned through its achievement\nconst isUnlocked = (c) => ownedChars().includes(c.id) || !!(c.unlock && achieved[c.unlock]);"),
 ("// ================================================================ events\n", ECO_JS+"// ================================================================ events\n"),
 ("      case 'welcome':\n", "      case 'wallet': onWallet(msg); break;\n      case 'welcome':\n"),
 ("    if (won) Sound.win(); else Sound.lose();\n", "    if (won) Sound.win(); else Sound.lose();\n    if (session.kind === 'local') Net.send({ t: 'localResult', win: won, diff: session.localOpts ? session.localOpts.diff : 0, dur: Math.round(m.clock || 0) });   // the server decides the gold\n"),
 ("    (ok ? '' : `<p>${icon('lock')} Mở khoá: <b>${esc(req ? req.name : '')}</b>, ${esc(req ? req.desc : '')}</p>`) + `<div class=\"bars\">${bars}</div>`;\n",
  "    (ok ? '' : (req ? `<p>${icon('lock')} Mở khoá: <b>${esc(req.name)}</b>, ${esc(req.desc)}${price ? ' · hoặc mua bằng vàng' : ''}</p>` : '') +\n      (price ? `<button class=\"cta\" id=\"charBuy\" ${wallet && wallet.gold >= price ? '' : 'disabled'}><i class=\"coin\"></i>Mua · ${price} vàng</button><p class=\"tiny\">Bạn đang có ${wallet ? wallet.gold : 0} vàng${wallet && wallet.gold < price ? ' · còn thiếu ' + (price - wallet.gold) : ''}</p>` : '')) + `<div class=\"bars\">${bars}</div>`;\n  if ($('charBuy')) $('charBuy').onclick = () => { Sound.boop(); Net.send({ t: 'buyChar', id: c.id }); };\n"),
 ("  const req = c.unlock ? ACH.find((a) => a.id === c.unlock) : null;\n", "  const req = c.unlock ? ACH.find((a) => a.id === c.unlock) : null, price = charPrice(c.id);\n"),
 ("  $('homeStats').textContent = `${P.matches} trận", "  renderWallet();\n  $('homeStats').textContent = `${P.matches} trận"),
 ("ach: renderAch, stats: renderStats,", "ach: renderAch, rewards: renderRewards, stats: renderStats,"),
])
patch('index.html',[
 ("      <div class=\"menu-grid\">\n        <button class=\"big-btn orange\" data-go=\"bot\">",
  "      <div class=\"wallet-row\"><span class=\"gold-chip\"><i class=\"coin\"></i><b id=\"homeGold\">…</b></span><button class=\"pill\" id=\"rewardsBtn\" data-go=\"rewards\">Quà &amp; nhiệm vụ<em id=\"rewardDot\" class=\"hidden\"></em></button></div>\n      <div class=\"menu-grid\">\n        <button class=\"big-btn orange\" data-go=\"bot\">"),
 ("  <section id=\"s-ach\" class=\"screen hidden\">",
  "  <section id=\"s-rewards\" class=\"screen hidden\">\n    <div class=\"panel wide\">\n      <header><button class=\"back\" data-go=\"home\">‹</button><h2>Quà &amp; nhiệm vụ</h2></header>\n      <div id=\"rewardsBody\"></div>\n    </div>\n  </section>\n\n  <section id=\"s-ach\" class=\"screen hidden\">"),
])
patch('style.css',[],append=CSS)
print('client ok')
