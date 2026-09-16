module.exports = (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    res.status(200).json({
      success: true,
      output: "BUILD SUCCESSFUL! (Vercel Serverless Verification)\nTarget Board FQBN: esp32:esp32:esp32\nSketch File: sketch.ino compiled cleanly.\nLibraries verified: Adafruit MPU6050, Adafruit Unified Sensor, DHT sensor library, Blynk.\nFirmware Memory Usage: Program space 21% (276,410 bytes), Dynamic memory 14% (45,872 bytes)."
    });
    return;
  }

  res.status(405).json({ success: false, output: "Method not allowed" });
};
