// Shadery: wspólne „sloty wybuchów” na GPU i łatki materiałów (ziemia, budynki, drzewa).
// Każdy fragment fasady i ziemi sam liczy nadciśnienie i strumień ciepła z aktywnych wybuchów,
// więc szyby pękają okno po oknie dokładnie tam, dokąd doszła fala.
(function () {
  const T = THREE;
  const MAXE = 32;
  const S = EP.shaders = {};
  S.MAXE = MAXE;

  const vec4s = () => { const a = []; for (let i = 0; i < MAXE; i++) a.push(new T.Vector4(0, 0, 0, 0)); return a; };
  // Wspólne uniformy (te same obiekty są podpinane do wszystkich materiałów)
  const U = S.uniforms = {
    uE0: { value: vec4s() },   // xyz środek wybuchu, w promień czoła fali (m)
    uE1: { value: vec4s() },   // x W^(1/3), y E_cieplna/4π, z czas od wybuchu (s, <0 brak), w promień kuli ognia
    uE2: { value: vec4s() },   // x rodzaj (0 konw., 1 jądr., 2 odłamki), y promień krateru, z promień osmalenia, w czas impulsu cieplnego
    uNE: { value: 0 },
    uTime: { value: 0 },
    uNight: { value: 0 },
    uBlackout: { value: 0 },
    uSkyRef: { value: new T.Color(0.55, 0.65, 0.78) },
    uHob: { value: vec4s() },  // x wysokość wybuchu nad ziemią, y promień zeszklenia ziemi
    uRingC: { value: new T.Vector3() },
    uRingR: { value: new Array(8).fill(0) },
    uRingCol: { value: Array.from({ length: 8 }, () => new T.Color()) },
    uRingN: { value: 0 },
    uRingA: { value: 0 },
    uRingDash: { value: 0 },
    uFall: { value: new T.Vector4(0, 0, 0, 0) },   // opad: x, z, długość, szerokość
    uFallDir: { value: new T.Vector2(1, 0) },
    uFallA: { value: 0 },
    uLand: { value: null },
    uCity: { value: null }
  };

  S.COMMON = /* glsl */`
#define MAXE ${MAXE}
uniform vec4 uE0[MAXE];
uniform vec4 uE1[MAXE];
uniform vec4 uE2[MAXE];
uniform vec4 uHob[MAXE];
uniform int uNE;
uniform float uTime;
uniform float uNight;
uniform float uBlackout;
float epKG(float Z){
  Z = max(Z, 0.06);
  float a = Z/4.5, b = Z/0.048, c = Z/0.32, d = Z/1.35;
  return 81870.6*(1.0+a*a)/sqrt((1.0+b*b)*(1.0+c*c)*(1.0+d*d));
}
float epH(vec2 p){
  p = mod(p, 4096.0);
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float epN(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(mix(epH(i), epH(i+vec2(1.0,0.0)), f.x), mix(epH(i+vec2(0.0,1.0)), epH(i+vec2(1.0,1.0)), f.x), f.y);
}
float epF(vec2 p){
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++){ s += a*epN(p); p = p*2.03 + vec2(17.1, 9.2); a *= 0.5; }
  return s/0.9375;
}
struct EPB { float p; float q; float heat; float scorch; float frag; float age; };
EPB epBlast(vec3 wp, vec3 n, float useN){
  EPB b = EPB(0.0, 0.0, 0.0, 0.0, 0.0, 1e9);
  for (int i = 0; i < MAXE; i++){
    if (i >= uNE) break;
    vec4 e0 = uE0[i]; vec4 e1 = uE1[i]; vec4 e2 = uE2[i];
    if (e1.z < 0.0) continue;
    vec3 dv = wp - e0.xyz;
    float d = max(length(dv), 0.05);
    if (d < e0.w) b.p = max(b.p, epKG(d/e1.x));
    if (e1.y > 0.0){
      float f = clamp(e1.z/e2.w, 0.0, 1.0);
      float face = mix(1.0, clamp(dot(n, -dv/d)*1.3 + 0.12, 0.0, 1.0), useN);
      float q = e1.y*exp(-d/80000.0)/(d*d)*f*face;
      if (q > b.q){ b.q = q; b.age = e1.z; }
    }
    if (e2.z > 0.0) b.scorch = max(b.scorch, 1.0 - smoothstep(e2.z*0.25, e2.z, d));
    b.heat = max(b.heat, exp(-e1.z/(e2.w*3.0 + 0.05)) * (1.0 - smoothstep(e1.w*0.8, e1.w*3.0, d)));
    if (e2.x > 1.5 && d < e0.w) b.frag = max(b.frag, 1.0 - smoothstep(4.0, 16.0, d));
  }
  return b;
}
`;

  function hookUniforms(shader) {
    for (const k in U) shader.uniforms[k] = U[k];
  }

  // ---------- ZIEMIA ----------
  S.GROUND_FRAG = /* glsl */`
uniform sampler2D uLand;
uniform sampler2D uCity;
uniform vec3 uRingC;
uniform float uRingR[8];
uniform vec3 uRingCol[8];
uniform int uRingN;
uniform float uRingA;
uniform float uRingDash;
uniform vec4 uFall;
uniform vec2 uFallDir;
uniform float uFallA;
varying vec3 vEpW;
float riverX(float z){ return 700.0 + 260.0*sin(z/900.0) + 120.0*sin(z/370.0 + 1.3); }
`;

  S.GROUND_BODY = /* glsl */`
vec3 epEm = vec3(0.0);
float epRough = 0.95;
vec3 epNW = vec3(0.0, 1.0, 0.0);
{
  vec2 p = vEpW.xz;
  float r = length(p);
  vec2 fw = fwidth(p);
  float px = max(fw.x, fw.y);           // metry na piksel
  vec4 land = texture2D(uLand, p/320000.0 + 0.5);
  // --- wieś: pola, łąki, lasy ---
  float n1 = epF(p*0.0021);
  float n2 = epN(p*0.03);
  vec3 grass = mix(vec3(0.30,0.40,0.18), vec3(0.40,0.46,0.22), n1);
  // pola: obrócone prostokąty
  float ang = 0.35 + land.g*1.2;
  mat2 rot = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
  vec2 q = rot*p;
  vec2 cellF = floor(q/vec2(300.0, 190.0));
  float ct = epH(cellF + 11.0);
  vec3 crop = ct < 0.3 ? vec3(0.62,0.54,0.30) : ct < 0.55 ? vec3(0.34,0.47,0.19) : ct < 0.75 ? vec3(0.37,0.29,0.21) : vec3(0.44,0.48,0.24);
  float stripe = 0.5 + 0.5*sin(q.x*0.9 + ct*30.0);
  crop *= mix(1.0, 0.86 + 0.14*stripe, clamp(1.0 - px*0.6, 0.0, 1.0));
  crop = mix(crop, vec3(0.45,0.46,0.25), smoothstep(15.0, 90.0, px)*0.55);
  float fieldMask = smoothstep(4200.0, 6000.0, r) * (1.0 - land.a);
  vec3 col = mix(grass, crop, fieldMask*0.85);
  // las
  float forest = smoothstep(0.35, 0.6, land.r);
  vec3 forC = vec3(0.14,0.25,0.11)*(0.7 + 0.6*epN(p*0.05)) * (0.85 + 0.3*n1);
  col = mix(col, forC, forest);
  // wsie
  float vil = smoothstep(0.3, 0.7, land.a);
  col = mix(col, vec3(0.47,0.44,0.39)*(0.8 + 0.4*epN(p*0.08)), vil*0.8);
  // jeziora
  float lake = smoothstep(0.45, 0.55, land.b);
  // --- miasto ---
  vec2 bi = floor(p/120.0);
  vec2 f = p - (bi + 0.5)*120.0;        // -60..60
  vec4 cb = texture2D(uCity, (bi + 32.5)/64.0);
  float kind = floor(cb.r*255.0 + 0.5);
  vec2 sgn = vec2(f.x > 0.0 ? 1.0 : -1.0, f.y > 0.0 ? 1.0 : -1.0);
  float kx = floor(texture2D(uCity, (bi + vec2(sgn.x, 0.0) + 32.5)/64.0).r*255.0 + 0.5);
  float kz = floor(texture2D(uCity, (bi + vec2(0.0, sgn.y) + 32.5)/64.0).r*255.0 + 0.5);
  float inCity = step(0.5, kind);
  if (kind > 0.5){
    vec3 lot = vec3(0.45);
    float tile = epN(p*0.6);
    if (kind < 1.5) lot = vec3(0.53,0.52,0.50)*(0.92 + 0.08*tile);
    else if (kind < 2.5) lot = mix(vec3(0.42,0.41,0.39), vec3(0.30,0.40,0.20), step(0.62, epN(p*0.05)))*(0.9 + 0.1*tile);
    else if (kind < 3.5) lot = mix(vec3(0.33,0.44,0.21), vec3(0.45,0.45,0.44), step(0.7, epN(p*0.04)));
    else if (kind < 4.5) lot = mix(vec3(0.34,0.47,0.22), vec3(0.38,0.5,0.24), epN(p*0.15));
    else if (kind < 5.5){
      lot = vec3(0.29,0.45,0.19)*(0.9 + 0.2*epN(p*0.1));
      float path = abs(sin(f.x*0.05 + sin(f.y*0.04)*1.5));
      lot = mix(lot, vec3(0.62,0.57,0.47), smoothstep(0.07, 0.03, path));
    }
    else lot = vec3(0.50,0.49,0.46)*(0.85 + 0.15*epN(p*0.2)) * (1.0 - 0.2*step(0.8, epN(p*0.03)));
    col = lot;
  }
  // chodniki i jezdnie
  vec2 af = abs(f);
  float roadX = step(52.0, af.x) * step(0.5, max(kind, kx));
  float roadZ = step(52.0, af.y) * step(0.5, max(kind, kz));
  float sideX = step(47.5, af.x) * step(0.5, kind);
  float sideZ = step(47.5, af.y) * step(0.5, kind);
  float side = max(sideX, sideZ);
  col = mix(col, vec3(0.58,0.57,0.55)*(0.95 + 0.05*epN(p*2.0)), side);
  float road = max(roadX, roadZ);
  if (road > 0.5){
    vec3 asph = vec3(0.17,0.17,0.18)*(0.9 + 0.2*epN(p*0.7));
    float alongX = roadX > 0.5 && roadZ < 0.5 ? p.y : p.x;
    float centerD = roadX > 0.5 && roadZ < 0.5 ? af.x : af.y;
    float dash = step(0.5, fract(alongX/9.0)) * (1.0 - smoothstep(0.12, 0.12 + px, abs(centerD - 60.0)));
    float crossing = roadX > 0.5 && roadZ > 0.5 ? 0.0 : 1.0;
    asph = mix(asph, vec3(0.85,0.85,0.8), dash*crossing*clamp(1.0 - px*2.0, 0.0, 1.0));
    col = asph;
    epRough = 0.8;
  }
  // autostrady poza miastem
  if (r > 2800.0){
    for (int k = 0; k < 4; k++){
      float a = k == 0 ? 0.35 : k == 1 ? 1.95 : k == 2 ? 3.55 : 5.0;
      vec2 dir = vec2(cos(a), sin(a));
      float along = dot(p, dir);
      float dperp = abs(p.x*dir.y - p.y*dir.x + 40.0*sin(along/2300.0));
      if (along > 0.0){
        float wpx = max(px, 0.5);
        float hw = 9.0 + px*0.6;
        float m = 1.0 - smoothstep(hw - wpx, hw, dperp);
        float dash = step(0.5, fract(along/12.0)) * (1.0 - smoothstep(0.15, 0.15 + px, dperp)) * clamp(1.0 - px, 0.0, 1.0);
        col = mix(col, mix(vec3(0.19,0.19,0.2), vec3(0.85,0.85,0.8), dash), m);
      }
    }
  }
  // rzeka
  float rdx = abs(p.x - riverX(p.y));
  float water = max(1.0 - smoothstep(54.0, 55.0 + px, rdx), lake * (1.0 - inCity));
  float bank = (1.0 - smoothstep(60.0, 61.0 + px, rdx)) * (1.0 - water);
  col = mix(col, vec3(0.52,0.5,0.46), bank);
  if (water > 0.01){
    float wv = epN(p*0.08 + uTime*0.05) * 0.5 + epN(p*0.3 - uTime*0.12) * 0.5;
    vec3 wc = mix(vec3(0.07,0.16,0.21), vec3(0.14,0.27,0.33), wv);
    col = mix(col, wc, water);
    epRough = mix(epRough, 0.32, water);
  }
  // nocne latarnie wzdłuż ulic
  if (uNight > 0.01 && side > 0.5 && road < 0.5){
    float along = sideX > 0.5 ? p.y : p.x;
    float perp = sideX > 0.5 ? af.x - 50.0 : af.y - 50.0;
    float lamp = 1.0 - smoothstep(0.0, 7.0, length(vec2(fract(along/30.0)*30.0 - 15.0, perp)));
    epEm += vec3(1.0,0.72,0.38)*lamp*0.35*uNight*(1.0 - uBlackout);
  }
  if (uNight > 0.01 && road > 0.5 && kind > 0.5){
    epEm += vec3(1.0,0.75,0.42)*0.05*uNight*(1.0 - uBlackout);
  }

  // --- skutki wybuchów ---
  EPB b = epBlast(vEpW, vec3(0.0,1.0,0.0), 0.0);
  float veg = (1.0 - road) * (1.0 - side) * (1.0 - water);
  // pył naniesiony przez falę
  col = mix(col, vec3(0.50,0.45,0.38), smoothstep(12.0, 80.0, b.p)*0.4*(1.0 - water));
  // powalony las: jaśniejsze, prążkowane pnie ułożone promieniście
  if (forest > 0.05 && b.p > 18.0){
    float fl = smoothstep(18.0, 40.0, b.p);
    col = mix(col, vec3(0.34,0.30,0.22)*(0.75 + 0.5*epN(p*0.09)), fl*forest);
  }
  // przypalenie roślinności i zwęglenie
  float brown = smoothstep(60e3, 200e3, b.q)*veg;
  col = mix(col, col*vec3(1.15,0.9,0.6), brown*0.6);
  float charr = smoothstep(300e3, 1.2e6, b.q);
  col = mix(col, vec3(0.055,0.05,0.045)*(0.8 + 0.4*epN(p*0.05)), charr*(0.55 + 0.45*veg));
  float hf = clamp(1.0 - px*0.06, 0.0, 1.0);
  float ember = charr * exp(-b.age/240.0) * smoothstep(0.55, 0.85, epN(p*0.02 + 3.0)*0.6 + mix(0.5, epN(p*0.11), hf)*0.4) * mix(0.35, 1.0, hf);
  epEm += vec3(1.0,0.32,0.06) * ember * (0.6 + 0.4*sin(uTime*3.0 + epH(floor(p*0.02))*20.0)) * 1.6;
  // osmalenie od wybuchów konwencjonalnych
  col *= 1.0 - 0.88*b.scorch*(0.55 + 0.45*epN(p*0.9));
  // kratery i zeszklona ziemia
  for (int i = 0; i < MAXE; i++){
    if (i >= uNE) break;
    if (uE1[i].z < 0.0) continue;
    vec2 d2 = p - uE0[i].xz;
    float rr = length(d2);
    float cr = uE2[i].y;
    if (cr > 0.0 && rr < cr*3.0){
      float t = rr/cr;
      float depth = cr*0.42;
      // pochodna profilu: lej (paraboloida) + wał
      float dh = t < 1.0 ? depth*2.0*t/cr : 0.0;
      float rim = exp(-pow((t - 1.08)/0.18, 2.0));
      dh += 0.12*(-2.0*(t - 1.08)/(0.18*0.18))*rim;
      vec2 dirc = d2/max(rr, 1e-3);
      epNW = normalize(epNW + vec3(-dirc.x*dh, 0.0, -dirc.y*dh));
      float inside = 1.0 - smoothstep(0.9, 1.05, t);
      vec3 soil = mix(vec3(0.22,0.18,0.14), vec3(0.12,0.10,0.08), 1.0 - t)*(0.8 + 0.4*epN(p*3.0/max(cr*0.1,0.05)));
      float ray = smoothstep(0.55, 0.9, epN(vec2(atan(d2.y, d2.x)*7.0, 0.0) + vec2(0.0, t*0.4)));
      float ejecta = (1.0 - smoothstep(1.0, 2.6 + ray*0.6, t)) * (1.0 - inside);
      col = mix(col, soil, inside);
      col = mix(col, vec3(0.40,0.35,0.28), ejecta*0.75);
      epRough = mix(epRough, 0.97, inside);
    }
    float vr = uHob[i].y;
    if (vr > 0.0 && rr < vr){
      float g = 1.0 - smoothstep(vr*0.6, vr, rr);
      col = mix(col, vec3(0.10,0.13,0.10), g);
      epRough = mix(epRough, 0.35, g);
      epEm += vec3(1.0,0.45,0.12)*g*exp(-uE1[i].z/(uE2[i].w*10.0))*3.0;
    }
  }
  // strefa opadu promieniotwórczego (podgląd)
  if (uFallA > 0.0){
    vec2 dp = p - uFall.xy;
    float al = dot(dp, uFallDir);
    float pe = dp.x*uFallDir.y - dp.y*uFallDir.x;
    float wfac = uFall.w*(0.25 + 0.75*clamp(al/(uFall.z*0.3), 0.0, 1.0));
    float e = (al > -uFall.w*0.5 && al < uFall.z) ? 1.0 - smoothstep(0.6, 1.0, abs(pe)/wfac + max(0.0, al - uFall.z*0.7)/(uFall.z*0.3)) : 0.0;
    col = mix(col, vec3(0.75,0.68,0.15), e*0.35*uFallA);
    epEm += vec3(0.6,0.55,0.1)*e*0.08*uFallA;
  }
  // pierścienie zasięgów
  if (uRingA > 0.0 && uRingN > 0){
    float dr = length(p - uRingC.xz);
    float pxr = max(px, 0.02);
    for (int k = 0; k < 8; k++){
      if (k >= uRingN) break;
      float R = uRingR[k];
      if (R <= 0.0) continue;
      float w = pxr*1.6 + R*0.0015;
      float line = 1.0 - smoothstep(w*0.5, w, abs(dr - R));
      if (uRingDash > 0.5){
        float a = atan(p.y - uRingC.z, p.x - uRingC.x);
        line *= step(0.45, fract(a*R/(pxr*40.0 + R*0.05)));
      }
      float fill = (1.0 - step(R, dr)) * 0.055;
      col = mix(col, uRingCol[k], (line*0.9 + fill)*uRingA);
      epEm += uRingCol[k]*line*0.45*uRingA;
    }
  }
  diffuseColor.rgb = pow(col, vec3(2.2));
}
`;

  S.patchGround = function (mat) {
    mat.onBeforeCompile = function (shader) {
      hookUniforms(shader);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vEpW;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvEpW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\n' + S.COMMON + S.GROUND_FRAG)
        .replace('#include <map_fragment>', S.GROUND_BODY)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = epRough;')
        .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = normalize((viewMatrix * vec4(epNW, 0.0)).xyz);')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += epEm;');
    };
    mat.customProgramCacheKey = () => 'epGround';
  };

  // ---------- BUDYNKI ----------
  const BLD_VERT_PARS = /* glsl */`
attribute vec4 aSize;
attribute vec4 aDmg;
varying vec3 vEpLoc; varying vec3 vEpNl; varying vec4 vEpSize; varying vec4 vEpDmg; varying vec3 vEpWP; varying vec3 vEpWN;
`;
  const BLD_VERT = /* glsl */`
vEpLoc = position; vEpNl = normal; vEpSize = aSize; vEpDmg = aDmg;
{
  vec4 epw = vec4(transformed, 1.0);
  mat3 nm = mat3(modelMatrix);
  #ifdef USE_INSTANCING
    epw = instanceMatrix * epw;
    nm = nm * mat3(instanceMatrix);
  #endif
  vEpWP = (modelMatrix * epw).xyz;
  vEpWN = normalize(nm * normal);
}
`;
  const BLD_FRAG_PARS = /* glsl */`
uniform vec3 uSkyRef;
varying vec3 vEpLoc; varying vec3 vEpNl; varying vec4 vEpSize; varying vec4 vEpDmg; varying vec3 vEpWP; varying vec3 vEpWN;
`;
  const BLD_FRAG = /* glsl */`
float epGlass = 0.0;
vec3 epEm = vec3(0.0);
{
  vec3 sz = vEpSize.xyz; float typ = vEpSize.w;
  float dmg = vEpDmg.x, burn = vEpDmg.y, gb = vEpDmg.z, seed = vEpDmg.w;
  vec3 lp = vEpLoc*sz;
  vec3 nl = normalize(vEpNl);
  vec3 wn = normalize(vEpWN);
  EPB b = epBlast(vEpWP, wn, 1.0);
  vec3 wall = pow(diffuseColor.rgb, vec3(0.4545));
  vec3 col = wall;
  bool isRoof = nl.y > 0.45;
  bool isCyl = typ > 4.5 && typ < 6.5;
  float u, faceW;
  if (isCyl){ u = (atan(nl.z, nl.x) + 3.14159)*sz.x*0.5; faceW = 6.2832*sz.x*0.5; }
  else if (abs(nl.x) > 0.5){ u = lp.z + sz.z*0.5; faceW = sz.z; }
  else { u = lp.x + sz.x*0.5; faceW = sz.x; }
  float v = lp.y;
  float fh = 3.4, cw = 3.2, wx = 0.26, wy0 = 0.28, wy1 = 0.8, wallTop = sz.y;
  if (typ < 0.5){ fh = 2.9; cw = 3.6; wx = 0.3; wy0 = 0.34; wy1 = 0.78; wallTop = sz.y*0.66; }
  else if (typ < 1.5){ fh = 3.6; cw = 3.3; wx = 0.27; wy0 = 0.24; wy1 = 0.8; }
  else if (typ < 2.5){ fh = 2.85; cw = 3.0; wx = 0.2; wy0 = 0.3; wy1 = 0.74; }
  else if (typ < 3.5){ fh = 3.9; cw = 2.4; wx = 0.06; wy0 = 0.1; wy1 = 0.94; }
  else if (typ < 4.5){ fh = 8.0; cw = 6.0; wx = 0.15; wy0 = 0.6; wy1 = 0.86; }
  else if (typ > 7.5){ fh = 5.0; cw = 4.5; wx = 0.36; wy0 = 0.3; wy1 = 0.85; }
  float hasWin = (isRoof || isCyl) ? 0.0 : 1.0;
  hasWin *= step(0.9, u)*step(u, faceW - 0.9)*step(0.7, v)*step(v, wallTop - 0.5);
  vec2 g = vec2(u/cw, v/fh);
  vec2 cell = floor(g);
  vec2 fr = fract(g);
  vec2 aa = fwidth(g)*1.1;
  float win = smoothstep(wx - aa.x, wx + aa.x, fr.x)*smoothstep(1.0 - wx + aa.x, 1.0 - wx - aa.x, fr.x)
            * smoothstep(wy0 - aa.y, wy0 + aa.y, fr.y)*smoothstep(wy1 + aa.y, wy1 - aa.y, fr.y);
  float lod = smoothstep(0.22, 0.6, max(aa.x, aa.y));
  win = mix(win, (1.0 - 2.0*wx)*(wy1 - wy0), lod)*hasWin;
  float ch = epH(cell*1.37 + seed*913.0);
  float thr = mix(2.8, 9.5, ch);
  float broken = max(step(thr, b.p), gb);
  broken = max(broken, step(0.5, ch)*step(0.01, b.frag)*step(ch, 0.5 + b.frag*0.5));
  vec3 V = normalize(cameraPosition - vEpWP);
  float fres = pow(1.0 - clamp(dot(V, wn), 0.0, 1.0), 3.0);
  vec3 glassC = mix(vec3(0.17,0.21,0.25), pow(uSkyRef, vec3(0.4545)), 0.32 + 0.55*fres)*(0.85 + 0.3*ch);
  vec3 winC = mix(glassC, vec3(0.018,0.016,0.014), broken);
  float lit = mix(step(ch, 0.32), 0.32, lod)*uNight*(1.0 - uBlackout)*(1.0 - broken)*(1.0 - step(1.5, dmg));
  // ściana: pasy stropów, cegła, panele
  float fl = smoothstep(0.0, 0.06, fract(v/fh))*0.06;
  if (typ > 1.5 && typ < 2.5) col *= 0.94 + 0.06*step(0.5, fract(u/(cw*2.0)));
  col *= 0.94 + fl;
  if (typ > 0.5 && typ < 1.5 && v < 4.0) col *= 0.75;
  col = mix(col, winC, win);
  epGlass = win*(1.0 - broken);
  epEm += win*lit*vec3(1.0, 0.76, 0.48)*mix(0.25 + 0.4*epH(cell + 3.1), 0.45, lod);
  if (isRoof){
    if (typ < 0.5 || typ > 7.5){
      float sh = fract(seed*7.0);
      vec3 rc = sh < 0.4 ? vec3(0.55,0.24,0.16) : sh < 0.65 ? vec3(0.36,0.24,0.18) : sh < 0.85 ? vec3(0.30,0.31,0.33) : vec3(0.42,0.15,0.12);
      col = rc*(0.85 + 0.15*step(0.5, fract(lp.y*3.0)));
      float holes = step(0.75, epN(lp.xz*1.5 + seed*50.0))*smoothstep(10.0, 22.0, b.p);
      col = mix(col, vec3(0.05,0.04,0.03), holes);
    } else {
      col = mix(vec3(0.5,0.5,0.5), vec3(0.42,0.4,0.37), fract(seed*13.0))*(0.82 + 0.3*epN(lp.xz*0.4 + seed*9.0));
    }
  }
  if (typ > 4.5 && typ < 5.5 && v > sz.y*0.82) col = mix(vec3(0.85), vec3(0.75,0.15,0.12), step(0.5, fract(v/4.0)));
  // pył, sadza, zwęglenie
  col = mix(col, vec3(0.52,0.48,0.42), smoothstep(10.0, 70.0, b.p)*0.35);
  if (burn > 0.0){
    // ogień obejmuje dolne piętra (w wysokich budynkach) z nieregularną granicą
    float fireTop = 10.0 + 18.0*burn + sz.y*0.15*burn + 8.0*epN(vec2(u*0.08, seed*30.0));
    float fz = 1.0 - smoothstep(fireTop - 4.0, fireTop, v);
    float lit2 = step(0.35, epH(cell*2.11 + seed*31.0));
    float flick = 0.55 + 0.45*sin(uTime*9.0 + ch*40.0)*sin(uTime*5.3 + ch*13.0);
    epEm += (win*1.3*lit2 + 0.05)*burn*fz*vec3(1.0,0.36,0.07)*flick*2.4;
    col *= 1.0 - 0.6*burn*smoothstep(fireTop - 12.0, fireTop + 6.0, v)*(1.0 - smoothstep(fireTop + 6.0, fireTop + 30.0, v));
    epGlass *= 1.0 - burn*fz;
  }
  // wyrwy w fasadzie tam, gdzie dotarło duże nadciśnienie
  float fd = smoothstep(28.0, 140.0, b.p);
  if (fd > 0.0 && !isRoof){
    float hole = smoothstep(0.62 - fd*0.4, 0.66 - fd*0.4, epN(vec2(u, v)*0.32 + seed*17.0)*0.7 + epN(vec2(u, v)*1.3)*0.3);
    col = mix(col, vec3(0.05,0.045,0.04)*(0.7 + 0.6*epN(vec2(u, v)*3.0)), hole);
    epGlass *= 1.0 - hole; epEm *= 1.0 - hole*0.8;
  }
  float charr = smoothstep(250e3, 1.5e6, b.q);
  col = mix(col, vec3(0.05,0.045,0.04), charr*0.85);
  col *= 1.0 - 0.85*b.scorch*(0.6 + 0.4*epN(lp.xy*2.0 + lp.zy));
  if (b.frag > 0.0) col *= 1.0 - 0.7*step(0.93 - b.frag*0.05, epH(floor(vEpWP.xz*6.0 + vEpWP.y*6.0)));
  // gruz po zawaleniu
  if (dmg > 1.5){
    float top = smoothstep(0.62, 0.92, vEpLoc.y);
    float rr = dmg > 2.5 ? 1.0 : top;
    vec3 rc = mix(vec3(0.40,0.38,0.35), vec3(0.20,0.18,0.16), epN(lp.xz*1.3 + lp.y*2.0))*(0.7 + 0.5*epN(lp.xz*5.0 + lp.y));
    col = mix(col, rc*mix(vec3(1.0), wall*1.5, 0.35), rr);
    epGlass *= 1.0 - rr; epEm *= 1.0 - rr*0.6;
    if (dmg > 2.5 && burn > 0.0) epEm += vec3(1.0,0.3,0.05)*burn*smoothstep(0.6, 0.9, epN(lp.xz*0.8 + uTime*0.3))*1.5;
  }
  if (dmg > 3.5) col = vec3(0.035);
  epEm += vec3(1.0,0.5,0.2)*b.heat*0.4;
  diffuseColor.rgb = pow(col, vec3(2.2));
}
`;

  S.patchBuilding = function (mat, key) {
    mat.onBeforeCompile = function (shader) {
      hookUniforms(shader);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\n' + BLD_VERT_PARS)
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + BLD_VERT);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\n' + S.COMMON + BLD_FRAG_PARS)
        .replace('#include <color_fragment>', '#include <color_fragment>\n' + BLD_FRAG)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.12, epGlass);')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += epEm;');
    };
    mat.customProgramCacheKey = () => 'epBld' + (key || '');
  };

  // ---------- DRZEWA (przewracane przez falę w shaderze wierzchołków) ----------
  const TREE_PARS = /* glsl */`
attribute vec4 aFall;   // x,z kierunek, z stopień przewrócenia (zapisany), w zwęglenie (zapisane)
attribute float aPart;  // 0 pień, 1 korona
attribute float aSeed;
varying float vEpChar; varying float vEpBurn; varying float vEpPart; varying float vEpStrip;
mat3 epR; float epStrip; float epCharV; float epBurnV;
void epTree(){
  vec3 tb = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vec3 probe = tb + vec3(0.0, 4.0, 0.0);
  float bestP = 0.0, since = 0.0, bq = 0.0, bage = 1e9;
  vec2 dir = vec2(1.0, 0.0);
  for (int i = 0; i < MAXE; i++){
    if (i >= uNE) break;
    vec4 e0 = uE0[i]; vec4 e1 = uE1[i]; vec4 e2 = uE2[i];
    if (e1.z < 0.0) continue;
    vec3 dv = probe - e0.xyz;
    float d = max(length(dv), 0.05);
    if (d < e0.w){
      float p = epKG(d/e1.x);
      if (p > bestP){ bestP = p; dir = normalize(dv.xz + vec2(1e-4, 0.0)); since = (e0.w - d); }
    }
    if (e1.y > 0.0){
      float q = e1.y*exp(-d/80000.0)/(d*d)*clamp(e1.z/e2.w, 0.0, 1.0);
      if (q > bq){ bq = q; bage = e1.z; }
    }
  }
  float thr = 22.0 + 20.0*aSeed;
  float fall = smoothstep(thr, thr*1.35, bestP)*clamp(since/250.0 + 0.15, 0.0, 1.0);
  fall = min(fall, 1.0);
  epStrip = smoothstep(9.0 + 6.0*aSeed, 30.0, bestP);
  if (aFall.z > fall){ fall = aFall.z; dir = aFall.xy; }
  epStrip = max(epStrip, aFall.z);
  float qthr = 350e3*(0.7 + 0.6*aSeed);
  epCharV = max(smoothstep(qthr*0.5, qthr, bq), aFall.w);
  epBurnV = smoothstep(qthr*0.5, qthr, bq)*exp(-bage/200.0);
  // obrót wokół podstawy w kierunku od wybuchu
  vec3 ld = normalize(transpose(mat3(instanceMatrix))*vec3(dir.x, 0.0, dir.y));
  ld.y = 0.0; ld = normalize(ld + vec3(1e-4, 0.0, 0.0));
  float ang = fall*1.48;
  vec3 ax = normalize(vec3(ld.z, 0.0, -ld.x));
  float c = cos(ang), s = sin(ang);
  epR = mat3(c + ax.x*ax.x*(1.0-c), ax.y*ax.x*(1.0-c) + ax.z*s, ax.z*ax.x*(1.0-c) - ax.y*s,
             ax.x*ax.y*(1.0-c) - ax.z*s, c + ax.y*ax.y*(1.0-c), ax.z*ax.y*(1.0-c) + ax.x*s,
             ax.x*ax.z*(1.0-c) + ax.y*s, ax.y*ax.z*(1.0-c) - ax.x*s, c + ax.z*ax.z*(1.0-c));
}
vec3 epTreePos(vec3 pos){
  if (aPart > 0.5){
    float k = mix(1.0, 0.28, epStrip);
    pos.xz *= k;
    pos.y = mix(pos.y, pos.y*0.9, epStrip);
  }
  return epR * pos;
}
`;

  S.patchTree = function (mat) {
    mat.onBeforeCompile = function (shader) {
      hookUniforms(shader);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\n' + S.COMMON + TREE_PARS)
        .replace('#include <beginnormal_vertex>', 'epTree();\nvec3 objectNormal = epR * vec3(normal);\n#ifdef USE_TANGENT\nvec3 objectTangent = vec3(tangent.xyz);\n#endif')
        .replace('#include <begin_vertex>', 'vec3 transformed = epTreePos(vec3(position));\nvEpChar = epCharV; vEpBurn = epBurnV; vEpPart = aPart; vEpStrip = epStrip;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying float vEpChar; varying float vEpBurn; varying float vEpPart; varying float vEpStrip;')
        .replace('#include <color_fragment>', `#include <color_fragment>
diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb*vec3(1.3,0.95,0.55), vEpStrip*vEpPart*0.8);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.04,0.035,0.03), vEpChar*0.92);`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
totalEmissiveRadiance += vec3(1.0,0.35,0.06)*vEpBurn*(0.6 + 0.4*sin(uTime*11.0 + gl_FragCoord.x*0.3))*2.0;`);
    };
    mat.customProgramCacheKey = () => 'epTree';
  };
  S.patchTreeDepth = function (mat) {
    mat.onBeforeCompile = function (shader) {
      hookUniforms(shader);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\n' + S.COMMON + TREE_PARS)
        .replace('#include <begin_vertex>', 'epTree();\nvec3 transformed = epTreePos(vec3(position));');
    };
    mat.customProgramCacheKey = () => 'epTreeDepth';
  };
})();
