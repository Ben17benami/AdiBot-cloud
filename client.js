// client.js

const conversations = [];
let lastAnswerTs = null;
let pendingItem = null;
let isSending = false;

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
  if (!list) return;

  if (conversations.length === 0) {
    if (noHistory) noHistory.style.display = "block";
    return;
  }
  if (noHistory) noHistory.style.display = "none";
  list.innerHTML = "";

  conversations.forEach((conv) => {
    const div = document.createElement("div");
    div.className = "history-item" + (conv.answer && conv.answer.length <= 120 ? " open" : "");
    const fullAnswer = conv.answer ? escapeHtml(conv.answer) : '';
    const shortAnswer = conv.answer && conv.answer.length > 120 
      ? escapeHtml(conv.answer.substring(0, 120)) + '...' 
      : fullAnswer;
    
    div.innerHTML = `
      <div class="q">${escapeHtml(conv.question)}${conv.pending ? '<span class="waiting-badge">waiting...</span>' : ''}</div>
      <div class="a-short">${shortAnswer}</div>
      <div class="a-full">${fullAnswer}</div>
      <div class="status">${conv.answer ? (conv.answer.length > 120 ? '👆 tap to expand' : '✅ answered') : '⏳ waiting for robot...'}</div>
    `;
    div.addEventListener("click", () => {
      if (!conv.answer || conv.answer.length <= 120) return; // אל תפתח אם אין מה לפתוח
      div.classList.toggle("open");
      const status = div.querySelector(".status");
      status.textContent = div.classList.contains("open") ? "👆 tap to collapse" : "👆 tap to expand";
    });
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

// ✅ קרא את ה-ts הנוכחי לפני שליחת השאלה
async function getCurrentTs() {
  try {
    const resp = await fetch("/api/answer?t=" + Date.now());
    if (!resp.ok) return null;
    const j = await resp.json();
    return j.ts || null;
  } catch (e) {
    return null;
  }
}

async function fetchAnswer(item, oldTs) {
  try {
    const resp = await fetch("/api/answer?t=" + Date.now());
    if (!resp.ok) return false;
    const j = await resp.json();

    console.log("Answer API response:", j, "oldTs:", oldTs);

    if (j.answer && j.answer.length > 0) {
      // ✅ קבל רק תשובה עם ts שונה מהישן
      if (j.ts && j.ts === oldTs) {
        console.log("Skipping - same ts as before question was sent");
        return false;
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

async function sendQuestion(q) {
  if (isSending) return;
  isSending = true;

  const btn = document.getElementById("sendBtn");
  btn.disabled = true;
  btn.textContent = "Sending...";

  // ✅ שלב 1: קרא את ה-ts הנוכחי לפני שליחה
  const oldTs = await getCurrentTs();
  console.log("Current ts before question:", oldTs);

  const item = addToHistory(q);
  pendingItem = item;

  try {
    // ✅ שלב 2: שלח את השאלה
    const resp = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q })
    });
    const j = await resp.json();
    if (!j.ok) {
      updateAnswer(item, "❌ Error: " + (j.error || "unknown"));
      pendingItem = null;
      btn.disabled = false;
      btn.textContent = "Send to Robot";
    } else {
      btn.textContent = "Waiting for robot...";
      // ✅ שלב 3: המתן לתשובה חדשה עם ts שונה
      waitForAnswer(item, oldTs);
    }
  } catch (err) {
    updateAnswer(item, "❌ Network error: " + err.message);
    pendingItem = null;
    btn.disabled = false;
    btn.textContent = "Send to Robot";
  } finally {
    isSending = false;
  }
}

async function waitForAnswer(item, oldTs) {
  const btn = document.getElementById("sendBtn");
  let attempts = 0;

  const tryFetch = async () => {
    attempts++;
    const got = await fetchAnswer(item, oldTs);

    if (got) {
      pendingItem = null;
      btn.disabled = false;
      btn.textContent = "Send to Robot";
      return;
    }

    if (attempts >= 60) {
      updateAnswer(item, "⚠️ No response (timeout). Check your robot.");
      pendingItem = null;
      btn.disabled = false;
      btn.textContent = "Send to Robot";
      return;
    }

    setTimeout(tryFetch, 1000);
  };

  // התחל אחרי שנייה אחת
  setTimeout(tryFetch, 1000);
}

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
