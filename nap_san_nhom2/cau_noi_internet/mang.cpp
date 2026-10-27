#include "mang.h"
#include "cau_hinh.h"
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include "chuyen_doi.h"

#define PHIEN_BAN "uno-gm65-1.2"

struct TinGui { char nut[24]; bool themMoi; char than[640]; };
static QueueHandle_t hangDoiGui = nullptr;
static volatile TrangThaiMang trangThai = MANG_CHUA_KET_NOI;
static char ip[16] = "-";

static String idToken, refreshToken;
static unsigned long hetHanLuc = 0;      // millis() khi idToken hết hạn
static Preferences nvs;

// Cài đặt cài từ trang web (NVS "cai_dat"); tác vụ mạng chỉ đọc, đổi qua cờ doiWifi
static Preferences caiDat;
static char wifiTen[33] = "", wifiMk[65] = "", tenMay[21] = MAY_ID;
static volatile bool doiWifi = false, canQuet = false;
static volatile int lyDoRot = 0;          // lý do mất WiFi gần nhất (WIFI_REASON_*)

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
  String duongDan = strcmp(t.nut, "nhat_ky") == 0 ? String("/nhat_ky/") + tenMay
                                                  : String("/may/") + tenMay + "/" + t.nut;
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

// Dò WiFi (chạy trong tác vụ mạng để không giẫm lên WiFi.begin); in một dòng @{"loai":"wifi",...}
static void quetWifi() {
  if (WiFi.status() != WL_CONNECTED) WiFi.disconnect();
  int n = WiFi.scanNetworks(false, false);
  String ra = "@{\"loai\":\"wifi\",\"ds\":[";
  int daIn = 0;
  for (int i = 0; i < n && daIn < 25; i++) {
    String ten = WiFi.SSID(i);
    if (!ten.length()) continue;                      // mạng ẩn
    bool trung = false;                               // nhiều điểm phát cùng tên: giữ cái mạnh nhất (đứng trước)
    for (int j = 0; j < i && !trung; j++) trung = WiFi.SSID(j) == ten;
    if (trung) continue;
    char bTen[80], muc[140];
    cdJsonChuoi(bTen, sizeof bTen, ten.c_str());
    snprintf(muc, sizeof muc, "%s{\"ten\":%s,\"rssi\":%d,\"khoa\":%s}", daIn ? "," : "", bTen,
             WiFi.RSSI(i), WiFi.encryptionType(i) == WIFI_AUTH_OPEN ? "false" : "true");
    ra += muc; daIn++;
  }
  ra += "]}";
  WiFi.scanDelete();
  Serial.println(ra);
}

static void tacVuMang(void*) {
  unsigned long lanBaoTrangThai = 0, lanThuWifi = 0;
  for (;;) {
    if (canQuet) { canQuet = false; quetWifi(); lanThuWifi = 0; }
    if (doiWifi) {                         // vừa cài WiFi mới từ trang web: bỏ mạng cũ, nối lại ngay
      doiWifi = false; lanThuWifi = 0; lyDoRot = 0;
      WiFi.disconnect(); trangThai = MANG_CHUA_KET_NOI;
      vTaskDelay(pdMS_TO_TICKS(200));
    }
    if (WiFi.status() != WL_CONNECTED) {
      trangThai = MANG_CHUA_KET_NOI;
      if (wifiTen[0] && (millis() - lanThuWifi > 10000 || lanThuWifi == 0)) {
        lanThuWifi = millis();
        WiFi.disconnect(); WiFi.begin(wifiTen, wifiMk);
        Serial.printf("[WiFi] Dang ket noi \"%s\"...\n", wifiTen);
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
  caiDat.begin("cai_dat", false);
  if (strcmp(WIFI_TEN, "Ten_WiFi") != 0) {               // cau_hinh.h đã điền: dùng làm mặc định
    strncpy(wifiTen, WIFI_TEN, sizeof wifiTen - 1); strncpy(wifiMk, WIFI_MAT_KHAU, sizeof wifiMk - 1);
  }
  if (caiDat.isKey("ten")) {                             // đã cài từ trang web: ưu tiên
    caiDat.getString("ten", wifiTen, sizeof wifiTen);
    caiDat.getString("mk", wifiMk, sizeof wifiMk);
  }
  if (caiDat.isKey("may")) caiDat.getString("may", tenMay, sizeof tenMay);
  WiFi.onEvent([](WiFiEvent_t, WiFiEventInfo_t info) {   // ghi lại lý do để báo "sai mật khẩu"
    int r = info.wifi_sta_disconnected.reason;
    if (r != WIFI_REASON_ASSOC_LEAVE) lyDoRot = r;          // bỏ qua lần ngắt do chính mình gọi disconnect()
  }, ARDUINO_EVENT_WIFI_STA_DISCONNECTED);
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  xTaskCreatePinnedToCore(tacVuMang, "mang", 12 * 1024, nullptr, 2, nullptr, 1);
}

bool guiGhiDe(const char* nut, const char* json) { if (!hangDoiGui) return false; datHang(nut, false, json); return true; }
bool guiThemMoi(const char* nut, const char* json) { if (!hangDoiGui) return false; datHang(nut, true, json); return true; }
TrangThaiMang trangThaiMang() { return trangThai; }
const char* diaChiIP() { return ip; }

const char* tenWifi() { return wifiTen; }
const char* mayId() { return tenMay; }

bool datWifi(const char* ten, const char* matKhau) {
  size_t n = strlen(ten), m = strlen(matKhau);
  if (n == 0 || n > 32 || m > 63 || (m > 0 && m < 8)) return false;   // WPA2: 8–63 ký tự, hoặc trống nếu mạng mở
  caiDat.putString("ten", ten); caiDat.putString("mk", matKhau);
  strncpy(wifiTen, ten, sizeof wifiTen - 1); wifiTen[sizeof wifiTen - 1] = '\0';
  strncpy(wifiMk, matKhau, sizeof wifiMk - 1); wifiMk[sizeof wifiMk - 1] = '\0';
  doiWifi = true;
  return true;
}

bool datMayId(const char* id) {
  size_t n = strlen(id);
  if (n == 0 || n > 20) return false;
  for (size_t i = 0; i < n; i++) {
    char c = id[i];
    if (!((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '-' || c == '_')) return false;
  }
  caiDat.putString("may", id);
  strncpy(tenMay, id, sizeof tenMay - 1); tenMay[sizeof tenMay - 1] = '\0';
  return true;
}

void yeuCauQuetWifi() { canQuet = true; }

// Trạng thái WiFi cho trang web: da_noi | dang_noi | chua_cai | sai_mat_khau | khong_thay_mang
static const char* moTaWifi() {
  if (!wifiTen[0]) return "chua_cai";
  if (doiWifi) return "dang_noi";                        // WiFi mới chưa được tác vụ mạng áp dụng
  if (WiFi.status() == WL_CONNECTED) return "da_noi";
  int r = lyDoRot;
  if (r == WIFI_REASON_NO_AP_FOUND) return "khong_thay_mang";
  if (r == WIFI_REASON_AUTH_FAIL || r == WIFI_REASON_4WAY_HANDSHAKE_TIMEOUT || r == WIFI_REASON_HANDSHAKE_TIMEOUT
      || r == WIFI_REASON_AUTH_EXPIRE || r == WIFI_REASON_802_1X_AUTH_FAILED) return "sai_mat_khau";
  return "dang_noi";
}

void inThongTin() {
  static const char* const FB[] = { "chua_noi", "chua_noi", "san_sang", "loi" };   // theo TrangThaiMang
  char bTen[80], bMay[48];
  cdJsonChuoi(bTen, sizeof bTen, wifiTen); cdJsonChuoi(bMay, sizeof bMay, tenMay);
  bool coWifi = WiFi.status() == WL_CONNECTED;
  Serial.printf("@{\"loai\":\"info\",\"mach\":\"esp32\",\"phien_ban\":\"%s\",\"may\":%s,\"wifi_ten\":%s,"
                "\"wifi\":\"%s\",\"ip\":\"%s\",\"rssi\":%d,\"firebase\":\"%s\"}\n",
                PHIEN_BAN, bMay, bTen, moTaWifi(), coWifi ? ip : "-", coWifi ? WiFi.RSSI() : 0, doiWifi ? "chua_noi" : FB[trangThai]);
}
