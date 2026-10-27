/* Na Krawędzi – obróbka obrazu: rozmycie promieniste od prędkości, aberracja, winieta, czerwień zagrożenia, biel chmur,
   a od średniej jakości wzwyż poświata jasnych miejsc (bloom), promienie słońca i odblaski obiektywu */
(function (root) {
  'use strict';
  const WS = root.WS;

  const VERT = `varying vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

  // Pierwsze zmniejszenie do poświaty: próg z miękkim kolanem i średnia Karisa (słońce na wodzie nie miga)
  const PREFILTER = `
    uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uThr, uKnee;
    varying vec2 vUv;
    vec3 tap(vec2 uv, out float w){
      vec3 c = min(texture2D(tSrc, uv).rgb, vec3(5.0));
      float br = max(c.r, max(c.g, c.b));
      float rq = clamp(br - uThr + uKnee, 0.0, 2.0 * uKnee);
      rq = rq * rq / (4.0 * uKnee + 1e-4);
      c *= max(rq, br - uThr) / max(br, 1e-4);
      w = 1.0 / (1.0 + max(c.r, max(c.g, c.b)));
      return c;
    }
    void main(){
      float w0, w1, w2, w3;
      vec3 a = tap(vUv + uTexel * vec2(-1.0, -1.0), w0), b = tap(vUv + uTexel * vec2(1.0, -1.0), w1);
      vec3 c = tap(vUv + uTexel * vec2(-1.0, 1.0), w2), d = tap(vUv + uTexel * vec2(1.0, 1.0), w3);
      gl_FragColor = vec4((a * w0 + b * w1 + c * w2 + d * w3) / (w0 + w1 + w2 + w3), 1.0);
    }`;
  const DOWN = `
    uniform sampler2D tSrc; uniform vec2 uTexel;
    varying vec2 vUv;
    void main(){
      vec3 c = texture2D(tSrc, vUv).rgb * 4.0;
      c += texture2D(tSrc, vUv + uTexel * vec2(-1.0, -1.0)).rgb + texture2D(tSrc, vUv + uTexel * vec2(1.0, -1.0)).rgb;
      c += texture2D(tSrc, vUv + uTexel * vec2(-1.0, 1.0)).rgb + texture2D(tSrc, vUv + uTexel * vec2(1.0, 1.0)).rgb;
      gl_FragColor = vec4(c / 8.0, 1.0);
    }`;
  const UP = `
    uniform sampler2D tSrc; uniform sampler2D tBase; uniform vec2 uTexel;
    varying vec2 vUv;
    void main(){
      vec2 o = uTexel;
      vec3 c = texture2D(tSrc, vUv + vec2(-o.x, 0.0)).rgb + texture2D(tSrc, vUv + vec2(o.x, 0.0)).rgb
             + texture2D(tSrc, vUv + vec2(0.0, -o.y)).rgb + texture2D(tSrc, vUv + vec2(0.0, o.y)).rgb;
      c = c * 2.0 + texture2D(tSrc, vUv + vec2(-o.x, -o.y)).rgb + texture2D(tSrc, vUv + vec2(o.x, -o.y)).rgb
             + texture2D(tSrc, vUv + vec2(-o.x, o.y)).rgb + texture2D(tSrc, vUv + vec2(o.x, o.y)).rgb
             + texture2D(tSrc, vUv).rgb * 4.0;
      gl_FragColor = vec4(c / 16.0 + texture2D(tBase, vUv).rgb, 1.0);
    }`;
  // Promienie słońca: rozmycie w stronę słońca maski nieba (alfa sceny = 0 tam, gdzie widać niebo, chmury ją częściowo zasłaniają)
  const RAYS = `
    uniform sampler2D tSrc; uniform vec2 uSunUV; uniform float uAspect, uLen, uTime;
    varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec2 delta = (uSunUV - vUv) * uLen / 40.0;
      vec2 uv = vUv + delta * h(vUv * 911.0 + uTime);
      float acc = 0.0, w = 1.0;
      for (int i = 0; i < 40; i++) {
        vec2 sd = (uv - uSunUV) * vec2(uAspect, 1.0);
        float src = (1.0 - texture2D(tSrc, uv).a) * exp(-dot(sd, sd) * 9.0);
        acc += src * w;
        w *= 0.965;
        uv += delta;
      }
      gl_FragColor = vec4(vec3(acc / 40.0 * 1.2), 1.0);
    }`;

  const COMPOSITE = `
    uniform sampler2D tDiffuse; uniform vec2 uCenter; uniform float uBlur, uAberr, uVig, uRed, uWhite, uFlash, uTime, uDesat, uFade, uExposure, uSat;
    uniform vec2 uRes; uniform float uTaps;
    uniform sampler2D tBloom; uniform float uBloom;
    uniform sampler2D tRays; uniform float uRays; uniform vec3 uRayCol;
    uniform vec2 uSunUV; uniform float uFlare; uniform float uGrade;
    varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    vec3 shoulder(vec3 x){ return mix(x, 0.9 + 0.1 * (1.0 - exp(-(x - 0.9) * 10.0)), step(0.9, x)); }
    float disc(vec2 p, vec2 c, float r, float soft){ return smoothstep(r, r * (1.0 - soft), length((p - c) * vec2(uRes.x / uRes.y, 1.0))); }
    void main(){
      vec2 d = vUv - uCenter;
      float asp = uRes.x / uRes.y;
      float r = length(d * vec2(asp, 1.0));
      vec3 col = vec3(0.0);
      float str = uBlur * smoothstep(0.08, 0.75, r);
      float jit = h(vUv * uRes + uTime);
      // tyle próbek, ile trzeba przy obecnym rozmyciu (uTaps z JS); rozbicie kolorów tylko przy widocznej aberracji
      vec2 ca = d * uAberr * 0.012 * r;
      for (int i = 0; i < 10; i++) {
        if (float(i) >= uTaps) break;
        float t = (float(i) + jit) / uTaps;
        vec2 uv = vUv - d * str * t * 0.16;
        if (uAberr > 0.05) {
          col.r += texture2D(tDiffuse, uv + ca).r;
          col.g += texture2D(tDiffuse, uv).g;
          col.b += texture2D(tDiffuse, uv - ca).b;
        } else col += texture2D(tDiffuse, uv).rgb;
      }
      col /= uTaps;
      #ifdef BLOOM
        col += texture2D(tBloom, vUv).rgb * uBloom;
      #endif
      #ifdef RAYS
        // smugi głównie nad górami i chmurami (na czystym niebie blask już jest, nie przepalamy go)
        col += uRayCol * texture2D(tRays, vUv).r * uRays * mix(0.25, 1.0, texture2D(tDiffuse, vUv).a);
      #endif
      #ifdef FLARE
        if (uFlare > 0.001) {
          // widoczność słońca: ile nieba (alfa 0) widać wokół jego tarczy
          vec2 px = 3.0 / uRes;
          float vis = 0.0;
          vis += 1.0 - texture2D(tDiffuse, uSunUV).a;
          vis += 1.0 - texture2D(tDiffuse, uSunUV + vec2(px.x * 4.0, 0.0)).a;
          vis += 1.0 - texture2D(tDiffuse, uSunUV - vec2(px.x * 4.0, 0.0)).a;
          vis += 1.0 - texture2D(tDiffuse, uSunUV + vec2(0.0, px.y * 4.0)).a;
          vis += 1.0 - texture2D(tDiffuse, uSunUV - vec2(0.0, px.y * 4.0)).a;
          vis *= 0.2 * uFlare;
          if (vis > 0.001) {
            vec2 axis = vec2(0.5) - uSunUV;
            vec3 f = vec3(0.0);
            f += vec3(1.0, 0.75, 0.45) * disc(vUv, uSunUV + axis * 0.55, 0.035, 0.6) * 0.10;
            f += vec3(0.45, 1.0, 0.7) * disc(vUv, uSunUV + axis * 1.25, 0.06, 0.25) * 0.05;
            f += vec3(0.5, 0.65, 1.0) * disc(vUv, uSunUV + axis * 1.55, 0.11, 0.15) * 0.04;
            f += vec3(1.0, 0.55, 0.35) * disc(vUv, uSunUV + axis * 1.9, 0.025, 0.7) * 0.12;
            f += vec3(0.75, 0.6, 1.0) * disc(vUv, uSunUV + axis * 2.2, 0.16, 0.08) * 0.03;
            // pierścień wokół środka i pozioma smuga (anamorfotyk)
            float ring = length((vUv - 0.5 + axis * 0.15) * vec2(asp, 1.0));
            f += vec3(0.6, 0.8, 1.0) * smoothstep(0.03, 0.0, abs(ring - 0.42)) * 0.025;
            vec2 sd = (vUv - uSunUV) * vec2(asp, 1.0);
            f += uRayCol * exp(-abs(sd.y) * 260.0) * exp(-abs(sd.x) * 2.6) * 0.35;
            float ang = atan(sd.y, sd.x);
            f += uRayCol * pow(abs(cos(ang * 3.0 + 0.4)), 80.0) * exp(-length(sd) * 10.0) * 0.26;
            col += f * vis * uRayCol;
          }
        }
      #endif
      col *= uExposure;
      // delikatna krzywa tonalna, miękkie światła zamiast obcinania i nasycenie
      col = col / (1.0 + col * 0.12) * 1.1;
      col = shoulder(col);
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(l), col, uSat - uDesat);
      col = mix(col, col * col * (3.0 - 2.0 * col), 0.18);
      // gradacja kolorów: chłodne cienie, ciepłe światła
      col += vec3(-0.012, 0.0, 0.02) * (1.0 - smoothstep(0.0, 0.45, l)) * uGrade + vec3(0.018, 0.008, -0.012) * smoothstep(0.5, 1.0, l) * uGrade;
      // chmura / mgła na obiektywie
      col = mix(col, vec3(0.86, 0.88, 0.9), uWhite * 0.7);
      // błysk
      col += vec3(0.8, 0.85, 1.0) * uFlash;
      // winieta + czerwień zagrożenia
      float v = smoothstep(0.35, 1.05, r);
      col *= 1.0 - v * uVig;
      col = mix(col, vec3(0.6, 0.02, 0.02), v * uRed * 0.75);
      col += (h(vUv * uRes * 0.5 + uTime * 7.0) - 0.5) * 0.025;
      col = mix(col, vec3(0.0), uFade);
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }`;

  class Post {
    constructor(renderer, tier) {
      this.renderer = renderer;
      const isGL2 = this.isGL2 = renderer.capabilities.isWebGL2;
      this.maxSamples = isGL2 ? renderer.capabilities.maxSamples || 4 : 0;
      this.type = isGL2 ? THREE.HalfFloatType : THREE.UnsignedByteType;
      this.rt = new THREE.WebGLRenderTarget(4, 4, { samples: 0, type: this.type });
      this.scene = new THREE.Scene();
      this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      this.u = {
        tDiffuse: { value: this.rt.texture },
        uCenter: { value: new THREE.Vector2(0.5, 0.5) },
        uBlur: { value: 0 }, uAberr: { value: 0 }, uVig: { value: 0.35 }, uRed: { value: 0 }, uWhite: { value: 0 },
        uFlash: { value: 0 }, uTime: { value: 0 }, uDesat: { value: 0 }, uSat: { value: 1 }, uFade: { value: 0 }, uExposure: { value: 1 },
        uRes: { value: new THREE.Vector2(1, 1) }, uTaps: { value: 10 },
        tBloom: { value: null }, uBloom: { value: 0.2 },
        tRays: { value: null }, uRays: { value: 0 }, uRayCol: { value: new THREE.Color(1, 0.9, 0.75) },
        uSunUV: { value: new THREE.Vector2(0.5, 2) }, uFlare: { value: 0 }, uGrade: { value: 0 }
      };
      this.bloomCfg = { thr: 1.0, knee: 0.5 };
      this.composite = new THREE.ShaderMaterial({ uniforms: this.u, vertexShader: VERT, fragmentShader: COMPOSITE, depthTest: false, depthWrite: false });
      const mk = (frag, extra) => new THREE.ShaderMaterial({
        uniforms: Object.assign({ tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } }, extra || {}),
        vertexShader: VERT, fragmentShader: frag, depthTest: false, depthWrite: false
      });
      this.mPre = mk(PREFILTER, { uThr: { value: 1 }, uKnee: { value: 0.5 } });
      this.mDown = mk(DOWN);
      this.mUp = mk(UP, { tBase: { value: null } });
      this.mRays = mk(RAYS, { uSunUV: this.u.uSunUV, uAspect: { value: 1 }, uLen: { value: 0.75 }, uTime: this.u.uTime });
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
      this.quad = new THREE.Mesh(g, this.composite);
      this.quad.frustumCulled = false;
      this.scene.add(this.quad);
      this.down = []; this.up = [];
      this.rays = null;
      this.w = 4; this.h = 4;
      this.msaaOn = true;
      this.setQuality(tier);
    }

    _rt(w, h) { return new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), { type: this.type, depthBuffer: false, magFilter: THREE.LinearFilter, minFilter: THREE.LinearFilter }); }

    _freeChain() {
      for (const t of this.down.concat(this.up)) t.dispose();
      this.down = []; this.up = [];
      if (this.rays) { this.rays.dispose(); this.rays = null; }
    }

    _buildChain() {
      this._freeChain();
      const q = this.q;
      if (q.bloom) {
        const levels = q.hq >= 2 ? 6 : 5;
        let w = this.w >> 1, h = this.h >> 1;
        for (let i = 0; i < levels; i++) {
          this.down.push(this._rt(w, h));
          if (i < levels - 1) this.up.push(this._rt(w, h));
          w = Math.max(1, w >> 1); h = Math.max(1, h >> 1);
        }
        this.u.tBloom.value = this.up[0].texture;
      }
      if (q.rays) {
        this.rays = this._rt(this.w >> 2, this.h >> 2);
        this.u.tRays.value = this.rays.texture;
      }
    }

    setQuality(q) {
      this.q = q;
      const defs = {};
      if (q.bloom) defs.BLOOM = 1;
      if (q.rays) defs.RAYS = 1;
      if (q.flare) defs.FLARE = 1;
      this.composite.defines = defs;
      this.composite.needsUpdate = true;
      this.u.uGrade.value = q.hq ? 1 : 0;
      this.msaa = q.msaa && this.isGL2 ? Math.min(q.msaa, this.maxSamples) : 0;
      this._applyMSAA();
      this._buildChain();
    }

    setSize(w, h) {
      this.w = w; this.h = h;
      this.rt.setSize(w, h);
      this.u.uRes.value.set(w, h);
      this.mRays.uniforms.uAspect.value = w / Math.max(1, h);
      this._buildChain();
    }

    // przy obniżonej rozdzielczości bez wygładzania krawędzi (MSAA to duża część kosztu obróbki)
    setMSAA(on) { this.msaaOn = on; this._applyMSAA(); }
    _applyMSAA() {
      const n = this.msaaOn ? this.msaa : 0;
      if (this.rt.samples === n) return;
      this.rt.samples = n;
      this.rt.dispose();
    }

    _pass(mat, target) {
      this.quad.material = mat;
      this.renderer.setRenderTarget(target);
      this.renderer.render(this.scene, this.cam);
    }

    render(scene, camera) {
      const r = this.renderer;
      const b = this.u.uBlur.value;
      this.u.uTaps.value = b < 0.02 ? 1 : Math.min(10, Math.ceil(2 + b * 9));
      r.setRenderTarget(this.rt);
      r.render(scene, camera);
      const src = this.rt.texture;
      if (this.down.length && this.u.uBloom.value > 0.001) {
        const D = this.down, Up = this.up;
        let m = this.mPre;
        m.uniforms.tSrc.value = src; m.uniforms.uTexel.value.set(1 / this.w, 1 / this.h);
        m.uniforms.uThr.value = this.bloomCfg.thr; m.uniforms.uKnee.value = this.bloomCfg.knee;
        this._pass(m, D[0]);
        m = this.mDown;
        for (let i = 1; i < D.length; i++) {
          m.uniforms.tSrc.value = D[i - 1].texture; m.uniforms.uTexel.value.set(1 / D[i - 1].width, 1 / D[i - 1].height);
          this._pass(m, D[i]);
        }
        m = this.mUp;
        for (let i = Up.length - 1; i >= 0; i--) {
          const lower = i === Up.length - 1 ? D[i + 1] : Up[i + 1];
          m.uniforms.tSrc.value = lower.texture; m.uniforms.tBase.value = D[i].texture;
          m.uniforms.uTexel.value.set(1 / lower.width, 1 / lower.height);
          this._pass(m, Up[i]);
        }
      }
      if (this.rays && this.u.uRays.value > 0.001) {
        this.mRays.uniforms.tSrc.value = src;
        this._pass(this.mRays, this.rays);
      }
      this.quad.material = this.composite;
      r.setRenderTarget(null);
      r.render(this.scene, this.cam);
    }
  }

  WS.Post = Post;
})(window);
