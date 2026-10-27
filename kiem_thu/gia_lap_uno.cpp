// Chạy sketch Arduino Uno (may_doc_the_internet.ino, bản tự quét) trên máy tính với GM65, ESP32, LCD giả
#include "Arduino.h"
#include "SoftwareSerial.h"
#include "LiquidCrystal_I2C.h"
unsigned long g_ms = 1000; int g_pin[32]; Stream Serial; SoftwareSerial* SoftwareSerial::nghe = nullptr;
#include "../may_doc_the_internet/may_doc_the_internet.ino"
#include "../cau_noi_internet/chuyen_doi.h"
#include <vector>
#include <iostream>
#include <fstream>
std::string mauDen = "?"; std::vector<std::string> lichSuDen;
void denGiaLap(uint8_t r, uint8_t g, uint8_t b) {
  mauDen = (r && g && !b) ? "vang" : (r && !g && !b) ? "do" : (!r && g && !b) ? "xanh_la" : (!r && !g && b) ? "xanh_duong" : "khac";
  lichSuDen.push_back(mauDen);
}

// GM65 giả: hiểu lệnh đọc / ghi / lưu ô cài đặt 0x0000
uint8_t gmVung0 = 0xD5;   // giả định ban đầu: 2 bit thấp = 01 (quét theo lệnh)
std::vector<uint8_t> gmLenh; int soLanLuu = 0;
void gmNhan(SoftwareSerial& s, uint8_t c) {
  gmLenh.push_back(c);
  if (gmLenh[0] != 0x7E) { gmLenh.clear(); return; }
  if (gmLenh.size() < 9) return;
  std::vector<uint8_t> l = gmLenh; gmLenh.clear();
  if (l[2] == 0x07) s.denTuBytes({0x02, 0x00, 0x00, 0x01, gmVung0, 0x12, 0x34});
  else if (l[2] == 0x08) { gmVung0 = l[6]; s.denTuBytes({0x02, 0, 0, 0x01, 0x00, 0x33, 0x31}); }
  else if (l[2] == 0x09) { soLanLuu++; s.denTuBytes({0x02, 0, 0, 0x01, 0x00, 0x33, 0x31}); }
}
void chay(unsigned long ms) { for (unsigned long t = 0; t < ms; t += 5) { loop(); g_ms += 5; } }
std::string lcdDong(int r) { return lcd.dong(r); }
// Các dòng Uno gửi qua TX (Serial) — ESP32 chỉ nhận dòng KQ / LG / LOI / CHO
std::vector<std::string> layDong() {
  std::vector<std::string> v; std::string& o = Serial.out; size_t p;
  while ((p = o.find('\n')) != std::string::npos) { std::string d = o.substr(0, p); o.erase(0, p + 1); if (!d.empty() && d.back() == '\r') d.pop_back(); v.push_back(d); }
  return v;
}
// Đặt thẻ trước GM65 trong `giu` ms: GM65 quét liên tục, gửi lại mã mỗi `chuKy` ms
void datThe(const std::string& ma, unsigned long giu, unsigned long chuKy = 300) {
  for (unsigned long t = 0; t < giu; t += chuKy) { mayQuet.denTu(ma + "\r"); chay(chuKy); }
}
int loi = 0;
void kiem(bool dk, const std::string& ten) { std::cout << (dk ? "  DAT  " : "  SAI  ") << ten << "\n"; if (!dk) loi++; }

int main(int argc, char** argv) {
  for (int i = 0; i < 32; i++) g_pin[i] = HIGH;
  mayQuet.khiNhan = gmNhan;
  setup();
  auto v = layDong();
  kiem((gmVung0 & 3) == 2 && soLanLuu == 1, "khởi động: đặt GM65 sang quét liên tục (0xD5 -> 0xD6) và lưu");
  kiem(v.size() == 1 && v[0] == "CHO", "khởi động: gửi CHO lên web");
  kiem(lcdDong(0) == "  QUET THE QR   " && lcdDong(1) == "KHTN7 - Bai 5, 6", "màn chờ: QUET THE QR");
  kiem(lichSuDen.size() == 2 && lichSuDen[0] == "vang" && mauDen == "xanh_duong", "đèn: vàng lúc khởi động -> XANH DƯƠNG khi chờ thẻ (chưa quét)");
  // 1. 64 công thức gõ qua Serial Monitor -> dòng KQ -> JSON
  std::ifstream ds("ds.txt"); std::ofstream ra(argc > 1 ? argv[1] : "json_uno.jsonl");
  std::string f; int dem = 0;
  while (std::getline(ds, f)) {
    if (f.empty()) continue;
    Serial.feed("CT:" + f + "|Ten \"thu\"\n"); chay(20);
    int n = 0;
    for (auto& d : layDong()) {
      char b[200]; strncpy(b, d.c_str(), 199); b[199] = 0; char j[700];
      LoaiSuKien k = chuyenDong(b, j, sizeof j);
      if (k == SK_KET_QUA || k == SK_LOI) { ra << j << "\n"; n++; }
    }
    if (n != 1) ra << "{\"thieu\":true}\n";
    dem++;
  }
  ra.close();
  kiem(dem == 64, "đã chạy 64 công thức");
  Serial.feed("LENH:XOA\n"); chay(20); layDong();
  // 1b. Màu đèn theo trạng thái
  lichSuDen.clear(); mayQuet.denTu("CT:CO2|Carbon dioxide\r"); chay(100);
  kiem(mauDen == "vang", "vừa đọc thẻ: đèn VÀNG (đã quét)");
  chay(400); kiem(mauDen == "xanh_la", "sau 0,4 s: đèn XANH LÁ (quét xong, đã gửi web)");
  chay(5000); kiem(mauDen == "xanh_la", "giữ xanh lá trong lúc LCD quay vòng 5 màn");
  chay(1600); mayQuet.denTu("NT:Na\r"); chay(1000); kiem(mauDen == "vang", "đang lắp ghép: đèn VÀNG, chờ thẻ tiếp / XONG");
  chay(1600); mayQuet.denTu("CT:Xy2\r"); chay(100); kiem(mauDen == "do", "thẻ lỗi: đèn ĐỎ");
  chay(3200); kiem(mauDen == "xanh_duong" && lcdDong(0) == "  QUET THE QR   ", "hết báo lỗi: về màn chờ, đèn XANH DƯƠNG");
  layDong();
  // 2. Thẻ nằm yên 3 giây: GM65 gửi lại mã ~10 lần -> chỉ 1 kết quả
  datThe("CT:H2O|Nuoc", 3000); v = layDong();
  kiem(v.size() == 1 && v[0].rfind("KQ\tCT:H2O|Nuoc\tH2O\tNuoc\t3\t2\tcht\t18.0\t", 0) == 0, "thẻ nằm yên 3 s -> gửi web đúng 1 lần (KQ H2O)");
  kiem(lcdDong(0).substr(0, 3) == "H2O" || lcdDong(0).rfind("So nguyen", 0) == 0 || lcdDong(0).rfind("Hat", 0) == 0, "LCD hiện kết quả H2O");
  // 3. Rút thẻ 2 giây rồi đưa lại -> lần quét mới
  chay(2000); datThe("CT:H2O|Nuoc", 600); v = layDong();
  kiem(v.size() == 1 && v[0].rfind("KQ\t", 0) == 0, "rút thẻ > 1,5 s rồi đưa lại -> tính lần quét mới");
  // 4. Lắp ghép H, H, O rồi XONG
  datThe("NT:H", 600); chay(1600); datThe("NT:H", 600); chay(1600); datThe("NT:O", 600); chay(1600); v = layDong();
  kiem(v.size() == 3 && v[0] == "LG\tH\t1\tNT:H" && v[1] == "LG\tH2\t2\tNT:H" && v[2] == "LG\tH2O\t3\tNT:O", "H, H, O (rút thẻ giữa hai lần) -> LG H, H2, H2O");
  kiem(lcdDong(1) == "Da quet: 3 the  ", "LCD: Da quet: 3 the");
  datThe("LENH:XONG", 600); v = layDong();
  kiem(v.size() == 1 && v[0].rfind("KQ\tLENH:XONG\tH2O\t(tu lap ghep)\t3\t2\tcht\t18.0\t", 0) == 0, "thẻ XONG -> KQ H2O (tu lap ghep)");
  // 5. Khung trả lời của GM65 lẫn trước mã thẻ
  chay(1600); mayQuet.denTuBytes({0x02, 0, 0, 0x01, 0x00, 0x33, 0x31}); datThe("CT:NaCl|Sodium chloride", 300); v = layDong();
  kiem(v.size() == 1 && v[0].rfind("KQ\tCT:NaCl|Sodium chloride\tNaCl\tSodium chloride\t2\t2\tion\t58.5\t", 0) == 0, "bỏ khung 02 00 00 01 00 33 31, đọc đúng NaCl (ion, 58.5)");
  // 6. Mã lạ
  chay(1600); datThe("http://abc", 300); v = layDong();
  kiem(v.size() == 1 && v[0] == "LOI\tMa QR la\tNgoai bo the\thttp://abc", "mã lạ -> LOI gửi web");
  // 7. Thẻ XÓA
  chay(1600); datThe("LENH:XOA", 300); v = layDong();
  kiem(v.size() == 1 && v[0] == "CHO" && lcdDong(0) == "  QUET THE QR   " && mauDen == "xanh_duong", "thẻ XÓA -> màn chờ, gửi CHO, đèn XANH DƯƠNG");
  // 8. Trạng thái Internet
  g_pin[CHAN_MANG] = LOW; chay(1100); kiem(lcdDong(1) == "Da noi Internet ", "ESP32 kéo D7 xuống -> LCD: Da noi Internet");
  g_pin[CHAN_MANG] = HIGH; chay(1100); kiem(lcdDong(1) == "KHTN7 - Bai 5, 6", "mất mạng -> dòng chờ cũ");
  // 9. Hai thẻ khác nhau liên tiếp, không rút thẻ -> cả hai đều được tính
  datThe("CT:O2|Oxygen", 600); datThe("CT:CO2|Carbon dioxide", 600); v = layDong();
  kiem(v.size() == 2 && v[0].find("\tO2\t") != std::string::npos && v[1].find("\tCO2\t") != std::string::npos, "đổi sang thẻ khác ngay -> tính ngay (O2 rồi CO2)");
  { char b[200]; strcpy(b, v[0].c_str()); char j[700]; chuyenDong(b, j, sizeof j);
    kiem(std::string(j).find("\"ket_luan\":\"DON CHAT\",\"man4\":\"Don chat: PHI KIM\"") != std::string::npos, "JSON: O2 -> DON CHAT, Don chat: PHI KIM"); }
  std::cout << (loi ? "\nCO " + std::to_string(loi) + " MUC SAI\n" : "\nTAT CA DAT\n");
  return loi ? 1 : 0;
}
