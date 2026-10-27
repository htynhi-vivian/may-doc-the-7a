# KC-REPORT-20261024-012 · Máy đọc thẻ bản TỰ ĐỘNG: bỏ nút quét, tự gửi web, thêm đèn LED RGB 3 trạng thái

## 1. Thông tin báo cáo và mốc đối chiếu

| Mục | Nội dung |
|---|---|
| Mã báo cáo | KC-REPORT-20261024-012 (cha: KC-REPORT-20260923-001; thay thế thiết kế của KC-REPORT-20261024-011) |
| Ngày | 26/10/2026 |
| Người yêu cầu | Trí Huệ |
| Bên thực hiện | Claude |
| Yêu cầu (nguyên văn) | “Bỏ qua nút quét và quét tự động, sau khi quét sẽ tự động gởi thông tin trên trang web của firebase” · “Thêm bóng LED RGB đổi màu cho 3 trạng thái chưa quét, đã quét, quét xong” · “hinh vẽ linh kiện thật” |
| Mốc đối chiếu | Bản bấm nút KC-011 (`may_doc_the_internet.ino` ngày 24/10, lưu bản sao); web Firebase KC-010 |
| Kết luận kỳ | **ĐẠT MỘT PHẦN**: biên dịch, giả lập trên máy tính và chạy tệp .elf trên chip giả lập đều đạt; phần cứng thật và Firebase thật CHƯA XÁC MINH |

## 2. Tóm tắt cho người quản lý

- **FACT:** máy không còn nút. GM65 quét liên tục; mỗi thẻ đọc được, Uno suy luận, hiện LCD và **tự gửi** lên Firebase qua ESP32.
- **FACT:** thêm đèn **MKE-M22 WS2812B** (Hshop, 35.000đ): 🔵 chưa quét · 🟡 đã quét · 🟢 quét xong · 🔴 thẻ lỗi.
- **FACT:** sơ đồ chân mới: GM65 D8/D9, đèn D10, Uno D1 (TX) → ESP32 GPIO16, ESP32 GPIO4 → Uno D7.
- **FACT:** trang web bỏ khối “Điều khiển máy từ xa” và quy tắc `lenh`.
- **FACT:** đơn Hshop 02 bộ: **2.694.000đ** (bỏ nút −20.000đ, thêm 2 đèn +70.000đ).
- **FACT:** đã vẽ lại H1, H2 và **H3 lắp mạch bằng linh kiện thật**.
- **NOT_DONE:** chưa chạy trên linh kiện thật; chưa nối Firebase thật.

## 3. Hiện trạng tổng thể

| Thành phần | Thiết kế | Đã viết | Đã kiểm thử | Phần cứng / dịch vụ thật |
|---|---|---|---|---|
| `may_doc_the_internet.ino` (Uno, tự động + LED) | ✓ | ✓ | ✓ biên dịch; giả lập 24/24; simavr 9/9 | CHƯA XÁC MINH |
| `cau_noi_internet` (ESP32, chỉ nhận) | ✓ | ✓ | ✓ biên dịch 78 %; JSON 64/64 | CHƯA XÁC MINH |
| Trang web (bỏ điều khiển từ xa) | ✓ | ✓ | ✓ Chromium 21/21 | CHƯA XÁC MINH |
| Đơn hàng Hshop + trang “Lap day” | ✓ | ✓ | ✓ tính lại, 0 lỗi | N/A |
| Hình H1–H3 | ✓ | ✓ | ✓ xem bằng mắt | N/A |
| `HUONG_DAN_UNO_GM65_TU_DONG.md` | ✓ | ✓ | N/A | N/A |

## 4. Công việc và thay đổi

```
thẻ ─► GM65 (liên tục) ─D8/D9─► UNO ─A4/A5─► LCD
                                 │ D10 ─► LED WS2812B
                                 │ D1 TX ─► chuyển mức ─► ESP32 GPIO16 ─► Firebase ─► web
                                 │ D7 ◄─ chuyển mức ◄─ ESP32 GPIO4 (THẤP = online)
```

- **DECISION:** GM65 chuyển sang **quét liên tục**. Lúc khởi động, Uno đọc ô 0x0000, đặt 2 bit chế độ = `10`, rồi lưu (`7E 00 09 01 00 00 00 DE C8`). Phương án dự phòng: tờ mã cấu hình “Continuous”.
- **DECISION:** chống gửi trùng. Cùng một mã còn thấy trong 1 500 ms thì bỏ qua; rút thẻ quá 1,5 giây thì tính là lần mới; thẻ khác thì tính ngay.
- **DECISION:** Uno gửi sang ESP32 bằng **Serial phần cứng (D1)**, không dùng SoftwareSerial thứ hai.
  - Lý do: SoftwareSerial chỉ nghe được một cổng, và lúc gửi thì tắt ngắt.
  - Hệ quả: Serial Monitor thấy luôn các dòng `KQ`, `LG`, `LOI`, `CHO`. ESP32 bỏ qua các dòng khác.
- **DECISION:** đèn WS2812B điều khiển bằng hợp ngữ AVR ngắn (16 MHz), không cần thư viện. Byte theo thứ tự GRB; độ sáng `DO_SANG_LED 60`.
- **DECISION:** màu đèn theo trạng thái:
  - màn chờ: xanh dương;
  - vừa đọc thẻ hoặc đang lắp ghép: vàng;
  - 0,4 giây sau khi có kết quả: xanh lá;
  - lỗi: đỏ 3 giây.
- **DECISION:** ESP32 bỏ hẳn việc đọc lệnh `/may/{id}/lenh` mỗi 2 giây (PHIEN_BAN `uno-gm65-1.1`). Web bỏ khối điều khiển, quy tắc `lenh` và phần giả lập lệnh.
- **DECISION:** bản sao bản bấm nút được giữ trong gói KC-011, không xóa.

## 5. Đối chiếu bộ quy tắc thiết kế

| Quy tắc | Đối chiếu |
|---|---|
| Kết luận không dùng học máy | ĐẠT: khối ①–② giữ nguyên văn |
| Tách tri giác và suy luận | ĐẠT: GM65 là tri giác, Uno suy luận, ESP32 chỉ truyền tin |
| Học sinh thấy rõ máy đang làm gì | ĐẠT: đèn 3 trạng thái + LCD + web |
| Không phải trả phí dịch vụ | ĐẠT: Firebase gói Spark |
| An toàn điện | ĐẠT: chuyển mức cho ESP32; chỉnh 5,0 V trước khi nối; tháo 1 pin khi cắm USB |

## 6. Kiểm thử, bằng chứng, giới hạn

| Kiểm thử | Kết quả |
|---|---|
| Biên dịch Uno (arduino-cli, AVR 1.8.6, avr-gcc 7.3) | PASS, 0 cảnh báo sketch. 15 392 B flash (47 %), 1 384 B RAM (67 %) |
| Biên dịch ESP32 (esp32 3.3.12, NodeMCU-32S) | PASS, 78 % flash |
| Giả lập trên máy tính (stub Arduino, GM65 giả, ESP32 giả, đo màu đèn) | PASS 24/24 |
| simavr: chạy đúng .elf trên ATmega328P 16 MHz, bơm UART 9600 vào PB0 (D8), đọc UART0 TX, giải mã WS2812 ở PB2 (D10) | PASS 9/9; 9 khung đèn, đủ 24 bit |
| Thời gian xung WS2812 trong simavr | T0H 0,312 µs; T1H 0,812 µs; chu kỳ 1,25 µs: trong chuẩn |
| JSON Uno → ESP32 so với bản ESP32-CAM | PASS 64/64 |
| Web Chromium + khởi động SDK Firebase | PASS 21/21, 0 lỗi JS; init PASS |
| Đơn hàng xlsx, tính lại bằng LibreOffice | PASS, 0 lỗi; tổng 2.694.000đ |
| Phần cứng thật, Firebase thật | NOT_RUN |

**Giới hạn và giả định:**
- **ASSUMPTION:** lệnh GM65 (đọc, ghi, lưu) và nghĩa bit chế độ lấy theo tài liệu hãng, chưa thử trên GM65 thật.
- **ASSUMPTION:** mạch MKE-M22 dùng chip WS2812B (GRB) và nhận mức 5 V ở DI.
- **FACT:** hợp ngữ WS2812 mới chỉ được kiểm trên chip giả lập.
- **FACT:** chân D1 vừa là Serial Monitor vừa là đường gửi sang ESP32. Khi nạp code, ESP32 nhận vài byte rác và bỏ qua.

## 7. Trạng thái GitHub – triển khai – production

N/A: không có repository. Trang web chưa deploy; cần dự án Firebase của thầy.

## 8. Tồn đọng, rủi ro, quyết định cần chốt

| Loại | Nội dung |
|---|---|
| Rủi ro | GM65 không nhận lệnh cài đặt. Xử lý: quét mã cấu hình “Continuous” một lần |
| Rủi ro | Thẻ đặt nghiêng có thể bị đọc chập chờn và tính hai lần. Xử lý: tăng `THOI_GIAN_QUEN_THE` |
| Rủi ro | Đèn sai màu nếu mạch không phải GRB: đổi thứ tự byte trong `guiMauWS2812` |
| Cần chốt | Tạo dự án Firebase của lớp (KC-010 mục 10) để có link web |

## 9. Hồ sơ, lịch sử, bản sao

| Tệp | Nội dung |
|---|---|
| `May_doc_the_Uno_GM65_Tu_dong.zip` | Firmware Uno, ESP32, web, kiểm thử (gồm simavr), hình H1–H3 + mã nguồn hình, đơn hàng, 2 hướng dẫn, báo cáo này |
| `Don_hang_Hshop_02_bo_Uno_GM65_Tu_dong.xlsx` | 17 dòng, link Hshop, trang “Lap day” với chân mới và hình H2, H3 |
| Project doc `claude/may-doc-the-uno-gm65-tu-dong.md` | Bản hướng dẫn |
| Project doc `claude/bao-cao-kc-20261024-012-uno-gm65-tu-dong.md` | Báo cáo này |
| Bản bấm nút (KC-011) | Giữ nguyên trong `May_doc_the_Uno_GM65_Internet.zip` |

## 10. Bàn giao và duy nhất một hành động kế tiếp

**Hành động kế tiếp:** gửi đơn Hshop bản tự động. Khi hàng về, lắp 1 bộ và chạy bảng kiểm mục 10 của hướng dẫn (8 bước). Ghi PASS/FAIL, nhất là bước 1 (đèn xanh dương, GM65 tự quét) và bước 2 (vàng → xanh lá).

Trạng thái giao việc: WAITING_FOR_ASSIGNMENT.

## 11. Khối YAML

```yaml
KC_CODEX_REPORT:
  report_id: KC-REPORT-20261024-012
  parent: KC-REPORT-20260923-001
  supersedes_design_of: KC-REPORT-20261024-011
  date: 2026-10-26
  period_conclusion: DAT_MOT_PHAN
  product: May doc the phan tu ban tu dong (Arduino Uno + GM65 continuous + WS2812B RGB LED + ESP32 NodeMCU-32S)
  kits: 2
  vendor: Hshop
  order_total_vnd: 2694000
  order_changes: {removed: "Mach 1 nut nhan (-20000)", added: "MKE-M22 WS2812B x2 (+70000)"}
  order_estimated_lines: [cap USB-B]
  firmware_uno:
    file: may_doc_the_internet.ino
    flash: "15392 B (47%)"
    ram: "1384 B (67%)"
    pins: {gm65: [D8, D9], rgb_led_di: D10, esp32_tx: D1, net_status: D7, lcd_i2c: [A4, A5]}
    gm65_mode: continuous (auto-set at boot, zone 0x0000 bits1..0=10, save DEC8)
    dedup_ms: 1500
    led_states: {chua_quet: blue, da_quet: yellow, quet_xong: green, loi: red_3s}
    ws2812_timing_sim: {t0h_us: 0.312, t1h_us: 0.812, period_us: 1.25}
  firmware_esp32:
    file: cau_noi_internet.ino
    version: uno-gm65-1.1
    board: esp32:esp32:nodemcu-32s
    flash_percent: 78
    role: receive-only bridge, JSON identical to ESP32-CAM version
  web: {remote_control_removed: true, rule_lenh_removed: true}
  tests:
    avr_compile: PASS
    esp32_compile: PASS
    uno_host_simulation: "24/24"
    simavr_end_to_end: "9/9"
    json_parity_vs_esp32cam: "64/64"
    web_chromium: "21/21"
    real_hardware: NOT_RUN
    real_firebase: NOT_RUN
  next_action: order from Hshop, assemble one kit, run guide section 10 checklist (8 steps)
  assignment_status: WAITING_FOR_ASSIGNMENT
```
