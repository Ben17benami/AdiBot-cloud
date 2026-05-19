import mqtt from "mqtt";

// שמור את התשובה האחרונה בזיכרון הפונקציה
let lastAnswer = null;
let lastAnswerTime = 0;

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
    connectTimeout: 8000,
  });

  const listenPromise = () =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        client.end(true);
        resolve(null); // timeout - אין תשובה
      }, 5000);

      client.on("connect", () => {
        client.subscribe("robot/answer", (err) => {
          if (err) {
            clearTimeout(timer);
            client.end(true);
            reject(err);
          }
        });
      });

      client.on("message", (topic, payload) => {
        if (topic === "robot/answer") {
          clearTimeout(timer);
          client.end(true);
          try {
            const data = JSON.parse(payload.toString());
            resolve(data);
          } catch (e) {
            resolve({ answer: payload.toString() });
          }
        }
      });

      client.on("error", (err) => {
        clearTimeout(timer);
        client.end(true);
        reject(err);
      });
    });

  try {
    const data = await listenPromise();
    if (data) {
      return res.status(200).json({ ok: true, answer: data.answer, question: data.question });
    } else {
      return res.status(200).json({ ok: true, answer: null });
    }
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
