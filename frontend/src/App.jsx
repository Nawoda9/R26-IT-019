import { useState } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import AuthGate from "./components/AuthGate.jsx";
import Home from "./pages/Home";
import LeafDiagnosticModule from "./modules/leaf-diagnostic/LeafDiagnosticModule";
import CanopySurveyModule from "./modules/canopy-survey/CanopySurveyModule";
import VarietyClassifierModule from "./modules/variety-classifier/VarietyClassifierModule";
import TreatmentAdvisorModule from "./modules/treatment-advisor/TreatmentAdvisorModule";
import { useAuth } from "./hooks/useAuth.js";

const PAGE_COMPONENTS = {
  home: Home,
  leaf: LeafDiagnosticModule,
  canopy: CanopySurveyModule,
  variety: VarietyClassifierModule,
  advisor: TreatmentAdvisorModule,
};

export default function App() {
  const [active, setActive] = useState("home");
  const { user, checking, login, register, logout } = useAuth();

  // Authentication/loading state.
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <p className="font-mono text-xs tracking-[0.2em] text-ink-muted uppercase">
          Loading…
        </p>
      </div>
    );
  }

  // User is not authenticated.
  if (!user) {
    return <AuthGate onLogin={login} onRegister={register} />;
  }

  // Main application.
  const ActivePage = PAGE_COMPONENTS[active];

  return (
    <div className="min-h-screen flex flex-col">
      <Header active={active} onChange={setActive} user={user} onLogout={logout} />
      <ActivePage onNavigate={setActive} user={user} />
      <Footer onNavigate={setActive} />
    </div>
  );
}