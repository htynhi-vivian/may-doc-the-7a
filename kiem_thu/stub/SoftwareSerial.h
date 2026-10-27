#pragma once
#include "Arduino.h"
#include <functional>
class SoftwareSerial : public Stream {
public:
  static SoftwareSerial* nghe;           // cổng đang nghe (chỉ một cổng nhận được dữ liệu)
  std::function<void(SoftwareSerial&, uint8_t)> khiNhan;  // giả lập thiết bị ở đầu kia
  SoftwareSerial(int, int) {}
  void begin(long) { listen(); }   // như Arduino: begin() tự gọi listen()
  void listen() { nghe = this; }
  bool isListening() { return nghe == this; }
  size_t write(uint8_t c) override { out += (char)c; if (khiNhan) khiNhan(*this, c); return 1; }
  void denTu(const std::string& s) { if (nghe == this) for (char c : s) in.push_back((uint8_t)c); else boMat += s.size(); }
  void denTuBytes(std::initializer_list<uint8_t> b) { if (nghe == this) for (uint8_t c : b) in.push_back(c); else boMat += b.size(); }
  size_t boMat = 0;
};
