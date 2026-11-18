# One-off patch: shirt runs down to the waistband line, real cap instead of the visor, necklaces laid on the chest (visible below the chin), glasses temples follow the head.
from pathlib import Path
p = Path(__file__).resolve().parents[1] / 'game.js'; s = p.read_bytes().decode('utf-8')
def rep(a, b):
    global s
    assert s.count(a) == 1, (s.count(a), a[:80]); s = s.replace(a, b)
# --- shirt hem at the very bottom edge; a gear shirt keeps its own colour down to the waistband
rep("const hem = U(new THREE.TorusGeometry(0.27 * Math.sqrt(1 - Math.pow(0.11 / (0.27 * ty), 2)) + 0.004, 0.012, 6, 30), mKit, 0, tc - 0.11, 0);",
    "const hemD = tc - 0.362, hem = U(new THREE.TorusGeometry(0.27 * Math.sqrt(1 - Math.pow(hemD / (0.27 * ty), 2)) + 0.003, 0.011, 6, 30), GL.shirt !== undefined ? toon(shadeHex(GL.shirt, -0.2)) : mKit, 0, tc - hemD, 0);")
# --- cap
i = s.index("  if (kind === 'visor') {"); j = s.index("  if (kind === 'crown') {"); assert i < j
s = s[:i] + """  if (kind === 'visor') {   // baseball cap: dome over the top of the head, button, band and a brim tipped down over the brow
    if (!fit.parent) gr.add(fit);
    const cap = new THREE.Group(); cap.rotation.x = -0.2; fit.add(cap);
    const dk = toon(shadeHex(teamColor, -0.28), { side: THREE.DoubleSide });
    mk(new THREE.SphereGeometry(1.06, 28, 10, 0, Math.PI * 2, 0, Math.acos(0.26)), team, 0, 0, 0, cap, true);
    mk(new THREE.CylinderGeometry(1.035, 1.05, 0.09, 32, 1, true), dk, 0, 0.3, 0, cap);
    mk(new THREE.SphereGeometry(0.1, 10, 8), acc, 0, 1.07, 0, cap);
    const front = mk(new THREE.SphereGeometry(1.075, 14, 8, -0.5, 1.0, 0.5, 0.72), acc, 0, 0, 0, cap); front.rotation.y = 0;
    const brim = mk(new THREE.CylinderGeometry(0.86, 0.86, 0.1, 28, 1, false, -1.0, 2.0), dk, 0, 0.27, 0.42, cap, true); brim.rotation.x = 0.36; brim.scale.z = 1.12;
    return gr;
  }
""" + s[j:]
# --- necklaces on the chest
rep("  const cy = tc + 0.27 * ty - 0.07;                 // collar height\n",
    "  const cy = tc + 0.27 * ty - 0.07;                 // collar height\n"
    "  const chestZ = (x, y) => 0.27 * tz * Math.sqrt(Math.max(0.03, 1 - Math.pow((y - tc) / (0.27 * ty), 2) - Math.pow(x / (0.27 * tx), 2)));\n"
    "  // a necklace lies on the chest in a U from the shoulders down to mid-chest, so it shows below the chin\n"
    "  const lace = (u, lift) => { const x = u * 0.15 * tx, y = cy - 0.02 - 0.125 * (1 - u * u); return new THREE.Vector3(x, y, chestZ(x, y) + lift); };\n")
i = s.index("  } else if (GI.neck === 'n_chain') {"); j = s.index("  } else if (GI.neck === 'n_medal') {"); assert i < j
s = s[:i] + """  } else if (GI.neck === 'n_chain') {   // gold chain lying on the chest with a gem pendant
    const pts = []; for (let k = -8; k <= 8; k++) pts.push(lace(k / 8, 0.012));
    NK(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.0085, 6), toon(0xf2c230), 0, 0, 0);
    const pb = lace(0, 0.03); NK(new THREE.OctahedronGeometry(0.046), toon(GL.neck), pb.x, pb.y - 0.03, pb.z, true).scale.set(0.8, 1.2, 0.55);
    NK(new THREE.SphereGeometry(0.016, 8, 6), toon(0xf2c230), pb.x, pb.y + 0.012, pb.z);
""" + s[j:]
i = s.index("  } else if (GI.neck === 'n_pearl') {"); j = s.index("  const bz = -surfZ(tc + 0.03);"); assert i < j
s = s[:i] + """  } else if (GI.neck === 'n_pearl') {   // string of pearls on the chest (one mesh) with a larger pink pearl in the middle
    const pos = [], nor = [], N = 19;
    for (let i = 0; i < N; i++) { const q = lace((i / (N - 1)) * 2 - 1, 0.016), ge = new THREE.SphereGeometry(0.0215, 8, 6).toNonIndexed().translate(q.x, q.y, q.z);
      for (const v of ge.attributes.position.array) pos.push(v); for (const v of ge.attributes.normal.array) nor.push(v); ge.dispose(); }
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); bg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    NK(bg, toon(GL.neck), 0, 0, 0);
    const pb = lace(0, 0.026); NK(new THREE.SphereGeometry(0.036, 12, 10), toon(0xff9fc4), pb.x, pb.y - 0.012, pb.z, true);
  }
""" + s[j:]
# towel: longer, wider ends
rep("e = NK(new THREE.CapsuleGeometry(0.04, 0.11, 3, 8), tw, sd * 0.085, y,", "e = NK(new THREE.CapsuleGeometry(0.05, 0.15, 3, 8), tw, sd * 0.095, y - 0.02,")
rep("const st = NK(new THREE.BoxGeometry(0.082, 0.014, 0.012), toon(0x4fb8e8), sd * 0.085, y - 0.055, surfZ(y - 0.055) * 0.86 + 0.052);", "const st = NK(new THREE.BoxGeometry(0.1, 0.018, 0.012), toon(0x4fb8e8), sd * 0.095, y - 0.1, surfZ(y - 0.1) * 0.86 + 0.06);")
# --- glasses temples in two pieces round the head; coloured strap
rep("if (kind !== 'e_sport') rod(new THREE.Vector3(s * (exA + R * sx * 0.93), gy + R * 0.25, gz - 0.035), new THREE.Vector3(s * sideX, gy + 0.03, 0.02), kind === 'e_shade' ? 0.012 : 0.007, frameM);",
    "if (kind !== 'e_sport') { const tr = kind === 'e_shade' ? 0.012 : 0.007, zm = gz * 0.6, a = new THREE.Vector3(s * (exA + R * sx * 0.93), gy + R * 0.25, gz - 0.035), m = new THREE.Vector3(s * (sideX * Math.sqrt(Math.max(0.1, 1 - Math.pow(zm / AXz, 2))) + 0.012), gy + 0.035, zm), b = new THREE.Vector3(s * (sideX + 0.006), gy + 0.03, -0.02); rod(a, m, tr, frameM); rod(m, b, tr, frameM); }")
rep("toon(0x2f3340), 0, 0, 0, st); r.rotation.set(Math.PI / 2, 0, Math.PI / 2 + 0.65);", "toon(shadeHex(GL.face, -0.45)), 0, 0, 0, st); r.rotation.set(Math.PI / 2, 0, Math.PI / 2 + 0.65);")
p.write_bytes(s.encode('utf-8')); print('ok')
