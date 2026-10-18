import { useCallback, useRef, useState } from "react";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/bmp"];

export default function UploadPanel({ onAnalyze, loading, error }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState(null);
  const inputRef = useRef(null);

  const setSelectedFile = useCallback((f) => {
    if (!f) return;
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setLocalError("Unsupported file type. Use JPG, PNG, or BMP.");
      return;
    }
    setLocalError(null);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    setSelectedFile(e.dataTransfer.files?.[0]);
  };

  const clear = () => {
    setFile(null);
    setPreviewUrl(null);
    setLocalError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="bg-surface rounded-lg shadow-panel border border-line p-6 md:p-8">
      <div
        className={`corner-frame text-palm rounded-sm border border-dashed px-6 py-10 text-center transition-colors cursor-pointer ${
          isDragging ? "border-palm bg-palm-light/40" : "border-line-strong"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.bmp"
          className="hidden"
          onChange={(e) => setSelectedFile(e.target.files?.[0])}
        />
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Selected specimen preview"
            className="mx-auto max-h-64 rounded-sm border border-line"
          />
        ) : (
          <>
            <p className="font-mono text-xs tracking-[0.15em] text-ink-muted mb-2">
              SPECIMEN SLOT
            </p>
            <p className="text-ink font-medium">
              Drop a leaf photo here, or click to browse
            </p>
            <p className="text-ink-muted text-sm mt-1">
              JPG, PNG, or BMP &middot; up to 15 MB
            </p>
          </>
        )}
      </div>

      {(error || localError) && (
        <div className="mt-4 rounded-sm bg-[#F7E2DE] text-severity-critical text-sm px-4 py-3 font-mono">
          {error || localError}
        </div>
      )}

      <div className="mt-6 flex items-center gap-4">
        <button
          type="button"
          disabled={!file || loading}
          onClick={() => onAnalyze(file)}
          className="bg-palm text-bg font-medium px-6 py-3 rounded-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-palm-dark transition-colors"
        >
          {loading ? "Analyzing\u2026" : "Run diagnostic"}
        </button>
        {file && !loading && (
          <button
            type="button"
            onClick={clear}
            className="text-ink-muted text-sm hover:text-ink underline underline-offset-2"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
