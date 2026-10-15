export default function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-3 rounded-sm border border-severity-critical/30 bg-[#F7E2DE] px-4 py-3 font-mono text-sm text-severity-critical">
      <span aria-hidden="true">▲</span>
      <span>{message}</span>
    </div>
  );
}
