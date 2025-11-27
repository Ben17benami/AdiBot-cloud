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
