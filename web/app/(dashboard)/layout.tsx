"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ChatInterface } from "@/components/chat/ChatInterface";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isChatRoute = pathname === "/chat";

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden bg-[var(--tartarus-deep)]">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-[var(--tartarus-void)] relative">
          {/* ChatInterface stays mounted, hidden when not on /chat */}
          <div
            className={`absolute inset-0 flex flex-col kronus-chamber ${isChatRoute ? "" : "hidden"}`}
          >
            <ChatInterface />
          </div>
          {/* Other page content */}
          {!isChatRoute && children}
        </main>
      </div>
    </TooltipProvider>
  );
}
