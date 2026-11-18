# One-off patch: signed copy of the player's record kept in the browser, restored after the server lost its data (hosts without a persistent disk).
import re
from pathlib import Path
import os; os.chdir(Path(__file__).resolve().parents[1])
def patch(name,pairs):
    s=open(name,encoding='utf-8',newline='').read()
    for a,b in pairs:
        assert s.count(a)==1,(name,a[:60]); s=s.replace(a,b)
    open(name,'w',encoding='utf-8',newline='').write(s)
eol='\r\n' if '\r\n' in open('server.js',encoding='utf-8',newline='').read() else '\n'
patch('server.js',[
 ("const send = (c, msg) => { if (c && c.ws.readyState === 1) c.ws.send(JSON.stringify(msg)); };",
  "const send = (c, msg) => { if (c && c.ws.readyState === 1) { c.ws.send(JSON.stringify(msg)); if (msg && msg.t === 'wallet') sendBackup(c); } };"+eol+
  "// Player record backup for hosts without a persistent disk: the player's browser keeps a copy of its own record, signed with"+eol+
  "// BACKUP_KEY (a secret that survives restarts). After the server has lost its data, a hello carrying that copy restores the record."+eol+
  "// A copy is only accepted when the server has no record for that id, so it can never overwrite newer progress."+eol+
  "const BACKUP_KEY = process.env.BACKUP_KEY || '';"+eol+
  "const signBackup = (body) => crypto.createHmac('sha256', BACKUP_KEY).update(body).digest('base64url');"+eol+
  "function sendBackup(c) { if (!BACKUP_KEY || !c.id || !data.players[c.id]) return; const body = Buffer.from(JSON.stringify({ id: c.id, rec: data.players[c.id] })).toString('base64url'); c.ws.send(JSON.stringify({ t: 'backup', v: body + '.' + signBackup(body) })); }"+eol+
  "function readBackup(v, id, secret) {"+eol+
  "  if (!BACKUP_KEY || typeof v !== 'string' || v.length > 60000) return null;"+eol+
  "  const [body, sig] = v.split('.'); if (!body || !sig) return null;"+eol+
  "  const a = Buffer.from(sig), b = Buffer.from(signBackup(body)); if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;"+eol+
  "  try { const o = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); return o && o.id === id && o.rec && o.rec.secret === secret ? o.rec : null; } catch (e) { return null; }"+eol+
  "}"),
 ("    const rec = id && data.players[id];"+eol, "    if (id && !data.players[id]) { const old = readBackup(msg.backup, id, secret); if (old) { data.players[id] = old; console.log('restored player from backup', id.slice(0, 8)); } }"+eol+"    const rec = id && data.players[id];"+eol),
])
patch('game.js',[
 ("this.send({ t: 'hello', id: profile.id, secret: profile.secret, name: profile.name,", "this.send({ t: 'hello', backup: store.get('sp.backup', null) || undefined, id: profile.id, secret: profile.secret, name: profile.name,"),
 ("      case 'welcome':\n", "      case 'backup': store.set('sp.backup', msg.v); break;\n      case 'welcome':\n"),
])
y=open('render.yaml',encoding='utf-8').read().rstrip('\n')+"\n    envVars:\n      - key: BACKUP_KEY\n        generateValue: true\n"
open('render.yaml','w',encoding='utf-8',newline='\n').write(y); print('ok')
