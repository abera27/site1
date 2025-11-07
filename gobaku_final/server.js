const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

let lastLocation = null;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || "";

app.post('/save-location', async (req, res) => {
  const { latitude, longitude } = req.body;

  const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`;
  const response = await fetch(url, { headers: { 'User-Agent': 'Location-App' }});
  const data = await response.json();

  const address = data.display_name || "住所取得失敗";
  const postalCode = data.address && data.address.postcode ? data.address.postcode : "不明";

  const moved = !lastLocation ||
    lastLocation.latitude !== latitude ||
    lastLocation.longitude !== longitude;

  lastLocation = { latitude, longitude, address, postalCode, time: new Date().toLocaleString() };

  if (moved && DISCORD_WEBHOOK_URL) {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `📍 **位置更新**\n\n${address}\n郵便番号: ${postalCode}\n🕒 ${lastLocation.time}`
      })
    });
  }

  res.send('位置情報を保存しました');
});

app.post('/admin/location', (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "認証失敗" });
  }
  res.json(lastLocation || { message: "データなし" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));