const fs = require('fs');
const path = require('path');

// Generate 1000 realistic telemetry records for Cargo AI model training
const numRecords = 1000;
const rows = [
  'Timestamp,Temperature_C,Humidity_Pct,Gas_PPM,Motion_G,Door_Closed,Spoilage_Risk_Pct,Remaining_Shelf_Life_Hrs,Anomaly_Category'
];

const categories = ['NORMAL', 'HEAT_SPOILAGE', 'HUMIDITY_LEAK', 'GAS_HAZARD', 'SHOCK_IMPACT', 'TAMPER_ALERT'];

const startTime = Date.now() - (1000 * 3600 * 48); // Past 48 hours

for (let i = 0; i < numRecords; i++) {
  const timestamp = new Date(startTime + i * 170000).toISOString();

  // Distribute dataset across 70% normal and 30% anomaly conditions
  const rand = Math.random();
  let temp, hum, gas, motion, doorClosed, category, spoilageRisk, rsl;

  if (rand < 0.70) {
    // Normal Logistics Stream
    category = 'NORMAL';
    temp = +(22.0 + Math.random() * 6.0).toFixed(1); // 22 - 28°C
    hum = +(40.0 + Math.random() * 15.0).toFixed(1); // 40 - 55%
    gas = Math.floor(1000 + Math.random() * 800);    // 1000 - 1800 PPM
    motion = +(0.95 + Math.random() * 0.40).toFixed(2); // 0.95 - 1.35 G
    doorClosed = 1;
    spoilageRisk = +(5.0 + Math.random() * 10.0).toFixed(1);
    rsl = +(72.0 - (temp - 22.0) * 2.5 - Math.random() * 4).toFixed(1);
  } else if (rand < 0.77) {
    // Overheat / Cooling Failure
    category = 'HEAT_SPOILAGE';
    temp = +(30.5 + Math.random() * 14.0).toFixed(1); // 30.5 - 44.5°C
    hum = +(45.0 + Math.random() * 20.0).toFixed(1);
    gas = Math.floor(1600 + Math.random() * 800);
    motion = +(1.00 + Math.random() * 0.30).toFixed(2);
    doorClosed = 1;
    spoilageRisk = +(60.0 + Math.random() * 38.0).toFixed(1);
    rsl = +(Math.max(2.0, 24.0 - (temp - 30.0) * 1.8)).toFixed(1);
  } else if (rand < 0.84) {
    // Humidity Shift / Seal Breach
    category = 'HUMIDITY_LEAK';
    temp = +(24.0 + Math.random() * 5.0).toFixed(1);
    hum = +(65.0 + Math.random() * 25.0).toFixed(1); // High humidity
    gas = Math.floor(1400 + Math.random() * 600);
    motion = +(1.00 + Math.random() * 0.30).toFixed(2);
    doorClosed = 1;
    spoilageRisk = +(40.0 + Math.random() * 30.0).toFixed(1);
    rsl = +(36.0 - (hum - 60) * 0.5).toFixed(1);
  } else if (rand < 0.91) {
    // Toxic Gas Spoilage / Leak
    category = 'GAS_HAZARD';
    temp = +(26.0 + Math.random() * 6.0).toFixed(1);
    hum = +(50.0 + Math.random() * 15.0).toFixed(1);
    gas = Math.floor(4050 + Math.random() * 1500); // > 4000 PPM
    motion = +(1.00 + Math.random() * 0.30).toFixed(2);
    doorClosed = 1;
    spoilageRisk = +(75.0 + Math.random() * 24.0).toFixed(1);
    rsl = +(Math.max(1.0, 18.0 - (gas - 4000) / 200)).toFixed(1);
  } else if (rand < 0.96) {
    // Physical Shock / Collision
    category = 'SHOCK_IMPACT';
    temp = +(25.0 + Math.random() * 4.0).toFixed(1);
    hum = +(45.0 + Math.random() * 10.0).toFixed(1);
    gas = Math.floor(1300 + Math.random() * 500);
    motion = +(2.55 + Math.random() * 2.50).toFixed(2); // > 2.5G
    doorClosed = 1;
    spoilageRisk = +(35.0 + Math.random() * 25.0).toFixed(1);
    rsl = +(48.0 - Math.random() * 10).toFixed(1);
  } else {
    // Door Tamper Alert
    category = 'TAMPER_ALERT';
    temp = +(26.0 + Math.random() * 5.0).toFixed(1);
    hum = +(55.0 + Math.random() * 15.0).toFixed(1);
    gas = Math.floor(1500 + Math.random() * 500);
    motion = +(1.80 + Math.random() * 0.90).toFixed(2);
    doorClosed = 0; // Door opened!
    spoilageRisk = +(50.0 + Math.random() * 30.0).toFixed(1);
    rsl = +(30.0 - Math.random() * 8).toFixed(1);
  }

  rows.push(`${timestamp},${temp},${hum},${gas},${motion},${doorClosed},${spoilageRisk},${rsl},${category}`);
}

const outputPath = path.join(__dirname, '..', 'cargo_sensor_dataset.csv');
fs.writeFileSync(outputPath, rows.join('\n'), 'utf8');
console.log(`Generated ${numRecords} dataset records successfully at: ${outputPath}`);
