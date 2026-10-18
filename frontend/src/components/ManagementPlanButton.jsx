
import { useState } from "react";
import { getManagementPlan } from "../lib/managementRules";

export default function ManagementPlanButton({ result }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!result) return null;

  // Update these field names if your backend uses different names.
  const symptom =
    result.predicted_class ??
    result.classification ??
    result.symptom ??
    result.prediction;

  const severityValue = result.severity;
  const severity =
    result.severity_level ??
    result.severityLabel ??
    (typeof severityValue === "string"
      ? severityValue
      : severityValue?.level ?? severityValue?.label);

  const isOOD = Boolean(
    result.ood ??
    result.is_ood ??
    result.out_of_distribution
  );

  const isHealthy =
    String(symptom ?? "").toLowerCase().includes("healthy") ||
    result.healthy === true;

  const plan = getManagementPlan(symptom, severity);

  // Do not offer a disease action for healthy or out-of-distribution images.
  if (isOOD || isHealthy) return null;

  return (
    <section className="mt-6 rounded-xl border border-emerald-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-display text-xl font-medium text-ink">
            Recommended Management Action
          </h3>
          <p className="mt-1 text-sm text-ink-muted">
            View suggested next steps based on the assessment.
          </p>
        </div>

      
   
    <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        disabled={!plan}
        className="rounded-sm border border-[#087F5B] bg-[#087F5B] px-4 py-2.5
             font-mono text-xs tracking-wide text-white
             transition-colors hover:bg-[#066649]
             disabled:cursor-not-allowed disabled:opacity-50"
    >
        {isOpen ? "HIDE RECOMMENDED ACTION" : "VIEW RECOMMENDED ACTION"}
    </button>


      </div>

      {!plan && (
        <p className="mt-3 text-sm text-amber-700">
          A recommended action is not available because the symptom or severity
          label could not be matched. Check the result fields and severity labels.
        </p>
      )}

      {isOpen && plan && (
        <div className="mt-5 border-t border-gray-200 pt-5">
          <div className="mb-4">
            <h4 className="font-display text-lg font-medium text-ink">
              {plan.title}
            </h4>
            <p className="mt-1 text-sm text-ink-muted">
              Priority: {plan.priority}
            </p>
          </div>

          <h5 className="mt-5 font-display text-base font-medium text-ink">
            Recommended next steps
          </h5>

          <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm leading-6 text-ink-mute">
            {plan.actions.map((action, index) => (
              <li key={index}>{action}</li>
            ))}
          </ol>

          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-semibold text-amber-900">
              Important note
            </p>
            <p className="mt-1 text-sm leading-6 text-amber-900">
              {plan.note}
            </p>
          </div>

          <p className="mt-3 text-xs leading-5 text-gray-500">
            This is decision-support guidance, not a confirmed diagnosis or
            treatment prescription. Follow current CRI guidance and advice from
            a qualified coconut agricultural officer.
          </p>
        </div>
      )}
    </section>
  );
}
