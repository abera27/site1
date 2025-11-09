const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const fetch = require("node-fetch");

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

let lastLocation = null;

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || "";
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY; // ← ここが正しい

async function reverseGeocode(lat, lng) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=ja&key=${GOOGLE_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  const address = data.results?.[0]?.formatted_address || "住所取得エラー";

  const postalCodeComponent = data.results?.[0]?.address_components
    ?.find(c => c.types.includes("postal_code"));

  const postalCode = postalCodeComponent ? postalCodeComponent.long_name : "不明";

  return { address, postalCode };
}

app.post("/save-location", async (req, res) => {
  const { latitude, longitude } = req.body;
  const { address, postalCode } = await reverseGeocode(latitude, longitude);

  const moved =
    !lastLocation ||
    lastLocation.latitude !== latitude ||
    lastLocation.longitude !== longitude;

  lastLocation = { latitude, longitude, address, postalCode, time: new Date().toLocaleString() };

  if (moved && DISCORD_WEBHOOK_URL) {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `📍 **位置更新**
${address}
📮 郵便番号: ${postalCode}
🕒 ${lastLocation.time}`
      })
    });
  }

  res.send("位置情報を保存しました");
});

app.post("/admin/location", (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: "認証失敗" });
  res.json(lastLocation || { message: "データなし" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ 正確住所版 Server 起動 → PORT: ${PORT}`));
