/* renderer.js – potok WebGL2 symulujący drogę światła przez oko:
   1. OPTYKA   – rozmycie z niedoostrzenia liczone fizycznie z odległości każdego piksela (dioptrie),
                 średnicy źrenicy i pola widzenia; astygmatyzm (elipsa), stożek rogówki (koma, duchy).
                 Liczone w przestrzeni liniowej HDR, więc światła dają prawdziwe „krążki” i smugi.
   2. ROZPROSZENIE – rozmyta kopia obrazu (1/4 rozdzielczości) do poświat, zaćmy, światłowstrętu
                 i do „wypełniania” ubytków pola widzenia.
   3. SIATKÓWKA I MÓZG – podwójne widzenie, barwy, ubytki pola (względem punktu patrzenia),
                 męty, aura migrenowa, śnieg optyczny, powieki, mapowanie tonów. */
(function () {
  'use strict';

  const VS = `#version 300 es
in vec2 aPos; out vec2 vUv;
void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

  const COMMON = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
vec3 s2l(vec3 c){ return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
vec3 l2s(vec3 c){ c = max(c, 0.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
vec3 enc(vec3 c){ c = max(c, 0.0); return sqrt(c / (1.0 + c)); }
vec3 dec(vec3 e){ e = min(e * e, vec3(0.9985)); return e / (1.0 - e); }
float lum(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
`;

  /* ---------- 1. OPTYKA ---------- */
  const FS_OPTICS = COMMON + `
uniform sampler2D uScene, uData;
uniform vec2 uRes;
uniform float uAspect, uFocus, uCyl, uK, uBase, uUniformD, uEm, uNearR;
uniform vec2 uAx, uComa;
uniform vec3 uGhost;
uniform int uMaxN;

float depthAt(vec2 uv){ if (uUniformD >= 0.0) return uUniformD; float r = texture(uData, uv).r; return r * r * 4.0; }
vec3 colAt(vec2 uv){ vec3 c = s2l(texture(uScene, uv).rgb); return c * (1.0 + texture(uData, uv).g * uEm); }
vec2 radii(float D){
  float d = D - uFocus;
  vec2 a = uK * abs(vec2(d + 0.5 * uCyl, d - 0.5 * uCyl));
  return sqrt(a * a + uBase * uBase);
}
vec2 toUv(vec2 off){ return vec2(off.x, off.y * uAspect); }

void main(){
  vec2 uv = vUv;
  float Dc = depthAt(uv);
  vec2 rc2 = radii(Dc);
  float rc = max(rc2.x, rc2.y);
  float px = 1.0 / uRes.x;

  // Czy rozmyty bliższy obiekt (np. telefon) „rozlewa się” na ten piksel?
  float rF = 0.0;
  if (uNearR > rc + px) {
    for (int k = 0; k < 20; k++) {
      float a = float(k) * 2.39996;
      float rr = uNearR * (0.12 + 0.88 * fract(float(k) * 0.618034 + 0.31));
      vec2 off = vec2(cos(a), sin(a)) * rr;
      float Ds = depthAt(uv + toUv(off));
      if (Ds > Dc + 0.08) {
        vec2 r2 = radii(Ds); float rs = max(r2.x, r2.y);
        if (rs >= rr) rF = max(rF, rs);
      }
    }
  }
  float glen = length(uGhost.xy) * 2.0 + length(uComa);
  float R = max(rc, rF);
  float Rpx = (R + glen) * uRes.x;
  vec3 cC = colAt(uv);
  if (Rpx < 0.6) { o = vec4(enc(cC), 0.0); return; }

  bool circle = rF > rc;
  float inner = circle ? rc / R : 1.0;
  int n = int(clamp(Rpx * Rpx * 0.35 + 12.0, 12.0, float(uMaxN)));
  float jit = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) * 6.2831853;
  vec2 perp = vec2(-uAx.y, uAx.x);
  vec3 sumB = cC; float nB = 1.0;
  vec3 sumF = vec3(0.0); float nF = 0.0; float nAll = 1.0;
  for (int i = 0; i < 256; i++) {
    if (i >= n) break;
    float t = (float(i) + 0.5) / float(n);
    float r = sqrt(t);
    float a = float(i) * 2.39996323 + jit;
    vec2 s = r * vec2(cos(a), sin(a));
    vec2 off = circle ? s * R : uAx * (s.x * rc2.x) + perp * (s.y * rc2.y);
    off += uComa * (r * r);
    float gw = 1.0;
    if (uGhost.z > 0.0) {
      int gi = i - (i / 3) * 3;
      off += uGhost.xy * float(gi);
      gw = gi == 0 ? 1.0 : uGhost.z;
    }
    vec2 suv = uv + toUv(off);
    float Ds = depthAt(suv);
    vec3 cs = colAt(suv);
    nAll += gw;
    if (rF > 0.0 && Ds > Dc + 0.08) {
      vec2 r2 = radii(Ds); float rs = max(r2.x, r2.y);
      float cov = clamp((rs - length(off)) / (2.0 * px) + 0.5, 0.0, 1.0);
      sumF += cs * cov * gw; nF += cov * gw;
      if (cov < 0.5 && r <= inner) { sumB += cs * gw; nB += gw; }
    } else if (r <= inner) {
      sumB += cs * gw; nB += gw;
    }
  }
  vec3 cB = sumB / nB;
  vec3 res = cB;
  if (nF > 0.0) res = mix(cB, sumF / nF, clamp(nF / nAll, 0.0, 1.0));
  o = vec4(enc(res), clamp(Rpx / 64.0, 0.0, 1.0));
}`;

  /* ---------- 2. ROZPROSZENIE ---------- */
  const FS_DOWN = COMMON + `
uniform sampler2D uSrc; uniform vec2 uTexel;
void main(){
  vec3 c = dec(texture(uSrc, vUv + uTexel * vec2(-1.0, -1.0)).rgb) + dec(texture(uSrc, vUv + uTexel * vec2(1.0, -1.0)).rgb)
         + dec(texture(uSrc, vUv + uTexel * vec2(-1.0, 1.0)).rgb) + dec(texture(uSrc, vUv + uTexel * vec2(1.0, 1.0)).rgb);
  o = vec4(enc(c * 0.25), 1.0);
}`;

  const FS_BLUR = COMMON + `
uniform sampler2D uSrc; uniform vec2 uDir;
void main(){
  const float w0 = 0.1964825501511404, w1 = 0.2969069646728344, w2 = 0.09447039785044732, w3 = 0.010381362401148057;
  vec3 c = dec(texture(uSrc, vUv).rgb) * w0;
  c += (dec(texture(uSrc, vUv + uDir * 1.411764705882353).rgb) + dec(texture(uSrc, vUv - uDir * 1.411764705882353).rgb)) * w1;
  c += (dec(texture(uSrc, vUv + uDir * 3.2941176470588234).rgb) + dec(texture(uSrc, vUv - uDir * 3.2941176470588234).rgb)) * w2;
  c += (dec(texture(uSrc, vUv + uDir * 5.176470588235294).rgb) + dec(texture(uSrc, vUv - uDir * 5.176470588235294).rgb)) * w3;
  o = vec4(enc(c), 1.0);
}`;

  /* ---------- 3. SIATKÓWKA I MÓZG ---------- */
  const FS_FINAL = COMMON + `
uniform sampler2D uOpt, uHealthy, uBloom;
uniform vec2 uSceneRes, uCoverScale, uCoverOff, uScreenRes;
uniform float uAspect, uFov, uTime, uSplit;
uniform vec2 uGaze, uFloatGaze, uShake;
uniform vec2 uDipOff; uniform float uDipMix;
uniform float uScatter, uVeil, uExposure, uNightBlind, uDesat, uContrast;
uniform vec3 uTint;
uniform mat3 uCvd; uniform float uMono;
uniform float uFieldStyle, uGlaucoma, uTunnel, uHemi, uHemiAmt, uScotoma, uMetamorph;
uniform float uDetach, uDR, uEdema, uFloaters, uSnow, uAura, uAuraPhase, uWarp, uLid, uSquint, uFieldDim;
uniform vec3 uFlash;
uniform float uHealthyScatter;

vec3 optAt(sampler2D t, vec2 uv){
  vec4 e = texture(t, uv);
  vec3 c = dec(e.rgb);
  if (e.a > 0.03) {   // lekkie wygładzenie szumu dużych rozmyć
    vec2 d = e.a * 64.0 * 0.16 / uSceneRes;
    c = c * 0.36 + (dec(texture(t, uv + vec2(d.x, d.y * 0.4)).rgb) + dec(texture(t, uv - vec2(d.x, d.y * 0.4)).rgb)
        + dec(texture(t, uv + vec2(-d.y * 0.4, d.x)).rgb) + dec(texture(t, uv - vec2(-d.y * 0.4, d.x)).rgb)) * 0.16;
  }
  return c;
}
vec3 bloomAt(vec2 uv){ return dec(textureLod(uBloom, uv, 0.0).rgb); }
vec3 tone(vec3 c){
  vec3 k = 0.8 + 0.2 * (1.0 - exp(-(c - 0.8) / 0.2));
  return mix(c, k, step(0.8, c));
}
vec2 worley(vec2 p){
  vec2 ip = floor(p), fp = fract(p); float md = 9.0; float id = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y)); vec2 h = hash22(ip + g);
    vec2 r = g + h - fp; float d = dot(r, r);
    if (d < md) { md = d; id = hash12(ip + g + 3.7); }
  }
  return vec2(sqrt(md), id);
}
float floaterMask(vec2 d){
  float m = 0.0;
  for (int k = 0; k < 7; k++) {
    float fk = float(k);
    vec2 c = vec2(hash12(vec2(fk, 1.3)) * 36.0 - 18.0, hash12(vec2(fk, 7.9)) * 22.0 - 11.0);
    c += vec2(sin(uTime * 0.11 + fk * 2.1), cos(uTime * 0.08 + fk)) * 1.6;
    float sc = 4.0 + 5.0 * hash12(vec2(fk, 4.4));
    vec2 p = (d - c) / sc;
    float an = hash12(vec2(fk, 9.1)) * 6.283;
    p = mat2(cos(an), -sin(an), sin(an), cos(an)) * p;
    float y = p.y - 0.32 * sin(p.x * 2.1 + fk) - 0.16 * sin(p.x * 4.7 + fk * 3.0);
    float env = smoothstep(1.3, 0.3, length(p * vec2(0.5, 1.3)));
    float w = 0.012 + 0.012 * hash12(vec2(fk, 2.0));
    float strand = exp(-y * y / w) * env;                 // nitka (cień włókien kolagenu)
    float edge = exp(-pow(abs(y) - 0.09, 2.0) / 0.0012) * env * 0.35;  // jaśniejsza obwódka dyfrakcyjna
    m += strand * 0.8 - edge * 0.3;
    if (k < 3) {
      float ring = abs(length(p - vec2(0.55, -0.25)) - 0.3);
      m += exp(-ring * ring / 0.004) * 0.6 * smoothstep(1.4, 0.4, length(p));
      vec2 wq = worley(p * 5.0 + fk * 5.0);
      m += smoothstep(0.32, 0.1, wq.x) * step(0.5, wq.y) * env * 0.6;
    }
  }
  return clamp(m, -0.2, 1.0);
}

void main(){
  vec2 suv = (vUv - 0.5) * uCoverScale + 0.5 + uCoverOff;
  vec2 degScale = vec2(uFov, uFov / uAspect);

  // ----- zdrowe oko (lewa strona porównania) -----
  if (vUv.x < uSplit) {
    vec3 h = optAt(uHealthy, suv);
    h = mix(h, bloomAt(suv), uHealthyScatter);
    vec3 col = l2s(tone(h));
    vec2 v = vUv - 0.5; col *= 1.0 - 0.22 * dot(v, v) * 1.6;
    o = vec4(col, 1.0); return;
  }

  vec2 uv = suv + uShake;
  vec2 deg = (uv - uGaze) * degScale;          // stopnie od punktu patrzenia (w dół = +y)
  float r = length(deg);

  // ----- zniekształcenia -----
  vec2 warp = vec2(0.0);
  if (uMetamorph > 0.0) {
    float sig = max(2.5, uScotoma * 1.3);
    vec2 q = deg * (2.2 / sig);
    vec2 w = vec2(vnoise(q + 3.1), vnoise(q + 7.7)) - 0.5;
    w += 0.5 * (vec2(vnoise(q * 2.3 + 1.7), vnoise(q * 2.3 + 9.2)) - 0.5);
    warp += w * uMetamorph * sig * 0.22 * exp(-r * r / (2.0 * sig * sig));
  }
  if (uWarp > 0.0) {
    vec2 w = vec2(vnoise(deg * 1.6 + uTime * 0.05), vnoise(deg * 1.6 + 5.3 - uTime * 0.04)) - 0.5;
    warp += w * uWarp;
  }
  if (uDetach > 0.0) {
    vec2 dir = normalize(vec2(0.35, -1.0));
    float edge = mix(30.0, -6.0, uDetach) + 3.0 * sin(dot(deg, vec2(dir.y, -dir.x)) * 0.18 + uTime * 0.3);
    float pos = dot(deg, dir);
    float band = exp(-pow((pos - edge + 3.0) / 5.0, 2.0));
    warp += vec2(sin(deg.x * 0.6 + uTime), cos(deg.y * 0.5)) * band * 0.9 * uDetach;
  }
  uv += warp / degScale;

  // ----- obraz z oka (i drugiego oka przy zezie) -----
  vec3 c = optAt(uOpt, uv);
  if (uDipMix > 0.0) {
    vec3 c2 = optAt(uOpt, uv + uDipOff);
    c = mix(c, c2, uDipMix);
  }
  vec3 bl = bloomAt(uv);

  // ----- rozpraszanie w ośrodkach oka -----
  vec3 avg = dec(textureLod(uBloom, vec2(0.5), 12.0).rgb);   // średnia jasność całego obrazu
  c = mix(c, bl, uScatter);
  c += avg * uVeil;
  if (uEdema > 0.0) c = mix(c, bl, uEdema * exp(-r * r / (2.0 * 6.0 * 6.0)));
  c *= uTint;
  c *= uExposure;
  if (uContrast > 0.0) c = mix(c, vec3(lum(avg) * uExposure), uContrast);

  // ----- ślepota zmierzchowa: słabe światło znika -----
  if (uNightBlind > 0.0) {
    float L = lum(c);
    float k = smoothstep(0.008, 0.16, L);
    c *= mix(1.0, k * k, uNightBlind);
  }

  // ----- barwy -----
  c = max(uCvd * c, 0.0);
  float L = lum(c);
  c = mix(c, vec3(L), clamp(uMono + uDesat, 0.0, 1.0));

  // ----- ubytki pola widzenia (przyklejone do siatkówki – idą za wzrokiem) -----
  vec3 fillC = mix(bl, vec3(lum(bl)), 0.65) * uFieldDim * uExposure;
  fillC = mix(fillC, vec3(0.008), uFieldStyle);
  float loss = 0.0;
  float ang = atan(deg.y, deg.x);
  if (uGlaucoma > 0.0) {
    float n = fbm(vec2(ang * 1.6, r * 0.05) + 4.0);
    float nasal = deg.x < 0.0 ? 0.82 : 1.0;
    float upper = deg.y < 0.0 ? 0.9 : 1.05;
    float edge = uGlaucoma * (0.65 + 0.7 * n) * nasal * upper;
    loss = max(loss, smoothstep(edge, edge + max(4.0, uGlaucoma * 0.5), r));
    float arc = exp(-pow((r - uGlaucoma * 0.75) / 2.5, 2.0)) * smoothstep(0.55, 0.75, fbm(vec2(ang * 3.0, 1.0)));
    loss = max(loss, arc * 0.8);
  }
  if (uTunnel > 0.0) {
    float e = uTunnel * (0.92 + 0.16 * vnoise(vec2(ang * 2.0, 3.0)));
    loss = max(loss, smoothstep(e, e + 2.5, r));
  }
  if (uHemiAmt > 0.0) {
    float side = smoothstep(-0.4, 0.6, deg.x * uHemi) * smoothstep(1.5, 3.5, r);
    loss = max(loss, side * uHemiAmt);
  }
  if (uDetach > 0.0) {
    vec2 dir = normalize(vec2(0.35, -1.0));
    float edge = mix(30.0, -6.0, uDetach) + 3.0 * sin(dot(deg, vec2(dir.y, -dir.x)) * 0.18 + uTime * 0.3);
    loss = max(loss, smoothstep(edge - 1.5, edge + 4.0, dot(deg, dir)) * 0.93);
  }
  if (uAura > 0.0 && uAuraPhase > 0.0) {
    vec2 pd = deg - vec2(3.5, 1.5);
    float ar = length(pd); float aa = atan(pd.y, pd.x);
    float Rr = mix(0.8, 42.0, uAuraPhase);
    float open = abs(mod(aa - 3.6 + 3.14159, 6.28318) - 3.14159) / 3.14159;  // 0 przy otwarciu łuku
    float arcM = smoothstep(0.22, 0.42, open);
    float inside = smoothstep(Rr - 0.5, Rr - 3.0 - Rr * 0.12, ar) * arcM * smoothstep(1.0, 0.82, uAuraPhase);
    loss = max(loss, inside * 0.75);
  }
  c = mix(c, fillC, loss);

  // mroczek centralny (AMD)
  if (uScotoma > 0.0) {
    float rr = r + (fbm(vec2(ang * 1.3, 0.5) + 2.0) - 0.5) * uScotoma * 0.9;
    float m = 1.0 - smoothstep(uScotoma * 0.55, uScotoma * 1.15, rr);
    vec3 smudge = mix(fillC, vec3(lum(bl) * 0.25 + 0.004), 0.55);
    smudge = mix(smudge, vec3(0.006), uFieldStyle);
    c = mix(c, smudge, m * 0.94);
  }
  // wylewy i wysięki (retinopatia cukrzycowa)
  if (uDR > 0.0) {
    vec2 w = worley(deg * 0.16 + 1.3);
    float spot = smoothstep(0.30 * (0.55 + 0.6 * uDR), 0.08, w.x + 0.12 * (vnoise(deg * 1.4) - 0.5)) * step(1.0 - 0.45 * uDR, w.y);
    vec2 w2 = worley(deg * 0.33 + 8.1);
    float dot2 = smoothstep(0.16, 0.05, w2.x) * step(1.0 - 0.35 * uDR, w2.y);
    float sp = clamp(spot + dot2, 0.0, 1.0) * smoothstep(1.5, 5.0, r + 3.0 * vnoise(deg));
    c = mix(c, vec3(0.05, 0.008, 0.005) * (0.5 + lum(bl)), sp * 0.85);
  }
  // męty ciała szklistego – cienie unoszące się z opóźnieniem za wzrokiem
  if (uFloaters > 0.0) {
    vec2 fd = (suv - uFloatGaze) * degScale;
    float fm = floaterMask(fd);
    if (uDetach > 0.0) { vec2 w = worley(fd * 0.9 + vec2(0.0, uTime * 0.35)); fm = max(fm, smoothstep(0.12, 0.04, w.x) * step(0.6, w.y) * 0.8); }
    c *= 1.0 - fm * 0.62 * uFloaters;
  }
  // aura migrenowa: migoczący zygzak
  if (uAura > 0.0 && uAuraPhase > 0.0) {
    vec2 pd = deg - vec2(3.5, 1.5);
    float ar = length(pd); float aa = atan(pd.y, pd.x);
    float Rr = mix(0.8, 42.0, uAuraPhase);
    float open = abs(mod(aa - 3.6 + 3.14159, 6.28318) - 3.14159) / 3.14159;
    float arcM = smoothstep(0.22, 0.42, open);
    float teeth = max(10.0, Rr * 1.3);
    float seg = aa * teeth / 6.28318;
    float zz = abs(fract(seg) - 0.5) * 2.0;
    float band = 0.35 + Rr * 0.06;
    float dd = ar - Rr - (zz - 0.5) * band * 2.2;
    float edge = smoothstep(band * 0.55, 0.0, abs(dd));
    float id = floor(seg * 2.0);
    vec3 hue = 0.5 + 0.5 * cos(6.28318 * (vec3(0.0, 0.33, 0.67) + hash12(vec2(id, 2.0)) + uTime * 0.6));
    float flick = 0.55 + 0.45 * sin(uTime * 42.0 + id * 2.7);
    float fade = smoothstep(0.0, 0.06, uAuraPhase) * smoothstep(1.0, 0.85, uAuraPhase);
    c += mix(vec3(1.0), hue, 0.65) * edge * arcM * flick * fade * 1.6;
  }
  // błyski (fotopsje)
  if (uFlash.z > 0.0) {
    vec2 fd = deg - uFlash.xy;
    float arc = exp(-pow((length(fd) - 6.0) / 0.5, 2.0)) * smoothstep(0.0, 1.0, fd.x / 6.0 + 0.3);
    c += vec3(1.0, 0.97, 0.9) * arc * uFlash.z * 3.0;
  }

  vec3 col = l2s(tone(c));

  // śnieg optyczny – migoczące drobiny na całym polu widzenia
  if (uSnow > 0.0) {
    vec2 g = floor(gl_FragCoord.xy / 1.5);
    float fr = floor(uTime * 30.0);
    float n = hash12(g + fr * vec2(17.0, 31.0)) - 0.5;
    float sparkle = step(0.997 - 0.004 * uSnow, hash12(g * 1.7 + fr * 3.1));
    col += vec3(n) * 0.28 * uSnow + sparkle * 0.35 * uSnow;
    col += (hash12(g + fr) - 0.5) * vec3(0.04, -0.02, 0.05) * uSnow;
  }

  // powieki (mrugnięcie, mrużenie oczu) – światło przez powieki jest czerwonawe
  if (uLid > 0.001 || uSquint > 0.001) {
    float sy = 1.0 - vUv.y; float x = vUv.x - 0.5;
    float top = mix(-0.08, 0.53, uLid) + uSquint * 0.2 + 0.09 * x * x;
    float bot = 1.0 - (mix(-0.08, 0.53, uLid) + uSquint * 0.13 + 0.06 * x * x);
    float shade = max(smoothstep(top + 0.03, top - 0.03, sy), smoothstep(bot - 0.03, bot + 0.03, sy));
    vec3 lidc = vec3(0.10, 0.018, 0.012) * (0.4 + uExposure * lum(bl));
    col = mix(col, lidc, shade);
  }

  vec2 v = vUv - 0.5; col *= 1.0 - 0.22 * dot(v, v) * 1.6;
  o = vec4(col, 1.0);
}`;

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(s);
      const lines = src.split('\n').map((l, i) => (i + 1) + ': ' + l).join('\n');
      console.error(log + '\n' + lines.slice(0, 200));
      throw new Error('Shader: ' + log);
    }
    return s;
  }

  function program(gl, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VS));
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'aPos');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('Link: ' + gl.getProgramInfoLog(p));
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    const u = {};
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(p, i);
      u[info.name.replace(/\[0\]$/, '')] = { loc: gl.getUniformLocation(p, info.name), type: info.type };
    }
    return { p, u };
  }

  class VisionRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false,
        preserveDrawingBuffer: true, powerPreference: 'high-performance' });
      if (!gl) throw new Error('Brak WebGL2');
      this.gl = gl;
      this.progOptics = program(gl, FS_OPTICS);
      this.progDown = program(gl, FS_DOWN);
      this.progBlur = program(gl, FS_BLUR);
      this.progFinal = program(gl, FS_FINAL);
      const vb = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vb);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
      this.vao = gl.createVertexArray();
      gl.bindVertexArray(this.vao);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      this.texScene = this._tex();
      this.texData = this._tex(true);
      this.sceneW = 0; this.sceneH = 0;
      this.targets = {};
      this.maxN = 160;
    }

    _tex(nearest) {
      const gl = this.gl;
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, nearest ? gl.NEAREST : gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, nearest ? gl.NEAREST : gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    }

    _target(name, w, h, mip) {
      const gl = this.gl;
      let t = this.targets[name];
      if (t && t.w === w && t.h === h) return t;
      if (t) { gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fb); }
      const tex = this._tex();
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      if (mip) gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      const fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      t = this.targets[name] = { tex, fb, w, h, mip };
      return t;
    }

    /* Wgrywa obraz sceny i mapę danych (płótna, wideo albo obraz). */
    upload(colorSrc, dataSrc) {
      const gl = this.gl;
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
      gl.bindTexture(gl.TEXTURE_2D, this.texScene);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, colorSrc);
      if (dataSrc) {
        gl.bindTexture(gl.TEXTURE_2D, this.texData);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, dataSrc);
      }
      this.sceneW = colorSrc.width; this.sceneH = colorSrc.height;
    }

    _set(prog, vals) {
      const gl = this.gl;
      for (const k in vals) {
        const u = prog.u[k];
        if (!u) continue;
        const v = vals[k];
        switch (u.type) {
          case gl.FLOAT: gl.uniform1f(u.loc, v); break;
          case gl.FLOAT_VEC2: gl.uniform2f(u.loc, v[0], v[1]); break;
          case gl.FLOAT_VEC3: gl.uniform3f(u.loc, v[0], v[1], v[2]); break;
          case gl.FLOAT_MAT3: gl.uniformMatrix3fv(u.loc, false, v); break;
          case gl.INT: case gl.SAMPLER_2D: gl.uniform1i(u.loc, v); break;
        }
      }
    }

    _pass(prog, target, vals, textures) {
      const gl = this.gl;
      gl.useProgram(prog.p);
      let unit = 0;
      for (const name in textures) {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, textures[name]);
        if (prog.u[name]) gl.uniform1i(prog.u[name].loc, unit);
        unit++;
      }
      this._set(prog, vals);
      if (target) { gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb); gl.viewport(0, 0, target.w, target.h); }
      else { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, this.canvas.width, this.canvas.height); }
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    /* Optyka oka do wybranego bufora ('opt' – symulowane oko, 'healthy' – zdrowe do porównania). */
    renderOptics(name, u) {
      const W = this.sceneW, H = this.sceneH;
      const t = this._target(name, W, H);
      this._pass(this.progOptics, t, Object.assign({ uRes: [W, H], uAspect: W / H, uMaxN: this.maxN }, u),
        { uScene: this.texScene, uData: this.texData });
      if (name === 'opt') this._bloom();
    }

    _bloom() {
      const gl = this.gl;
      const W = this.sceneW, H = this.sceneH;
      const qw = Math.max(8, Math.round(W / 4)), qh = Math.max(8, Math.round(H / 4));
      const bw = Math.max(8, Math.round(W / 8)), bh = Math.max(8, Math.round(H / 8));
      const q = this._target('bloomQ', qw, qh);
      const a = this._target('bloomA', bw, bh, true), b = this._target('bloomB', bw, bh);
      this._pass(this.progDown, q, { uTexel: [1 / W, 1 / H] }, { uSrc: this.targets.opt.tex });
      this._pass(this.progDown, a, { uTexel: [1 / qw, 1 / qh] }, { uSrc: q.tex });
      // kilka gęstych przebiegów zamiast jednego rzadkiego – bez schodków i siatki
      for (let i = 0; i < 3; i++) {
        this._pass(this.progBlur, b, { uDir: [1 / bw, 0] }, { uSrc: a.tex });
        this._pass(this.progBlur, a, { uDir: [0, 1 / bh] }, { uSrc: b.tex });
      }
      gl.bindTexture(gl.TEXTURE_2D, a.tex);
      gl.generateMipmap(gl.TEXTURE_2D);
    }

    /* Końcowy obraz na ekran. */
    renderFinal(u) {
      const healthy = this.targets.healthy || this.targets.opt;
      this._pass(this.progFinal, null, Object.assign({ uSceneRes: [this.sceneW, this.sceneH], uAspect: this.sceneW / this.sceneH,
        uScreenRes: [this.canvas.width, this.canvas.height] }, u),
      { uOpt: this.targets.opt.tex, uHealthy: healthy.tex, uBloom: this.targets.bloomA.tex });
    }
  }

  window.VisionRenderer = VisionRenderer;
})();
