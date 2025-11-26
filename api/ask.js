import mqtt from "mqtt";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Use POST only" });
  }

  const q = req.body?.question?.trim();
  if (!q) {
    return res.status(400).json({ ok: false, error: "Missing question" });
  }

  const MQTT_URL  = process.env.MQTT_URL;
  const MQTT_USER = process.env.MQTT_USER;
  const MQTT_PASS = process.env.MQTT_PASS;

  const client = mqtt.connect(MQTT_URL, {
    username: MQTT_USER,
    password: MQTT_PASS,
    reconnectPeriod: 0,
  });

  const publishPromise = () =>
    new Promise((resolve, reject) => {
      client.on("connect", () => {
        client.publish("robot/question", q, { qos: 0 }, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      client.on("error", reject);
    });

  try {
    await publishPromise();
    client.end(true);
    return res.status(200).json({ ok: true, sent: q });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
