import mqtt from "mqtt";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Use GET only" });
  }

  const MQTT_HOST = "stingray.rmq.cloudamqp.com";
  const MQTT_PORT = 1883;
  const MQTT_USER = "boxgsipv:boxgsipv";
  const MQTT_PASS = "HIJGZvijZ7TZ17Cibc7k3BRYusmDTSYG";

  const client = mqtt.connect(`mqtt://${MQTT_HOST}`, {
    port: MQTT_PORT,
    username: MQTT_USER,
    password: MQTT_PASS,
    reconnectPeriod: 0,
    connectTimeout: 5000,
    clean: true,
  });

  const result = await new Promise((resolve) => {
    // timeout כולל של 6 שניות
    const globalTimer = setTimeout(() => {
      client.end(true);
      resolve(null);
    }, 6000);

    client.on("connect", () => {
      // subscribe ל-robot/answer - retained message יגיע מיד
      client.subscribe("robot/answer", { qos: 0 }, (err) => {
        if (err) {
          clearTimeout(globalTimer);
          client.end(true);
          resolve(null);
        }
        // אם יש retained message - יגיע תוך שנייה
        // אחרת המתן 2 שניות נוספות
        setTimeout(() => {
          clearTimeout(globalTimer);
          client.end(true);
          resolve(null);
        }, 2000);
      });
    });

    client.on("message", (topic, payload) => {
      if (topic === "robot/answer") {
        clearTimeout(globalTimer);
        client.end(true);
        try {
          const data = JSON.parse(payload.toString());
          resolve(data);
        } catch (e) {
          resolve({ answer: payload.toString() });
        }
      }
    });

    client.on("error", () => {
      clearTimeout(globalTimer);
      client.end(true);
      resolve(null);
    });
  });

  if (result && result.answer) {
    return res.status(200).json({ ok: true, answer: result.answer, question: result.question });
  } else {
    return res.status(200).json({ ok: true, answer: null });
  }
}
