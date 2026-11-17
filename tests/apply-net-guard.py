# One-off patch: athletes are never drawn through the net. A dive toward the net from close up lies along the net; whatever the pose
# still needs, the model is eased back from the net plane (drawing only - the simulation is untouched).
p='game.js';s=open(p,encoding='utf-8',newline='').read();nl='\r\n' if '\r\n' in s else '\n'
def rep(a,b):
    global s
    a=a.replace('\n',nl);b=b.replace('\n',nl);assert s.count(a)==1,a[:70];s=s.replace(a,b)
rep("  if (a.diveT >= 0 && (a.diveDx || a.diveDz)) yaw = Math.atan2(a.diveDx, a.diveDz);\n",
"""  if (a.diveT >= 0 && (a.diveDx || a.diveDz)) {
    yaw = Math.atan2(a.diveDx, a.diveDz);
    // diving toward the net from close up: lie along the net instead of through it
    const sgT = S.sgn(a.team), dl = Math.hypot(a.diveDx, a.diveDz), toNet = -sgT * a.diveDz / dl, most = clamp((Math.abs(a.z) - 0.45) / 1.3, 0, 1);
    if (toNet > most) { const ph = Math.acos(most), sd = a.diveDx >= 0 ? 1 : -1; yaw = Math.atan2(sd * Math.sin(ph), -sgT * Math.cos(ph)); }
  }
""")
rep("  if (md.lie > 0) by = Math.max(by, (0.13 + (mdl.diveLift || 0)) * md.lie);\n",
"""  if (md.lie > 0) by = Math.max(by, (0.13 + (mdl.diveLift || 0)) * md.lie);
  if (a.team !== undefined) {   // net guard: the room the pose needs in front of it (more when lying toward the net) is kept clear of the net plane
    const sgT = S.sgn(a.team), toNet = Math.max(0, -sgT * Math.cos(mdl.root.rotation.y));
    const need = 0.4 + toNet * (0.22 + md.lie * 1.15), push = Math.max(0, need - mdl.root.position.z * sgT);
    md.netPush = push > (md.netPush || 0) ? push : damp(md.netPush || 0, push, 8, dt);
    mdl.root.position.z += sgT * md.netPush;
  }
""")
open(p,'w',encoding='utf-8',newline='').write(s)
print('ok')
