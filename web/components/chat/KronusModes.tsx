"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Zap,
  Code2,
  PenTool,
  Briefcase,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TARTARUS, popoverStyles, headerStyles } from "./config-styles";
import type { SoulConfigState } from "./SoulConfig";
import type { ToolsConfigState } from "./ToolsConfig";

// Mode definition — preset of soul context + tool categories
export interface KronusMode {
  id: string;
  name: string;
  description: string;
  icon: typeof Zap;
  color: string;
  colorGlow: string;
  soul: SoulConfigState;
  tools: ToolsConfigState;
}

// ============================================================================
// MODE PRESETS
// ============================================================================

export const KRONUS_MODES: KronusMode[] = [
  {
    id: "almighty",
    name: "Almighty",
    description: "Everything enabled",
    icon: Zap,
    color: TARTARUS.teal,
    colorGlow: TARTARUS.tealGlow,
    soul: {
      writings: true,
      portfolioProjects: true,
      skills: true,
      workExperience: true,
      education: true,
      journalEntries: true,
      linearProjects: true,
      linearIssues: true,
      linearIncludeCompleted: false,
    },
    tools: {
      journal: true,
      repository: true,
      linear: true,
      git: false,
      media: true,
      imageGeneration: false,
      webSearch: false,
    },
  },
  {
    id: "developer",
    name: "Developer",
    description: "Code, tickets, journal",
    icon: Code2,
    color: "#22c55e",
    colorGlow: "rgba(34, 197, 94, 0.15)",
    soul: {
      writings: false,
      portfolioProjects: true,
      skills: true,
      workExperience: false,
      education: false,
      journalEntries: true,
      linearProjects: true,
      linearIssues: true,
      linearIncludeCompleted: false,
    },
    tools: {
      journal: true,
      repository: true,
      linear: true,
      git: true,
      media: true,
      imageGeneration: false,
      webSearch: false,
    },
  },
  {
    id: "writer",
    name: "Writer",
    description: "Writings, creativity",
    icon: PenTool,
    color: "#9B59B6",
    colorGlow: "rgba(155, 89, 182, 0.15)",
    soul: {
      writings: true,
      portfolioProjects: false,
      skills: false,
      workExperience: false,
      education: false,
      journalEntries: false,
      linearProjects: false,
      linearIssues: false,
      linearIncludeCompleted: false,
    },
    tools: {
      journal: false,
      repository: true,
      linear: false,
      git: false,
      media: true,
      imageGeneration: true,
      webSearch: false,
    },
  },
  {
    id: "job-hunter",
    name: "Job Hunter",
    description: "CV, portfolio, tickets",
    icon: Briefcase,
    color: TARTARUS.gold,
    colorGlow: TARTARUS.goldGlow,
    soul: {
      writings: false,
      portfolioProjects: true,
      skills: true,
      workExperience: true,
      education: true,
      journalEntries: true,
      linearProjects: true,
      linearIssues: true,
      linearIncludeCompleted: false,
    },
    tools: {
      journal: true,
      repository: true,
      linear: true,
      git: false,
      media: true,
      imageGeneration: false,
      webSearch: true,
    },
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

interface KronusModesProps {
  onApply: (soul: SoulConfigState, tools: ToolsConfigState) => void;
  currentSoul: SoulConfigState;
  currentTools: ToolsConfigState;
}

function detectCurrentMode(soul: SoulConfigState, tools: ToolsConfigState): string | null {
  for (const mode of KRONUS_MODES) {
    const soulMatch = Object.keys(mode.soul).every(
      (k) => soul[k as keyof SoulConfigState] === mode.soul[k as keyof SoulConfigState]
    );
    const toolsMatch = Object.keys(mode.tools).every(
      (k) => tools[k as keyof ToolsConfigState] === mode.tools[k as keyof ToolsConfigState]
    );
    if (soulMatch && toolsMatch) return mode.id;
  }
  return null;
}

export function KronusModes({ onApply, currentSoul, currentTools }: KronusModesProps) {
  const [open, setOpen] = useState(false);
  const activeMode = detectCurrentMode(currentSoul, currentTools);

  const handleSelect = (mode: KronusMode) => {
    onApply(mode.soul, mode.tools);
    setOpen(false);
  };

  const activeModeData = KRONUS_MODES.find((m) => m.id === activeMode);
  const ActiveIcon = activeModeData?.icon ?? Zap;
  const activeColor = activeModeData?.color ?? TARTARUS.textMuted;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 transition-colors"
          style={{ color: activeMode ? activeColor : TARTARUS.textMuted }}
        >
          <ActiveIcon className="h-4 w-4" />
          <span className="hidden sm:inline">
            {activeModeData?.name ?? "Custom"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="z-[100] w-[280px] overflow-hidden rounded-xl p-0 shadow-2xl"
        align="start"
        sideOffset={8}
        style={popoverStyles.container}
      >
        <div style={popoverStyles.inner}>
          {/* Header */}
          <div
            className="px-4 py-3"
            style={{ borderBottom: `1px solid ${TARTARUS.borderSubtle}` }}
          >
            <h4 style={headerStyles.title}>Kronus Mode</h4>
            <p style={headerStyles.subtitle}>Preset soul + tools</p>
          </div>

          {/* Mode Cards */}
          <div className="space-y-1 p-2">
            {KRONUS_MODES.map((mode) => {
              const Icon = mode.icon;
              const isActive = activeMode === mode.id;

              return (
                <button
                  key={mode.id}
                  onClick={() => handleSelect(mode)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all",
                    "hover:bg-white/[0.04]"
                  )}
                  style={{
                    backgroundColor: isActive ? `${mode.color}10` : undefined,
                    border: isActive
                      ? `1px solid ${mode.color}40`
                      : "1px solid transparent",
                  }}
                >
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: isActive ? mode.colorGlow : TARTARUS.surface,
                    }}
                  >
                    <Icon
                      className="h-4 w-4"
                      style={{ color: isActive ? mode.color : TARTARUS.textDim }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span
                      className="block text-[13px] font-medium"
                      style={{ color: isActive ? mode.color : TARTARUS.text }}
                    >
                      {mode.name}
                    </span>
                    <span className="text-[11px]" style={{ color: TARTARUS.textDim }}>
                      {mode.description}
                    </span>
                  </div>
                  {isActive && (
                    <Check
                      className="h-4 w-4 shrink-0"
                      style={{ color: mode.color }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer hint */}
          <div
            className="px-4 py-2.5"
            style={{
              borderTop: `1px solid ${TARTARUS.borderSubtle}`,
              backgroundColor: TARTARUS.surface,
            }}
          >
            <p className="text-[11px]" style={{ color: TARTARUS.textDim }}>
              Overrides Soul & Tools config
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
