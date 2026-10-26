/* Na Krawędzi – pogoda: wiatr z porywami i turbulencją, opady (smugi pędu), pioruny */
(function (root) {
  'use strict';
  const WS = root.WS;
  const U = WS.U3;
  const { clamp, lerp } = WS.U;

  const PRESETS = {
    deszcz: { n: 8000, box: 90, streak: 0.045, color: '#b9c6d6', alpha: 0.3, fall: -11, wobble: 0, points: false },
    snieg: { n: 6500, box: 80, streak: 0.028, color: '#ffffff', alpha: 0.5, fall: -2.2, wobble: 1, points: true },
    pylek: { n: 900, box: 150, streak: 0.06, color: '#fff4dc', alpha: 0.13, fall: -0.2, wobble: 0.5, points: false },
    mzawka: { n: 3200, box: 100, streak: 0.04, color: '#d8dee6', alpha: 0.22, fall: -4, wobble: 0.2, points: false }
  };

  const PVERT = /* glsl */`
    attribute vec3 aBase; attribute float aEnd; attribute float aRnd;
    uniform vec3 uCam; uniform float uBox; uniform float uTime; uniform vec3 uFall; uniform vec3 uRel; uniform float uStreak; uniform float uWobble;
    uniform float uSize; uniform float uPts;
    varying float vA;
    void main(){
      vec3 p = aBase * uBox + uFall * uTime * (0.8 + 0.4 * aRnd);
      p.x += sin(uTime * 1.3 + aRnd * 40.0) * uWobble;
      p.z += cos(uTime * 1.1 + aRnd * 30.0) * uWobble;
      vec3 o = uCam - vec3(uBox * 0.5);
      p = mod(p - o, vec3(uBox)) + o;
      if (aEnd > 0.5) p -= uRel * uStreak;
      float d = length(p - uCam);
      vA = smoothstep(uBox * 0.5, uBox * 0.3, d) * smoothstep(0.6, 2.5, d);
      gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      gl_PointSize = (uPts > 0.5 && aEnd > 0.5) ? 0.0 : clamp(uSize / d, 1.0, 9.0);
      if (uPts > 0.5 && aEnd > 0.5) vA = 0.0;
    }`;
  const PFRAG = /* glsl */`
    uniform vec3 uColor; uniform float uAlpha; uniform float uFlash; uniform float uPts;
    varying float vA;
    void main(){
      float a = vA * uAlpha;
      if (uPts > 0.5) { vec2 c = gl_PointCoord - 0.5; a *= smoothstep(0.5, 0.15, length(c)); }
      gl_FragColor = vec4(uColor * (1.0 + uFlash), a);
    }`;

  class Weather {
    constructor(scene) {
      this.scene = scene;
      this.objs = [];
      this.wind = new THREE.Vector3();
      this.turbAcc = new THREE.Vector3();
      this.n = new WS.U.Simplex(4242);
      this.bolts = [];
      this.flash = 0;
      this.nextBolt = 6;
      this.events = [];
    }

    set(wx, opts, world) {
      this.wx = wx;
      this.world = world;
      this.windSpeed = opts.wind;
      const a = THREE.MathUtils.degToRad(opts.windAngle);
      this.windDir = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a));
      this.turb = opts.turb;
      this.gust = wx.gust;
      for (const o of this.objs) { this.scene.remove(o); o.geometry.dispose(); o.material.dispose(); }
      this.objs = [];
      this.uniforms = [];
      for (const b of this.bolts) { this.scene.remove(b.mesh); b.mesh.geometry.dispose(); }
      this.bolts = [];
      this.flash = 0; U.uFlash.value = 0;
      this.nextBolt = 4 + Math.random() * 4;
      const P = PRESETS[wx.particles];
      if (P) this._particles(P);
      if (wx.particles === 'snieg') this._particles(Object.assign({}, P, { n: 2500, box: 45, streak: 0.015, alpha: 0.5 }));
    }

    _particles(P) {
      const n = P.n;
      const base = new Float32Array(n * 2 * 3), end = new Float32Array(n * 2), rnd = new Float32Array(n * 2);
      for (let i = 0; i < n; i++) {
        const x = Math.random(), y = Math.random(), z = Math.random(), r = Math.random();
        for (let k = 0; k < 2; k++) {
          const j = i * 2 + k;
          base[j * 3] = x; base[j * 3 + 1] = y; base[j * 3 + 2] = z; end[j] = k; rnd[j] = r;
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('aBase', new THREE.BufferAttribute(base, 3));
      g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
      g.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 1));
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 2 * 3), 3));
      const mk = (pts) => {
        const u = {
          uCam: U.uCam, uTime: U.uTime, uFlash: U.uFlash,
          uBox: { value: P.box }, uFall: { value: new THREE.Vector3(0, P.fall, 0) }, uRel: { value: new THREE.Vector3() },
          uStreak: { value: P.streak }, uWobble: { value: P.wobble }, uColor: { value: new THREE.Color(P.color) },
          uAlpha: { value: P.alpha }, uSize: { value: 90 }, uPts: { value: pts ? 1 : 0 }
        };
        const m = new THREE.ShaderMaterial({ uniforms: u, vertexShader: PVERT, fragmentShader: PFRAG, transparent: true, depthWrite: false });
        const o = pts ? new THREE.Points(g, m) : new THREE.LineSegments(g, m);
        o.frustumCulled = false;
        o.renderOrder = 8;
        this.scene.add(o);
        this.objs.push(o);
        this.uniforms.push({ u, P });
      };
      mk(false);
      if (P.points) mk(true);
    }

    // Wiatr w danym miejscu i chwili (porywy + turbulencja)
    sample(t, pos, prox, out) {
      const n = this.n;
      const gust = 1 + this.gust * (n.noise(t * 0.13, 1.7) * 0.7 + n.noise(t * 0.41, 5.2) * 0.3);
      const wob = n.noise(t * 0.07, 9.1) * 0.35;
      const c = Math.cos(wob), s = Math.sin(wob);
      const sp = this.windSpeed * gust;
      out.wind.set((this.windDir.x * c - this.windDir.z * s) * sp, n.noise(t * 0.2, 3.3) * this.windSpeed * 0.08, (this.windDir.x * s + this.windDir.z * c) * sp);
      // turbulencja – mocniejsza przy skałach
      const k = this.turb * (1 + 0.8 * (prox || 0));
      const f = 1.6;
      out.turbAcc.set(
        n.noise(t * f, pos.x * 0.004) * 3.2 * k,
        n.noise(t * f + 40, pos.z * 0.004) * 4.0 * k,
        n.noise(t * f + 80, pos.y * 0.004) * 2.0 * k
      );
      out.turbA = n.noise(t * 2.1, 11.1) * 0.035 * k;
      out.turbB = n.noise(t * 1.7, 21.3) * 0.14 * k;
      return out;
    }

    update(dt, t, cam, playerVel, wind) {
      for (const { u, P } of this.uniforms) {
        u.uFall.value.set(wind.x * 0.9, P.fall, wind.z * 0.9);
        u.uRel.value.copy(u.uFall.value).sub(playerVel);
        // smuga nie dłuższa niż ~6 m
        const L = u.uRel.value.length() * P.streak;
        u.uStreak.value = L > 6 ? P.streak * 6 / L : P.streak;
      }
      // pioruny
      if (this.wx && this.wx.lightning) {
        this.nextBolt -= dt;
        if (this.nextBolt <= 0) {
          this.nextBolt = 5 + Math.random() * 9;
          this._bolt(cam);
        }
      }
      for (let i = this.bolts.length - 1; i >= 0; i--) {
        const b = this.bolts[i];
        b.t += dt;
        const k = b.t < 0.08 ? 1 : b.t < 0.16 ? 0.25 : b.t < 0.24 ? 0.9 : Math.max(0, 1 - (b.t - 0.24) * 4);
        b.mesh.material.opacity = k;
        if (b.t > 0.6) { this.scene.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.material.dispose(); this.bolts.splice(i, 1); }
      }
      this.flash = Math.max(0, this.flash - dt * 2.8);
      let fl = this.flash;
      for (const b of this.bolts) if (b.t < 0.3) fl = Math.max(fl, (b.t < 0.08 || (b.t > 0.16 && b.t < 0.24) ? 1 : 0.3) * b.power);
      U.uFlash.value = fl * 0.9;
    }

    _bolt(cam) {
      const w = this.world;
      const ang = Math.random() * Math.PI * 2;
      const dist = 900 + Math.random() * 3500;
      const x = cam.position.x + Math.sin(ang) * dist, z = cam.position.z + Math.cos(ang) * dist;
      const gy = w ? w.height(x, z, 1) : 0;
      const top = cam.position.y + 900;
      const pts = [];
      let px = x, pz = z;
      const steps = 18;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        pts.push(new THREE.Vector3(px, lerp(top, gy, t), pz));
        px += (Math.random() - 0.5) * 90; pz += (Math.random() - 0.5) * 90;
      }
      // odgałęzienie
      const br = [];
      const st = pts[6].clone();
      for (let i = 0; i < 6; i++) { br.push(st.clone()); st.x += (Math.random() - 0.3) * 80; st.y -= 60 + Math.random() * 60; st.z += (Math.random() - 0.5) * 80; }
      const seg = [];
      for (let i = 0; i < pts.length - 1; i++) seg.push(pts[i], pts[i + 1]);
      for (let i = 0; i < br.length - 1; i++) seg.push(br[i], br[i + 1]);
      const g = new THREE.BufferGeometry().setFromPoints(seg);
      const m = new THREE.LineBasicMaterial({ color: 0xe8eeff, transparent: true, opacity: 1, fog: false, blending: THREE.AdditiveBlending, depthWrite: false });
      const mesh = new THREE.LineSegments(g, m);
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      const power = clamp(1.6 - dist / 3500, 0.35, 1);
      this.bolts.push({ mesh, t: 0, power });
      this.events.push({ type: 'thunder', delay: dist / 340, power });
    }
  }

  WS.Weather = Weather;
})(window);
