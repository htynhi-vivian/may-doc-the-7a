/* ============================================================
 * MẠNG — WiFi + Firebase Realtime Database (qua REST, HTTPS)
 * Chạy trong một tác vụ riêng để việc gửi lên Internet (mất 0,5–2 giây)
 * không làm chậm việc đọc thẻ và đổi màn LCD.
 * Đăng nhập Firebase bằng tài khoản ẩn danh (Anonymous); khóa làm mới
 * được lưu trong bộ nhớ NVS nên khởi động lại không tạo tài khoản mới.
 * Tên/mật khẩu WiFi cũng lưu trong NVS, cài từ trang web qua cáp USB
 * (xem lenh_usb.h); chưa cài thì dùng giá trị trong cau_hinh.h.
 * ============================================================ */
#pragma once
#include <Arduino.h>

enum TrangThaiMang { MANG_CHUA_KET_NOI, MANG_CO_WIFI, MANG_SAN_SANG, MANG_LOI_FIREBASE };

void batDauMang();
// Ghi đè nút /may/<MAY_ID>/<nut> (PUT)
bool guiGhiDe(const char* nut, const char* json);
// Thêm một mục mới (POST, Firebase tự đặt khóa); riêng "nhat_ky" ghi vào /nhat_ky/<MAY_ID>
bool guiThemMoi(const char* nut, const char* json);
TrangThaiMang trangThaiMang();
const char* diaChiIP();

// ---- Cài đặt lưu trong NVS (đổi được qua cáp USB, không cần nạp lại) ----
const char* tenWifi();
// Lưu WiFi mới và kết nối lại ngay. Trả về false nếu tên/mật khẩu không hợp lệ.
bool datWifi(const char* ten, const char* matKhau);
// Yêu cầu dò WiFi; kết quả in ra Serial (một dòng @{"loai":"wifi",...}) khi dò xong
void yeuCauQuetWifi();
// In một dòng @{"loai":"info",...} ra Serial: trạng thái WiFi, Firebase
void inThongTin();
