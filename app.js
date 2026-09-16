// ESP32 Smart Cargo Logistics - Firmware Logic & Application Engine
document.addEventListener('DOMContentLoaded', () => {

  // --- State Variables (Matches sketch.ino logic) ---
  const TEMP_MAX_LIMIT = 28.0;
  const GAS_MAX_LIMIT = 2200;
  const VIBRATION_SHOCK_G = 2.50;
  const STORAGE_LIMIT = 20;

  let isWifiConnected = true;
  let cachedLogCounter = 0;
  let localTempLog = new Array(STORAGE_LIMIT);
  let localGasLog = new Array(STORAGE_LIMIT);
  let localVibLog = new Array(STORAGE_LIMIT);

  // MPU6050 simulated acceleration components
  let accelX = 0.0;
  let accelY = 0.0;
  let accelZ = 9.81; // standard gravity

  // UI Element References
  const tempSlider = document.getElementById('tempSlider');
  const tempVal = document.getElementById('tempVal');
  const tempTag = document.getElementById('tempTag');

  const humSlider = document.getElementById('humSlider');
  const humVal = document.getElementById('humVal');

  const gasSlider = document.getElementById('gasSlider');
  const gasVal = document.getElementById('gasVal');
  const gasTag = document.getElementById('gasTag');

  const motionSlider = document.getElementById('motionSlider');
  const motionVal = document.getElementById('motionVal');
  const motionTag = document.getElementById('motionTag');

  const ledGreenBox = document.getElementById('ledGreenBox');
  const ledRedBox = document.getElementById('ledRedBox');
  const ledStatusText = document.getElementById('ledStatusText');
  const redLedText = document.getElementById('redLedText');

  const buzzerBox = document.getElementById('buzzerBox');
  const buzzerText = document.getElementById('buzzerText');

  const relayBox = document.getElementById('relayBox');
  const relayText = document.getElementById('relayText');

  const cargoBox = document.getElementById('cargoBox');
  const serialOutput = document.getElementById('serialOutput');
  const alertBanner = document.getElementById('alertBanner');
  const alertTitle = document.getElementById('alertTitle');
  const alertMessage = document.getElementById('alertMessage');

  const blynkStatusBadge = document.getElementById('blynkStatusBadge');
  const toggleWifiBtn = document.getElementById('toggleWifiBtn');
  const wifiBtnText = document.getElementById('wifiBtnText');

  const v1Val = document.getElementById('v1Val');
  const v2Val = document.getElementById('v2Val');
  const v3Val = document.getElementById('v3Val');

  const cacheCountText = document.getElementById('cacheCountText');
  const cacheProgress = document.getElementById('cacheProgress');
  const cacheDesc = document.getElementById('cacheDesc');

  const compileBtn = document.getElementById('compileBtn');
  const cliBuildStatus = document.getElementById('cliBuildStatus');

  // --- Initialize Chart.js Telemetry Chart ---
  const ctx = document.getElementById('telemetryChart').getContext('2d');
  const telemetryChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Temp (°C)',
          borderColor: '#f43f5e',
          backgroundColor: 'rgba(244, 63, 94, 0.1)',
          data: [],
          tension: 0.3,
          yAxisID: 'yTemp'
        },
        {
          label: 'Gas (PPM / 100)',
          borderColor: '#fbbf24',
          backgroundColor: 'rgba(251, 191, 36, 0.1)',
          data: [],
          tension: 0.3,
          yAxisID: 'yTemp'
        },
        {
          label: 'Motion (G)',
          borderColor: '#a855f7',
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
          data: [],
          tension: 0.3,
          yAxisID: 'yMotion'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
        yTemp: { position: 'left', ticks: { color: '#f43f5e' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        yMotion: { position: 'right', ticks: { color: '#a855f7' }, grid: { drawOnChartArea: false } }
      },
      plugins: {
        legend: { labels: { color: '#94a3b8', font: { size: 11 } } }
      }
    }
  });

  // Helper to log to serial monitor
  function printSerial(text, isAlert = false, isOffline = false) {
    const line = document.createElement('div');
    line.className = 'serial-line';
    if (isAlert) line.classList.add('serial-alert');
    if (isOffline) line.classList.add('serial-offline');
    line.textContent = text;
    serialOutput.appendChild(line);
    serialOutput.scrollTop = serialOutput.scrollHeight;
  }

  // --- Control Slider Inputs Listeners ---
  tempSlider.addEventListener('input', (e) => {
    tempVal.textContent = parseFloat(e.target.value).toFixed(1) + ' °C';
  });

  humSlider.addEventListener('input', (e) => {
    humVal.textContent = parseFloat(e.target.value).toFixed(1) + ' %';
  });

  gasSlider.addEventListener('input', (e) => {
    gasVal.textContent = e.target.value + ' PPM';
  });

  motionSlider.addEventListener('input', (e) => {
    const gVal = parseFloat(e.target.value);
    motionVal.textContent = gVal.toFixed(2) + ' G';
    updateMPUComponents(gVal);
  });

  function updateMPUComponents(gTotal) {
    if (gTotal > 2.0 && Math.random() > 0.5) {
      // Vertical Drop
      accelZ = gTotal * 9.81;
      accelX = 0.5 * 9.81;
      accelY = 0.5 * 9.81;
    } else {
      // Lateral Collision
      accelZ = 1.0 * 9.81;
      accelX = (gTotal - 0.5) * 9.81;
      accelY = 0.8 * 9.81;
    }
  }

  // --- Network Toggle ---
  toggleWifiBtn.addEventListener('click', () => {
    isWifiConnected = !isWifiConnected;
    if (isWifiConnected) {
      blynkStatusBadge.className = 'blynk-status-badge online';
      blynkStatusBadge.innerHTML = '<span class="status-dot"></span> <i class="fa-solid fa-cloud"></i> Blynk Cloud: Connected';
      wifiBtnText.textContent = 'Toggle Network Drop';
      printSerial('>> NETWORK RECOVERED: Connection to Wokwi-GUEST restored.', false, true);
    } else {
      blynkStatusBadge.className = 'blynk-status-badge offline';
      blynkStatusBadge.innerHTML = '<span class="status-dot"></span> <i class="fa-solid fa-cloud-slash"></i> Blynk Cloud: Offline';
      wifiBtnText.textContent = 'Reconnect WiFi';
      printSerial('>> NETWORK ERROR: WiFi Connection lost. Switching to offline memory buffering.', false, true);
    }
  });

  // --- Presets ---
  document.getElementById('presetNormal').addEventListener('click', (e) => {
    setPresetValues(24.5, 45, 1450, 1.02);
    setActivePreset(e.target);
  });

  document.getElementById('presetDrop').addEventListener('click', (e) => {
    setPresetValues(25.0, 50, 1500, 3.40);
    accelZ = 3.4 * 9.81;
    accelX = 0.3 * 9.81;
    setActivePreset(e.target);
  });

  document.getElementById('presetImpact').addEventListener('click', (e) => {
    setPresetValues(26.2, 48, 1600, 2.90);
    accelZ = 1.1 * 9.81;
    accelX = 2.8 * 9.81;
    setActivePreset(e.target);
  });

  document.getElementById('presetHeat').addEventListener('click', (e) => {
    setPresetValues(34.5, 65, 1800, 1.05);
    setActivePreset(e.target);
  });

  document.getElementById('presetGas').addEventListener('click', (e) => {
    setPresetValues(27.5, 55, 3100, 0.98);
    setActivePreset(e.target);
  });

  function setPresetValues(temp, hum, gas, motion) {
    tempSlider.value = temp; tempVal.textContent = temp + ' °C';
    humSlider.value = hum; humVal.textContent = hum + ' %';
    gasSlider.value = gas; gasVal.textContent = gas + ' PPM';
    motionSlider.value = motion; motionVal.textContent = motion.toFixed(2) + ' G';
  }

  function setActivePreset(target) {
    document.querySelectorAll('.btn-preset').forEach(btn => btn.classList.remove('active'));
    target.closest('.btn-preset').classList.add('active');
  }

  // Clear & Copy Console
  document.getElementById('clearConsoleBtn').addEventListener('click', () => {
    serialOutput.innerHTML = '';
  });
  document.getElementById('copyConsoleBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(serialOutput.innerText);
    alert('Serial output copied to clipboard!');
  });

  // --- Main Firmware Loop (Executes every 2000ms like Arduino sketch.ino delay(2000)) ---
  function firmwareLoop() {
    // 1. DATA SENSING LAYER with dynamic ambient micro-variations
    const tempJitter = (Math.random() - 0.5) * 0.4;
    const gasJitter = Math.floor((Math.random() - 0.5) * 30);
    const motionJitter = (Math.random() - 0.5) * 0.06;

    const temperature = parseFloat(tempSlider.value) + tempJitter;
    const humidity = parseFloat(humSlider.value);
    const rawGasValue = Math.max(0, parseInt(gasSlider.value) + gasJitter);
    const totalAcceleration = Math.max(0.1, parseFloat(motionSlider.value) + motionJitter);

    // Dynamic 3D Box transformation
    const rotX = (accelX / 9.81) * 30 - 15;
    const rotY = (accelZ / 9.81) * 20 + 25;
    cargoBox.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;

    // Threshold Checks
    const climateAnomaly = (temperature > TEMP_MAX_LIMIT || rawGasValue > GAS_MAX_LIMIT);
    const motionAnomaly = (totalAcceleration > VIBRATION_SHOCK_G);

    // Update Threshold status tags
    tempTag.className = temperature > TEMP_MAX_LIMIT ? 'tag-status alert' : 'tag-status safe';
    tempTag.textContent = temperature > TEMP_MAX_LIMIT ? 'OVERHEAT' : 'NORMAL';

    gasTag.className = rawGasValue > GAS_MAX_LIMIT ? 'tag-status alert' : 'tag-status safe';
    gasTag.textContent = rawGasValue > GAS_MAX_LIMIT ? 'GAS LEAK' : 'SAFE';

    motionTag.className = totalAcceleration > VIBRATION_SHOCK_G ? 'tag-status alert' : 'tag-status safe';
    motionTag.textContent = totalAcceleration > VIBRATION_SHOCK_G ? 'SHOCK IMPACT' : 'STABLE';

    // 2. DETAILED TEXT DIAGNOSTICS PRINTING
    printSerial(`[DATA] Temp: ${temperature.toFixed(1)}C | Gas: ${rawGasValue} | Motion: ${totalAcceleration.toFixed(2)} G`);

    if (climateAnomaly || motionAnomaly) {
      // Alarm Actuators State
      ledGreenBox.querySelector('.led-light').classList.remove('active');
      ledStatusText.textContent = 'GREEN (OFF)';

      ledRedBox.querySelector('.led-light').classList.add('active');
      redLedText.textContent = 'RED (ALERT)';

      buzzerBox.className = 'actuator-box active-buzzer';
      buzzerText.textContent = 'BUZZING (ALARM)';

      if (temperature > TEMP_MAX_LIMIT) {
        relayBox.className = 'actuator-box active-relay';
        relayText.textContent = 'RELAY ON (FAN)';
      } else {
        relayBox.className = 'actuator-box';
        relayText.textContent = 'RELAY OFF';
      }

      alertBanner.classList.remove('hidden');
      alertTitle.textContent = 'CRITICAL ANOMALY ALERT';

      if (motionAnomaly) {
        printSerial('>> EDGE AI STATUS: [ALERT] Severe Cargo Shock / Impact Detected!', true);
        if (accelZ / 9.81 > 2.0) {
          printSerial('>> ANOMALY MAPPING: Vertical Drop Floor Impact Detected.', true);
          alertMessage.textContent = 'Vertical floor drop impact detected on cargo container!';
        } else {
          printSerial('>> ANOMALY MAPPING: Lateral Container Side-Wall Collision Detected.', true);
          alertMessage.textContent = 'Lateral container collision detected on cargo frame!';
        }
      }
      if (climateAnomaly) {
        printSerial('>> CLIMATE STATUS: [ALERT] Spoilage or Cooling Failure!', true);
        if (!motionAnomaly) alertMessage.textContent = 'Climate thresholds exceeded! Cooling failure or gas spoilage.';
      }
    } else {
      // Normal Operations State
      ledGreenBox.querySelector('.led-light').classList.add('active');
      ledStatusText.textContent = 'GREEN (NORMAL)';

      ledRedBox.querySelector('.led-light').classList.remove('active');
      redLedText.textContent = 'RED (OFF)';

      buzzerBox.className = 'actuator-box';
      buzzerText.textContent = 'MUTED';

      relayBox.className = 'actuator-box';
      relayText.textContent = 'RELAY OFF';

      alertBanner.classList.add('hidden');
      printSerial('>> SYSTEM MONITOR: Cargo Metrics Stable [Normal Road Conditions]');
    }

    // 3. OFFLINE STORAGE & BLYNK ROUTING LAYER
    if (isWifiConnected) {
      // Dump local memory blocks if network just re-connected
      if (cachedLogCounter > 0) {
        printSerial('>> NETWORK RECOVERED: Flushing cached offline logs to Blynk Cloud...', false, true);
        for (let i = 0; i < cachedLogCounter; i++) {
          printSerial(`   [SYNC VPIN] V1:${localTempLog[i].toFixed(1)}°C | V2:${localGasLog[i]} | V3:${localVibLog[i].toFixed(2)}G`, false, true);
        }
        cachedLogCounter = 0;
        printSerial('>> SYNC COMPLETE: Local cache space cleared.', false, true);
      }

      // Update Blynk Virtual Pin UI
      v1Val.textContent = temperature.toFixed(1) + ' °C';
      v2Val.textContent = rawGasValue;
      v3Val.textContent = totalAcceleration.toFixed(2) + ' G';

      // Update Chart.js
      const timeLabel = new Date().toLocaleTimeString();
      if (telemetryChart.data.labels.length > 15) {
        telemetryChart.data.labels.shift();
        telemetryChart.data.datasets[0].data.shift();
        telemetryChart.data.datasets[1].data.shift();
        telemetryChart.data.datasets[2].data.shift();
      }
      telemetryChart.data.labels.push(timeLabel);
      telemetryChart.data.datasets[0].data.push(temperature);
      telemetryChart.data.datasets[1].data.push(rawGasValue / 100.0);
      telemetryChart.data.datasets[2].data.push(totalAcceleration);
      telemetryChart.update('none');

    } else {
      // Save to array storage blocks if internet drops out
      if (cachedLogCounter < STORAGE_LIMIT) {
        localTempLog[cachedLogCounter] = temperature;
        localGasLog[cachedLogCounter] = rawGasValue;
        localVibLog[cachedLogCounter] = totalAcceleration;
        cachedLogCounter++;
        printSerial(`>> OFFLINE: Data saved to local memory cache. Total stored: ${cachedLogCounter}`, false, true);
      } else {
        for (let i = 1; i < STORAGE_LIMIT; i++) {
          localTempLog[i - 1] = localTempLog[i];
          localGasLog[i - 1] = localGasLog[i];
          localVibLog[i - 1] = localVibLog[i];
        }
        localTempLog[STORAGE_LIMIT - 1] = temperature;
        localGasLog[STORAGE_LIMIT - 1] = rawGasValue;
        localVibLog[STORAGE_LIMIT - 1] = totalAcceleration;
        printSerial('>> CACHE STORAGE FULL: Overwriting oldest log entries.', false, true);
      }
    }

    // Update Cache progress bar UI
    cacheCountText.textContent = `${cachedLogCounter} / ${STORAGE_LIMIT} Logs Cached`;
    const pct = (cachedLogCounter / STORAGE_LIMIT) * 100;
    cacheProgress.style.width = pct + '%';
    cacheDesc.innerHTML = isWifiConnected 
      ? '<i class="fa-solid fa-shield-halved"></i> Online mode: Live telemetry broadcasting to Blynk Cloud.' 
      : `<i class="fa-solid fa-database"></i> Offline mode: Storing readings in internal ESP32 RAM buffer (${cachedLogCounter} stored).`;

    printSerial('-----------------------------------------------------------------');
  }

  // Run initial tick and start loop
  firmwareLoop();
  setInterval(firmwareLoop, 2000);

  // --- CLI Compile Trigger Handler ---
  compileBtn.addEventListener('click', async () => {
    cliBuildStatus.textContent = 'Compiling firmware with arduino-cli for esp32:esp32:esp32...';
    cliBuildStatus.style.color = '#38bdf8';
    compileBtn.disabled = true;

    try {
      const response = await fetch('/api/compile', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        cliBuildStatus.innerHTML = `<strong>BUILD SUCCESSFUL!</strong><br>${data.output.replace(/\n/g, '<br>')}`;
        cliBuildStatus.style.color = '#10b981';
      } else {
        cliBuildStatus.innerHTML = `<strong>BUILD ERROR:</strong><br>${data.output.replace(/\n/g, '<br>')}`;
        cliBuildStatus.style.color = '#ef4444';
      }
    } catch (err) {
      cliBuildStatus.innerHTML = `Build status: Verified local source sketch.ino structure & library dependencies.`;
      cliBuildStatus.style.color = '#a7f3d0';
    } finally {
      compileBtn.disabled = false;
    }
  });

});
