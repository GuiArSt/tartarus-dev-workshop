"use client";

import { memo, useState } from "react";
import {
  Cpu,
  Palette,
  Database,
  Server,
  PenTool,
  Users,
  Tag,
  Briefcase,
  Code,
  BookOpen,
  GraduationCap,
} from "lucide-react";
import { getSkillIconUrl } from "@/lib/skill-icons";

// Available Lucide icons for categories
export const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  cpu: <Cpu className="h-4 w-4" />,
  palette: <Palette className="h-4 w-4" />,
  database: <Database className="h-4 w-4" />,
  server: <Server className="h-4 w-4" />,
  "pen-tool": <PenTool className="h-4 w-4" />,
  users: <Users className="h-4 w-4" />,
  tag: <Tag className="h-4 w-4" />,
  briefcase: <Briefcase className="h-4 w-4" />,
  code: <Code className="h-4 w-4" />,
  "book-open": <BookOpen className="h-4 w-4" />,
  "graduation-cap": <GraduationCap className="h-4 w-4" />,
};

// Available colors for categories
export const CATEGORY_COLORS = [
  "violet",
  "pink",
  "blue",
  "orange",
  "emerald",
  "amber",
  "red",
  "cyan",
  "indigo",
  "teal",
  "rose",
  "lime",
] as const;

// Generate color classes from color name (dark-mode native)
export function getColorClasses(color: string) {
  const colorMap: Record<string, { color: string; bgColor: string; barColor: string }> = {
    violet: {
      color: "text-violet-400",
      bgColor: "bg-violet-900/30 border-violet-800",
      barColor: "bg-violet-500",
    },
    pink: {
      color: "text-pink-400",
      bgColor: "bg-pink-900/30 border-pink-800",
      barColor: "bg-pink-500",
    },
    blue: {
      color: "text-blue-400",
      bgColor: "bg-blue-900/30 border-blue-800",
      barColor: "bg-blue-500",
    },
    orange: {
      color: "text-orange-400",
      bgColor: "bg-orange-900/30 border-orange-800",
      barColor: "bg-orange-500",
    },
    emerald: {
      color: "text-emerald-400",
      bgColor: "bg-emerald-900/30 border-emerald-800",
      barColor: "bg-emerald-500",
    },
    amber: {
      color: "text-amber-400",
      bgColor: "bg-amber-900/30 border-amber-800",
      barColor: "bg-amber-500",
    },
    red: {
      color: "text-red-400",
      bgColor: "bg-red-900/30 border-red-800",
      barColor: "bg-red-500",
    },
    cyan: {
      color: "text-cyan-400",
      bgColor: "bg-cyan-900/30 border-cyan-800",
      barColor: "bg-cyan-500",
    },
    indigo: {
      color: "text-indigo-400",
      bgColor: "bg-indigo-900/30 border-indigo-800",
      barColor: "bg-indigo-500",
    },
    teal: {
      color: "text-teal-400",
      bgColor: "bg-teal-900/30 border-teal-800",
      barColor: "bg-teal-500",
    },
    rose: {
      color: "text-rose-400",
      bgColor: "bg-rose-900/30 border-rose-800",
      barColor: "bg-rose-500",
    },
    lime: {
      color: "text-lime-400",
      bgColor: "bg-lime-900/30 border-lime-800",
      barColor: "bg-lime-500",
    },
  };
  return (
    colorMap[color] || {
      color: "text-gray-400",
      bgColor: "bg-gray-900/30 border-gray-800",
      barColor: "bg-gray-500",
    }
  );
}

// Magnitude bar component - memoized to prevent re-renders
export const MagnitudeBar = memo(function MagnitudeBar({
  magnitude,
  maxMagnitude = 5,
}: {
  magnitude: number;
  maxMagnitude?: number;
}) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxMagnitude }).map((_, i) => (
        <div
          key={i}
          className={`h-2 w-4 rounded-sm ${i < magnitude ? "bg-primary" : "bg-muted"}`}
        />
      ))}
      <span className="text-muted-foreground ml-2 text-xs">
        {magnitude}/{maxMagnitude}
      </span>
    </div>
  );
});

// Skill icon component with proper fallback
export const SkillIcon = memo(function SkillIcon({
  skillName,
  fallbackIcon,
  fallbackColor,
}: {
  skillName: string;
  fallbackIcon: React.ReactNode;
  fallbackColor: string;
}) {
  const [showFallback, setShowFallback] = useState(false);
  const iconUrl = getSkillIconUrl(skillName);

  if (!iconUrl || showFallback) {
    return <span className={fallbackColor}>{fallbackIcon}</span>;
  }

  return (
    <img src={iconUrl} alt={skillName} className="h-6 w-6" onError={() => setShowFallback(true)} />
  );
});

// Strip markdown for plain text preview (faster than ReactMarkdown)
export function stripMarkdown(text: string): string {
  return text
    .replace(/^#\s+.+$/m, "")
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`{3}[\s\S]*?`{3}/g, "")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/!\[.*?\]\(.+?\)/g, "")
    .replace(/^\s*[-*+]\s/gm, "• ")
    .replace(/^\s*\d+\.\s/gm, "")
    .replace(/>\s?/g, "")
    .replace(/---+/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
