import { useCallback, useEffect, useRef, useState } from "react";
import {
  UploadCloud,
  Microscope,
  AlertTriangle,
  MessageCircleQuestion,
  ScanSearch,
  LoaderCircle,
  CheckCircle2,
  XCircle,
  Sparkles,
  Image as ImageIcon,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";

import { predictImage } from "../lib/api";
import SpecimenStamp, { friendlyLabel } from "./SpecimenStamp.jsx";

export default function DiagnosticCard({ onAskTreatment, onNewScan }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [scanSessionId, setScanSessionId] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const inputRef = useRef(null);

  // ---------------------------------------------------------
  // Cleanup object URLs
  // ---------------------------------------------------------
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // ---------------------------------------------------------
  // Accept image
  // ---------------------------------------------------------
  const acceptFile = useCallback((f) => {
    if (!f) return;

    if (!["image/png", "image/jpeg"].includes(f.type)) {
      setError("Please choose a PNG or JPEG image.");
      return;
    }

    if (f.size > 8 * 1024 * 1024) {
      setError("Image size must be less than 8 MB.");
      return;
    }

    setError(null);
    setResult(null);
    setScanSessionId(null);
    setFile(f);

    setPreviewUrl((oldUrl) => {
      if (oldUrl) {
        URL.revokeObjectURL(oldUrl);
      }

      return URL.createObjectURL(f);
    });
  }, []);

  // ---------------------------------------------------------
  // Drag & drop
  // ---------------------------------------------------------
  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragActive(false);

      const droppedFile = e.dataTransfer.files?.[0];

      if (droppedFile) {
        acceptFile(droppedFile);
      }
    },
    [acceptFile]
  );

  // ---------------------------------------------------------
  // Analyze
  // ---------------------------------------------------------
  const handleAnalyze = async () => {
    if (!file || loading) return;

    setLoading(true);
    setError(null);

    try {
      const data = await predictImage(file);

      setResult(data);

      if (onNewScan && !data.is_ood && !data.is_healthy) {
        const newSessionId = await onNewScan(data);
        setScanSessionId(newSessionId);
      }
    } catch (err) {
      setError(err.message || "Unable to analyze this image.");
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------
  // New image
  // ---------------------------------------------------------
  const handleReplaceImage = () => {
    setResult(null);
    setError(null);
    setScanSessionId(null);
    inputRef.current?.click();
  };

  // ---------------------------------------------------------
  // Treatment
  // ---------------------------------------------------------
  const canRequestTreatment =
    result && !result.is_ood && !result.is_healthy;

  const handleAskTreatment = () => {
    if (!canRequestTreatment) return;

    const label = friendlyLabel(result.predicted_class);

    onAskTreatment({
      text: `My coconut leaf was just diagnosed with ${label}. What treatment and management steps do you recommend?`,
      diagnosis: label,
      sessionId: scanSessionId,
    });
  };

  const diagnosisLabel = result
    ? friendlyLabel(result.predicted_class)
    : null;

  return (
    <section
      className="
        relative
        w-full
        max-w-6xl
        mx-auto
        overflow-hidden
        rounded-2xl
        border border-black/10
        bg-transparent
        text-[#1d281f]
        shadow-[0_20px_60px_rgba(0,0,0,0.08)]
      "
    >
      {/* =====================================================
          Decorative background
      ===================================================== */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#7cb342]/5 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-[#8b5e3c]/5 blur-3xl" />
      </div>

      {/* =====================================================
          Header
      ===================================================== */}

      <div className="relative border-b border-black/8 px-4 py-5 sm:px-8 sm:py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-2">
              <div
                className="
                  flex
                  h-8
                  w-8
                  shrink-0
                  items-center
                  justify-center
                  rounded-lg
                  bg-[#263c29]
                  text-[#f8f6ea]
                  shadow-sm
                "
              >
                <Microscope size={16} strokeWidth={1.8} />
              </div>

              <span
                className="
                  font-mono
                  text-[9px]
                  font-medium
                  uppercase
                  tracking-[0.22em]
                  text-[#7b756a]
                "
              >
                Diagnostic Laboratory
              </span>
            </div>

            <h2
              className="
                font-display
                text-xl
                font-medium
                tracking-tight
                text-[#18231b]
                sm:text-2xl
                lg:text-3xl
              "
            >
              Leaf Disease Analysis
            </h2>

            <p
              className="
                mt-1.5
                max-w-xl
                text-sm
                leading-relaxed
                text-[#6f746d]
              "
            >
              Upload a clear coconut leaf image for AI-assisted
              disease identification and management guidance.
            </p>
          </div>

          <div
            className="
              flex
              shrink-0
              items-center
              gap-2
              rounded-full
              border
              border-[#263c29]/10
              bg-white/50
              px-3
              py-1.5
              backdrop-blur-sm
            "
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#7cb342]" />

            <span
              className="
                font-mono
                text-[9px]
                uppercase
                tracking-widest
                text-[#596158]
                whitespace-nowrap
              "
            >
              AI Ready
            </span>
          </div>
        </div>
      </div>

      {/* =====================================================
          Main content
      ===================================================== */}

      <div className="relative p-4 sm:p-6 lg:p-8">
        {/* ===================================================
            Upload / Image
        =================================================== */}

        <div
          onClick={() => {
            if (!previewUrl) {
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              inputRef.current?.click();
            }
          }}
          className={`
            group
            relative
            min-h-[240px]
            overflow-hidden
            rounded-xl
            border
            transition-all
            duration-300
            sm:min-h-[280px]
            ${
              dragActive
                ? "border-[#7cb342] bg-[#7cb342]/10 shadow-[0_0_0_4px_rgba(124,179,66,0.10)]"
                : previewUrl
                ? "border-black/10 bg-black"
                : "border-dashed border-black/15 bg-white/20 hover:border-[#7cb342]/60 hover:bg-white/35"
            }
          `}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/png, image/jpeg"
            className="hidden"
            onChange={(e) => acceptFile(e.target.files?.[0])}
          />

          {previewUrl ? (
            <div className="relative flex min-h-[240px] items-center justify-center sm:min-h-[280px]">
              {/* Image */}
              <img
                src={previewUrl}
                alt="Uploaded coconut leaf specimen"
                className={`
                  max-h-[320px]
                  w-full
                  object-cover
                  transition-transform
                  duration-700
                  sm:max-h-[430px]
                  ${loading ? "scale-[1.02]" : "group-hover:scale-[1.01]"}
                `}
              />

              {/* Image gradient */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

              {/* Top image label */}
              <div
                className="
                  absolute
                  left-2
                  right-2
                  top-2
                  flex
                  items-start
                  justify-between
                  gap-2
                  sm:left-4
                  sm:right-4
                  sm:top-4
                "
              >
                <div
                  className="
                    flex
                    min-w-0
                    items-center
                    gap-1.5
                    rounded-full
                    border
                    border-white/20
                    bg-black/35
                    px-2.5
                    py-1.5
                    text-white
                    backdrop-blur-md
                    sm:gap-2
                    sm:px-3
                  "
                >
                  <ImageIcon size={13} className="shrink-0" />

                  <span
                    className="
                      hidden
                      truncate
                      font-mono
                      text-[9px]
                      uppercase
                      tracking-[0.16em]
                      xs:inline
                      sm:inline
                    "
                  >
                    Specimen loaded
                  </span>
                </div>

                {/* Replace image */}
                {!loading && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReplaceImage();
                    }}
                    className="
                      flex
                      shrink-0
                      items-center
                      gap-1.5
                      rounded-full
                      border
                      border-white/20
                      bg-black/35
                      px-2.5
                      py-1.5
                      text-white
                      backdrop-blur-md
                      transition-all
                      hover:bg-black/60
                      sm:gap-2
                      sm:px-3
                    "
                  >
                    <RefreshCw size={13} />

                    <span
                      className="
                        hidden
                        font-mono
                        text-[9px]
                        uppercase
                        tracking-[0.14em]
                        sm:inline
                      "
                    >
                      Replace
                    </span>
                  </button>
                )}
              </div>

              {/* Loading overlay */}
              {loading && (
                <div
                  className="
                    absolute
                    inset-0
                    flex
                    items-center
                    justify-center
                    bg-black/45
                    backdrop-blur-[2px]
                  "
                >
                  <div className="flex flex-col items-center gap-4 px-4 text-center text-white">
                    <div
                      className="
                        relative
                        flex
                        h-14
                        w-14
                        items-center
                        justify-center
                        rounded-full
                        border
                        border-white/20
                        bg-black/30
                        backdrop-blur-md
                        sm:h-16
                        sm:w-16
                      "
                    >
                      <LoaderCircle
                        size={26}
                        strokeWidth={1.5}
                        className="animate-spin"
                      />

                      <Sparkles
                        size={12}
                        className="absolute right-2 top-2"
                      />
                    </div>

                    <div>
                      <p className="text-sm font-medium">
                        Analyzing specimen
                      </p>

                      <p
                        className="
                          mt-1
                          font-mono
                          text-[9px]
                          uppercase
                          tracking-[0.18em]
                          text-white/60
                        "
                      >
                        AI diagnostic engine running
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Stamp */}
              {result && !result.is_ood && (
                <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4">
                  <SpecimenStamp result={result} />
                </div>
              )}
            </div>
          ) : (
            <div
              className="
                flex
                min-h-[240px]
                flex-col
                items-center
                justify-center
                px-5
                text-center
                sm:min-h-[280px]
                sm:px-6
              "
            >
              <div
                className={`
                  mb-5
                  flex
                  h-14
                  w-14
                  items-center
                  justify-center
                  rounded-2xl
                  border
                  shadow-sm
                  transition-all
                  duration-300
                  sm:h-16
                  sm:w-16
                  ${
                    dragActive
                      ? "scale-110 border-[#7cb342]/30 bg-[#7cb342]/10 text-[#557f2c]"
                      : "border-black/8 bg-white/40 text-[#7c817b] group-hover:-translate-y-1 group-hover:border-[#7cb342]/30 group-hover:text-[#557f2c]"
                  }
                `}
              >
                <UploadCloud size={26} strokeWidth={1.5} />
              </div>

              <h3 className="text-base font-medium text-[#29332b]">
                Drop your leaf specimen here
              </h3>

              <p className="mt-1.5 max-w-sm text-sm text-[#777b75]">
                Or tap anywhere in this area to browse your device.
              </p>

              <div
                className="
                  mt-5
                  flex
                  flex-wrap
                  items-center
                  justify-center
                  gap-2
                  rounded-full
                  border
                  border-black/8
                  bg-white/40
                  px-3
                  py-1.5
                  backdrop-blur-sm
                "
              >
                <span
                  className="
                    font-mono
                    text-[9px]
                    uppercase
                    tracking-widest
                    text-[#777b75]
                  "
                >
                  PNG
                </span>

                <span className="text-[#b4b4ad]">•</span>

                <span
                  className="
                    font-mono
                    text-[9px]
                    uppercase
                    tracking-widest
                    text-[#777b75]
                  "
                >
                  JPEG
                </span>

                <span className="text-[#b4b4ad]">•</span>

                <span
                  className="
                    font-mono
                    text-[9px]
                    uppercase
                    tracking-widest
                    text-[#777b75]
                  "
                >
                  MAX 8 MB
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ===================================================
            File information
        =================================================== */}

        {file && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="min-w-0">
              <p className="max-w-[220px] truncate text-xs font-medium text-[#404740] sm:max-w-xs">
                {file.name}
              </p>

              <p
                className="
                  mt-0.5
                  font-mono
                  text-[9px]
                  uppercase
                  tracking-wider
                  text-[#92968f]
                "
              >
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>

            {result && (
              <div className="flex shrink-0 items-center gap-1.5 text-[#6c756c]">
                <CheckCircle2 size={13} />

                <span
                  className="
                    whitespace-nowrap
                    font-mono
                    text-[9px]
                    uppercase
                    tracking-wider
                  "
                >
                  Analysis complete
                </span>
              </div>
            )}
          </div>
        )}

        {/* ===================================================
            Analyze button
        =================================================== */}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            onClick={handleAnalyze}
            disabled={!file || loading}
            className="
              group
              inline-flex
              w-full
              items-center
              justify-center
              gap-2.5
              rounded-xl
              bg-[#263c29]
              px-6
              py-3.5
              text-sm
              font-medium
              text-[#f8f6ea]
              shadow-[0_8px_24px_rgba(38,60,41,0.18)]
              transition-all
              duration-200
              hover:-translate-y-0.5
              hover:bg-[#314b35]
              hover:shadow-[0_12px_30px_rgba(38,60,41,0.24)]
              disabled:cursor-not-allowed
              disabled:opacity-35
              sm:w-auto
            "
          >
            {loading ? (
              <>
                <LoaderCircle
                  size={16}
                  className="animate-spin"
                />

                Analyzing specimen…
              </>
            ) : (
              <>
                <ScanSearch
                  size={16}
                  strokeWidth={1.8}
                />

                Analyze specimen

                <ArrowUpRight
                  size={14}
                  className="
                    transition-transform
                    group-hover:translate-x-0.5
                    group-hover:-translate-y-0.5
                  "
                />
              </>
            )}
          </button>

          {!file && (
            <p
              className="
                text-center
                font-mono
                text-[9px]
                uppercase
                tracking-wider
                text-[#9a9d96]
                sm:text-left
              "
            >
              Upload an image to begin
            </p>
          )}
        </div>

        {/* ===================================================
            Error
        =================================================== */}

        {error && (
          <div
            className="
              mt-5
              flex
              items-start
              gap-3
              rounded-xl
              border
              border-[#a94d3c]/20
              bg-[#a94d3c]/5
              px-4
              py-3.5
              text-[#8f4335]
            "
          >
            <div
              className="
                mt-0.5
                flex
                h-7
                w-7
                shrink-0
                items-center
                justify-center
                rounded-lg
                bg-[#a94d3c]/10
              "
            >
              <AlertTriangle size={15} />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-medium">
                Unable to analyze image
              </p>

              <p
                className="
                  mt-0.5
                  text-xs
                  leading-relaxed
                  text-[#8f4335]/75
                "
              >
                {error}
              </p>
            </div>
          </div>
        )}

        {/* ===================================================
            OOD Result
        =================================================== */}

        {result?.is_ood && (
          <div
            className="
              mt-7
              overflow-hidden
              rounded-xl
              border
              border-[#a94d3c]/20
              bg-[#a94d3c]/5
            "
          >
            <div className="flex flex-col items-start gap-3 p-4 sm:flex-row sm:gap-4 sm:p-5">
              <div
                className="
                  flex
                  h-11
                  w-11
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-[#a94d3c]/10
                  text-[#a94d3c]
                "
              >
                <XCircle size={22} strokeWidth={1.7} />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="
                      font-mono
                      text-[9px]
                      uppercase
                      tracking-[0.18em]
                      text-[#a94d3c]/70
                    "
                  >
                    Diagnostic boundary
                  </span>
                </div>

                <h3 className="mt-1 text-base font-semibold text-[#76382d]">
                  Image outside diagnostic scope
                </h3>

                <p
                  className="
                    mt-2
                    max-w-2xl
                    text-sm
                    leading-relaxed
                    text-[#8f4335]/80
                  "
                >
                  This image does not appear to match one of the
                  known coconut leaf conditions supported by the
                  diagnostic model. Try a clearer, closer photograph
                  of a single leaf.
                </p>
              </div>
            </div>

            <div className="border-t border-[#a94d3c]/10 px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2 text-[#8f4335]/65">
                <ScanSearch size={13} />

                <span
                  className="
                    font-mono
                    text-[9px]
                    uppercase
                    tracking-[0.14em]
                  "
                >
                  No diagnosis issued
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================
            Diagnosis Result
        =================================================== */}

        {result && !result.is_ood && (
          <div
            className="
              mt-7
              overflow-hidden
              rounded-xl
              border
              border-black/8
              bg-white/30
              backdrop-blur-sm
            "
          >
            {/* Result header */}

            <div
              className="
                flex
                flex-wrap
                items-center
                justify-between
                gap-2
                border-b
                border-black/7
                px-4
                py-3.5
                sm:px-5
              "
            >
              <div className="flex items-center gap-2">
                <div
                  className="
                    flex
                    h-6
                    w-6
                    shrink-0
                    items-center
                    justify-center
                    rounded-md
                    bg-[#263c29]
                    text-[#f8f6ea]
                  "
                >
                  <Microscope size={12} />
                </div>

                <span
                  className="
                    font-mono
                    text-[9px]
                    uppercase
                    tracking-[0.18em]
                    text-[#777c75]
                    whitespace-nowrap
                  "
                >
                  Diagnostic result
                </span>
              </div>

              {result.is_healthy ? (
                <span
                  className="
                    flex
                    shrink-0
                    items-center
                    gap-1.5
                    whitespace-nowrap
                    rounded-full
                    bg-[#7cb342]/10
                    px-2.5
                    py-1
                    font-mono
                    text-[8px]
                    uppercase
                    tracking-wider
                    text-[#587e32]
                  "
                >
                  <CheckCircle2 size={11} />
                  Healthy
                </span>
              ) : (
                <span
                  className="
                    flex
                    shrink-0
                    items-center
                    gap-1.5
                    whitespace-nowrap
                    rounded-full
                    bg-[#a94d3c]/10
                    px-2.5
                    py-1
                    font-mono
                    text-[8px]
                    uppercase
                    tracking-wider
                    text-[#934331]
                  "
                >
                  <AlertTriangle size={11} />
                  Condition detected
                </span>
              )}
            </div>

            {/* Diagnosis */}

            <div className="p-4 sm:p-5">
              <p
                className="
                  font-mono
                  text-[9px]
                  uppercase
                  tracking-[0.18em]
                  text-[#94978f]
                "
              >
                Identified condition
              </p>

              <div
                className="
                  mt-1
                  flex
                  flex-col
                  gap-4
                  sm:flex-row
                  sm:items-end
                  sm:justify-between
                "
              >
                <div className="min-w-0">
                  <h3
                    className="
                      font-display
                      text-xl
                      font-medium
                      tracking-tight
                      text-[#1d281f]
                      sm:text-2xl
                      lg:text-3xl
                    "
                  >
                    {diagnosisLabel}
                  </h3>

                  {result.is_healthy ? (
                    <p
                      className="
                        mt-2
                        flex
                        items-center
                        gap-2
                        text-sm
                        font-medium
                        text-[#587e32]
                      "
                    >
                      <CheckCircle2 size={15} className="shrink-0" />
                      This leaf appears healthy.
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-[#777c75]">
                      A supported coconut leaf condition has been
                      identified.
                    </p>
                  )}
                </div>

                {!result.is_healthy && (
                  <div className="shrink-0 self-start sm:self-auto">
                    <div
                      className="
                        rounded-lg
                        border
                        border-black/7
                        bg-[#f8f6ea]/70
                        px-3
                        py-2
                        text-left
                        sm:text-right
                      "
                    >
                      <p
                        className="
                          font-mono
                          text-[8px]
                          uppercase
                          tracking-wider
                          text-[#999c95]
                        "
                      >
                        Status
                      </p>

                      <p className="mt-0.5 whitespace-nowrap text-xs font-medium text-[#a04a39]">
                        Treatment recommended
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Treatment CTA */}

              {canRequestTreatment && (
                <div className="mt-5 border-t border-black/7 pt-5">
                  <button
                    onClick={handleAskTreatment}
                    className="
                      group
                      flex
                      w-full
                      items-center
                      justify-between
                      gap-3
                      rounded-xl
                      border
                      border-[#8b5e3c]/25
                      bg-[#8b5e3c]/5
                      px-4
                      py-3.5
                      text-left
                      transition-all
                      duration-200
                      hover:border-[#8b5e3c]/45
                      hover:bg-[#8b5e3c]/10
                      sm:w-auto
                      sm:min-w-0
                      lg:min-w-[300px]
                    "
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="
                          flex
                          h-9
                          w-9
                          shrink-0
                          items-center
                          justify-center
                          rounded-lg
                          bg-[#8b5e3c]
                          text-white
                          shadow-sm
                        "
                      >
                        <MessageCircleQuestion size={17} />
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#6e4a31]">
                          Ask advisor for treatment
                        </p>

                        <p className="mt-0.5 text-[11px] text-[#8b6c54]">
                          Get management and treatment guidance
                        </p>
                      </div>
                    </div>

                    <ArrowUpRight
                      size={16}
                      className="
                        shrink-0
                        text-[#8b5e3c]
                        transition-transform
                        group-hover:-translate-y-0.5
                        group-hover:translate-x-0.5
                      "
                    />
                  </button>
                </div>
              )}

              {/* Healthy message */}

              {result.is_healthy && (
                <div
                  className="
                    mt-5
                    flex
                    items-center
                    gap-3
                    rounded-lg
                    border
                    border-[#7cb342]/15
                    bg-[#7cb342]/5
                    px-4
                    py-3
                  "
                >
                  <CheckCircle2
                    size={17}
                    className="shrink-0 text-[#639438]"
                  />

                  <p className="text-sm font-medium text-[#557b31]">
                    No treatment is needed. Continue regular monitoring
                    and healthy coconut management practices.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* =====================================================
          Footer
      ===================================================== */}

      <div
        className="
          relative
          border-t
          border-black/7
          bg-transparent
          px-4
          py-3.5
          sm:px-8
        "
      >
        <div
          className="
            flex
            flex-col
            gap-2
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <div className="flex items-center gap-2">
            <Sparkles
              size={12}
              className="text-[#7cb342]"
            />

            <span
              className="
                font-mono
                text-[8px]
                uppercase
                tracking-[0.15em]
                text-[#888c84]
              "
            >
              AI-assisted diagnostic system
            </span>
          </div>

          <span
            className="
              font-mono
              text-[8px]
              uppercase
              tracking-[0.15em]
              text-[#aaa9a0]
            "
          >
            Results should be clinically verified
          </span>
        </div>
      </div>
    </section>
  );
}