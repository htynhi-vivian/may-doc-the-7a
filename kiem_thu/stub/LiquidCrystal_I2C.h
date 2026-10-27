#pragma once
#include "Arduino.h"
class LiquidCrystal_I2C : public Print {
public:
  char man[2][17]; int x = 0, y = 0;
  LiquidCrystal_I2C(int, int, int) { memset(man, ' ', sizeof man); man[0][16] = man[1][16] = 0; }
  void init() {} void backlight() {} void createChar(int, byte*) {}
  void setCursor(int c, int r) { x = c; y = r; }
  size_t write(uint8_t c) override { if (x < 16) { man[y][x++] = c < 8 ? (char)('1' + c) : (char)c; } return 1; }
  std::string dong(int r) { return std::string(man[r], 16); }
};
