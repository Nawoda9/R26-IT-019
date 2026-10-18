import { useEffect, useState } from "react";
import Header from "./components/Header";
import AdvisorLog from "../../components/AdvisorLog.jsx";
import DiagnosticCard from "../../components/DiagnosticCard.jsx";
import { fetchHealth } from "../../lib/api";
import { useSession } from "../../hooks/useSession";

export default function TreatmentAdvisorModule() {
  const [chatbotEnabled, setChatbotEnabled] = useState(null);
  const [pendingQuestion, setPendingQuestion] = useState(null);
  const [chatRefreshNonce, setChatRefreshNonce] = useState(0);
  const { sessionId, setSessionId, createSession } = useSession();

  useEffect(() => {
    let cancelled = false;
    fetchHealth()
      .then((data) => {
        if (!cancelled) setChatbotEnabled(Boolean(data.chatbot_enabled));
      })
      .catch((err) => {
        console.error("Health check failed:", err);
        if (!cancelled) setChatbotEnabled(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleSessionChange = (id) => {
    setPendingQuestion(null);
    if (id === null || id === undefined || id === "") return;
    setSessionId(Number(id));
  };

  const handleNewSession = async () => {
    try {
      const newSessionId = await createSession();
      setPendingQuestion(null);
      setChatRefreshNonce((value) => value + 1);
      return Number(newSessionId);
    } catch (err) {
      console.error("Failed to create new chat session:", err);
      return null;
    }
  };

  const handleNewScan = async () => handleNewSession();

  const handleAskTreatment = ({ text, sessionId: targetSessionId }) => {
    setPendingQuestion({ text, sessionId: targetSessionId, nonce: Date.now() });
  };

  return (
    <div className="min-h-screen bg-[#f4f6ef] text-[#203d2a]">
      <Header chatbotEnabled={chatbotEnabled} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <section className="mb-8">
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.22em] text-[#527653]">Coconut health intelligence</p>
          <h1 className="text-3xl font-semibold tracking-tight text-[#203d2a] sm:text-4xl">Diagnose. Understand. Take action.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-600 sm:text-base">Screen coconut leaf images for supported conditions, review the predicted result, and explore disease management guidance through the treatment advisor.</p>
        </section>

        <div className="flex flex-col gap-8 lg:gap-10">
          <section id="leaf-diagnosis" className="w-full min-w-0 scroll-mt-8">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#254a32] text-sm font-semibold text-white">01</span>
              <div><h2 className="text-xl font-semibold text-[#203d2a] sm:text-2xl">Coconut leaf analysis</h2><p className="mt-1 text-sm text-gray-500">Upload a specimen and review the model's prediction.</p></div>
            </div>
            <div className="w-full min-w-0 rounded-2xl border border-[#dce5d6] bg-white p-3 shadow-sm sm:p-5 lg:p-7">
              <DiagnosticCard onAskTreatment={handleAskTreatment} onNewScan={handleNewScan} />
            </div>
          </section>

          <section id="treatment-advisor" className="w-full min-w-0 scroll-mt-8">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#254a32] text-sm font-semibold text-white">02</span>
              <div><h2 className="text-xl font-semibold text-[#203d2a] sm:text-2xl">Coconut disease treatment advisor</h2><p className="mt-1 text-sm text-gray-500">Ask about symptoms, prevention and management in English or Sinhala.</p></div>
            </div>
            <div className="w-full min-w-0 rounded-2xl border border-[#dce5d6] bg-white p-3 shadow-sm sm:p-5 lg:p-7">
              <AdvisorLog chatbotEnabled={Boolean(chatbotEnabled)} pendingQuestion={pendingQuestion} activeSessionId={sessionId} onSessionChange={handleSessionChange} onNewSession={handleNewSession} refreshNonce={chatRefreshNonce} />
            </div>
          </section>
        </div>

        <section className="mt-8 rounded-2xl border border-[#dce5d6] bg-[#edf3e7] p-5 sm:p-6">
          <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#315c3d]">✓</span><div><h3 className="font-semibold text-[#203d2a]">Responsible use of AI-assisted guidance</h3><p className="mt-2 text-sm leading-6 text-gray-600">Predictions and chatbot responses are decision-support information, not guaranteed diagnoses or treatment outcomes. Verify important findings with field observations and a qualified coconut cultivation expert.</p></div></div>
        </section>
      </main>
    </div>
  );
}
