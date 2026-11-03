// Obróbka obrazu: scena renderowana do bufora, potem poświata (bloom), załamanie światła na czole
// fali uderzeniowej, drgające gorące powietrze nad kulą ognia, promienie światła i winieta.
// Wszystko w kilku małych przebiegach na pełnoekranowym trójkącie. Bez tego (stary sprzęt)
// scena rysuje się wprost na ekran, jak wcześniej.
(function () {
  const T = THREE;
  const Ut = EP.util;
  const P = EP.post = { enabled: false, quality: 'high', bloom: 0.9, nRings: 0, nHaze: 0 };
  const MAXR = 4, MAXH = 3;

  let renderer, rtScene, rtBright, mips = [], ups = [], quad, qScene, qCam;
  let mBright, mDown, mUp, mFinal;
  let W = 1, H = 1;

  const VERT = `varying vec2 vUv; void main(){ vUv = position.xy*0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

  P.init = function (r) {
    renderer = r;
    const gl = r.getContext();
    const isGL2 = r.capabilities.isWebGL2;
    if (!isGL2) return false;
    const half = r.extensions.has('EXT_color_buffer_float') || r.extensions.has('EXT_color_buffer_half_float');
    P.type = half ? T.HalfFloatType : T.UnsignedByteType;
    const opt = (s) => ({ type: P.type, depthBuffer: false, stencilBuffer: false, magFilter: T.LinearFilter, minFilter: T.LinearFilter, samples: s || 0 });
    rtScene = new T.WebGLRenderTarget(4, 4, Object.assign(opt(4), { depthBuffer: true }));
    // sztuczka: tak oznaczony bufor dostaje tę samą korekcję tonów i kolorów co ekran,
    // więc obraz w buforze jest dokładnie taki, jaki byłby na ekranie
    rtScene.isXRRenderTarget = true;
    rtScene.texture.colorSpace = T.SRGBColorSpace;
    rtBright = new T.WebGLRenderTarget(4, 4, opt());
    for (let i = 0; i < 5; i++) { mips.push(new T.WebGLRenderTarget(4, 4, opt())); ups.push(new T.WebGLRenderTarget(4, 4, opt())); }

    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    quad = new T.Mesh(g, null); quad.frustumCulled = false;
    qScene = new T.Scene(); qScene.add(quad);
    qCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const sm = (frag, u) => new T.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms: u, depthTest: false, depthWrite: false });
    mBright = sm(`uniform sampler2D tSrc; uniform vec2 uTx; uniform float uThr; varying vec2 vUv;
      // piksele z nieskończonością albo NaN (np. nakładające się cząstki) nie mogą rozlać się w rozmyciu
      vec3 tap(vec2 o){ vec3 c = texture2D(tSrc, vUv + o*uTx).rgb; return (c.r < 64.0 && c.g < 64.0 && c.b < 64.0) ? max(c, 0.0) : vec3(4.0); }
      void main(){
        vec3 c = (tap(vec2(-1.0,-1.0)) + tap(vec2(1.0,-1.0)) + tap(vec2(-1.0,1.0)) + tap(vec2(1.0,1.0)))*0.25;
        float l = max(c.r, max(c.g, c.b));
        float k = clamp((l - uThr)/(1.0 - uThr + 0.25), 0.0, 1.0);
        gl_FragColor = vec4(c*k*k + max(c - 1.0, 0.0)*0.6, 1.0);
      }`, { tSrc: { value: null }, uTx: { value: new T.Vector2() }, uThr: { value: 0.8 } });
    mDown = sm(`uniform sampler2D tSrc; uniform vec2 uTx; varying vec2 vUv;
      void main(){
        vec3 c = texture2D(tSrc, vUv).rgb*0.5;
        c += texture2D(tSrc, vUv + vec2(-1.0,-1.0)*uTx).rgb*0.125;
        c += texture2D(tSrc, vUv + vec2(1.0,-1.0)*uTx).rgb*0.125;
        c += texture2D(tSrc, vUv + vec2(-1.0,1.0)*uTx).rgb*0.125;
        c += texture2D(tSrc, vUv + vec2(1.0,1.0)*uTx).rgb*0.125;
        gl_FragColor = vec4(c, 1.0);
      }`, { tSrc: { value: null }, uTx: { value: new T.Vector2() } });
    mUp = sm(`uniform sampler2D tSrc; uniform sampler2D tAdd; uniform vec2 uTx; uniform float uW; varying vec2 vUv;
      void main(){
        vec3 c = vec3(0.0);
        c += texture2D(tSrc, vUv + vec2(-1.0,-1.0)*uTx).rgb;
        c += texture2D(tSrc, vUv + vec2(0.0,-1.0)*uTx).rgb*2.0;
        c += texture2D(tSrc, vUv + vec2(1.0,-1.0)*uTx).rgb;
        c += texture2D(tSrc, vUv + vec2(-1.0,0.0)*uTx).rgb*2.0;
        c += texture2D(tSrc, vUv).rgb*4.0;
        c += texture2D(tSrc, vUv + vec2(1.0,0.0)*uTx).rgb*2.0;
        c += texture2D(tSrc, vUv + vec2(-1.0,1.0)*uTx).rgb;
        c += texture2D(tSrc, vUv + vec2(0.0,1.0)*uTx).rgb*2.0;
        c += texture2D(tSrc, vUv + vec2(1.0,1.0)*uTx).rgb;
        gl_FragColor = vec4(c/16.0*uW + texture2D(tAdd, vUv).rgb, 1.0);
      }`, { tSrc: { value: null }, tAdd: { value: null }, uTx: { value: new T.Vector2() }, uW: { value: 1 } });

    const rings = [], hz = [];
    for (let i = 0; i < MAXR; i++) rings.push(new T.Vector4());
    for (let i = 0; i < MAXH; i++) hz.push(new T.Vector4());
    mFinal = sm(`uniform sampler2D tScene; uniform sampler2D tBloom; uniform vec2 uRes; uniform float uBloom, uTime, uVig, uAberr, uRays, uGrain;
      uniform vec2 uRayC; uniform vec4 uRing[${MAXR}]; uniform float uRingA[${MAXR}]; uniform int uNR;
      uniform vec4 uHaze[${MAXH}]; uniform int uNH;
      varying vec2 vUv;
      float hh(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y)*p3.z); }
      float nn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f);
        return mix(mix(hh(i), hh(i + vec2(1.0,0.0)), f.x), mix(hh(i + vec2(0.0,1.0)), hh(i + vec2(1.0,1.0)), f.x), f.y); }
      void main(){
        vec2 px = vUv*uRes;
        vec2 off = vec2(0.0);
        float edge = 0.0;
        // czoło fali: cienka soczewka, która załamuje to, co za nią
        for (int i = 0; i < ${MAXR}; i++){
          if (i >= uNR) break;
          vec4 r = uRing[i];
          vec2 d = px - r.xy;
          float L = length(d);
          float x = (L - r.z)/r.w;
          float prof = -x*exp(-x*x*1.6);
          vec2 dir = d/max(L, 1e-3);
          off += dir*prof*r.w*0.55*uRingA[i];
          edge += exp(-x*x*2.5)*uRingA[i];
        }
        // gorące powietrze: drganie nad kulą ognia i pożarami
        for (int i = 0; i < ${MAXH}; i++){
          if (i >= uNH) break;
          vec4 h = uHaze[i];
          vec2 d = (px - h.xy)/h.z;
          float m = exp(-dot(d*vec2(1.0, 0.7), d*vec2(1.0, 0.7))*1.4)*h.w;
          vec2 q = px/max(h.z*0.12, 4.0) + vec2(0.0, -uTime*2.2);
          off += (vec2(nn(q), nn(q + 17.3)) - 0.5)*m*h.z*0.06;
        }
        vec2 uv = vUv + off/uRes;
        vec3 c;
        if (uAberr > 0.001){
          vec2 ca = (vUv - 0.5)*uAberr*0.012;
          c = vec3(texture2D(tScene, uv + ca).r, texture2D(tScene, uv).g, texture2D(tScene, uv - ca).b);
        } else c = texture2D(tScene, uv).rgb;
        c = (c.r < 64.0 && c.g < 64.0 && c.b < 64.0) ? clamp(c, 0.0, 1.6) : vec3(1.6);
        c += vec3(0.9, 0.95, 1.0)*edge*0.035;
        vec3 bl = texture2D(tBloom, uv).rgb*0.4;
        c += bl*uBloom;
        // promienie światła rozchodzące się od błysku
        if (uRays > 0.001){
          vec2 dv = (uRayC - vUv)/24.0;
          vec2 s = vUv;
          vec3 acc = vec3(0.0);
          float w = 1.0, ws = 0.0;
          for (int k = 0; k < 24; k++){ s += dv; acc += texture2D(tBloom, s).rgb*w; ws += w; w *= 0.93; }
          float near = 1.0 - smoothstep(0.0, 0.85, length((uRayC - vUv)*vec2(uRes.x/uRes.y, 1.0)));
          c += acc/ws*0.2*uRays*near*near*0.45;
        }
        // tonowanie miękkie: jasne miejsca nie przepalają się na płasko
        c = (c.r < 1e4 && c.g < 1e4 && c.b < 1e4) ? max(c, 0.0) : vec3(1.0);
        c = c/(1.0 + max(c - 1.0, 0.0)*0.6);
        vec2 vq = vUv - 0.5;
        c *= 1.0 - uVig*dot(vq, vq)*1.1;
        c += (hh(px + fract(uTime*7.3)*311.0) - 0.5)*uGrain;
        gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
      }`, {
      tScene: { value: rtScene.texture }, tBloom: { value: null }, uRes: { value: new T.Vector2() }, uBloom: { value: 0.9 }, uTime: { value: 0 },
      uVig: { value: 0.35 }, uAberr: { value: 0 }, uRays: { value: 0 }, uGrain: { value: 0.012 }, uRayC: { value: new T.Vector2(0.5, 0.5) },
      uRing: { value: rings }, uRingA: { value: new Array(MAXR).fill(0) }, uNR: { value: 0 },
      uHaze: { value: hz }, uNH: { value: 0 }
    });
    P.u = mFinal.uniforms;
    P.enabled = true;
    return true;
  };

  P.setSize = function (w, h) {
    if (!P.enabled) return;
    W = Math.max(4, Math.round(w)); H = Math.max(4, Math.round(h));
    rtScene.setSize(W, H);
    rtScene.samples = P.quality === 'low' ? 0 : 4;
    let bw = Math.max(2, W >> 1), bh = Math.max(2, H >> 1);
    rtBright.setSize(bw, bh);
    for (let i = 0; i < mips.length; i++) {
      bw = Math.max(2, bw >> 1); bh = Math.max(2, bh >> 1);
      mips[i].setSize(bw, bh); ups[i].setSize(bw, bh);
    }
    mFinal.uniforms.uRes.value.set(W, H);
  };

  function pass(mat, target) { quad.material = mat; renderer.setRenderTarget(target); renderer.render(qScene, qCam); }

  // Pierścienie czoła fali i drgania powietrza ustawia app.js co klatkę (współrzędne w pikselach bufora)
  P.setRing = function (i, x, y, r, w, a) { mFinal.uniforms.uRing.value[i].set(x, y, r, w); mFinal.uniforms.uRingA.value[i] = a; };
  P.setHaze = function (i, x, y, r, a) { mFinal.uniforms.uHaze.value[i].set(x, y, r, a); };
  P.MAXR = MAXR; P.MAXH = MAXH;

  P.render = function (scene, camera, dt) {
    if (!P.enabled) { renderer.setRenderTarget(null); renderer.render(scene, camera); return; }
    renderer.setRenderTarget(rtScene);
    renderer.render(scene, camera);
    // poświata: jasne fragmenty, pomniejszanie i składanie z powrotem
    mBright.uniforms.tSrc.value = rtScene.texture;
    mBright.uniforms.uTx.value.set(0.5 / W, 0.5 / H);
    pass(mBright, rtBright);
    let src = rtBright;
    for (let i = 0; i < mips.length; i++) {
      mDown.uniforms.tSrc.value = src.texture;
      mDown.uniforms.uTx.value.set(1 / src.width, 1 / src.height);
      pass(mDown, mips[i]);
      src = mips[i];
    }
    let acc = mips[mips.length - 1];
    for (let i = mips.length - 2; i >= 0; i--) {
      mUp.uniforms.tSrc.value = acc.texture;
      mUp.uniforms.tAdd.value = mips[i].texture;
      mUp.uniforms.uTx.value.set(1 / acc.width, 1 / acc.height);
      mUp.uniforms.uW.value = 0.62;
      pass(mUp, ups[i]);
      acc = ups[i];
    }
    const u = mFinal.uniforms;
    u.tBloom.value = acc.texture;
    u.uTime.value += dt;
    u.uNR.value = P.nRings; u.uNH.value = P.nHaze;
    u.uBloom.value = P.bloom;
    pass(mFinal, null);
  };
})();
