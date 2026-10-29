/* ============================================================
 * CÀI ĐẶT MẠCH QUA CÁP USB (Web Serial — Chrome / Edge trên máy tính)
 * Trang nói chuyện với mạch bằng các dòng chữ, mỗi lệnh một dòng (xem cau_noi_internet.ino):
 *   #INFO                -> @{"loai":"info","mach":"esp32"|"uno",...}
 *   #QUET                -> @{"loai":"wifi","ds":[{ten,rssi,khoa}]}      (chỉ ESP32)
 *   #WIFI<TAB>ten<TAB>mk -> @{"loai":"da_luu"} | @{"loai":"loi","loi":...}
 * ESP32 chạy ở 115200 baud, Arduino Uno ở 9600 baud: trang thử lần lượt để nhận ra mạch.
 * ============================================================ */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const ngu = (ms) => new Promise(r => setTimeout(r, ms));
  const LOG_MAX = 200;

  if (!("serial" in navigator)) {
    $("usbNoApi").hidden = false; $("usbConnect").disabled = true;
    return;
  }

  // ================= CỔNG NỐI TIẾP =================
  let port = null, reader = null, vongDoc = null, baud = 0;
  let mach = null;                      // "esp32" | "uno" | null
  const choTraLoi = [];                 // [{loai, giai}] đang chờ dòng @{...}
  let dongTam = {};                     // {baud: [dòng]} nhận được lúc đang dò mạch (để chẩn đoán)
  let dangDo = false;

  async function mo(toc) {
    await port.open({ baudRate: toc });
    baud = toc;
    reader = port.readable.getReader();
    vongDoc = (async () => {
      const dec = new TextDecoder(); let buf = "";
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf("\n")) >= 0) { nhanDong(buf.slice(0, i).replace(/\r$/, "")); buf = buf.slice(i + 1); }
          if (buf.length > 4000) buf = "";
        }
      } catch (e) { /* rút cáp hoặc đóng cổng */ }
      finally { try { reader.releaseLock(); } catch (e) {} }
    })();
  }

  async function dong() {
    if (!port) return;
    try { if (reader) await reader.cancel(); } catch (e) {}
    try { await vongDoc; } catch (e) {}
    reader = null; vongDoc = null;
    try { await port.close(); } catch (e) {}
  }

  async function gui(dongLenh) {
    if (!port || !port.writable) throw new Error("Chưa kết nối mạch");
    const w = port.writable.getWriter();
    try { await w.write(new TextEncoder().encode(dongLenh + "\n")); } finally { w.releaseLock(); }
  }

  // Chờ dòng @{"loai": loai} trong ms mili giây; hết giờ trả về null
  function cho(loai, ms) {
    return new Promise(giai => {
      const muc = { loai, giai };
      choTraLoi.push(muc);
      setTimeout(() => { const i = choTraLoi.indexOf(muc); if (i >= 0) { choTraLoi.splice(i, 1); giai(null); } }, ms);
    });
  }
  async function hoi(lenh, loai, ms) { await gui(lenh); return cho(loai, ms); }

  function nhanDong(d) {
    if (d.startsWith("@{")) {
      let o = null;
      try { o = JSON.parse(d.slice(1)); } catch (e) {}
      if (o && o.loai) {
        const i = choTraLoi.findIndex(m => m.loai === o.loai || (o.loai === "loi" && m.loai === "da_luu"));
        if (i >= 0) choTraLoi.splice(i, 1)[0].giai(o);
        if (o.loai === "info" && !dangDo) hienThongTin(o);
        return;                                       // dòng trả lời: không đưa vào nhật ký
      }
    }
    if (dangDo) { (dongTam[baud] ||= []).push(d); return; }
    ghiLog(d);
  }

  // ================= GIAO DIỆN =================
  function setPill(el, cls, title, text) { el.className = "pill " + cls; el.innerHTML = `<b>${title}</b>${text}`; }
  function ghiLog(d, cls) {
    const ul = $("usbLog");
    ul.querySelector(".empty")?.remove();
    const li = document.createElement("li");
    li.textContent = d; if (cls) li.className = cls;
    ul.appendChild(li);
    while (ul.children.length > LOG_MAX) ul.firstChild.remove();
    ul.scrollTop = ul.scrollHeight;
  }
  function xoaLog() { $("usbLog").innerHTML = '<li class="empty">Chưa có dữ liệu.</li>'; }
  function thongBao(cls, html) { const e = $("usbWifiMsg"); e.hidden = !html; e.className = "evt " + cls; e.innerHTML = html; }

  const WIFI_CHU = {
    da_noi: ["ok", "Đã nối WiFi"], dang_noi: ["wait", "Đang nối WiFi…"], chua_cai: ["idle", "Chưa cài WiFi"],
    sai_mat_khau: ["err", "Sai mật khẩu WiFi"], khong_thay_mang: ["err", "Không thấy mạng WiFi này"],
  };
  const FB_CHU = { san_sang: "đã lên Firebase", loi: "lỗi Firebase", chua_noi: "chưa lên Firebase" };

  let thongTin = null;
  function hienThongTin(o) {
    thongTin = o;
    const kv = [];
    if (o.mach === "esp32") {
      setPill($("usbBoard"), "ok", "Mạch", `ESP32 cầu nối Internet · ${esc(o.phien_ban)}`);
      const [cls, chu] = WIFI_CHU[o.wifi] || ["idle", esc(o.wifi)];
      const net = o.wifi === "da_noi" ? `${chu}, ${FB_CHU[o.firebase] || esc(o.firebase)}` : chu;
      setPill($("usbNet"), o.wifi === "da_noi" && o.firebase !== "san_sang" ? (o.firebase === "loi" ? "err" : "wait") : cls, "Internet", net);
      kv.push(["WiFi", o.wifi_ten || "(chưa cài)"]);
      if (o.wifi === "da_noi") kv.push(["Địa chỉ IP", o.ip], ["Sóng WiFi", `${o.rssi} dBm (${moTaSong(o.rssi)})`]);
      if (!$("usbSsid").value && o.wifi_ten) $("usbSsid").value = o.wifi_ten;
    } else {
      setPill($("usbBoard"), "ok", "Mạch", `Arduino Uno (máy đọc thẻ) · ${esc(o.phien_ban)}`);
      setPill($("usbNet"), o.mang ? "ok" : "wait", "Internet", o.mang ? "ESP32 báo đã nối Internet" : "Chưa nối Internet (ESP32 chưa báo)");
      kv.push(["Thử đọc thẻ", "đưa thẻ QR vào máy: các dòng KQ / LG / LOI hiện ở dưới"]);
    }
    $("usbKv").hidden = false;
    $("usbKv").innerHTML = kv.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("");
  }
  const moTaSong = (r) => r >= -60 ? "mạnh" : r >= -72 ? "khá" : r >= -82 ? "yếu" : "rất yếu";
  const soVach = (r) => r >= -60 ? 4 : r >= -70 ? 3 : r >= -80 ? 2 : 1;

  function datTrangThaiNut() {
    const coCong = !!port;
    $("usbConnect").hidden = coCong; $("usbInfo").hidden = !coCong || !mach; $("usbClose").hidden = !coCong;
    $("usbEspForm").disabled = mach !== "esp32";
    $("usbEspHint").innerHTML = mach === "esp32" ? "Chọn mạng ở danh sách (bấm <b>Dò WiFi</b>), gõ mật khẩu rồi bấm <b>Lưu</b>. Chỉ dùng được WiFi <b>2,4 GHz</b>; ESP32 nhớ WiFi cả khi mất điện."
      : mach === "uno" ? "Đang nối <b>Arduino Uno</b>. Muốn cài WiFi, hãy rút cáp, cắm cáp USB vào <b>mạch ESP32</b> rồi bấm <b>Kiểm tra mạch</b> lại."
      : "Kết nối ESP32 ở bước 1 trước. Chỉ dùng được WiFi <b>2,4 GHz</b>.";
  }

  // ================= DÒ MẠCH =================
  async function doMach() {
    // ESP32 trước (115200, trả lời ngay); Uno khởi động lại khi mở cổng nên chờ lâu hơn
    for (const [toc, cho0, lan] of [[115200, 500, 3], [9600, 2500, 4]]) {
      await mo(toc);
      await ngu(cho0);
      for (let k = 0; k < lan; k++) {
        const o = await hoi("#INFO", "info", 1200);
        if (o) return o;
      }
      await dong();
    }
    return null;
  }

  function chanDoan() {
    const doc = (toc) => (dongTam[toc] || []).filter(d => /^[\x20-\x7e\t]{4,}$/.test(d));
    if (doc(115200).some(d => /\[WiFi\]|\[Firebase\]|\[Uno\]|Cau noi/.test(d)))
      return "Mạch là <b>ESP32</b> nhưng đang chạy chương trình cũ. Hãy nạp bản mới trong thư mục <code>cau_noi_internet</code> rồi thử lại.";
    if (doc(9600).some(d => /^(KQ|LG|LOI|CHO)\b/.test(d)))
      return "Mạch là <b>Arduino Uno</b> nhưng đang chạy chương trình cũ. Hãy nạp bản mới trong thư mục <code>may_doc_the_internet</code> rồi thử lại.";
    return "Không nhận được trả lời. Kiểm tra: đã chọn đúng cổng chưa; Arduino IDE (Serial Monitor) có đang mở cổng này không; mạch đã nạp chương trình bản 1.2 chưa; cáp USB có truyền dữ liệu (không phải cáp chỉ sạc) không.";
  }

  let henGio = null;
  async function ketNoi() {
    try {
      port = await navigator.serial.requestPort();
    } catch (e) { return; }                            // người dùng bấm Hủy
    datTrangThaiNut(); xoaLog(); thongBao("", "");
    setPill($("usbBoard"), "wait", "Mạch", "Đang nhận dạng mạch… (khoảng 5–10 giây)");
    setPill($("usbNet"), "idle", "Internet", "—"); $("usbKv").hidden = true;
    dangDo = true; dongTam = {};
    let o = null;
    try {
      o = await doMach();
    } catch (e) {
      dangDo = false;
      setPill($("usbBoard"), "err", "Mạch", "Không mở được cổng: " + esc(e.message) + ". Đóng Arduino IDE / Serial Monitor rồi thử lại.");
      await dong(); port = null; mach = null; datTrangThaiNut();
      return;
    }
    dangDo = false;
    if (!o) {
      setPill($("usbBoard"), "err", "Mạch", chanDoan());
      (dongTam[115200] || []).concat(dongTam[9600] || []).filter(d => /^[\x20-\x7e\t]{4,}$/.test(d)).slice(-20).forEach(d => ghiLog(d));
      await dong(); port = null; mach = null; datTrangThaiNut();
      return;
    }
    mach = o.mach;
    dongTam = {};
    ghiLog(`— Đã nhận ${mach === "esp32" ? "ESP32" : "Arduino Uno"} (${baud} baud) —`, "in");
    hienThongTin(o); datTrangThaiNut();
    clearInterval(henGio);
    if (mach === "esp32") henGio = setInterval(() => { if (!dangLuu && !document.hidden) gui("#INFO").catch(() => {}); }, 3000);
  }

  async function ngat(lyDo) {
    clearInterval(henGio); henGio = null;
    choTraLoi.splice(0).forEach(m => m.giai(null));
    await dong(); port = null; mach = null; thongTin = null;
    setPill($("usbBoard"), "idle", "Mạch", lyDo || "Chưa kết nối");
    setPill($("usbNet"), "idle", "Internet", "—"); $("usbKv").hidden = true;
    $("usbWifis").innerHTML = ""; $("usbScanNote").textContent = "";
    datTrangThaiNut();
  }

  navigator.serial.addEventListener("disconnect", (ev) => { if (ev.target === port) ngat("Đã rút cáp USB"); });

  // ================= WIFI =================
  let dsWifi = [];
  function veDsWifi() {
    const chon = $("usbSsid").value;
    $("usbWifis").innerHTML = dsWifi.map((w, i) => {
      const v = soVach(w.rssi);
      return `<li><button type="button" data-i="${i}" aria-pressed="${w.ten === chon}">
        <span class="bars" aria-hidden="true">${[1, 2, 3, 4].map(k => `<i class="${k <= v ? "on" : ""}" style="height:${k * 25}%"></i>`).join("")}</span>
        <span class="ten">${esc(w.ten)}</span><span class="k">${w.khoa ? "🔒 có mật khẩu" : "mở"} · ${moTaSong(w.rssi)}</span></button></li>`;
    }).join("");
  }
  $("usbWifis").addEventListener("click", (ev) => {
    const b = ev.target.closest("button[data-i]"); if (!b) return;
    const w = dsWifi[+b.dataset.i];
    $("usbSsid").value = w.ten; veDsWifi();
    $("usbPass").value = ""; $("usbPass").placeholder = w.khoa ? "8–63 ký tự" : "WiFi mở: để trống";
    $("usbPass").focus();
  });

  async function quetWifi() {
    $("usbScan").disabled = true; $("usbScanNote").textContent = "Đang dò… (khoảng 3–10 giây)";
    try {
      const o = await hoi("#QUET", "wifi", 20000);
      if (!o) { $("usbScanNote").textContent = "ESP32 không trả lời, thử lại."; return; }
      dsWifi = (o.ds || []).sort((a, b) => b.rssi - a.rssi);
      $("usbScanNote").textContent = dsWifi.length ? `Thấy ${dsWifi.length} mạng.` : "Không thấy mạng nào. Chỉ thấy được WiFi 2,4 GHz.";
      veDsWifi();
    } catch (e) { $("usbScanNote").textContent = e.message; }
    finally { $("usbScan").disabled = false; }
  }

  let dangLuu = false;
  async function luuWifi() {
    const ten = $("usbSsid").value.trim(), mk = $("usbPass").value;
    if (!ten) return thongBao("loi", "Chọn hoặc gõ tên WiFi.");
    if (/[\t\r\n]/.test(ten + mk)) return thongBao("loi", "Tên và mật khẩu không được chứa dấu xuống dòng hay Tab.");
    if (new TextEncoder().encode(ten).length > 32) return thongBao("loi", "Tên WiFi dài quá 32 byte.");
    if (mk && (mk.length < 8 || mk.length > 63)) return thongBao("loi", "Mật khẩu WiFi phải có 8–63 ký tự (để trống nếu WiFi không khóa).");
    dangLuu = true; $("usbSave").disabled = true;
    try {
      const r = await hoi(`#WIFI\t${ten}\t${mk}`, "da_luu", 3000);
      if (!r) return thongBao("loi", "ESP32 không trả lời. Bấm <b>Kiểm tra lại</b> rồi thử lại.");
      if (r.loai === "loi") return thongBao("loi", "ESP32 từ chối: " + esc(r.loi));
      thongBao("wait", `Đã lưu WiFi <b>${esc(ten)}</b> vào ESP32. Đang kết nối…`);
      const batDau = Date.now();
      while (Date.now() - batDau < 40000 && port) {
        await ngu(1500);
        const o = await hoi("#INFO", "info", 2000);
        if (!o) continue;
        hienThongTin(o);
        const lau = Date.now() - batDau > 6000;     // cho ESP32 thử vài giây rồi mới tin lý do lỗi
        if (o.wifi === "da_noi" && o.firebase === "san_sang")
          return thongBao("ok", `✓ ESP32 đã nối WiFi <b>${esc(ten)}</b> (IP ${esc(o.ip)}) và đã lên Firebase. Kết quả quét thẻ sẽ hiện ở tab <b>Khám phá</b>.`);
        if (o.wifi === "da_noi") thongBao("wait", `Đã nối WiFi (IP ${esc(o.ip)}). Đang đăng nhập Firebase…`);
        if (lau && o.wifi === "sai_mat_khau") return thongBao("loi", "Sai mật khẩu WiFi. Gõ lại mật khẩu rồi bấm Lưu.");
        if (lau && o.wifi === "khong_thay_mang") return thongBao("loi", "ESP32 không thấy mạng này. Kiểm tra tên WiFi (phân biệt chữ hoa/thường), WiFi có phải 2,4 GHz không, và để máy gần bộ phát hơn.");
        if (o.wifi === "da_noi" && o.firebase === "loi" && lau)
          return thongBao("loi", "Đã nối WiFi nhưng không lên được Firebase. Kiểm tra mạng có chặn Internet không (một số WiFi trường cần đăng nhập trên trình duyệt).");
      }
      if (port) thongBao("loi", "Hết 40 giây mà ESP32 chưa nối được. Kiểm tra tên, mật khẩu và WiFi 2,4 GHz, rồi thử lại.");
    } catch (e) { thongBao("loi", esc(e.message)); }
    finally { dangLuu = false; $("usbSave").disabled = false; }
  }

  $("usbConnect").onclick = ketNoi;
  $("usbClose").onclick = () => ngat();
  $("usbInfo").onclick = () => gui("#INFO").catch(e => ngat("Mất kết nối: " + e.message));
  $("usbScan").onclick = quetWifi;
  $("usbSave").onclick = luuWifi;
  $("usbSsid").addEventListener("input", veDsWifi);
  $("usbShow").onclick = () => {
    const hien = $("usbPass").type === "password";
    $("usbPass").type = hien ? "text" : "password";
    $("usbShow").textContent = hien ? "Ẩn" : "Hiện"; $("usbShow").setAttribute("aria-pressed", hien);
  };
  datTrangThaiNut();
})();
