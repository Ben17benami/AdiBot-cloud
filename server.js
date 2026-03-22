// server.js
const express = require("express");
const path = require("path");
const mqtt = require("mqtt");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// serve the UI
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// MQTT connection (CloudAMQP) - ✅ credentials חדשים
const MQTT_URL  = process.env.AMQP_URL || "mqtt://boxgsipv:HIJGZvijZ7TZ17Cibc7k3BRYusmDTSYG@stingray.rmq.cloudamqp.com/boxgsipv";
const MQTT_USER = "boxgsipv:boxgsipv";
const MQTT_PASS = "HIJGZvijZ7TZ17Cibc7k3BRYusmDTSYG";

const client = mqtt.connect(MQTT_URL, {
  username: MQTT_USER,
  password: MQTT_PASS,
  keepalive: 30,
  reconnectPeriod: 3000
});

client.on("connect", () => {
  console.log("✅ MQTT connected");
});

client.on("error", (err) => {
  console.error("❌ MQTT error", err.message);
});

// POST /ask -> publish to robot/question
app.post("/ask", (req, res) => {
  const q = req.body && req.body.question ? String(req.body.question).trim() : "";
  if (!q) return res.status(400).json({ ok: false, error: "Missing question" });

  client.publish("robot/question", q, { qos: 0 }, (err) => {
    if (err) {
      console.error("Publish error", err);
      return res.status(500).json({ ok: false, error: "Publish failed" });
    }
    console.log("📤 Published question:", q);
    res.json({ ok: true });
  });
});

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
// client.js (לקוח)
async function sendQuestion(q) {
  try {
    const resp = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q })
    });
    const j = await resp.json();
    if (j.ok) {
      // הודעה מותאמת במקום alert רגיל
      alert("ADIBOT says: Your question was sent to your robot!");
    } else {
      alert("ADIBOT says: Server error: " + (j.error || "unknown"));
    }
  } catch (err) {
    alert("Network error: " + err.message);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("sendBtn").addEventListener("click", () => {
    const q = document.getElementById("q").value.trim();
    if (!q) return alert("Please type a question");
    sendQuestion(q);
  });

  document.getElementById("q").addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && !ev.shiftKey) {
      ev.preventDefault();
      document.getElementById("sendBtn").click();
    }
  });
});
