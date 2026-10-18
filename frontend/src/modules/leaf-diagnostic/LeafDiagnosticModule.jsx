import { useEffect, useState } from "react";
import Header from "./components/Header";
import UploadPanel from "./components/UploadPanel";
import ResultReport from "./components/ResultReport";
import { analyzeImage, checkHealth } from "../../api/wclwdApi";

export default function LeafDiagnosticModule() {
  const [health, setHealth] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    checkHealth({ signal: controller.signal })
      .then((h) => setHealth({ ok: true, classes: (h.classes || []).length }))
      .catch(() => setHealth({ ok: false, classes: 0 }));
    return () => controller.abort();
  }, []);

  const handleAnalyze = async (file) => {
    setLoading(true);
    setError(null);
    try {
      const res = await analyzeImage(file);
      setResult(res);
    } catch (e) {
      setError(e.message || "Analysis failed. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <Header healthStatus={health} />
      <main className="max-w-5xl mx-auto px-6 py-10 w-full flex-1">
        {!result ? (
          <UploadPanel onAnalyze={handleAnalyze} loading={loading} error={error} />
        ) : (
          <ResultReport result={result} onReset={() => { setResult(null); setError(null); }} />
        )}
      </main>
    </div>
  );
}
