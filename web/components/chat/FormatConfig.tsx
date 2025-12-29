"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Type } from "lucide-react";
import { cn } from "@/lib/utils";

// Explicit colors for the Format config popover (avoids CSS variable issues)
const COLORS = {
  bg: "#0a0a0f",
  border: "#2a2a3a",
  text: "#e8e6e3",
  muted: "#888",
  teal: "#00CED1",
  tealDim: "#008B8B",
  gold: "#D4AF37",
};

// Font options for Kronus chat - mystical/oracle aesthetic
// Uses CSS variables from Next.js font loader (defined in layout.tsx)
export const KRONUS_FONTS = {
  inter: { name: "Inter", family: "var(--font-geist-sans), Inter, system-ui, sans-serif", style: "Modern Clean" },
  crimson: { name: "Crimson Pro", family: "var(--font-crimson-pro), 'Crimson Pro', Georgia, serif", style: "Classic Serif" },
  cormorant: { name: "Cormorant", family: "var(--font-cormorant), 'Cormorant Garamond', Georgia, serif", style: "Elegant Oracle" },
  cinzel: { name: "Cinzel", family: "var(--font-cinzel), 'Cinzel', Georgia, serif", style: "Ancient Roman" },
  ibmPlex: { name: "IBM Plex", family: "var(--font-ibm-plex), 'IBM Plex Sans', system-ui, sans-serif", style: "Tech Minimal" },
  sourceSerif: { name: "Source Serif", family: "var(--font-source-serif), 'Source Serif 4', Georgia, serif", style: "Readable Serif" },
  playfair: { name: "Playfair", family: "var(--font-playfair), 'Playfair Display', Georgia, serif", style: "Editorial Luxe" },
  spectral: { name: "Spectral", family: "var(--font-spectral), 'Spectral', Georgia, serif", style: "Literary Voice" },
} as const;

// Font size options
export const KRONUS_FONT_SIZES = {
  xs: { name: "XS", size: "12px", label: "Compact" },
  sm: { name: "SM", size: "13px", label: "Small" },
  base: { name: "M", size: "14px", label: "Default" },
  lg: { name: "LG", size: "15px", label: "Large" },
  xl: { name: "XL", size: "16px", label: "Spacious" },
} as const;

export type KronusFontSizeKey = keyof typeof KRONUS_FONT_SIZES;
export type KronusFontKey = keyof typeof KRONUS_FONTS;

export interface FormatConfigState {
  font: KronusFontKey;
  fontSize: KronusFontSizeKey;
}

interface FormatConfigProps {
  config: FormatConfigState;
  onChange: (config: FormatConfigState) => void;
}

const DEFAULT_FORMAT_CONFIG: FormatConfigState = {
  font: "inter",
  fontSize: "base",
};

export function FormatConfig({ config, onChange }: FormatConfigProps) {
  const [open, setOpen] = useState(false);

  const setFont = (font: KronusFontKey) => {
    onChange({ ...config, font });
  };

  const setFontSize = (fontSize: KronusFontSizeKey) => {
    onChange({ ...config, fontSize });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1"
        >
          <Type className="h-4 w-4" />
          Format
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 z-[100] shadow-2xl rounded-lg"
        align="start"
        sideOffset={8}
        style={{
          backgroundColor: COLORS.bg,
          border: `1px solid ${COLORS.border}`,
          color: COLORS.text
        }}
      >
        <div className="space-y-4 p-1" style={{ backgroundColor: COLORS.bg }}>
          {/* Font selector */}
          <div>
            <div className="flex items-center justify-between" style={{ marginBottom: "8px" }}>
              <span style={{ color: COLORS.text, fontSize: "14px", fontWeight: 600 }}>Chat Font</span>
              <span style={{ color: COLORS.muted, fontSize: "12px" }}>
                {KRONUS_FONTS[config.font || "inter"].style}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(KRONUS_FONTS) as KronusFontKey[]).map((fontKey) => {
                const font = KRONUS_FONTS[fontKey];
                const isSelected = (config.font || "inter") === fontKey;
                return (
                  <button
                    key={fontKey}
                    onClick={() => setFont(fontKey)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: `1px solid ${isSelected ? COLORS.teal : COLORS.border}`,
                      backgroundColor: isSelected ? "rgba(0, 206, 209, 0.1)" : "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span style={{
                      fontFamily: font.family,
                      fontSize: "13px",
                      color: isSelected ? COLORS.teal : COLORS.text,
                      display: "block",
                    }}>
                      {font.name}
                    </span>
                    <span style={{
                      fontSize: "10px",
                      color: COLORS.muted,
                    }}>
                      {font.style}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Font Size selector */}
          <div style={{ paddingTop: "12px", borderTop: `1px solid ${COLORS.border}` }}>
            <div className="flex items-center justify-between" style={{ marginBottom: "6px" }}>
              <span style={{ color: COLORS.text, fontSize: "14px", fontWeight: 600 }}>Font Size</span>
              <span style={{ color: COLORS.muted, fontSize: "12px" }}>
                {KRONUS_FONT_SIZES[config.fontSize || "base"].label}
              </span>
            </div>
            <div className="flex gap-1">
              {(Object.keys(KRONUS_FONT_SIZES) as KronusFontSizeKey[]).map((sizeKey) => {
                const sizeOption = KRONUS_FONT_SIZES[sizeKey];
                const isSelected = (config.fontSize || "base") === sizeKey;
                return (
                  <button
                    key={sizeKey}
                    onClick={() => setFontSize(sizeKey)}
                    style={{
                      flex: 1,
                      padding: "6px 4px",
                      borderRadius: "4px",
                      border: `1px solid ${isSelected ? COLORS.teal : COLORS.border}`,
                      backgroundColor: isSelected ? "rgba(0, 206, 209, 0.15)" : "transparent",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span style={{
                      fontSize: sizeOption.size,
                      color: isSelected ? COLORS.teal : COLORS.text,
                      fontWeight: isSelected ? 600 : 400,
                    }}>
                      {sizeOption.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <p style={{ fontSize: "11px", color: COLORS.muted, paddingTop: "8px" }}>
            Format changes apply immediately to the chat.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { DEFAULT_FORMAT_CONFIG };
