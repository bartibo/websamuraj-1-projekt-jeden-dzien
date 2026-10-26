/* Na Krawędzi – obiekty na trasie: bramki, most linowy, skalny łuk, lądowisko, miejsce wyskoku */
(function (root) {
  'use strict';
  const WS = root.WS;
  const { clamp, lerp } = WS.U;

  class Props {
    constructor(scene, world) {
      this.scene = scene; this.world = world;
      this.group = new THREE.Group();
      scene.add(this.group);
      this.gateMeshes = [];
      this._gates();
      if (world.bridge) this._bridge(world.bridge);
      if (world.arch) this._arch(world.arch);
      this._landing();
      this._exit();
    }

    dispose() {
      this.group.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
      this.scene.remove(this.group);
    }

    _gates() {
      const geo = new THREE.TorusGeometry(13, 0.55, 10, 56);
      const glowGeo = new THREE.TorusGeometry(13, 2.4, 8, 56);
      for (const g of this.world.gates) {
        if (g.type !== 'ring') { this.gateMeshes.push(null); continue; }
        const mat = WS.patchFog(new THREE.MeshBasicMaterial({ color: 0xffffff }));
        const ring = new THREE.Mesh(geo, mat);
        const gm = new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
        const glow = new THREE.Mesh(glowGeo, gm);
        const grp = new THREE.Group();
        grp.add(ring, glow);
        grp.position.set(g.x, g.y, g.z);
        grp.rotation.y = Math.atan2(g.t.x, g.t.z);
        this.group.add(grp);
        this.gateMeshes.push({ grp, ring, glow, mat, gm, state: 'wait', t: 0 });
      }
    }

    setGateState(i, st) { const m = this.gateMeshes[i]; if (m) { m.state = st; m.t = 0; } }

    update(dt, time, nextIdx) {
      for (let i = 0; i < this.gateMeshes.length; i++) {
        const m = this.gateMeshes[i];
        if (!m) continue;
        m.t += dt;
        let col, op, sc = 1;
        if (m.state === 'ok') { col = 0x5dff8a; op = Math.max(0, 0.5 - m.t * 0.5); sc = 1 + m.t * 0.6; }
        else if (m.state === 'miss') { col = 0xff3344; op = Math.max(0, 0.35 - m.t * 0.3); }
        else if (i === nextIdx) { col = 0xffa21a; op = 0.32 + 0.18 * Math.sin(time * 6); sc = 1 + 0.03 * Math.sin(time * 6); }
        else if (i === nextIdx + 1) { col = 0xfff1d6; op = 0.12; }
        else { col = 0xd8e4ee; op = 0.05; }
        m.mat.color.setHex(col);
        m.gm.color.setHex(col);
        m.gm.opacity = op;
        m.grp.scale.setScalar(sc);
        m.grp.visible = !(m.state !== 'wait' && m.t > 1.2);
      }
    }

    _bridge(b) {
      const w = this.world;
      const grp = new THREE.Group();
      const len = b.half * 2;
      // pomost z desek
      const cv = document.createElement('canvas'); cv.width = 64; cv.height = 512;
      const cx = cv.getContext('2d');
      for (let i = 0; i < 64; i++) {
        const v = 90 + Math.random() * 50;
        cx.fillStyle = `rgb(${v + 30},${v + 5},${v - 25})`;
        cx.fillRect(0, i * 8, 64, 7);
        cx.fillStyle = 'rgba(20,10,0,0.6)'; cx.fillRect(0, i * 8 + 7, 64, 1);
      }
      const tex = new THREE.CanvasTexture(cv);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(1, len / 40);
      const deck = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.35, len), WS.patchFog(new THREE.MeshLambertMaterial({ map: tex })));
      grp.add(deck);
      // liny: nośne (zwis), poręcze, wieszaki, flagi modlitewne
      const segs = [];
      const N = 40;
      const sag = (t) => 9 * (1 - Math.pow(2 * t - 1, 2));
      for (const side of [-1.35, 1.35]) {
        for (let i = 0; i < N; i++) {
          const t0 = i / N, t1 = (i + 1) / N;
          const z0 = -len / 2 + t0 * len, z1 = -len / 2 + t1 * len;
          segs.push(side, 11 - sag(t0), z0, side, 11 - sag(t1), z1);
          segs.push(side, 1.1, z0, side, 1.1, z1);
          if (i % 2 === 0) segs.push(side, 0.15, z0, side, 11 - sag(t0), z0);
        }
      }
      const lg = new THREE.BufferGeometry();
      lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(segs), 3));
      grp.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x2a2620 })));
      const fcols = [0x2f6fe0, 0xffffff, 0xe0322f, 0x2fb34a, 0xf2c824];
      const fg = new THREE.PlaneGeometry(0.9, 1.1);
      for (let i = 2; i < N - 2; i++) {
        const t = i / N;
        const f = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ color: fcols[i % 5], side: THREE.DoubleSide }));
        f.position.set(1.35, 11 - sag(t) - 0.7, -len / 2 + t * len);
        f.rotation.y = Math.PI / 2;
        grp.add(f);
        this.flags = this.flags || [];
        this.flags.push(f);
      }
      grp.position.set(b.mx, b.y, b.mz);
      grp.rotation.y = Math.atan2(b.n.x, b.n.z);
      this.group.add(grp);
      this.bridgeGrp = grp;
    }

    _arch(a) {
      const R = a.R, r = a.r;
      const geo = new THREE.TorusGeometry(R, r, 14, 60, Math.PI);
      const pos = geo.attributes.position;
      const n = new WS.U.Simplex(77);
      const col = new Float32Array(pos.count * 3);
      const v = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        const th = Math.atan2(v.y, v.x);
        const cxp = R * Math.cos(th), cyp = R * Math.sin(th);
        const k = (0.85 + 0.15 * Math.cos(th * 3)) * (1 + n.noise(v.x * 0.15, v.y * 0.15 + v.z * 0.1) * 0.12);
        v.x = cxp + (v.x - cxp) * k; v.y = cyp + (v.y - cyp) * k; v.z *= k * 1.1;
        pos.setXYZ(i, v.x, v.y, v.z);
        const band = 0.5 + 0.5 * Math.sin(v.y * 0.35 + n.noise(v.x * 0.05, 3) * 2);
        col[i * 3] = lerp(0.62, 0.8, band); col[i * 3 + 1] = lerp(0.3, 0.46, band); col[i * 3 + 2] = lerp(0.18, 0.28, band);
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, WS.patchFog(new THREE.MeshLambertMaterial({ vertexColors: true })));
      m.position.set(a.x, a.y, a.z);
      m.rotation.y = Math.atan2(-a.n.z, a.n.x);
      this.group.add(m);
    }

    _landing() {
      const L = this.world.land;
      const grp = new THREE.Group();
      const y = this.world.height(L.x, L.z, 0) + 0.12;
      const rings = [[0, 3, 0xff5a1f], [3, 10, 0xffffff], [10, 13, 0xff5a1f], [13, 24, 0xffffff], [24, 26, 0xff5a1f]];
      for (const [a, b, c] of rings) {
        const g = new THREE.RingGeometry(Math.max(0.01, a), b, 48);
        g.rotateX(-Math.PI / 2);
        const mm = new THREE.Mesh(g, WS.patchFog(new THREE.MeshLambertMaterial({ color: c, transparent: true, opacity: 0.85 })));
        mm.renderOrder = 1;
        grp.add(mm);
      }
      // rękaw lotniskowy (kierunek wiatru)
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 6, 6), WS.patchFog(new THREE.MeshLambertMaterial({ color: 0xdddddd })));
      pole.position.set(32, 3, 0);
      grp.add(pole);
      const sockG = new THREE.CylinderGeometry(0.55, 0.25, 3.2, 10, 4, true);
      sockG.rotateZ(Math.PI / 2); sockG.translate(1.6, 0, 0);
      const sc = new Float32Array(sockG.attributes.position.count * 3);
      for (let i = 0; i < sockG.attributes.position.count; i++) {
        const x = sockG.attributes.position.getX(i);
        const red = Math.floor(x / 0.8) % 2 === 0;
        sc[i * 3] = 1; sc[i * 3 + 1] = red ? 0.3 : 1; sc[i * 3 + 2] = red ? 0.15 : 1;
      }
      sockG.setAttribute('color', new THREE.BufferAttribute(sc, 3));
      this.sock = new THREE.Mesh(sockG, WS.patchFog(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })));
      this.sock.position.set(32, 5.8, 0);
      grp.add(this.sock);
      grp.position.set(L.x, y, L.z);
      this.group.add(grp);
      this.landGrp = grp;
    }

    _exit() {
      const E = this.world.exit;
      const grp = new THREE.Group();
      const rockM = WS.patchFog(new THREE.MeshLambertMaterial({ color: 0x777069, flatShading: true }));
      for (let i = 0; i < 5; i++) {
        const s = 0.9 - i * 0.15;
        const st = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockM);
        st.position.set(-6.5, 0.4 + i * 0.75, -9);
        st.rotation.set(i, i * 2, i * 3);
        grp.add(st);
      }
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3, 5), WS.patchFog(new THREE.MeshLambertMaterial({ color: 0xcccccc })));
      pole.position.set(-6.5, 4.3, -9);
      grp.add(pole);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.9, 6, 1), WS.patchFog(new THREE.MeshLambertMaterial({ color: 0xff5a1f, side: THREE.DoubleSide })));
      flag.position.set(-5.8, 5.3, -9);
      grp.add(flag);
      this.exitFlag = flag;
      grp.position.set(E.x, E.y, E.z);
      grp.rotation.y = Math.atan2(this.world.exitDir.x, this.world.exitDir.z);
      this.group.add(grp);
    }

    animate(time, wind) {
      if (this.sock && wind) {
        const sp = Math.hypot(wind.x, wind.z);
        this.sock.rotation.y = Math.atan2(-wind.z, wind.x) + Math.sin(time * 3) * 0.1;
        this.sock.rotation.z = -lerp(1.2, 0, clamp(sp / 8, 0, 1)) + Math.sin(time * 5) * 0.05;
      }
      if (this.exitFlag) {
        const p = this.exitFlag.geometry.attributes.position;
        for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, Math.sin(time * 7 + x * 4) * 0.12 * (x + 0.7)); }
        p.needsUpdate = true;
      }
      if (this.flags) this.flags.forEach((f, i) => { f.rotation.x = Math.sin(time * 6 + i) * 0.3; });
    }
  }

  WS.Props = Props;
})(window);
