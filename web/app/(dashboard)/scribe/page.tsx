import { SpellcheckInterface } from "@/components/scribe/SpellcheckInterface";
import { PenLine } from "lucide-react";

export default function ScribePage() {
  return (
    <div className="flex flex-col h-full bg-[var(--tartarus-bg)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--tartarus-border)]">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--tartarus-teal)]/20 border border-[var(--tartarus-teal)]/30">
          <PenLine className="h-5 w-5 text-[var(--tartarus-teal)]" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-[var(--tartarus-ivory)]">
            Scribe
          </h1>
          <p className="text-sm text-[var(--tartarus-ivory-dim)]">
            The Memory-Keeper's Quill · Spellcheck that learns your style
          </p>
        </div>
      </div>

      {/* Main Interface */}
      <div className="flex-1 overflow-hidden">
        <SpellcheckInterface />
      </div>
    </div>
  );
}
