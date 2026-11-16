# One-off patch: lighter rendering. Static venue props sharing a parent + material are merged into one mesh; no officials at the low
# graphics level; phones start at the low level; rendering is capped at ~60 frames a second on faster screens.
def patch(p, reps):
    s=open(p,encoding='utf-8',newline='').read(); crlf='\r\n' in s
    for a,b in reps:
        if crlf: a=a.replace('\n','\r\n'); b=b.replace('\n','\r\n')
        assert s.count(a)==1,(p,a[:70],s.count(a)); s=s.replace(a,b)
    open(p,'w',encoding='utf-8',newline='').write(s)
patch('game.js',[
("// one-time: the landing marker is now on by default online too (older saves had it off)",
 "// one-time: phones and tablets start at the low graphics level (it can be raised in Settings)\nif (settings.gfxV !== 1) { if (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches) settings.gfx = 0; settings.gfxV = 1; }\n// one-time: the landing marker is now on by default online too (older saves had it off)"),
("  group.traverse((o) => { if (o.isMesh) { o.getWorldPosition(wp); if (wp.y > 9 && Math.abs(wp.x) < 20 && Math.abs(wp.z) < 30) venue.overhead.push({ o, y: wp.y }); } });\n}",
 """  group.traverse((o) => { if (o.isMesh) { o.getWorldPosition(wp); if (wp.y > 9 && Math.abs(wp.x) < 20 && Math.abs(wp.z) < 30) venue.overhead.push({ o, y: wp.y }); } });
  mergeStaticVenue(venue);
}
// Venue props that never move are drawn together: meshes with the same parent and material become one mesh (hundreds fewer draw calls).
// Left alone: instanced crowds, anything the venue's own animation moves (found by running it at two times), ceiling parts and
// other objects the camera code shows / hides one by one.
function mergeStaticVenue(v) {
  const skip = new Set(), all = [];
  for (const it of v.overhead) skip.add(it.o);
  for (const k of ['beams', 'endStands', 'flags']) for (const o of v[k] || []) if (o && o.isObject3D) o.traverse((c) => skip.add(c));
  v.group.traverse((o) => { if (o.isMesh) all.push(o); });
  const sig = (o) => o.position.x + ',' + o.position.y + ',' + o.position.z + ',' + o.quaternion.x + ',' + o.quaternion.y + ',' + o.quaternion.z + ',' + o.scale.x + ',' + o.scale.y + ',' + o.visible + ',' + (o.geometry.attributes.position ? o.geometry.attributes.position.version : 0) + ',' + o.material.uuid;
  const run = (t) => { try { for (const f of venueFx) f(t, 0.016); if (v.crowd) v.crowd(t, 0.5); if (v.extra) v.extra(t, 0.016, { x: 0.6, z: 0.3 }); } catch (e) { /* probe only */ } };
  run(3.1); const s0 = all.map(sig); run(3.47); all.forEach((o, i) => { o.quaternion.setFromEuler(o.rotation); if (sig(o) !== s0[i]) skip.add(o); });
  const buckets = new Map();
  for (const o of all) {
    const g = o.geometry;
    if (o.isInstancedMesh || o.isSkinnedMesh || skip.has(o) || o.children.length || !o.visible || Array.isArray(o.material) || !g.attributes.position || !g.attributes.normal || g.morphAttributes.position || g.groups.length > 1) continue;
    o.updateMatrix(); if (o.matrix.determinant() <= 0) continue;
    const key = o.parent.uuid + '|' + o.material.uuid + '|' + (g.attributes.uv ? 1 : 0) + (g.attributes.color ? 1 : 0) + (o.castShadow ? 1 : 0) + (o.receiveShadow ? 1 : 0) + (o.userData.isOutline ? 1 : 0) + (o.frustumCulled ? 1 : 0) + '|' + o.renderOrder + '|' + o.layers.mask;
    if (!buckets.has(key)) buckets.set(key, []); buckets.get(key).push(o);
  }
  const p = new THREE.Vector3(), nm = new THREE.Matrix3();
  for (const list of buckets.values()) {
    if (list.length < 2) continue;
    const first = list[0], hasUv = !!first.geometry.attributes.uv, hasCol = !!first.geometry.attributes.color, colSize = hasCol ? first.geometry.attributes.color.itemSize : 3;
    if (hasCol && list.some((o) => o.geometry.attributes.color.itemSize !== colSize)) continue;
    const pos = [], nor = [], uv = [], col = [];
    for (const o of list) {
      const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry, P = g.attributes.position, N = g.attributes.normal;
      nm.getNormalMatrix(o.matrix);
      for (let i = 0; i < P.count; i++) {
        p.fromBufferAttribute(P, i).applyMatrix4(o.matrix); pos.push(p.x, p.y, p.z);
        p.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor.push(p.x, p.y, p.z);
        if (hasUv) uv.push(g.attributes.uv.getX(i), g.attributes.uv.getY(i));
        if (hasCol) for (let c = 0; c < colSize; c++) col.push(g.attributes.color.array[i * colSize + c]);
      }
      if (g !== o.geometry) g.dispose();
    }
    const mg = new THREE.BufferGeometry();
    mg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); mg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    if (hasUv) mg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    if (hasCol) mg.setAttribute('color', new THREE.Float32BufferAttribute(col, colSize));
    const mm = new THREE.Mesh(mg, first.material);
    mm.castShadow = first.castShadow; mm.receiveShadow = first.receiveShadow; mm.renderOrder = first.renderOrder; mm.frustumCulled = first.frustumCulled; mm.layers.mask = first.layers.mask;
    mm.userData.noOutline = true; if (first.userData.isOutline) mm.userData.isOutline = true;
    first.parent.add(mm);
    for (const o of list) { o.parent.remove(o); o.geometry.dispose(); }
  }
}"""),
("  session.officials = buildOfficials();","  session.officials = settings.gfx >= 1 ? buildOfficials() : null;   // umpire + scoreboard are scenery: left out at the low graphics level"),
("function frame(now) {\n  requestAnimationFrame(frame);\n",
 "function frame(now) {\n  requestAnimationFrame(frame);\n  if (now - last < 12.5) return;   // 90 / 120 Hz screens: draw at most ~60 times a second (half the work, same game speed)\n"),
])
print('ok')
