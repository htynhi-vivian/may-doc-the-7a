// Kiểm thử trang ở CHẾ ĐỘ THỬ bằng Chromium (Playwright)
const { chromium } = require("playwright");
const fs = require("fs");
const URL = process.argv[2] || "http://localhost:8765/";
const ds = fs.readFileSync("/home/claude/esp32cam/kiem_thu/ds.txt", "utf8").split("\n");
const out = fs.readFileSync("/home/claude/esp32cam/kiem_thu/out.jsonl", "utf8").trim().split("\n").map(l => JSON.parse(l));
let fail = 0; const ok = (c, m) => { console.log((c ? "  ĐẠT  " : "  SAI  ") + m); if (!c) fail++; };
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 1366, height: 900 } });
  const errs = []; const p1 = await ctx.newPage(); p1.on("pageerror", e => errs.push(e.message)); p1.on("console", m => m.type() === "error" && errs.push(m.text()));
  await p1.goto(URL); await p1.waitForTimeout(400);
  ok(await p1.locator(".banner.demo").count() === 1, "không có cấu hình → chế độ thử");
  // 1. Đối chiếu suy luận với firmware (C)
  const r = await p1.evaluate(([ds, out]) => {
    let same = 0, diff = [];
    ds.forEach((f, i) => { if (i >= out.length) return; const o = out[i];
      window.__app.Sim.reset(); const ev = window.__app.Sim.xuLy("CT:" + f + "|Ten \"thu\"")[0];
      if (o.loi) { ev.loai === "loi" ? same++ : diff.push([f, "C lỗi, JS không"]); return; }
      const keys = ["cong_thuc", "ten", "nguyen_tu", "nguyen_to", "hat", "ket_luan", "man4", "phan_loai", "klpt"];
      const bad = keys.filter(k => (k === "klpt" ? Math.abs(ev[k] - o[k]) > 0.05 : ev[k] !== o[k]));
      bad.length ? diff.push([f, bad.map(k => k + ":" + ev[k] + "≠" + o[k]).join(",")]) : same++; });
    return { same, diff };
  }, [ds, out]);
  ok(r.diff.length === 0, `máy giả lập trùng firmware ${r.same}/${r.same + r.diff.length}` + (r.diff.length ? " " + JSON.stringify(r.diff.slice(0, 5)) : ""));
  // 2. Quét thẻ hợp chất
  const p2 = await ctx.newPage(); p2.on("pageerror", e => errs.push("p2: " + e.message));
  await p2.goto(URL + "?may=nhom1"); await p2.waitForTimeout(300);
  await p1.click("#sim summary"); await p1.fill("#simId", "nhom1");
  await p1.selectOption("#simCard", { value: "CT:H2O|Nuoc" }); await p1.click("#simScan"); await p1.waitForTimeout(400);
  ok(/H2O/.test(await p1.textContent(".th-f")), "trang 1 hiện lý thuyết H2O");
  ok(/H2O/.test(await p1.textContent("#lcd0")) && /Nuoc/.test(await p1.textContent("#lcd1")), "LCD màn 1: H2O / Nuoc");
  ok(await p1.locator("#log li .f").count() === 1, "nhật ký có 1 dòng");
  ok(/H2O/.test(await p2.textContent(".th-f")) && (await p2.locator(".v3d-stage").count()) > 0, "trang 2 (tab khác) nhận ngay H2O + hình 3D");
  await p1.waitForTimeout(2100); ok(/So nguyen tu:  3/.test(await p1.textContent("#lcd0")), "LCD tự chuyển màn 2 (số nguyên tử 3)");
  // 3. NH4Cl: máy sai
  await p1.fill("#simCode", "CT:NH4Cl|Ammonium chloride"); await p1.press("#simCode", "Enter"); await p1.waitForTimeout(300);
  ok(await p2.locator(".box.may.sai").count() === 1, "NH4Cl: hiện khung 'Máy sai ở đây'");
  // 4. Lắp ghép H, H, O, XONG
  for (const c of ["NT:H", "NT:H", "NT:O"]) { await p1.fill("#simCode", c); await p1.press("#simCode", "Enter"); await p1.waitForTimeout(150); }
  await p2.waitForTimeout(200);
  ok(/H2O/.test(await p2.textContent("#assembly")) && /3 thẻ/.test(await p2.textContent("#assembly")), "đang lắp: H2O · 3 thẻ");
  ok(/Nguyên tử Oxygen|Nguyên tử oxygen|Nguyên tử/.test(await p2.textContent(".th-name")) && (await p2.textContent(".th-f")) === "O", "hiện mô hình nguyên tử O");
  await p1.click("#simDone"); await p1.waitForTimeout(300);
  ok(/H2O/.test(await p2.textContent(".th-f")) && (await p2.locator("#assembly").isHidden()), "XONG → H2O, ẩn thanh lắp ghép");
  // 5. Lỗi
  await p1.fill("#simCode", "CT:Xy2"); await p1.press("#simCode", "Enter"); await p1.waitForTimeout(300);
  ok(/Ky hieu la: X/.test(await p2.textContent("#evt")) && !(await p2.locator("#evt").isHidden()), "thẻ sai → báo lỗi 'Ky hieu la'");
  await p1.click("#simDone"); await p1.waitForTimeout(200);
  ok(/Chua co the nao/.test(await p2.textContent("#lcd0")), "XONG khi chưa có thẻ → 'Chua co the nao'");
  // 6. Cả lớp
  await p1.fill("#simId", "nhom2"); await p1.selectOption("#simCard", { value: "NT:Na" }); await p1.click("#simScan");
  await p1.fill("#simCode", "CT:NaCl|Sodium chloride"); await p1.press("#simCode", "Enter"); await p1.waitForTimeout(300);
  await p2.click("#tabLop"); await p2.waitForTimeout(200);
  ok(await p2.locator(".mcard").count() === 2, "cả lớp: 2 máy");
  ok(/HOP CHAT ION/.test(await p2.textContent('.mcard[data-id="nhom2"]')), "ô nhom2: HOP CHAT ION");
  ok(/trực tuyến/.test(await p2.textContent('.mcard[data-id="nhom1"] .on')), "nhom1 trực tuyến");
  await p2.screenshot({ path: "anh_ca_lop.png" });
  await p2.click('.mcard[data-id="nhom2"]'); await p2.waitForTimeout(300);
  ok(/NaCl/.test(await p2.textContent(".th-f")) && (await p2.inputValue("#may")) === "nhom2", "bấm ô → xem chi tiết nhom2");
  await p2.screenshot({ path: "anh_mot_may.png", fullPage: false });
  // 7. Xóa nhật ký, XÓA
  await p1.selectOption("#may", "nhom1"); await p1.waitForTimeout(200);
  const n1 = await p1.locator("#log li .f").count();
  await p1.click("#simWipe"); await p1.waitForTimeout(200);
  ok(n1 === 3 && await p1.locator("#log li .f").count() === 0, `xóa nhật ký nhom1 (${n1} → 0)`);
  await p1.fill("#simId", "nhom1"); await p1.click("#simClear"); await p1.waitForTimeout(200);
  ok(/QUET THE QR/.test(await p1.textContent("#lcd0")), "thẻ XÓA → LCD 'QUET THE QR'");
  // 8. Điện thoại
  const pm = await br.newPage({ viewport: { width: 390, height: 844 } }); await pm.goto(URL);
  const sw = await pm.evaluate(() => document.documentElement.scrollWidth); ok(sw <= 390, "màn hình điện thoại không tràn ngang (" + sw + ")");
  ok(errs.length === 0, "không có lỗi JavaScript " + JSON.stringify(errs));
  await br.close(); console.log(fail ? `\n${fail} mục SAI` : "\nTẤT CẢ ĐẠT"); process.exit(fail ? 1 : 0);
})();
