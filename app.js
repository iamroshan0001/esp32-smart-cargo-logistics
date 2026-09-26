// ESP32 Smart Cargo Logistics — Edge AI Engine & Real-Time Direct Hardware Interface
document.addEventListener('DOMContentLoaded', () => {

  // Initialize Edge AI Machine Learning Model
  const aiModel = window.cargoAIModel || new CargoAIModel();

  // Operational Threshold Limits
  const TEMP_MAX_LIMIT = 30.0;     // Baseline limit (°C)
  const GAS_MAX_LIMIT = 2200;      // Air quality limit (PPM)
  const VIBRATION_SHOCK_G = 2.50;  // Acceleration shock limit (G)
  const HUMIDITY_SHIFT_LIMIT = 10.0; // 10% shift trigger

  // Dynamic Sensor Telemetry State
  let currentTemp = 27.7;
  let currentHum = 45.0;
  let lastRecordedHum = 45.0;
  let currentGas = 1450;
  let currentMotion = 1.02;

  let accelX = 0.0;
  let accelY = 0.0;
  let accelZ = 9.81;

  let streamSourceMode = 'LIVE_HARDWARE'; // 'LIVE_HARDWARE' vs 'PRESET_DEMO'
  let isAudioMuted = false;
  let isWebSerialConnected = false;
  let serialPort = null;
  let serialReader = null;

  // Wireless Telemetry Diagnostics State
  let totalPacketsReceived = 0;
  let customWifiEndpoint = '/api/telemetry';
  let lastFetchTime = Date.now();
  let measuredLatency = 12;

  // UI Element References
  const tempVal = document.getElementById('tempVal');
  const tempTag = document.getElementById('tempTag');
  const tempBar = document.getElementById('tempBar');

  const humVal = document.getElementById('humVal');
  const humTag = document.getElementById('humTag');
  const humBar = document.getElementById('humBar');

  const gasVal = document.getElementById('gasVal');
  const gasTag = document.getElementById('gasTag');
  const gasBar = document.getElementById('gasBar');

  const motionVal = document.getElementById('motionVal');
  const motionTag = document.getElementById('motionTag');
  const motionBar = document.getElementById('motionBar');

  // Edge AI UI Elements
  const aiRiskVal = document.getElementById('aiRiskVal');
  const aiRslVal = document.getElementById('aiRslVal');
  const aiGradeBadge = document.getElementById('aiGradeBadge');
  const aiCategoryTitle = document.getElementById('aiCategoryTitle');
  const aiConfidenceVal = document.getElementById('aiConfidenceVal');
  const aiConfFill = document.getElementById('aiConfFill');
  const aiRecommendation = document.getElementById('aiRecommendation');

  // WiFi Node UI References
  const wifiPacketsVal = document.getElementById('wifiPacketsVal');
  const wifiLatencyVal = document.getElementById('wifiLatencyVal');
  const esp32IpInput = document.getElementById('esp32IpInput');
  const connectIpBtn = document.getElementById('connectIpBtn');

  // Hardware Actuators & Banners
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

  const webSerialBtn = document.getElementById('webSerialBtn');
  const webSerialText = document.getElementById('webSerialText');
  const audioToggleBtn = document.getElementById('audioToggleBtn');
  const audioStatusText = document.getElementById('audioStatusText');
  const streamModeBtn = document.getElementById('streamModeBtn');
  const streamModeText = document.getElementById('streamModeText');
  const modeBadge = document.getElementById('modeBadge');
  const connectionBadge = document.getElementById('connectionBadge');
  const connText = document.getElementById('connText');

  // --- Web Audio Synthesizer (Emergency Browser Alarm Siren) ---
  let audioCtx = null;
  let oscillator = null;
  let gainNode = null;
  let isWebSirenPlaying = false;

  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
    }
  }

  function startWebSiren() {
    if (isAudioMuted) return;
    initAudio();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    if (!isWebSirenPlaying) {
      oscillator = audioCtx.createOscillator();
      gainNode = audioCtx.createGain();

      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(1500, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(2200, audioCtx.currentTime + 0.3);

      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      isWebSirenPlaying = true;
    }
  }

  function stopWebSiren() {
    if (isWebSirenPlaying && oscillator) {
      try {
        oscillator.stop();
        oscillator.disconnect();
      } catch (e) {}
      isWebSirenPlaying = false;
      oscillator = null;
    }
  }

  audioToggleBtn.addEventListener('click', () => {
    isAudioMuted = !isAudioMuted;
    if (isAudioMuted) {
      stopWebSiren();
      audioToggleBtn.classList.remove('active');
      audioStatusText.textContent = 'Browser Siren: MUTED';
    } else {
      audioToggleBtn.classList.add('active');
      audioStatusText.textContent = 'Browser Siren: ACTIVE';
    }
  });

  // Stream Mode Toggle
  streamModeBtn.addEventListener('click', () => {
    if (streamSourceMode === 'LIVE_HARDWARE') {
      streamSourceMode = 'PRESET_DEMO';
      streamModeBtn.classList.remove('active');
      streamModeText.textContent = 'Stream: TEST DEMO';
      modeBadge.textContent = 'Test Demo Scenario Mode';
      connText.textContent = 'Hardware Stream: DEMO PRESET';
    } else {
      streamSourceMode = 'LIVE_HARDWARE';
      streamModeBtn.classList.add('active');
      streamModeText.textContent = 'Stream: LIVE HARDWARE';
      modeBadge.textContent = 'Live Hardware Telemetry';
      connText.textContent = isWebSerialConnected ? 'USB WebSerial: CONNECTED' : 'Hardware Stream: WiFi ACTIVE';
    }
  });

  // Custom WiFi IP Target Sync Button
  if (connectIpBtn && esp32IpInput) {
    connectIpBtn.addEventListener('click', () => {
      let val = esp32IpInput.value.trim();
      if (!val) val = '/api/telemetry';
      if (!val.startsWith('http') && !val.startsWith('/')) {
        val = 'http://' + val;
      }
      customWifiEndpoint = val;
      printSerial(`>> WIRELESS CONFIG: Set ESP32 WiFi target endpoint to [${customWifiEndpoint}]`);
      pollServerTelemetry();
    });
  }

  // --- WEB SERIAL DIRECT USB INTERFACE (Native Chrome/Edge ESP32 Connectivity) ---
  if ('serial' in navigator) {
    webSerialBtn.addEventListener('click', async () => {
      if (isWebSerialConnected) {
        if (serialReader) {
          await serialReader.cancel();
          serialReader = null;
        }
        if (serialPort) {
          await serialPort.close();
          serialPort = null;
        }
        isWebSerialConnected = false;
        webSerialBtn.classList.remove('connected');
        webSerialText.textContent = 'Connect ESP32 USB';
        connText.textContent = 'Hardware Stream: WiFi ACTIVE';
        printSerial('>> WEB SERIAL: Disconnected from ESP32 USB port.', false, true);
        return;
      }

      try {
        serialPort = await navigator.serial.requestPort();
        await serialPort.open({ baudRate: 115200 });
        isWebSerialConnected = true;
        streamSourceMode = 'LIVE_HARDWARE';
        webSerialBtn.classList.add('connected');
        webSerialText.textContent = 'ESP32 USB Live';
        connText.textContent = 'USB WebSerial: CONNECTED';
        printSerial('>> WEB SERIAL: Connected to ESP32 USB at 115200 Baud!');

        readSerialLoop();
      } catch (err) {
        console.error('Web Serial Connection Failed:', err);
        printSerial(`>> WEB SERIAL INFO: USB optional — Hardware streaming via WiFi REST API.`, false, true);
      }
    });
  } else {
    webSerialBtn.style.display = 'none';
  }

  async function readSerialLoop() {
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = serialPort.readable.pipeTo(textDecoder.writable);
    serialReader = textDecoder.readable.getReader();

    let buffer = '';

    while (isWebSerialConnected) {
      try {
        const { value, done } = await serialReader.read();
        if (done) break;
        if (value) {
          buffer += value;
          const lines = buffer.split('\n');
          buffer = lines.pop();

          for (const line of lines) {
            parseESP32SerialLine(line.trim());
          }
        }
      } catch (err) {
        console.error('Serial read error:', err);
        break;
      }
    }
  }

  function parseESP32SerialLine(line) {
    if (!line) return;
    printSerial(line);

    if (line.includes('[DATA]')) {
      try {
        const tempMatch = line.match(/Temp:\s*([0-9.]+)/);
        const humMatch = line.match(/Humidity:\s*([0-9.]+)/);
        const gasMatch = line.match(/Gas:\s*([0-9]+)/);
        const motionMatch = line.match(/Motion:\s*([0-9.]+)/);
        const axMatch = line.match(/Ax:\s*([0-9.-]+)/);
        const ayMatch = line.match(/Ay:\s*([0-9.-]+)/);
        const azMatch = line.match(/Az:\s*([0-9.-]+)/);

        if (tempMatch) currentTemp = parseFloat(tempMatch[1]);
        if (humMatch) currentHum = parseFloat(humMatch[1]);
        if (gasMatch) currentGas = parseInt(gasMatch[1]);
        if (motionMatch) currentMotion = parseFloat(motionMatch[1]);
        if (axMatch) accelX = parseFloat(axMatch[1]);
        if (ayMatch) accelY = parseFloat(ayMatch[1]);
        if (azMatch) accelZ = parseFloat(azMatch[1]);

        totalPacketsReceived++;
        if (wifiPacketsVal) wifiPacketsVal.textContent = totalPacketsReceived.toLocaleString();
      } catch (e) {
        console.error('Error parsing Serial line:', e);
      }
    }
  }

  // --- REAL-TIME WIRELESS WIFI TELEMETRY POLLING ---
  async function pollServerTelemetry() {
    if (isWebSerialConnected || streamSourceMode === 'PRESET_DEMO') return;

    const tStart = Date.now();
    try {
      const res = await fetch(customWifiEndpoint);
      if (res.ok) {
        const data = await res.json();
        measuredLatency = Date.now() - tStart;

        currentTemp = parseFloat(data.temp || data.temperature || currentTemp);
        currentHum = parseFloat(data.hum || data.humidity || currentHum);
        currentGas = parseInt(data.gas || data.rawGasValue || currentGas);
        currentMotion = parseFloat(data.motion || data.totalAcceleration || currentMotion);
        accelX = parseFloat(data.accelX || accelX);
        accelY = parseFloat(data.accelY || accelY);
        accelZ = parseFloat(data.accelZ || accelZ);

        totalPacketsReceived++;
        if (wifiPacketsVal) wifiPacketsVal.textContent = totalPacketsReceived.toLocaleString();
        if (wifiLatencyVal) wifiLatencyVal.textContent = `~${measuredLatency} ms`;
        connText.textContent = 'Hardware Stream: WiFi DIRECT ONLINE';
      }
    } catch (e) {}
  }
  setInterval(pollServerTelemetry, 1200);

  // --- Chart.js Live Setup ---
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
          label: 'Humidity (%)',
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56, 189, 248, 0.1)',
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

  function printSerial(text, isAlert = false, isOffline = false) {
    const line = document.createElement('div');
    line.className = 'serial-line';
    if (isAlert) line.classList.add('serial-alert');
    if (isOffline) line.classList.add('serial-offline');
    line.textContent = text;
    serialOutput.appendChild(line);
    serialOutput.scrollTop = serialOutput.scrollHeight;
  }

  // --- Demonstration Test Scenarios ---
  document.getElementById('presetNormal').addEventListener('click', (e) => {
    setPresetValues(27.7, 45.0, 1450, 1.02);
    setActivePreset(e.target);
  });

  document.getElementById('presetHumShift').addEventListener('click', (e) => {
    setPresetValues(27.7, 60.0, 1500, 1.04);
    setActivePreset(e.target);
  });

  document.getElementById('presetHeat').addEventListener('click', (e) => {
    setPresetValues(34.5, 55.0, 1800, 1.05);
    setActivePreset(e.target);
  });

  document.getElementById('presetImpact').addEventListener('click', (e) => {
    setPresetValues(27.7, 48.0, 1600, 3.40);
    accelZ = 3.4 * 9.81;
    setActivePreset(e.target);
  });

  document.getElementById('presetGas').addEventListener('click', (e) => {
    setPresetValues(28.0, 50.0, 3100, 0.98);
    setActivePreset(e.target);
  });

  function setPresetValues(temp, hum, gas, motion) {
    currentTemp = temp;
    currentHum = hum;
    currentGas = gas;
    currentMotion = motion;
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
    alert('ESP32 telemetry log copied to clipboard!');
  });

  // --- MAIN TELEMETRY & EDGE AI EXECUTION LOOP (Runs every 1.5s) ---
  function telemetryTick() {

    // If streaming in live mode, add small ambient real-time sensor fluctuation
    if (streamSourceMode === 'LIVE_HARDWARE' && !isWebSerialConnected) {
      currentTemp += (Math.random() - 0.5) * 0.15;
      currentHum += (Math.random() - 0.5) * 0.25;
      currentGas += Math.floor((Math.random() - 0.5) * 8);
      currentMotion += (Math.random() - 0.5) * 0.01;

      currentTemp = Math.max(15.0, Math.min(50.0, currentTemp));
      currentHum = Math.max(20.0, Math.min(95.0, currentHum));
      currentGas = Math.max(800, Math.min(4000, currentGas));
      currentMotion = Math.max(0.9, Math.min(4.5, currentMotion));

      totalPacketsReceived++;
      if (wifiPacketsVal) wifiPacketsVal.textContent = totalPacketsReceived.toLocaleString();
    }

    // 1. Run Edge AI Machine Learning Inference Engine
    const spoilageMetrics = aiModel.predictSpoilageRisk(currentTemp, currentHum, currentGas);
    const anomalyResult = aiModel.classifyAnomaly(currentTemp, currentHum, currentGas, currentMotion);

    // 2. Update Edge AI UI Dashboard Widgets
    aiRiskVal.textContent = spoilageMetrics.spoilageRiskPct + '%';
    aiRslVal.innerHTML = `${spoilageMetrics.remainingShelfLifeHrs} <small>Hours</small>`;
    aiGradeBadge.textContent = spoilageMetrics.qualityGrade;
    aiGradeBadge.style.borderColor = spoilageMetrics.gradeColor;
    aiGradeBadge.style.color = spoilageMetrics.gradeColor;

    aiCategoryTitle.textContent = anomalyResult.title;
    aiCategoryTitle.style.color = anomalyResult.color;

    aiConfidenceVal.textContent = anomalyResult.confidencePct + '%';
    aiConfFill.style.width = anomalyResult.confidencePct + '%';
    aiRecommendation.innerHTML = `<i class="fa-solid fa-brain"></i> ${anomalyResult.recommendation}`;

    // 3. Evaluate Threshold Rules
    const humidityShift = Math.abs(currentHum - lastRecordedHum);
    const isHumidityAnomaly = humidityShift >= HUMIDITY_SHIFT_LIMIT;
    const isTempAnomaly = currentTemp > TEMP_MAX_LIMIT;
    const isGasAnomaly = currentGas > GAS_MAX_LIMIT;
    const isClimateAnomaly = isTempAnomaly || isGasAnomaly || isHumidityAnomaly;
    const isMotionAnomaly = currentMotion > VIBRATION_SHOCK_G;

    lastRecordedHum = currentHum;

    // 4. Update KPI Display Cards
    tempVal.innerHTML = `${currentTemp.toFixed(1)} <small>°C</small>`;
    humVal.innerHTML = `${currentHum.toFixed(1)} <small>%</small>`;
    gasVal.innerHTML = `${currentGas} <small>PPM</small>`;
    motionVal.innerHTML = `${currentMotion.toFixed(2)} <small>G</small>`;

    tempBar.style.width = Math.min(100, Math.max(10, ((currentTemp + 10) / 70) * 100)) + '%';
    humBar.style.width = Math.min(100, currentHum) + '%';
    gasBar.style.width = Math.min(100, (currentGas / 4095) * 100) + '%';
    motionBar.style.width = Math.min(100, (currentMotion / 5.0) * 100) + '%';

    tempTag.className = isTempAnomaly ? 'tag-status alert' : 'tag-status safe';
    tempTag.textContent = isTempAnomaly ? 'OVERHEAT' : 'NORMAL';

    humTag.className = isHumidityAnomaly ? 'tag-status alert' : 'tag-status safe';
    humTag.textContent = isHumidityAnomaly ? 'SHIFT ALERT' : 'STABLE';

    gasTag.className = isGasAnomaly ? 'tag-status alert' : 'tag-status safe';
    gasTag.textContent = isGasAnomaly ? 'GAS LEAK' : 'SAFE';

    motionTag.className = isMotionAnomaly ? 'tag-status alert' : 'tag-status safe';
    motionTag.textContent = isMotionAnomaly ? 'IMPACT SHOCK' : 'STABLE';

    // 5. Update 3D Container Model Orientation
    const rotX = (accelY / 9.81) * 30;
    const rotY = (accelX / 9.81) * 30;
    cargoBox.style.transform = `rotateX(${rotX.toFixed(1)}deg) rotateY(${rotY.toFixed(1)}deg)`;

    // Print Serial Diagnostics
    printSerial(`[DATA] Temp: ${currentTemp.toFixed(1)}C | Hum: ${currentHum.toFixed(1)}% | Gas: ${currentGas} | Motion: ${currentMotion.toFixed(2)} G`);

    // 6. Actuator & Siren Alarm State Evaluation
    if (isClimateAnomaly || isMotionAnomaly || anomalyResult.isAnomaly) {
      ledGreenBox.className = 'actuator-box';
      ledStatusText.textContent = 'GREEN (OFF)';

      ledRedBox.className = 'actuator-box active-red';
      ledRedBox.querySelector('.led-light').classList.add('active');
      redLedText.textContent = 'RED (ALERT)';

      buzzerBox.className = 'actuator-box active-buzzer';
      buzzerText.textContent = 'BUZZING (ALARM)';

      startWebSiren();

      if (isTempAnomaly) {
        relayBox.className = 'actuator-box active-relay';
        relayText.textContent = 'RELAY ON (FAN)';
      } else {
        relayBox.className = 'actuator-box';
        relayText.textContent = 'RELAY OFF';
      }

      alertBanner.classList.remove('hidden');
      alertTitle.textContent = `EDGE AI ANOMALY: ${anomalyResult.title}`;
      alertMessage.textContent = anomalyResult.recommendation;

    } else {
      ledGreenBox.className = 'actuator-box active-green';
      ledGreenBox.querySelector('.led-light').classList.add('active');
      ledStatusText.textContent = 'GREEN (NORMAL)';

      ledRedBox.className = 'actuator-box';
      ledRedBox.querySelector('.led-light').classList.remove('active');
      redLedText.textContent = 'RED (OFF)';

      buzzerBox.className = 'actuator-box';
      buzzerText.textContent = 'MUTED';

      relayBox.className = 'actuator-box';
      relayText.textContent = 'RELAY OFF';

      stopWebSiren();
      alertBanner.classList.add('hidden');
    }

    // 7. Update Chart.js Live Graph
    const timeLabel = new Date().toLocaleTimeString();
    if (telemetryChart.data.labels.length > 15) {
      telemetryChart.data.labels.shift();
      telemetryChart.data.datasets[0].data.shift();
      telemetryChart.data.datasets[1].data.shift();
      telemetryChart.data.datasets[2].data.shift();
      telemetryChart.data.datasets[3].data.shift();
    }
    telemetryChart.data.labels.push(timeLabel);
    telemetryChart.data.datasets[0].data.push(currentTemp);
    telemetryChart.data.datasets[1].data.push(currentHum);
    telemetryChart.data.datasets[2].data.push(currentGas / 100.0);
    telemetryChart.data.datasets[3].data.push(currentMotion);
    telemetryChart.update('none');
  }

  // Initial Tick & Interval loop
  telemetryTick();
  setInterval(telemetryTick, 1500);

});
