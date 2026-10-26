/* Na Krawędzi – niebo: kopuła z gradientem, słońce/księżyc, chmury, gwiazdy, zorza i chmury do przelotu */
(function (root) {
  'use strict';
  const WS = root.WS;
  const U = WS.U3;

  class Sky {
    constructor(scene) {
      this.scene = scene;
      this.uniforms = {
        uSunDir: U.uSunDir, uSunCol: U.uSunCol, uFogCol: U.uFogCol, uSunFog: U.uSunFog, uCam: U.uCam, uTime: U.uTime, uFlash: U.uFlash,
        uTop: { value: new THREE.Color() }, uCover: { value: 0.3 }, uCloudCol: { value: new THREE.Color() }, uCloudDark: { value: new THREE.Color() },
        uCloudH: { value: 2000 }, uStars: { value: 0 }, uAurora: { value: 0 }, uDisk: { value: 1 }, uWind: { value: new THREE.Vector2(3, 0) }
      };
      const geo = new THREE.SphereGeometry(1, 48, 24);
      const mat = new THREE.ShaderMaterial({
        uniforms: this.uniforms, side: THREE.BackSide, depthWrite: false, depthTest: false,
        vertexShader: `varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position * 20000.0, 1.0); gl_Position = vec4(p.xy, p.w * 0.9999, p.w); }`,
        fragmentShader: `
          uniform vec3 uSunDir, uSunCol, uFogCol, uSunFog, uCam, uTop, uCloudCol, uCloudDark;
          uniform float uTime, uCover, uCloudH, uStars, uAurora, uDisk, uFlash; uniform vec2 uWind;
          varying vec3 vD;
          ${WS.GLSL.noise}
          void main(){
            vec3 d = normalize(vD);
            float h = d.y;
            float sd = max(dot(d, uSunDir), 0.0);
            vec3 col = mix(uFogCol, uTop, pow(clamp(h, 0.0, 1.0), 0.45));
            col = mix(col, uSunFog, pow(sd, 6.0) * 0.55 * (1.0 - clamp(h * 2.0, 0.0, 1.0) * 0.5));
            // gwiazdy
            if (uStars > 0.0 && h > 0.0) {
              vec3 q = d * 380.0;
              vec3 c = floor(q);
              float r = hash12(c.xy + c.z * 17.17);
              float tw = 0.6 + 0.4 * sin(uTime * 3.0 + r * 60.0);
              float st = step(0.9965, r) * smoothstep(0.5, 0.0, length(fract(q) - 0.5)) * tw;
              col += vec3(0.85, 0.9, 1.0) * st * uStars * smoothstep(0.0, 0.25, h) * 1.4;
              // Droga Mleczna
              float mw = exp(-pow(dot(d, normalize(vec3(0.3, 0.6, -0.74))) * 4.0, 2.0)) * fbm3(d.xz * 6.0 + d.y * 3.0);
              col += vec3(0.13, 0.14, 0.2) * mw * uStars;
            }
            // zorza
            if (uAurora > 0.0 && h > 0.02) {
              float az = atan(d.x, d.z);
              float band = vnoise(vec2(az * 3.0 + uTime * 0.05, 1.3)) * 0.6 + vnoise(vec2(az * 9.0 - uTime * 0.12, 4.1)) * 0.4;
              float y0 = 0.18 + band * 0.25;
              float curtain = smoothstep(y0 - 0.02, y0 + 0.02, h) * exp(-(h - y0) * 5.0);
              float rays = 0.6 + 0.4 * vnoise(vec2(az * 60.0, uTime * 0.6));
              float mask = smoothstep(-0.3, 0.6, d.z * 0.7 - d.x * 0.3);
              vec3 ac = mix(vec3(0.1, 1.0, 0.45), vec3(0.6, 0.2, 0.9), clamp((h - y0) * 3.0, 0.0, 1.0));
              col += ac * curtain * rays * mask * uAurora * 0.55;
            }
            // tarcza słońca / księżyca
            if (uDisk > 0.5) {
              float disk = smoothstep(0.99955, 0.99975, sd);
              if (uDisk > 1.5) col += vec3(0.85, 0.9, 1.0) * disk * 1.2 + vec3(0.2, 0.25, 0.4) * pow(sd, 400.0);
              else col += uSunCol * (disk * 6.0 + pow(sd, 300.0) * 1.2 + pow(sd, 24.0) * 0.18);
            }
            // chmury na wysokości uCloudH
            if (h > 0.0 && uCover > 0.01) {
              float t = (uCloudH - uCam.y) / max(h, 0.015);
              if (t > 0.0) {
                vec2 p = (uCam.xz + d.xz * t) * 0.00035 + uWind * uTime * 0.0004;
                float n = fbm3(p) * 0.65 + fbm3(p * 3.1 + 5.0) * 0.35;
                float c = smoothstep(1.0 - uCover - 0.05, 1.0 - uCover + 0.35, n);
                float lit = clamp(0.55 + (n - 0.5) * 1.2 + sd * 0.4, 0.0, 1.0);
                vec3 cc = mix(uCloudDark, uCloudCol, lit) + uSunCol * pow(sd, 10.0) * 0.25 * (1.0 - c);
                float fade = exp(-t * 0.000045);
                col = mix(col, cc, c * fade * smoothstep(0.0, 0.06, h));
              }
            }
            col += vec3(0.55, 0.6, 0.8) * uFlash * 0.5 * (0.5 + h);
            gl_FragColor = vec4(col, 1.0);
          }`
      });
      this.mesh = new THREE.Mesh(geo, mat);
      this.mesh.frustumCulled = false;
      this.mesh.renderOrder = -10;
      scene.add(this.mesh);
      this.puffs = null;
    }

    setWeather(wx, loc, world) {
      const u = this.uniforms;
      u.uTop.value.set(wx.skyTop);
      u.uCover.value = wx.cloudCover;
      u.uCloudCol.value.set(wx.cloudCol);
      u.uCloudDark.value.set(wx.cloudDark);
      u.uCloudH.value = Math.max(loc.exitH + 500, wx.cloudH + (loc.exitH - 1500) * 0.6);
      u.uStars.value = wx.stars; u.uAurora.value = wx.aurora; u.uDisk.value = wx.disk;
      this._buildPuffs(wx, loc, world);
    }

    // Chmury, przez które się przelatuje (kłęby rozstawione wzdłuż trasy)
    _buildPuffs(wx, loc, world) {
      if (this.puffs) { this.scene.remove(this.puffs); this.puffs.geometry.dispose(); this.puffs.material.dispose(); this.puffs = null; }
      this.puffList = [];
      if (!wx.puffs) return;
      const rnd = WS.U.rng(loc.seed + 99);
      const n = wx.puffs === 2 ? 200 : 240;
      const len = loc.sLand + 800;
      const list = [];
      for (let i = 0; i < n; i++) {
        const s = -300 + rnd() * len;
        const side = (rnd() * 2 - 1) * (world.width(Math.max(0, s)) + 350);
        const x = world.px(s) + side;
        const nom = world.nominal(Math.max(0, s));
        const base = Math.max(world.floor(s), world.water);
        let y;
        if (rnd() < 0.55) y = WS.U.lerp(base, nom, 0.35 + rnd() * 0.9);  // na wysokości lotu
        else y = nom + 80 + rnd() * 500;                                       // wyżej
        const gh = world.height(x, s, 1);
        if (y < gh + 5) y = gh + 15 + rnd() * 30;
        const r = 45 + rnd() * 110;
        list.push({ x, y, z: s, r });
      }
      this.puffList = list;
      const geo = new THREE.InstancedBufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
      geo.setIndex([0, 1, 2, 0, 2, 3]);
      const off = new Float32Array(n * 4), rr = new Float32Array(n);
      list.forEach((p, i) => { off[i * 4] = p.x; off[i * 4 + 1] = p.y; off[i * 4 + 2] = p.z; off[i * 4 + 3] = p.r; rr[i] = rnd(); });
      this.puffOff = new THREE.InstancedBufferAttribute(off, 4);
      geo.setAttribute('aOff', this.puffOff);
      geo.setAttribute('aRnd', new THREE.InstancedBufferAttribute(rr, 1));
      geo.instanceCount = n;
      const dark = new THREE.Color(wx.cloudDark), lit = new THREE.Color(wx.cloudCol);
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uSunDir: U.uSunDir, uSunCol: U.uSunCol, uCam: U.uCam, uFogCol: U.uFogCol, uSunFog: U.uSunFog, uFogDens: U.uFogDens, uHF: U.uHF, uTime: U.uTime, uFlash: U.uFlash,
          uLit: { value: lit }, uDark: { value: dark }
        },
        transparent: true, depthWrite: false,
        vertexShader: `
          attribute vec4 aOff; attribute float aRnd;
          uniform vec3 uCam;
          varying vec2 vUv; varying vec3 vW; varying float vR; varying float vA;
          void main(){
            vec3 c = aOff.xyz;
            vec3 toCam = normalize(uCam - c);
            vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCam));
            vec3 up = cross(toCam, right);
            float ang = aRnd * 6.283;
            vec2 q = vec2(position.x * cos(ang) - position.y * sin(ang), position.x * sin(ang) + position.y * cos(ang));
            vec3 w = c + (right * q.x + up * q.y) * aOff.w;
            float dc = length(uCam - c);
            vA = smoothstep(aOff.w * 0.15, aOff.w * 0.9, dc);
            vUv = position.xy; vW = w; vR = aRnd;
            gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
          }`,
        fragmentShader: `
          uniform vec3 uLit, uDark, uSunCol; uniform float uTime, uFlash;
          varying vec2 vUv; varying vec3 vW; varying float vR; varying float vA;
          ${WS.GLSL.noise}
          ${WS.GLSL.fogPars}
          void main(){
            float r = length(vUv);
            float n = fbm3(vUv * 2.2 + vR * 30.0 + uTime * 0.02);
            float a = smoothstep(1.0, 0.25, r + (n - 0.5) * 0.7);
            if (a < 0.01) discard;
            float lit = clamp(0.5 + vUv.y * 0.35 + (n - 0.5) * 0.6, 0.0, 1.0);
            vec3 col = mix(uDark, uLit, lit) + uFlash * 0.4;
            col = applyFog(col, vW);
            gl_FragColor = vec4(col, a * 0.78 * vA);
          }`
      });
      this.puffs = new THREE.Mesh(geo, mat);
      this.puffs.frustumCulled = false;
      this.puffs.renderOrder = 5;
      this.scene.add(this.puffs);
      this._sortT = 0;
    }

    // Jak bardzo kamera „siedzi” w chmurze (0..1) – do białej mgły na ekranie
    density(p) {
      if (!this.puffList || !this.puffList.length) return 0;
      let d = 0;
      for (const c of this.puffList) {
        const dx = p.x - c.x, dy = p.y - c.y, dz = p.z - c.z;
        if (Math.abs(dz) > c.r || Math.abs(dx) > c.r || Math.abs(dy) > c.r) continue;
        const r = Math.sqrt(dx * dx + dy * dy + dz * dz) / c.r;
        if (r < 1) d = Math.max(d, 1 - r);
      }
      return Math.min(1, d * 1.15);
    }

    update(cam, dt) {
      this.mesh.position.copy(cam.position);
      // sortowanie kłębów od najdalszego (co kilka klatek)
      if (this.puffs && (this._sortT -= dt) <= 0) {
        this._sortT = 0.25;
        const L = this.puffList, cp = cam.position;
        L.sort((a, b) => ((b.x - cp.x) ** 2 + (b.y - cp.y) ** 2 + (b.z - cp.z) ** 2) - ((a.x - cp.x) ** 2 + (a.y - cp.y) ** 2 + (a.z - cp.z) ** 2));
        const o = this.puffOff.array;
        L.forEach((p, i) => { o[i * 4] = p.x; o[i * 4 + 1] = p.y; o[i * 4 + 2] = p.z; o[i * 4 + 3] = p.r; });
        this.puffOff.needsUpdate = true;
      }
    }
  }

  WS.Sky = Sky;
})(window);
