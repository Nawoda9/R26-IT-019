import { useCallback, useRef, useState } from "react";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/bmp"];

export default function UploadPanel({ onFileSelected, previewUrl, disabled }) {
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState("");
  const inputRef = useRef(null);

  const validateAndEmit = useCallback(
    (file) => {
      if (!file) return;
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setLocalError("Please upload a JPG, PNG, WEBP, or BMP image.");
        return;
      }
      setLocalError("");
      onFileSelected(file);
    },
    [onFileSelected]
  );

  return (
    <div className="flex flex-col">
      <label
        htmlFor="coconut-file-input"
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          validateAndEmit(e.dataTransfer.files?.[0]);
        }}
        className={`bg-coir-texture group relative flex min-h-[420px] cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-lg border-2 border-dashed text-center transition-colors ${
          previewUrl ? "p-0" : "p-8"
        } ${
          isDragging
            ? "border-rust bg-rust/5"
            : "border-line hover:border-line-strong"
        } ${disabled ? "pointer-events-none opacity-60" : ""}`}
      >
        <input
          id="coconut-file-input"
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          className="sr-only"
          disabled={disabled}
          onChange={(e) => validateAndEmit(e.target.files?.[0])}
        />

        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Selected coconut"
            className="h-full w-full object-cover"
          />
        ) : (
          <>
            <span className="text-4xl" aria-hidden="true">
              🥥
            </span>
            <p className="font-display text-lg font-medium text-ink">
              Drop a coconut photo here
            </p>
            <p className="text-sm text-ink-muted">
              or <span className="font-medium text-rust underline">browse your files</span>
            </p>
            <p className="mt-1 text-xs text-ink-muted/80">
              JPG, PNG, WEBP, or BMP
            </p>
          </>
        )}
      </label>

      {previewUrl && !disabled && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-3 self-start text-sm font-medium text-ink-muted underline decoration-line-strong/60 underline-offset-4 hover:text-rust"
        >
          Choose a different photo
        </button>
      )}

      {localError && (
        <p role="alert" className="mt-3 text-sm text-severity-critical">
          {localError}
        </p>
      )}
    </div>
  );
}
