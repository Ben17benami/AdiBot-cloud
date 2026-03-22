import mqtt from "mqtt";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Use POST only" });
  }

  const q = req.body?.question?.trim();
  if (!q) {
    return res.status(400).json({ ok: false, error: "Missing question" });
  }

  // ✅ credentials מפורשים - לא דרך URL
  const MQTT_HOST = "stingray.rmq.cloudamqp.com";
  const MQTT_PORT = 1883;
  const MQTT_USER = "boxgsipv:boxgsipv";
  const MQTT_PASS = "HIJGZvijZ7TZ17Cibc7k3BRYusmDTSYG";

  const client = mqtt.connect(`mqtt://${MQTT_HOST}`, {
    port: MQTT_PORT,
    username: MQTT_USER,
    password: MQTT_PASS,
    reconnectPeriod: 0,
    connectTimeout: 8000,
  });

  const publishPromise = () =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        client.end(true);
        reject(new Error("MQTT connection timeout"));
      }, 8000);

      client.on("connect", () => {
        clearTimeout(timer);
        client.publish("robot/question", q, { qos: 0 }, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      client.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });

  try {
    await publishPromise();
    client.end(true);
    return res.status(200).json({ ok: true, sent: q });
  } catch (err) {
    client.end(true);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
