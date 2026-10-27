# Firebase đã cài đặt (27/10/2026)

| Mục | Giá trị |
|---|---|
| Tài khoản Google | trihue.life@gmail.com |
| Tên dự án | may-doc-the-7a |
| Mã dự án (Project ID) | `may-doc-the-7a-a2195` |
| Realtime Database | `https://may-doc-the-7a-a2195-default-rtdb.asia-southeast1.firebasedatabase.app` (Singapore, gói Spark miễn phí) |
| Đăng nhập | Anonymous: đã bật |
| Quy tắc dữ liệu | Đã đăng bản `database.rules.json` |
| Web app | `trang-web-lop` (appId `1:748316192982:web:da119718a4aae1b7ea5977`) |
| Link trang web (sau khi deploy) | `https://may-doc-the-7a-a2195.web.app` |

## Đã kiểm tra thật trên Firebase
- Đăng nhập ẩn danh bằng khóa web: thành công.
- Ghi `/may/thu-pc/trang_thai` rồi đọc lại: thành công (đã xóa dữ liệu thử).
- Ghi vào đường dẫn không cho phép: bị chặn (401), đúng quy tắc.

## Đã điền sẵn trong gói
- `firebase_web/public/cau_hinh_firebase.js`, `firebase_web/.firebaserc`
- `nap_san_nhom1/cau_noi_internet/` (MAY_ID = nhom1), `nap_san_nhom2/cau_noi_internet/` (MAY_ID = nhom2): biên dịch đạt (78 % flash).

## Còn lại thầy làm
1. Sửa `WIFI_TEN`, `WIFI_MAT_KHAU` trong `cau_hinh.h` của mỗi bản nạp sẵn (WiFi 2,4 GHz).
2. Nạp `nap_san_nhom1` cho ESP32 bộ 1, `nap_san_nhom2` cho bộ 2.
3. Đăng trang web: trong thư mục `firebase_web` chạy `npm install -g firebase-tools`, `firebase login`, `firebase deploy`.
