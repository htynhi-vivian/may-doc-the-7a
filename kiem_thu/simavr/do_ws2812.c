// Chạy firmware Uno THẬT (file .elf) trên mô phỏng ATmega328P 16 MHz (simavr),
// ghi lại sườn lên/xuống của chân D10 (PB2) để đo xung WS2812B và giải mã màu.
#include <stdio.h>
#include <stdlib.h>
#include <simavr/sim_avr.h>
#include <simavr/sim_elf.h>
#include <simavr/avr_ioport.h>
static avr_t* avr;
#define MAXE 4000
static uint64_t t[MAXE]; static int v[MAXE], n = 0;
static void khiDoi(struct avr_irq_t* irq, uint32_t value, void* p) { if (n > 0 && v[n - 1] == (int)value) return; if (n < MAXE) { t[n] = avr->cycle; v[n] = value; n++; } }
int main(int argc, char** argv) {
  elf_firmware_t f = {{0}};
  if (elf_read_firmware(argv[1], &f)) { printf("khong doc duoc elf\n"); return 1; }
  avr = avr_make_mcu_by_name("atmega328p"); avr_init(avr); avr->frequency = 16000000; avr_load_firmware(avr, &f);
  avr_irq_register_notify(avr_io_getirq(avr, AVR_IOCTL_IOPORT_GETIRQ('B'), 2), khiDoi, NULL);
  uint64_t gioiHan = 16000000ULL * 4;                       // chạy 4 giây đầu: vàng lúc khởi động, rồi xanh dương ở màn chờ
  int st = 0; while (avr->cycle < gioiHan) { st = avr_run(avr); if (st == cpu_Done || st == cpu_Crashed) break; }
  printf("Dung o chu ky %llu (%.2f s), trang thai %d\n", (unsigned long long)avr->cycle, avr->cycle / 16e6, st);

  // Tách các khung: khoảng lặng > 50 µs (800 chu kỳ) giữa các khung
  int i = 0, khung = 0, loi = 0;
  while (i < n) {
    while (i < n && v[i] != 1) i++;
    if (i >= n) break;
    int bits = 0; unsigned long mau = 0; int minCao = 99, maxCao = 0, minChuKy = 99, maxChuKy = 0;
    while (i + 1 < n && v[i] == 1 && v[i + 1] == 0) {
      int cao = (int)(t[i + 1] - t[i]);
      if (i + 2 < n && v[i + 2] == 1 && t[i + 2] - t[i + 1] < 800) { int ck = (int)(t[i + 2] - t[i]); if (ck < minChuKy) minChuKy = ck; if (ck > maxChuKy) maxChuKy = ck; }
      if (cao < minCao) minCao = cao; if (cao > maxCao) maxCao = cao;
      mau = (mau << 1) | (cao > 9 ? 1 : 0); bits++;
      i += 2;
      if (i < n && t[i] - t[i - 1] >= 800) break;
    }
    if (bits == 0) { i++; continue; }
    khung++;
    printf("Khung %d: %d bit, G=%lu R=%lu B=%lu | thoi gian muc cao %d..%d chu ky (%.3f..%.3f us) | chu ky bit %d..%d (%.3f..%.3f us)\n",
      khung, bits, (mau >> 16) & 255, (mau >> 8) & 255, mau & 255, minCao, maxCao, minCao / 16.0, maxCao / 16.0, minChuKy, maxChuKy, minChuKy / 16.0, maxChuKy / 16.0);
    if (bits != 24) loi++;
  }
  printf("So khung: %d, loi: %d\n", khung, loi);
  return loi ? 1 : 0;
}
