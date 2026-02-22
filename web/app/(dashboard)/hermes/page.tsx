import { HermesTranslator } from "@/components/hermes";
import { Languages } from "lucide-react";

export default function HermesPage() {
  return (
    <div className="flex h-full flex-col bg-[var(--tartarus-void)]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[var(--tartarus-border)] px-3 py-3 md:px-6 md:py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--tartarus-teal)]/30 bg-[var(--tartarus-teal)]/20">
          <Languages className="h-5 w-5 text-[var(--tartarus-teal)]" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-[var(--tartarus-ivory)]">Hermes</h1>
          <p className="text-sm text-[var(--tartarus-ivory-dim)]">
            The Messenger Translates · Soul over mechanic
          </p>
        </div>
      </div>

      {/* Main Interface */}
      <div className="flex-1 overflow-hidden">
        <HermesTranslator />
      </div>
    </div>
  );
}
