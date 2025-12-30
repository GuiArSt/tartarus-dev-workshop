"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Wrench, BookOpen, GitBranch, Briefcase, Image, Search } from "lucide-react";
import { cn } from "@/lib/utils";

// Explicit colors for the Tools config popover (Tartarus palette)
const COLORS = {
  bg: "#0a0a0f",
  border: "#2a2a3a",
  text: "#e8e6e3",
  muted: "#888",
  teal: "#00CED1",
  tealDim: "#008B8B",
  gold: "#D4AF37",
  purple: "#9B59B6",
  switchOff: "#1a1a1a",
};

// ToolsConfigState - controls which tool categories are enabled
export interface ToolsConfigState {
  journal: boolean;
  repository: boolean;
  linear: boolean;
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
  media: true,
  imageGeneration: false,
  webSearch: false,
};

// Tool category metadata
const TOOL_CATEGORIES = {
  journal: {
    name: "Journal",
    icon: BookOpen,
    description: "Entries, summaries, backups",
    toolCount: 12,
    heavy: false,
  },
  repository: {
    name: "Repository",
    icon: GitBranch,
    description: "Documents, skills, CV",
    toolCount: 11,
    heavy: false,
  },
  linear: {
    name: "Linear",
    icon: Briefcase,
    description: "Issues, projects",
    toolCount: 6,
    heavy: false,
  },
  media: {
    name: "Media",
    icon: Image,
    description: "Save, list, update images",
    toolCount: 3,
    heavy: false,
  },
  imageGeneration: {
    name: "Image Gen",
    icon: Image,
    description: "FLUX, Gemini, Imagen",
    toolCount: 1,
    heavy: true,
    apiRequired: "REPLICATE_API_TOKEN",
  },
  webSearch: {
    name: "Web Search",
    icon: Search,
    description: "Perplexity search & research",
    toolCount: 4,
    heavy: true,
    apiRequired: "PERPLEXITY_API_KEY",
  },
} as const;

export function ToolsConfig({ config, onChange }: ToolsConfigProps) {
  const [open, setOpen] = useState(false);

  const toggleCategory = (category: keyof ToolsConfigState) => {
    const newConfig = { ...config, [category]: !config[category] };
    onChange(newConfig);
  };

  const enableAll = () => {
    onChange({
      journal: true,
      repository: true,
      linear: true,
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
      media: true,
      imageGeneration: false,
      webSearch: false,
    });
  };

  // Count enabled tools
  const enabledToolCount = Object.entries(config).reduce((sum, [key, enabled]) => {
    if (enabled) {
      const category = TOOL_CATEGORIES[key as keyof typeof TOOL_CATEGORIES];
      return sum + category.toolCount;
    }
    return sum;
  }, 0);

  const hasHeavyTools = config.imageGeneration || config.webSearch;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("gap-1", hasHeavyTools && "text-[var(--kronus-purple)]")}
        >
          <Wrench className="h-4 w-4" />
          Tools
          <span
            className={cn(
              "text-xs px-1.5 py-0.5 rounded",
              hasHeavyTools
                ? "bg-[var(--kronus-purple)]/20"
                : "bg-muted/20"
            )}
          >
            {enabledToolCount}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 z-[100] shadow-2xl rounded-lg"
        align="start"
        sideOffset={8}
        style={{
          backgroundColor: COLORS.bg,
          border: `1px solid ${COLORS.border}`,
          color: COLORS.text,
        }}
      >
        <div className="space-y-4 p-1" style={{ backgroundColor: COLORS.bg }}>
          <div className="flex items-center justify-between">
            <h4 style={{ fontWeight: 600, color: COLORS.text, fontSize: "14px" }}>
              Tool Categories
            </h4>
            <div className="flex gap-1">
              <button
                onClick={enableCore}
                style={{
                  fontSize: "12px",
                  padding: "2px 8px",
                  color: COLORS.muted,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Core
              </button>
              <button
                onClick={enableAll}
                style={{
                  fontSize: "12px",
                  padding: "2px 8px",
                  color: COLORS.muted,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                All
              </button>
            </div>
          </div>

          <p style={{ fontSize: "12px", color: COLORS.muted }}>
            Changes apply to your next new chat.
          </p>

          <div className="space-y-3">
            {/* Core Tools */}
            <div style={{ fontSize: "11px", color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Core
            </div>

            {(["journal", "repository", "linear", "media"] as const).map((key) => {
              const category = TOOL_CATEGORIES[key];
              const Icon = category.icon;
              return (
                <div key={key} className="flex items-center gap-3">
                  <Switch
                    checked={config[key]}
                    onCheckedChange={() => toggleCategory(key)}
                    style={{ backgroundColor: config[key] ? COLORS.teal : COLORS.switchOff }}
                  />
                  <Icon className="h-4 w-4" style={{ color: config[key] ? COLORS.teal : COLORS.muted }} />
                  <div className="flex-1">
                    <span
                      style={{
                        color: config[key] ? COLORS.teal : COLORS.muted,
                        fontSize: "14px",
                        transition: "color 0.2s",
                      }}
                    >
                      {category.name}
                    </span>
                    <span style={{ color: COLORS.muted, fontSize: "12px", marginLeft: "8px" }}>
                      {category.description}
                    </span>
                  </div>
                  <span style={{ color: COLORS.muted, fontSize: "12px" }}>{category.toolCount}</span>
                </div>
              );
            })}

            {/* Multimodal Capabilities */}
            <div
              style={{
                fontSize: "11px",
                color: COLORS.purple,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginTop: "12px",
              }}
            >
              Multimodal Capabilities
            </div>

            {(["imageGeneration", "webSearch"] as const).map((key) => {
              const category = TOOL_CATEGORIES[key];
              const Icon = category.icon;
              return (
                <div key={key} className="flex items-center gap-3">
                  <Switch
                    checked={config[key]}
                    onCheckedChange={() => toggleCategory(key)}
                    style={{ backgroundColor: config[key] ? COLORS.purple : COLORS.switchOff }}
                  />
                  <Icon className="h-4 w-4" style={{ color: config[key] ? COLORS.purple : COLORS.muted }} />
                  <div className="flex-1">
                    <span
                      style={{
                        color: config[key] ? COLORS.purple : COLORS.muted,
                        fontSize: "14px",
                        transition: "color 0.2s",
                      }}
                    >
                      {category.name}
                    </span>
                    <span style={{ color: COLORS.muted, fontSize: "12px", marginLeft: "8px" }}>
                      {category.description}
                    </span>
                  </div>
                  <span style={{ color: COLORS.muted, fontSize: "12px" }}>{category.toolCount}</span>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div style={{ paddingTop: "12px", borderTop: `1px solid ${COLORS.border}` }}>
            <div className="flex items-center justify-between" style={{ fontSize: "14px" }}>
              <span style={{ color: COLORS.muted }}>Total tools:</span>
              <span
                style={{
                  fontFamily: "monospace",
                  color: hasHeavyTools ? COLORS.purple : COLORS.teal,
                }}
              >
                {enabledToolCount}
              </span>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { DEFAULT_CONFIG };
