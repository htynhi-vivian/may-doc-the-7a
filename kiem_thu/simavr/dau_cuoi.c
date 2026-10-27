// KIỂM THỬ ĐẦU-CUỐI trên firmware Uno THẬT (.elf) chạy trong mô phỏng ATmega328P 16 MHz (simavr):
// GM65 giả gửi mã thẻ vào chân D8 (9600 baud, như GM65 thật) -> đọc những gì Uno gửi ra TX (D1, sang ESP32)
// và giải mã màu đèn WS2812B ở chân D10.
#include <stdio.h>
#include <string.h>
#include <simavr/sim_avr.h>
#include <simavr/sim_elf.h>
#include <simavr/avr_ioport.h>
#include <simavr/avr_uart.h>
static avr_t* avr; static avr_irq_t* rxPin;
static char tx[8192]; static int ntx = 0;
static void khiUart(struct avr_irq_t* irq, uint32_t v, void* p) { if (ntx < 8191) tx[ntx++] = (char)v; }
// ---- đèn ----
static uint64_t te[200000]; static int ve[200000], ne = 0;
static void khiDen(struct avr_irq_t* irq, uint32_t v, void* p) { if (ne && ve[ne-1] == (int)v) return; if (ne < 200000) { te[ne] = avr->cycle; ve[ne] = v; ne++; } }
// ---- GM65 giả: hàng đợi bit ----
static uint8_t q[4096]; static int nq = 0, iq = 0;
static void themByte(uint8_t b) { q[nq++] = 0; for (int i = 0; i < 8; i++) q[nq++] = (b >> i) & 1; q[nq++] = 1; q[nq++] = 1; }
static avr_cycle_count_t guiBit(avr_t* a, avr_cycle_count_t when, void* p) {
  if (iq >= nq) { avr_raise_irq(rxPin, 1); return 0; }
  avr_raise_irq(rxPin, q[iq++]);
  return when + 1667;                       // 16 MHz / 9600 baud
}
static void chayDen(double giay) { uint64_t den = (uint64_t)(giay * 16e6); while (avr->cycle < den) { int st = avr_run(avr); if (st == cpu_Done || st == cpu_Crashed) { printf("CPU dung: %d\n", st); return; } } }
static void guiThe(const char* ma) { nq = iq = 0; for (const char* c = ma; *c; c++) themByte((uint8_t)*c); themByte('\r'); avr_cycle_timer_register(avr, 100, guiBit, NULL); }
static const char* mauLan(int k) {    // màu của khung đèn thứ k
  int i = 0, khung = 0;
  while (i < ne) {
    while (i < ne && ve[i] != 1) i++;
    if (i >= ne) break;
    unsigned long m = 0; int bits = 0;
    while (i + 1 < ne && ve[i] == 1 && ve[i+1] == 0) { m = (m << 1) | ((te[i+1] - te[i]) > 9); bits++; i += 2; if (i < ne && te[i] - te[i-1] >= 800) break; }
    if (!bits) { i++; continue; }
    if (khung++ == k) { int g = (m >> 16) & 255, r = (m >> 8) & 255, b = m & 255;
      return bits != 24 ? "LOI" : (r && g && !b) ? "VANG" : (!r && g && !b) ? "XANH LA" : (!r && !g && b) ? "XANH DUONG" : (r && !g && !b) ? "DO" : "KHAC"; }
  }
  return "-";
}
static int soKhungDen() { int c = 0; while (strcmp(mauLan(c), "-")) c++; return c; }
static int loi = 0;
static void kiem(int dk, const char* ten) { printf("  %s  %s\n", dk ? "DAT" : "SAI", ten); if (!dk) loi++; }
int main(int argc, char** argv) {
  elf_firmware_t f = {{0}}; elf_read_firmware(argv[1], &f);
  avr = avr_make_mcu_by_name("atmega328p"); avr_init(avr); avr->frequency = 16000000; avr_load_firmware(avr, &f);
  uint32_t fl = 0; avr_ioctl(avr, AVR_IOCTL_UART_GET_FLAGS('0'), &fl); fl &= ~AVR_UART_FLAG_STDIO; avr_ioctl(avr, AVR_IOCTL_UART_SET_FLAGS('0'), &fl);
  avr_irq_register_notify(avr_io_getirq(avr, AVR_IOCTL_UART_GETIRQ('0'), UART_IRQ_OUTPUT), khiUart, NULL);
  avr_irq_register_notify(avr_io_getirq(avr, AVR_IOCTL_IOPORT_GETIRQ('B'), 2), khiDen, NULL);
  rxPin = avr_io_getirq(avr, AVR_IOCTL_IOPORT_GETIRQ('B'), 0);
  avr_raise_irq(rxPin, 1);
  chayDen(3.0);
  kiem(strstr(tx, "CHO") != NULL, "khởi động: Uno gửi CHO ra TX");
  kiem(!strcmp(mauLan(soKhungDen() - 1), "XANH DUONG"), "khởi động xong: đèn XANH DƯƠNG (chưa quét)");
  ntx = 0; memset(tx, 0, sizeof tx);
  guiThe("CT:H2O|Nuoc"); chayDen(3.1);
  int k1 = soKhungDen();
  chayDen(3.6);
  kiem(strstr(tx, "KQ\tCT:H2O|Nuoc\tH2O\tNuoc\t3\t2\tcht\t18.0\t1") != NULL, "GM65 gửi CT:H2O|Nuoc vào D8 -> Uno gửi ra TX: KQ ... H2O 3 2 cht 18.0");
  kiem(!strcmp(mauLan(k1 - 1), "VANG"), "vừa đọc thẻ: đèn VÀNG");
  kiem(!strcmp(mauLan(soKhungDen() - 1), "XANH LA"), "0,4 giây sau: đèn XANH LÁ (quét xong)");
  ntx = 0; memset(tx, 0, sizeof tx);
  guiThe("CT:H2O|Nuoc"); chayDen(4.2);
  kiem(strstr(tx, "KQ") == NULL, "cùng thẻ gửi lại ngay (thẻ còn nằm trong vùng đọc) -> không gửi trùng");
  chayDen(6.0); guiThe("CT:NaCl|Sodium chloride"); chayDen(6.6);
  kiem(strstr(tx, "KQ\tCT:NaCl|Sodium chloride\tNaCl\tSodium chloride\t2\t2\tion\t58.5\t2") != NULL, "thẻ NaCl -> KQ ... ion 58.5, lần quét 2");
  guiThe("CT:Xy2"); chayDen(7.2);
  kiem(strstr(tx, "LOI\tKy hieu la: Xy\tKhong la ng.to\tCT:Xy2") != NULL && !strcmp(mauLan(soKhungDen() - 1), "DO"), "thẻ Xy2 -> LOI gửi web, đèn ĐỎ");
  chayDen(10.5);
  kiem(!strcmp(mauLan(soKhungDen() - 1), "XANH DUONG"), "hết báo lỗi: đèn XANH DƯƠNG");
  printf("\nSo khung den da giai ma: %d (tat ca 24 bit)\n", soKhungDen());
  printf(loi ? "CO %d MUC SAI\n" : "TAT CA DAT\n", loi);
  return loi;
}
