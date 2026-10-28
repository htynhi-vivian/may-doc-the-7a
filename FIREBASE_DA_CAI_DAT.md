# Firebase đã cài đặt (chuyển dự án 28/10/2026)

| Mục | Giá trị |
|---|---|
| Tài khoản Google | htynhi@gds.edu.vn |
| Tên dự án | may-doc-the-7a |
| Mã dự án (Project ID) | `may-doc-the-7a` |
| Realtime Database | `https://may-doc-the-7a-default-rtdb.asia-southeast1.firebasedatabase.app` (Singapore, gói Spark miễn phí) |
| Đăng nhập | Anonymous: **cần bật trong Console** (Authentication > Sign-in method) |
| Quy tắc dữ liệu | Đã đăng bản `database.rules.json` |
| Web app | `trang-web-lop` (appId `1:171313410584:web:65b5aaf0468d1a44f7496d`) |
| Link trang web | https://may-doc-the-7a.web.app (đã deploy 28/10/2026) |

## Đã kiểm tra thật trên Firebase
- Đăng nhập ẩn danh bằng khóa web: thành công.
- Ghi `/may/thu-pc/trang_thai` rồi đọc lại: thành công (đã xóa dữ liệu thử).
- Ghi vào đường dẫn không cho phép: bị chặn (401), đúng quy tắc.

## Đã điền sẵn trong gói
- `firebase_web/public/cau_hinh_firebase.js`, `firebase_web/.firebaserc`
- `cau_noi_internet/cau_hinh.h`: khóa Firebase, địa chỉ cơ sở dữ liệu, tên máy `may7a` (chỉ có một máy).

## Còn lại thầy làm
1. Nạp `cau_noi_internet` cho ESP32 và `may_doc_the_internet` cho Arduino Uno.
2. Cài WiFi: cắm USB vào ESP32, mở trang web › tab **Cài đặt mạch (USB)** › **Dò WiFi** › nhập mật khẩu › **Lưu**.
3. Trang web đã đăng sẵn ở https://may-doc-the-7a.web.app (đăng lại: trong `firebase_web` chạy `firebase deploy`).
