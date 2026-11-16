# One-off: inserts tests/feel-block.js.txt into game.js and hooks it up. Asserts every anchor occurs exactly once.
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'game.js';s=p.read_bytes().decode('utf-8')
nl='\r\n' if '\r\n' in s else '\n'
def rep(a,b):
    global s
    a=a.replace('\n',nl);b=b.replace('\n',nl);assert s.count(a)==1,(s.count(a),a[:70]);s=s.replace(a,b)
feel=(ROOT/'tests/feel-block.js.txt').read_text(encoding='utf-8').replace('\r\n','\n')
EV="// ================================================================ events\n"
rep(EV,feel+EV)
rep("function handleEvent(e) {\n  const m = session.m, me = session.me;\n","function handleEvent(e) {\n  const m = session.m, me = session.me;\n  Feel.onEvent(e, m, me);\n")
rep("      m.rally = (m.rally || 0) + 1;\n      trailPts.length = 0;\n","      m.rally = (m.rally || 0) + 1;\n      Feel.hit(e, m, me);\n      trailPts.length = 0;\n")
rep("    cheer(big) {","    ooh() { noise(0.7, 620, 0.5, 0.2); tone(300, 0.5, 0.035, 'sine', 1.35); },\n    heart() { tone(62, 0.13, 0.3, 'sine', 0.8); tone(56, 0.12, 0.22, 'sine', 0.8, 0.17); },\n    cheer(big) {")
rep("  session.acc += rdt * TIME_SCALE * debugSpeed;","  session.acc += rdt * TIME_SCALE * debugSpeed * Feel.timeScale();")
rep("  fov += camExtra;\n","  fov += camExtra + Feel.fov();\n")
rep("    confettiTick(rdt);\n","    confettiTick(rdt);\n    Feel.tick(rdt, session ? session.m : null);\n")
rep("window.__spDebug = { Net,","window.__spDebug = { Feel, Net,")
p.write_bytes(s.encode('utf-8'));print('applied')
