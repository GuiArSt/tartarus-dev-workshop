"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import {
  Wrench,
  BookOpen,
  GitBranch,
  Github,
  Briefcase,
  Image,
  Search,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TARTARUS,
  popoverStyles,
  headerStyles,
  sectionStyles,
  formatNumber,
} from "./config-styles";

// ToolsConfigState - controls which tool categories are enabled
export interface ToolsConfigState {
  journal: boolean;
  repository: boolean;
  linear: boolean;
  git: boolean;
  media: boolean;
  imageGeneration: boolean;
  webSearch: boolean;
}

interface ToolsConfigProps {
  config: ToolsConfigState;
  onChange: (config: ToolsConfigState) => void;
}

const DEFAULT_CONFIG: ToolsConfigState = {
  journal: true,
  repository: true,
  linear: true,
  git: false,
  media: true,
  imageGeneration: false,
  webSearch: false,
};

// Tool category metadata
const CORE_TOOLS = [
  {
    key: "journal",
    name: "Journal",
    icon: BookOpen,
    description: "Entries & summaries",
    count: 12,
  },
  {
    key: "repository",
    name: "Repository",
    icon: GitBranch,
    description: "Docs, skills, CV",
    count: 11,
  },
  { key: "linear", name: "Linear", icon: Briefcase, description: "Issues & projects", count: 7 },
  { key: "git", name: "Git", icon: Github, description: "GitHub/GitLab repos", count: 3 },
  { key: "media", name: "Media", icon: Image, description: "Asset management", count: 3 },
] as const;

const MULTIMODAL_TOOLS = [
  {
    key: "imageGeneration",
    name: "Image Gen",
    icon: Sparkles,
    description: "FLUX, Gemini, Imagen",
    count: 1,
  },
  { key: "webSearch", name: "Web Search", icon: Search, description: "Perplexity AI", count: 4 },
] as const;

export function ToolsConfig({ config, onChange }: ToolsConfigProps) {
  const [open, setOpen] = useState(false);

  const toggleCategory = (category: keyof ToolsConfigState) => {
    onChange({ ...config, [category]: !config[category] });
  };

  const enableAll = () => {
    onChange({
      journal: true,
      repository: true,
      linear: true,
      git: true,
      media: true,
      imageGeneration: true,
      webSearch: true,
    });
  };

  const enableCore = () => {
    onChange({
      journal: true,
      repository: true,
      linear: true,
      git: false,
      media: true,
      imageGeneration: false,
      webSearch: false,
    });
  };

  // Count enabled tools
  const enabledToolCount = [
    ...(config.journal ? [12] : []),
    ...(config.repository ? [11] : []),
    ...(config.linear ? [7] : []),
    ...(config.git ? [3] : []),
    ...(config.media ? [3] : []),
    ...(config.imageGeneration ? [1] : []),
    ...(config.webSearch ? [4] : []),
  ].reduce((a, b) => a + b, 0);

  const hasMultimodal = config.imageGeneration || config.webSearch;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "gap-1.5 transition-colors",
            hasMultimodal ? "text-[#9B59B6]" : "text-[#888899]"
          )}
        >
          <Wrench className="h-4 w-4" />
          <span className="hidden sm:inline">Tools</span>
          <span
            className="rounded-full px-1.5 py-0.5 font-mono text-[10px]"
            style={{
              backgroundColor: hasMultimodal ? TARTARUS.purpleGlow : TARTARUS.surface,
              color: hasMultimodal ? TARTARUS.purple : TARTARUS.textMuted,
            }}
          >
            {enabledToolCount}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="z-[100] w-[320px] overflow-hidden rounded-xl p-0 shadow-2xl"
        align="start"
        sideOffset={8}
        style={popoverStyles.container}
      >
        <div style={popoverStyles.inner}>
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: `1px solid ${TARTARUS.borderSubtle}` }}
          >
            <div>
              <h4 style={headerStyles.title}>Tool Categories</h4>
              <p style={headerStyles.subtitle}>Available capabilities</p>
            </div>
            <div className="flex gap-1">
              <button
                onClick={enableCore}
                className="rounded hover:bg-white/5"
                style={headerStyles.actionButton}
              >
                Core
              </button>
              <button
                onClick={enableAll}
                className="rounded hover:bg-white/5"
                style={headerStyles.actionButton}
              >
                All
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-4 px-4 py-3">
            {/* Core Tools */}
            <div>
              <div style={sectionStyles.label}>Core</div>
              <div className="space-y-1">
                {CORE_TOOLS.map(({ key, name, icon: Icon, description, count }) => {
                  const enabled = config[key as keyof ToolsConfigState];
                  return (
                    <div
                      key={key}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-white/[0.03]"
                      onClick={() => toggleCategory(key as keyof ToolsConfigState)}
                    >
                      <Switch
                        checked={enabled}
                        onCheckedChange={() => toggleCategory(key as keyof ToolsConfigState)}
                        className="data-[state=checked]:bg-[#00CED1] data-[state=unchecked]:bg-[var(--tartarus-surface)]"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Icon
                        className="h-4 w-4 transition-colors"
                        style={{ color: enabled ? TARTARUS.teal : TARTARUS.textDim }}
                      />
                      <div className="min-w-0 flex-1">
                        <span
                          className="block text-[13px] font-medium transition-colors"
                          style={{ color: enabled ? TARTARUS.text : TARTARUS.textMuted }}
                        >
                          {name}
                        </span>
                        <span className="text-[11px]" style={{ color: TARTARUS.textDim }}>
                          {description}
                        </span>
                      </div>
                      <span
                        className="rounded px-2 py-0.5 font-mono text-[11px]"
                        style={{
                          color: TARTARUS.textDim,
                          backgroundColor: TARTARUS.surface,
                        }}
                      >
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Multimodal Tools */}
            <div style={sectionStyles.divider}>
              <div style={{ ...sectionStyles.label, color: TARTARUS.purple }}>Multimodal</div>
              <div className="space-y-1">
                {MULTIMODAL_TOOLS.map(({ key, name, icon: Icon, description, count }) => {
                  const enabled = config[key as keyof ToolsConfigState];
                  return (
                    <div
                      key={key}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-white/[0.03]"
                      onClick={() => toggleCategory(key as keyof ToolsConfigState)}
                    >
                      <Switch
                        checked={enabled}
                        onCheckedChange={() => toggleCategory(key as keyof ToolsConfigState)}
                        className="data-[state=checked]:bg-[#9B59B6] data-[state=unchecked]:bg-[var(--tartarus-surface)]"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Icon
                        className="h-4 w-4 transition-colors"
                        style={{ color: enabled ? TARTARUS.purple : TARTARUS.textDim }}
                      />
                      <div className="min-w-0 flex-1">
                        <span
                          className="block text-[13px] font-medium transition-colors"
                          style={{ color: enabled ? TARTARUS.text : TARTARUS.textMuted }}
                        >
                          {name}
                        </span>
                        <span className="text-[11px]" style={{ color: TARTARUS.textDim }}>
                          {description}
                        </span>
                      </div>
                      <span
                        className="rounded px-2 py-0.5 font-mono text-[11px]"
                        style={{
                          color: TARTARUS.textDim,
                          backgroundColor: TARTARUS.surface,
                        }}
                      >
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{
              borderTop: `1px solid ${TARTARUS.borderSubtle}`,
              backgroundColor: TARTARUS.surface,
            }}
          >
            <span className="text-[12px]" style={{ color: TARTARUS.textMuted }}>
              Total tools enabled
            </span>
            <span
              className="font-mono text-[13px] font-medium"
              style={{ color: hasMultimodal ? TARTARUS.purple : TARTARUS.teal }}
            >
              {enabledToolCount}
            </span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { DEFAULT_CONFIG };
