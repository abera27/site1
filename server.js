const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const fetch = require("node-fetch");

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

let lastLocation = null;

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ardaxzgn27721212";   // 管理者パス
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || "https://discord.com/api/webhooks/1436327917973016770/iXMlJr33jab93ulf7ZLWEQmBVrneFYKuDVUPeg2lZh_Yp7BOJSq5Z-u3Mp_y1E4OPxx0"; // Discord通知先
const GOOGLE_API_KEY = process.env.AIzaSyCYcTGt8jbuGTXrjJ7lGxltw-8QFGZNdak;                 // ← あなたのキー

// --------- 正確住所 + 郵便番号取得（Google Geocoding API） ---------
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

// --------- 位置を受け取る ---------
app.post("/save-location", async (req, res) => {
  const { latitude, longitude } = req.body;

  const { address, postalCode } = await reverseGeocode(latitude, longitude);

  const moved =
    !lastLocation ||
    lastLocation.latitude !== latitude ||
    lastLocation.longitude !== longitude;

  lastLocation = {
    latitude,
    longitude,
    address,
    postalCode,
    time: new Date().toLocaleString()
  };

  // ---------- 位置が変わったら Discord 通知 ----------
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

// --------- 管理画面が位置を見る ---------
app.post("/admin/location", (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: "認証失敗" });
  res.json(lastLocation || { message: "データなし" });
});

// --------- サーバー起動 ---------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ 正確住所版 Server 起動 → PORT: ${PORT}`));
