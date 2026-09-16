# 🚚 ESP32 Smart Cargo Logistics — Edge AI & IoT Dashboard

[![ESP32](https://img.shields.io/badge/Microcontroller-ESP32-blue.svg)](https://www.espressif.com/en/products/socs/esp32)
[![Blynk Cloud](https://img.shields.io/badge/IoT%20Cloud-Blynk%202.0-green.svg)](https://blynk.io)
[![Vercel Deployment](https://img.shields.io/badge/Vercel-Live%20Hosting-black.svg?logo=vercel)](https://vercel.com)
[![Repository Access](https://img.shields.io/badge/GitHub-Private%20Repository-red.svg)](https://github.com)

A web-based **ESP32 Edge AI Telemetry Simulator & Smart Cargo Monitoring System**. This application provides real-time multi-sensor telemetry visualization, automated threshold anomaly detection (overheat, gas leak, physical impact shock), fault-tolerant offline RAM ring buffering, 3D cargo box orientation modeling, and direct sync with **Blynk Cloud 2.0**.

---

## 🔒 Private Repository & Credentials Notice

> [!IMPORTANT]
> **This repository is stored PRIVATELY** because it contains active hardware credentials and authentication tokens for Blynk Cloud. Keep this repository **Private** when syncing to GitHub.

### 🔑 Active Credentials Logged:
- **Blynk Template ID:** `TMPL3imDDVEN3`
- **Blynk Template Name:** `Smart Logistics`
- **Blynk Auth Token:** `flLStd1lc8fgVgyUQuqi3BLlvWsIX9FA`
- **Default Wi-Fi SSID:** `Wokwi-GUEST` (Bridge)

---

## 🚀 Live Hosting via Vercel (No Localhost Required)

To make this application accessible 24/7 on a public HTTPS URL without relying on local server processes:

### Option A: 1-Click Import from GitHub to Vercel (Recommended)
1. Log into your [Vercel Account](https://vercel.com).
2. Click **"Add New..."** ➔ **"Project"**.
3. Connect your GitHub account and select this private repository (`esp32-smart-cargo-logistics`).
4. Keep framework preset as **"Other"** or **"Static"** (Vercel automatically detects `vercel.json` and `api/compile.js`).
5. Click **Deploy**.
6. Vercel will generate your live public link (e.g. `https://esp32-smart-cargo-logistics.vercel.app`).

### Option B: Deploy via Vercel CLI directly from Terminal
Run the following command in your project directory:
```bash
npx vercel
```
Follow the prompts to confirm deployment to your Vercel team/account.

---

## ✨ Features & Functional Deck

- 🌡️ **DHT22 Climate Sensor**: Temperature (-10°C to 60°C) & Humidity monitoring with an over-temperature trigger limit (> 28.0°C).
- 💨 **MQ135 Gas Sensor**: Air quality & toxic gas detection with threshold limit (> 2200 PPM).
- 📳 **MPU6050 6-Axis Accelerometer/Gyro**: Real-time G-force motion & impact detection (> 2.50 G shock threshold).
- 📦 **Interactive 3D Cargo Cube**: Dynamically updates 3D rotation angles (`rotateX` / `rotateY`) based on MPU6050 gravity vector inputs (`accelX`, `accelY`, `accelZ`).
- ⚡ **Simulation Presets**: Instant one-click environment triggers:
  - *Normal Road* (24.5°C, 1.02G, Safe)
  - *Vertical Drop* (3.40G shock)
  - *Wall Collision* (2.90G impact)
  - *Cooling Failure* (34.5°C overheat)
  - *Gas Spoilage* (3100 PPM leak)
- 📡 **Blynk Cloud Virtual Pins**:
  - `V1`: Temperature (°C)
  - `V2`: Gas Level (PPM)
  - `V3`: Motion Shock Acceleration (G)
- 🛡️ **Offline Memory Ring Buffer**: Simulated ESP32 internal RAM ring buffer stores up to 20 logs when network connectivity drops, automatically flushing cached logs to Blynk Cloud upon reconnection.
- 🚨 **Hardware Actuator Feedback**: Visual deck showing status LEDs (Green/Red), Alarm Buzzer (Pin 13), and Emergency Cooling Fan Relay (Pin 27).
- 💻 **CLI Compiler Integration**: Serverless API `/api/compile` endpoint verifying code structure for `esp32:esp32:esp32` FQBN targets.

---

## 🔌 Hardware Circuit Pinout Mapping

| Component | ESP32 Pin | Function / Type |
| :--- | :--- | :--- |
| **DHT22 Temperature & Humidity** | `GPIO 15` | Digital Data Sensor Input |
| **MQ135 Gas Sensor** | `GPIO 34` | ADC Analog Input |
| **MPU6050 Accelerometer / Gyro** | `GPIO 21` (SDA), `GPIO 22` (SCL) | I2C Bus |
| **Alert Alarm Buzzer** | `GPIO 13` | Digital Output (Active High) |
| **Red Alert LED** | `GPIO 25` | Digital Output |
| **Green Status LED** | `GPIO 26` | Digital Output |
| **Cooling Fan Relay** | `GPIO 27` | Digital Output |

---

## 📁 Project Structure

```
├── sketch.ino        # ESP32 C++ Arduino firmware source code
├── index.html        # Main dashboard interface layout
├── style.css         # Custom styling system with dark UI tokens & 3D box styles
├── app.js            # Frontend logic, telemetry chart engine & firmware simulator
├── server.js         # Local Node.js server with arduino-cli compilation handler
├── vercel.json       # Vercel deployment configuration
├── api/
│   └── compile.js    # Vercel Serverless Function for CLI compile API
├── diagram.json      # Wokwi simulator circuit wiring layout
├── wokwi.toml        # Wokwi environment configuration
├── libraries.txt     # Arduino library dependencies list
├── package.json      # Node.js manifest & npm scripts
└── README.md         # Project documentation
```

---

## 💻 Running Locally

If you prefer to run locally before deploying to Vercel:

1. **Install Node.js** (if not already installed).
2. Launch the local server:
   ```bash
   node server.js
   ```
3. Open your browser at: `http://localhost:3000`

---

## 🛠️ GitHub Push Commands (Private Repository)

To push this complete project to GitHub as a **Private Repository**:

```bash
# 1. Initialize Git repository
git init

# 2. Add all files
git add .

# 3. Create initial commit
git commit -m "Initial commit: ESP32 Smart Cargo Logistics Dashboard with Vercel support"

# 4. Create Private Repository using GitHub CLI
gh repo create esp32-smart-cargo-logistics --private --source=. --remote=origin --push

# Or add your remote manually:
# git remote add origin https://github.com/YOUR_USERNAME/esp32-smart-cargo-logistics.git
# git branch -M main
# git push -u origin main
```

---
*Created for Smart Cargo Logistics IoT & ESP32 Edge Monitoring System.*
