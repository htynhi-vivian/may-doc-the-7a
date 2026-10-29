/*
 * MÁY ĐỌC THẺ PHÂN TỬ — BẢN INTERNET TỰ ĐỘNG (Arduino Uno + GM65 + ESP32)
 * KHTN 7 · Bài 5: Phân tử – Đơn chất – Hợp chất · Bài 6: Giới thiệu về liên kết hóa học
 * Tác giả: Trí Huệ
 * ------------------------------------------------------------
 * Arduino Uno là "bộ não". Đầu đọc GM65 TỰ QUÉT (chế độ cảm ứng): đưa thẻ vào là đọc,
 * không cần bấm nút. Mỗi thẻ đọc được, Uno suy luận, hiện 5 màn trên LCD
 * (giống hệt chương trình may_doc_the_phan_tu) và TỰ GỬI kết quả sang mạch ESP32;
 * ESP32 đẩy lên Firebase, trang web của lớp hiện ngay bài lý thuyết.
 *
 * Phần cứng (xem hướng dẫn, mục Lắp mạch)
 *   GM65 (UART 9600)       TX -> D8, RX -> D9, 5V, GND
 *   LCD 1602 I2C (0x27)    SDA -> A4, SCL -> A5, 5V, GND
 *   Đèn LED RGB (mạch MKE-M22 WS2812B)  DI -> D10, 5V, GND   — báo 3 trạng thái:
 *                          XANH DƯƠNG = chưa quét (đang chờ thẻ)
 *                          VÀNG       = đã quét (vừa đọc được thẻ / đang lắp ghép, chờ thẻ tiếp hoặc thẻ XONG)
 *                          XANH LÁ    = quét xong (đã kết luận, đã gửi lên web)
 *                          ĐỎ         = thẻ lỗi (3 giây)
 *   ESP32 (qua mạch chuyển mức 3,3 V <-> 5 V)
 *                          Uno D1 (TX) -> ESP32 GPIO16 (RX2)   kết quả gửi lên web
 *                          Uno D7      <- ESP32 GPIO4          mức THẤP = đã nối Internet
 *   Uno gửi kết quả bằng cổng nối tiếp phần cứng (chân TX = D1, cùng đường với Serial Monitor),
 *   nên việc gửi không làm nhiễu việc đọc GM65. Không có ESP32: máy vẫn chạy đủ, chỉ không lên web.
 *
 * Thư viện: LiquidCrystal I2C (Frank de Brabander), Adafruit NeoPixel. Wire, SoftwareSerial có sẵn.
 *
 * Nội dung mã QR: CT:H2O|Nuoc · NT:H · LENH:XONG · LENH:XOA
 * Serial Monitor (9600, Newline): gõ các mã trên, hoặc H,H,O. Lệnh #INFO: trả lời @{"mach":"uno",...}
 * (trang web dùng lệnh này để nhận ra mạch khi cắm cáp USB).
 *
 * Máy KHÔNG tra bảng đáp án. Nó đếm nguyên tử, đếm nguyên tố, rồi áp quy tắc:
 *   1 nguyên tố -> ĐƠN CHẤT, từ 2 nguyên tố -> HỢP CHẤT;
 *   kim loại + phi kim -> liên kết ION, chỉ có phi kim -> CỘNG HÓA TRỊ
 *   (quy tắc gần đúng: NH4Cl là ngoại lệ!).
 */

#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <SoftwareSerial.h>
#if defined(__AVR__)
#include <Adafruit_NeoPixel.h>
#endif
#include <string.h>
#include <stdint.h>

/* ================= CẤU HÌNH ================= */
#define CAI_DAT_GM65  1   // 1 = khi khởi động, tự đặt chế độ quét cho GM65 (0 = giữ cài đặt sẵn của GM65)
#define CHE_DO_GM65   3   // 3 = CẢM ỨNG (đèn chiếu chỉ bật khi có thẻ đưa vào) · 2 = QUÉT LIÊN TỤC (đèn chiếu luôn sáng)
#define CHAN_MANG     7   // chân báo trạng thái Internet từ ESP32 (THẤP = đã nối)
#define CHAN_LED_RGB  10  // chân DI của mạch LED RGB WS2812B
#define DO_SANG_LED   60  // độ sáng đèn 0..255 (WS2812B rất chói, 40–80 là vừa)
const unsigned long THOI_GIAN_MOI_MAN = 2000;    // ms, mỗi màn kết quả
const unsigned long THOI_GIAN_BAO_LOI = 3000;
const unsigned long THOI_GIAN_QUEN_THE = 1500;   // ms: cùng một thẻ phải rời vùng đọc lâu hơn chừng này mới tính là lần quét mới
const unsigned long KHOANG_LANG_KET_THUC = 60;   // ms không có byte mới = hết mã

/* Kiểu dữ liệu “loại chất”. Phải khai báo Ở ĐẦU TỆP, trước mọi hàm
 * (Arduino IDE tự chèn khai báo hàm lên trước hàm đầu tiên). */
enum LoaiChat { DC_KIM_LOAI, DC_PHI_KIM_NGUYEN_TU, DC_PHI_KIM_PHAN_TU, DC_KHI_HIEM,
                HC_ION, HC_CONG_HOA_TRI };
enum CheDo { CHO_QUET, HIEN_KET_QUA, LAP_GHEP, BAO_LOI };
enum MauDen { DEN_CHUA_QUET, DEN_DA_QUET, DEN_QUET_XONG, DEN_LOI };   // màu đèn LED RGB

/* ===== ① PHẦN SUY LUẬN: đọc công thức, đếm nguyên tử và nguyên tố ===== */
static const char* const BANG_NGUYEN_TO[] = {
  "H", "He", "Li", "Be", "B",  "C",  "N",  "O",  "F",  "Ne",
  "Na", "Mg", "Al", "Si", "P", "S",  "Cl", "Ar", "K",  "Ca",
  "Cr", "Mn", "Fe", "Co", "Cu", "Zn", "Br", "Ag", "I",  "Ba",
  "Au", "Hg", "Pb"
};
#define SO_NGUYEN_TO_BIET ((int)(sizeof(BANG_NGUYEN_TO) / sizeof(BANG_NGUYEN_TO[0])))

#define LOI_KHONG      0
#define LOI_KY_HIEU_LA 1
#define LOI_CU_PHAP    2
#define LOI_RONG       3

struct KetQuaPhanTich {
  uint16_t dem[SO_NGUYEN_TO_BIET];
  uint16_t tongNguyenTu;
  uint8_t  soNguyenTo;
  uint8_t  loi;
  char     kyHieuLa[3];
};

static int timNguyenTo(const char* s, int doDai) {
  for (int i = 0; i < SO_NGUYEN_TO_BIET; i++) {
    const char* k = BANG_NGUYEN_TO[i];
    if ((int)strlen(k) == doDai && strncmp(k, s, doDai) == 0) return i;
  }
  return -1;
}

static uint16_t docChiSo(const char* s, int* i, int cuoi) {
  uint16_t n = 0;
  bool coSo = false;
  while (*i < cuoi && s[*i] >= '0' && s[*i] <= '9') {
    n = n * 10 + (s[*i] - '0');
    (*i)++;
    coSo = true;
  }
  return coSo ? n : 1;
}

static bool phanTichDoan(const char* s, int dau, int cuoi, uint16_t heSo, KetQuaPhanTich* kq) {
  int i = dau;
  while (i < cuoi) {
    char c = s[i];
    if (c == '(') {
      int muc = 1, j = i + 1;
      while (j < cuoi && muc > 0) {
        if (s[j] == '(') muc++;
        else if (s[j] == ')') muc--;
        j++;
      }
      if (muc != 0 || j - 1 == i + 1) { kq->loi = LOI_CU_PHAP; return false; }
      int k = j;
      uint16_t n = docChiSo(s, &k, cuoi);
      if (n == 0) { kq->loi = LOI_CU_PHAP; return false; }
      if (!phanTichDoan(s, i + 1, j - 1, heSo * n, kq)) return false;
      i = k;
    } else if (c >= 'A' && c <= 'Z') {
      int doDai = (i + 1 < cuoi && s[i + 1] >= 'a' && s[i + 1] <= 'z') ? 2 : 1;
      int vt = timNguyenTo(s + i, doDai);
      if (vt < 0) {
        kq->loi = LOI_KY_HIEU_LA;
        kq->kyHieuLa[0] = s[i];
        kq->kyHieuLa[1] = (doDai == 2) ? s[i + 1] : '\0';
        kq->kyHieuLa[2] = '\0';
        return false;
      }
      i += doDai;
      uint16_t n = docChiSo(s, &i, cuoi);
      if (n == 0) { kq->loi = LOI_CU_PHAP; return false; }
      kq->dem[vt] += heSo * n;
    } else {
      kq->loi = LOI_CU_PHAP;
      return false;
    }
  }
  return true;
}

static void tongKet(KetQuaPhanTich* kq) {
  kq->tongNguyenTu = 0;
  kq->soNguyenTo = 0;
  for (int i = 0; i < SO_NGUYEN_TO_BIET; i++) {
    if (kq->dem[i] > 0) {
      kq->tongNguyenTu += kq->dem[i];
      kq->soNguyenTo++;          /* mỗi nguyên tố KHÁC NHAU chỉ tính một lần */
    }
  }
}

static bool phanTichCongThuc(const char* congThuc, KetQuaPhanTich* kq) {
  memset(kq, 0, sizeof(*kq));
  int n = (int)strlen(congThuc);
  if (n == 0) { kq->loi = LOI_RONG; return false; }
  if (!phanTichDoan(congThuc, 0, n, 1, kq)) return false;
  tongKet(kq);
  if (kq->tongNguyenTu == 0) { kq->loi = LOI_RONG; return false; }
  return true;
}

static void ghepCongThuc(const uint8_t* thuTu, uint8_t soLoai, const uint16_t* dem, char* ra, int kichThuoc) {
  int p = 0;
  ra[0] = '\0';
  for (uint8_t t = 0; t < soLoai; t++) {
    const char* k = BANG_NGUYEN_TO[thuTu[t]];
    for (int c = 0; k[c] && p < kichThuoc - 1; c++) ra[p++] = k[c];
    uint16_t n = dem[thuTu[t]];
    if (n > 1) {
      char so[6];
      int m = 0;
      while (n > 0 && m < 5) { so[m++] = '0' + (n % 10); n /= 10; }
      while (m > 0 && p < kichThuoc - 1) ra[p++] = so[--m];
    }
  }
  ra[p] = '\0';
}

/* ===== ② PHẦN LIÊN KẾT: kim loại, phi kim, liên kết, khối lượng ===== */
#define PHI_KIM  0
#define KIM_LOAI 1
#define KHI_HIEM 2
const uint8_t LOAI_NGUYEN_TO[] PROGMEM = {
  0, 2, 1, 1, 0, 0, 0, 0, 0, 2,   // H  He Li Be B  C  N  O  F  Ne
  1, 1, 1, 0, 0, 0, 0, 2, 1, 1,   // Na Mg Al Si P  S  Cl Ar K  Ca
  1, 1, 1, 1, 1, 1, 0, 1, 0, 1,   // Cr Mn Fe Co Cu Zn Br Ag I  Ba
  1, 1, 1                          // Au Hg Pb
};
const float KHOI_LUONG[] PROGMEM = {
  1, 4, 7, 9, 11, 12, 14, 16, 19, 20,
  23, 24, 27, 28, 31, 32, 35.5, 40, 39, 40,
  52, 55, 56, 59, 64, 65, 80, 108, 127, 137,
  197, 201, 207
};

LoaiChat xetLoaiChat(const KetQuaPhanTich* k) {
  bool coKimLoai = false, coPhiKim = false, coKhiHiem = false;
  for (int i = 0; i < SO_NGUYEN_TO_BIET; i++) {
    if (k->dem[i] == 0) continue;
    uint8_t loai = pgm_read_byte(&LOAI_NGUYEN_TO[i]);
    if (loai == KIM_LOAI) coKimLoai = true;
    else if (loai == KHI_HIEM) coKhiHiem = true;
    else coPhiKim = true;
  }
  if (k->soNguyenTo == 1) {
    if (coKimLoai) return DC_KIM_LOAI;
    if (coKhiHiem) return DC_KHI_HIEM;
    return (k->tongNguyenTu == 1) ? DC_PHI_KIM_NGUYEN_TU : DC_PHI_KIM_PHAN_TU;
  }
  if (coKimLoai && coPhiKim) return HC_ION;
  return HC_CONG_HOA_TRI;
}

float khoiLuongPhanTu(const KetQuaPhanTich* k) {
  float m = 0;
  for (int i = 0; i < SO_NGUYEN_TO_BIET; i++)
    m += k->dem[i] * pgm_read_float(&KHOI_LUONG[i]);
  return m;
}

// Mã ngắn gửi lên web (giống trường "phan_loai" của trang Firebase)
const __FlashStringHelper* maLoaiChat(LoaiChat l) {
  switch (l) {
    case DC_KIM_LOAI: return F("kl");
    case DC_PHI_KIM_NGUYEN_TU: return F("pk");
    case DC_KHI_HIEM: return F("kh");
    case HC_ION: return F("ion");
    default: return F("cht");
  }
}


/* ===== ③ PHẦN CỨNG ===== */
LiquidCrystal_I2C lcd(0x27, 16, 2);   // không sáng chữ: thử 0x3F
SoftwareSerial mayQuet(8, 9);         // GM65: Uno nhận ở D8 (nối GM65 TX), Uno gửi ở D9 (nối GM65 RX)

byte chiSoDuoi[8][8] = {
  {0,0,0,B00100,B01100,B00100,B00100,B01110},  // 1
  {0,0,0,B01110,B00010,B01110,B01000,B01110},  // 2
  {0,0,0,B01110,B00010,B00110,B00010,B01110},  // 3
  {0,0,0,B01010,B01010,B01110,B00010,B00010},  // 4
  {0,0,0,B01110,B01000,B01110,B00010,B01110},  // 5
  {0,0,0,B01110,B01000,B01110,B01010,B01110},  // 6
  {0,0,0,B01110,B00010,B00010,B00010,B00010},  // 7
  {0,0,0,B01110,B01010,B01110,B01010,B01110},  // 8
};

/* Lệnh cài đặt GM65 (giao thức nối tiếp của hãng; "AB CD" = bỏ qua kiểm tra CRC) */
const uint8_t GM65_LUU[]     PROGMEM = {0x7E, 0x00, 0x09, 0x01, 0x00, 0x00, 0x00, 0xDE, 0xC8}; // lưu cài đặt vào bộ nhớ

/* ---------- Đèn LED RGB WS2812B (1 bóng) ----------
 * Dùng thư viện Adafruit NeoPixel. Ngắt bị tắt khoảng 30 µs mỗi lần đổi màu (không ảnh hưởng đọc thẻ). */
#if defined(__AVR__)
Adafruit_NeoPixel denRGB(1, CHAN_LED_RGB, NEO_GRB + NEO_KHZ800);
#endif
void guiMauWS2812(uint8_t r, uint8_t g, uint8_t b) {
#if defined(__AVR__)
  denRGB.setPixelColor(0, denRGB.Color(r, g, b));
  denRGB.show();
#else
  denGiaLap(r, g, b);                    // chạy thử chương trình trên máy tính (không phải Arduino)
#endif
}

MauDen denHienTai = DEN_LOI;
unsigned long tDoiXanhLa = 0;            // > 0: sắp chuyển sang xanh lá (để kịp thấy màu vàng)
void datDen(MauDen m) {
  if (m == denHienTai) return;
  denHienTai = m;
  const uint8_t s = DO_SANG_LED;
  switch (m) {
    case DEN_CHUA_QUET: guiMauWS2812(0, 0, s); break;              // xanh dương
    case DEN_DA_QUET:   guiMauWS2812(s, (uint8_t)(s * 3 / 5), 0); break;  // vàng
    case DEN_QUET_XONG: guiMauWS2812(0, s, 0); break;              // xanh lá
    case DEN_LOI:       guiMauWS2812(s, 0, 0); break;              // đỏ
  }
}

/* ---------- Trạng thái ---------- */
CheDo cheDo = CHO_QUET;
KetQuaPhanTich kq;
char congThuc[24];
char tenChat[17];
char maVuaQuet[32];
uint8_t manHinh = 0;
LoaiChat loaiChat;
const uint8_t SO_MAN_HINH = 5;
unsigned long tDoiMan = 0;
unsigned long demLanQuet = 0;

uint16_t demLapGhep[SO_NGUYEN_TO_BIET];
uint8_t  thuTu[SO_NGUYEN_TO_BIET];
uint8_t  soLoai = 0;
uint8_t  soThe = 0;

char bufQuet[32];  uint8_t lenQuet = 0;  unsigned long tByteCuoi = 0;
char bufUsb[32];   uint8_t lenUsb = 0;
uint8_t khungDem = 0, khungConLai = 0;  bool dangBoKhung = false;  // bỏ khung trả lời 0x02... của GM65
char maCuoi[32];   unsigned long tThayMaCuoi = 0;                 // chống đọc lặp khi thẻ nằm yên
bool coMang = false;            // ESP32 báo đã nối Internet
unsigned long tXemMang = 0;

/* ===== ④ GỬI LÊN WEB qua ESP32 (mỗi dòng một sự kiện, các trường cách nhau bằng TAB) =====
 * Gửi bằng Serial (chân TX = D1): Serial Monitor cũng thấy các dòng này.
 * ESP32 chỉ nhận các dòng bắt đầu bằng KQ / LG / LOI / CHO, bỏ qua các dòng khác. */
void inSach(const char* s) {                     // bỏ ký tự điều khiển để không vỡ dòng
  for (; *s; s++) Serial.write((uint8_t)*s < 0x20 ? ' ' : *s);
}
void guiKetQua() {
  Serial.print(F("KQ\t"));  inSach(maVuaQuet);
  Serial.write('\t');       inSach(congThuc);
  Serial.write('\t');       inSach(tenChat);
  Serial.write('\t');       Serial.print(kq.tongNguyenTu);
  Serial.write('\t');       Serial.print(kq.soNguyenTo);
  Serial.write('\t');       Serial.print(maLoaiChat(loaiChat));
  Serial.write('\t');       Serial.print(khoiLuongPhanTu(&kq), 1);
  Serial.write('\t');       Serial.println(demLanQuet);
}
void guiLapGhep() {
  Serial.print(F("LG\t"));  inSach(congThuc);
  Serial.write('\t');       Serial.print(soThe);
  Serial.write('\t');       inSach(maVuaQuet); Serial.println();
}
void guiLoi(const char* d1, const char* d2) {
  Serial.print(F("LOI\t")); inSach(d1);
  Serial.write('\t');       inSach(d2);
  Serial.write('\t');       inSach(maVuaQuet); Serial.println();
}
void guiCho() { Serial.println(F("CHO")); }

/* ===== ⑤ HIỂN THỊ LCD ===== */
void dong(uint8_t hang, const char* chu) {
  lcd.setCursor(0, hang);
  uint8_t n = 0;
  while (chu[n] && n < 16) { lcd.print(chu[n]); n++; }
  while (n < 16) { lcd.print(' '); n++; }
}
void dong(uint8_t hang, const __FlashStringHelper* chu) {
  const char* p = (const char*)chu;
  lcd.setCursor(0, hang);
  uint8_t n = 0;
  char c;
  while (n < 16 && (c = pgm_read_byte(p + n)) != 0) { lcd.print(c); n++; }
  while (n < 16) { lcd.print(' '); n++; }
}
void inCongThuc(uint8_t hang, const char* ct) {
  lcd.setCursor(0, hang);
  uint8_t n = 0;
  for (; ct[n] && n < 16; n++) {
    char c = ct[n];
    if (c >= '1' && c <= '8') lcd.write(byte(c - '1'));
    else lcd.print(c);
  }
  while (n < 16) { lcd.print(' '); n++; }
}

void dongCho2() { dong(1, coMang ? F("Da noi Internet") : F("KHTN7 - Bai 5, 6")); }
void manHinhCho() {
  cheDo = CHO_QUET;
  tDoiXanhLa = 0; datDen(DEN_CHUA_QUET);
  dong(0, F("  QUET THE QR"));
  dongCho2();
}

void baoLoi(const char* d1, const char* d2) {
  cheDo = BAO_LOI;
  tDoiXanhLa = 0; datDen(DEN_LOI);
  tDoiMan = millis();
  dong(0, d1);
  dong(1, d2);
  guiLoi(d1, d2);
}

void xoaLapGhep() {
  memset(demLapGhep, 0, sizeof(demLapGhep));
  soLoai = 0;
  soThe = 0;
}

void veManKetQua() {
  char s[20];
  switch (manHinh) {
    case 0:
      inCongThuc(0, congThuc);
      dong(1, tenChat);
      break;
    case 1:
      snprintf(s, sizeof(s), "So nguyen tu:%3u", (unsigned)kq.tongNguyenTu);
      dong(0, s);
      snprintf(s, sizeof(s), "So nguyen to:%3u", (unsigned)kq.soNguyenTo);
      dong(1, s);
      break;
    case 2:
      if (loaiChat == HC_ION) {
        dong(0, F("Hat: CAC ION"));
        dong(1, F("=> HOP CHAT ION"));
      } else if (loaiChat == HC_CONG_HOA_TRI || loaiChat == DC_PHI_KIM_PHAN_TU) {
        dong(0, F("Hat: PHAN TU"));
        dong(1, kq.soNguyenTo == 1 ? F("=> DON CHAT") : F("=> HOP CHAT"));
      } else {
        dong(0, F("Hat: NGUYEN TU"));
        dong(1, F("=> DON CHAT"));
      }
      break;
    case 3:
      if (kq.soNguyenTo == 1) {
        dong(0, F("Don chat:"));
        dong(1, loaiChat == DC_KIM_LOAI ? F("KIM LOAI") : loaiChat == DC_KHI_HIEM ? F("KHI HIEM") : F("PHI KIM"));
      } else {
        dong(0, F("Lien ket:"));
        dong(1, loaiChat == HC_ION ? F("ION (KL + PK)") : F("CONG HOA TRI"));
      }
      break;
    case 4:
      dong(0, F("Khoi luong:"));
      lcd.setCursor(0, 1);
      lcd.print(khoiLuongPhanTu(&kq), 1);
      lcd.print(F(" amu          "));
      break;
  }
}

void veManLapGhep() {
  char s[20];
  inCongThuc(0, congThuc);
  snprintf(s, sizeof(s), "Da quet: %u the", (unsigned)soThe);
  dong(1, s);
}

void batDauHienKetQua() {
  cheDo = HIEN_KET_QUA;
  manHinh = 0;
  loaiChat = xetLoaiChat(&kq);
  tDoiMan = millis();
  veManKetQua();
  demLanQuet++;
  guiKetQua();                         // tự gửi lên web ngay sau khi kết luận
  tDoiXanhLa = millis() + 400;         // vàng thêm 0,4 giây rồi chuyển xanh lá = quét xong
}

/* ===== ⑥ XỬ LÝ THẺ ===== */
void xuLyTheCongThuc(const char* noiDung) {
  const char* gach = strchr(noiDung, '|');
  uint8_t dai = gach ? (uint8_t)(gach - noiDung) : (uint8_t)strlen(noiDung);
  if (dai >= sizeof(congThuc)) dai = sizeof(congThuc) - 1;
  memcpy(congThuc, noiDung, dai);
  congThuc[dai] = '\0';
  if (gach) { strncpy(tenChat, gach + 1, 16); tenChat[16] = '\0'; }
  else tenChat[0] = '\0';

  xoaLapGhep();
  if (!phanTichCongThuc(congThuc, &kq)) {
    if (kq.loi == LOI_KY_HIEU_LA) {
      char s[17];
      snprintf(s, sizeof(s), "Ky hieu la: %s", kq.kyHieuLa);
      baoLoi(s, "Khong la ng.to");
    } else {
      baoLoi("Cong thuc sai", congThuc);
    }
    return;
  }
  batDauHienKetQua();
}

void themNguyenTu(const char* kyHieu) {
  int vt = timNguyenTo(kyHieu, (int)strlen(kyHieu));
  if (vt < 0) {
    char s[17];
    snprintf(s, sizeof(s), "Ky hieu la: %.3s", kyHieu);
    baoLoi(s, "Khong la ng.to");
    return;
  }
  if (cheDo != LAP_GHEP) xoaLapGhep();
  cheDo = LAP_GHEP;
  if (demLapGhep[vt] == 0) thuTu[soLoai++] = (uint8_t)vt;
  demLapGhep[vt]++;
  soThe++;
  ghepCongThuc(thuTu, soLoai, demLapGhep, congThuc, sizeof(congThuc));
  veManLapGhep();
  guiLapGhep();
}

void ketThucLapGhep() {
  if (cheDo != LAP_GHEP || soThe == 0) {
    baoLoi("Chua co the nao", "Quet the ng.tu");
    return;
  }
  memset(&kq, 0, sizeof(kq));
  memcpy(kq.dem, demLapGhep, sizeof(demLapGhep));
  tongKet(&kq);
  strcpy(tenChat, "(tu lap ghep)");
  xoaLapGhep();
  batDauHienKetQua();
}

void xuLyMa(char* s) {
  while (*s == ' ' || *s == '\r' || *s == '\n') s++;
  int n = strlen(s);
  while (n > 0 && (s[n-1] == ' ' || s[n-1] == '\r' || s[n-1] == '\n')) s[--n] = '\0';
  if (n == 0) return;
  datDen(DEN_DA_QUET);                 // vừa đọc được thẻ
  strncpy(maVuaQuet, s, sizeof(maVuaQuet) - 1);
  maVuaQuet[sizeof(maVuaQuet) - 1] = '\0';

  if (strncmp(s, "CT:", 3) == 0)            xuLyTheCongThuc(s + 3);
  else if (strncmp(s, "NT:", 3) == 0)       themNguyenTu(s + 3);
  else if (strcmp(s, "LENH:XONG") == 0)     ketThucLapGhep();
  else if (strcmp(s, "LENH:XOA") == 0)      { xoaLapGhep(); manHinhCho(); guiCho(); }
  else if (strchr(s, ',') != NULL) {
    xoaLapGhep();
    char* tok = strtok(s, ",");
    while (tok) {
      while (*tok == ' ') tok++;
      themNguyenTu(tok);
      if (cheDo == BAO_LOI) return;
      tok = strtok(NULL, ",");
    }
    ketThucLapGhep();
  }
  else baoLoi("Ma QR la", "Ngoai bo the");
}

// Mã đến từ GM65: bỏ qua khi cùng một thẻ vẫn còn nằm trong vùng đọc
void xuLyMaTuGM65(char* ma) {
  unsigned long bayGio = millis();
  if (strcmp(ma, maCuoi) == 0 && bayGio - tThayMaCuoi < THOI_GIAN_QUEN_THE) { tThayMaCuoi = bayGio; return; }
  strncpy(maCuoi, ma, sizeof(maCuoi) - 1); maCuoi[sizeof(maCuoi) - 1] = '\0';
  tThayMaCuoi = bayGio;
  xuLyMa(ma);
}

/* ===== ⑦ ĐẦU ĐỌC GM65 ===== */
void guiGM65(const uint8_t* lenh, uint8_t n) {
  for (uint8_t i = 0; i < n; i++) mayQuet.write(pgm_read_byte(lenh + i));
}

// Đọc một khung trả lời "02 00 00 <dài> <dữ liệu> <CRC 2 byte>"; trả về byte dữ liệu đầu, -1 nếu không có
int docTraLoiGM65(unsigned long choMs) {
  uint8_t b[8]; uint8_t n = 0;
  unsigned long t = millis();
  while (millis() - t < choMs && n < 7) {
    if (mayQuet.available()) {
      uint8_t c = mayQuet.read();
      if (n == 0 && c != 0x02) continue;
      b[n++] = c;
    }
  }
  if (n >= 5 && b[1] == 0x00 && b[2] == 0x00) return b[4];
  return -1;
}

// Đặt 2 bit thấp của một ô cài đặt GM65 thành `giaTri` (chỉ ghi khi khác). Trả về 1 nếu đã ghi.
uint8_t datOGM65(uint8_t o, uint8_t giaTri) {
  while (mayQuet.available()) mayQuet.read();
  uint8_t lenhDoc[9] = {0x7E, 0x00, 0x07, 0x01, 0x00, o, 0x01, 0xAB, 0xCD};
  for (uint8_t i = 0; i < 9; i++) mayQuet.write(lenhDoc[i]);
  int v = docTraLoiGM65(500);
  if (v < 0) return 0;                  // không đọc được: giữ nguyên (xem hướng dẫn: dùng mã cấu hình)
  if ((v & 0x03) == giaTri) return 0;   // đã đúng
  uint8_t moi = (uint8_t)((v & ~0x03) | giaTri);
  uint8_t lenhGhi[9] = {0x7E, 0x00, 0x08, 0x01, 0x00, o, moi, 0xAB, 0xCD};
  for (uint8_t i = 0; i < 9; i++) mayQuet.write(lenhGhi[i]);
  return docTraLoiGM65(500) < 0 ? 0 : 1;
}

// Đặt chế độ quét của GM65 (ô 0x0000: 10 = liên tục, 11 = cảm ứng) và XUẤT MÃ QUA CỔNG NỐI TIẾP (ô 0x000D = 00, không phải
// bàn phím USB — ở chế độ USB, GM65 kêu bíp nhưng Uno không nhận được gì), rồi lưu.
void caiDatGM65() {
  uint8_t daGhi = datOGM65(0x00, CHE_DO_GM65);
  daGhi |= datOGM65(0x0D, 0x00);
  if (!daGhi) return;
  guiGM65(GM65_LUU, sizeof(GM65_LUU));
  docTraLoiGM65(500);
}

// Nhận từng byte từ GM65: bỏ khung trả lời lệnh, gom mã thẻ
bool nhanByteGM65(uint8_t c) {
  if (dangBoKhung) {
    khungDem++;
    if (khungDem == 3) khungConLai = c + 2;           // độ dài dữ liệu + 2 byte CRC
    else if (khungDem > 3 && --khungConLai == 0) dangBoKhung = false;
    return false;
  }
  if (lenQuet == 0 && c == 0x02) { dangBoKhung = true; khungDem = 0; return false; }
  tByteCuoi = millis();
  if (c == '\r' || c == '\n') return lenQuet > 0;
  if (lenQuet < sizeof(bufQuet) - 1) bufQuet[lenQuet++] = (char)c;
  return false;
}

/* ===== ⑧ CHƯƠNG TRÌNH CHÍNH ===== */
void setup() {
  Serial.begin(9600);                      // Serial Monitor + gửi sang ESP32 (chân D1)
  pinMode(CHAN_MANG, INPUT_PULLUP);        // không có ESP32 -> mức CAO -> "chưa nối mạng"
#if defined(__AVR__)
  denRGB.begin();
#endif
  datDen(DEN_DA_QUET);           // vàng trong lúc khởi động
  mayQuet.begin(9600);
  lcd.init();
  lcd.backlight();
  for (uint8_t i = 0; i < 8; i++) lcd.createChar(i, chiSoDuoi[i]);
  dong(0, F("May doc the QR")); dong(1, F("Dang khoi dong.."));
  delay(800);                              // chờ GM65 khởi động
#if CAI_DAT_GM65
  caiDatGM65();
#endif
  coMang = digitalRead(CHAN_MANG) == LOW;
  manHinhCho();
  guiCho();
}

void loop() {
  // 1) Đầu đọc GM65 (tự quét)
  while (mayQuet.available()) {
    if (nhanByteGM65((uint8_t)mayQuet.read())) { bufQuet[lenQuet] = '\0'; lenQuet = 0; xuLyMaTuGM65(bufQuet); }
  }
  if (lenQuet > 0 && millis() - tByteCuoi > KHOANG_LANG_KET_THUC) {
    bufQuet[lenQuet] = '\0'; lenQuet = 0; xuLyMaTuGM65(bufQuet);
  }

  // 2) Serial Monitor: gõ mã để thử không cần thẻ
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\r' || c == '\n') {
      if (lenUsb > 0) {
        bufUsb[lenUsb] = '\0'; lenUsb = 0;
        if (bufUsb[0] == '#') {                // lệnh của trang web (#INFO): báo đây là mạch Uno
          Serial.print(F("@{\"loai\":\"info\",\"mach\":\"uno\",\"phien_ban\":\"uno-gm65-1.2\",\"mang\":"));
          Serial.println(coMang ? F("true}") : F("false}"));
        } else xuLyMa(bufUsb);
      }
    } else if (lenUsb < sizeof(bufUsb) - 1) {
      bufUsb[lenUsb++] = c;
    }
  }

  // 3) Trạng thái Internet (ESP32 kéo chân D7 xuống THẤP khi đã nối Firebase)
  if (millis() - tXemMang > 1000) {
    tXemMang = millis();
    bool m = digitalRead(CHAN_MANG) == LOW;
    if (m != coMang) { coMang = m; if (cheDo == CHO_QUET) dongCho2(); }
  }

  // 4) Đèn: vàng -> xanh lá khi đã kết luận xong
  if (tDoiXanhLa && (long)(millis() - tDoiXanhLa) >= 0) { tDoiXanhLa = 0; if (cheDo == HIEN_KET_QUA) datDen(DEN_QUET_XONG); }

  // 5) Luân phiên màn kết quả / hết thời gian báo lỗi
  if (cheDo == HIEN_KET_QUA && millis() - tDoiMan >= THOI_GIAN_MOI_MAN) {
    manHinh = (manHinh + 1) % SO_MAN_HINH;
    tDoiMan = millis();
    veManKetQua();
  }
  if (cheDo == BAO_LOI && millis() - tDoiMan >= THOI_GIAN_BAO_LOI) {
    manHinhCho();
  }
}
