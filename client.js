// client.js

// ── היסטוריית שיחה בזיכרון ──
const conversations = [];

function addToHistory(question) {
  const item = { question, answer: null, pending: true };
  conversations.unshift(item);
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

  if (!list) return; // safety check

  if (conversations.length === 0) {
    if (noHistory) noHistory.style.display = "block";
    return;
  }
  if (noHistory) noHistory.style.display = "none";
  list.innerHTML = "";

  conversations.forEach((conv) => {
    const div = document.createElement("div");
    div.className = "history-item" + (conv.answer ? " open" : "");
    div.innerHTML = `
      <div class="q">${escapeHtml(conv.question)}${conv.pending ? '<span class="waiting-badge">waiting...</span>' : ''}</div>
      <div class="a">${conv.answer ? escapeHtml(conv.answer) : ''}</div>
      <div class="status">${conv.answer ? '✅ answered' : '⏳ waiting for robot...'}</div>
    `;
    div.addEventListener("click", () => div.classList.toggle("open"));
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

// ── משיכת תשובה אחת ──
let lastAnswerTs = null; // שמור timestamp של תשובה אחרונה

async function fetchAnswer(item) {
  try {
    const resp = await fetch("/api/answer?t=" + Date.now() + "&after=" + questionSentAt);
    if (!resp.ok) return false;
    const j = await resp.json();
    
    console.log("Answer API response:", j);
    
    if (j.answer && j.answer.length > 0) { // ✅ התעלם מתשובה ריקה (clear message)
      // בדוק שה-timestamp של התשובה חדש יותר מזמן שליחת השאלה
      if (j.ts) {
        // millis() מהרובוט - לא אמין להשוואת זמן מוחלט
        // אז פשוט בדוק שזה לא אותו ts שראינו כבר
        if (j.ts === lastAnswerTs) {
          console.log("Skipping - same timestamp:", j.ts);
          return false;
        }
      }
      lastAnswerTs = j.ts || null;
      updateAnswer(item, j.answer);
      return true;
    }
  } catch (e) {
    console.log("fetchAnswer error:", e);
  }
  return false;
}

// ── שליחת שאלה ──
let pendingItem = null;
let isSending = false;

async function sendQuestion(q) {
  if (isSending) return;
  isSending = true;

  const btn = document.getElementById("sendBtn");
  btn.disabled = true;
  btn.textContent = "Sending...";

  const item = addToHistory(q);
  pendingItem = item;
  lastAnswerTs = null; // ✅ אפס כדי לקבל תשובה לשאלה החדשה
  item.sentAt = Date.now(); // ✅ שמור מתי נשלחה השאלה

  try {
    const resp = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q })
    });
    const j = await resp.json();
    if (!j.ok) {
      updateAnswer(item, "❌ Error: " + (j.error || "unknown"));
      pendingItem = null;
    } else {
      // המתן קצת ואז נסה למשוך תשובה
      btn.textContent = "Waiting for robot...";
      waitForAnswer(item);
    }
  } catch (err) {
    updateAnswer(item, "❌ Network error: " + err.message);
    pendingItem = null;
  } finally {
    isSending = false;
  }
}

// ── המתנה לתשובה ──
async function waitForAnswer(item) {
  const questionSentAt = item.sentAt || Date.now();
  const btn = document.getElementById("sendBtn");
  let attempts = 0;

  const tryFetch = async () => {
    attempts++;

    // הרובוט צריך זמן לעבד - נתחיל לנסות אחרי 3 שניות
    const got = await fetchAnswer(item);

    if (got) {
      // קיבלנו תשובה!
      pendingItem = null;
      btn.disabled = false;
      btn.textContent = "Send to Robot";
      return;
    }

    if (attempts >= 45) {
      // timeout אחרי ~45 שניות
      updateAnswer(item, "⚠️ No response (timeout). Check your robot.");
      pendingItem = null;
      btn.disabled = false;
      btn.textContent = "Send to Robot";
      return;
    }

    // נסה שוב אחרי שנייה
    setTimeout(tryFetch, 1000);
  };

  // התחל אחרי 3 שניות (זמן עיבוד הרובוט)
  setTimeout(tryFetch, 3000);
}

// ── Event Listeners ──
document.addEventListener("DOMContentLoaded", () => {
  renderHistory();

  document.getElementById("sendBtn").addEventListener("click", () => {
    const q = document.getElementById("q").value.trim();
    if (!q) return alert("Please type a question");
    if (pendingItem) return alert("Please wait for the robot to answer first!");
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
