import mqtt from "mqtt";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Use GET only" });
  }

  const MQTT_HOST = "stingray.rmq.cloudamqp.com";
  const MQTT_PORT = 1883;
  const MQTT_USER = "boxgsipv:boxgsipv";
  const MQTT_PASS = "HIJGZvijZ7TZ17Cibc7k3BRYusmDTSYG";

  // זמן שליחת השאלה מהאפליקציה (unix ms)
  const afterTs = parseInt(req.query.after || "0");

  const client = mqtt.connect(`mqtt://${MQTT_HOST}`, {
    port: MQTT_PORT,
    username: MQTT_USER,
    password: MQTT_PASS,
    reconnectPeriod: 0,
    connectTimeout: 5000,
    clean: true,
  });

  const result = await new Promise((resolve) => {
    const globalTimer = setTimeout(() => {
      client.end(true);
      resolve(null);
    }, 13000);

    client.on("connect", () => {
      client.subscribe("robot/answer", { qos: 0 }, (err) => {
        if (err) {
          clearTimeout(globalTimer);
          client.end(true);
          resolve(null);
        }
        // המתן עד 2 שניות לקבלת retained message
        setTimeout(() => {
          clearTimeout(globalTimer);
          client.end(true);
          resolve(null);
        }, 10000);
      });
    });

    client.on("message", (topic, payload) => {
      if (topic === "robot/answer") {
        const raw = payload.toString();
        if (!raw || raw.length === 0) return; // התעלם מהודעה ריקה

        try {
          const data = JSON.parse(raw);
          
          // ✅ בדוק שהתשובה חדשה יותר מזמן שליחת השאלה
          // millis() של הרובוט גדל כל הזמן - השווה לפי זמן הגעה
          // פשוט תמיד החזר את מה שיש - הלקוח יחליט אם זה ישן
          clearTimeout(globalTimer);
          client.end(true);
          resolve(data);
        } catch (e) {
          clearTimeout(globalTimer);
          client.end(true);
          resolve({ answer: raw });
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
    return res.status(200).json({ 
      ok: true, 
      answer: result.answer, 
      question: result.question,
      ts: result.ts || null
    });
  } else {
    return res.status(200).json({ ok: true, answer: null });
  }
}
