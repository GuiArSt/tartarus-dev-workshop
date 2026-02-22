"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  BookOpen,
  Moon,
  Sun,
  LogOut,
  Settings,
  Archive,
  Scissors,
  Languages,
  PanelLeftClose,
  PanelLeft,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useState, useEffect } from "react";
import { DatabaseOperations } from "@/components/db/DatabaseOperations";
import { useIsMobile } from "@/hooks/useMobile";

const navItems = [
  {
    title: "Chat",
    href: "/chat",
    icon: MessageSquare,
    description: "Talk with Kronus",
  },
  {
    title: "Reader",
    href: "/reader",
    icon: BookOpen,
    description: "Browse journal entries",
  },
  {
    title: "Atropos",
    href: "/atropos",
    icon: Scissors,
    description: "The fate that corrects",
  },
  {
    title: "Hermes",
    href: "/hermes",
    icon: Languages,
    description: "The messenger translates",
  },
  {
    title: "Repository",
    href: "/repository",
    icon: Archive,
    description: "Unified knowledge base",
  },
];

// Page title mapping for mobile header
const pageTitles: Record<string, string> = {
  "/chat": "Kronus",
  "/reader": "Reader",
  "/atropos": "Atropos",
  "/hermes": "Hermes",
  "/repository": "Repository",
  "/kronus": "Kronus History",
  "/multimedia": "Multimedia",
  "/prompts": "Prompts",
  "/integrations": "Integrations",
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  // Check prefix matches for dynamic routes
  for (const [prefix, title] of Object.entries(pageTitles)) {
    if (pathname.startsWith(prefix + "/")) return title;
  }
  return "Tartarus";
}

/** Shared sidebar content used by both desktop sidebar and mobile drawer */
function SidebarContent({
  expanded,
  isDark,
  toggleTheme,
  handleLogout,
  isPinned,
  togglePinned,
  showPinToggle,
  onNavigate,
}: {
  expanded: boolean;
  isDark: boolean;
  toggleTheme: () => void;
  handleLogout: () => void;
  isPinned: boolean;
  togglePinned: () => void;
  showPinToggle: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Logo / Brand */}
      <div
        className={cn(
          "flex h-16 items-center border-b border-[var(--tartarus-border)]",
          expanded ? "px-6" : "justify-center px-2"
        )}
      >
        <Link href="/chat" className="flex items-center gap-3" onClick={onNavigate}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--tartarus-gold)] bg-[var(--tartarus-surface)] shadow-[0_0_12px_var(--tartarus-teal-glow),_0_0_4px_var(--tartarus-gold-glow)]">
            <img
              src="/chronus-logo.png"
              alt="Tartarus"
              className="h-full w-full object-cover"
              style={{ filter: "brightness(1.4) contrast(1.1)" }}
            />
          </div>
          {expanded && (
            <span className="text-gradient-teal-gold text-lg font-semibold tracking-tight">
              Tartarus
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className={cn("flex-1 space-y-1", expanded ? "p-4" : "p-2")}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

          if (!expanded) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "tartarus-sidebar-item flex items-center justify-center rounded-md p-2.5 transition-colors",
                      isActive && "active"
                    )}
                    onClick={onNavigate}
                  >
                    <item.icon
                      className={cn("h-5 w-5", isActive ? "text-[var(--tartarus-teal)]" : "")}
                    />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-muted-foreground text-xs">{item.description}</p>
                </TooltipContent>
              </Tooltip>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "tartarus-sidebar-item flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                isActive && "active"
              )}
              onClick={onNavigate}
            >
              <item.icon
                className={cn("h-5 w-5 shrink-0", isActive ? "text-[var(--tartarus-teal)]" : "")}
              />
              <div className="flex min-w-0 flex-col">
                <span>{item.title}</span>
                <span className="truncate text-xs text-[var(--tartarus-ivory-faded)]">
                  {item.description}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      <Separator className="bg-[var(--tartarus-border)]" />

      {/* Footer Actions */}
      <div className={cn("space-y-2", expanded ? "p-4" : "p-2")}>
        {/* Pin/Unpin toggle - only show when expanded on desktop */}
        {showPinToggle && expanded && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-[var(--tartarus-ivory-dim)] hover:bg-[var(--tartarus-surface)] hover:text-[var(--tartarus-ivory)]"
            onClick={togglePinned}
          >
            {isPinned ? (
              <>
                <PanelLeftClose className="h-4 w-4" />
                Unpin
              </>
            ) : (
              <>
                <PanelLeft className="h-4 w-4" />
                Pin Sidebar
              </>
            )}
          </Button>
        )}

        {/* Settings Dialog */}
        <Dialog>
          <DialogTrigger asChild>
            {!expanded ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-center p-2 text-[var(--tartarus-ivory-dim)] hover:bg-[var(--tartarus-surface)] hover:text-[var(--tartarus-ivory)]"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Settings</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-[var(--tartarus-ivory-dim)] hover:bg-[var(--tartarus-surface)] hover:text-[var(--tartarus-ivory)]"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            )}
          </DialogTrigger>
          <DialogContent className="max-w-lg border-[var(--tartarus-border)] bg-[var(--tartarus-surface)]">
            <DialogHeader>
              <DialogTitle className="text-[var(--tartarus-ivory)]">Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <DatabaseOperations />
            </div>
          </DialogContent>
        </Dialog>

        {/* Theme toggle */}
        {!expanded ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center p-2 text-[var(--tartarus-ivory-dim)] hover:bg-[var(--tartarus-surface)] hover:text-[var(--tartarus-gold)]"
                onClick={toggleTheme}
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{isDark ? "Light Mode" : "Dark Mode"}</TooltipContent>
          </Tooltip>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-[var(--tartarus-ivory-dim)] hover:bg-[var(--tartarus-surface)] hover:text-[var(--tartarus-gold)]"
            onClick={toggleTheme}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {isDark ? "Light Mode" : "Dark Mode"}
          </Button>
        )}

        {/* Logout */}
        {!expanded ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center p-2 text-[var(--tartarus-ivory-dim)] hover:bg-[var(--tartarus-surface)] hover:text-[var(--tartarus-error)]"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Logout</TooltipContent>
          </Tooltip>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-[var(--tartarus-ivory-dim)] hover:bg-[var(--tartarus-surface)] hover:text-[var(--tartarus-error)]"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        )}
      </div>
    </>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const [isDark, setIsDark] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark");
    setIsDark(isDarkMode);

    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }

    const savedPinned = localStorage.getItem("sidebar-pinned");
    if (savedPinned === "true") {
      setIsPinned(true);
    }
  }, []);

  // Close sheet on navigation
  useEffect(() => {
    setSheetOpen(false);
  }, [pathname]);

  const showExpanded = isPinned || isHovered;

  const togglePinned = () => {
    const newPinned = !isPinned;
    setIsPinned(newPinned);
    localStorage.setItem("sidebar-pinned", newPinned ? "true" : "false");
  };

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    document.documentElement.classList.toggle("dark", newIsDark);
    localStorage.setItem("theme", newIsDark ? "dark" : "light");
    window.dispatchEvent(new CustomEvent("theme-change", { detail: { isDark: newIsDark } }));
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  // Mobile: Sheet drawer + top header bar
  if (isMobile) {
    return (
      <>
        {/* Mobile top bar */}
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--tartarus-border)] bg-[var(--tartarus-deep)] px-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 text-[var(--tartarus-ivory-dim)]"
            onClick={() => setSheetOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--tartarus-gold)] bg-[var(--tartarus-surface)]">
              <img
                src="/chronus-logo.png"
                alt="Tartarus"
                className="h-full w-full object-cover"
                style={{ filter: "brightness(1.4) contrast(1.1)" }}
              />
            </div>
            <span className="text-sm font-medium text-[var(--tartarus-ivory)]">
              {getPageTitle(pathname)}
            </span>
          </div>
        </div>

        {/* Mobile sheet drawer */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="w-64 border-[var(--tartarus-border)] bg-[var(--tartarus-deep)] p-0"
          >
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="flex h-full flex-col">
              <SidebarContent
                expanded={true}
                isDark={isDark}
                toggleTheme={toggleTheme}
                handleLogout={handleLogout}
                isPinned={false}
                togglePinned={() => {}}
                showPinToggle={false}
                onNavigate={() => setSheetOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop: hover-expand sidebar
  return (
    <div
      className={cn(
        "tartarus-sidebar flex h-full flex-col bg-[var(--tartarus-deep)] transition-all duration-200",
        showExpanded ? "w-64" : "w-16"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <SidebarContent
        expanded={showExpanded}
        isDark={isDark}
        toggleTheme={toggleTheme}
        handleLogout={handleLogout}
        isPinned={isPinned}
        togglePinned={togglePinned}
        showPinToggle={true}
      />
    </div>
  );
}
