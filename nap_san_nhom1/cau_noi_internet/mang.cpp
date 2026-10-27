#include "mang.h"
#include "cau_hinh.h"
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Preferences.h>

#define PHIEN_BAN "uno-gm65-1.1"

struct TinGui { char nut[24]; bool themMoi; char than[640]; };
static QueueHandle_t hangDoiGui = nullptr;
static volatile TrangThaiMang trangThai = MANG_CHUA_KET_NOI;
static char ip[16] = "-";

static String idToken, refreshToken;
static unsigned long hetHanLuc = 0;      // millis() khi idToken hết hạn
static Preferences nvs;

// Lấy giá trị chuỗi của khóa trong JSON đơn giản: "khoa": "gia tri"
static String layChuoi(const String& json, const char* khoa) {
  String k = String("\"") + khoa + "\"";
  int i = json.indexOf(k); if (i < 0) return "";
  i = json.indexOf(':', i + k.length()); if (i < 0) return "";
  i = json.indexOf('"', i + 1); if (i < 0) return "";
  int j = json.indexOf('"', i + 1); if (j < 0) return "";
  return json.substring(i + 1, j);
}

static int goiHttps(const String& url, const char* phuongThuc, const String& than, const char* kieu, String& traVe) {
  WiFiClientSecure client;
  client.setInsecure();   // bản lớp học: không kiểm chứng chứng chỉ (xem hướng dẫn mục An toàn)
  HTTPClient http;
  http.setTimeout(10000);
  if (!http.begin(client, url)) return -1;
  http.addHeader("Content-Type", kieu);
  int ma = http.sendRequest(phuongThuc, (uint8_t*)than.c_str(), than.length());
  traVe = ma > 0 ? http.getString() : String();
  http.end();
  return ma;
}

// Đổi khóa làm mới lấy idToken mới; nếu không có thì tạo tài khoản ẩn danh mới
static bool dangNhap() {
  String tra;
  if (refreshToken.length()) {
    String url = String("https://securetoken.googleapis.com/v1/token?key=") + FIREBASE_API_KEY;
    int ma = goiHttps(url, "POST", "grant_type=refresh_token&refresh_token=" + refreshToken,
                      "application/x-www-form-urlencoded", tra);
    if (ma == 200) {
      idToken = layChuoi(tra, "id_token");
      refreshToken = layChuoi(tra, "refresh_token");
      long giay = layChuoi(tra, "expires_in").toInt();
      hetHanLuc = millis() + (unsigned long)(giay > 0 ? giay : 3600) * 1000UL;
      nvs.putString("rt", refreshToken);
      return idToken.length() > 0;
    }
    Serial.printf("[Firebase] Lam moi token loi %d, dang nhap lai\n", ma);
    refreshToken = "";
  }
  String url = String("https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=") + FIREBASE_API_KEY;
  int ma = goiHttps(url, "POST", "{\"returnSecureToken\":true}", "application/json", tra);
  if (ma != 200) {
    Serial.printf("[Firebase] Dang nhap an danh loi %d: %s\n", ma, tra.substring(0, 160).c_str());
    return false;
  }
  idToken = layChuoi(tra, "idToken");
  refreshToken = layChuoi(tra, "refreshToken");
  long giay = layChuoi(tra, "expiresIn").toInt();
  hetHanLuc = millis() + (unsigned long)(giay > 0 ? giay : 3600) * 1000UL;
  nvs.putString("rt", refreshToken);
  Serial.println("[Firebase] Da dang nhap an danh");
  return idToken.length() > 0;
}

static bool canDangNhap() { return idToken.length() == 0 || (long)(hetHanLuc - millis()) < 5 * 60 * 1000L; }

static int ghiFirebase(const TinGui& t) {
  // Nhật ký để riêng ở /nhat_ky/<máy> cho trang "cả lớp" (đọc /may) luôn nhẹ
  String duongDan = strcmp(t.nut, "nhat_ky") == 0 ? String("/nhat_ky/") + MAY_ID
                                                  : String("/may/") + MAY_ID + "/" + t.nut;
  String url = String(FIREBASE_DB_URL) + duongDan + ".json?auth=" + idToken;
  String tra;
  return goiHttps(url, t.themMoi ? "POST" : "PUT", String(t.than), "application/json", tra);
}

static void datHang(const char* nut, bool themMoi, const char* json) {
  TinGui t; strncpy(t.nut, nut, sizeof t.nut - 1); t.nut[sizeof t.nut - 1] = '\0';
  t.themMoi = themMoi; strncpy(t.than, json, sizeof t.than - 1); t.than[sizeof t.than - 1] = '\0';
  if (xQueueSend(hangDoiGui, &t, 0) != pdTRUE) {          // đầy: bỏ tin cũ nhất, giữ tin mới
    TinGui bo; xQueueReceive(hangDoiGui, &bo, 0); xQueueSend(hangDoiGui, &t, 0);
  }
}

static void tacVuMang(void*) {
  unsigned long lanBaoTrangThai = 0, lanThuWifi = 0;
  for (;;) {
    if (WiFi.status() != WL_CONNECTED) {
      trangThai = MANG_CHUA_KET_NOI;
      if (millis() - lanThuWifi > 10000 || lanThuWifi == 0) {
        lanThuWifi = millis();
        WiFi.disconnect(); WiFi.begin(WIFI_TEN, WIFI_MAT_KHAU);
        Serial.printf("[WiFi] Dang ket noi \"%s\"...\n", WIFI_TEN);
      }
      vTaskDelay(pdMS_TO_TICKS(500));
      continue;
    }
    if (trangThai == MANG_CHUA_KET_NOI) {
      WiFi.localIP().toString().toCharArray(ip, sizeof ip);
      Serial.printf("[WiFi] Da ket noi, IP %s\n", ip);
      trangThai = MANG_CO_WIFI;
    }
    if (canDangNhap()) {
      if (!dangNhap()) { trangThai = MANG_LOI_FIREBASE; vTaskDelay(pdMS_TO_TICKS(15000)); continue; }
      trangThai = MANG_SAN_SANG;
    }
    if (millis() - lanBaoTrangThai > CHU_KY_TRANG_THAI || lanBaoTrangThai == 0) {
      lanBaoTrangThai = millis();
      char json[200];
      snprintf(json, sizeof json, "{\"online\":true,\"ip\":\"%s\",\"rssi\":%d,\"phien_ban\":\"%s\",\"luc\":{\".sv\":\"timestamp\"}}",
               ip, WiFi.RSSI(), PHIEN_BAN);
      datHang("trang_thai", false, json);
    }
    TinGui t;
    if (xQueueReceive(hangDoiGui, &t, pdMS_TO_TICKS(500)) == pdTRUE) {
      int ma = ghiFirebase(t);
      if (ma == 401) {                       // token hết hạn hoặc bị thu hồi: đăng nhập lại, gửi lại 1 lần
        idToken = ""; if (dangNhap()) ma = ghiFirebase(t);
      }
      if (ma == 200) { trangThai = MANG_SAN_SANG; Serial.printf("[Firebase] Da gui %s\n", t.nut); }
      else { trangThai = MANG_LOI_FIREBASE; Serial.printf("[Firebase] Gui %s loi %d\n", t.nut, ma); }
    }
  }
}

void batDauMang() {
  hangDoiGui = xQueueCreate(8, sizeof(TinGui));
  nvs.begin("firebase", false);
  refreshToken = nvs.getString("rt", "");
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  xTaskCreatePinnedToCore(tacVuMang, "mang", 12 * 1024, nullptr, 2, nullptr, 1);
}

bool guiGhiDe(const char* nut, const char* json) { if (!hangDoiGui) return false; datHang(nut, false, json); return true; }
bool guiThemMoi(const char* nut, const char* json) { if (!hangDoiGui) return false; datHang(nut, true, json); return true; }
TrangThaiMang trangThaiMang() { return trangThai; }
const char* diaChiIP() { return ip; }
