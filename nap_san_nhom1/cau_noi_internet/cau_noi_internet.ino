/*
 * MẠCH CẦU NỐI INTERNET (ESP32 NodeMCU-32S) cho MÁY ĐỌC THẺ PHÂN TỬ — bản Uno + GM65
 * KHTN 7 · Bài 5, 6 · Tác giả: Trí Huệ
 * ------------------------------------------------------------
 * Arduino Uno tự đọc thẻ (GM65 quét liên tục), suy luận, hiện LCD; sau mỗi lần quét,
 * Uno TỰ gửi một dòng kết quả sang mạch này qua dây nối tiếp (Uno TX -> GPIO16). Mạch này chỉ làm "người đưa thư":
 *   1. Đổi dòng kết quả thành JSON, gửi lên Firebase Realtime Database qua WiFi
 *        /may/<MAY_ID>/hien_tai, /nhat_ky/<MAY_ID>, /may/<MAY_ID>/trang_thai
 *   2. Kéo chân GPIO4 xuống THẤP khi đã nối Firebase, để LCD của Uno hiện "Da noi Internet"
 * Mạch này KHÔNG suy luận: mọi kết luận về chất đều do Arduino Uno đưa ra.
 *
 * Bo mạch trong Arduino IDE: esp32 > NodeMCU-32S. Sửa tệp cau_hinh.h trước khi nạp.
 */
#include "cau_hinh.h"
#include "chuyen_doi.h"
#include "mang.h"

char dongUno[200];
uint16_t doDai = 0;
char json[640];

bool tenMayHopLe(const char* t) {
  size_t n = strlen(t);
  if (n == 0 || n > 20) return false;
  for (size_t i = 0; i < n; i++) {
    char c = t[i];
    if (!((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '-' || c == '_')) return false;
  }
  return true;
}

void xuLyDongUno(char* d) {
  Serial.printf("[Uno] %s\n", d);
  char banSao[200];
  strncpy(banSao, d, sizeof banSao - 1); banSao[sizeof banSao - 1] = '\0';
  LoaiSuKien loai = chuyenDong(banSao, json, sizeof json);
  if (loai == SK_KHONG_HOP_LE) return;   // dòng chữ thường của Serial Monitor: bỏ qua
  guiGhiDe("hien_tai", json);
  if (loai == SK_KET_QUA) guiThemMoi("nhat_ky", json);
}

void setup() {
  Serial.begin(115200);
  Serial2.begin(TOC_DO_UNO, SERIAL_8N1, CHAN_RX_TU_UNO, -1);   // chỉ nhận, không gửi ngược về Uno
  pinMode(CHAN_BAO_MANG, OUTPUT);
  digitalWrite(CHAN_BAO_MANG, HIGH);       // CAO = chưa nối Internet
  pinMode(LED_BUILTIN, OUTPUT);
  if (!tenMayHopLe(MAY_ID)) Serial.println("CANH BAO: MAY_ID chi gom chu thuong khong dau, so, - hoac _ (toi da 20 ky tu)");
  batDauMang();
  Serial.println("Cau noi Internet san sang. Cho du lieu tu Arduino Uno...");
}

void loop() {
  // 1) Dòng kết quả từ Uno
  while (Serial2.available()) {
    char c = Serial2.read();
    if (c == '\r') continue;
    if (c == '\n') {
      if (doDai > 0) { dongUno[doDai] = '\0'; xuLyDongUno(dongUno); doDai = 0; }
    } else if (doDai < sizeof dongUno - 1) dongUno[doDai++] = c;
    else doDai = 0;                                   // dòng quá dài: bỏ
  }
  // Thử không cần Uno: gõ một dòng vào Serial Monitor (115200), ví dụ:  CHO
  while (Serial.available()) {
    static char go[200]; static uint16_t n = 0;
    char c = Serial.read();
    if (c == '\r') continue;
    if (c == '\n') { if (n) { go[n] = '\0'; xuLyDongUno(go); n = 0; } }
    else if (n < sizeof go - 1) go[n++] = c;
  }
  // 2) Báo trạng thái cho Uno + đèn trên mạch
  bool sanSang = trangThaiMang() == MANG_SAN_SANG;
  digitalWrite(CHAN_BAO_MANG, sanSang ? LOW : HIGH);
  digitalWrite(LED_BUILTIN, sanSang ? HIGH : ((millis() / 250) % 2));   // sáng = đã nối; nháy = đang nối
  delay(5);
}
