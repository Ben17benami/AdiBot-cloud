// api/ask.js — fixed & safe version for Vercel + MQTT

import mqtt from "mqtt";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Use POST only" });
  }

  // --- Validate JSON input safely ---
  if (!req.body || typeof req.body.question !== "string") {
    return res
      .status(400)
      .json({ ok: false, error: "Invalid or missing 'question' field" });
  }

  const q = req.body.question.trim();
  if (!q) {
    return res
      .status(400)
      .json({ ok: false, error: "Empty question" });
  }

  // --- MQTT server details ---
  const MQTT_URL = "mqtt://possum.lmq.cloudamqp.com:1883";
  const MQTT_USER = "qlzbsdqx:qlzbsdqx";
  const MQTT_PASS = "X48HWvCR1anmO7fzkhhUcqC5TwpJ88hS";

  console.log("⬆️ Incoming question:", q);

  // --- Create client ---
  const client = mqtt.connect(MQTT_URL, {
    username: MQTT_USER,
    password: MQTT_PASS,
    reconnectPeriod: 0,
  });

  const publishPromise = () =>
    new Promise((resolve, reject) => {
      client.on("connect", () => {
        console.log("🔌 MQTT connected");

        client.publish("robot/question", q, { qos: 0 }, (err) => {
          if (err) {
            console.error("❌ Publish error:", err);
            reject(new Error("Failed to publish to MQTT"));
          } else {
            console.log("📨 Published to MQTT");
            resolve();
          }
        });
      });

      client.on("error", (err) => {
        console.error("❌ MQTT connection error:", err);
        reject(new Error("MQTT connection failed"));
      });
    });

  try {
    await publishPromise();
    client.end(true);

    // --- Return ALWAYS valid JSON ---
    return res.status(200).json({
      ok: true,
      sent: true,
      question: q,
    });
  } catch (err) {
    console.error("❌ FINAL ERROR:", err.message);

    // Return clean JSON instead of HTML
    return res.status(500).json({
      ok: false,
      error: err.message || "Server error",
    });
  }
}

