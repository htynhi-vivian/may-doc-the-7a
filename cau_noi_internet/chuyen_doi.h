/* ============================================================
 * CHUYỂN DÒNG TỪ ARDUINO UNO -> JSON CHO FIREBASE
 * Uno gửi mỗi sự kiện một dòng, các trường cách nhau bằng TAB:
 *   KQ  <ma> <cong_thuc> <ten> <nguyen_tu> <nguyen_to> <phan_loai> <klpt> <dem>
 *   LG  <cong_thuc> <so_the> <ma>
 *   LOI <dong1> <dong2> <ma>
 *   CHO
 * JSON tạo ra giống hệt bản ESP32-CAM, nên trang web dùng chung.
 * ESP32 KHÔNG suy luận lại: mọi kết luận do Arduino Uno đưa ra.
 * (Tệp này là C++ thuần, chạy được cả trên máy tính để kiểm thử.)
 * ============================================================ */
#pragma once
#include <string.h>
#include <stdio.h>
#include <stdlib.h>

enum LoaiSuKien { SK_KHONG_HOP_LE, SK_KET_QUA, SK_LAP_GHEP, SK_LOI, SK_CHO };

static int cdJsonChuoi(char* ra, int con, const char* s) {
  int p = 0;
  if (con < 3) return 0;
  ra[p++] = '"';
  for (; *s && p < con - 3; s++) {
    unsigned char c = (unsigned char)*s;
    if (c == '"' || c == '\\') { if (p >= con - 4) break; ra[p++] = '\\'; ra[p++] = c; }
    else if (c < 0x20) { }
    else ra[p++] = c;
  }
  ra[p++] = '"'; ra[p] = '\0';
  return p;
}

// Tách dòng theo TAB (sửa trực tiếp chuỗi), trả về số trường
static int cdTach(char* dong, char** truong, int toiDa) {
  int n = 0;
  char* p = dong;
  while (n < toiDa) {
    truong[n++] = p;
    char* tab = strchr(p, '\t');
    if (!tab) break;
    *tab = '\0';
    p = tab + 1;
  }
  return n;
}

static bool cdLaSo(const char* s) {
  if (!*s) return false;
  for (; *s; s++) if ((*s < '0' || *s > '9') && *s != '.') return false;
  return true;
}

// dong: một dòng (đã bỏ \r\n). Ghi JSON vào ra. Trả về loại sự kiện.
static LoaiSuKien chuyenDong(char* dong, char* ra, int con) {
  char* t[10];
  int n = cdTach(dong, t, 10);
  if (n == 1 && strcmp(t[0], "CHO") == 0) {
    snprintf(ra, con, "{\"loai\":\"cho\",\"luc\":{\".sv\":\"timestamp\"}}");
    return SK_CHO;
  }
  if (n == 9 && strcmp(t[0], "KQ") == 0) {
    const char* pl = t[6];
    bool hopLe = !strcmp(pl, "kl") || !strcmp(pl, "pk") || !strcmp(pl, "cht") || !strcmp(pl, "kh") || !strcmp(pl, "ion");
    if (!hopLe || !cdLaSo(t[4]) || !cdLaSo(t[5]) || !cdLaSo(t[7]) || !cdLaSo(t[8])) return SK_KHONG_HOP_LE;
    int soNguyenTo = atoi(t[5]);
    const char* hat = !strcmp(pl, "ion") ? "CAC ION" : !strcmp(pl, "cht") ? "PHAN TU" : "NGUYEN TU";
    const char* ketLuan = !strcmp(pl, "ion") ? "HOP CHAT ION" : soNguyenTo == 1 ? "DON CHAT" : "HOP CHAT";
    const char* man4a = soNguyenTo == 1 ? "Don chat:" : "Lien ket:";
    const char* man4b = soNguyenTo == 1 ? (!strcmp(pl, "kl") ? "KIM LOAI" : !strcmp(pl, "kh") ? "KHI HIEM" : "PHI KIM")
                                        : (!strcmp(pl, "ion") ? "ION (KL + PK)" : "CONG HOA TRI");
    char bMa[96], bCt[56], bTen[48];
    cdJsonChuoi(bMa, sizeof bMa, t[1]); cdJsonChuoi(bCt, sizeof bCt, t[2]); cdJsonChuoi(bTen, sizeof bTen, t[3]);
    snprintf(ra, con,
      "{\"loai\":\"ket_qua\",\"ma\":%s,\"cong_thuc\":%s,\"ten\":%s,\"nguyen_tu\":%d,\"nguyen_to\":%d,"
      "\"hat\":\"%s\",\"ket_luan\":\"%s\",\"man4\":\"%s %s\",\"phan_loai\":\"%s\",\"klpt\":%.1f,"
      "\"dem\":%lu,\"luc\":{\".sv\":\"timestamp\"}}",
      bMa, bCt, bTen, atoi(t[4]), soNguyenTo, hat, ketLuan, man4a, man4b, pl, atof(t[7]),
      strtoul(t[8], NULL, 10));
    return SK_KET_QUA;
  }
  if (n == 4 && strcmp(t[0], "LG") == 0) {
    if (!cdLaSo(t[2])) return SK_KHONG_HOP_LE;
    char bCt[56], bMa[96];
    cdJsonChuoi(bCt, sizeof bCt, t[1]); cdJsonChuoi(bMa, sizeof bMa, t[3]);
    snprintf(ra, con, "{\"loai\":\"lap_ghep\",\"cong_thuc\":%s,\"so_the\":%d,\"ma\":%s,\"luc\":{\".sv\":\"timestamp\"}}",
             bCt, atoi(t[2]), bMa);
    return SK_LAP_GHEP;
  }
  if (n == 4 && strcmp(t[0], "LOI") == 0) {
    char b1[40], b2[40], bMa[96];
    cdJsonChuoi(b1, sizeof b1, t[1]); cdJsonChuoi(b2, sizeof b2, t[2]); cdJsonChuoi(bMa, sizeof bMa, t[3]);
    snprintf(ra, con, "{\"loai\":\"loi\",\"dong1\":%s,\"dong2\":%s,\"ma\":%s,\"luc\":{\".sv\":\"timestamp\"}}", b1, b2, bMa);
    return SK_LOI;
  }
  return SK_KHONG_HOP_LE;
}
