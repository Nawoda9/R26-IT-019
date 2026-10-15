import { useCallback, useRef, useState } from "react";
import ViewfinderFrame from "./ViewfinderFrame";

const ACCEPTED = ".jpg,.jpeg,.png,.tif,.tiff,.bmp";

// The calibration controls (confidence / top-N pockets / spacing / debug
// mask) are hidden from the UI. These are the fixed values sent instead.
const DEFAULT_OPTIONS = {
  confidence: 0.35,
  topNPockets: 10,
  requiredSpacingPx: null,
  includeSanityCheck: false,
};

export default function UploadPanel({ onSubmit, isLoading, defaultConfidence = DEFAULT_OPTIONS.confidence }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const pickFile = useCallback((f) => {
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    pickFile(dropped);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!file) return;
    onSubmit(file, {
      ...DEFAULT_OPTIONS,
      confidence: Number(defaultConfidence),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6">
      {/* Dropzone / preview - the hero capture frame */}
      <div>
        <ViewfinderFrame label="01 / capture" coords={file ? file.name.slice(0, 24) : "no image loaded"} scanning={isLoading}>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`flex h-72 cursor-pointer flex-col items-center justify-center gap-3 rounded-sm p-6 text-center transition-colors sm:h-96 ${
              isDragging ? "bg-palm-light/60" : ""
            }`}
          >
            {previewUrl ? (
              <img src={previewUrl} alt="Selected aerial image preview" className="object-contain max-w-full max-h-full rounded-sm" />
            ) : (
              <>
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                  <path d="M6 28V32C6 33.1 6.9 34 8 34H32C33.1 34 34 33.1 34 32V28" stroke="#5C6B57" strokeWidth="1.5" />
                  <path d="M20 6V24M20 6L13 13M20 6L27 13" stroke="#2F5233" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="text-base font-display text-ink">Drop an aerial image, or click to browse</p>
                <p className="font-mono text-xs text-ink-muted">JPG · PNG · TIFF · BMP — up to 25MB</p>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
          </div>
        </ViewfinderFrame>
        {file && (
          <button
            type="button"
            onClick={() => {
              setFile(null);
              setPreviewUrl(null);
            }}
            className="mt-2 font-mono text-xs text-ink-muted hover:text-severity-critical"
          >
            clear selection
          </button>
        )}
      </div>

      <button
        type="submit"
        disabled={!file || isLoading}
        className="flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium transition-colors rounded-sm bg-palm font-display text-bg hover:bg-palm-dark disabled:cursor-not-allowed disabled:opacity-40 sm:w-64"
      >
        {isLoading ? "Scanning..." : "Run survey"}
      </button>
    </form>
  );
}
