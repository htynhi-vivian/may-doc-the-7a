/* ============================================================
 * CẤU HÌNH MẠCH CẦU NỐI ESP32 — sửa các dòng dưới đây cho mỗi máy trước khi nạp
 * ============================================================ */
#pragma once

// ---- 1. WiFi của trường / phòng học (chỉ WiFi 2,4 GHz) ----
// KHÔNG cần sửa: cắm cáp USB vào ESP32, mở trang web > "Cài đặt mạch (USB)" để dò WiFi và nhập mật khẩu.
// WiFi cài từ trang web được lưu trong ESP32 và được ưu tiên hơn hai dòng dưới đây.
#define WIFI_TEN          "Ten_WiFi"
#define WIFI_MAT_KHAU     "Mat_khau_WiFi"

// ---- 2. Firebase (lấy trong Firebase console, xem hướng dẫn) ----
#define FIREBASE_API_KEY  "AIzaSyCxDNjSZ9nKztqIFvpiI-xjYt2yXixUD-U"
// Chép nguyên văn địa chỉ Realtime Database, KHÔNG có dấu / ở cuối.
#define FIREBASE_DB_URL   "https://may-doc-the-7a-default-rtdb.asia-southeast1.firebasedatabase.app"

// ---- 3. Tên máy: mỗi nhóm một tên khác nhau (đổi được ở trang web, mục "Cài đặt mạch (USB)") ----
// Chỉ dùng chữ thường không dấu, số, dấu - hoặc _ (tối đa 20 ký tự). Ví dụ: nhom1, nhom2
#define MAY_ID            "nhom2"

// ---- 4. Chân nối với Arduino Uno (qua mạch chuyển mức 3,3 V <-> 5 V) ----
#define CHAN_RX_TU_UNO    16     // GPIO16 (RX2)  <- Uno D1 (TX)   kết quả từ Uno
#define CHAN_BAO_MANG     4      // GPIO4         -> Uno D7       (THẤP = đã nối Internet)
#define TOC_DO_UNO        9600

// ---- 5. Thời gian ----
#define CHU_KY_TRANG_THAI   30000   // ms: báo "máy đang trực tuyến" lên Firebase
