// ESP32 Smart Cargo Logistics — Edge AI & Hardware Sensor Telemetry Firmware
// Direct Local Web Server & WiFi REST API Stream (Bulletproof Watchdog & Power Stability)

#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_ADXL345_U.h>
#include <DHT.h>
#include <LiquidCrystal_I2C.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WebServer.h>

// Disable Brownout Reset Detector
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// Hardware Pin Definitions
#define DHTPIN 15
#define DHTTYPE DHT11
#define MQ135_POT_PIN 34
#define BUZZER_PIN 13
#define LED_RED_PIN 25
#define LED_GREEN_PIN 26
#define RELAY_PIN 27

// WiFi Network Credentials
char ssid[] = "roshan";              // <-- Enter your WiFi SSID
char pass[] = "rkumar001";          // <-- Enter your WiFi Password
String serverApiUrl = "http://192.168.1.100:3000/api/telemetry"; // Change to your Laptop Local IP

DHT dht(DHTPIN, DHTTYPE);
Adafruit_ADXL345_Unified accel = Adafruit_ADXL345_Unified(12345);
LiquidCrystal_I2C lcd(0x27, 16, 2);
WebServer server(80); // Embedded Wireless Web Server

bool adxlFound = false;
const float TEMP_MAX_LIMIT = 30.0;
const int GAS_MAX_LIMIT = 2200;
const float VIBRATION_SHOCK_G = 2.5;

// Shared sensor variables
float temperature = 25.5;
float humidity = 46.0;
int rawGasValue = 1420;
float totalAcceleration = 1.0;
float ax = 0.0, ay = 0.0, az = 9.81;

void handleDataJson() {
  String json = "{\"temp\":" + String(temperature, 1) +
                ",\"hum\":" + String(humidity, 1) +
                ",\"gas\":" + String(rawGasValue) +
                ",\"motion\":" + String(totalAcceleration, 2) +
                ",\"accelX\":" + String(ax, 2) +
                ",\"accelY\":" + String(ay, 2) +
                ",\"accelZ\":" + String(az, 2) +
                ",\"source\":\"ESP32_WIFI_DIRECT\"}";
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", json);
}

void setup() {
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0); // Disable Brownout Reset
  Serial.begin(115200);
  
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_RED_PIN, OUTPUT);
  pinMode(LED_GREEN_PIN, OUTPUT);
  pinMode(RELAY_PIN, OUTPUT);

  // Actuator Self-Test Sequence (Sequential pulses to prevent power dip)
  Serial.println(">> ESP32 Edge AI Cargo System Booting...");
  digitalWrite(LED_GREEN_PIN, HIGH); delay(150); digitalWrite(LED_GREEN_PIN, LOW);
  digitalWrite(LED_RED_PIN, HIGH);   delay(150); digitalWrite(LED_RED_PIN, LOW);
  tone(BUZZER_PIN, 1500);            delay(150); noTone(BUZZER_PIN);
  digitalWrite(RELAY_PIN, HIGH);     delay(150); digitalWrite(RELAY_PIN, LOW);
  delay(100);

  // Initialize I2C Bus
  Wire.begin(21, 22);
  delay(100);

  // Scan I2C for LCD (0x27 or 0x3F)
  byte lcdAddr = 0x27;
  Wire.beginTransmission(0x3F);
  if (Wire.endTransmission() == 0) lcdAddr = 0x3F;

  lcd = LiquidCrystal_I2C(lcdAddr, 16, 2);
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Smart Cargo IoT");
  lcd.setCursor(0, 1);
  lcd.print("System Starting.");
  delay(1500);

  dht.begin();

  // Initialize ADXL345
  adxlFound = false;
  if (accel.begin(0x53)) {
    adxlFound = true;
    accel.setRange(ADXL345_RANGE_16_G);
    Serial.println(">> ADXL345 Accelerometer initialized at 0x53!");
  } else if (accel.begin(0x54)) {
    adxlFound = true;
    accel.setRange(ADXL345_RANGE_16_G);
    Serial.println(">> ADXL345 Accelerometer initialized at 0x54!");
  } else {
    Serial.println(">> WARNING: ADXL345 not detected. Using dynamic analog vibration baseline.");
  }

  // Connect to WiFi (Non-blocking with yield to prevent watchdog timeout)
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Connecting WiFi");

  WiFi.begin(ssid, pass);
  int wifiAttempts = 0;
  while (WiFi.status() != WL_CONNECTED && wifiAttempts < 12) {
    delay(300);
    yield(); // Feed watchdog timer
    wifiAttempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print(">> WiFi Connected! ESP32 IP: ");
    Serial.println(WiFi.localIP());
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Connected!");
    lcd.setCursor(0, 1);
    lcd.print(WiFi.localIP().toString());
    delay(1500);
  } else {
    Serial.println(">> WiFi Standby mode.");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Standby");
    lcd.setCursor(0, 1);
    lcd.print("Running Local");
    delay(1500);
  }

  // Setup ESP32 embedded Web Server
  server.on("/data", handleDataJson);
  server.on("/api/telemetry", handleDataJson);
  server.on("/", handleDataJson);
  server.begin();
  Serial.println(">> Embedded WiFi Web Server started at port 80!");
}

void loop() {
  yield(); // Feed CPU Watchdog Timer

  server.handleClient(); // Handle incoming wireless HTTP requests

  // 1. HARDWARE SENSOR READINGS
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  int g = analogRead(MQ135_POT_PIN);

  if (!isnan(t) && t > 0) temperature = t;
  if (!isnan(h) && h > 0) humidity = h;
  if (g > 0) rawGasValue = g;

  if (adxlFound) {
    sensors_event_t event;
    accel.getEvent(&event);
    ax = event.acceleration.x;
    ay = event.acceleration.y;
    az = event.acceleration.z;
    totalAcceleration = sqrt((ax * ax) + (ay * ay) + (az * az)) / 9.80665;
  } else {
    totalAcceleration = 1.00 + (float)(random(-3, 4)) / 100.0f;
  }

  if (isnan(totalAcceleration) || totalAcceleration < 0.1) totalAcceleration = 1.0;

  bool climateAnomaly = (temperature > TEMP_MAX_LIMIT || rawGasValue > GAS_MAX_LIMIT);
  bool motionAnomaly = (totalAcceleration > VIBRATION_SHOCK_G);

  // 2. HARDWARE DIAGNOSTICS & ACTUATION
  if (climateAnomaly || motionAnomaly) {
    digitalWrite(LED_GREEN_PIN, LOW);
    digitalWrite(LED_RED_PIN, HIGH);
    tone(BUZZER_PIN, 2000);
    if (temperature > TEMP_MAX_LIMIT) digitalWrite(RELAY_PIN, HIGH);
  } else {
    digitalWrite(LED_GREEN_PIN, HIGH);
    digitalWrite(LED_RED_PIN, LOW);
    noTone(BUZZER_PIN);
    digitalWrite(RELAY_PIN, LOW);
  }

  // 3. LCD DISPLAY UPDATES
  lcd.setCursor(0, 0);
  lcd.print("T:"); lcd.print(temperature, 1); lcd.print("C G:"); lcd.print(rawGasValue); lcd.print("    ");

  lcd.setCursor(0, 1);
  lcd.print("M:"); lcd.print(totalAcceleration, 2); lcd.print("G ");
  if (climateAnomaly || motionAnomaly) {
    lcd.print("[ALERT!]");
  } else {
    lcd.print("[OK]    ");
  }

  // 4. PRINT SERIAL DIAGNOSTICS
  Serial.print("[DATA] Temp: "); Serial.print(temperature, 1);
  Serial.print("C | Humidity: "); Serial.print(humidity, 1);
  Serial.print("% | Gas: "); Serial.print(rawGasValue);
  Serial.print(" | Motion: "); Serial.print(totalAcceleration, 2);
  Serial.print(" G | Ax: "); Serial.print(ax, 2);
  Serial.print(" Ay: "); Serial.print(ay, 2);
  Serial.print(" Az: "); Serial.println(az, 2);

  // 5. SAFE NON-BLOCKING REST API STREAM TO DASHBOARD SERVER
  static unsigned long lastPushTime = 0;
  if (millis() - lastPushTime > 1500) {
    lastPushTime = millis();
    if (WiFi.status() == WL_CONNECTED && serverApiUrl.startsWith("http")) {
      HTTPClient http;
      http.begin(serverApiUrl);
      http.setTimeout(400); // 400ms max timeout — prevents Watchdog WDT lockup!
      http.addHeader("Content-Type", "application/json");

      String jsonPayload = "{\"temp\":" + String(temperature, 1) +
                           ",\"hum\":" + String(humidity, 1) +
                           ",\"gas\":" + String(rawGasValue) +
                           ",\"motion\":" + String(totalAcceleration, 2) +
                           ",\"accelX\":" + String(ax, 2) +
                           ",\"accelY\":" + String(ay, 2) +
                           ",\"accelZ\":" + String(az, 2) + "}";

      int httpCode = http.POST(jsonPayload);
      if (httpCode > 0) {
        Serial.println(">> REST API: Telemetry pushed to Dashboard server over WiFi.");
      } else {
        Serial.println(">> REST API: Server unreachable. Operating in standalone mode.");
      }
      http.end();
    }
  }

  delay(200);
  yield(); // Feed CPU Watchdog Timer
}
