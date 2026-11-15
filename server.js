/* Shuttle Paws — game server: static files + WebSocket rooms/matchmaking, authoritative simulation. */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const zlib = require('zlib');
const ZIP_EXT = new Set(['.js', '.css', '.html', '.json', '.svg', '.webmanifest']);
const Sim = require('./sim.js');

const PORT = +process.env.PORT || 3040;
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'data.json');
const PUBLIC = new Set(['index.html', 'style.css', 'game.js', 'sim.js', 'lib/three.min.js', 'manifest.webmanifest', 'icon.svg']);
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };

// ------------------------------------------------------------------ persistence
let data = { players: {} };
try { data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (e) { /* first run */ }
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => fs.writeFile(DATA_FILE, JSON.stringify(data), () => {}), 500);
}

// ------------------------------------------------------------------ http
const server = http.createServer((req, res) => {
  let p;
  try { p = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\/+/, ''); }
  catch (e) { res.writeHead(400); res.end('bad request'); return; }
  if (p === '') p = 'index.html';
  if (p === 'api/health') { res.end('ok'); return; }
  // client files only (data.json / server.js stay private): the fixed list + animation packs (anim*.js) + the lab
  if (!PUBLIC.has(p) && !/^(anim(_[a-z]+)?|lab)\.js$/.test(p)) { res.writeHead(404); res.end('not found'); return; }
  const file = path.join(ROOT, p);
  fs.stat(file, (serr, st) => {
    if (serr || !st.isFile()) { res.writeHead(404); res.end('not found'); return; }
    // validator so browsers keep scripts cached and only ask "changed?" (304) instead of downloading again
    const etag = '"' + st.size.toString(36) + '-' + Math.floor(st.mtimeMs).toString(36) + '"';
    const ext = path.extname(p);
    const head = { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache', ETag: etag };
    if (req.headers['if-none-match'] === etag) { res.writeHead(304, head); res.end(); return; }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404); res.end('not found'); return; }
      const zip = ZIP_EXT.has(ext) && buf.length > 2048 && String(req.headers['accept-encoding'] || '').indexOf('gzip') >= 0;
      if (!zip) { res.writeHead(200, head); res.end(buf); return; }
      zlib.gzip(buf, (zerr, out) => {
        if (zerr) { res.writeHead(200, head); res.end(buf); return; }
        res.writeHead(200, Object.assign({ 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding' }, head)); res.end(out);
      });
    });
  });
});

// ------------------------------------------------------------------ state
const wss = new WebSocketServer({ server });
const clients = new Set();
const rooms = new Map();     // code -> room
const matches = new Map();   // id -> match
let quickQueue = [];

const send = (c, msg) => { if (c && c.ws.readyState === 1) c.ws.send(JSON.stringify(msg)); };
const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
const code5 = () => { let c; do c = Math.random().toString(36).slice(2, 7).toUpperCase(); while (rooms.has(c)); return c; };
const validChar = (id) => (Sim.CHARS.some((c) => c.id === id) ? id : 'cat');

function onlineCount() { return clients.size; }

function roomView(r) {
  return {
    code: r.code, mode: r.mode, points: r.points, games: r.games || 1, venue: r.venue, open: r.open, host: r.host,
    state: r.match ? 'playing' : 'lobby',
    slots: r.slots.map((c) => (c ? { id: c.id, name: c.name, char: c.char } : null)),
  };
}
function lobbyView() {
  return {
    t: 'lobby', online: onlineCount(),
    rooms: [...rooms.values()].filter((r) => r.open && !r.match).map(roomView),
    matches: [...matches.values()].filter((m) => !m.ended).map((m) => ({
      id: m.id, mode: m.sim.opts.mode, venue: m.sim.opts.venue, score: m.sim.score,
      names: m.sim.athletes.map((a) => a.name), watchers: m.spectators.size,
    })),
  };
}
function broadcastRoom(r) { for (const c of r.slots) if (c) send(c, { t: 'room', room: roomView(r) }); }
function roomChat(r, from, text) {
  const msg = { t: 'chat', from, text, room: r.code };
  for (const c of r.slots) if (c) send(c, msg);
  if (r.match) for (const c of r.match.spectators) send(c, msg);
}

// ------------------------------------------------------------------ rooms
function leaveRoom(c) {
  const r = c.room && rooms.get(c.room);
  c.room = null;
  if (!r) return;
  const i = r.slots.indexOf(c);
  if (i >= 0) r.slots[i] = null;
  if (!r.slots.some(Boolean)) { rooms.delete(r.code); return; }
  if (r.host === c.id) r.host = r.slots.find(Boolean).id;
  broadcastRoom(r);
}
function resizeSlots(r) {
  const n = r.mode === '2v2' ? 4 : 2;
  const people = r.slots.filter(Boolean);
  r.slots = new Array(n).fill(null);
  people.slice(0, n).forEach((p, i) => { r.slots[n === 4 ? [0, 2, 1, 3][i] : i] = p; });
  for (const p of people.slice(n)) { p.room = null; send(p, { t: 'kicked', reason: 'Phòng đã đổi sang 1v1.' }); }
}

// ------------------------------------------------------------------ matches
let matchSeq = 1;
function startMatch(players, opts, room) {
  // players: array of client|null by slot; nulls become bots
  // empty seats get bots that look like players (own name, any character, either hand). A bot on a team with a
  // human is a solid partner (Khó); a team made only of bots plays at Vừa so humans + bot partners can keep up
  const per = opts.mode === '2v2' ? 2 : 1;
  const teamHasHuman = (t) => players.some((c, i) => c && Math.floor(i / per) === t);
  const BOT_NAMES = ['Bánh Bao', 'Su Su', 'Kẹo Dẻo', 'Bi Bo', 'Mít', 'Xoài', 'Đậu Phộng', 'Cốm', 'Bơ', 'Tí Nị', 'Chè', 'Hạt Tiêu', 'Bông Gòn', 'Na Na'];
  const pool = BOT_NAMES.slice().sort(() => Math.random() - 0.5);
  const slots = players.map((c, i) => (c ? { name: c.name, char: c.char, hand: c.hand || 'R', ctrl: 'human', assist: 1 }
    : { name: pool.pop() + ' (bot)', char: Sim.CHARS[Math.floor(Math.random() * Sim.CHARS.length)].id, hand: Math.random() < 0.18 ? 'L' : 'R', ctrl: 'bot', diff: teamHasHuman(Math.floor(i / per)) ? 2 : 1 }));
  // PvP is level: everyone gets the same hit help (press early is fine) and nobody gets auto-movement
  const sim = Sim.createMatch({ mode: opts.mode, points: opts.points, games: opts.games === 3 ? 3 : 1, venue: opts.venue, slots, hitStop: true, moveAssist: false, autoSave: false });
  const m = { id: 'm' + matchSeq++, sim, players: players.slice(), spectators: new Set(), room: room ? room.code : null, tick: 0, ended: false, rematch: new Set(), lastIn: players.map(() => ({ h: 0, j: 0, d: 0, e: 0 })) };
  matches.set(m.id, m);
  if (room) room.match = m;
  players.forEach((c, i) => {
    if (!c) return;
    c.match = m.id; c.slot = i; c.spectating = null;
    send(c, startMsg(m, i));
  });
  m.timer = setInterval(() => tickMatch(m), 1000 / 60);
  return m;
}
function startMsg(m, you) {
  return { t: 'start', id: m.id, mode: m.sim.opts.mode, points: m.sim.opts.points, games: m.sim.opts.games, venue: m.sim.opts.venue, you,
    slots: m.sim.athletes.map((a) => ({ name: a.name, char: a.char, hand: a.hand, ctrl: a.ctrl })), room: m.room };
}
function tickMatch(m) {
  if (m.ended) return;
  Sim.step(m.sim); Sim.step(m.sim);
  m.tick++;
  if (m.tick % 2 === 0 || m.sim.events.length) {
    const msg = JSON.stringify({ t: 'snap', id: m.id, s: Sim.snapshot(m.sim), ev: m.sim.events.map(stripEv) });
    m.sim.events.length = 0;
    for (const c of m.players) if (c && c.ws.readyState === 1 && c.match === m.id) c.ws.send(msg);
    for (const c of m.spectators) if (c.ws.readyState === 1) c.ws.send(msg);
  }
  if (m.sim.state === 'over') endMatch(m);
}
function stripEv(e) { return e; }
function endMatch(m) {
  m.ended = true; clearInterval(m.timer);
  const w = m.sim.winner;
  m.sim.athletes.forEach((a, i) => {
    const c = m.players[i];
    if (!c || !data.players[c.id]) return;
    const p = data.players[c.id];
    p.played = (p.played || 0) + 1;
    if (a.team === w) p.wins = (p.wins || 0) + 1;
    p.name = c.name;
  });
  save();
  const summary = { t: 'over', id: m.id, winner: w, score: m.sim.score, games: m.sim.games, gameScores: m.sim.gameScores, stats: m.sim.athletes.map((a) => ({ name: a.name, ...a.stats })), longest: m.sim.longest };
  for (const c of m.players) if (c && c.match === m.id) send(c, summary);
  for (const c of m.spectators) { send(c, summary); c.spectating = null; }
  m.spectators.clear();
  const room = m.room && rooms.get(m.room);
  if (room) { room.match = null; broadcastRoom(room); }
  setTimeout(() => { if (matches.get(m.id) === m && !m.restarted) matches.delete(m.id); }, 60000);
}
function leaveMatch(c, reason) {
  const m = c.match && matches.get(c.match);
  c.match = null;
  if (!m) return;
  const i = m.players.indexOf(c);
  if (i < 0) return;
  m.players[i] = null;
  if (!m.ended) {
    const a = m.sim.athletes[i];
    a.ctrl = 'bot'; a.diff = 2; a.name = 'Bot'; a.input = { x: 0, y: 0, hit: false, jump: false, dive: false, emote: 0 };
    if (!m.players.some(Boolean)) { m.ended = true; clearInterval(m.timer); matches.delete(m.id); const r = m.room && rooms.get(m.room); if (r) r.match = null; return; }
    for (const o of m.players) if (o) send(o, { t: 'notice', text: reason || 'Một người chơi đã rời trận. Bot sẽ thay thế.' });
  }
}

// ------------------------------------------------------------------ messages
const handlers = {
  hello(c, msg) {
    let id = clean(msg.id, 40), secret = clean(msg.secret, 80);
    const rec = id && data.players[id];
    if (!rec || rec.secret !== secret) { id = crypto.randomUUID(); secret = crypto.randomBytes(18).toString('hex'); data.players[id] = { secret, name: '', wins: 0, played: 0 }; save(); }
    c.id = id;
    c.name = clean(msg.name, 18) || 'Khách';
    c.char = validChar(msg.char); c.hand = msg.hand === 'L' ? 'L' : 'R';
    c.assist = Sim.clamp(msg.assist | 0, 0, 2);
    data.players[id].name = c.name;
    send(c, { t: 'welcome', id, secret, online: onlineCount(), wins: data.players[id].wins || 0, played: data.players[id].played || 0 });
  },
  profile(c, msg) {
    if (msg.name) c.name = clean(msg.name, 18) || c.name;
    if (msg.char) c.char = validChar(msg.char);
    if (msg.hand) c.hand = msg.hand === 'L' ? 'L' : 'R';
    if (msg.assist !== undefined) c.assist = Sim.clamp(msg.assist | 0, 0, 2);
    const r = c.room && rooms.get(c.room); if (r) broadcastRoom(r);
  },
  ping(c, msg) { send(c, { t: 'pong', c: msg.c }); },
  lobby(c) { send(c, lobbyView()); },
  leaderboard(c) {
    const top = Object.entries(data.players).filter(([, p]) => p.wins > 0 || p.played > 0)
      .map(([id, p]) => ({ name: p.name || 'Khách', wins: p.wins || 0, played: p.played || 0, me: id === c.id }))
      .sort((a, b) => b.wins - a.wins || a.played - b.played).slice(0, 30);
    send(c, { t: 'leaderboard', top });
  },
  quick(c) {
    if (c.match) return;
    leaveRoom(c);
    quickQueue = quickQueue.filter((q) => q !== c && q.ws.readyState === 1 && !q.match && !q.room && !q.spectating);
    const other = quickQueue.shift();
    if (other) {
      send(other, { t: 'found' }); send(c, { t: 'found' });
      startMatch(Math.random() < 0.5 ? [c, other] : [other, c], { mode: '1v1', points: 11, games: 1, venue: Math.floor(Math.random() * Sim.VENUES.length) }, null);
    } else { quickQueue.push(c); send(c, { t: 'queued' }); }
  },
  unquick(c) { quickQueue = quickQueue.filter((q) => q !== c); send(c, { t: 'unqueued' }); },
  createRoom(c, msg) {
    if (c.match) return;
    quickQueue = quickQueue.filter((q) => q !== c);
    leaveRoom(c);
    const mode = msg.mode === '2v2' ? '2v2' : '1v1';
    const r = { code: code5(), host: c.id, mode, points: msg.points === 21 ? 21 : 11, games: msg.games === 3 ? 3 : 1, venue: Sim.clamp(+msg.venue || 0, -1, Sim.VENUES.length - 1), open: !!msg.open, slots: new Array(mode === '2v2' ? 4 : 2).fill(null), match: null };
    r.slots[0] = c; c.room = r.code;
    rooms.set(r.code, r);
    broadcastRoom(r);
  },
  joinRoom(c, msg) {
    if (c.match) return;
    const r = rooms.get(clean(msg.code, 8).toUpperCase());
    if (!r) { send(c, { t: 'error', text: 'Không tìm thấy phòng này.' }); return; }
    if (r.slots.includes(c)) { quickQueue = quickQueue.filter((q) => q !== c); broadcastRoom(r); return; }
    if (r.match) { send(c, { t: 'error', text: 'Phòng đang thi đấu. Hãy vào xem trận.' }); return; }
    const i = r.slots.indexOf(null);
    if (i < 0) { send(c, { t: 'error', text: 'Phòng đã đủ người.' }); return; }
    quickQueue = quickQueue.filter((q) => q !== c);
    leaveRoom(c);
    r.slots[i] = c; c.room = r.code;
    broadcastRoom(r);
    roomChat(r, '', c.name + ' đã vào phòng');
  },
  leaveRoom(c) {
    leaveMatch(c, c.name + ' đã rời phòng. Bot sẽ thay thế.');
    quickQueue = quickQueue.filter((q) => q !== c);
    leaveRoom(c);
    send(c, { t: 'room', room: null });
  },
  roomSet(c, msg) {
    const r = c.room && rooms.get(c.room);
    if (!r || r.host !== c.id || r.match) return;
    if (msg.mode && msg.mode !== r.mode) { r.mode = msg.mode === '2v2' ? '2v2' : '1v1'; resizeSlots(r); }
    if (msg.points) r.points = msg.points === 21 ? 21 : 11;
    if (msg.games) r.games = msg.games === 3 ? 3 : 1;
    if (msg.venue !== undefined) r.venue = Sim.clamp(+msg.venue, -1, Sim.VENUES.length - 1);
    if (msg.open !== undefined) r.open = !!msg.open;
    broadcastRoom(r);
  },
  swap(c, msg) {
    const r = c.room && rooms.get(c.room);
    if (!r || r.match) return;
    const to = +msg.slot;
    if (!(to >= 0 && to < r.slots.length) || r.slots[to]) return;
    r.slots[r.slots.indexOf(c)] = null; r.slots[to] = c;
    broadcastRoom(r);
  },
  start(c) {
    const r = c.room && rooms.get(c.room);
    if (!r || r.host !== c.id || r.match) return;
    const venue = r.venue < 0 ? Math.floor(Math.random() * Sim.VENUES.length) : r.venue;
    startMatch(r.slots.slice(), { mode: r.mode, points: r.points, games: r.games || 1, venue }, r);
  },
  chat(c, msg) {
    const text = clean(msg.text, 140);
    if (!text) return;
    const m = c.match && matches.get(c.match);
    const r = c.room && rooms.get(c.room);
    if (r) roomChat(r, c.name, text);
    else if (m) { const out = { t: 'chat', from: c.name, text }; for (const o of m.players) if (o) send(o, out); for (const o of m.spectators) send(o, out); }
    else if (c.spectating) { const sm = matches.get(c.spectating); if (sm) { const out = { t: 'chat', from: c.name + ' (xem)', text }; for (const o of sm.players) if (o) send(o, out); for (const o of sm.spectators) send(o, out); } }
  },
  input(c, msg) {
    const m = c.match && matches.get(c.match);
    if (!m || m.ended) return;
    const i = m.players.indexOf(c);
    if (i < 0) return;
    const a = m.sim.athletes[i], last = m.lastIn[i];
    a.input.x = Sim.clamp(+msg.x || 0, -1, 1); a.input.y = Sim.clamp(+msg.y || 0, -1, 1);
    if (msg.h > last.h) { a.input.hit = true; last.h = msg.h; }
    if (msg.j > last.j) { a.input.jump = true; last.j = msg.j; }
    if (msg.d > last.d) { a.input.dive = true; last.d = msg.d; }
    if (msg.e > last.e) { a.input.emote = Sim.clamp(msg.em | 0, 1, 8); last.e = msg.e; }
    a.lag = Sim.clamp(+msg.lag || 0, 0, 0.25);
    a.input.power = msg.p === undefined ? -1 : Sim.clamp(+msg.p || 0, 0, 1);
    a.input.hold = !!msg.hd; a.input.holdPower = Sim.clamp(+msg.hp || 0, 0, 1);
  },
  spectate(c, msg) {
    const m = matches.get(clean(msg.id, 20));
    if (!m || m.ended || c.match) { send(c, { t: 'error', text: 'Trận này đã kết thúc.' }); return; }
    if (c.spectating) { const o = matches.get(c.spectating); if (o) o.spectators.delete(c); }
    leaveRoom(c);
    c.spectating = m.id; m.spectators.add(c);
    send(c, startMsg(m, -1));
  },
  unspectate(c) { const o = c.spectating && matches.get(c.spectating); if (o) o.spectators.delete(c); c.spectating = null; },
  leaveMatch(c) {
    const m = c.match && matches.get(c.match);
    leaveMatch(c, c.name + ' đã rời trận. Bot sẽ thay thế.');
    if (m && m.room) { const r = rooms.get(m.room); if (r && r.slots.includes(c)) { send(c, { t: 'room', room: roomView(r) }); } }
  },
  rematch(c) {
    const m = c.match && matches.get(c.match);
    if (!m || !m.ended) return;
    m.rematch.add(c);
    const humans = m.players.filter((p) => p && p.match === m.id && p.ws.readyState === 1);
    for (const h of humans) send(h, { t: 'rematchVote', n: m.rematch.size, of: humans.length });
    if (humans.every((h) => m.rematch.has(h))) {
      m.restarted = true; matches.delete(m.id);
      const room = m.room && rooms.get(m.room);
      startMatch(m.players.map((p) => (p && p.match === m.id ? p : null)), { mode: m.sim.opts.mode, points: m.sim.opts.points, games: m.sim.opts.games, venue: m.sim.opts.venue }, room);
    }
  },
  exitMatch(c) { // after match over: back to room/lobby
    const m = c.match && matches.get(c.match);
    if (m) { const i = m.players.indexOf(c); if (i >= 0) m.players[i] = null; }
    c.match = null;
    const r = c.room && rooms.get(c.room);
    send(c, { t: 'room', room: r ? roomView(r) : null });
  },
};

wss.on('connection', (ws) => {
  const c = { ws, id: null, name: 'Khách', char: 'cat', room: null, match: null, slot: -1, spectating: null };
  clients.add(c);
  ws.on('message', (raw) => {
    if (raw.length > 2000) return;
    let msg; try { msg = JSON.parse(raw); } catch (e) { return; }
    if (!msg || typeof msg !== 'object' || Array.isArray(msg) || typeof msg.t !== 'string') return;
    const h = Object.prototype.hasOwnProperty.call(handlers, msg.t) ? handlers[msg.t] : null;
    if (!h || (!c.id && msg.t !== 'hello')) return;
    try { h(c, msg); } catch (e) { console.error('handler', msg.t, e); }
  });
  ws.on('close', () => {
    clients.delete(c);
    quickQueue = quickQueue.filter((q) => q !== c);
    leaveMatch(c, c.name + ' mất kết nối. Bot sẽ thay thế.');
    leaveRoom(c);
    if (c.spectating) { const o = matches.get(c.spectating); if (o) o.spectators.delete(c); }
  });
});

server.listen(PORT, () => console.log(`Shuttle Paws server: http://localhost:${PORT}`));
