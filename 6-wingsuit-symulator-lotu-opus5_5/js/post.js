/* Na Krawędzi – obróbka obrazu: rozmycie promieniste od prędkości, aberracja, winieta, czerwień zagrożenia, biel chmur */
(function (root) {
  'use strict';
  const WS = root.WS;

  class Post {
    constructor(renderer) {
      this.renderer = renderer;
      const isGL2 = renderer.capabilities.isWebGL2;
      this.rt = new THREE.WebGLRenderTarget(4, 4, { samples: isGL2 ? 4 : 0, type: isGL2 ? THREE.HalfFloatType : THREE.UnsignedByteType });
      this.scene = new THREE.Scene();
      this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      this.u = {
        tDiffuse: { value: this.rt.texture },
        uCenter: { value: new THREE.Vector2(0.5, 0.5) },
        uBlur: { value: 0 }, uAberr: { value: 0 }, uVig: { value: 0.35 }, uRed: { value: 0 }, uWhite: { value: 0 },
        uFlash: { value: 0 }, uTime: { value: 0 }, uDesat: { value: 0 }, uFade: { value: 0 }, uExposure: { value: 1 },
        uRes: { value: new THREE.Vector2(1, 1) }
      };
      const mat = new THREE.ShaderMaterial({
        uniforms: this.u, depthTest: false, depthWrite: false,
        vertexShader: `varying vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
        fragmentShader: `
          uniform sampler2D tDiffuse; uniform vec2 uCenter; uniform float uBlur, uAberr, uVig, uRed, uWhite, uFlash, uTime, uDesat, uFade, uExposure;
          uniform vec2 uRes;
          varying vec2 vUv;
          float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
          void main(){
            vec2 d = vUv - uCenter;
            float r = length(d * vec2(uRes.x / uRes.y, 1.0));
            vec3 col = vec3(0.0);
            float str = uBlur * smoothstep(0.08, 0.75, r);
            float jit = h(vUv * uRes + uTime) ;
            const int N = 10;
            for (int i = 0; i < N; i++) {
              float t = (float(i) + jit) / float(N);
              vec2 uv = vUv - d * str * t * 0.16;
              vec2 ca = d * uAberr * 0.012 * r;
              col.r += texture2D(tDiffuse, uv + ca).r;
              col.g += texture2D(tDiffuse, uv).g;
              col.b += texture2D(tDiffuse, uv - ca).b;
            }
            col /= float(N);
            col *= uExposure;
            // delikatna krzywa tonalna i nasycenie
            col = col / (1.0 + col * 0.12) * 1.1;
            float l = dot(col, vec3(0.299, 0.587, 0.114));
            col = mix(vec3(l), col, 1.08 - uDesat);
            col = mix(col, col * col * (3.0 - 2.0 * col), 0.18);
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
          }`
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
      const q = new THREE.Mesh(g, mat);
      q.frustumCulled = false;
      this.scene.add(q);
    }

    setSize(w, h) { this.rt.setSize(w, h); this.u.uRes.value.set(w, h); }

    render(scene, camera) {
      const r = this.renderer;
      r.setRenderTarget(this.rt);
      r.render(scene, camera);
      r.setRenderTarget(null);
      r.render(this.scene, this.cam);
    }
  }

  WS.Post = Post;
})(window);
