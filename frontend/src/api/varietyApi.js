/**
 * Frontend API service for coconut classification.
 * Sends the image, user ID and location to the backend,
 * receives prediction and Grad-CAM results, and loads prediction history.
 */

const API_BASE_URL = import.meta.env.VITE_VARIETY_API_URL || "http://127.0.0.1:5002";

export class ApiError extends Error {}

/**
 * Uploads an image (plus the user-picked map location) to the variety
 * classifier backend's /api/predict endpoint, tagged with `userId` so it's
 * stored against that user's history.
 *
 * `location` is required: { latitude, longitude, label? }. The backend
 * rejects the request if it's missing — the map pick is what gates a
 * prediction, not just the frontend button state.
 *
 * Returns { id, user_id, prediction, confidence, probabilities, image_url,
 *           gradcam_url, location, created_at }, with image/gradcam URLs
 * already resolved to absolute URLs.
 */
export async function predictImage(file, location, userId, { signal } = {}) {
  if (!userId) {
    throw new ApiError("You must be logged in to classify a photo.");
  }
  if (!location || location.latitude == null || location.longitude == null) {
    throw new ApiError("Select a location on the map first.");
  }

  const formData = new FormData();
  formData.append("image", file);
  formData.append("user_id", userId);
  formData.append("latitude", location.latitude);
  formData.append("longitude", location.longitude);
  if (location.label) formData.append("location_label", location.label);

  const res = await fetch(`${API_BASE_URL}/api/predict`, {
    method: "POST",
    body: formData,
    signal,
  });

  const data = await safeJson(res);

  if (!res.ok) {
    throw new ApiError(data.error || "Prediction failed.");
  }

  return resolveHistoryItemUrls(data);
}

/**
 * Most recent predictions for `userId`, newest first — used for the
 * bottom-of-page strip. Defaults to the 3 most recent.
 */
export async function fetchRecentHistory(userId, limit = 3, { signal } = {}) {
  if (!userId) throw new ApiError("You must be logged in to view prediction history.");

  const res = await fetch(
    `${API_BASE_URL}/api/history?user_id=${encodeURIComponent(userId)}&limit=${encodeURIComponent(limit)}`,
    { signal }
  );
  const data = await safeJson(res);
  if (!res.ok) throw new ApiError(data.error || "Could not load prediction history.");
  return (data.items || []).map(resolveHistoryItemUrls);
}

/**
 * One page of `userId`'s full prediction history — used by the "view all
 * details" modal. Returns { items, page, pages, total, has_next }.
 */
export async function fetchHistoryPage(userId, page = 1, pageSize = 12, { signal } = {}) {
  if (!userId) throw new ApiError("You must be logged in to view prediction history.");

  const res = await fetch(
    `${API_BASE_URL}/api/history/all?user_id=${encodeURIComponent(userId)}&page=${encodeURIComponent(page)}&page_size=${encodeURIComponent(pageSize)}`,
    { signal }
  );
  const data = await safeJson(res);
  if (!res.ok) throw new ApiError(data.error || "Could not load prediction history.");
  return { ...data, items: (data.items || []).map(resolveHistoryItemUrls) };
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    throw new ApiError("The server returned an unexpected response.");
  }
}

function resolveHistoryItemUrls(item) {
  return {
    ...item,
    image_url: resolveImageUrl(item.image_url),
    gradcam_url: resolveImageUrl(item.gradcam_url),
  };
}

export function resolveImageUrl(path) {
  if (!path) return null;
  return path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
}

export { API_BASE_URL };
