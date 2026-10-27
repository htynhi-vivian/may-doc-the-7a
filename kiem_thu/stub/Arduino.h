// Giả lập tối thiểu môi trường Arduino để chạy sketch Uno trên máy tính (kiểm thử)
#pragma once
#include <stdint.h>
#include <string.h>
#include <stdio.h>
#include <stdlib.h>
#include <string>
#include <deque>
#include "binary.h"
typedef uint8_t byte;
#define PROGMEM
#define pgm_read_byte(p) (*(const uint8_t*)(p))
#define pgm_read_float(p) (*(const float*)(p))
class __FlashStringHelper;
#define F(s) ((const __FlashStringHelper*)(s))
#define HEX 16
#define DEC 10
#define INPUT 0
#define OUTPUT 1
#define INPUT_PULLUP 2
#define LOW 0
#define HIGH 1
extern unsigned long g_ms;
extern int g_pin[32];
inline unsigned long millis() { return g_ms; }
inline void delay(unsigned long d) { g_ms += d; }
inline void pinMode(int, int) {}
inline int digitalRead(int p) { return g_pin[p]; }
inline void digitalWrite(int, int) {}
inline void delayMicroseconds(unsigned) {}
void denGiaLap(uint8_t r, uint8_t g, uint8_t b);
class Print {
public:
  virtual size_t write(uint8_t c) = 0;
  virtual ~Print() {}
  size_t print(const char* s) { size_t n = 0; while (*s) n += write((uint8_t)*s++); return n; }
  size_t print(const __FlashStringHelper* s) { return print((const char*)s); }
  size_t print(char c) { return write((uint8_t)c); }
  size_t print(long v, int base = DEC) { char b[24]; snprintf(b, sizeof b, base == HEX ? "%lX" : "%ld", v); return print(b); }
  size_t print(int v, int base = DEC) { return print((long)v, base); }
  size_t print(unsigned int v, int base = DEC) { return print((long)v, base); }
  size_t print(unsigned long v, int base = DEC) { char b[24]; snprintf(b, sizeof b, base == HEX ? "%lX" : "%lu", v); return print(b); }
  size_t print(unsigned char v, int base = DEC) { return print((long)v, base); }
  size_t print(double v, int d = 2) { char b[32]; snprintf(b, sizeof b, "%.*f", d, v); return print(b); }
  template <typename T> size_t println(T v) { size_t n = print(v); return n + print("\r\n"); }
  template <typename T> size_t println(T v, int b) { size_t n = print(v, b); return n + print("\r\n"); }
  size_t println() { return print("\r\n"); }
};
class Stream : public Print {
public:
  std::deque<uint8_t> in; std::string out;
  size_t write(uint8_t c) override { out += (char)c; return 1; }
  int available() { return (int)in.size(); }
  int read() { if (in.empty()) return -1; int c = in.front(); in.pop_front(); return c; }
  void begin(long) {}
  void feed(const std::string& s) { for (char c : s) in.push_back((uint8_t)c); }
};
extern Stream Serial;
