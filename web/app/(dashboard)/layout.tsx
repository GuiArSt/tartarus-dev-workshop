import { Sidebar } from "@/components/layout/Sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden bg-[var(--tartarus-deep)]">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-[var(--tartarus-void)]">{children}</main>
      </div>
    </TooltipProvider>
  );
}
