import { LogoMark } from "./Logo";
import { ErrorState } from "@/components/ui/feedback";

export function Splash({ error, onRetry }: { error?: unknown; onRetry?: () => void }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg p-6">
      {error ? (
        <ErrorState error={error} onRetry={onRetry} className="max-w-md" />
      ) : (
        <div className="flex flex-col items-center gap-4" role="status">
          <LogoMark size={56} className="animate-pulse-soft" />
          <span className="sr-only">Chargement de SaytuMbay…</span>
        </div>
      )}
    </div>
  );
}
