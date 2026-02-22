"use client";

import { useEffect, useState, useMemo, useCallback, memo, useRef } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Search,
  FileText,
  Code,
  Briefcase,
  GraduationCap,
  BookOpen,
  Calendar,
  Edit,
  Tag,
  Cpu,
  Palette,
  Database,
  Server,
  PenTool,
  Users,
  Plus,
  Trash2,
  Settings,
  X,
  Layers,
  ExternalLink,
  Star,
  ChevronDown,
  ChevronUp,
  StickyNote,
  Trello,
  Image,
  MessageSquare,
  RefreshCw,
  Clock,
  Bot,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { formatMonthYear } from "@/lib/utils";
import {
  SkillEditForm,
  ExperienceEditForm,
  EducationEditForm,
  PortfolioProjectEditForm,
} from "@/components/repository/CVEditForms";
import { getSkillIconUrl } from "@/lib/skill-icons";

// Available Lucide icons for categories
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
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
const CATEGORY_COLORS = [
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

// Generate color classes from color name
function getColorClasses(color: string) {
  const colorMap: Record<string, { color: string; bgColor: string; barColor: string }> = {
    violet: {
      color: "text-violet-700 dark:text-violet-400",
      bgColor: "bg-violet-100 dark:bg-violet-900/30 border-violet-200 dark:border-violet-800",
      barColor: "bg-violet-500",
    },
    pink: {
      color: "text-pink-700 dark:text-pink-400",
      bgColor: "bg-pink-100 dark:bg-pink-900/30 border-pink-200 dark:border-pink-800",
      barColor: "bg-pink-500",
    },
    blue: {
      color: "text-blue-700 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800",
      barColor: "bg-blue-500",
    },
    orange: {
      color: "text-orange-700 dark:text-orange-400",
      bgColor: "bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800",
      barColor: "bg-orange-500",
    },
    emerald: {
      color: "text-emerald-700 dark:text-emerald-400",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800",
      barColor: "bg-emerald-500",
    },
    amber: {
      color: "text-amber-700 dark:text-amber-400",
      bgColor: "bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800",
      barColor: "bg-amber-500",
    },
    red: {
      color: "text-red-700 dark:text-red-400",
      bgColor: "bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800",
      barColor: "bg-red-500",
    },
    cyan: {
      color: "text-cyan-700 dark:text-cyan-400",
      bgColor: "bg-cyan-100 dark:bg-cyan-900/30 border-cyan-200 dark:border-cyan-800",
      barColor: "bg-cyan-500",
    },
    indigo: {
      color: "text-indigo-700 dark:text-indigo-400",
      bgColor: "bg-indigo-100 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800",
      barColor: "bg-indigo-500",
    },
    teal: {
      color: "text-teal-700 dark:text-teal-400",
      bgColor: "bg-teal-100 dark:bg-teal-900/30 border-teal-200 dark:border-teal-800",
      barColor: "bg-teal-500",
    },
    rose: {
      color: "text-rose-700 dark:text-rose-400",
      bgColor: "bg-rose-100 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800",
      barColor: "bg-rose-500",
    },
    lime: {
      color: "text-lime-700 dark:text-lime-400",
      bgColor: "bg-lime-100 dark:bg-lime-900/30 border-lime-200 dark:border-lime-800",
      barColor: "bg-lime-500",
    },
  };
  return (
    colorMap[color] ||
    colorMap.gray || {
      color: "text-gray-700 dark:text-gray-400",
      bgColor: "bg-gray-100 dark:bg-gray-900/30 border-gray-200 dark:border-gray-800",
      barColor: "bg-gray-500",
    }
  );
}

// Skill category from API
interface SkillCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
  sortOrder: number;
}

// Magnitude bar component - memoized to prevent re-renders
const MagnitudeBar = memo(function MagnitudeBar({
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
const SkillIcon = memo(function SkillIcon({
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
function stripMarkdown(text: string): string {
  return text
    .replace(/^#\s+.+$/m, "") // Remove first H1 title (usually same as doc title)
    .replace(/#{1,6}\s+/g, "") // other headers
    .replace(/\*\*(.+?)\*\*/g, "$1") // bold
    .replace(/__(.+?)__/g, "$1") // bold alt
    .replace(/\*(.+?)\*/g, "$1") // italic
    .replace(/_(.+?)_/g, "$1") // italic alt
    .replace(/`{3}[\s\S]*?`{3}/g, "") // code blocks
    .replace(/`(.+?)`/g, "$1") // inline code
    .replace(/\[(.+?)\]\(.+?\)/g, "$1") // links
    .replace(/!\[.*?\]\(.+?\)/g, "") // images
    .replace(/^\s*[-*+]\s/gm, "• ") // list items → bullet
    .replace(/^\s*\d+\.\s/gm, "") // numbered lists
    .replace(/>\s?/g, "") // blockquotes
    .replace(/---+/g, "") // horizontal rules
    .replace(/\n{3,}/g, "\n\n") // multiple newlines
    .trim();
}

interface Document {
  id: number;
  slug: string;
  type: "writing" | "prompt" | "note";
  title: string;
  content: string;
  language: string;
  metadata: any;
  created_at: string;
  updated_at: string;
  summary?: string; // AI-generated summary for Kronus indexing
}

interface Skill {
  id: string;
  name: string;
  category: string;
  magnitude: number;
  description: string;
  tags: string[];
}

interface Achievement {
  category?: string;
  description: string;
  metrics?: string;
  tags?: string[];
}

interface WorkExperience {
  id: string;
  title: string;
  company: string;
  department?: string;
  location: string;
  dateStart: string;
  dateEnd: string | null;
  tagline: string;
  note?: string;
  achievements: Achievement[];
}

interface Education {
  id: string;
  degree: string;
  field: string;
  institution: string;
  location: string;
  dateStart: string;
  dateEnd: string;
  tagline: string;
  note?: string;
  focusAreas: string[];
  achievements: string[];
}

interface PortfolioProject {
  id: string;
  title: string;
  category: string;
  company?: string | null;
  dateCompleted?: string | null;
  status: "shipped" | "wip" | "archived";
  featured: boolean;
  image?: string | null;
  excerpt?: string | null;
  description?: string | null;
  role?: string | null;
  technologies: string[];
  metrics: Record<string, string>;
  links: Record<string, string>;
  tags: string[];
  sortOrder?: number;
}

// Linear cache types
interface LinearCachedProject {
  id: string;
  name: string;
  description: string | null;
  state: string | null;
  progress: number | null;
  targetDate: string | null;
  url: string | null;
  lead: { id: string; name: string | null } | null;
  summary: string | null;
  syncedAt: string | null;
  isDeleted: boolean;
}

interface LinearCachedIssue {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  priority: number | null;
  url: string | null;
  state: { id: string; name: string | null } | null;
  assignee: { id: string; name: string | null } | null;
  team: { id: string; name: string | null; key: string | null } | null;
  project: { id: string; name: string | null } | null;
  summary: string | null;
  syncedAt: string | null;
  isDeleted: boolean;
}

// Kronus MCP chat types (askKronus tool calls)
interface KronusChat {
  id: number;
  trace_id: string;
  question: string;
  answer: string;
  question_preview: string;
  answer_preview: string;
  repository: string | null;
  depth: string;
  status: string;
  has_summary: boolean;
  summary: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  latency_ms: number | null;
  cost_usd: number | null;
  created_at: string;
}

// Main chat conversation types (admin UI chats)
interface ChatConversation {
  id: number;
  title: string;
  summary: string | null;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

// Media asset types
interface MediaAsset {
  id: number;
  filename: string;
  mime_type: string;
  file_size: number;
  description: string | null;
  alt: string | null;
  destination: string;
  created_at: string;
  drive_url: string | null;
  supabase_url: string | null;
}

export default function RepositoryPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("writings");
  const [writings, setWritings] = useState<Document[]>([]);
  const [prompts, setPrompts] = useState<Document[]>([]);
  const [notes, setNotes] = useState<Document[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [experience, setExperience] = useState<WorkExperience[]>([]);
  const [education, setEducation] = useState<Education[]>([]);
  const [portfolioProjects, setPortfolioProjects] = useState<PortfolioProject[]>([]);
  const [skillCategories, setSkillCategories] = useState<SkillCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [editingSkill, setEditingSkill] = useState<string | null>(null);
  const [editingExperience, setEditingExperience] = useState<string | null>(null);
  const [editingEducation, setEditingEducation] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Category management state (for skills)
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<SkillCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: "", color: "violet", icon: "tag" });
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [savingCategory, setSavingCategory] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState(false);

  // Document Types management state
  const [docTypeDialogOpen, setDocTypeDialogOpen] = useState(false);
  const [editingDocType, setEditingDocType] = useState<{
    id: string;
    name: string;
    description: string;
    color: string;
    icon: string;
  } | null>(null);
  const [docTypeForm, setDocTypeForm] = useState({
    name: "",
    description: "",
    color: "emerald",
    icon: "file-text",
  });
  const [docTypeError, setDocTypeError] = useState<string | null>(null);
  const [savingDocType, setSavingDocType] = useState(false);
  const [deletingDocType, setDeletingDocType] = useState(false);
  const [documentTypes, setDocumentTypes] = useState<
    Array<{
      id: string;
      name: string;
      description: string;
      color: string;
      icon: string;
      sortOrder: number;
    }>
  >([]);

  // Expanded summaries state - tracks which document IDs have expanded summaries
  const [expandedSummaries, setExpandedSummaries] = useState<Set<number>>(new Set());

  // Linear cache state
  const [linearProjects, setLinearProjects] = useState<LinearCachedProject[]>([]);
  const [linearIssues, setLinearIssues] = useState<LinearCachedIssue[]>([]);
  const [linearLastSync, setLinearLastSync] = useState<string | null>(null);
  const [linearSyncing, setLinearSyncing] = useState(false);

  // Kronus MCP chats state (askKronus tool calls)
  const [kronusChats, setKronusChats] = useState<KronusChat[]>([]);
  const [kronusChatsPagination, setKronusChatsPagination] = useState<{
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  } | null>(null);

  // Main chat conversations state (admin UI chats)
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [conversationsPagination, setConversationsPagination] = useState<{
    total: number;
  } | null>(null);

  // Media assets state
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [mediaTotal, setMediaTotal] = useState<number>(0);

  // Tab data cache - stores fetched data per tab to avoid re-fetching on return visits
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [tabDataCache, setTabDataCache] = useState<Record<string, { data: any; fetchedAt: number }>>(
    {}
  );
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL

  // AbortController ref for cancelling in-flight requests on tab switch
  const abortControllerRef = useRef<AbortController | null>(null);

  // Navigate to chat to EDIT a document with Kronus
  const editDocumentWithKronus = useCallback(
    (doc: Document, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const tags =
        doc.metadata?.tags && Array.isArray(doc.metadata.tags) ? doc.metadata.tags.join(", ") : "";
      const context = `I want to UPDATE this ${doc.type} in the repository. Please help me modify it:\n\n**Document Slug:** ${doc.slug}\n**Title:** ${doc.title}\n**Type:** ${doc.type}${doc.metadata?.type ? `\n**Category:** ${doc.metadata.type}` : ""}${tags ? `\n**Tags:** ${tags}` : ""}\n\n**Current Content:**\n${doc.content}\n\nWhat changes would you like to make? You can update the content or metadata (including tags) using the repository tools.`;

      sessionStorage.setItem("kronusPrefill", context);
      router.push("/chat");
    },
    [router]
  );

  // Navigate to chat to ADD a new skill with Kronus
  const addSkillWithKronus = useCallback(() => {
    const context = `I want to ADD a new skill to my CV. Please help me create it using the repository_create_skill tool.

**Required Fields:**
- **id**: Unique skill ID (lowercase, no spaces, e.g. 'react-native')
- **name**: Display name (e.g. 'React Native')
- **category**: One of: 'AI & Development', 'Languages & Frameworks', 'Data & Analytics', 'Infrastructure & DevOps', 'Design & UX', 'Leadership & Collaboration'
- **magnitude**: Proficiency level 1-5 (5=expert)
- **description**: Brief description of my expertise

**Optional Fields:**
- icon, color, url, tags, firstUsed, lastUsed

What skill would you like to add? Please provide the name and I'll help you fill in the details.`;

    sessionStorage.setItem("kronusPrefill", context);
    router.push("/chat");
  }, [router]);

  // Navigate to chat to ADD a new work experience with Kronus
  const addExperienceWithKronus = useCallback(() => {
    const context = `I want to ADD a new work experience entry to my CV. Please help me create it using the repository_create_experience tool.

**Required Fields:**
- **id**: Unique ID (lowercase, no spaces, e.g. 'company-role-2024')
- **title**: Job title (e.g. 'Senior Software Engineer')
- **company**: Company name
- **location**: Location (e.g. 'Helsinki, Finland')
- **dateStart**: Start date (e.g. '2022-01')
- **tagline**: Brief role description/tagline

**Optional Fields:**
- department, dateEnd (leave empty for current position), note, achievements (list of key achievements)

What work experience would you like to add? Please provide the company and role, and I'll help you fill in the details.`;

    sessionStorage.setItem("kronusPrefill", context);
    router.push("/chat");
  }, [router]);

  // Navigate to chat to ADD a new education entry with Kronus
  const addEducationWithKronus = useCallback(() => {
    const context = `I want to ADD a new education entry to my CV. Please help me create it using the repository_create_education tool.

**Required Fields:**
- **id**: Unique ID (lowercase, no spaces, e.g. 'university-degree-2020')
- **degree**: Degree type (e.g. 'Bachelor of Science', 'Master of Arts')
- **field**: Field of study (e.g. 'Computer Science')
- **institution**: Institution name
- **location**: Location (e.g. 'Helsinki, Finland')
- **dateStart**: Start date (e.g. '2016-09')
- **dateEnd**: End date (e.g. '2020-06')
- **tagline**: Brief description/tagline

**Optional Fields:**
- note, focusAreas (areas of focus/specialization), achievements (key achievements/honors)

What education entry would you like to add? Please provide the institution and degree, and I'll help you fill in the details.`;

    sessionStorage.setItem("kronusPrefill", context);
    router.push("/chat");
  }, [router]);

  // Get unique categories from skills - memoized
  const categories = useMemo(() => [...new Set(skills.map((s) => s.category))].sort(), [skills]);

  // Build category config from API data
  const categoryConfig = useMemo(() => {
    const config: Record<
      string,
      { color: string; bgColor: string; barColor: string; icon: React.ReactNode }
    > = {};
    for (const cat of skillCategories) {
      const colors = getColorClasses(cat.color);
      config[cat.name] = {
        color: colors.color,
        bgColor: colors.bgColor,
        barColor: colors.barColor,
        icon: CATEGORY_ICONS[cat.icon] || <Tag className="h-4 w-4" />,
      };
    }
    return config;
  }, [skillCategories]);

  // Build document type config from API data - memoized
  const docTypeConfig = useMemo(() => {
    const config: Record<string, { color: string; bgColor: string; barColor: string }> = {};
    for (const dt of documentTypes) {
      const colors = getColorClasses(dt.color);
      config[dt.name] = colors;
    }
    return config;
  }, [documentTypes]);

  // Get color classes for a document type name
  const getDocTypeColors = useCallback(
    (typeName: string) => {
      return docTypeConfig[typeName] || getColorClasses("teal"); // Default to teal (Tartarus palette)
    },
    [docTypeConfig]
  );

  // Toggle summary expansion for a document
  const toggleSummary = useCallback((docId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedSummaries((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  }, []);

  // Memoize lowercase search query to avoid recalculating
  const searchLower = useMemo(() => searchQuery.toLowerCase(), [searchQuery]);

  // Filter skills by category and search - memoized
  const filteredSkills = useMemo(
    () =>
      skills.filter((s) => {
        const matchesCategory = selectedCategory === "all" || s.category === selectedCategory;
        const matchesSearch =
          !searchQuery ||
          s.name.toLowerCase().includes(searchLower) ||
          s.description.toLowerCase().includes(searchLower);
        return matchesCategory && matchesSearch;
      }),
    [skills, selectedCategory, searchQuery, searchLower]
  );

  // Group skills by category for display - memoized
  const skillsByCategory = useMemo(
    () =>
      filteredSkills.reduce(
        (acc, skill) => {
          if (!acc[skill.category]) acc[skill.category] = [];
          acc[skill.category].push(skill);
          return acc;
        },
        {} as Record<string, Skill[]>
      ),
    [filteredSkills]
  );

  // Apply cached data to state based on tab
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyTabData = useCallback((tab: string, data: any) => {
    switch (tab) {
      case "writings":
        setWritings(data.documents || []);
        if (data.documentTypes) setDocumentTypes(data.documentTypes);
        break;
      case "prompts":
        setPrompts(data.documents || []);
        if (data.documentTypes) setDocumentTypes(data.documentTypes);
        break;
      case "notes":
        setNotes(data.documents || []);
        break;
      case "cv":
        setSkills(data.skills || []);
        setExperience(data.experience || []);
        setEducation(data.education || []);
        if (data.categories) setSkillCategories(data.categories);
        break;
      case "portfolio":
        setPortfolioProjects(data.projects || []);
        break;
      case "linear":
        setLinearProjects(data.projects || []);
        setLinearIssues(data.issues || []);
        setLinearLastSync(data.lastSync || null);
        break;
      case "chats":
        setConversations(data.conversations || []);
        setConversationsPagination(data.conversationsPagination || null);
        setKronusChats(data.kronusChats || []);
        setKronusChatsPagination(data.kronusChatsPagination || null);
        break;
      case "media":
        setMediaAssets(data.assets || []);
        setMediaTotal(data.total || 0);
        break;
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Cleanup: abort request on unmount or tab change
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [activeTab]);

  const fetchData = async (forceRefresh = false) => {
    // Check cache first (unless forcing refresh)
    const cached = tabDataCache[activeTab];
    if (!forceRefresh && cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
      // Use cached data - instant!
      applyTabData(activeTab, cached.data);
      setLoading(false);
      return;
    }

    // Cancel any in-flight request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let fetchedData: any = {};

      if (activeTab === "writings") {
        const [res, typesRes] = await Promise.all([
          fetch("/api/documents?type=writing", { signal }),
          fetch("/api/document-types", { signal }),
        ]);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        fetchedData = { documents: data.documents || [] };
        if (typesRes.ok) {
          fetchedData.documentTypes = await typesRes.json();
        }
      } else if (activeTab === "prompts") {
        const [res, typesRes] = await Promise.all([
          fetch("/api/documents?type=prompt", { signal }),
          fetch("/api/document-types", { signal }),
        ]);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        fetchedData = { documents: data.documents || [] };
        if (typesRes.ok) {
          fetchedData.documentTypes = await typesRes.json();
        }
      } else if (activeTab === "cv") {
        const [cvRes, catRes] = await Promise.all([
          fetch("/api/cv", { signal }),
          fetch("/api/cv/categories", { signal }),
        ]);
        if (!cvRes.ok) throw new Error(`HTTP error! status: ${cvRes.status}`);
        const data = await cvRes.json();
        fetchedData = {
          skills: data.skills || [],
          experience: data.experience || [],
          education: data.education || [],
        };
        if (catRes.ok) {
          fetchedData.categories = await catRes.json();
        }
      } else if (activeTab === "portfolio") {
        const res = await fetch("/api/portfolio-projects", { signal });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        fetchedData = { projects: data.projects || [] };
      } else if (activeTab === "notes") {
        const res = await fetch("/api/documents?type=note", { signal });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        fetchedData = { documents: data.documents || [] };
      } else if (activeTab === "linear") {
        const res = await fetch("/api/integrations/linear/cache", { signal });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        fetchedData = {
          projects: data.projects || [],
          issues: data.issues || [],
          lastSync: data.lastSync || null,
        };
      } else if (activeTab === "chats") {
        const [convRes, kronusRes] = await Promise.all([
          fetch("/api/conversations?limit=20", { signal }),
          fetch("/api/kronus/chats?limit=20", { signal }),
        ]);
        fetchedData = {};
        if (convRes.ok) {
          const convData = await convRes.json();
          fetchedData.conversations = convData.conversations || [];
          fetchedData.conversationsPagination = { total: convData.total || 0 };
        }
        if (kronusRes.ok) {
          const kronusData = await kronusRes.json();
          fetchedData.kronusChats = kronusData.chats || [];
          fetchedData.kronusChatsPagination = kronusData.pagination || null;
        }
      } else if (activeTab === "media") {
        const res = await fetch("/api/media?limit=24", { signal });
        if (res.ok) {
          const data = await res.json();
          fetchedData = { assets: data.assets || [], total: data.total || 0 };
        }
      }

      // Apply data to state
      applyTabData(activeTab, fetchedData);

      // Update cache
      setTabDataCache((prev) => ({
        ...prev,
        [activeTab]: { data: fetchedData, fetchedAt: Date.now() },
      }));
    } catch (error) {
      // Ignore abort errors - they're expected when switching tabs
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      console.error("Failed to fetch data:", error);
      // Set empty arrays on error
      if (activeTab === "writings") setWritings([]);
      else if (activeTab === "prompts") setPrompts([]);
      else if (activeTab === "notes") setNotes([]);
      else if (activeTab === "portfolio") setPortfolioProjects([]);
      else if (activeTab === "cv") {
        setSkills([]);
        setExperience([]);
        setEducation([]);
      } else if (activeTab === "linear") {
        setLinearProjects([]);
        setLinearIssues([]);
        setLinearLastSync(null);
      } else if (activeTab === "chats") {
        setConversations([]);
        setConversationsPagination(null);
        setKronusChats([]);
        setKronusChatsPagination(null);
      } else if (activeTab === "media") {
        setMediaAssets([]);
        setMediaTotal(0);
      }
    } finally {
      setLoading(false);
    }
  };

  // Function to invalidate cache for a specific tab (useful after mutations)
  const invalidateTabCache = useCallback((tab: string) => {
    setTabDataCache((prev) => {
      const next = { ...prev };
      delete next[tab];
      return next;
    });
  }, []);

  // Sync Linear data
  const syncLinearData = async () => {
    setLinearSyncing(true);
    try {
      const res = await fetch("/api/integrations/linear/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      console.log("Linear sync result:", data);
      // Refresh the cache data
      const cacheRes = await fetch("/api/integrations/linear/cache");
      if (cacheRes.ok) {
        const cacheData = await cacheRes.json();
        setLinearProjects(cacheData.projects || []);
        setLinearIssues(cacheData.issues || []);
        setLinearLastSync(cacheData.lastSync || null);
      }
    } catch (error) {
      console.error("Failed to sync Linear data:", error);
    } finally {
      setLinearSyncing(false);
    }
  };

  // Extract all unique tags from documents - memoized
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    [...writings, ...prompts, ...notes].forEach((doc) => {
      const docTags = doc.metadata?.tags || [];
      if (Array.isArray(docTags)) {
        docTags.forEach((tag: string) => tags.add(tag));
      }
    });
    return Array.from(tags).sort();
  }, [writings, prompts, notes]);

  // Extract all unique types from documents - memoized
  const allTypes = useMemo(() => {
    const types = new Set<string>();
    [...writings, ...prompts, ...notes].forEach((doc) => {
      if (doc.metadata?.type) {
        types.add(doc.metadata.type);
      }
    });
    return Array.from(types).sort();
  }, [writings, prompts, notes]);

  // Filtered writings - memoized
  const filteredWritings = useMemo(
    () =>
      writings.filter((d) => {
        const matchesSearch =
          !searchQuery ||
          d.title.toLowerCase().includes(searchLower) ||
          d.content.toLowerCase().includes(searchLower);
        const docTags = d.metadata?.tags || [];
        const matchesTag =
          selectedTag === "all" || (Array.isArray(docTags) && docTags.includes(selectedTag));
        const matchesType = selectedType === "all" || d.metadata?.type === selectedType;
        return matchesSearch && matchesTag && matchesType;
      }),
    [writings, searchQuery, searchLower, selectedTag, selectedType]
  );

  // Filtered prompts - memoized
  const filteredPrompts = useMemo(
    () =>
      prompts.filter((d) => {
        const matchesSearch =
          !searchQuery ||
          d.title.toLowerCase().includes(searchLower) ||
          d.content.toLowerCase().includes(searchLower);
        const docTags = d.metadata?.tags || [];
        const matchesTag =
          selectedTag === "all" || (Array.isArray(docTags) && docTags.includes(selectedTag));
        const matchesType = selectedType === "all" || d.metadata?.type === selectedType;
        return matchesSearch && matchesTag && matchesType;
      }),
    [prompts, searchQuery, searchLower, selectedTag, selectedType]
  );

  // Filtered notes - memoized
  const filteredNotes = useMemo(
    () =>
      notes.filter((d) => {
        const matchesSearch =
          !searchQuery ||
          d.title.toLowerCase().includes(searchLower) ||
          d.content.toLowerCase().includes(searchLower);
        const docTags = d.metadata?.tags || [];
        const matchesTag =
          selectedTag === "all" || (Array.isArray(docTags) && docTags.includes(selectedTag));
        const matchesType = selectedType === "all" || d.metadata?.type === selectedType;
        return matchesSearch && matchesTag && matchesType;
      }),
    [notes, searchQuery, searchLower, selectedTag, selectedType]
  );

  const hasActiveFilters = selectedTag !== "all" || selectedType !== "all" || searchQuery !== "";
  const clearFilters = useCallback(() => {
    setSelectedTag("all");
    setSelectedType("all");
    setSearchQuery("");
  }, []);

  const handleSaveSkill = useCallback(async (data: Partial<Skill>) => {
    try {
      const res = await fetch(`/api/cv/skills/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setEditingSkill(null);
        invalidateTabCache("cv");
        fetchData(true); // Force refresh after mutation
      }
    } catch (error) {
      console.error("Failed to save skill:", error);
    }
  }, [invalidateTabCache]);

  const handleSaveExperience = useCallback(async (data: Partial<WorkExperience>) => {
    try {
      const res = await fetch(`/api/cv/experience/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setEditingExperience(null);
        invalidateTabCache("cv");
        fetchData(true); // Force refresh after mutation
      }
    } catch (error) {
      console.error("Failed to save experience:", error);
    }
  }, [invalidateTabCache]);

  const handleSaveEducation = useCallback(async (data: Partial<Education>) => {
    try {
      const res = await fetch(`/api/cv/education/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setEditingEducation(null);
        invalidateTabCache("cv");
        fetchData(true); // Force refresh after mutation
      }
    } catch (error) {
      console.error("Failed to save education:", error);
    }
  }, [invalidateTabCache]);

  const handleSaveProject = useCallback(async (data: Partial<PortfolioProject>) => {
    try {
      const res = await fetch(`/api/portfolio-projects/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setEditingProject(null);
        invalidateTabCache("portfolio");
        fetchData(true); // Force refresh after mutation
      }
    } catch (error) {
      console.error("Failed to save project:", error);
    }
  }, [invalidateTabCache]);

  // Navigate to chat to ADD a new portfolio project with Kronus
  const addProjectWithKronus = useCallback(() => {
    const context = `I want to ADD a new portfolio project to my CV. Please help me create it.

**Required Fields:**
- **id**: Unique project ID (lowercase, no spaces, e.g. 'my-awesome-app')
- **title**: Project title
- **category**: Category (e.g., 'Web App', 'Mobile App', 'AI/ML', 'Data Engineering')

**Optional Fields:**
- company, role, status (shipped/wip/archived), featured
- dateCompleted, excerpt, description
- technologies (array), tags (array)
- metrics (object), links (object), image URL

What project would you like to add?`;

    sessionStorage.setItem("kronusPrefill", context);
    router.push("/chat");
  }, [router]);

  // Category management handlers
  const openCategoryDialog = useCallback((category?: SkillCategory) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({ name: category.name, color: category.color, icon: category.icon });
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: "", color: "violet", icon: "tag" });
    }
    setCategoryError(null);
    setCategoryDialogOpen(true);
  }, []);

  const closeCategoryDialog = useCallback(() => {
    setCategoryDialogOpen(false);
    setEditingCategory(null);
    setCategoryForm({ name: "", color: "violet", icon: "tag" });
    setCategoryError(null);
  }, []);

  const handleSaveCategory = useCallback(async () => {
    if (!categoryForm.name.trim()) {
      setCategoryError("Category name is required");
      return;
    }

    setSavingCategory(true);
    setCategoryError(null);

    try {
      if (editingCategory) {
        // Update existing category
        const res = await fetch(`/api/cv/categories/${editingCategory.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: categoryForm.name.trim(),
            color: categoryForm.color,
            icon: categoryForm.icon,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to update category");
        }
      } else {
        // Create new category
        const res = await fetch("/api/cv/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: categoryForm.name.trim(),
            color: categoryForm.color,
            icon: categoryForm.icon,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to create category");
        }
      }

      closeCategoryDialog();
      invalidateTabCache("cv");
      fetchData(true); // Force refresh after mutation
    } catch (error: any) {
      setCategoryError(error.message);
    } finally {
      setSavingCategory(false);
    }
  }, [categoryForm, editingCategory, closeCategoryDialog, invalidateTabCache]);

  const handleDeleteCategory = useCallback(async () => {
    if (!editingCategory) return;

    setDeletingCategory(true);
    setCategoryError(null);

    try {
      const res = await fetch(`/api/cv/categories/${editingCategory.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete category");
      }

      closeCategoryDialog();
      invalidateTabCache("cv");
      fetchData(true); // Force refresh after mutation
    } catch (error: any) {
      setCategoryError(error.message);
    } finally {
      setDeletingCategory(false);
    }
  }, [editingCategory, closeCategoryDialog, invalidateTabCache]);

  // Get count of skills in a category (for delete warning)
  const getSkillCountInCategory = useCallback(
    (categoryName: string) => {
      return skills.filter((s) => s.category === categoryName).length;
    },
    [skills]
  );

  // Document Type management handlers
  const openDocTypeDialog = useCallback((docType?: (typeof documentTypes)[0]) => {
    if (docType) {
      setEditingDocType(docType);
      setDocTypeForm({
        name: docType.name,
        description: docType.description,
        color: docType.color,
        icon: docType.icon,
      });
    } else {
      setEditingDocType(null);
      setDocTypeForm({ name: "", description: "", color: "emerald", icon: "file-text" });
    }
    setDocTypeError(null);
    setDocTypeDialogOpen(true);
  }, []);

  const closeDocTypeDialog = useCallback(() => {
    setDocTypeDialogOpen(false);
    setEditingDocType(null);
    setDocTypeForm({ name: "", description: "", color: "emerald", icon: "file-text" });
    setDocTypeError(null);
  }, []);

  const handleSaveDocType = useCallback(async () => {
    if (!docTypeForm.name.trim()) {
      setDocTypeError("Type name is required");
      return;
    }

    setSavingDocType(true);
    setDocTypeError(null);

    try {
      if (editingDocType) {
        const res = await fetch(`/api/document-types/${editingDocType.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: docTypeForm.name.trim(),
            description: docTypeForm.description.trim(),
            color: docTypeForm.color,
            icon: docTypeForm.icon,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to update type");
        }
      } else {
        const res = await fetch("/api/document-types", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: docTypeForm.name.trim(),
            description: docTypeForm.description.trim(),
            color: docTypeForm.color,
            icon: docTypeForm.icon,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to create type");
        }
      }

      closeDocTypeDialog();
      // Invalidate all document tabs since types affect writings, prompts, and notes
      invalidateTabCache("writings");
      invalidateTabCache("prompts");
      invalidateTabCache("notes");
      fetchData(true); // Force refresh after mutation
    } catch (error: any) {
      setDocTypeError(error.message);
    } finally {
      setSavingDocType(false);
    }
  }, [docTypeForm, editingDocType, closeDocTypeDialog, invalidateTabCache]);

  const handleDeleteDocType = useCallback(async () => {
    if (!editingDocType) return;

    setDeletingDocType(true);
    setDocTypeError(null);

    try {
      const res = await fetch(`/api/document-types/${editingDocType.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete type");
      }

      closeDocTypeDialog();
      // Invalidate all document tabs since types affect writings, prompts, and notes
      invalidateTabCache("writings");
      invalidateTabCache("prompts");
      invalidateTabCache("notes");
      fetchData(true); // Force refresh after mutation
    } catch (error: any) {
      setDocTypeError(error.message);
    } finally {
      setDeletingDocType(false);
    }
  }, [editingDocType, closeDocTypeDialog, invalidateTabCache]);

  // Get count of documents using a type
  const getDocCountWithType = useCallback(
    (typeName: string) => {
      return (
        writings.filter((d) => d.metadata?.type === typeName).length +
        prompts.filter((d) => d.metadata?.type === typeName).length
      );
    },
    [writings, prompts]
  );

  return (
    <div className="journal-page flex h-full flex-col">
      <header className="journal-header flex min-h-14 flex-col gap-2 px-3 py-2 md:flex-row md:items-center md:justify-between md:px-6 md:py-0">
        <div className="flex items-center gap-3">
          <h1 className="journal-title text-lg">Repository</h1>
          {hasActiveFilters && (
            <Badge variant="secondary" className="gap-1">
              <Search className="h-3 w-3" />
              Filtered
            </Badge>
          )}
        </div>
        <div className="text-muted-foreground flex items-center gap-4 text-sm">
          {activeTab === "writings" && (
            <span>
              {hasActiveFilters
                ? `${filteredWritings.length} of ${writings.length} writings`
                : `${writings.length} writings`}
            </span>
          )}
          {activeTab === "prompts" && (
            <span>
              {hasActiveFilters
                ? `${filteredPrompts.length} of ${prompts.length} prompts`
                : `${prompts.length} prompts`}
            </span>
          )}
          {activeTab === "cv" && (
            <span>
              {skills.length} skills • {experience.length} experiences
            </span>
          )}
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
        <div className="journal-tabs flex flex-col gap-2 px-3 py-2 md:flex-row md:items-center md:gap-4 md:px-6 md:py-3">
          <TabsList className="h-auto flex-wrap gap-1 overflow-x-auto">
            <TabsTrigger value="writings">
              <FileText className="mr-2 h-4 w-4" />
              Writings
            </TabsTrigger>
            <TabsTrigger value="notes">
              <StickyNote className="mr-2 h-4 w-4" />
              Notes
            </TabsTrigger>
            <TabsTrigger value="prompts">
              <Code className="mr-2 h-4 w-4" />
              Prompts
            </TabsTrigger>
            <TabsTrigger value="linear">
              <Trello className="mr-2 h-4 w-4" />
              Linear
            </TabsTrigger>
            <TabsTrigger value="cv">
              <Briefcase className="mr-2 h-4 w-4" />
              CV
            </TabsTrigger>
            <TabsTrigger value="portfolio">
              <Layers className="mr-2 h-4 w-4" />
              Portfolio
            </TabsTrigger>
            <TabsTrigger value="media">
              <Image className="mr-2 h-4 w-4" />
              Media
            </TabsTrigger>
            <TabsTrigger value="chats">
              <MessageSquare className="mr-2 h-4 w-4" />
              Chats
            </TabsTrigger>
          </TabsList>
          <div className="relative max-w-sm flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {(activeTab === "writings" || activeTab === "prompts" || activeTab === "notes") && (
            <>
              {/* Type Filter */}
              {allTypes.length > 0 && (
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-[150px]">
                    <BookOpen className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {allTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Tag Filter */}
              {allTags.length > 0 && (
                <Select value={selectedTag} onValueChange={setSelectedTag}>
                  <SelectTrigger className="w-[150px]">
                    <Tag className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tags</SelectItem>
                    {allTags.map((tag) => (
                      <SelectItem key={tag} value={tag}>
                        {tag}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}

              {/* Manage Types button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => openDocTypeDialog()}
                className="border-[var(--tartarus-teal-dim)] text-[var(--tartarus-teal)] hover:bg-[var(--tartarus-teal-soft)] hover:text-[var(--tartarus-teal)]"
              >
                <Settings className="mr-2 h-4 w-4" />
                Manage Types
              </Button>
            </>
          )}
          {activeTab === "cv" && categories.length > 0 && (
            <>
              {/* Category Filter */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[220px]">
                  <Briefcase className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => {
                    const config = categoryConfig[cat];
                    return (
                      <SelectItem key={cat} value={cat}>
                        <span className="flex items-center gap-2">
                          {config?.icon}
                          {cat}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {(selectedCategory !== "all" || searchQuery) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedCategory("all");
                    setSearchQuery("");
                  }}
                >
                  Clear filters
                </Button>
              )}
            </>
          )}
        </div>

        <ScrollArea className="flex-1 bg-[var(--journal-paper)]">
          <div className="p-6">
            <TabsContent value="writings" className="mt-0">
              {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="overflow-hidden">
                      <div className="h-1 bg-[var(--tartarus-teal)]" />
                      <CardHeader>
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="mt-2 h-4 w-1/2" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-16 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredWritings.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--tartarus-teal-soft)]">
                      <FileText className="h-8 w-8 text-[var(--tartarus-teal)]" />
                    </div>
                    <p className="text-muted-foreground">No writings found.</p>
                    {hasActiveFilters && (
                      <Button variant="outline" size="sm" onClick={clearFilters}>
                        Clear filters
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid auto-rows-fr gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredWritings.map((doc) => (
                    <Link key={doc.id} href={`/repository/${doc.slug}`}>
                      <Card className="group relative flex h-full cursor-pointer flex-col overflow-hidden border-[var(--tartarus-border)] hover:shadow-md">
                        {/* Edit with Kronus button - absolute positioned */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-3 right-3 z-10 h-8 w-8 text-[var(--tartarus-gold)] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[var(--tartarus-gold-soft)] hover:text-[var(--tartarus-gold-dim)]"
                          onClick={(e) => editDocumentWithKronus(doc, e)}
                          title="Edit with Kronus"
                        >
                          <img
                            src="/chronus-logo.png"
                            alt="Kronus"
                            className="h-4 w-4 rounded-full object-cover"
                          />
                        </Button>

                        {/* Decorative gradient bar - uses document type color */}
                        <div
                          className={`h-1 ${doc.metadata?.type ? getDocTypeColors(doc.metadata.type).barColor : "bg-[var(--tartarus-teal)]"} shrink-0`}
                        />

                        <CardHeader className="pb-2">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--tartarus-teal-soft)]">
                              <FileText className="h-5 w-5 text-[var(--tartarus-teal)]" />
                            </div>
                            <div className="min-w-0 flex-1 pr-8">
                              <CardTitle className="line-clamp-2 text-base font-semibold">
                                {doc.title}
                              </CardTitle>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="flex flex-1 flex-col pt-0">
                          {/* Category badge - uses configured type colors */}
                          {doc.metadata?.type && (
                            <div className="mb-2">
                              <Badge
                                className={`px-2 py-0.5 text-[10px] font-medium ${getDocTypeColors(doc.metadata.type).barColor} text-white`}
                              >
                                {doc.metadata.type}
                              </Badge>
                            </div>
                          )}

                          {/* Index summary - AI-generated for Kronus (expandable) */}
                          {doc.summary ? (
                            <div
                              className="group/summary flex-1 cursor-pointer"
                              onClick={(e) => toggleSummary(doc.id, e)}
                            >
                              <p
                                className={`text-muted-foreground text-sm italic ${expandedSummaries.has(doc.id) ? "" : "line-clamp-3"}`}
                              >
                                {doc.summary}
                              </p>
                              <button className="mt-1 flex items-center gap-0.5 text-[10px] text-[var(--tartarus-teal)] opacity-70 group-hover/summary:opacity-100">
                                {expandedSummaries.has(doc.id) ? (
                                  <>
                                    Show less <ChevronUp className="h-3 w-3" />
                                  </>
                                ) : (
                                  <>
                                    Show more <ChevronDown className="h-3 w-3" />
                                  </>
                                )}
                              </button>
                            </div>
                          ) : (
                            <p className="text-muted-foreground line-clamp-3 flex-1 text-sm">
                              {stripMarkdown(doc.content).substring(0, 150)}...
                            </p>
                          )}

                          {/* Footer: Dates + Tags */}
                          <div className="mt-3 border-t border-[var(--tartarus-border)] pt-2">
                            {/* Dates */}
                            <div className="text-muted-foreground mb-2 flex items-center gap-3 text-[10px]">
                              {(doc.metadata?.writtenDate || doc.metadata?.year) && (
                                <span>
                                  <Calendar className="mr-1 inline h-3 w-3" />
                                  Written {doc.metadata?.writtenDate || doc.metadata?.year}
                                </span>
                              )}
                              {doc.created_at && (
                                <span className="text-muted-foreground/70">
                                  Added {formatMonthYear(doc.created_at)}
                                </span>
                              )}
                            </div>
                            {/* Tags - smaller, subtle */}
                            {doc.metadata?.tags &&
                              Array.isArray(doc.metadata.tags) &&
                              doc.metadata.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {doc.metadata.tags.slice(0, 3).map((tag: string) => (
                                    <span
                                      key={tag}
                                      className="rounded bg-[var(--tartarus-teal-soft)] px-1.5 py-0.5 text-[9px] text-[var(--tartarus-teal)]"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                  {doc.metadata.tags.length > 3 && (
                                    <span className="text-muted-foreground px-1.5 py-0.5 text-[9px]">
                                      +{doc.metadata.tags.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="prompts" className="mt-0">
              {loading ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="overflow-hidden">
                      <div className="h-1 bg-[var(--tartarus-teal)]" />
                      <CardHeader>
                        <Skeleton className="h-5 w-2/3" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-20 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredPrompts.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--tartarus-teal-soft)]">
                      <Code className="h-8 w-8 text-[var(--tartarus-teal)]" />
                    </div>
                    <p className="text-muted-foreground">No prompts found.</p>
                    {hasActiveFilters && (
                      <Button variant="outline" size="sm" onClick={clearFilters}>
                        Clear filters
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid auto-rows-fr gap-4 md:grid-cols-2">
                  {filteredPrompts.map((doc) => (
                    <Link key={doc.id} href={`/repository/${doc.slug}`}>
                      <Card className="group relative flex h-full cursor-pointer flex-col overflow-hidden border-[var(--tartarus-border)] hover:shadow-md">
                        {/* Edit with Kronus button - absolute positioned */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-3 right-3 z-10 h-8 w-8 text-[var(--tartarus-gold)] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[var(--tartarus-gold-soft)] hover:text-[var(--tartarus-gold-dim)]"
                          onClick={(e) => editDocumentWithKronus(doc, e)}
                          title="Edit with Kronus"
                        >
                          <img
                            src="/chronus-logo.png"
                            alt="Kronus"
                            className="h-4 w-4 rounded-full object-cover"
                          />
                        </Button>

                        {/* Decorative gradient bar - uses document type color */}
                        <div
                          className={`h-1 ${doc.metadata?.type ? getDocTypeColors(doc.metadata.type).barColor : "bg-[var(--tartarus-teal)]"} shrink-0`}
                        />

                        <CardHeader className="pb-2">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--tartarus-teal-soft)]">
                              <Code className="h-5 w-5 text-[var(--tartarus-teal)]" />
                            </div>
                            <div className="min-w-0 flex-1 pr-8">
                              <CardTitle className="line-clamp-2 text-base font-semibold">
                                {doc.title}
                              </CardTitle>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="flex flex-1 flex-col pt-0">
                          {/* Category badge - uses configured type colors */}
                          {doc.metadata?.type && (
                            <div className="mb-2">
                              <Badge
                                className={`px-2 py-0.5 text-[10px] font-medium ${getDocTypeColors(doc.metadata.type).barColor} text-white`}
                              >
                                {doc.metadata.type}
                              </Badge>
                              {doc.language && doc.language !== "en" && (
                                <Badge variant="outline" className="ml-1.5 px-1.5 py-0 text-[10px]">
                                  {doc.language.toUpperCase()}
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* Index summary - AI-generated for Kronus (expandable) */}
                          {doc.summary ? (
                            <div
                              className="group/summary flex-1 cursor-pointer"
                              onClick={(e) => toggleSummary(doc.id, e)}
                            >
                              <p
                                className={`text-muted-foreground text-sm italic ${expandedSummaries.has(doc.id) ? "" : "line-clamp-3"}`}
                              >
                                {doc.summary}
                              </p>
                              <button className="mt-1 flex items-center gap-0.5 text-[10px] text-[var(--tartarus-teal)] opacity-70 group-hover/summary:opacity-100">
                                {expandedSummaries.has(doc.id) ? (
                                  <>
                                    Show less <ChevronUp className="h-3 w-3" />
                                  </>
                                ) : (
                                  <>
                                    Show more <ChevronDown className="h-3 w-3" />
                                  </>
                                )}
                              </button>
                            </div>
                          ) : (
                            <div className="relative flex-1">
                              <pre className="text-muted-foreground h-20 overflow-hidden rounded-lg border border-[var(--tartarus-border)] bg-[var(--tartarus-surface)] p-3 font-mono text-xs break-words whitespace-pre-wrap">
                                {doc.content.substring(0, 180)}...
                              </pre>
                              <div className="pointer-events-none absolute right-0 bottom-0 left-0 h-6 rounded-b-lg bg-gradient-to-t from-[var(--tartarus-surface)] to-transparent" />
                            </div>
                          )}

                          {/* Footer: Date + Tags */}
                          <div className="mt-3 border-t border-[var(--tartarus-border)] pt-2">
                            {/* Date */}
                            {doc.created_at && (
                              <div className="text-muted-foreground mb-2 text-[10px]">
                                <Calendar className="mr-1 inline h-3 w-3" />
                                Added {formatMonthYear(doc.created_at)}
                              </div>
                            )}
                            {/* Tags - smaller, subtle */}
                            {doc.metadata?.tags &&
                              Array.isArray(doc.metadata.tags) &&
                              doc.metadata.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {doc.metadata.tags.slice(0, 4).map((tag: string) => (
                                    <span
                                      key={tag}
                                      className="rounded bg-[var(--tartarus-teal-soft)] px-1.5 py-0.5 text-[9px] text-[var(--tartarus-teal)]"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                  {doc.metadata.tags.length > 4 && (
                                    <span className="text-muted-foreground px-1.5 py-0.5 text-[9px]">
                                      +{doc.metadata.tags.length - 4}
                                    </span>
                                  )}
                                </div>
                              )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Portfolio Projects Tab */}
            <TabsContent value="portfolio" className="mt-0 space-y-6">
              {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-48 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-xl font-semibold">
                      <Layers className="h-5 w-5" />
                      Portfolio Projects
                      <Badge variant="secondary" className="ml-2">
                        {portfolioProjects.length}
                      </Badge>
                    </h2>
                    <Button
                      size="sm"
                      onClick={addProjectWithKronus}
                      className="bg-[var(--tartarus-gold)] font-medium text-[var(--tartarus-void)] hover:bg-[var(--tartarus-gold)]/90"
                    >
                      <img
                        src="/chronus-logo.png"
                        alt="Kronus"
                        className="mr-2 h-4 w-4 rounded-full object-cover"
                      />
                      Add with Kronus
                    </Button>
                  </div>

                  {portfolioProjects.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-12 text-center">
                      <Layers className="text-muted-foreground mx-auto h-12 w-12" />
                      <h3 className="mt-4 text-lg font-semibold">No portfolio projects yet</h3>
                      <p className="text-muted-foreground mt-2">
                        Add your first project to showcase your work.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {portfolioProjects.map((project) =>
                        editingProject === project.id ? (
                          <PortfolioProjectEditForm
                            key={project.id}
                            project={project}
                            onSave={handleSaveProject}
                            onCancel={() => setEditingProject(null)}
                          />
                        ) : (
                          <Card
                            key={project.id}
                            className="group relative flex h-full flex-col overflow-hidden border-cyan-100 bg-gradient-to-br from-white to-cyan-50/30 transition-all hover:shadow-lg dark:border-cyan-900/40 dark:from-gray-900 dark:to-cyan-950/20"
                          >
                            {/* Decorative top bar */}
                            <div
                              className={`h-1.5 ${project.featured ? "bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400" : "bg-gradient-to-r from-cyan-400 to-teal-500"}`}
                            />

                            {/* Featured star */}
                            {project.featured && (
                              <div className="absolute top-4 right-3 z-10">
                                <Star className="h-5 w-5 fill-amber-400 text-amber-500 drop-shadow-sm" />
                              </div>
                            )}

                            {/* Edit button on hover */}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="absolute top-4 left-3 z-10 bg-white/90 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:bg-white dark:bg-gray-800/90 dark:hover:bg-gray-800"
                              onClick={() => setEditingProject(project.id)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>

                            {/* Image */}
                            {project.image && (
                              <div className="h-36 w-full overflow-hidden bg-gradient-to-br from-cyan-100 to-teal-100 dark:from-cyan-900/30 dark:to-teal-900/30">
                                <img
                                  src={project.image}
                                  alt={project.title}
                                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                />
                              </div>
                            )}

                            <CardHeader className={`pb-2 ${!project.image ? "pt-6" : ""}`}>
                              <div className="flex items-start justify-between pr-8">
                                <div className="min-w-0 flex-1">
                                  <CardTitle className="line-clamp-2 text-lg font-bold text-gray-900 dark:text-gray-50">
                                    {project.title}
                                  </CardTitle>
                                  <p className="mt-0.5 text-sm font-medium text-cyan-700 dark:text-cyan-400">
                                    {project.company || "Personal Project"}
                                    <span className="mx-1.5 text-gray-400 dark:text-gray-500">
                                      •
                                    </span>
                                    <span className="text-gray-600 dark:text-gray-400">
                                      {project.category}
                                    </span>
                                  </p>
                                </div>
                              </div>
                            </CardHeader>

                            <CardContent className="flex flex-1 flex-col space-y-3 pt-0">
                              {/* Status badge */}
                              <div className="flex flex-wrap gap-2">
                                <Badge
                                  className={`text-xs font-medium ${
                                    project.status === "shipped"
                                      ? "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                                      : project.status === "wip"
                                        ? "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                                        : "border-gray-200 bg-gray-100 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                                  }`}
                                >
                                  {project.status === "shipped"
                                    ? "Shipped"
                                    : project.status === "wip"
                                      ? "In Progress"
                                      : "Archived"}
                                </Badge>
                                {project.role && (
                                  <Badge
                                    variant="outline"
                                    className="border-gray-300 text-xs text-gray-700 dark:border-gray-600 dark:text-gray-300"
                                  >
                                    {project.role}
                                  </Badge>
                                )}
                              </div>

                              {/* Excerpt */}
                              {project.excerpt && (
                                <p className="line-clamp-2 flex-1 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                                  {project.excerpt}
                                </p>
                              )}

                              {/* Technologies */}
                              {project.technologies.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {project.technologies.slice(0, 4).map((tech) => (
                                    <Badge
                                      key={tech}
                                      variant="secondary"
                                      className="border border-cyan-200 bg-cyan-100 px-2 py-0.5 text-[11px] font-medium text-cyan-800 dark:border-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200"
                                    >
                                      {tech}
                                    </Badge>
                                  ))}
                                  {project.technologies.length > 4 && (
                                    <Badge
                                      variant="secondary"
                                      className="bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                    >
                                      +{project.technologies.length - 4}
                                    </Badge>
                                  )}
                                </div>
                              )}

                              {/* Links */}
                              {Object.keys(project.links).length > 0 && (
                                <div className="flex gap-3 border-t border-cyan-100 pt-2 dark:border-cyan-900/40">
                                  {Object.entries(project.links).map(([name, url]) => (
                                    <a
                                      key={name}
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-xs font-medium text-cyan-700 transition-colors hover:text-cyan-900 hover:underline dark:text-cyan-400 dark:hover:text-cyan-300"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                      {name}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )
                      )}
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="cv" className="mt-0 space-y-8">
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i}>
                      <Skeleton className="mb-4 h-8 w-48" />
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 4 }).map((_, j) => (
                          <Skeleton key={j} className="h-32 w-full" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {/* Skills Section - Grouped by Category */}
                  <div>
                    <div className="mb-6 flex items-center justify-between">
                      <h2 className="flex items-center gap-2 text-xl font-semibold">
                        <Briefcase className="h-5 w-5" />
                        Skills
                        <Badge variant="secondary" className="ml-2">
                          {filteredSkills.length}
                        </Badge>
                      </h2>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openCategoryDialog()}
                          className="border-[var(--tartarus-teal)] text-[var(--tartarus-teal)] hover:bg-[var(--tartarus-teal)]/10"
                        >
                          <Settings className="mr-2 h-4 w-4" />
                          New Category
                        </Button>
                        <Button
                          size="sm"
                          onClick={addSkillWithKronus}
                          className="bg-[var(--tartarus-gold)] font-medium text-[var(--tartarus-void)] hover:bg-[var(--tartarus-gold)]/90"
                        >
                          <img
                            src="/chronus-logo.png"
                            alt="Kronus"
                            className="mr-2 h-4 w-4 rounded-full object-cover"
                          />
                          Add with Kronus
                        </Button>
                      </div>
                    </div>

                    {Object.entries(skillsByCategory).length === 0 ? (
                      <div className="py-12 text-center">
                        <p className="text-muted-foreground">No skills match your filters.</p>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        {Object.entries(skillsByCategory).map(([category, categorySkills]) => {
                          const config = categoryConfig[category] || {
                            color: "text-gray-700 dark:text-gray-400",
                            bgColor:
                              "bg-gray-100 dark:bg-gray-900/30 border-gray-200 dark:border-gray-800",
                            barColor: "bg-gray-500",
                            icon: <Tag className="h-4 w-4" />,
                          };
                          // Find the category object to pass to edit dialog
                          const categoryObj = skillCategories.find((c) => c.name === category);

                          return (
                            <div key={category}>
                              {/* Category Header */}
                              <div
                                className={`mb-4 flex items-center gap-3 rounded-lg border p-3 ${config.bgColor} group`}
                              >
                                <span className={config.color}>{config.icon}</span>
                                <h3 className={`font-semibold ${config.color}`}>{category}</h3>
                                <Badge variant="outline" className={config.color}>
                                  {categorySkills.length} skills
                                </Badge>
                                <div className="flex-1" />
                                {categoryObj && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`h-7 w-7 p-0 opacity-0 transition-opacity group-hover:opacity-100 ${config.color}`}
                                    onClick={() => openCategoryDialog(categoryObj)}
                                    title="Edit category"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>

                              {/* Skills Grid */}
                              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                {categorySkills.map((skill) =>
                                  editingSkill === skill.id ? (
                                    <SkillEditForm
                                      key={skill.id}
                                      skill={skill}
                                      categories={skillCategories}
                                      onSave={handleSaveSkill}
                                      onCancel={() => setEditingSkill(null)}
                                    />
                                  ) : (
                                    <Link key={skill.id} href={`/repository/skill/${skill.id}`}>
                                      <Card
                                        className={`group h-full cursor-pointer border transition-all hover:shadow-md ${config.bgColor.replace("bg-", "border-").replace("/30", "/50")}`}
                                      >
                                        <CardHeader className="pb-2">
                                          <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                              <div
                                                className={`flex h-10 w-10 items-center justify-center rounded-lg ${config.bgColor}`}
                                              >
                                                <SkillIcon
                                                  skillName={skill.name}
                                                  fallbackIcon={config.icon}
                                                  fallbackColor={config.color}
                                                />
                                              </div>
                                              <div className="min-w-0 flex-1">
                                                <CardTitle className="line-clamp-1 text-sm font-semibold">
                                                  {skill.name}
                                                </CardTitle>
                                                <div className="mt-0.5 flex items-center gap-0.5">
                                                  {Array.from({ length: 5 }).map((_, i) => (
                                                    <div
                                                      key={i}
                                                      className={`h-2 w-3 rounded-sm ${
                                                        i < skill.magnitude
                                                          ? config.barColor
                                                          : "bg-muted-foreground/20 border-muted-foreground/30 border"
                                                      }`}
                                                    />
                                                  ))}
                                                </div>
                                              </div>
                                            </div>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-8 w-8 shrink-0 p-0 opacity-0 group-hover:opacity-100"
                                              onClick={(e) => {
                                                e.preventDefault();
                                                setEditingSkill(skill.id);
                                              }}
                                            >
                                              <Edit className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </CardHeader>
                                        <CardContent className="pt-0">
                                          <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
                                            {skill.description}
                                          </p>
                                        </CardContent>
                                      </Card>
                                    </Link>
                                  )
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Work Experience Section - Timeline Style */}
                  <div>
                    <div className="mb-6 flex items-center justify-between">
                      <h2 className="flex items-center gap-2 text-xl font-semibold">
                        <Briefcase className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        Work Experience
                        <Badge variant="secondary" className="ml-2">
                          {experience.length}
                        </Badge>
                      </h2>
                      <Button
                        size="sm"
                        onClick={addExperienceWithKronus}
                        className="bg-[var(--tartarus-gold)] font-medium text-[var(--tartarus-void)] hover:bg-[var(--tartarus-gold)]/90"
                      >
                        <img
                          src="/chronus-logo.png"
                          alt="Kronus"
                          className="mr-2 h-4 w-4 rounded-full object-cover"
                        />
                        Add with Kronus
                      </Button>
                    </div>

                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute top-0 bottom-0 left-4 w-0.5 bg-gradient-to-b from-[var(--tartarus-gold)] via-[var(--tartarus-gold)]/50 to-transparent" />

                      <div className="space-y-6">
                        {experience.map((exp, index) =>
                          editingExperience === exp.id ? (
                            <div key={exp.id} className="ml-10">
                              <ExperienceEditForm
                                experience={exp}
                                onSave={handleSaveExperience}
                                onCancel={() => setEditingExperience(null)}
                              />
                            </div>
                          ) : (
                            <div key={exp.id} className="relative flex gap-4">
                              {/* Timeline dot */}
                              <div
                                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                                  !exp.dateEnd
                                    ? "border-amber-500 bg-amber-100 dark:bg-amber-900/50"
                                    : "border-amber-300 bg-white dark:bg-gray-900"
                                }`}
                              >
                                <Briefcase
                                  className={`h-4 w-4 ${
                                    !exp.dateEnd ? "text-amber-600" : "text-amber-400"
                                  }`}
                                />
                              </div>

                              {/* Experience Card */}
                              <Link href={`/repository/experience/${exp.id}`} className="flex-1">
                                <Card
                                  className={`group cursor-pointer transition-all hover:shadow-md ${
                                    !exp.dateEnd
                                      ? "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/10"
                                      : ""
                                  }`}
                                >
                                  <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="mb-1 flex items-center gap-2">
                                          <CardTitle className="text-base font-semibold">
                                            {exp.title}
                                          </CardTitle>
                                          {!exp.dateEnd && (
                                            <Badge className="bg-amber-500 text-xs text-white">
                                              Current
                                            </Badge>
                                          )}
                                        </div>
                                        <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                                          {exp.company}
                                        </p>
                                        <div className="text-muted-foreground mt-2 flex items-center gap-3 text-xs">
                                          <span className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {exp.dateStart} - {exp.dateEnd || "Present"}
                                          </span>
                                          <span className="flex items-center gap-1">•</span>
                                          <span>{exp.location}</span>
                                        </div>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          setEditingExperience(exp.id);
                                        }}
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </CardHeader>
                                  <CardContent className="space-y-3 pt-0">
                                    {exp.tagline && (
                                      <p className="text-muted-foreground text-sm italic">
                                        {exp.tagline}
                                      </p>
                                    )}
                                    {exp.department && (
                                      <p className="text-muted-foreground text-xs">
                                        <span className="font-medium">Department:</span>{" "}
                                        {exp.department}
                                      </p>
                                    )}
                                    {exp.note && (
                                      <p className="text-muted-foreground rounded border border-amber-100 bg-amber-50 p-2 text-xs dark:border-amber-800 dark:bg-amber-900/20">
                                        {exp.note}
                                      </p>
                                    )}
                                    {exp.achievements && exp.achievements.length > 0 && (
                                      <div className="border-t border-amber-100 pt-2 dark:border-amber-800">
                                        <p className="mb-2 text-xs font-medium text-amber-700 dark:text-amber-400">
                                          Key Achievements ({exp.achievements.length})
                                        </p>
                                        <div className="space-y-2">
                                          {/* Group achievements by category */}
                                          {Object.entries(
                                            exp.achievements.reduce(
                                              (acc, ach) => {
                                                const cat = ach.category || "General";
                                                if (!acc[cat]) acc[cat] = [];
                                                acc[cat].push(ach);
                                                return acc;
                                              },
                                              {} as Record<string, Achievement[]>
                                            )
                                          )
                                            .slice(0, 3)
                                            .map(([category, achievements]) => (
                                              <div key={category}>
                                                <p className="mb-1 text-[10px] font-semibold tracking-wide text-amber-600 uppercase dark:text-amber-500">
                                                  {category}
                                                </p>
                                                <ul className="space-y-1">
                                                  {achievements.slice(0, 2).map((ach, i) => (
                                                    <li
                                                      key={i}
                                                      className="text-muted-foreground flex gap-2 text-xs"
                                                    >
                                                      <span className="shrink-0 text-amber-400">
                                                        •
                                                      </span>
                                                      <span>
                                                        {ach.description}
                                                        {ach.metrics && (
                                                          <Badge
                                                            variant="outline"
                                                            className="ml-2 border-amber-200 px-1 py-0 text-[9px] text-amber-600 dark:border-amber-700 dark:text-amber-400"
                                                          >
                                                            {ach.metrics}
                                                          </Badge>
                                                        )}
                                                      </span>
                                                    </li>
                                                  ))}
                                                </ul>
                                              </div>
                                            ))}
                                          {exp.achievements.length > 6 && (
                                            <p className="text-muted-foreground text-[10px]">
                                              +{exp.achievements.length - 6} more achievements...
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              </Link>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Education Section - Card Grid Style */}
                  <div>
                    <div className="mb-6 flex items-center justify-between">
                      <h2 className="flex items-center gap-2 text-xl font-semibold">
                        <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        Education
                        <Badge variant="secondary" className="ml-2">
                          {education.length}
                        </Badge>
                      </h2>
                      <Button
                        size="sm"
                        onClick={addEducationWithKronus}
                        className="bg-[var(--tartarus-gold)] font-medium text-[var(--tartarus-void)] hover:bg-[var(--tartarus-gold)]/90"
                      >
                        <img
                          src="/chronus-logo.png"
                          alt="Kronus"
                          className="mr-2 h-4 w-4 rounded-full object-cover"
                        />
                        Add with Kronus
                      </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {education.map((edu) =>
                        editingEducation === edu.id ? (
                          <EducationEditForm
                            key={edu.id}
                            education={edu}
                            onSave={handleSaveEducation}
                            onCancel={() => setEditingEducation(null)}
                          />
                        ) : (
                          <Link key={edu.id} href={`/repository/education/${edu.id}`}>
                            <Card className="group h-full cursor-pointer border-blue-100 transition-all hover:shadow-md dark:border-blue-900/30">
                              <CardHeader className="pb-3">
                                {/* Decorative top bar */}
                                <div className="absolute top-0 right-0 left-0 h-1 rounded-t-lg bg-gradient-to-r from-blue-400 to-blue-600" />

                                <div className="flex items-start justify-between pt-2">
                                  <div className="flex-1">
                                    <div className="mb-2 flex items-center gap-2">
                                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                                        <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                      </div>
                                      <div>
                                        <CardTitle className="text-base font-semibold">
                                          {edu.degree}
                                        </CardTitle>
                                        <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                                          {edu.field}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setEditingEducation(edu.id);
                                    }}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <p className="text-sm font-medium">{edu.institution}</p>
                                <div className="text-muted-foreground flex items-center gap-2 text-xs">
                                  <Calendar className="h-3 w-3" />
                                  <span>
                                    {edu.dateStart} - {edu.dateEnd}
                                  </span>
                                  <span>•</span>
                                  <span>{edu.location}</span>
                                </div>
                                {edu.tagline && (
                                  <p className="text-muted-foreground border-t border-blue-100 pt-2 text-xs italic dark:border-blue-800">
                                    {edu.tagline}
                                  </p>
                                )}
                                {edu.note && (
                                  <p className="text-muted-foreground rounded border border-blue-100 bg-blue-50 p-2 text-xs dark:border-blue-800 dark:bg-blue-900/20">
                                    {edu.note}
                                  </p>
                                )}
                                {edu.focusAreas && edu.focusAreas.length > 0 && (
                                  <div className="border-t border-blue-100 pt-2 dark:border-blue-800">
                                    <p className="mb-1 text-[10px] font-semibold tracking-wide text-blue-600 uppercase dark:text-blue-500">
                                      Focus Areas
                                    </p>
                                    <ul className="space-y-0.5">
                                      {edu.focusAreas.slice(0, 3).map((area, i) => (
                                        <li
                                          key={i}
                                          className="text-muted-foreground flex gap-2 text-xs"
                                        >
                                          <span className="shrink-0 text-blue-400">•</span>
                                          <span className="line-clamp-1">{area}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {edu.achievements && edu.achievements.length > 0 && (
                                  <div className="border-t border-blue-100 pt-2 dark:border-blue-800">
                                    <p className="mb-1 text-[10px] font-semibold tracking-wide text-blue-600 uppercase dark:text-blue-500">
                                      Achievements
                                    </p>
                                    <ul className="space-y-0.5">
                                      {edu.achievements.slice(0, 2).map((ach, i) => (
                                        <li
                                          key={i}
                                          className="text-muted-foreground flex gap-2 text-xs"
                                        >
                                          <span className="shrink-0 text-blue-400">•</span>
                                          <span className="line-clamp-2">{ach}</span>
                                        </li>
                                      ))}
                                      {edu.achievements.length > 2 && (
                                        <li className="text-muted-foreground pl-4 text-[10px]">
                                          +{edu.achievements.length - 2} more...
                                        </li>
                                      )}
                                    </ul>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </Link>
                        )
                      )}
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="mt-0">
              <div className="grid gap-4 p-6">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[var(--tartarus-teal)]" />
                  </div>
                ) : (
                  <>
                    {filteredNotes.length === 0 ? (
                      <Card className="text-muted-foreground border-dashed p-12 text-center">
                        <StickyNote className="text-muted-foreground/50 mx-auto mb-4 h-12 w-12" />
                        <p className="mb-2 text-lg font-medium">No notes yet</p>
                        <p className="text-sm">
                          Notes are quick reference material, snippets, and personal observations.
                        </p>
                      </Card>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredNotes.map((doc) => (
                            <Link key={doc.slug} href={`/repository/${doc.slug}`}>
                              <Card className="group h-full cursor-pointer transition-all hover:shadow-md">
                                <CardHeader className="pb-2">
                                  <CardTitle className="flex items-start justify-between text-lg">
                                    <span className="line-clamp-2">{doc.title}</span>
                                    <Badge variant="secondary" className="ml-2 shrink-0">
                                      note
                                    </Badge>
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <p className="text-muted-foreground line-clamp-3 text-sm">
                                    {doc.summary ||
                                      stripMarkdown(doc.content || "").substring(0, 150) + "..."}
                                  </p>
                                  {doc.metadata?.tags && doc.metadata.tags.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-1">
                                      {doc.metadata.tags.slice(0, 3).map((tag: string) => (
                                        <Badge key={tag} variant="outline" className="text-xs">
                                          {tag}
                                        </Badge>
                                      ))}
                                      {doc.metadata.tags.length > 3 && (
                                        <Badge variant="outline" className="text-xs">
                                          +{doc.metadata.tags.length - 3}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            </Link>
                          ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </TabsContent>

            {/* Linear Tab - Show cached data with sync */}
            <TabsContent value="linear" className="mt-0">
              <div className="space-y-6 p-6">
                {/* Header with sync button */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">Linear Cache</h3>
                    <p className="text-muted-foreground text-sm">
                      {linearLastSync
                        ? `Last synced: ${new Date(linearLastSync).toLocaleString()}`
                        : "Not synced yet"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={syncLinearData}
                      disabled={linearSyncing}
                      className="border-[#5E6AD2]/30 hover:border-[#5E6AD2]"
                    >
                      <RefreshCw className={`mr-2 h-4 w-4 ${linearSyncing ? "animate-spin" : ""}`} />
                      {linearSyncing ? "Syncing..." : "Sync Now"}
                    </Button>
                    <Link href="/integrations/linear">
                      <Button className="bg-[#5E6AD2] text-white hover:bg-[#5E6AD2]/90">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Full Dashboard
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                  <Card className="border-[#5E6AD2]/20 bg-[#5E6AD2]/5">
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-[#5E6AD2]">{linearProjects.length}</div>
                      <div className="text-muted-foreground text-sm">Projects</div>
                    </CardContent>
                  </Card>
                  <Card className="border-[#5E6AD2]/20 bg-[#5E6AD2]/5">
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-[#5E6AD2]">{linearIssues.length}</div>
                      <div className="text-muted-foreground text-sm">Issues</div>
                    </CardContent>
                  </Card>
                  <Card className="border-[#5E6AD2]/20 bg-[#5E6AD2]/5">
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-[#5E6AD2]">
                        {linearIssues.filter((i) => i.state?.name === "In Progress").length}
                      </div>
                      <div className="text-muted-foreground text-sm">In Progress</div>
                    </CardContent>
                  </Card>
                  <Card className="border-[#5E6AD2]/20 bg-[#5E6AD2]/5">
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-[#5E6AD2]">
                        {linearProjects.filter((p) => p.summary).length + linearIssues.filter((i) => i.summary).length}
                      </div>
                      <div className="text-muted-foreground text-sm">With Summaries</div>
                    </CardContent>
                  </Card>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#5E6AD2]" />
                  </div>
                ) : linearProjects.length === 0 && linearIssues.length === 0 ? (
                  <Card className="text-muted-foreground border-dashed p-12 text-center">
                    <Trello className="text-muted-foreground/50 mx-auto mb-4 h-12 w-12" />
                    <p className="mb-2 text-lg font-medium">No cached Linear data</p>
                    <p className="mb-4 text-sm">
                      Sync your Linear workspace to see your projects and issues here.
                    </p>
                    <Button
                      onClick={syncLinearData}
                      disabled={linearSyncing}
                      className="bg-[#5E6AD2] text-white hover:bg-[#5E6AD2]/90"
                    >
                      <RefreshCw className={`mr-2 h-4 w-4 ${linearSyncing ? "animate-spin" : ""}`} />
                      Sync Linear Data
                    </Button>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    {/* Projects */}
                    {linearProjects.length > 0 && (
                      <div>
                        <h4 className="mb-3 text-lg font-medium">Projects ({linearProjects.length})</h4>
                        <div className="grid gap-3 md:grid-cols-2">
                          {linearProjects.slice(0, 6).map((project) => (
                            <Card key={project.id} className="hover:border-[#5E6AD2]/50 transition-colors">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{project.name}</span>
                                      {project.state && (
                                        <Badge variant="outline" className="text-xs">
                                          {project.state}
                                        </Badge>
                                      )}
                                    </div>
                                    {project.summary ? (
                                      <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                                        {project.summary}
                                      </p>
                                    ) : project.description ? (
                                      <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                                        {project.description.substring(0, 150)}...
                                      </p>
                                    ) : null}
                                    {project.progress !== null && (
                                      <div className="mt-2">
                                        <div className="bg-muted h-1.5 w-full rounded-full">
                                          <div
                                            className="h-1.5 rounded-full bg-[#5E6AD2]"
                                            style={{ width: `${(project.progress || 0) * 100}%` }}
                                          />
                                        </div>
                                        <span className="text-muted-foreground text-xs">
                                          {Math.round((project.progress || 0) * 100)}% complete
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  {project.url && (
                                    <a href={project.url} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="text-muted-foreground hover:text-foreground h-4 w-4" />
                                    </a>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Issues */}
                    {linearIssues.length > 0 && (
                      <div>
                        <h4 className="mb-3 text-lg font-medium">Recent Issues ({linearIssues.length})</h4>
                        <div className="space-y-2">
                          {linearIssues.slice(0, 10).map((issue) => (
                            <Card key={issue.id} className="hover:border-[#5E6AD2]/50 transition-colors">
                              <CardContent className="flex items-center gap-4 p-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground font-mono text-xs">
                                      {issue.identifier}
                                    </span>
                                    <span className="font-medium">{issue.title}</span>
                                  </div>
                                  {issue.summary && (
                                    <p className="text-muted-foreground mt-0.5 line-clamp-1 text-sm">
                                      {issue.summary}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {issue.state?.name && (
                                    <Badge
                                      variant="outline"
                                      className={`text-xs ${
                                        issue.state.name === "Done"
                                          ? "border-green-500/30 bg-green-500/10 text-green-600"
                                          : issue.state.name === "In Progress"
                                            ? "border-blue-500/30 bg-blue-500/10 text-blue-600"
                                            : ""
                                      }`}
                                    >
                                      {issue.state.name}
                                    </Badge>
                                  )}
                                  {issue.url && (
                                    <a href={issue.url} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="text-muted-foreground hover:text-foreground h-4 w-4" />
                                    </a>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Media Tab - Grid Display with Data */}
            <TabsContent value="media" className="mt-0">
              <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">Media Library</h3>
                    <p className="text-muted-foreground text-sm">
                      {mediaTotal > 0
                        ? `${mediaTotal} media assets`
                        : "No media assets found"}
                    </p>
                  </div>
                  <Link href="/multimedia">
                    <Button className="bg-[#8B5CF6] text-white hover:bg-[#8B5CF6]/90">
                      <Image className="mr-2 h-4 w-4" />
                      Full Gallery
                    </Button>
                  </Link>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#8B5CF6]" />
                  </div>
                ) : mediaAssets.length === 0 ? (
                  <Card className="border-dashed border-[#8B5CF6]/30 p-8 text-center">
                    <Image className="text-muted-foreground/50 mx-auto mb-4 h-12 w-12" />
                    <p className="text-muted-foreground text-sm">
                      No media assets found. Upload images, diagrams, or documents to see them here.
                    </p>
                  </Card>
                ) : (
                  <>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                      <Card className="border-[#8B5CF6]/20 bg-[#8B5CF6]/5">
                        <CardContent className="p-4">
                          <div className="text-2xl font-bold text-[#8B5CF6]">{mediaTotal}</div>
                          <div className="text-muted-foreground text-sm">Total Assets</div>
                        </CardContent>
                      </Card>
                      <Card className="border-[#8B5CF6]/20 bg-[#8B5CF6]/5">
                        <CardContent className="p-4">
                          <div className="text-2xl font-bold text-[#8B5CF6]">
                            {mediaAssets.filter((m) => m.mime_type?.startsWith("image/")).length}
                          </div>
                          <div className="text-muted-foreground text-sm">Images</div>
                        </CardContent>
                      </Card>
                      <Card className="border-[#8B5CF6]/20 bg-[#8B5CF6]/5">
                        <CardContent className="p-4">
                          <div className="text-2xl font-bold text-[#8B5CF6]">
                            {mediaAssets.filter((m) => m.destination === "journal").length}
                          </div>
                          <div className="text-muted-foreground text-sm">Journal</div>
                        </CardContent>
                      </Card>
                      <Card className="border-[#8B5CF6]/20 bg-[#8B5CF6]/5">
                        <CardContent className="p-4">
                          <div className="text-2xl font-bold text-[#8B5CF6]">
                            {mediaAssets.filter((m) => m.destination === "media").length}
                          </div>
                          <div className="text-muted-foreground text-sm">Standalone</div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Media Grid */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                      {mediaAssets.slice(0, 18).map((asset) => (
                        <Link key={asset.id} href={`/multimedia?id=${asset.id}`}>
                          <Card className="group cursor-pointer overflow-hidden transition-colors hover:border-[#8B5CF6]/50">
                            <div className="bg-muted relative aspect-square">
                              {asset.mime_type?.startsWith("image/") ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={asset.supabase_url || asset.drive_url || `/api/media/${asset.id}/raw`}
                                  alt={asset.alt || asset.filename}
                                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <FileText className="text-muted-foreground h-8 w-8" />
                                </div>
                              )}
                              {/* Destination badge */}
                              <div className="absolute right-1 top-1">
                                <Badge
                                  variant="secondary"
                                  className="bg-black/60 text-[10px] text-white"
                                >
                                  {asset.destination}
                                </Badge>
                              </div>
                            </div>
                            <CardContent className="p-2">
                              <p className="line-clamp-1 text-xs font-medium">
                                {asset.filename}
                              </p>
                              <p className="text-muted-foreground text-[10px]">
                                {new Date(asset.created_at).toLocaleDateString()}
                              </p>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>

                    {/* View All Link */}
                    {mediaTotal > 18 && (
                      <div className="flex justify-center pt-4">
                        <Link href="/multimedia">
                          <Button variant="outline" className="border-[#8B5CF6]/30 hover:border-[#8B5CF6]">
                            View All {mediaTotal} Assets
                            <ExternalLink className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    )}
                  </>
                )}
              </div>
            </TabsContent>

            {/* Chats Tab - Both Main Conversations AND Kronus MCP History */}
            <TabsContent value="chats" className="mt-0">
              <div className="space-y-8 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">Chat History</h3>
                    <p className="text-muted-foreground text-sm">
                      {conversationsPagination && kronusChatsPagination
                        ? `${conversationsPagination.total} conversations, ${kronusChatsPagination.total} Kronus queries`
                        : "Loading..."}
                    </p>
                  </div>
                  <Link href="/chat">
                    <Button className="bg-[var(--tartarus-gold)] text-[var(--tartarus-void)] hover:bg-[var(--tartarus-gold)]/90">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      New Chat
                    </Button>
                  </Link>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[var(--tartarus-gold)]" />
                  </div>
                ) : (
                  <>
                    {/* ═══════════════════════════════════════════════════════════════════
                        SECTION 1: Main Chat Conversations (Admin UI)
                        ═══════════════════════════════════════════════════════════════════ */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--tartarus-teal)]/10">
                          <MessageSquare className="h-4 w-4 text-[var(--tartarus-teal)]" />
                        </div>
                        <div>
                          <h4 className="font-semibold">Conversations</h4>
                          <p className="text-muted-foreground text-xs">
                            Chat sessions with Kronus assistant
                          </p>
                        </div>
                        <Badge variant="secondary" className="ml-auto">
                          {conversationsPagination?.total || 0}
                        </Badge>
                      </div>

                      {conversations.length === 0 ? (
                        <Card className="border-dashed border-[var(--tartarus-teal)]/30 p-6 text-center">
                          <p className="text-muted-foreground text-sm">
                            No chat conversations yet. Start a new chat to begin!
                          </p>
                        </Card>
                      ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                          {conversations.slice(0, 6).map((conv) => (
                            <Link key={conv.id} href={`/chat?id=${conv.id}`}>
                              <Card className="h-full cursor-pointer transition-colors hover:border-[var(--tartarus-teal)]/50">
                                <CardContent className="p-4">
                                  <div className="flex items-start gap-3">
                                    <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tartarus-teal)]" />
                                    <div className="min-w-0 flex-1">
                                      <p className="line-clamp-1 font-medium">{conv.title}</p>
                                      {conv.summary && (
                                        <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                                          {conv.summary}
                                        </p>
                                      )}
                                      <p className="text-muted-foreground mt-2 flex items-center gap-1 text-xs">
                                        <Clock className="h-3 w-3" />
                                        {new Date(conv.updated_at).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </Link>
                          ))}
                        </div>
                      )}

                      {conversations.length > 6 && (
                        <div className="flex justify-center">
                          <Link href="/chat">
                            <Button variant="outline" size="sm">
                              View All Conversations
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>

                    {/* Divider */}
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="border-border w-full border-t" />
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-background text-muted-foreground px-3 text-xs uppercase tracking-wider">
                          MCP Tool Queries
                        </span>
                      </div>
                    </div>

                    {/* ═══════════════════════════════════════════════════════════════════
                        SECTION 2: Kronus MCP Tool Queries (askKronus)
                        ═══════════════════════════════════════════════════════════════════ */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--tartarus-gold)]/10">
                          <Bot className="h-4 w-4 text-[var(--tartarus-gold)]" />
                        </div>
                        <div>
                          <h4 className="font-semibold">Kronus Queries</h4>
                          <p className="text-muted-foreground text-xs">
                            Direct questions via kronus_ask MCP tool
                          </p>
                        </div>
                        <Badge variant="secondary" className="ml-auto">
                          {kronusChatsPagination?.total || 0}
                        </Badge>
                      </div>

                      {/* Kronus Stats */}
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
                        <Card className="border-[var(--tartarus-gold)]/20 bg-[var(--tartarus-gold)]/5">
                          <CardContent className="p-3">
                            <div className="text-xl font-bold text-[var(--tartarus-gold)]">
                              {kronusChatsPagination?.total || 0}
                            </div>
                            <div className="text-muted-foreground text-xs">Total Queries</div>
                          </CardContent>
                        </Card>
                        <Card className="border-[var(--tartarus-gold)]/20 bg-[var(--tartarus-gold)]/5">
                          <CardContent className="p-3">
                            <div className="text-xl font-bold text-[var(--tartarus-gold)]">
                              {kronusChats.filter((c) => c.depth === "deep").length}
                            </div>
                            <div className="text-muted-foreground text-xs">Deep</div>
                          </CardContent>
                        </Card>
                        <Card className="border-[var(--tartarus-gold)]/20 bg-[var(--tartarus-gold)]/5">
                          <CardContent className="p-3">
                            <div className="text-xl font-bold text-[var(--tartarus-gold)]">
                              {kronusChats.filter((c) => c.has_summary).length}
                            </div>
                            <div className="text-muted-foreground text-xs">Summarized</div>
                          </CardContent>
                        </Card>
                        <Card className="border-[var(--tartarus-gold)]/20 bg-[var(--tartarus-gold)]/5">
                          <CardContent className="p-3">
                            <div className="text-xl font-bold text-[var(--tartarus-gold)]">
                              {kronusChats.reduce((acc, c) => acc + (c.input_tokens || 0) + (c.output_tokens || 0), 0).toLocaleString()}
                            </div>
                            <div className="text-muted-foreground text-xs">Tokens</div>
                          </CardContent>
                        </Card>
                      </div>

                      {kronusChats.length === 0 ? (
                        <Card className="border-dashed border-[var(--tartarus-gold)]/30 p-6 text-center">
                          <p className="text-muted-foreground text-sm">
                            No Kronus MCP queries yet. Use kronus_ask in Claude Code to query your projects.
                          </p>
                        </Card>
                      ) : (
                        <div className="space-y-2">
                          {kronusChats.slice(0, 8).map((chat) => (
                            <Card key={chat.id} className="transition-colors hover:border-[var(--tartarus-gold)]/50">
                              <CardContent className="p-3">
                                <div className="flex items-start gap-3">
                                  <Bot className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tartarus-gold)]" />
                                  <div className="min-w-0 flex-1">
                                    <p className="line-clamp-1 text-sm font-medium">{chat.question_preview}</p>
                                    <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
                                      {chat.summary || chat.answer_preview}
                                    </p>
                                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                        {chat.depth}
                                      </Badge>
                                      {chat.repository && (
                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                          {chat.repository}
                                        </Badge>
                                      )}
                                      <span className="text-muted-foreground text-[10px]">
                                        {new Date(chat.created_at).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}

                      {kronusChatsPagination?.has_more && (
                        <div className="flex justify-center">
                          <Link href="/kronus">
                            <Button variant="outline" size="sm">
                              View All Kronus Queries
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>

      {/* Category Edit/Create Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingCategory ? (
                <>
                  <Edit className="h-5 w-5" />
                  Edit Category
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5" />
                  New Category
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Update the category name, color, and icon."
                : "Create a new skill category to organize your skills."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Category Name */}
            <div className="grid gap-2">
              <Label htmlFor="category-name">Name</Label>
              <Input
                id="category-name"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., AI & Development"
              />
            </div>

            {/* Color Selector */}
            <div className="grid gap-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_COLORS.map((color) => {
                  const colorClasses = getColorClasses(color);
                  return (
                    <button
                      key={color}
                      type="button"
                      className={`h-8 w-8 rounded-full border-2 transition-all ${
                        categoryForm.color === color
                          ? "ring-primary scale-110 ring-2 ring-offset-2"
                          : "hover:scale-105"
                      } ${colorClasses.barColor}`}
                      onClick={() => setCategoryForm((prev) => ({ ...prev, color }))}
                      title={color}
                    />
                  );
                })}
              </div>
            </div>

            {/* Icon Selector */}
            <div className="grid gap-2">
              <Label>Icon</Label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(CATEGORY_ICONS).map(([iconName, iconElement]) => {
                  const colorClasses = getColorClasses(categoryForm.color);
                  return (
                    <button
                      key={iconName}
                      type="button"
                      className={`flex h-10 w-10 items-center justify-center rounded-lg border-2 transition-all ${
                        categoryForm.icon === iconName
                          ? `${colorClasses.bgColor} ring-primary border-current ring-2 ring-offset-1`
                          : "border-muted hover:border-muted-foreground/50"
                      }`}
                      onClick={() => setCategoryForm((prev) => ({ ...prev, icon: iconName }))}
                      title={iconName}
                    >
                      <span
                        className={
                          categoryForm.icon === iconName
                            ? colorClasses.color
                            : "text-muted-foreground"
                        }
                      >
                        {iconElement}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Preview */}
            <div className="grid gap-2">
              <Label>Preview</Label>
              <div
                className={`flex items-center gap-3 rounded-lg border p-3 ${getColorClasses(categoryForm.color).bgColor}`}
              >
                <span className={getColorClasses(categoryForm.color).color}>
                  {CATEGORY_ICONS[categoryForm.icon] || <Tag className="h-4 w-4" />}
                </span>
                <h3 className={`font-semibold ${getColorClasses(categoryForm.color).color}`}>
                  {categoryForm.name || "Category Name"}
                </h3>
              </div>
            </div>

            {/* Error Message */}
            {categoryError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                {categoryError}
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            {editingCategory && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteCategory}
                disabled={
                  deletingCategory ||
                  savingCategory ||
                  getSkillCountInCategory(editingCategory.name) > 0
                }
                className="mr-auto"
                title={
                  getSkillCountInCategory(editingCategory.name) > 0
                    ? `Cannot delete: ${getSkillCountInCategory(editingCategory.name)} skills use this category`
                    : "Delete category"
                }
              >
                {deletingCategory ? (
                  "Deleting..."
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </>
                )}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={closeCategoryDialog}
              disabled={savingCategory || deletingCategory}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveCategory}
              disabled={savingCategory || deletingCategory || !categoryForm.name.trim()}
            >
              {savingCategory ? "Saving..." : editingCategory ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Types Dialog */}
      <Dialog open={docTypeDialogOpen} onOpenChange={setDocTypeDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingDocType ? (
                <>
                  <Edit className="h-5 w-5" />
                  Edit Document Type
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5" />
                  Create Document Type
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingDocType
                ? "Update the document type name, description, and appearance."
                : "Create a new type to categorize your documents."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="doctype-name">Name</Label>
              <Input
                id="doctype-name"
                value={docTypeForm.name}
                onChange={(e) => setDocTypeForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., essay, poem, system-prompt"
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="doctype-desc">Description</Label>
              <Input
                id="doctype-desc"
                value={docTypeForm.description}
                onChange={(e) =>
                  setDocTypeForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Brief description of this type"
              />
            </div>

            {/* Existing Types List */}
            {documentTypes.length > 0 && !editingDocType && (
              <div className="grid gap-2">
                <Label>Existing Types</Label>
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border p-2">
                  {documentTypes.map((dt) => (
                    <button
                      key={dt.id}
                      type="button"
                      onClick={() => openDocTypeDialog(dt)}
                      className="hover:bg-muted group flex w-full items-center justify-between rounded px-2 py-1.5 text-left"
                    >
                      <span className="text-sm font-medium">{dt.name}</span>
                      <span className="text-muted-foreground group-hover:text-foreground text-xs">
                        {getDocCountWithType(dt.name)} docs • Edit
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Error Message */}
            {docTypeError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                {docTypeError}
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            {editingDocType && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteDocType}
                disabled={
                  deletingDocType || savingDocType || getDocCountWithType(editingDocType.name) > 0
                }
                className="mr-auto"
                title={
                  getDocCountWithType(editingDocType.name) > 0
                    ? `Cannot delete: ${getDocCountWithType(editingDocType.name)} documents use this type`
                    : "Delete type"
                }
              >
                {deletingDocType ? (
                  "Deleting..."
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </>
                )}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={closeDocTypeDialog}
              disabled={savingDocType || deletingDocType}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveDocType}
              disabled={savingDocType || deletingDocType || !docTypeForm.name.trim()}
            >
              {savingDocType ? "Saving..." : editingDocType ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
