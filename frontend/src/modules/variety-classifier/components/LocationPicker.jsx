import { useCallback, useEffect, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// react-leaflet's default marker icon points at asset paths that don't
// survive bundling — re-point them at the copies Vite bundles for us.
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Sri Lanka's coconut triangle — a sensible default center for this app.
const DEFAULT_CENTER = [7.8731, 80.7718];
const DEFAULT_ZOOM = 7;
const PIN_ZOOM = 13;
const SEARCH_ZOOM = 14;
const SEARCH_DEBOUNCE_MS = 400;

//open strreet map api for reverse geocoding and search
async function reverseGeocode(lat, lng, signal) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=14`,
      { signal, headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.display_name || null;
  } catch {
    return null;
  }
}

async function searchPlaces(query, signal) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=6`,
      { signal, headers: { Accept: "application/json" } }
    );
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

function ClickCapture({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Imperatively pans/zooms the map whenever `flyTarget` changes (e.g. a
// search result is picked, or "use my location" resolves) — MapContainer's
// center/zoom props only apply on first mount, not on every update.
function FlyToOnChange({ flyTarget }) {
  const map = useMap();
  useEffect(() => {
    if (flyTarget) map.flyTo([flyTarget.lat, flyTarget.lng], SEARCH_ZOOM, { duration: 0.8 });
  }, [flyTarget, map]);
  return null;
}

function LocationSearchBox({ onResultSelected }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 3) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      searchPlaces(query.trim(), controller.signal).then((data) => {
        setResults(data);
        setSearching(false);
        setOpen(true);
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleSelect = (place) => {
    onResultSelected({
      lat: parseFloat(place.lat),
      lng: parseFloat(place.lon),
      label: place.display_name,
    });
    setQuery(place.display_name);
    setResults([]);
    setOpen(false);
  };

  return (
    <div className="relative z-[1200]">
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true">
          🔍
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search for a town, estate, or address…"
          className="w-full rounded-lg border border-line bg-surface py-2.5 pl-9 pr-9 text-sm text-ink placeholder:text-ink-muted focus:border-rust focus:outline-none"
        />
        {searching && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted">…</span>
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-[1200] mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-line bg-surface shadow-panel">
          {results.map((place) => (
            <li key={`${place.place_id}`}>
              <button
                type="button"
                onClick={() => handleSelect(place)}
                className="block w-full truncate px-3 py-2 text-left text-sm text-ink hover:bg-surface-raised"
                title={place.display_name}
              >
                {place.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function LocationPicker({ initialLocation, onConfirm, onClose }) {
  const [point, setPoint] = useState(
    initialLocation ? { lat: initialLocation.latitude, lng: initialLocation.longitude } : null
  );
  const [label, setLabel] = useState(initialLocation?.label || "");
  const [locating, setLocating] = useState(false);
  const [flyTarget, setFlyTarget] = useState(null);

  const handlePick = useCallback((lat, lng) => {
    setPoint({ lat, lng });
    setLabel("Looking up place name…");
    reverseGeocode(lat, lng).then((name) => {
      setLabel(name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    });
  }, []);

  const handleSearchSelect = useCallback((place) => {
    setPoint({ lat: place.lat, lng: place.lng });
    setLabel(place.label);
    setFlyTarget(place);
  }, []);

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        handlePick(lat, lng);
        setFlyTarget({ lat, lng });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Select the coconut's location on the map"
    >
      <div className="flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-surface shadow-panel ring-1 ring-line">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <h2 className="font-display text-xl text-ink">Where is this coconut?</h2>
            <p className="text-sm text-ink-muted">Search for a place, or click anywhere on the map to drop a pin.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-ink-muted hover:bg-surface-raised hover:text-ink"
            aria-label="Close map"
          >
            ✕
          </button>
        </div>

        <div className="relative z-[1200] border-b border-line px-6 py-4">
          <LocationSearchBox onResultSelected={handleSearchSelect} />
        </div>

        <div className="relative z-0 min-h-0 flex-1">
          <MapContainer
            center={point ? [point.lat, point.lng] : DEFAULT_CENTER}
            zoom={point ? PIN_ZOOM : DEFAULT_ZOOM}
            className="h-full w-full"
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ClickCapture onPick={handlePick} />
            <FlyToOnChange flyTarget={flyTarget} />
            {point && <Marker position={[point.lat, point.lng]} />}
          </MapContainer>
        </div>

        <div className="flex flex-col gap-3 border-t border-line px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={useMyLocation}
              disabled={locating}
              className="text-sm font-medium text-rust underline decoration-line-strong/60 underline-offset-4 hover:text-rust disabled:opacity-50"
            >
              {locating ? "Locating…" : "Use my current location"}
            </button>

            {point ? (
              <p className="text-right text-sm text-ink-muted">
                <span className="font-medium text-ink">{label || "Pinned location"}</span>
                <br />
                <span className="font-mono text-xs">
                  {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
                </span>
              </p>
            ) : (
              <p className="text-sm text-ink-muted">No location selected yet.</p>
            )}
          </div>

          <div className="mt-1 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-ink-muted hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!point}
              onClick={() => onConfirm({ latitude: point.lat, longitude: point.lng, label })}
              className="rounded-lg bg-palm px-5 py-2 text-sm font-medium text-bg shadow-panel transition-colors hover:bg-palm-dark disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              Confirm location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
