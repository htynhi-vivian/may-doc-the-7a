# Máy đọc thẻ phân tử — KHTN 7 (Bài 5–6)

Máy STEM dùng **Arduino Uno + đầu đọc QR GM65 (tự quét) + đèn LED RGB WS2812B + LCD 1602 + ESP32 NodeMCU-32S**. Học sinh đưa thẻ QR công thức hóa học vào máy; Uno tự suy luận (đơn chất / hợp chất, liên kết ion / cộng hóa trị), hiện kết quả lên LCD và gửi lên trang web Firebase của lớp.

Tác giả: Trí Huệ.

## Thư mục

| Thư mục / tệp | Nội dung |
|---|---|
| `may_doc_the_internet/` | Chương trình Arduino Uno (bản tự động, đèn LED 3 trạng thái) |
| `cau_noi_internet/` | Chương trình ESP32 cầu nối Internet (mẫu, chưa điền WiFi) |
| `nap_san_nhom1/`, `nap_san_nhom2/` | Bản ESP32 đã điền Firebase cho từng nhóm (`MAY_ID`) |
| `firebase_web/` | Trang web lớp học + quy tắc Realtime Database |
| `kiem_thu/` | Giả lập trên máy tính và kiểm thử trên chip giả lập (simavr) |
| `hinh/` | Sơ đồ khối, sơ đồ nối dây, lắp mạch bằng linh kiện thật |
| `don_hang/` | Đơn hàng Hshop (đơn chính + đơn bổ sung) |
| `HUONG_DAN_UNO_GM65_TU_DONG.md` | Hướng dẫn lắp, nạp, dùng trong lớp |
| `FIREBASE_DA_CAI_DAT.md` | Thông tin dự án Firebase `may-doc-the-7a-a2195` |
| `BAO_CAO_KC-REPORT-20261024-012.md` | Báo cáo kỹ thuật |

## Đèn LED

🔵 chưa quét · 🟡 đã quét · 🟢 quét xong (đã gửi web) · 🔴 thẻ lỗi

## Lưu ý

- Điền tên và mật khẩu WiFi trong `cau_hinh.h` trên máy của mình, **không commit mật khẩu WiFi** lên GitHub.
- Khóa `apiKey` Firebase trong `cau_hinh_firebase.js` là khóa web công khai theo thiết kế của Firebase; dữ liệu được bảo vệ bằng `database.rules.json`.
- Đăng trang web: trong `firebase_web/` chạy `firebase login` rồi `firebase deploy` → https://may-doc-the-7a-a2195.web.app
