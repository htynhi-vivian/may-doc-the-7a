# Máy đọc thẻ phân tử — bản TỰ ĐỘNG (Arduino Uno + GM65 + đèn LED RGB + ESP32)

KHTN 7 · Bài 5 (Phân tử – Đơn chất – Hợp chất) · Bài 6 (Liên kết hóa học) · Tác giả: Trí Huệ · Cập nhật 26/10/2026

Bản này thay bản "bấm nút" ngày 24/10/2026. Máy **không còn nút quét**: đưa thẻ vào là đọc, đọc xong **tự gửi lên trang web Firebase**. Một **đèn LED RGB** đổi màu cho học sinh biết máy đang ở bước nào.

## 1. Máy làm được gì

- **Tự quét.** GM65 quét liên tục. Học sinh đưa thẻ QR trước đầu đọc, máy kêu bíp và đọc ngay.
- **Uno tự suy luận.** Uno đếm nguyên tử, đếm nguyên tố, kết luận đơn chất / hợp chất, liên kết ion / cộng hóa trị. LCD hiện 5 màn kết quả, giống chương trình `may_doc_the_phan_tu`.
- **Tự gửi lên web.** Mỗi kết quả được Uno gửi sang ESP32, ESP32 đẩy lên Firebase. Trang web của lớp hiện ngay bài lý thuyết, hình 3D, nhật ký và kết quả của mọi nhóm (chế độ **Cả lớp**).
- **Đèn báo 3 trạng thái** (thêm màu đỏ khi thẻ lỗi):

| Màu đèn | Trạng thái | Khi nào |
|---|---|---|
| 🔵 **Xanh dương** | **Chưa quét** | Máy đang chờ thẻ (sau khi bật, sau khi XÓA, sau khi hết báo lỗi) |
| 🟡 **Vàng** | **Đã quét** | Vừa đọc được thẻ; hoặc đang lắp ghép, chờ thẻ nguyên tử tiếp theo hay thẻ XONG |
| 🟢 **Xanh lá** | **Quét xong** | Đã kết luận và đã gửi lên web (khoảng 0,4 giây sau khi đọc thẻ) |
| 🔴 Đỏ | Thẻ lỗi | Mã lạ hoặc công thức sai; đỏ 3 giây rồi về xanh dương |

```
  thẻ QR ─► GM65 (tự quét) ─UART─► UNO ─I2C─► LCD
                                   │ D10 ─► đèn LED RGB
                                   │ D1 (TX) ──► chuyển mức ──► ESP32 GPIO16 ─WiFi─► Firebase ─► trang web
                                   │ D7 ◄── chuyển mức ◄── ESP32 GPIO4 (THẤP = đã nối Internet)
```

## 2. Gói bàn giao

| Thư mục / tệp | Nội dung |
|---|---|
| `may_doc_the_internet/` | Chương trình Arduino Uno (bản tự động, có đèn LED RGB) |
| `cau_noi_internet/` | Chương trình ESP32 NodeMCU-32S làm cầu nối Internet. Sửa `cau_hinh.h` |
| `firebase_web/` | Trang web Firebase (đã bỏ khối "Điều khiển từ xa") và `database.rules.json` |
| `kiem_thu/` | Giả lập trên máy tính (`gia_lap_uno.cpp`), kiểm thử trên chip giả lập `simavr/` |
| `hinh/` | H1 sơ đồ khối, H2 sơ đồ nối dây, H3 lắp mạch bằng linh kiện thật; `nguon/` là mã vẽ hình |
| `Don_hang_Hshop_02_bo_Uno_GM65_Tu_dong.xlsx` | Đơn hàng Hshop 02 bộ, có trang "Lap day" |

## 3. Linh kiện mỗi bộ (mua ở Hshop)

| Linh kiện | SL/bộ | Ghi chú |
|---|---|---|
| Mạch Uno SMD CH340 + cáp USB-B | 1 | Bộ não |
| Module quét mã GM65 | 1 | Tự quét liên tục |
| LCD 1602 + mạch I2C | 1 | Địa chỉ 0x27 (hoặc 0x3F) |
| **Mạch LED đổi màu MKE-M22 WS2812B** | 1 | **Mới.** Kèm cáp 3 chân. Thay cho nút nhấn |
| ESP32 NodeMCU-32S + cáp micro USB | 1 | Cầu nối Internet |
| Mạch chuyển mức 3,3/5 V 4 kênh | 1 | Dùng 2 kênh |
| Hộp pin 2×18650 + 2 pin 18650 | 1 + 2 | 7,4 V |
| Mạch giảm áp LM2596 có đồng hồ | 1 | Chỉnh ra 5,0 V |
| Breadboard 400 lỗ, dây cắm | 1 | Dây dùng chung cho 2 bộ |

Đơn hàng 02 bộ: **17 dòng, 2.694.000đ** (chưa gồm phí giao). So với bản bấm nút: bỏ nút nhấn (−20.000đ), thêm 2 đèn LED RGB (+70.000đ). Dòng cáp USB-B là giá tạm tính.

## 4. Lắp mạch

Xem **H3** (`hinh/h3_lap_mach_that.png`) để thấy dây nối trên linh kiện thật, và **H2** để dò từng chân.

### 4.1. Nguồn: làm trước, khi chưa nối gì khác

1. Lắp 2 pin vào hộp, nối dây đỏ vào **IN+**, dây đen vào **IN−** của LM2596.
2. Vặn biến trở trên LM2596 đến khi đồng hồ hiện **5,0 V** (4,9–5,1 V).
3. Nối **OUT+ / OUT−** vào hai thanh nguồn **+ / −** của breadboard.
4. Từ đó mới cấp điện cho Uno (chân **5V**, không dùng jack DC), ESP32 (chân **5V/VIN**), GM65, LCD và đèn LED.

### 4.2. Bảng nối dây (bản tự động)

| Từ | Đến | Ghi chú |
|---|---|---|
| Uno 5V / GND | Thanh + / thanh − | |
| ESP32 5V (VIN) / GND | Thanh + / thanh − | |
| GM65 5V / GND | Thanh + / thanh − | |
| **GM65 TX** | **Uno D8** | Trước đây là D2 |
| **GM65 RX** | **Uno D9** | Trước đây là D3 |
| **Đèn LED RGB: DI** | **Uno D10** | Mới |
| Đèn LED RGB: 5V / GND | Thanh + / GND | |
| LCD VCC / GND | Thanh + / thanh − | |
| LCD SDA / SCL | Uno A4 / A5 | |
| Mạch chuyển mức HV / LV | Thanh 5 V / ESP32 3V3 | GND hai phía nối chung |
| **Uno D1 (TX)** → HV2, LV2 → | **ESP32 GPIO16 (RX2)** | Uno tự gửi kết quả |
| ESP32 GPIO4 → LV1, HV1 → | Uno D7 | THẤP = đã nối Internet |

**Không còn** dây từ ESP32 sang Uno để nhận lệnh (bản cũ dùng GPIO17 → D10). Chân D10 bây giờ dành cho đèn LED.

## 5. Cài GM65

Chương trình Uno **tự chuyển GM65 sang chế độ quét liên tục** mỗi lần khởi động. Uno đọc ô cài đặt 0x0000, chỉ đổi 2 bit chọn chế độ thành "liên tục", rồi lưu vào bộ nhớ của GM65.

Kiểm tra: sau khi bật, GM65 phải sáng đèn đỏ quét liên tục (hoặc sáng khi có thẻ đưa vào).

Nếu GM65 không tự quét:
1. Dùng tờ **mã cấu hình** đi kèm GM65, quét lần lượt: **UART (TTL)** → **9600 baud** → **Continuous mode** (quét liên tục).
2. Bấm RESET Uno.

Cách này chỉ cần làm một lần; GM65 nhớ cài đặt.

## 6. Nạp chương trình cho Arduino Uno

1. Mở `may_doc_the_internet/may_doc_the_internet.ino` bằng Arduino IDE.
2. Cài thư viện **LiquidCrystal I2C** (Frank de Brabander) nếu chưa có. Đèn LED **không cần thư viện**, chương trình tự điều khiển.
3. Chọn bo **Arduino Uno**, chọn cổng COM, bấm **Upload**. Bản thử biên dịch được: flash 15 392 byte (47 %), RAM 1 384 byte (67 %).
4. **An toàn khi cắm USB:** tháo 1 viên pin ra khỏi hộp trước khi cắm cáp USB vào Uno, để USB và pin không cùng cấp điện.
5. Không cần rút dây D1 khi nạp: ESP32 chỉ nghe, gặp dòng lạ thì bỏ qua.

**Thử không cần thẻ:** mở Serial Monitor (9600 baud, Newline), gõ `CT:H2O|Nuoc`, hoặc `NT:H` rồi `LENH:XONG`, hoặc `H,H,O`. Serial Monitor sẽ hiện các dòng Uno gửi sang ESP32, ví dụ `KQ  CT:H2O|Nuoc  H2O  Nuoc  3  2  cht  18.0  1`. Đây là dấu hiệu máy đang gửi đúng.

**Tùy chọn ở đầu chương trình:**

| Dòng | Ý nghĩa |
|---|---|
| `#define CAI_DAT_GM65 1` | 1 = tự đặt GM65 sang quét liên tục; 0 = giữ cài đặt sẵn |
| `#define DO_SANG_LED 60` | Độ sáng đèn 0–255. WS2812B rất chói, 40–80 là vừa |
| `THOI_GIAN_QUEN_THE = 1500` | Thẻ phải rời vùng đọc quá 1,5 giây thì quét lại mới tính là lần mới |
| `LiquidCrystal_I2C lcd(0x27, 16, 2);` | LCD không hiện chữ thì thử `0x3F` |

## 7. Nạp chương trình cho ESP32

1. Thêm bo ESP32 vào Arduino IDE: **File > Preferences > Additional boards manager URLs**, dán `https://espressif.github.io/arduino-esp32/package_esp32_index.json`; vào **Boards Manager**, cài **esp32** (Espressif, đã thử bản 3.3.12).
2. Mở `cau_noi_internet/cau_noi_internet.ino`, sửa **`cau_hinh.h`**:
   - `WIFI_TEN`, `WIFI_MAT_KHAU`: WiFi **2,4 GHz**, không phải loại đăng nhập qua trang web;
   - `FIREBASE_API_KEY`, `FIREBASE_DB_URL`: lấy trong Firebase console;
   - `MAY_ID`: mỗi nhóm một tên, ví dụ `nhom1`, `nhom2`.
3. Chọn bo **NodeMCU-32S**, cắm cáp micro USB, bấm **Upload**. Báo `Failed to connect`: giữ nút **BOOT** khi IDE hiện `Connecting...`.
4. Serial Monitor (115200 baud) báo `[WiFi] Da ket noi`, rồi `[Firebase] Da dang nhap an danh`. Đèn xanh trên ESP32 sáng đứng = đã nối; nháy = đang nối. LCD của Uno hiện **Da noi Internet**.

## 8. Firebase và trang web

Làm như mục 5 và mục 7 của tệp `HUONG_DAN_ESP32CAM_FIREBASE.md` (tạo dự án, bật Anonymous, tạo Realtime Database, điền `cau_hinh_firebase.js`, chạy `firebase deploy`).

- Dùng **chung dự án, chung trang web** với bản ESP32-CAM; dữ liệu giống hệt.
- Đăng lại **`database.rules.json` bản mới**: đã bỏ quy tắc `lenh` vì web không còn điều khiển máy.
- Đường link trang web chỉ có sau khi thầy chạy `firebase deploy` (dạng `https://<ten-du-an>.web.app`).

## 9. Dùng trong lớp

| Việc | Cách làm | Đèn | LCD |
|---|---|---|---|
| Chờ | Bật máy | 🔵 | `  QUET THE QR` / `Da noi Internet` |
| Quét một chất | Đưa thẻ chất (ví dụ H₂O) trước GM65 | 🟡 rồi 🟢 | 5 màn kết quả; web hiện ngay |
| Lắp ghép | Quét lần lượt thẻ nguyên tử (H, H, O), rồi thẻ **XONG** | 🟡 suốt lúc lắp, 🟢 khi XONG | `Da quet: 3 the` rồi 5 màn kết quả |
| Hai thẻ giống nhau liền nhau | Rút thẻ ra **hơn 1,5 giây** rồi đưa lại (hoặc dùng hai thẻ H) | 🟡 | số thẻ tăng |
| Thẻ lỗi | — | 🔴 3 giây | Báo lỗi, rồi về màn chờ |
| Làm lại | Quét thẻ **XÓA** | 🔵 | màn chờ; web về màn chờ |

Thẻ để yên trước đầu đọc chỉ được tính **một lần**; máy không gửi trùng lên web.

## 10. Kiểm tra nhanh sau khi lắp (10 phút)

| # | Làm | Phải thấy | ✓ |
|---|---|---|---|
| 1 | Bật nguồn | Đèn vàng lúc khởi động, rồi **xanh dương**; LCD `QUET THE QR` | ☐ |
| 2 | Đưa thẻ H₂O | Bíp, đèn **vàng** rồi **xanh lá**; LCD `H₂O / Nuoc` và 5 màn | ☐ |
| 3 | Để yên thẻ 5 giây | Không đổi gì, không gửi thêm | ☐ |
| 4 | Quét một mã lạ (ví dụ mã vạch sách) | Đèn **đỏ** 3 giây, rồi xanh dương | ☐ |
| 5 | Chờ ESP32 nối mạng | LCD dòng 2: `Da noi Internet` | ☐ |
| 6 | Quét thẻ NaCl, mở trang web chọn máy | Trang hiện NaCl, hình mạng tinh thể 3D | ☐ |
| 7 | Quét H, H, O, rồi XONG | Đèn vàng suốt lúc lắp, xanh lá khi XONG; web hiện H₂O | ☐ |
| 8 | Quét thẻ XÓA | Đèn xanh dương; LCD và trang về màn chờ | ☐ |

## 11. Xử lý sự cố

| Hiện tượng | Cách xử lý |
|---|---|
| Đèn LED không sáng | Kiểm tra DI → D10, 5V, GND. Một số mạch có chân DI và DO: phải nối vào **DI** |
| Đèn sáng sai màu (ví dụ xanh lá thay vì đỏ) | Không phải mạch WS2812B (GRB). Báo lại để đổi thứ tự màu trong chương trình |
| GM65 không sáng, không kêu | GM65 chưa ở UART 9600 hoặc chưa ở chế độ liên tục (mục 5); kiểm tra GM65 TX → **D8**, RX → **D9** |
| GM65 kêu bíp nhưng LCD không đổi | Sai tốc độ baud: đặt lại GM65 về 9600 bằng mã cấu hình |
| Không bao giờ hiện `Da noi Internet` | Xem Serial ESP32 (115200): lỗi WiFi / Firebase, xem `HUONG_DAN_ESP32CAM_FIREBASE.md` mục 9. Kiểm tra dây GPIO4 → LV1, HV1 → D7 |
| Có `Da noi Internet` nhưng web không có kết quả | Kiểm tra dây **D1 → HV2, LV2 → GPIO16**. Serial ESP32 phải in `[Uno] KQ ...` sau mỗi lần quét |
| Máy khởi động lại khi ESP32 gửi dữ liệu | Pin yếu, hoặc LM2596 dưới 4,9 V: sạc pin, chỉnh lại 5,0 V |
| LCD sáng mà không có chữ | Vặn biến trở xanh sau LCD; thử địa chỉ `0x3F` |

## 12. Đã kiểm thử những gì (26/10/2026)

| Nội dung | Kết quả |
|---|---|
| Biên dịch chương trình Uno (lõi AVR 1.8.6, avr-gcc 7.3) | Thành công, không cảnh báo ở sketch. Flash 47 %, RAM 67 % |
| Biên dịch chương trình ESP32 (arduino-esp32 3.3.12, NodeMCU-32S) | Thành công, flash 78 % |
| Giả lập trên máy tính: khởi động, màu đèn, 64 công thức, chống gửi trùng, lắp ghép H + H + O, bỏ khung trả lời GM65, mã lạ, XÓA, báo mạng, đổi thẻ ngay (O₂ → CO₂) | 24/24 mục đạt |
| **Chạy đúng tệp .elf đã biên dịch trên chip ATmega328P giả lập (simavr)**: bơm byte GM65 vào D8 ở 9600 baud, đọc chân TX, giải mã tín hiệu đèn ở D10 | 9/9 mục đạt: CHO lúc khởi động, xanh dương, KQ H₂O, vàng → xanh lá, không gửi trùng, NaCl ion 58,5, Xy2 → LOI + đỏ, về xanh dương |
| Thời gian xung đèn WS2812B (đo trên chip giả lập) | Bit 0 cao 0,31 µs, bit 1 cao 0,81 µs, chu kỳ 1,25 µs: trong chuẩn WS2812B |
| Dữ liệu gửi lên web so với bản ESP32-CAM, 64 công thức | 64/64 trùng khớp |
| Trang web, Chromium | 21/21 đạt, không lỗi JavaScript |

**Chưa xác minh trên phần cứng thật:** lệnh cài đặt GM65, đèn LED thật, kết nối Firebase thật, thời gian dùng pin. Khi lắp xong, thầy chạy bảng kiểm mục 10 và báo lại kết quả.
