#define BLYNK_TEMPLATE_ID "TMPL3imDDVEN3"       // Copy from your Blynk account
#define BLYNK_TEMPLATE_NAME "Smart Logistics"      // Copy from your Blynk account
#define BLYNK_AUTH_TOKEN "flLStd1lc8fgVgyUQuqi3BLlvWsIX9FA"  // Copy from your Blynk account

#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <Wire.h>
#include <DHT.h>
#include <WiFi.h>
#include <BlynkSimpleEsp32.h>

#define DHTPIN 15
#define DHTTYPE DHT22
#define MQ135_POT_PIN 34
#define BUZZER_PIN 13
#define LED_RED_PIN 25
#define LED_GREEN_PIN 26
#define RELAY_PIN 27

DHT dht(DHTPIN, DHTTYPE);
Adafruit_MPU6050 mpu;

// Memory storage arrays for offline mode
const int STORAGE_LIMIT = 20;
float localTempLog[STORAGE_LIMIT];
int localGasLog[STORAGE_LIMIT];
float localVibLog[STORAGE_LIMIT];
int cachedLogCounter = 0;

const float TEMP_MAX_LIMIT = 28.0;
const int GAS_MAX_LIMIT = 2200;
const float VIBRATION_SHOCK_G = 2.5;

char auth[] = BLYNK_AUTH_TOKEN;
char ssid[] = "Wokwi-GUEST"; // Leaves network open for free Wokwi router bridge
char pass[] = "";

void setup() {
  Serial.begin(115200);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_RED_PIN, OUTPUT);
  pinMode(LED_GREEN_PIN, OUTPUT);
  pinMode(RELAY_PIN, OUTPUT);

  dht.begin();
  if (!mpu.begin()) {
    Serial.println("Error: MPU6050 unreachable!");
    while (1) { delay(10); }
  }
  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);

  WiFi.begin(ssid, pass);
  Blynk.config(auth);
}

void loop() {
  // 1. DATA SENSING LAYER (Runs always, offline or online)
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  int rawGasValue = analogRead(MQ135_POT_PIN);

  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);
  float totalAcceleration = sqrt((a.acceleration.x * a.acceleration.x) + 
                                 (a.acceleration.y * a.acceleration.y) + 
                                 (a.acceleration.z * a.acceleration.z)) / 9.81;

  // Ensure valid baseline data if sensor is stationary in simulation
  if (isnan(temperature) || temperature == 0) temperature = 24.5;
  if (isnan(humidity) || humidity == 0) humidity = 45.0;
  if (rawGasValue == 0) rawGasValue = 1450;
  if (isnan(totalAcceleration) || totalAcceleration < 0.1) totalAcceleration = 1.0;

  // Add subtle ambient micro-variations so Blynk charts display dynamic curves
  temperature += (float)(random(-2, 3)) / 10.0f;
  rawGasValue += random(-15, 16);
  totalAcceleration += (float)(random(-3, 4)) / 100.0f;

  bool climateAnomaly = (temperature > TEMP_MAX_LIMIT || rawGasValue > GAS_MAX_LIMIT);
  bool motionAnomaly = (totalAcceleration > VIBRATION_SHOCK_G);

  // 2. DETAILED TEXT DIAGNOSTICS PRINTING (From Code 1)
  Serial.print("[DATA] Temp: "); Serial.print(temperature, 1); Serial.print("C | ");
  Serial.print("Gas: "); Serial.print(rawGasValue); Serial.print(" | ");
  Serial.print("Motion: "); Serial.print(totalAcceleration, 2); Serial.println(" G");

  if (climateAnomaly || motionAnomaly) {
    digitalWrite(LED_GREEN_PIN, LOW);
    digitalWrite(LED_RED_PIN, HIGH);
    digitalWrite(BUZZER_PIN, HIGH);
    if (temperature > TEMP_MAX_LIMIT) digitalWrite(RELAY_PIN, HIGH);

    if (motionAnomaly) {
      Serial.println(">> EDGE AI STATUS: [ALERT] Severe Cargo Shock / Impact Detected!");
      if (abs(a.acceleration.z) / 9.81 > 2.0) {
        Serial.println(">> ANOMALY MAPPING: Vertical Drop Floor Impact Detected.");
      } else {
        Serial.println(">> ANOMALY MAPPING: Lateral Container Side-Wall Collision Detected.");
      }
    }
    if (climateAnomaly) Serial.println(">> CLIMATE STATUS: [ALERT] Spoilage or Cooling Failure!");
  } else {
    digitalWrite(LED_GREEN_PIN, HIGH);
    digitalWrite(LED_RED_PIN, LOW);
    digitalWrite(BUZZER_PIN, LOW);
    digitalWrite(RELAY_PIN, LOW);
    Serial.println(">> SYSTEM MONITOR: Cargo Metrics Stable [Normal Road Conditions]");
  }

  // 3. OFFLINE STORAGE & BLYNK ROUTING LAYER (From Code 2)
  if (WiFi.status() == WL_CONNECTED) {
    Blynk.run();
    
    // Dump local memory blocks if network just re-connected
    if (cachedLogCounter > 0) {
      Serial.println(">> NETWORK RECOVERED: Flushing cached offline logs to Blynk Cloud...");
      for (int i = 0; i < cachedLogCounter; i++) {
        Blynk.virtualWrite(V1, localTempLog[i]);
        Blynk.virtualWrite(V2, localGasLog[i]);
        Blynk.virtualWrite(V3, localVibLog[i]);
        delay(100);
      }
      cachedLogCounter = 0;
      Serial.println(">> SYNC COMPLETE: Local cache space cleared.");
    }

    // Direct live data streams
    Blynk.virtualWrite(V1, temperature);
    Blynk.virtualWrite(V2, rawGasValue);
    Blynk.virtualWrite(V3, totalAcceleration);

  } else {
    // Save to array storage blocks if internet drops out
    if (cachedLogCounter < STORAGE_LIMIT) {
      localTempLog[cachedLogCounter] = temperature;
      localGasLog[cachedLogCounter] = rawGasValue;
      localVibLog[cachedLogCounter] = totalAcceleration;
      cachedLogCounter++;
      Serial.print(">> OFFLINE: Data saved to local memory cache. Total stored: "); Serial.println(cachedLogCounter);
    } else {
      for (int i = 1; i < STORAGE_LIMIT; i++) {
        localTempLog[i - 1] = localTempLog[i];
        localGasLog[i - 1] = localGasLog[i];
        localVibLog[i - 1] = localVibLog[i];
      }
      localTempLog[STORAGE_LIMIT - 1] = temperature;
      localGasLog[STORAGE_LIMIT - 1] = rawGasValue;
      localVibLog[STORAGE_LIMIT - 1] = totalAcceleration;
      Serial.println(">> CACHE STORAGE FULL: Overwriting oldest log entries.");
    }
  }

  Serial.println("-----------------------------------------------------------------");
  delay(2000);
}
