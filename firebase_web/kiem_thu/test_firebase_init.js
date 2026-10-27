// Trang với cấu hình Firebase (giả): SDK khởi động không lỗi, không rơi về chế độ thử
const { chromium } = require("playwright");
(async () => {
  const br = await chromium.launch(); const p = await br.newPage(); const errs = [];
  p.on("pageerror", e => errs.push(e.message));
  await p.route("**/cau_hinh_firebase.js", r => r.fulfill({ contentType: "text/javascript", body:
    'window.FIREBASE_CONFIG={apiKey:"AIzaSyThuNghiem000000000000000000000",authDomain:"thu.firebaseapp.com",databaseURL:"https://thu-default-rtdb.asia-southeast1.firebasedatabase.app",projectId:"thu",appId:"1:1:web:1"};' }));
  await p.goto("http://localhost:8765/?may=nhom1"); await p.waitForTimeout(2500);
  const r = await p.evaluate(() => ({ kind: window.__app.B.kind, demo: !!document.querySelector(".banner.demo"), net: document.getElementById("stNet").textContent, may: document.getElementById("stMay").textContent }));
  console.log(JSON.stringify(r), "lỗi JS:", JSON.stringify(errs));
  console.log(r.kind === "firebase" && !r.demo && errs.length === 0 ? "ĐẠT" : "SAI");
  await br.close();
})();
