# One-off patch: neck items redone as chest pieces (the big head hides the collar): larger, lower, lying on the chest.
from pathlib import Path
p = Path(__file__).resolve().parents[1] / 'game.js'; s = p.read_bytes().decode('utf-8')
i = s.index("  const lace = (u, lift) =>"); j = s.index("  const bz = -surfZ(tc + 0.03);"); assert 0 < i < j
NEW = r"""  const lace = (u, lift, D = 0.14, W = 0.17) => { const x = u * W * tx, y = cy - 0.045 - D * (1 - u * u); return new THREE.Vector3(x, y, chestZ(x, y) + lift); };
  const laceTube = (r, mat, D, W, ol) => { const pts = []; for (let k = -8; k <= 8; k++) pts.push(lace(k / 8, r * 0.8, D, W)); return NK(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 36, r, 7), mat, 0, 0, 0, ol); };
  // a flat strip lying on the chest from (x0,y0) to (x1,y1): w wide, standing t proud of the shirt
  const strip = (x0, y0, x1, y1, w, t, mat, ol) => { const N = 6, pos = [], idx = [];
    for (let k = 0; k <= N; k++) { const x = x0 + (x1 - x0) * k / N, y = y0 + (y1 - y0) * k / N, dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), px = -dy / L * w / 2, py = dx / L * w / 2;
      for (const sd of [-1, 1]) { const xx = x + px * sd, yy = y + py * sd; pos.push(xx, yy, chestZ(xx, yy) + t); } }
    for (let k = 0; k < N; k++) { const a = k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); ge.setIndex(idx); ge.computeVertexNormals();
    return NK(ge, mat, 0, 0, 0, ol); };
  const DS = { side: THREE.DoubleSide };
  if (GI.neck === 'n_towel') {      // towel over the shoulders, both ends hanging down the chest with a blue stripe
    const tw = toon(0xffffff, DS), bl = toon(0x4fb8e8, DS);
    for (const sd of [-1, 1]) { strip(sd * 0.125 * tx, cy - 0.02, sd * 0.1 * tx, tc - 0.075, 0.1, 0.02, tw); strip(sd * 0.103 * tx, tc - 0.03, sd * 0.1 * tx, tc - 0.052, 0.1, 0.024, bl);
      const sh = NK(new THREE.SphereGeometry(0.075, 12, 8), toon(0xffffff), sd * 0.15 * tx, cy + 0.0, 0.02, true); sh.scale.set(1.0, 0.55, 1.5); }
  } else if (GI.neck === 'n_chain') {   // gold chain on the chest with a large gem
    laceTube(0.012, toon(0xf2c230), 0.13);
    const pb = lace(0, 0.03, 0.13); NK(new THREE.OctahedronGeometry(0.06), toon(GL.neck), pb.x, pb.y - 0.045, pb.z + 0.004, true).scale.set(0.8, 1.2, 0.5);
    NK(new THREE.SphereGeometry(0.02, 8, 6), toon(0xf2c230), pb.x, pb.y + 0.005, pb.z);
  } else if (GI.neck === 'n_medal') {   // wide red and blue ribbon in a V, big gold medal with a star
    const my = tc + 0.0;
    strip(-0.13 * tx, cy - 0.03, -0.012, my + 0.05, 0.05, 0.012, toon(0x3f6fd9, DS)); strip(0.13 * tx, cy - 0.03, 0.012, my + 0.05, 0.05, 0.014, toon(0xd9483b, DS));
    const md = NK(new THREE.CylinderGeometry(0.078, 0.078, 0.02, 24), toon(0xf2c230), 0, my, chestZ(0, my) + 0.03, true); md.rotation.x = Math.PI / 2 - 0.12;
    const mr = NK(new THREE.TorusGeometry(0.06, 0.008, 5, 24), toon(0xffe9a8), 0, my, chestZ(0, my) + 0.042); mr.rotation.x = -0.12;
    const ms = NK(new THREE.CircleGeometry(0.042, 5), basic(0xfff3c4), 0, my, chestZ(0, my) + 0.043); ms.rotation.set(-0.12, 0, Math.PI / 10);
  } else if (GI.neck === 'n_bell') {    // red collar lying on the chest with a big gold bell
    laceTube(0.024, toon(GL.neck), 0.075, 0.17, true);
    const pb = lace(0, 0.05, 0.075); NK(new THREE.SphereGeometry(0.062, 14, 10), toon(0xf2c230), pb.x, pb.y - 0.05, pb.z, true);
    NK(new THREE.BoxGeometry(0.012, 0.05, 0.014), toon(0x5a3d12), pb.x, pb.y - 0.075, pb.z + 0.056); NK(new THREE.SphereGeometry(0.016, 8, 6), toon(0x5a3d12), pb.x, pb.y - 0.047, pb.z + 0.06);
    NK(new THREE.TorusGeometry(0.063, 0.006, 5, 20), toon(0xffe9a8), pb.x, pb.y - 0.05, pb.z).rotation.x = Math.PI / 2;
  } else if (GI.neck === 'n_bow') {     // big bow tie under the chin on a white collar
    laceTube(0.014, toon(0xffffff), 0.05, 0.17);
    const pb = lace(0, 0.045, 0.085), dk = toon(shadeHex(GL.neck, -0.28));
    for (const sd of [-1, 1]) { const lb = NK(new THREE.ConeGeometry(0.075, 0.13, 4), toon(GL.neck), sd * 0.08, pb.y, pb.z, true); lb.rotation.z = sd * Math.PI / 2; lb.scale.z = 0.42;
      NK(new THREE.BoxGeometry(0.01, 0.07, 0.01), dk, sd * 0.07, pb.y, pb.z + 0.03); }
    NK(new THREE.SphereGeometry(0.034, 10, 8), dk, 0, pb.y, pb.z + 0.014, true).scale.set(0.9, 1.2, 0.8);
  } else if (GI.neck === 'n_pearl') {   // string of large pearls on the chest (one mesh) with a pink pearl in the middle
    const pos = [], nor = [], N = 15;
    for (let i = 0; i < N; i++) { const q = lace((i / (N - 1)) * 2 - 1, 0.022, 0.13), ge = new THREE.SphereGeometry(0.029, 10, 8).toNonIndexed().translate(q.x, q.y, q.z);
      for (const v of ge.attributes.position.array) pos.push(v); for (const v of ge.attributes.normal.array) nor.push(v); ge.dispose(); }
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); bg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    NK(bg, toon(GL.neck), 0, 0, 0, true);
    const pb = lace(0, 0.03, 0.13); NK(new THREE.SphereGeometry(0.046, 14, 10), toon(0xff9fc4), pb.x, pb.y - 0.03, pb.z, true);
  }
"""
s = s[:i] + NEW + s[j:]
p.write_bytes(s.encode('utf-8')); print('ok')
