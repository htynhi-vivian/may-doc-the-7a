/* ============================================================
 * MÁY ĐỌC THẺ TRỰC TUYẾN — nhận kết quả từ ESP32-CAM qua Firebase
 * Dữ liệu (Realtime Database):
 *   /may/<máy>/hien_tai     sự kiện mới nhất: ket_qua | lap_ghep | loi | cho
 *   /may/<máy>/trang_thai   {online, ip, rssi, phien_ban, luc} — máy gửi 30 giây/lần
 *   /nhat_ky/<máy>/<khóa>   các kết quả (ket_qua) theo thời gian
 * ============================================================ */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const TS = { ".sv": "timestamp" };
  const ID_OK = /^[a-z0-9_-]{1,20}$/;
  const ONLINE_MS = 75000;                 // quá 75 s không nhận "trang_thai" thì coi là mất kết nối
  const params = new URLSearchParams(location.search);

  // ================= TẦNG DỮ LIỆU =================
  // Firebase thật
  function backendFirebase(cfg) {
    const app = FB.initializeApp(cfg), db = FB.getDatabase(app);
    let authP = null;
    const ensureAuth = () => authP || (authP = FB.signInAnonymously(FB.getAuth(app)).catch(e => { authP = null; throw e; }));
    return {
      kind: "firebase",
      watch: (p, cb, onErr) => FB.onValue(FB.ref(db, p), s => cb(s.val()), e => onErr && onErr(e)),
      watchLast: (p, n, cb, onErr) => FB.onValue(FB.query(FB.ref(db, p), FB.limitToLast(n)), s => cb(s.val()), e => onErr && onErr(e)),
      set: async (p, v) => { await ensureAuth(); return FB.set(FB.ref(db, p), v); },
      push: async (p, v) => { await ensureAuth(); return FB.push(FB.ref(db, p), v); },
      remove: async (p) => { await ensureAuth(); return FB.remove(FB.ref(db, p)); },
    };
  }
  // Chế độ thử: dữ liệu nằm trong trình duyệt, đồng bộ giữa các thẻ (tab) cùng máy tính
  function backendThu() {
    const tree = {}, subs = new Set();
    const bc = "BroadcastChannel" in window ? new BroadcastChannel("may-doc-the-thu") : null;
    const parts = (p) => p.split("/").filter(Boolean);
    const get = (p) => parts(p).reduce((o, k) => (o && typeof o === "object" ? o[k] : undefined), tree);
    const clone = (v) => (v === undefined ? null : JSON.parse(JSON.stringify(v)));
    const resolve = (v) => v && typeof v === "object"
      ? (v[".sv"] === "timestamp" ? Date.now() : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, resolve(x)]))) : v;
    const related = (a, b) => { a = "/" + parts(a).join("/") + "/"; b = "/" + parts(b).join("/") + "/"; return a.startsWith(b) || b.startsWith(a); };
    function fire(s) {
      let v = clone(get(s.p));
      if (v && s.n) v = Object.fromEntries(Object.keys(v).sort().slice(-s.n).map(k => [k, v[k]]));
      s.cb(v);
    }
    function setRaw(p, v) {
      const ks = parts(p); let o = tree;
      for (const k of ks.slice(0, -1)) { if (!o[k] || typeof o[k] !== "object") o[k] = {}; o = o[k]; }
      if (v === null || v === undefined) delete o[ks[ks.length - 1]]; else o[ks[ks.length - 1]] = v;
      subs.forEach(s => related(s.p, p) && fire(s));
    }
    if (bc) bc.onmessage = (e) => setRaw(e.data.p, e.data.v);
    let seq = 0;
    const api = {
      kind: "thu",
      watch: (p, cb) => { const s = { p, cb }; subs.add(s); setTimeout(() => fire(s)); return () => subs.delete(s); },
      watchLast: (p, n, cb) => { const s = { p, cb, n }; subs.add(s); setTimeout(() => fire(s)); return () => subs.delete(s); },
      set: async (p, v) => { v = resolve(v); setRaw(p, v); bc && bc.postMessage({ p, v }); },
      push: async (p, v) => api.set(p + "/" + Date.now().toString(36).padStart(9, "0") + (seq++).toString(36).padStart(4, "0"), v),
      remove: async (p) => api.set(p, null),
    };
    return api;
  }

  const cfg = window.FIREBASE_CONFIG || {};
  const demo = params.has("thu") || !cfg.apiKey || /DAN_VAO_DAY/.test(cfg.apiKey) || typeof FB === "undefined";
  let B;
  try { B = demo ? backendThu() : backendFirebase(cfg); }
  catch (e) { B = backendThu(); showBanner("err", "Không khởi động được Firebase (" + esc(e.message) + "). Kiểm tra tệp <b>cau_hinh_firebase.js</b>. Trang tạm chạy chế độ thử."); }
  function showBanner(cls, html) { $("banner").innerHTML += `<div class="banner ${cls}">${html}</div>`; }
  if (B.kind === "thu") {
    showBanner("demo", "<b>Chế độ thử</b> — chưa điền cấu hình Firebase nên trang không nhận được máy thật. Mở mục <b>Máy giả lập</b> bên dưới để thử: chọn thẻ, bấm <b>Quét thẻ</b>. Mở thêm một thẻ (tab) trình duyệt khác cùng địa chỉ này sẽ thấy dữ liệu đồng bộ.");
    $("simId").value = "nhom1";
  }

  // ================= TRẠNG THÁI TRANG =================
  let allMay = {};                // /may
  let chon = params.get("may") || "";
  let lastEvtJSON = "", firstEvt = true, unLog = null;
  let netOK = null, audio = null, lcdTimer = null;
  const seenAt = {};              // để nhấp nháy ô máy vừa có kết quả mới

  // ================= BẢNG LÝ THUYẾT (giống trang camera) =================
  const LK = { ion: ["ion", "Liên kết ion"], cht: ["cht", "Liên kết cộng hóa trị"], kl: ["kl", "Kim loại"], kh: ["kh", "Khí hiếm"], pk: ["pk", "Phi kim"] };
  const HAT = { ion: "các ion", cht: "phân tử", kl: "nguyên tử", kh: "nguyên tử", pk: "nguyên tử" };
  const MAY_VN = { kl: "ĐƠN CHẤT · KIM LOẠI · hạt: nguyên tử", kh: "ĐƠN CHẤT · KHÍ HIẾM · hạt: nguyên tử", pk: "ĐƠN CHẤT · PHI KIM · hạt: nguyên tử",
    cht1: "ĐƠN CHẤT · PHI KIM · hạt: phân tử", cht: "HỢP CHẤT · CỘNG HÓA TRỊ · hạt: phân tử", ion: "HỢP CHẤT ION · hạt: các ion" };
  function massLine(cnt, order) {
    const parts = order.map(e => (cnt[e] > 1 ? cnt[e] + "×" : "") + String(ELEM[e].m).replace(".", ","));
    const tot = order.reduce((a, e) => a + cnt[e] * ELEM[e].m, 0);
    return { txt: parts.join(" + ") + " = " + (Math.round(tot * 10) / 10).toString().replace(".", ",") + " amu", tot };
  }
  // dev: bản ghi ket_qua máy gửi (nếu có) — để hiện đúng điều MÁY đã kết luận
  function showSubstance(formula, name, fromAssembly, dev) {
    const p = parseFormula(formula);
    const T = $("theory");
    if (p.err) {
      T.innerHTML = `<div class="th-empty"><div><div class="big">?</div><p>${p.err === "ky-hieu" ? `Ký hiệu <b>${esc(p.sym)}</b> không phải nguyên tố trong bảng của máy.` : "Công thức viết sai cú pháp."}</p></div></div>`;
      return;
    }
    const { cnt, order } = p;
    const libF = LIBKEY[keyOf(cnt)];
    const L = libF ? LIB[libF] : null;
    const shownF = libF || formula;
    const nEl = order.length, nAt = order.reduce((a, e) => a + cnt[e], 0);
    const mayLk = dev && LK[dev.phan_loai] ? dev.phan_loai : machineSays(cnt).lk;
    const real = L ? L.bond : mayLk;
    const dc = nEl === 1;
    const chips = [`<span class="chip ${dc ? "dc" : "hc"}">${dc ? "Đơn chất" : "Hợp chất"}</span>`,
      `<span class="chip ${LK[real][0]}">${LK[real][1]}</span>`,
      `<span class="chip tt">Hạt tạo nên: ${HAT[real]}</span>`];
    if (L) chips.push(`<span class="chip tt">Ở nhiệt độ thường: ${L.tt.toLowerCase()}</span>`);
    const ms = massLine(cnt, order);
    const fig = L ? drawFor(L.draw) : { svg: "", cap: "" };
    if (L && L.cap) fig.cap = L.cap;
    const mayTxt = MAY_VN[mayLk === "cht" && dc ? "cht1" : mayLk];
    const sai = L && mayLk !== real && !(dc && mayLk === "cht" && real === "cht");
    const lcdTxt = dev ? `<br><small>Trên LCD: ${esc(dev.ket_luan)} · ${esc(dev.man4)} · ${esc(String(dev.klpt))} amu</small>` : "";
    const composition = order.map(e => `${e}: ${cnt[e]} nguyên tử`).join(" · ");
    T.innerHTML = `
      <div class="th-head"><div class="th-f">${subHTML(shownF)}</div><div class="th-name">${L ? esc(L.ten) : (name ? esc(name) : "Chưa có trong thư viện")}</div></div>
      <div class="chips">${chips.join("")}</div>
      <div class="stats">
        <div class="stat"><div class="n">${nAt}</div><div class="l">nguyên tử${real === "ion" ? " (1 đơn vị công thức)" : dc && (real === "kl" || real === "kh" || nAt === 1) ? " (ký hiệu đại diện)" : " trong 1 phân tử"}</div></div>
        <div class="stat"><div class="n">${nEl}</div><div class="l">nguyên tố: ${order.join(", ")}</div></div>
        <div class="stat"><div class="n">${(Math.round(ms.tot * 10) / 10).toString().replace(".", ",")}</div><div class="l">amu · khối lượng ${real === "ion" ? "(đơn vị công thức)" : "phân tử"}</div></div>
      </div>
      <div class="th-body">
        <div>
          ${fig.svg ? `<div class="figbox">${fig.svg}<div class="cap">${fig.cap}</div>${fig.extra ? `<div class="extra">${fig.extra}</div>` : ""}</div>` : `<div class="figbox"><div class="cap">Chưa có hình vẽ cho chất này.</div></div>`}
          <div class="mass"><b>Thành phần:</b> ${composition}<br><b>Khối lượng:</b> ${ms.txt}</div>
        </div>
        <div>
          ${L ? `
          <div class="sec"><h3>Đặc điểm</h3><p>${esc(L.mota)}</p></div>
          <div class="sec"><h3>Tính chất</h3><p>${esc(L.tc)}</p></div>
          <div class="sec"><h3>Ứng dụng, đời sống</h3><p>${esc(L.ud)}</p></div>
          ${L.at ? `<div class="box at"><b class="t">An toàn</b>${esc(L.at)}</div>` : ""}
          ${L.biet ? `<div class="box biet"><b class="t">Em có biết</b>${esc(L.biet)}</div>` : ""}`
          : `<div class="box biet"><b class="t">Chất này chưa có trong thư viện</b>${fromAssembly ? "Có thể các thẻ em ghép lại không tạo thành một chất có thật (ví dụ HO, H<sub>3</sub>O). Máy chỉ đếm theo quy tắc nên vẫn kết luận được, nhưng không biết chất đó có tồn tại hay không." : "Trang vẫn đếm được số nguyên tử, số nguyên tố và khối lượng theo công thức."}</div>`}
          <div class="box may ${sai ? "sai" : ""}"><b class="t">Máy đọc thẻ nói</b>${mayTxt}${sai ? `<br><b>Máy sai ở đây!</b> Máy dùng quy tắc gần đúng “có kim loại + phi kim → ion”. Chất này không có kim loại nhưng thực tế là <b>hợp chất ion</b> (có ion NH<sub>4</sub><sup>+</sup>).` : ""}${lcdTxt}</div>
        </div>
      </div>`;
    mountViewers(T);
  }
  function showAtom(sym, dangLap) {
    const E = ELEM[sym], T = $("theory");
    if (!E) return;
    const b = drawBohr(sym);
    const svg = typeof b === "string" ? b : b.svg, shells = typeof b === "string" ? null : b.shells;
    T.innerHTML = `
      <div class="th-head"><div class="th-f">${sym}</div><div class="th-name">Nguyên tử ${esc(E.ten)}</div></div>
      <div class="chips"><span class="chip ${E.loai}">${LK[E.loai][1]}</span><span class="chip tt">Thẻ nguyên tử · dùng để lắp ghép</span></div>
      <div class="stats">
        <div class="stat"><div class="n">${E.z}</div><div class="l">số hiệu nguyên tử = số proton = số electron</div></div>
        <div class="stat"><div class="n">${shells ? shells.length : "–"}</div><div class="l">lớp electron</div></div>
        <div class="stat"><div class="n">${String(E.m).replace(".", ",")}</div><div class="l">amu · khối lượng nguyên tử</div></div>
      </div>
      <div class="th-body">
        <div class="figbox">${svg}<div class="cap">${shells ? `Mô hình nguyên tử Rutherford – Bohr: hạt nhân ở giữa (+${E.z}), ${E.z} electron xếp thành ${shells.length} lớp: ${shells.join(", ")}. Chấm hồng là electron lớp ngoài cùng. Các lớp electron là các vòng tròn đồng tâm quanh hạt nhân (như SGK); kéo để xoay cả mô hình. Thực tế electron chuyển động rất nhanh quanh hạt nhân tạo thành đám mây electron.` : `Nguyên tử ${sym} có ${E.z} electron xếp trên nhiều lớp; ở lớp 7 chưa cần vẽ chi tiết. Hình là ô mạng tinh thể của kim loại ${sym}.`}</div></div>
        <div>
          ${shells ? `<div class="sec"><h3>Lớp ngoài cùng</h3><p><b>${shells[shells.length - 1]} electron</b>${E.loai === "kh" ? " — đã bền vững, nên khí hiếm hầu như không liên kết." : E.loai === "kl" ? " — kim loại dễ nhường các electron này để thành ion dương." : " — phi kim có xu hướng nhận thêm hoặc góp chung electron để lớp ngoài cùng đủ 8 (với H là 2)."}</p></div>` : ""}
          ${ATOM_NOTE[sym] ? `<div class="box biet"><b class="t">Ghi nhớ</b>${esc(ATOM_NOTE[sym])}</div>` : ""}
          ${dangLap ? `<div class="box may"><b class="t">Đang lắp ghép</b>Quét tiếp các thẻ nguyên tử khác, rồi quét thẻ <b>XONG</b> để xem chất em vừa tạo.</div>` : ""}
        </div>
      </div>`;
    mountViewers(T);
  }
  const groups = [["Đơn chất kim loại", s => LIB[s].bond === "kl"], ["Đơn chất phi kim", s => ["cht", "pk"].includes(LIB[s].bond) && Object.keys(parseFormula(s).cnt).length === 1],
    ["Khí hiếm", s => LIB[s].bond === "kh"], ["Hợp chất cộng hóa trị", s => LIB[s].bond === "cht" && Object.keys(parseFormula(s).cnt).length > 1], ["Hợp chất ion", s => LIB[s].bond === "ion"]];
  const ATOMS = ["H", "C", "N", "O", "Na", "Mg", "Cl", "K", "Ca", "S", "Fe"];
  $("pick").innerHTML = `<option value="">— chọn chất —</option>` + groups.map(([g, f]) =>
    `<optgroup label="${g}">${Object.keys(LIB).filter(f).map(k => `<option value="${esc(k)}">${esc(k)} · ${esc(LIB[k].ten)}</option>`).join("")}</optgroup>`).join("")
    + `<optgroup label="Nguyên tử">${ATOMS.map(k => `<option value="@${k}">${k} · nguyên tử ${esc(ELEM[k].ten)}</option>`).join("")}</optgroup>`;
  $("pick").onchange = () => { const v = $("pick").value; if (!v) return; v[0] === "@" ? showAtom(v.slice(1)) : showSubstance(v); };

  // ================= LCD (hiện lại 5 màn như máy) =================
  const pad16 = (s) => String(s ?? "").slice(0, 16);
  const lcdSub = (s) => esc(s).replace(/(\d+)/g, "<sub>$1</sub>");
  function lcd(l0, l1, opt = {}) {
    clearInterval(lcdTimer); lcdTimer = null;
    $("lcd").classList.toggle("off", !!opt.off);
    $("lcd0").innerHTML = opt.sub0 ? lcdSub(pad16(l0)) : esc(pad16(l0));
    $("lcd1").textContent = pad16(l1);
    $("dots").innerHTML = "";
  }
  function lcdKetQua(e) {
    const [m1, ...m2] = String(e.man4 || "").split(" ");
    const screens = [
      [e.cong_thuc, e.ten, true],
      [`So nguyen tu:${String(e.nguyen_tu).padStart(3)}`, `So nguyen to:${String(e.nguyen_to).padStart(3)}`],
      [`Hat: ${e.hat}`, `=> ${e.ket_luan}`],
      [m1, m2.join(" ")],
      ["Khoi luong:", `${Number(e.klpt).toFixed(1)} amu`],
    ];
    let i = 0;
    const draw = () => {
      const [a, b, s] = screens[i];
      $("lcd0").innerHTML = s ? lcdSub(pad16(a)) : esc(pad16(a)); $("lcd1").textContent = pad16(b);
      $("dots").innerHTML = screens.map((_, j) => `<i class="${j === i ? "on" : ""}"></i>`).join("");
      i = (i + 1) % screens.length;
    };
    clearInterval(lcdTimer); $("lcd").classList.remove("off"); draw(); lcdTimer = setInterval(draw, 2000);
  }

  // ================= HIỂN THỊ MỘT MÁY =================
  const fmtTime = (t) => (typeof t === "number" ? new Date(t).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "");
  const isOnline = (st) => !!(st && st.online && typeof st.luc === "number" && Date.now() - st.luc < ONLINE_MS);
  function setPill(el, cls, title, text) { el.className = "pill " + cls; el.innerHTML = `<b>${title}</b>${text}`; }
  function beep(ok = true) {
    if (!$("beep").checked) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const o = audio.createOscillator(), g = audio.createGain();
      o.frequency.value = ok ? 1320 : 330; g.gain.value = 0.08;
      o.connect(g); g.connect(audio.destination); o.start(); o.stop(audio.currentTime + (ok ? 0.09 : 0.25));
    } catch (e) {}
  }
  function renderStatus() {
    const m = allMay[chon];
    if (!chon) { setPill($("stMay"), "idle", "Máy", "Chưa chọn máy"); return; }
    const st = m && m.trang_thai;
    if (isOnline(st)) setPill($("stMay"), "ok", "Máy " + esc(chon), `Trực tuyến · WiFi ${st.rssi ?? "?"} dBm`);
    else if (st && st.luc) setPill($("stMay"), "err", "Máy " + esc(chon), `Mất kết nối · lần cuối ${fmtTime(st.luc)}`);
    else setPill($("stMay"), "wait", "Máy " + esc(chon), "Chưa thấy máy báo trực tuyến");
  }
  function renderEvent(e, isNew) {
    $("evt").hidden = true; $("assembly").hidden = true;
    if (!e) { lcd("  QUET THE QR", chon ? "Cho may gui..." : "", { off: !chon }); return; }
    if (e.loai === "ket_qua") {
      lcdKetQua(e);
      showSubstance(e.cong_thuc, e.ten, e.ten === "(tu lap ghep)", e);
      if (isNew) beep(true);
    } else if (e.loai === "lap_ghep") {
      lcd(e.cong_thuc, `Da quet: ${e.so_the} the`, { sub0: true });
      $("assembly").hidden = false;
      $("assembly").innerHTML = `Đang lắp: <b>${subHTML(esc(e.cong_thuc))}</b> · ${e.so_the} thẻ · quét thẻ <b>XONG</b> để xem kết quả`;
      const sym = String(e.ma || "").startsWith("NT:") ? e.ma.slice(3).trim() : "";
      if (ELEM[sym]) showAtom(sym, true);
      if (isNew) beep(true);
    } else if (e.loai === "loi") {
      lcd(e.dong1, e.dong2);
      $("evt").hidden = false; $("evt").className = "evt loi";
      $("evt").innerHTML = `<b>Máy báo lỗi:</b> ${esc(e.dong1)} · ${esc(e.dong2)}${e.ma ? ` <br><small>Mã vừa quét: <code>${esc(e.ma)}</code></small>` : ""}`;
      if (isNew) beep(false);
    } else {   // cho
      lcd("  QUET THE QR", "Da noi Internet");
    }
  }
  function renderLog(v) {
    const items = v ? Object.values(v).reverse() : [];
    $("log").innerHTML = items.length ? items.map(e =>
      `<li><time>${fmtTime(e.luc)}</time><span class="f">${subHTML(esc(e.cong_thuc))}</span><span>${esc(e.ten)}</span><span class="k">${esc(e.ket_luan)}</span></li>`).join("")
      : `<li class="empty">Chưa có lần quét nào.</li>`;
  }
  function selectMay(id, fromUser) {
    if (id === chon && !fromUser) return;
    chon = id; lastEvtJSON = ""; firstEvt = true;
    if (unLog) { unLog(); unLog = null; }
    renderLog(null);
    if (id) unLog = B.watchLast("/nhat_ky/" + id, 30, renderLog, onDbErr);
    const u = new URL(location.href); id ? u.searchParams.set("may", id) : u.searchParams.delete("may"); history.replaceState(null, "", u);
    $("may").value = id;
    onMay();
  }

  // ================= CẢ LỚP =================
  function renderClass() {
    const ids = Object.keys(allMay).sort();
    if (!ids.length) { $("class").innerHTML = `<div class="emptyclass">Chưa có máy nào gửi dữ liệu. Bật máy ESP32-CAM, hoặc dùng <b>Máy giả lập</b> ở chế độ Một máy.</div>`; return; }
    $("class").innerHTML = ids.map(id => {
      const m = allMay[id] || {}, e = m.hien_tai || {}, on = isOnline(m.trang_thai);
      let f = "–", k = "Chưa quét thẻ nào";
      if (e.loai === "ket_qua") { f = subHTML(esc(e.cong_thuc)); k = `${esc(e.ket_luan)} · ${esc(e.ten)}`; }
      else if (e.loai === "lap_ghep") { f = subHTML(esc(e.cong_thuc)); k = `Đang lắp ghép · ${e.so_the} thẻ`; }
      else if (e.loai === "loi") { f = "!"; k = `Lỗi: ${esc(e.dong1)}`; }
      const moi = e.luc && seenAt[id] !== e.luc && seenAt[id] !== undefined;
      seenAt[id] = e.luc;
      return `<button class="mcard${moi ? " moi" : ""}" data-id="${esc(id)}"><div class="top"><span class="id">${esc(id)}</span><span class="on ${on ? "y" : "n"}">${on ? "trực tuyến" : "ngoại tuyến"}</span></div>
        <div class="f">${f}</div><div class="k">${k}</div><div class="k">${e.luc ? fmtTime(e.luc) : ""}</div></button>`;
    }).join("");
  }
  $("class").addEventListener("click", (ev) => { const b = ev.target.closest(".mcard"); if (b) { selectMay(b.dataset.id, true); setView("mot"); } });
  function setView(v) {
    $("tabMot").setAttribute("aria-pressed", v === "mot"); $("tabLop").setAttribute("aria-pressed", v === "lop"); $("tabUsb").setAttribute("aria-pressed", v === "usb");
    $("viewMot").hidden = v !== "mot"; $("viewLop").hidden = v !== "lop"; $("viewUsb").hidden = v !== "usb";
    const u = new URL(location.href); v !== "mot" ? u.searchParams.set("xem", v) : u.searchParams.delete("xem"); history.replaceState(null, "", u);
  }
  $("tabMot").onclick = () => setView("mot");
  $("tabLop").onclick = () => setView("lop");
  $("tabUsb").onclick = () => setView("usb");

  // ================= NHẬN DỮ LIỆU =================
  function onMay() {
    const ids = Object.keys(allMay).sort();
    if (!chon && ids.length) { selectMay(ids[0]); return; }
    const sel = $("may");
    const opts = (ids.includes(chon) || !chon ? ids : [chon, ...ids]);
    const html = opts.length ? opts.map(id => `<option value="${esc(id)}">${esc(id)}${isOnline(allMay[id] && allMay[id].trang_thai) ? " ●" : ""}</option>`).join("") : `<option value="">(chưa có máy nào)</option>`;
    if (sel.innerHTML !== html) sel.innerHTML = html;
    sel.value = chon;
    renderStatus(); renderClass();
    const e = allMay[chon] && allMay[chon].hien_tai || null;
    const j = JSON.stringify(e);
    if (j !== lastEvtJSON) { renderEvent(e, !firstEvt); lastEvtJSON = j; }
    firstEvt = false;
  }
  function onDbErr(e) {
    netOK = false;
    setPill($("stNet"), "err", "Firebase", /permission/i.test(e.message) ? "Bị từ chối: chưa đăng quy tắc (rules)" : "Lỗi: " + esc(e.message));
  }
  $("may").onchange = () => selectMay($("may").value, true);
  B.watch("/may", (v) => {
    allMay = v || {};
    if (netOK !== true) { netOK = true; setPill($("stNet"), "ok", B.kind === "thu" ? "Chế độ thử" : "Firebase", B.kind === "thu" ? "Dữ liệu chỉ trong trình duyệt này" : "Đã kết nối, nhận dữ liệu tức thì"); }
    onMay();
  }, onDbErr);
  if (B.kind === "firebase") B.watch("/.info/connected", (c) => {
    if (c === false && netOK) setPill($("stNet"), "wait", "Firebase", "Mất mạng, đang kết nối lại…");
    else if (c === true && netOK) setPill($("stNet"), "ok", "Firebase", "Đã kết nối, nhận dữ liệu tức thì");
  });
  setInterval(() => { renderStatus(); renderClass(); }, 15000);   // cập nhật trực tuyến / ngoại tuyến theo thời gian
  if (chon) selectMay(chon, true); else lcd("  CHUA CO MAY", "", { off: true });
  if (params.get("xem") === "lop" || params.get("xem") === "usb") setView(params.get("xem"));

  // ================= MÁY GIẢ LẬP (cùng quy tắc với firmware ESP32-CAM) =================
  const Sim = (() => {
    let dem = {}, order = [], soThe = 0, lapGhep = false, lan = 0, hb = null, hbId = "";
    const ascii = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
    const id = () => { const v = $("simId").value.trim().toLowerCase(); if (!ID_OK.test(v)) throw new Error("Tên máy chỉ gồm chữ thường không dấu, số, - hoặc _ (tối đa 20 ký tự)"); return v; };
    const formulaOf = () => order.map(e => e + (dem[e] > 1 ? dem[e] : "")).join("");
    const reset = () => { dem = {}; order = []; soThe = 0; lapGhep = false; };
    function ketQua(ma, congThuc, ten, cnt) {
      const els = Object.keys(cnt), nEl = els.length, nAt = els.reduce((a, e) => a + cnt[e], 0);
      const lk = machineSays(cnt).lk;
      const hat = lk === "ion" ? "CAC ION" : lk === "cht" ? "PHAN TU" : "NGUYEN TU";
      const ket = lk === "ion" ? "HOP CHAT ION" : nEl === 1 ? "DON CHAT" : "HOP CHAT";
      const man4 = nEl === 1 ? "Don chat: " + (lk === "kl" ? "KIM LOAI" : lk === "kh" ? "KHI HIEM" : "PHI KIM")
        : "Lien ket: " + (lk === "ion" ? "ION (KL + PK)" : "CONG HOA TRI");
      const klpt = Math.round(els.reduce((a, e) => a + cnt[e] * ELEM[e].m, 0) * 10) / 10;
      return { loai: "ket_qua", ma, cong_thuc: congThuc, ten, nguyen_tu: nAt, nguyen_to: nEl, hat, ket_luan: ket, man4, phan_loai: lk, klpt, dem: ++lan, luc: TS };
    }
    async function gui(m, e) {
      await B.set(`/may/${m}/hien_tai`, e);
      if (e.loai === "ket_qua") await B.push(`/nhat_ky/${m}`, e);
    }
    async function heartbeat(m) {
      if (hbId !== m) { clearInterval(hb); hbId = m; hb = setInterval(() => B.set(`/may/${m}/trang_thai`, { online: true, ip: "giả lập", rssi: -50, phien_ban: "web-gia-lap", luc: TS }).catch(() => {}), 30000); }
      await B.set(`/may/${m}/trang_thai`, { online: true, ip: "giả lập", rssi: -50, phien_ban: "web-gia-lap", luc: TS });
    }
    const loi = (ma, d1, d2) => ({ loai: "loi", dong1: d1.slice(0, 16), dong2: d2.slice(0, 16), ma, luc: TS });
    function themNT(ma, sym) {
      if (!ELEM[sym]) return loi(ma, "Ky hieu la: " + sym.slice(0, 3), "Khong la ng.to");
      if (!lapGhep) reset();
      lapGhep = true;
      if (!(sym in dem)) { dem[sym] = 0; order.push(sym); }
      dem[sym]++; soThe++;
      return { loai: "lap_ghep", cong_thuc: formulaOf(), so_the: soThe, ma, luc: TS };
    }
    function xong(ma) {
      if (!lapGhep || !soThe) return loi(ma, "Chua co the nao", "Quet the ng.tu");
      const f = formulaOf(), cnt = { ...dem }; reset();
      return ketQua(ma, f, "(tu lap ghep)", cnt);
    }
    // Trả về danh sách sự kiện máy sẽ gửi (theo đúng thứ tự)
    function xuLy(s) {
      s = s.trim(); if (!s) return [];
      if (s.startsWith("CT:")) {
        const [ct, ten = ""] = s.slice(3).split(/\|(.*)/s);
        reset();
        const p = parseFormula(ct);
        if (p.err) return [p.err === "ky-hieu" ? loi(s, "Ky hieu la: " + p.sym, "Khong la ng.to") : loi(s, "Cong thuc sai", ct)];
        return [ketQua(s, ct, ten.slice(0, 16), p.cnt)];
      }
      if (s.startsWith("NT:")) return [themNT(s, s.slice(3))];
      if (s === "LENH:XONG") return [xong(s)];
      if (s === "LENH:XOA") { reset(); return [{ loai: "cho", luc: TS }]; }
      if (s.includes(",")) {
        reset(); const out = [];
        for (let t of s.split(",")) { t = t.replace(/^ +/, ""); if (!t) continue; const e = themNT(s, t); out.push(e); if (e.loai === "loi") return out; }
        out.push(xong(s)); return out;
      }
      return [loi(s, "Ma QR la", "Ngoai bo the")];
    }
    async function quet(code) {
      let m;
      try { m = id(); } catch (e) { alertBox(e.message); return; }
      await heartbeat(m);
      for (const e of xuLy(code)) await gui(m, e);
      if (chon !== m) selectMay(m, true);
    }
    const cardCode = (f) => `CT:${f}|${ascii(LIB[f].ten).slice(0, 16)}`;
    return { quet, xuLy, cardCode, ketQua, reset };
  })();
  function alertBox(t) { $("evt").hidden = false; $("evt").className = "evt loi"; $("evt").textContent = t; }
  $("simCard").innerHTML = groups.map(([g, f]) =>
    `<optgroup label="${g}">${Object.keys(LIB).filter(f).map(k => `<option value="${esc(Sim.cardCode(k))}">${esc(k)} · ${esc(LIB[k].ten)}</option>`).join("")}</optgroup>`).join("")
    + `<optgroup label="Thẻ nguyên tử">${ATOMS.map(k => `<option value="NT:${k}">NT:${k} · ${esc(ELEM[k].ten)}</option>`).join("")}</optgroup>`
    + `<optgroup label="Thẻ lệnh"><option value="LENH:XONG">XONG</option><option value="LENH:XOA">XÓA</option></optgroup>`;
  const run = (c) => Sim.quet(c).catch(e => alertBox("Không ghi được lên Firebase: " + e.message + (/admin-restricted|operation-not-allowed/.test(e.message) ? " — hãy bật Anonymous trong Authentication." : "")));
  $("simScan").onclick = () => run($("simCard").value);
  $("simSend").onclick = () => { const t = $("simCode").value.trim(); if (t) { run(t); $("simCode").value = ""; } };
  $("simCode").addEventListener("keydown", (e) => { if (e.key === "Enter") $("simSend").click(); });
  $("simDone").onclick = () => run("LENH:XONG");
  $("simClear").onclick = () => run("LENH:XOA");
  $("simWipe").onclick = () => { if (chon) B.remove("/nhat_ky/" + chon).catch(e => alertBox("Không xóa được: " + e.message)); };

  window.__app = { B, Sim, selectMay, setView, showSubstance, showAtom };
})();
