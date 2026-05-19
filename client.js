// client.js

// ── היסטוריית שיחה בזיכרון ──
const conversations = []; // [{question, answer, pending}]

function addToHistory(question) {
  const item = { question, answer: null, pending: true };
  conversations.unshift(item); // הוסף בראש הרשימה
  renderHistory();
  return item;
}

function updateAnswer(item, answer) {
  item.answer = answer;
  item.pending = false;
  renderHistory();
}

function renderHistory() {
  const list = document.getElementById("historyList");
  const noHistory = document.getElementById("noHistory");

  if (conversations.length === 0) {
    noHistory.style.display = "block";
    return;
  }
  noHistory.style.display = "none";

  list.innerHTML = "";
  conversations.forEach((conv, idx) => {
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML = `
      <div class="q">${escapeHtml(conv.question)}${conv.pending ? '<span class="waiting-badge">waiting...</span>' : ''}</div>
      <div class="a">${conv.answer ? escapeHtml(conv.answer) : ''}</div>
      <div class="status">${conv.answer ? '✅ answered' : '⏳ waiting for robot...'}</div>
    `;
    // פתח/סגור בלחיצה
    div.addEventListener("click", () => {
      div.classList.toggle("open");
    });
    // פתח אוטומטית אם יש תשובה
    if (conv.answer) div.classList.add("open");
    list.appendChild(div);
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── פולינג לתשובות ──
let pollingInterval = null;

function startPolling(item) {
  // עצור פולינג קודם אם קיים
  if (pollingInterval) clearInterval(pollingInterval);

  let attempts = 0;
  pollingInterval = setInterval(async () => {
    attempts++;
    if (attempts > 60) { // עד 60 שניות
      clearInterval(pollingInterval);
      if (item.pending) {
        updateAnswer(item, "⚠️ No response received (timeout)");
      }
      return;
    }

    try {
      const resp = await fetch("/api/answer");
      if (!resp.ok) return;
      const j = await resp.json();
      if (j.answer && item.pending) {
        clearInterval(pollingInterval);
        updateAnswer(item, j.answer);
      }
    } catch (e) {
      // המשך לנסות
    }
  }, 1000);
}

// ── שליחת שאלה ──
async function sendQuestion(q) {
  const item = addToHistory(q);

  try {
    const resp = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q })
    });
    const j = await resp.json();
    if (j.ok) {
      startPolling(item);
    } else {
      updateAnswer(item, "❌ Error: " + (j.error || "unknown"));
    }
  } catch (err) {
    updateAnswer(item, "❌ Network error: " + err.message);
  }
}

// ── Event Listeners ──
document.addEventListener("DOMContentLoaded", () => {
  renderHistory();

  document.getElementById("sendBtn").addEventListener("click", () => {
    const q = document.getElementById("q").value.trim();
    if (!q) return alert("Please type a question");
    document.getElementById("q").value = "";
    sendQuestion(q);
  });

  document.getElementById("q").addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && !ev.shiftKey) {
      ev.preventDefault();
      document.getElementById("sendBtn").click();
    }
  });
});
