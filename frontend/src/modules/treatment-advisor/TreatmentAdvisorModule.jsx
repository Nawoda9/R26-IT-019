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

  // Check backend health and whether the chatbot is enabled.
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

    return () => {
      cancelled = true;
    };
  }, []);

  // User picks a previous conversation from the sidebar.
  const handleSessionChange = (id) => {
    setPendingQuestion(null);

    if (id === null || id === undefined || id === "") return;
    setSessionId(Number(id));
  };

  // User clicks "+ New conversation".
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

  // DiagnosticCard ("Entry 01") just finished a scan and wants its own
  // advisor session, isolated from whatever conversation was previously
  // active. Reuses the same session-creation path as "+ New conversation".
  const handleNewScan = async () => {
    return handleNewSession();
  };

  // User clicked "Ask advisor for treatment" on the diagnosis result.
  // AdvisorLog watches pendingQuestion.nonce to know this is a fresh ask
  // (even if the text is identical to a previous one), then sends it to
  // pendingQuestion.sessionId - the exact session DiagnosticCard just
  // created for this scan.
  const handleAskTreatment = ({ text, sessionId: targetSessionId }) => {
    setPendingQuestion({ text, sessionId: targetSessionId, nonce: Date.now() });
  };

  return (
    <div className="flex flex-col flex-1">
      <Header chatbotEnabled={chatbotEnabled} />
      <main className="max-w-6xl mx-auto px-6 py-10 w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <DiagnosticCard onAskTreatment={handleAskTreatment} onNewScan={handleNewScan} />
          <AdvisorLog
            chatbotEnabled={Boolean(chatbotEnabled)}
            pendingQuestion={pendingQuestion}
            activeSessionId={sessionId}
            onSessionChange={handleSessionChange}
            onNewSession={handleNewSession}
            refreshNonce={chatRefreshNonce}
          />
        </div>
      </main>
    </div>
  );
}