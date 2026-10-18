const API_BASE = import.meta.env.VITE_WCLWD_API_URL || "http://127.0.0.1:5000";

/**
 * Uploads an image to the WCLWD Flask backend's /api/predict endpoint and
 * returns the full pipeline result: prediction, OOD status, ABCD/DSI/severity,
 * and absolute URLs to the saved Grad-CAM / WSSS mask visualizations.
 */
export async function analyzeImage(file, { signal } = {}) {
  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch(`${API_BASE}/api/predict`, {
    method: "POST",
    body: formData,
    signal,
  });

  const contentType = res.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await res.json() : null;

  if (!res.ok) {
    throw new Error(body?.error || `Request failed with status ${res.status}`);
  }
  return body;
}

/** Pings the WCLWD backend health endpoint (model status, classes, OOD availability). */
export async function checkHealth({ signal } = {}) {
  const res = await fetch(`${API_BASE}/health`, { signal });
  if (!res.ok) throw new Error(`Health check failed (${res.status})`);
  return res.json();
}

export { API_BASE };
