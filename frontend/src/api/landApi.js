/**
 * api/landApi.js
 * ---------------
 * Thin wrapper around the land_app Flask backend's JSON API
 * (see backend/land_app.py -> POST /api/analyze).
 *
 * The backend returns image paths as relative URLs
 * (e.g. "/static/results/detections_xxx.png"); this module resolves
 * them against VITE_LAND_API_URL so <img> tags work regardless of
 * which port/host the React dev server or static build is served from.
 */

const API_BASE_URL = import.meta.env.VITE_LAND_API_URL || "http://127.0.0.1:5001";

export function resolveUrl(path) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

/**
 * Upload an image + analysis options to the backend and return the
 * parsed JSON result (image URLs already resolved to absolute URLs).
 *
 * @param {File} file
 * @param {{confidence:number, topNPockets:number, requiredSpacingPx:number|null, includeSanityCheck:boolean}} options
 * @param {AbortSignal} [signal]
 */
export async function analyzeImage(file, options, signal) {
  const form = new FormData();
  form.append("image", file);
  form.append("confidence", String(options.confidence));
  form.append("top_n_pockets", String(options.topNPockets));
  if (options.requiredSpacingPx !== null && options.requiredSpacingPx !== undefined && options.requiredSpacingPx !== "") {
    form.append("required_spacing_px", String(options.requiredSpacingPx));
  }
  if (options.includeSanityCheck) {
    form.append("include_sanity_check", "on");
  }

  const response = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: "POST",
    body: form,
    signal,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload && payload.error ? payload.error : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return {
    ...payload,
    images: Object.fromEntries(
      Object.entries(payload.images || {}).map(([key, url]) => [key, resolveUrl(url)])
    ),
    uploaded_image_url: resolveUrl(payload.uploaded_image_url),
  };
}

export async function fetchClasses(signal) {
  const response = await fetch(`${API_BASE_URL}/api/classes`, { signal });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json();
}

export async function checkHealth(signal) {
  try {
    const response = await fetch(`${API_BASE_URL}/healthz`, { signal });
    return response.ok;
  } catch {
    return false;
  }
}

export { API_BASE_URL };
