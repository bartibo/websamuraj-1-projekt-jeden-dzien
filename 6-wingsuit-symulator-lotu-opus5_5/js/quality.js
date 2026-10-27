/* Na Krawędzi – jakość grafiki: poziomy (niska…ultra) i rozpoznanie sprzętu po karcie graficznej, procesorze i ekranie */
(function (root) {
  'use strict';
  const WS = root.WS;

  // ratio – największa gęstość pikseli, minRatio – dolna granica automatycznej rozdzielczości,
  // mpx – limit megapikseli renderu (4K przy ratio 2 to za dużo nawet dla mocnej karty),
  // seg / R / mid – teren (oczka kawałka, promień kawałków wokół pilota, oczko pierścienia środkowego),
  // hq – szczegóły w shaderach (0 brak, 1 tak, 2 tak + dalszy zasięg), parts – mnożnik cząstek pogody
  const TIERS = [
    { id: 'niska', name: 'Niska', ratio: 1.25, minRatio: 0.6, mpx: 1.1, msaa: 0, bloom: 0, rays: 0, flare: 0, seg: 32, R: 3, mid: 50, hq: 0, parts: 0.5,
      desc: 'Płynność przed wszystkim: mniejsza rozdzielczość, bez poświaty i wygładzania krawędzi.' },
    { id: 'srednia', name: 'Średnia', ratio: 1.5, minRatio: 0.75, mpx: 2.2, msaa: 0, bloom: 1, rays: 0, flare: 0, seg: 48, R: 4, mid: 50, hq: 0, parts: 0.8,
      desc: 'Pełny teren i poświata jasnych miejsc. Dla zintegrowanych kart i starszych laptopów.' },
    { id: 'wysoka', name: 'Wysoka', ratio: 1.5, minRatio: 0.75, mpx: 4.2, msaa: 4, bloom: 1, rays: 1, flare: 1, seg: 48, R: 4, mid: 50, hq: 1, parts: 1,
      desc: 'Wygładzanie krawędzi, promienie słońca, odblaski obiektywu, rzeźba skał i chmur.' },
    { id: 'ultra', name: 'Ultra', ratio: 2, ss: 1.5, minRatio: 1, mpx: 8.4, msaa: 4, bloom: 1, rays: 1, flare: 1, seg: 64, R: 5, mid: 40, hq: 2, parts: 1.3,
      desc: 'Wszystko na maksimum: gęstszy i dalszy teren, ostrzejszy obraz, więcej cząstek. Dla mocnych kart graficznych.' }
  ];

  function gpuName(renderer) {
    const gl = renderer.getContext();
    let s = '';
    try {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      if (ext) s = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '';
    } catch (e) { /* przeglądarka ukrywa nazwę karty */ }
    if (!s) s = gl.getParameter(gl.RENDERER) || '';
    return String(s);
  }

  // Krótka, czytelna nazwa karty: „ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 (0x…) Direct3D11 …)” → „NVIDIA GeForce RTX 4070”
  function shortGpu(s) {
    const m = s.match(/ANGLE \([^,]*,\s*([^,(]+?)(?:\s*\(0x[0-9a-f]+\))?(?:\s+Direct3D.*|\s+OpenGL.*|\s+Vulkan.*)?,/i);
    let n = m ? m[1] : s;
    n = n.replace(/ANGLE Metal Renderer:\s*/i, '').replace(/\/PCIe\/SSE2/i, '').replace(/, or similar/i, '').replace(/\s+/g, ' ').trim();
    return n.length > 48 ? n.slice(0, 46) + '…' : n || 'nieznana karta';
  }

  // Ocena karty graficznej po nazwie: 0 niska … 3 ultra (null = nie wiadomo)
  function gpuTier(g, mobile) {
    g = g.toLowerCase();
    if (/swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/.test(g)) return 0;
    if (mobile) {
      if (/apple/.test(g)) return 1;
      const a = g.match(/adreno[^0-9]*(\d{3})/);
      if (a) return +a[1] >= 730 ? 1 : 0;
      if (/mali-g7[1-9]|mali-g[6-9]\d\d|immortalis|xclipse/.test(g)) return 1;
      return 0;
    }
    let m;
    if ((m = g.match(/rtx\s*(?:a)?(\d{4})/))) { const n = +m[1]; return n % 100 <= 50 && n < 4000 ? 2 : 3; }
    if (/rtx|titan/.test(g)) return 3;
    if ((m = g.match(/gtx\s*(\d{3,4})/))) { const n = +m[1]; return n >= 1060 ? 2 : n >= 1000 || n >= 960 ? 1 : 0; }
    if ((m = g.match(/rx\s*(\d{4})/))) { const n = +m[1]; return n >= 6600 ? 3 : n >= 5500 ? 2 : 1; }
    if ((m = g.match(/rx\s*(\d{3})/))) { const n = +m[1]; return n >= 570 ? 2 : 1; }
    if (/radeon.*(780m|880m|890m|8060s)/.test(g)) return 2;
    if (/radeon.*(680m|760m|740m)/.test(g)) return 1;
    if ((m = g.match(/apple m(\d)\s*(pro|max|ultra)?/))) return m[2] || +m[1] >= 3 ? 3 : 2;
    if (/arc\(tm\)|intel.*arc|arc a\d/.test(g)) return 2;
    if (/iris|xe graphics/.test(g)) return 1;
    if (/intel|uhd|hd graphics/.test(g)) return 0;
    if (/radeon.*vega|radeon\(tm\) graphics|radeon graphics/.test(g)) return 1;
    if (/geforce|quadro|nvidia/.test(g)) return 2;
    if (/radeon|amd/.test(g)) return 2;
    return null;
  }

  function detect(renderer) {
    const gpu = gpuName(renderer);
    const cores = navigator.hardwareConcurrency || 4;
    const mem = navigator.deviceMemory || 0;
    const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (touch && Math.min(screen.width, screen.height) < 900);
    let tier = gpuTier(gpu, mobile);
    const why = [];
    if (tier === null) { tier = mobile ? 0 : cores >= 8 ? 2 : 1; why.push('nieznana karta, ocena po procesorze'); }
    if (!renderer.capabilities.isWebGL2) { tier = Math.min(tier, 1); why.push('bez WebGL 2'); }
    if (cores <= 2) { tier = Math.min(tier, 0); why.push(`${cores} wątki procesora`); } else if (cores <= 4 && tier > 1) { tier--; why.push(`${cores} wątki procesora`); }
    if (mem && mem <= 2) { tier = Math.min(tier, 0); why.push(`${mem} GB pamięci`); }
    return { tier, gpu: shortGpu(gpu), rawGpu: gpu, cores, mem, mobile, why };
  }

  // Rozdzielczość renderu: limit gęstości pikseli z poziomu i limit megapikseli (duże ekrany).
  // Ultra renderuje gęściej niż ekran (ss), co daje ostrzejsze krawędzie i drobne detale bez migotania.
  function ratioFor(t, w, h) {
    const dpr = Math.max(window.devicePixelRatio || 1, t.ss || 0);
    const byMpx = Math.sqrt(t.mpx * 1e6 / Math.max(1, w * h));
    return Math.max(0.5, Math.min(t.ratio, dpr, byMpx));
  }

  WS.Quality = { TIERS, detect, ratioFor };
  // aktywny poziom (ustawia main.js przed budową świata)
  WS.Q = TIERS[2];
})(window);
