/* ============================================================
 * MẠNG — WiFi + Firebase Realtime Database (qua REST, HTTPS)
 * Chạy trong một tác vụ riêng để việc gửi lên Internet (mất 0,5–2 giây)
 * không làm chậm việc đọc thẻ và đổi màn LCD.
 * Đăng nhập Firebase bằng tài khoản ẩn danh (Anonymous); khóa làm mới
 * được lưu trong bộ nhớ NVS nên khởi động lại không tạo tài khoản mới.
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
