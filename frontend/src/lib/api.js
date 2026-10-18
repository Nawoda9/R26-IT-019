// Match whatever hostname the page itself was loaded with (localhost vs
// 127.0.0.1) rather than hardcoding one. Browsers treat those as different
// "sites" for SameSite=Lax cookie purposes - the port is ignored in that
// check, but the hostname is not, so a mismatch here silently drops the
// login session cookie on every request after the first.
const BASE = `${window.location.protocol}//${window.location.hostname}:5003/api`;

async function handle(res) {
  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data;
}

function withCreds(options = {}) {
  return { credentials: "include", ...options };
}

// ---------- Health ----------
export async function fetchHealth() {
  const res = await fetch(`${BASE}/health`, withCreds());
  return handle(res);
}

// ---------- Auth ----------
export async function registerAccount(username, password, email) {
  const res = await fetch(
    `${BASE}/auth/register`,
    withCreds({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, email }),
    })
  );
  return handle(res);
}

export async function login(username, password) {
  const res = await fetch(
    `${BASE}/auth/login`,
    withCreds({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })
  );
  return handle(res);
}

export async function logout() {
  const res = await fetch(`${BASE}/auth/logout`, withCreds({ method: "POST" }));
  return handle(res);
}

export async function fetchCurrentUser() {
  const res = await fetch(`${BASE}/auth/me`, withCreds());
  return handle(res);
}

// ---------- Prediction ----------
export async function predictImage(file) {
  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch(
    `${BASE}/predict`,
    withCreds({ method: "POST", body: formData })
  );

  return handle(res);
}

// ---------- Chat ----------
export async function createChatSession(title = null, source = "chat") {
  const res = await fetch(
    `${BASE}/chat/session`,
    withCreds({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, source }),
    })
  );

  return handle(res);
}

export async function fetchChatSessions() {
  const res = await fetch(`${BASE}/chat/sessions`, withCreds());
  return handle(res);
}

export async function sendChatMessage(sessionId, message) {
  const res = await fetch(
    `${BASE}/chat/message`,
    withCreds({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, message }),
    })
  );

  return handle(res);
}

export async function toggleTranslation(sessionId) {
  const res = await fetch(
    `${BASE}/chat/translate`,
    withCreds({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
    })
  );

  return handle(res);
}

export async function fetchSessionHistory(sessionId) {
  const res = await fetch(
    `${BASE}/chat/session/${sessionId}/history`,
    withCreds()
  );

  return handle(res);
}