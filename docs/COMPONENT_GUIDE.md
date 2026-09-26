# 🛠️ ESP32 Smart Cargo Logistics — Complete Hardware Wiring & Arduino IDE 2.3.10 Guide

This document provides the exact pin configuration, breadboard setup instructions, and step-by-step Arduino IDE 2.3.10 guide for your purchased components:

### 📦 Purchased Components Deck:
1. **ESP32 Dev Board** (30-Pin ESP-WROOM-32 DevKit V1)
2. **ADXL345 3-Axis Accelerometer** (replacing MPU6050)
3. **LCD 16x2 Display with I2C Backpack** (RG1602A + PCF8574 adapter with GND, VCC, SDA, SCL)
4. **DHT11 Temperature & Humidity Sensor** (VCC, Data, GND)
5. **MQ Gas Sensor Module** (VCC, GND, DO, AO)
6. **5V 1-Channel Relay Module** (IN, GND, VCC + 3 screw terminals)
7. **5V Active Buzzer Module** (VCC, I/O, GND)
8. **1x Red LED & 1x Green LED + 2x 220Ω Resistors**
9. **9V Battery & DC Snap Connector**
10. **GL No.12 Solderless Breadboard**
11. **Ribbon Jumper Wires**: Male-to-Male (1 set), Male-to-Female (1 set)

---

## 🔌 Complete Master Pin Configuration Table

| Component | Pin on Component | ESP32 Board / Breadboard Pin | Cable Type Needed | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **ESP32 Power Rail** | `VIN` | Breadboard **Red (+) Rail** | M-M | Powers 5V sensors & Relay |
| | `GND` | Breadboard **Blue (-) Rail** | M-M | Common Ground for all components |
| **ADXL345 Sensor** | `VCC` | ESP32 `3V3` pin | M-F / M-M | **3.3V Power** |
| | `GND` | Breadboard **Blue (-) Rail** | M-F / M-M | Ground |
| | `SDA` | ESP32 `GPIO 21` | M-F / M-M | I2C Data (Shared with LCD) |
| | `SCL` | ESP32 `GPIO 22` | M-F / M-M | I2C Clock (Shared with LCD) |
| | `CS` | ESP32 `3V3` pin | M-F / M-M | **Pull HIGH to enable I2C mode** |
| | `SDO` | Breadboard **Blue (-) Rail** | M-F / M-M | Sets I2C address to `0x53` |
| **LCD 16x2 (I2C Backpack)** | `VCC` | Breadboard **Red (+) Rail** (5V) | M-F / M-M | Backlight requires 5V |
| | `GND` | Breadboard **Blue (-) Rail** | M-F / M-M | Ground |
| | `SDA` | ESP32 `GPIO 21` | M-F / M-M | I2C Data (Shares bus with ADXL) |
| | `SCL` | ESP32 `GPIO 22` | M-F / M-M | I2C Clock (Shares bus with ADXL) |
| **DHT11 Sensor** | `VCC` | ESP32 `3V3` pin | M-F / M-M | 3.3V Power |
| | `GND` | Breadboard **Blue (-) Rail** | M-F / M-M | Ground |
| | `DATA` | ESP32 `GPIO 15` | M-F / M-M | Digital Sensor Data |
| **MQ Gas Sensor** | `VCC` | Breadboard **Red (+) Rail** (5V) | M-F / M-M | MQ heater element needs 5V |
| | `GND` | Breadboard **Blue (-) Rail** | M-F / M-M | Ground |
| | `AO` (Analog Output)| ESP32 `GPIO 34` | M-F / M-M | ADC Analog Input |
| | `DO` | *Not Connected* | - | Leave disconnected |
| **Green LED (Status)** | Anode (+ Long pin) | ESP32 `GPIO 26` (via 220Ω) | M-M | In series with 220Ω Resistor |
| | Cathode (- Short pin)| Breadboard **Blue (-) Rail** | M-M | Direct to Ground |
| **Red LED (Alert)** | Anode (+ Long pin) | ESP32 `GPIO 25` (via 220Ω) | M-M | In series with 220Ω Resistor |
| | Cathode (- Short pin)| Breadboard **Blue (-) Rail** | M-M | Direct to Ground |
| **Buzzer Module** | `VCC` | ESP32 `3V3` pin | M-F / M-M | Power |
| | `GND` | Breadboard **Blue (-) Rail** | M-F / M-M | Ground |
| | `I/O` or `SIG` | ESP32 `GPIO 13` | M-F / M-M | Alarm Output Signal |
| **5V Relay Module** | `VCC` | Breadboard **Red (+) Rail** (5V) | M-F / M-M | Relay Coil Power |
| | `GND` | Breadboard **Blue (-) Rail** | M-F / M-M | Ground |
| | `IN` | ESP32 `GPIO 27` | M-F / M-M | Actuator Signal Input |

---

## ⚡ Power Supply & 9V Battery Rules

1. **Powering via USB (During Coding & Setup)**:
   - Plug Micro-USB cable into the ESP32.
   - The ESP32's onboard regulator powers `VIN` at 5V and `3V3` at 3.3V.
   - **DO NOT** plug the 9V battery in while USB is plugged in to avoid voltage backfeed!
2. **Portable / Wireless Operation (Using 9V Battery)**:
   - Red wire (+) of 9V snap connector ➔ ESP32 `VIN` pin.
   - Black wire (-) of 9V snap connector ➔ Breadboard **Blue (-) Rail** (GND).

---

## 💻 Arduino IDE 2.3.10 Setup Guide (From Start to Upload)

### Step 1: Add ESP32 Board Support URL
1. Open **Arduino IDE 2.3.10**.
2. Go to **File** ➔ **Preferences** (or `Ctrl + ,`).
3. In **Additional Boards Manager URLs**, paste:
   ```text
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Click **OK**.

### Step 2: Install ESP32 Board Package
1. Click on the **Boards Manager** icon on the left sidebar (or press `Ctrl + Shift + B`).
2. Type `esp32` in the search bar.
3. Locate **esp32 by Espressif Systems** and click **Install**.

### Step 3: Install Required Libraries
Click on the **Library Manager** icon on the left sidebar (or press `Ctrl + Shift + I`) and search/install each of the following:
1. Search `Adafruit ADXL345` ➔ Install **Adafruit ADXL345** (and click "Install All" for dependencies like Adafruit Unified Sensor).
2. Search `DHT sensor library` ➔ Install **DHT sensor library by Adafruit**.
3. Search `LiquidCrystal I2C` ➔ Install **LiquidCrystal I2C by Frank de Brabander**.
4. Search `Blynk` ➔ Install **Blynk by Volodymyr Shymanskyy**.

### Step 4: Configure Board & Upload Code
1. Connect your ESP32 to your PC via Micro-USB cable.
2. Go to **Tools** ➔ **Board** ➔ **esp32** ➔ Select **ESP32 Dev Module** (or **DOIT ESP32 DEVKIT V1**).
3. Go to **Tools** ➔ **Port** ➔ Select the active COM port (e.g., `COM3`, `COM4`, or `COM5`).
4. Open your `sketch.ino` file. Update your Wi-Fi credentials (`ssid` and `pass`).
5. Click the **Upload** arrow button (or press `Ctrl + U`).
6. *If uploading shows "Connecting....____....", press and hold the **BOOT** button on the ESP32 for 2 seconds until the upload percentage starts!*
7. Open **Tools** ➔ **Serial Monitor** at **115200 baud** to see real-time sensor diagnostics!
