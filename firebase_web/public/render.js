/* ===================== PHÂN TÍCH CÔNG THỨC + VẼ HÌNH ===================== */

// Phân tích công thức như Arduino: "Ca(OH)2" -> {Ca:1, O:2, H:2}; lỗi -> {err, sym}
function parseFormula(s) {
  const cnt = {}, order = [];
  function seg(a, b, k) {
    let i = a;
    while (i < b) {
      const c = s[i];
      if (c === "(") {
        let d = 1, j = i + 1;
        while (j < b && d > 0) { if (s[j] === "(") d++; else if (s[j] === ")") d--; j++; }
        if (d !== 0 || j - 1 === i + 1) throw { err: "cu-phap" };
        let n = "", q = j; while (q < b && /\d/.test(s[q])) n += s[q++];
        const m = n ? +n : 1; if (!m) throw { err: "cu-phap" };
        seg(i + 1, j - 1, k * m); i = q;
      } else if (/[A-Z]/.test(c)) {
        let sym = c; if (i + 1 < b && /[a-z]/.test(s[i + 1])) sym += s[i + 1];
        if (!ELEM[sym]) throw { err: "ky-hieu", sym };
        i += sym.length;
        let n = ""; while (i < b && /\d/.test(s[i])) n += s[i++];
        const m = n ? +n : 1; if (!m) throw { err: "cu-phap" };
        if (!(sym in cnt)) { cnt[sym] = 0; order.push(sym); }
        cnt[sym] += k * m;
      } else throw { err: "cu-phap" };
    }
  }
  try { if (!s) throw { err: "rong" }; seg(0, s.length, 1); return { cnt, order }; }
  catch (e) { return e.err ? e : { err: "cu-phap" }; }
}
const keyOf = (cnt) => Object.keys(cnt).sort().map(k => k + cnt[k]).join("");
const LIBKEY = {};
for (const f in LIB) { const p = parseFormula(f); if (!p.err) LIBKEY[keyOf(p.cnt)] = f; }

// Quy tắc của chương trình 4 trên Arduino (để so với thực tế)
function machineSays(cnt) {
  const els = Object.keys(cnt);
  const kl = els.some(e => ELEM[e].loai === "kl"), kh = els.some(e => ELEM[e].loai === "kh");
  const pk = els.some(e => ELEM[e].loai === "pk");
  const total = els.reduce((a, e) => a + cnt[e], 0);
  if (els.length === 1) {
    if (kl) return { ket: "Đơn chất", hat: "nguyên tử", lk: "kl" };
    if (kh) return { ket: "Đơn chất", hat: "nguyên tử", lk: "kh" };
    return { ket: "Đơn chất", hat: total === 1 ? "nguyên tử" : "phân tử", lk: total === 1 ? "pk" : "cht" };
  }
  if (kl && pk) return { ket: "Hợp chất", hat: "các ion", lk: "ion" };
  return { ket: "Hợp chất", hat: "phân tử", lk: "cht" };
}

// ---------- Vẽ ----------
const COL = { H: "#ffffff", C: "#3b3f46", O: "#e5484d", N: "#3b6fe0", Cl: "#2fb24c", F: "#8fd14f", S: "#f2c230", P: "#f08a24",
  Na: "#8b5cf6", K: "#a855f7", Mg: "#16a34a", Ca: "#64748b", Al: "#e58fb4", Fe: "#c2410c", Cu: "#b87333", Co: "#4f7fd9",
  Br: "#9f1239", He: "#22b8cf", Ne: "#f97316", Ar: "#0ea5b7", Li: "#a78bfa", Zn: "#7c8aa5", Ag: "#c0c7d1", I: "#6d28d9" };
const colorOf = (e) => COL[e] || "#94a3b8";
const light = (hex) => { const n = parseInt(hex.slice(1), 16); return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 160; };
// Bán kính quả cầu (px) — tỉ lệ gần đúng theo bán kính nguyên tử
const RAD = { H: 15, C: 21, N: 20, O: 20, F: 19, S: 25, P: 25, Cl: 25, Br: 27 };
const rad = (e) => RAD[e] || 22;
const subHTML = (s) => s.replace(/(\d+)/g, "<sub>$1</sub>");
const subSVG = (s) => s.replace(/(\d+)/g, '<tspan dy="5" font-size="0.68em">$1</tspan><tspan dy="-5"></tspan>');
const f1 = (v) => Math.round(v * 10) / 10;

function svgWrap(inner, minX, minY, maxX, maxY, pad = 30) {
  const w = maxX - minX + 2 * pad, h = maxY - minY + 2 * pad;
  return `<svg viewBox="${f1(minX - pad)} ${f1(minY - pad)} ${f1(w)} ${f1(h)}" class="mol" role="img">${inner}</svg>`;
}
function mix(hex, t) {            // pha màu với nền sáng: t = 0 (giữ nguyên) … 1 (nhạt hẳn)
  const n = parseInt(hex.slice(1), 16), bg = [236, 240, 248];
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v, i) => Math.round(v + (bg[i] - v) * t));
  return "#" + c.map(v => v.toString(16).padStart(2, "0")).join("");
}
function atomSVG(e, x, y, r = rad(e), fade = 0) {
  const c = mix(colorOf(e), fade), tc = light(colorOf(e)) ? "#2b2d42" : "#ffffff";
  const fs = Math.max(10, Math.min(17, r * 0.78));
  return `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${c}" stroke="#2b2d42" stroke-opacity="${f1(0.4 - fade * 0.5)}" stroke-width="1.5"/>`
    + `<circle cx="${f1(x - r * 0.35)}" cy="${f1(y - r * 0.35)}" r="${f1(r * 0.28)}" fill="#fff" opacity=".35"/>`
    + `<text x="${f1(x)}" y="${f1(y + fs * 0.36)}" text-anchor="middle" font-size="${f1(fs)}" font-weight="800" fill="${tc}" opacity="${f1(1 - fade)}">${e}</text>`;
}
// Que liên kết giữa hai điểm, cắt bớt phần nằm trong quả cầu (ra, rb)
function stickSVG(ax, ay, bx, by, n, ra = 0, rb = 0, fade = 0) {
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, px = -uy, py = ux;
  const a0 = ra * 0.7, b0 = L - rb * 0.7;
  if (b0 - a0 < 2) return "";
  const col = mix("#7d839c", fade);
  let s = "";
  for (let i = 0; i < n; i++) {
    const o = (i - (n - 1) / 2) * 8;
    s += `<line x1="${f1(ax + ux * a0 + px * o)}" y1="${f1(ay + uy * a0 + py * o)}" x2="${f1(ax + ux * b0 + px * o)}" y2="${f1(ay + uy * b0 + py * o)}" stroke="${col}" stroke-width="5" stroke-linecap="round"/>`;
  }
  return s;
}
function bondSVG(a, b, n) { return stickSVG(a[1], a[2], b[1], b[2], n, rad(a[0]), rad(b[0])); }
function drawMolecule(d) {           // mô hình phẳng (2D)
  let s = "", xs = [], ys = [];
  d.b.forEach(([i, j, n]) => { s += bondSVG(d.m[i], d.m[j], n); });
  d.m.forEach(([e, x, y]) => { s += atomSVG(e, x, y); xs.push(x - rad(e)); xs.push(x + rad(e)); ys.push(y - rad(e)); ys.push(y + rad(e)); });
  return svgWrap(s, Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), 14);
}

// ---------- Mô hình 3D (tọa độ thật, đơn vị Å) ----------
const DEG = Math.PI / 180;
function rotX(p, a) { const c = Math.cos(a), s = Math.sin(a); return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c]; }
function rotY(p, a) { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]; }
function project3D(d) {             // trả về các nguyên tử đã xoay, đổi sang px
  const sc = d.scale || 60, [rx, ry] = d.rot || [0, 0], rs = d.rs || 1;
  const P = d.a.map(([e, x, y, z]) => { const q = rotY(rotX([x, y, z], rx * DEG), ry * DEG); return [e, q[0] * sc, q[1] * sc, q[2]]; });
  const zmax = Math.max(...P.map(p => Math.abs(p[3]))) || 1;
  return P.map(([e, x, y, z]) => ({ e, x, y, z, r: rad(e) * rs * (1 + 0.1 * z / zmax), fade: Math.max(0, -z / zmax) * 0.38 }));
}
function draw3D(d) {
  if (d.views) {                     // nhiều góc nhìn đặt cạnh nhau
    let inner = "", x0 = 0, top = 0, bot = 0;
    const parts = d.views.map(([rx, ry, lab]) => { const g = scene3D(Object.assign({}, d, { rot: [rx, ry] })); return { g, lab }; });
    parts.forEach(({ g, lab }) => {
      const dx = x0 - g.minX;
      inner += `<g transform="translate(${f1(dx)},0)">${g.s}</g>`;
      inner += `<text x="${f1(dx + (g.minX + g.maxX) / 2)}" y="${f1(g.maxY + 26)}" text-anchor="middle" font-size="15" font-weight="700" fill="#6b6f85">${lab}</text>`;
      x0 += g.maxX - g.minX + 40; top = Math.min(top, g.minY); bot = Math.max(bot, g.maxY + 32);
    });
    return svgWrap(inner, 0, top, x0 - 40, bot, 12);
  }
  const g = scene3D(d);
  return svgWrap(g.s, g.minX, g.minY, g.maxX, g.maxY, 14);
}
function scene3D(d) {
  const A = project3D(d), items = [];
  A.forEach((a, i) => items.push({ z: a.z, s: () => atomSVG(a.e, a.x, a.y, a.r, a.fade) }));
  (d.b || []).forEach(([i, j, n]) => {
    const a = A[i], b = A[j];
    items.push({ z: (a.z + b.z) / 2 - 0.01, s: () => stickSVG(a.x, a.y, b.x, b.y, n, a.r, b.r, Math.max(a.fade, b.fade) * 0.8) });
  });
  items.sort((p, q) => p.z - q.z);
  const s = items.map(it => it.s()).join("");
  const xs = A.flatMap(a => [a.x - a.r, a.x + a.r]), ys = A.flatMap(a => [a.y - a.r, a.y + a.r]);
  return { s, minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}

// ---------- Hợp chất ion (kích thước theo bán kính ion, pm) ----------
const ION_R = { Na: 102, K: 138, Mg: 72, Ca: 100, Al: 53.5, NH4: 148, Cl: 181, Br: 196, F: 133, O: 140, OH: 137, CO3: 178, SO4: 258 };
const ION_SC = 0.19;                                  // px trên pm
const ionR = (lab) => Math.max(14, (ION_R[lab] || 150) * ION_SC);
const supCh = (ch) => ch.replace("2+", "²⁺").replace("3+", "³⁺").replace("2−", "²⁻").replace("+", "⁺").replace("−", "⁻");
function ionSVG(lab, ch, x, y, r, showCh = true) {
  const cat = /\+/.test(ch), fill = cat ? "#ede4ff" : "#dcf5e6", stroke = cat ? "#7c3aed" : "#15925b";
  const fs = Math.max(10, Math.min(18, r * (lab.length > 2 ? 0.5 : 0.62)));
  let s = `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${fill}" stroke="${stroke}" stroke-width="2.2"/>`
    + `<text x="${f1(x)}" y="${f1(y + fs * 0.36)}" text-anchor="middle" font-size="${f1(fs)}" font-weight="800" fill="#2b2d42">${subSVG(lab)}</text>`;
  if (showCh) s += `<text x="${f1(x + r * 0.78)}" y="${f1(y - r * 0.78)}" text-anchor="middle" font-size="14" font-weight="800" fill="${stroke}">${ch}</text>`;
  return s;
}
function ionName(lab, ch) { return subHTML(lab) + "<sup>" + ch.replace("−", "–") + "</sup>"; }
// Mạng muối ăn (NaCl, KCl, MgO, CaO, NaF, KBr): một lớp của tinh thể lập phương
function drawRockSalt(d) {
  const [[c, cc], [a, ac]] = d.ions, rc = ionR(c), ra = ionR(a), step = (ION_R[c] + ION_R[a]) * ION_SC, N = 4;
  let s = "";
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const an = (i + j) % 2 === 0;
    s += ionSVG(an ? a : c, an ? ac : cc, j * step, i * step, an ? ra : rc, false);
  }
  const m = Math.max(ra, rc);
  return svgWrap(s, -m, -m, (N - 1) * step + m, (N - 1) * step + m, 10);
}
function drawIons(d) {              // các ion trong một đơn vị công thức
  const items = [];
  d.ions.forEach(([lab, ch, n]) => { for (let k = 0; k < n; k++) items.push([lab, ch]); });
  let s = "", x = 0, top = 0, bot = 0;
  items.forEach(([lab, ch]) => {
    const r = ionR(lab);
    s += ionSVG(lab, ch, x + r, 0, r);
    x += 2 * r + 20; top = Math.max(top, r + 16); bot = Math.max(bot, r);
  });
  return svgWrap(s, 0, -top, x - 20, bot, 12);
}
function drawLattice(e) {
  let s = ""; const r = 22;
  for (let row = 0; row < 3; row++) for (let col = 0; col < 5; col++) {
    const x = col * 2 * r + (row % 2 ? r : 0), y = row * r * Math.sqrt(3);
    s += atomSVG(e, x, y, r);
  }
  return svgWrap(s, -r, -r, 9 * r + r, 2 * r * Math.sqrt(3) + r, 12);
}
function drawNoble(e) {
  const pts = [[0, 0], [130, -34], [74, 62], [200, 44]];
  let s = "";
  pts.forEach(([x, y]) => {
    s += `<path d="M${x - 40},${y + 2} q-10,-4 -20,0 M${x - 40},${y + 12} q-8,-3 -15,0" stroke="#9aa0b8" stroke-width="2" fill="none"/>`;
    s += atomSVG(e, x, y, 22);
  });
  return svgWrap(s, -62, -58, 222, 86, 12);
}
function drawGraphite() {           // một lớp than chì: lục giác đều, C–C = 1,42 Å
  const a = 46, pts = [], key = {}, bonds = new Set();
  const add = (x, y) => { const k = Math.round(x) + "," + Math.round(y); if (!(k in key)) { key[k] = pts.length; pts.push([x, y]); } return key[k]; };
  const h = a * Math.sqrt(3);
  for (let row = 0; row < 2; row++) for (let col = 0; col < 3; col++) {
    const cx = col * h + (row % 2 ? h / 2 : 0), cy = row * a * 1.5, ids = [];
    for (let k = 0; k < 6; k++) { const t = Math.PI / 6 + k * Math.PI / 3; ids.push(add(cx + a * Math.cos(t), cy + a * Math.sin(t))); }
    for (let k = 0; k < 6; k++) { const i = ids[k], j = ids[(k + 1) % 6]; bonds.add(Math.min(i, j) + "-" + Math.max(i, j)); }
  }
  let s = "";
  bonds.forEach(k => { const [i, j] = k.split("-").map(Number); s += stickSVG(pts[i][0], pts[i][1], pts[j][0], pts[j][1], 1, 12, 12); });
  pts.forEach(([x, y]) => { s += atomSVG("C", x, y, 12); });
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  return svgWrap(s, Math.min(...xs) - 12, Math.min(...ys) - 12, Math.max(...xs) + 12, Math.max(...ys) + 12, 10);
}
// Glucose dạng mạch hở (công thức cấu tạo, chiếu Fischer)
function drawGlucose() {
  const dy = 58, T = (x, y, t, a = "middle", w = 800, fs = 19, c = "#2b2d42") => `<text x="${x}" y="${y + 7}" text-anchor="${a}" font-size="${fs}" font-weight="${w}" fill="${c}">${t}</text>`;
  const L = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#7d839c" stroke-width="3" stroke-linecap="round"/>`;
  const rows = [["H", "O", 2], ["H", "OH"], ["HO", "H"], ["H", "OH"], ["H", "OH"], ["H", "H"]];
  let s = "";
  rows.forEach(([l, r, dbl], i) => {
    const y = i * dy;
    s += T(0, y, "C");
    s += T(-88, y, i + 1, "middle", 700, 12, "#9aa0b8");
    s += L(-14, y, -38, y) + T(-44, y, l, "end");
    if (dbl) s += L(14, y - 4, 38, y - 4) + L(14, y + 4, 38, y + 4) + T(44, y, r, "start", 800, 19, "#e5484d");
    else s += L(14, y, 38, y) + T(44, y, r, "start", 800, 19, r === "OH" ? "#e5484d" : "#2b2d42");
    if (i < rows.length - 1) s += L(0, y + 14, 0, y + dy - 14);
  });
  const yb = (rows.length - 1) * dy;
  s += L(0, yb + 14, 0, yb + 38) + T(0, yb + 50, "OH", "middle", 800, 19, "#e5484d");
  return svgWrap(s, -100, -14, 90, yb + 60, 12);
}
// Chuỗi nhóm (công thức cấu tạo thu gọn) — dự phòng
function drawChain(groups) {
  let s = "";
  groups.forEach((g, i) => {
    const gy = i * 62;
    s += `<rect x="0" y="${gy - 22}" width="120" height="44" rx="12" fill="#fff4dc" stroke="#c77700" stroke-width="2"/>`;
    s += `<text x="60" y="${gy + 7}" text-anchor="middle" font-size="19" font-weight="800" fill="#2b2d42">${g}</text>`;
    if (i < groups.length - 1) s += `<line x1="60" y1="${gy + 22}" x2="60" y2="${gy + 40}" stroke="#8b90a8" stroke-width="4"/>`;
  });
  return svgWrap(s, 0, -22, 120, (groups.length - 1) * 62 + 22, 12);
}
function drawBohr(sym) {
  const z = ELEM[sym].z;
  if (z > 20) return drawLattice(sym);
  const shells = []; let left = z;
  for (const cap of [2, 8, 8, 2]) { if (left <= 0) break; const n = Math.min(cap, left); shells.push(n); left -= n; }
  let s = "";
  shells.forEach((n, i) => {
    const r = 46 + i * 30;
    s += `<circle cx="0" cy="0" r="${r}" fill="none" stroke="#b9c0dc" stroke-width="2"/>`;
    for (let k = 0; k < n; k++) {
      const t = -Math.PI / 2 + k * 2 * Math.PI / n + i * 0.3;
      const out = i === shells.length - 1;
      s += `<circle cx="${(r * Math.cos(t)).toFixed(1)}" cy="${(r * Math.sin(t)).toFixed(1)}" r="7" fill="${out ? "#e84a6f" : "#1e88e5"}"/>`;
    }
  });
  const c = colorOf(sym), tc = light(c) ? "#2b2d42" : "#fff";
  s += `<circle cx="0" cy="0" r="26" fill="${c}" stroke="#2b2d42" stroke-opacity=".35" stroke-width="1.5"/><text x="0" y="-2" text-anchor="middle" font-size="15" font-weight="800" fill="${tc}">${sym}</text><text x="0" y="15" text-anchor="middle" font-size="12" font-weight="700" fill="${tc}">+${z}</text>`;
  const R = 46 + (shells.length - 1) * 30 + 10;
  return { svg: svgWrap(s, -R, -R, R, R, 10), shells };
}
function drawFor(d) {
  if (d.a) return { svg: draw3D(d), cap: d.cap || "Mô hình quả cầu – que vẽ theo góc liên kết thật. Quả cầu nhạt hơn nằm phía sau. Hai que: liên kết đôi, ba que: liên kết ba." };
  if (d.m) return { svg: drawMolecule(d), cap: d.cap || "Mô hình quả cầu – que: mỗi quả cầu là một nguyên tử, mỗi que là một liên kết." };
  if (d.rock) {
    const [[c, cc], [a, ac]] = d.ions;
    return { svg: drawRockSalt(d), cap: `Một lớp của tinh thể, vẽ theo tỉ lệ kích thước ion: ${ionName(c, cc)} (viền tím, bán kính ${ION_R[c]} pm) và ${ionName(a, ac)} (viền xanh, ${ION_R[a]} pm) xếp xen kẽ. Mỗi ion được 6 ion trái dấu bao quanh (4 trong lớp này, 1 ở lớp trên, 1 ở lớp dưới). Không có phân tử riêng lẻ.` };
  }
  if (d.ions) {
    const parts = d.ions.map(([lab, ch, n]) => `${n} ion ${ionName(lab, ch)}`).join(" : ");
    return { svg: drawIons(d), cap: `Tỉ lệ các ion trong một “đơn vị công thức”: ${parts}. Kích thước vẽ gần đúng theo bán kính ion. Trong tinh thể, ion dương (viền tím) và ion âm (viền xanh) xếp xen kẽ, không có phân tử riêng lẻ.` };
  }
  if (d.lattice) return { svg: drawLattice(d.lattice), cap: "Một lớp nguyên tử kim loại xếp sát nhau, đều đặn (mô hình đơn giản). Hạt tạo nên chất là nguyên tử." };
  if (d.noble) return { svg: drawNoble(d.noble), cap: "Khí hiếm: các nguyên tử đứng riêng lẻ, chuyển động tự do, không liên kết với nhau." };
  if (d.graphite) return { svg: drawGraphite(), cap: "Một lớp than chì: mỗi nguyên tử C nối với 3 nguyên tử C khác thành các vòng lục giác đều. Các lớp chồng lên nhau và dễ trượt, nên than chì mềm." };
  if (d.glucose) return { svg: drawGlucose(), cap: "Công thức cấu tạo glucose dạng mạch hở: 6 nguyên tử C (đánh số 1–6) nối thành mạch; C số 1 có nhóm C=O. Trong nước, phần lớn glucose chuyển sang dạng vòng." };
  if (d.chain) return { svg: drawChain(d.chain), cap: "Công thức cấu tạo thu gọn." };
  return { svg: "", cap: "" };
}

/* ===================== MÔ HÌNH 3D XOAY ĐƯỢC =====================
 * Mọi hình được dựng thành một "cảnh" 3D: quả cầu (nguyên tử, ion, hạt nhân, electron),
 * que liên kết, đường (cạnh ô mạng) và vòng (lớp electron). Kéo chuột / ngón tay để xoay.
 */
const SCENES = {};
let SCENE_ID = 0;
function sceneBox(S) {                 // đưa tâm về gốc, tính bán kính bao
  const n = S.atoms.length; let cx = 0, cy = 0, cz = 0;
  S.atoms.forEach(a => { cx += a.p[0]; cy += a.p[1]; cz += a.p[2]; });
  if (!S.keepCenter) { cx /= n; cy /= n; cz /= n; S.atoms.forEach(a => { a.p = [a.p[0] - cx, a.p[1] - cy, a.p[2] - cz]; });
    (S.lines || []).forEach(l => { l[0] = [l[0][0] - cx, l[0][1] - cy, l[0][2] - cz]; l[1] = [l[1][0] - cx, l[1][1] - cy, l[1][2] - cz]; }); }
  let R = 0;
  S.atoms.forEach(a => { R = Math.max(R, Math.hypot(...a.p) * S.sc + a.r * 1.12); });
  (S.rings || []).forEach(g => { R = Math.max(R, g.R * S.sc + 8); });
  S.R = R;
  return S;
}
function ionSphere(lab, ch, x, y, r, fade, showCh) {
  const cat = /\+/.test(ch), fill = mix(cat ? "#ede4ff" : "#dcf5e6", fade), stroke = mix(cat ? "#7c3aed" : "#15925b", fade * 0.8);
  const fs = Math.max(9, Math.min(18, r * (lab.length > 2 ? 0.5 : 0.62)));
  let s = `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`
    + `<circle cx="${f1(x - r * 0.35)}" cy="${f1(y - r * 0.35)}" r="${f1(r * 0.25)}" fill="#fff" opacity=".45"/>`
    + `<text x="${f1(x)}" y="${f1(y + fs * 0.36)}" text-anchor="middle" font-size="${f1(fs)}" font-weight="800" fill="#2b2d42" opacity="${f1(1 - fade)}">${subSVG(lab)}</text>`;
  if (showCh) s += `<text x="${f1(x + r * 0.8)}" y="${f1(y - r * 0.8)}" text-anchor="middle" font-size="14" font-weight="800" fill="${stroke}">${ch}</text>`;
  return s;
}
function renderScene(S, rx, ry) {
  const R = S.R, P = S.atoms.map(a => { const q = rotY(rotX(a.p, rx * DEG), ry * DEG); return [q[0] * S.sc, q[1] * S.sc, q[2] * S.sc]; });
  const persp = (z) => 1 + 0.16 * z / R, fadeOf = (z) => Math.max(0, -z / R) * 0.42;
  const items = [];
  S.atoms.forEach((a, i) => {
    const [x, y, z] = P[i], r = a.r * persp(z), fd = fadeOf(z);
    let svg;
    if (a.kind === "ion") svg = ionSphere(a.lab, a.ch, x, y, r, fd, a.showCh);
    else if (a.kind === "nuc") {
      const c = colorOf(a.e), tc = light(c) ? "#2b2d42" : "#fff";
      svg = `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${c}" stroke="#2b2d42" stroke-opacity=".35" stroke-width="1.5"/><text x="${f1(x)}" y="${f1(y - 2)}" text-anchor="middle" font-size="15" font-weight="800" fill="${tc}">${a.e}</text><text x="${f1(x)}" y="${f1(y + 14)}" text-anchor="middle" font-size="12" font-weight="700" fill="${tc}">+${a.z}</text>`;
    } else if (a.kind === "el") svg = `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${mix(a.out ? "#e84a6f" : "#1e88e5", fd)}"/>`;
    else svg = atomSVG(a.e, x, y, r, fd);
    a._r = r;
    items.push({ z, svg });
  });
  (S.bonds || []).forEach(([i, j, n]) => {
    const a = P[i], b = P[j], ra = S.atoms[i].r * persp(a[2]), rb = S.atoms[j].r * persp(b[2]);
    items.push({ z: (a[2] + b[2]) / 2 - 0.5, svg: stickSVG(a[0], a[1], b[0], b[1], n, ra, rb, Math.max(fadeOf(a[2]), fadeOf(b[2])) * 0.8) });
  });
  (S.lines || []).forEach(([p, q, dash]) => {
    const a = rotY(rotX(p, rx * DEG), ry * DEG).map(v => v * S.sc), b = rotY(rotX(q, rx * DEG), ry * DEG).map(v => v * S.sc);
    items.push({ z: (a[2] + b[2]) / 2 - 1, svg: `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke="${mix("#9aa3c7", fadeOf((a[2] + b[2]) / 2))}" stroke-width="2"${dash ? ' stroke-dasharray="5 4"' : ""}/>` });
  });
  (S.rings || []).forEach(g => {       // vòng tròn 3D: chia thành 48 đoạn để xếp lớp đúng trước–sau
    const pts = [];
    for (let k = 0; k <= 48; k++) {
      const t = k / 48 * 2 * Math.PI, p = [g.R * (Math.cos(t) * g.u[0] + Math.sin(t) * g.v[0]), g.R * (Math.cos(t) * g.u[1] + Math.sin(t) * g.v[1]), g.R * (Math.cos(t) * g.u[2] + Math.sin(t) * g.v[2])];
      pts.push(rotY(rotX(p, rx * DEG), ry * DEG).map(v => v * S.sc));
    }
    for (let k = 0; k < 48; k++) {
      const a = pts[k], b = pts[k + 1], z = (a[2] + b[2]) / 2;
      items.push({ z: z - 0.8, svg: `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke="${mix("#9aa6d6", fadeOf(z) * 1.2)}" stroke-width="2.2" stroke-linecap="round"/>` });
    }
  });
  items.sort((p, q) => p.z - q.z);
  const pad = 10, W = R + pad;
  return `<svg viewBox="${f1(-W)} ${f1(-W * (S.hr || 1))} ${f1(2 * W)} ${f1(2 * W * (S.hr || 1))}" class="mol" role="img">${items.map(i => i.svg).join("")}</svg>`;
}
function viewerHTML(S) {
  sceneBox(S);
  const id = "s" + (++SCENE_ID); SCENES[id] = S;
  const [rx, ry] = S.rot || [-15, 25];
  return `<div class="v3d" data-sid="${id}"><div class="v3d-stage" tabindex="0" role="application" aria-label="Mô hình 3D. Kéo để xoay; phím mũi tên cũng xoay được." data-rx="${rx}" data-ry="${ry}">${renderScene(S, rx, ry)}</div>`
    + `<div class="v3d-bar"><span class="v3d-hint">⟳ Kéo để xoay 3D</span><button type="button" data-act="auto">▶ Tự xoay</button><button type="button" data-act="reset">Đặt lại</button></div></div>`;
}
function mountViewers(root) {
  root.querySelectorAll(".v3d").forEach(v => {
    if (v._m) return; v._m = 1;
    const S = SCENES[v.dataset.sid], st = v.querySelector(".v3d-stage"), btn = v.querySelector('[data-act="auto"]');
    const r0 = [+st.dataset.rx, +st.dataset.ry];
    let rx = r0[0], ry = r0[1], drag = null, auto = false, raf = 0, pending = false;
    const draw = () => { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; st.innerHTML = renderScene(S, rx, ry); }); };
    const stopAuto = () => { auto = false; btn.textContent = "▶ Tự xoay"; cancelAnimationFrame(raf); };
    const tick = () => { if (!auto || !v.isConnected) return; ry = (ry + 0.6) % 360; st.innerHTML = renderScene(S, rx, ry); raf = requestAnimationFrame(tick); };
    st.addEventListener("pointerdown", e => { stopAuto(); drag = [e.clientX, e.clientY, rx, ry]; st.setPointerCapture(e.pointerId); st.classList.add("drag"); });
    st.addEventListener("pointermove", e => { if (!drag) return; ry = drag[3] + (e.clientX - drag[0]) * 0.6; rx = Math.max(-90, Math.min(90, drag[2] - (e.clientY - drag[1]) * 0.6)); draw(); });
    const up = () => { drag = null; st.classList.remove("drag"); };
    st.addEventListener("pointerup", up); st.addEventListener("pointercancel", up);
    st.addEventListener("keydown", e => {
      const k = { ArrowLeft: [0, -8], ArrowRight: [0, 8], ArrowUp: [8, 0], ArrowDown: [-8, 0] }[e.key];
      if (!k) return; e.preventDefault(); stopAuto(); rx = Math.max(-90, Math.min(90, rx + k[0])); ry += k[1]; draw();
    });
    btn.onclick = () => { if (auto) stopAuto(); else { auto = true; btn.textContent = "❚❚ Dừng"; raf = requestAnimationFrame(tick); } };
    v.querySelector('[data-act="reset"]').onclick = () => { stopAuto(); rx = r0[0]; ry = r0[1]; draw(); };
  });
}

// ---------- Dựng cảnh cho từng loại hình ----------
function sceneMolecule(d) {
  return { sc: d.scale || 60, rot: d.views ? [d.views[1][0], d.views[1][1]] : (d.rot || [-12, 20]),
    atoms: d.a.map(([e, x, y, z]) => ({ e, p: [x, y, z], r: rad(e) * (d.rs || 1) })), bonds: d.b };
}
const ION_KEEP = 0.55;                     // mạng tinh thể: vẽ ion nhỏ lại để nhìn thấy bên trong
function sceneRockSalt(d) {
  const [[c, cc], [a, ac]] = d.ions, h = (ION_R[c] + ION_R[a]) / 100, sc = 34, atoms = [], lines = [];
  const idx = {};
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
    const cat = (i + j + k) % 2 === 0, lab = cat ? c : a;
    idx[i + "," + j + "," + k] = atoms.length;
    atoms.push({ kind: "ion", lab, ch: cat ? cc : ac, p: [i * h, j * h, k * h], r: ION_R[lab] / 100 * sc * ION_KEEP });
  }
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
    if (i < 1) lines.push([[i * h, j * h, k * h], [(i + 1) * h, j * h, k * h]]);
    if (j < 1) lines.push([[i * h, j * h, k * h], [i * h, (j + 1) * h, k * h]]);
    if (k < 1) lines.push([[i * h, j * h, k * h], [i * h, j * h, (k + 1) * h]]);
  }
  return { sc, atoms, lines, rot: [-22, 30], keepCenter: true };
}
function sceneIons(d) {                   // nhóm ion theo tỉ lệ công thức (không phải phân tử)
  const cats = [], ans = [];
  d.ions.forEach(([lab, ch, n]) => { for (let k = 0; k < n; k++) (/\+/.test(ch) ? cats : ans).push([lab, ch]); });
  const sc = 44, atoms = [], rA = (l) => ION_R[l] / 100;
  const dist = (l1, l2) => rA(l1) + rA(l2) + 0.25;
  const mk = (lab, ch, p) => atoms.push({ kind: "ion", lab, ch, p, r: Math.max(12, rA(lab) * sc), showCh: true });
  const [big, small] = cats.length >= ans.length ? [cats, ans] : [ans, cats];
  if (small.length === 1) {               // 1 ion ở giữa, các ion kia xếp quanh
    const [l0, c0] = small[0]; mk(l0, c0, [0, 0, 0]);
    const n = big.length, dirs = n === 1 ? [[1, 0, 0]] : n === 2 ? [[-1, 0, 0], [1, 0, 0]] : [[1, 0, 0], [-0.5, 0, 0.866], [-0.5, 0, -0.866]];
    big.forEach(([l, c], i) => { const D = dist(l, l0); mk(l, c, dirs[i].map(v => v * D)); });
  } else {                                 // Al2O3: xếp zigzag O – Al – O – Al – O
    big.forEach(([l, c], i) => mk(l, c, [(i - (big.length - 1) / 2) * 3.2, 0.6, 0]));
    small.forEach(([l, c], i) => mk(l, c, [(i - (small.length - 1) / 2) * 3.2, -0.6, 0]));
  }
  return { sc, atoms, rot: [-14, 20] };
}
const METAL = {                            // ô mạng cơ sở, a (Å), bán kính nguyên tử (Å)
  Fe: { type: "bcc", a: 2.87, r: 1.26, ten: "lập phương tâm khối (một nguyên tử ở mỗi đỉnh và một ở tâm khối)" },
  Cu: { type: "fcc", a: 3.61, r: 1.28, ten: "lập phương tâm mặt (một nguyên tử ở mỗi đỉnh và một ở tâm mỗi mặt)" },
  Co: { type: "hcp", a: 2.51, c: 4.07, r: 1.25, ten: "lục phương (các lớp nguyên tử xếp chặt chồng lên nhau)" },
};
function sceneMetal(e) {
  const M = METAL[e] || { type: "fcc", a: 3.6, r: 1.3 }, sc = 44, atoms = [], lines = [];
  const at = (p) => atoms.push({ e, p, r: M.r * sc * 0.62 });
  if (M.type === "hcp") {
    const a = M.a, c = M.c, hex = [];
    for (let k = 0; k < 6; k++) hex.push([a * Math.cos(k * Math.PI / 3), a * Math.sin(k * Math.PI / 3)]);
    [-c / 2, c / 2].forEach(y => { at([0, y, 0]); hex.forEach(([x, z]) => at([x, y, z])); hex.forEach(([x, z], k) => { const [x2, z2] = hex[(k + 1) % 6]; lines.push([[x, y, z], [x2, y, z2]]); }); });
    hex.forEach(([x, z]) => lines.push([[x, -c / 2, z], [x, c / 2, z]]));
    for (let k = 0; k < 3; k++) { const t = Math.PI / 6 + k * 2 * Math.PI / 3, rr = a / Math.sqrt(3); at([rr * Math.cos(t), 0, rr * Math.sin(t)]); }
  } else {
    const a = M.a, h = a / 2;
    for (const x of [-h, h]) for (const y of [-h, h]) for (const z of [-h, h]) at([x, y, z]);
    if (M.type === "bcc") at([0, 0, 0]);
    else [[h, 0, 0], [-h, 0, 0], [0, h, 0], [0, -h, 0], [0, 0, h], [0, 0, -h]].forEach(at);
    const C = [-h, h];
    C.forEach(y => C.forEach(z => lines.push([[-h, y, z], [h, y, z]])));
    C.forEach(x => C.forEach(z => lines.push([[x, -h, z], [x, h, z]])));
    C.forEach(x => C.forEach(y => lines.push([[x, y, -h], [x, y, h]])));
  }
  return { sc, atoms, lines, rot: [-20, 28], keepCenter: true };
}
function sceneNoble(e) {
  const pts = [[-2.6, -1.2, 1.4], [2.4, -2.0, -1.0], [0.4, 1.8, 2.2], [-1.6, 2.2, -2.0], [2.2, 1.4, 0.4], [-0.2, -2.6, -2.2]];
  const L = 3.4, lines = [];
  [-L, L].forEach(y => [-L, L].forEach(z => lines.push([[-L, y, z], [L, y, z], 1])));
  [-L, L].forEach(x => [-L, L].forEach(z => lines.push([[x, -L, z], [x, L, z], 1])));
  [-L, L].forEach(x => [-L, L].forEach(y => lines.push([[x, y, -L], [x, y, L], 1])));
  return { sc: 34, atoms: pts.map(p => ({ e, p, r: 20 })), lines, rot: [-15, 25], keepCenter: true };
}
function sceneGraphite() {                 // 2 lớp than chì xếp lệch (AB), cách nhau 3,35 Å
  const a = 1.42, atoms = [], bonds = [], key = {};
  const addA = (x, y, z) => { const k = [x, y, z].map(v => Math.round(v * 100)).join(","); if (!(k in key)) { key[k] = atoms.length; atoms.push({ e: "C", p: [x, y, z], r: 11 }); } return key[k]; };
  [[-1.675, 0], [1.675, a]].forEach(([y, shift]) => {
    const h = a * Math.sqrt(3);
    for (let row = -1; row <= 0; row++) for (let col = -1; col <= 0; col++) {
      const cx = col * h + (row % 2 ? h / 2 : 0) + h / 4, cz = row * a * 1.5 + a * 0.75 + shift, ids = [];
      for (let k = 0; k < 6; k++) { const t = Math.PI / 6 + k * Math.PI / 3; ids.push(addA(cx + a * Math.cos(t), y, cz + a * Math.sin(t))); }
      for (let k = 0; k < 6; k++) { const i = ids[k], j = ids[(k + 1) % 6], kk = Math.min(i, j) + "-" + Math.max(i, j); if (!bonds.some(b => b.k === kk)) bonds.push({ k: kk, b: [i, j, 1] }); }
    }
  });
  return { sc: 40, atoms, bonds: bonds.map(b => b.b), rot: [-24, 20] };
}
function sceneBohr(sym) {
  const z = ELEM[sym].z, shells = []; let left = z;
  for (const cap of [2, 8, 8, 2]) { if (left <= 0) break; const n = Math.min(cap, left); shells.push(n); left -= n; }
  const atoms = [{ kind: "nuc", e: sym, z, p: [0, 0, 0], r: 24 }], rings = [];
  const tilts = [[0, 0], [0, 0], [0, 0], [0, 0]];   // như SGK: các lớp là vòng tròn đồng tâm cùng một mặt phẳng
  shells.forEach((n, i) => {
    const R = 46 + i * 30, [ta, tb] = tilts[i].map(t => t * DEG);
    const u = rotY([1, 0, 0], tb), v = rotY(rotX([0, 1, 0], ta), tb);
    rings.push({ R, u, v });
    for (let k = 0; k < n; k++) {
      const t = -Math.PI / 2 + k * 2 * Math.PI / n;    // electron chia đều, bắt đầu từ đỉnh vòng
      atoms.push({ kind: "el", out: i === shells.length - 1, p: [R * (Math.cos(t) * u[0] + Math.sin(t) * v[0]), R * (Math.cos(t) * u[1] + Math.sin(t) * v[1]), R * (Math.cos(t) * u[2] + Math.sin(t) * v[2])], r: 6.5 });
    }
  });
  return { S: { sc: 1, atoms, rings, rot: [0, 0], keepCenter: true }, shells };
}
function sceneGlucose(d) { return { sc: 44, atoms: d.a.map(([e, x, y, z]) => ({ e, p: [x, y, z], r: rad(e) * 0.9 })), bonds: d.b, rot: [-18, 16] }; }

// Ghi đè: mọi hình đều là mô hình 3D xoay được
drawFor = function (d) {
  if (d.a && d.glucose) return { svg: viewerHTML(sceneGlucose(d)), extra: drawGlucose(), cap: "Mô hình 3D phân tử glucose dạng mạch hở (24 nguyên tử: 6 C, 12 H, 6 O). Bên dưới là công thức cấu tạo tương ứng: 6 nguyên tử C đánh số 1–6, C số 1 có nhóm C=O. Trong nước, phần lớn glucose chuyển sang dạng vòng." };
  if (d.a) return { svg: viewerHTML(sceneMolecule(d)), cap: d.cap || "Mô hình quả cầu – que vẽ theo độ dài và góc liên kết thật. Quả cầu nhạt hơn nằm phía sau. Hai que: liên kết đôi, ba que: liên kết ba." };
  if (d.rock) {
    const [[c, cc], [a, ac]] = d.ions;
    return { svg: viewerHTML(sceneRockSalt(d)), cap: `Mạng tinh thể lập phương (27 ion). ${ionName(c, cc)} (viền tím, bán kính ${ION_R[c]} pm) và ${ionName(a, ac)} (viền xanh, ${ION_R[a]} pm) xếp xen kẽ; ion ở tâm được 6 ion trái dấu bao quanh. Các ion vẽ nhỏ lại (giữ đúng tỉ lệ kích thước) để nhìn thấy bên trong; thực tế chúng xếp sát nhau. Không có phân tử riêng lẻ.` };
  }
  if (d.ions) {
    const parts = d.ions.map(([lab, ch, n]) => `${n} ion ${ionName(lab, ch)}`).join(" : ");
    return { svg: viewerHTML(sceneIons(d)), cap: `Nhóm ion theo đúng tỉ lệ trong công thức: ${parts} (kích thước theo bán kính ion). Đây không phải một phân tử: trong tinh thể, rất nhiều ion dương (viền tím) và ion âm (viền xanh) xếp xen kẽ nhau.` };
  }
  if (d.lattice) { const M = METAL[d.lattice]; return { svg: viewerHTML(sceneMetal(d.lattice)), cap: `Ô mạng tinh thể ${M ? M.ten : ""}. Hạt tạo nên kim loại là nguyên tử; nguyên tử vẽ nhỏ lại để thấy cách sắp xếp, thực tế chúng xếp sát nhau.` }; }
  if (d.noble) return { svg: viewerHTML(sceneNoble(d.noble)), cap: "Khí hiếm trong bình: các nguyên tử đứng riêng lẻ, cách xa nhau, chuyển động tự do, không liên kết với nhau." };
  if (d.graphite) return { svg: viewerHTML(sceneGraphite()), cap: "Than chì: hai lớp nguyên tử carbon. Trong mỗi lớp, mỗi nguyên tử C nối với 3 nguyên tử C khác thành vòng lục giác đều; các lớp cách nhau 3,35 Å và dễ trượt lên nhau, nên than chì mềm." };
  return { svg: "", cap: "" };
};
drawBohr = function (sym) {
  const z = ELEM[sym].z;
  if (z > 20) return viewerHTML(sceneMetal(sym));
  const { S, shells } = sceneBohr(sym);
  return { svg: viewerHTML(S), shells };
};
