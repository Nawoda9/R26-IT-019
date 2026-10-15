import { useEffect, useState } from "react";
import Header from "./components/Header";
import UploadPanel from "./components/UploadPanel";
import ResultsPanel from "./components/ResultsPanel";
import ErrorBanner from "./components/ErrorBanner";
import { analyzeImage, checkHealth } from "../../api/landApi";

const DEFAULT_CONFIDENCE = 0.35;

export default function CanopySurveyModule() {
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [backendOnline, setBackendOnline] = useState(true);

  useEffect(() => {
    let cancelled = false;
    checkHealth().then((ok) => {
      if (!cancelled) setBackendOnline(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (file, options) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await analyzeImage(file, options);
      setResult(data);
      setBackendOnline(true);
    } catch (err) {
      setError(err.message || "Something went wrong while analyzing the image.");
      setBackendOnline(await checkHealth());
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header backendOnline={backendOnline} />

      <main className="max-w-6xl px-6 py-12 mx-auto w-full flex-1">
        <UploadPanel onSubmit={handleSubmit} isLoading={isLoading} defaultConfidence={DEFAULT_CONFIDENCE} />

        {error && (
          <div className="mt-6">
            <ErrorBanner message={error} />
          </div>
        )}

        <ResultsPanel result={result} />
      </main>
    </div>
  );
}
