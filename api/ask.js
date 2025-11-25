// api/ask.js — fixed & safe version for Vercel + MQTT

import mqtt from "mqtt";

// ... (קוד אימות קלט - לא משתנה)

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
    reconnectPeriod: 0, // לא מנסה להתחבר מחדש, כי זו פונקציה חד-פעמית
  });

  const publishPromise = () =>
    new Promise((resolve, reject) => {
      // **תיקון: מטפל בשגיאת חיבור לפני ה-connect**
      // אם יש שגיאה בחיבור, ה-Promise נכשל והשגיאה מטופלת ב-catch החיצוני
      client.on("error", (err) => {
        console.error("❌ MQTT connection error:", err);
        // צריך לסיים את החיבור בשגיאה כדי לשחרר משאבים
        client.end(true); 
        reject(new Error(`MQTT connection failed: ${err.message}`));
      });
      
      client.on("connect", () => {
        console.log("🔌 MQTT connected");
        
        // **תיקון: מוודא שהחיבור נסגר גם בהצלחה**
        client.publish("robot/question", q, { qos: 0 }, (err) => {
          if (err) {
            console.error("❌ Publish error:", err);
            client.end(true); // סגור חיבור בכישלון פירסום
            reject(new Error("Failed to publish to MQTT"));
          } else {
            console.log("📨 Published to MQTT");
            client.end(true); // סגור חיבור בהצלחה
            resolve();
          }
        });
      });
      
      // **הסרנו את client.end(true); מה-try block החיצוני**
      // כי אנחנו סוגרים אותו בתוך ה-Promise, בין אם הצלחנו או נכשלנו.
    });

  try {
    await publishPromise();

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
