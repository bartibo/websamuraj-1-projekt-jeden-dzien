/* Na Krawędzi – wspólne otoczenie: oświetlenie, mgła, wspólne kawałki GLSL i łatka mgły dla materiałów Three.js */
(function (root) {
  'use strict';
  const WS = root.WS = root.WS || {};

  // Wspólne uniformy (te same obiekty trafiają do wszystkich shaderów)
  const U = {
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uSunCol: { value: new THREE.Color(1, 1, 1) },
    uSunFog: { value: new THREE.Color(1, 1, 1) },
    uAmbSky: { value: new THREE.Color(0.5, 0.6, 0.7) },
    uAmbGround: { value: new THREE.Color(0.3, 0.3, 0.25) },
    uFogCol: { value: new THREE.Color(0.7, 0.8, 0.9) },
    uFogDens: { value: 0.0001 },
    uHF: { value: new THREE.Vector3(0, 200, 0) },
    uCam: { value: new THREE.Vector3() },
    uSnow: { value: 0 },
    uWet: { value: 0 },
    uFlash: { value: 0 },
    uTime: { value: 0 }
  };

  const GLSL = {};
  GLSL.noise = /* glsl */`
    float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    float vnoise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
    }
    float fbm3(vec2 p) { return vnoise(p) * 0.55 + vnoise(p * 2.07 + 13.1) * 0.3 + vnoise(p * 4.13 + 7.7) * 0.15; }
  `;
  GLSL.fogPars = /* glsl */`
    uniform vec3 uFogCol; uniform vec3 uSunFog; uniform vec3 uSunDir; uniform vec3 uCam;
    uniform float uFogDens; uniform vec3 uHF;
    vec3 applyFog(vec3 col, vec3 wp) {
      vec3 d = wp - uCam;
      float dist = length(d);
      float hf = 1.0 + uHF.z * exp(-max(wp.y - uHF.x, 0.0) / uHF.y);
      float fd = dist * uFogDens * hf;
      float f = 1.0 - exp(-fd * fd);
      float sd = pow(max(dot(d / max(dist, 0.001), uSunDir), 0.0), 8.0);
      return mix(col, mix(uFogCol, uSunFog, sd * 0.7), f);
    }
  `;

  // Podmienia mgłę Three.js w materiale na naszą (wysokościową, z poświatą słońca)
  function patchFog(mat) {
    mat.fog = false;
    mat.onBeforeCompile = (sh) => {
      for (const k of ['uFogCol', 'uSunFog', 'uSunDir', 'uCam', 'uFogDens', 'uHF', 'uFlash']) sh.uniforms[k] = U[k];
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vFogW;')
        .replace('#include <project_vertex>', `#include <project_vertex>
          vec4 fogWp = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            fogWp = instanceMatrix * fogWp;
          #endif
          vFogW = (modelMatrix * fogWp).xyz;`);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vFogW;\nuniform float uFlash;\n' + GLSL.fogPars)
        .replace('#include <opaque_fragment>', `#include <opaque_fragment>
          gl_FragColor.rgb += diffuseColor.rgb * uFlash * 0.6;
          gl_FragColor.rgb = applyFog(gl_FragColor.rgb, vFogW);`);
    };
    mat.customProgramCacheKey = () => 'wsfog';
    return mat;
  }

  // Ustawia światła i uniformy według pogody i pory dnia
  function applyWeather(wx, scene, lights) {
    const el = THREE.MathUtils.degToRad(wx.sunEl), az = THREE.MathUtils.degToRad(wx.sunAz);
    // az = 0 → słońce przed nami (+Z), 90 → po prawej (−X)
    U.uSunDir.value.set(-Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).normalize();
    const sc = new THREE.Color(wx.sunCol).multiplyScalar(wx.sunInt);
    U.uSunCol.value.copy(sc);
    U.uSunFog.value.set(wx.sunFog);
    U.uAmbSky.value.set(wx.ambSky);
    U.uAmbGround.value.set(wx.ambGround);
    U.uFogCol.value.set(wx.horizon);
    U.uFogDens.value = wx.fog;
    U.uSnow.value = wx.snow;
    U.uWet.value = wx.wet;
    if (lights) {
      lights.sun.color.copy(sc);
      lights.sun.intensity = Math.PI;
      lights.hemi.color.set(wx.ambSky);
      lights.hemi.groundColor.set(wx.ambGround);
      lights.hemi.intensity = Math.PI;
    }
    if (scene) scene.background = new THREE.Color(wx.horizon);
  }

  WS.U3 = U;
  WS.GLSL = GLSL;
  WS.patchFog = patchFog;
  WS.applyWeather = applyWeather;
})(window);
