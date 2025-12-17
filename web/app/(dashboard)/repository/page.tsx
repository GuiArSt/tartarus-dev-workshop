"use client";

import { useEffect, useState, useMemo, useCallback, memo } from "react";
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
import { Search, FileText, Code, Briefcase, GraduationCap, BookOpen, Calendar, Edit, Tag, Cpu, Palette, Database, Server, PenTool, Users } from "lucide-react";
import { SkillEditForm, ExperienceEditForm, EducationEditForm } from "@/components/repository/CVEditForms";
import { getSkillIconUrl } from "@/lib/skill-icons";

// Category colors and icons for skills
const CATEGORY_CONFIG: Record<string, { color: string; bgColor: string; icon: React.ReactNode }> = {
  "AI & Development": {
    color: "text-violet-700 dark:text-violet-400",
    bgColor: "bg-violet-100 dark:bg-violet-900/30 border-violet-200 dark:border-violet-800",
    icon: <Cpu className="h-4 w-4" />
  },
  "Design & Creative Production": {
    color: "text-pink-700 dark:text-pink-400",
    bgColor: "bg-pink-100 dark:bg-pink-900/30 border-pink-200 dark:border-pink-800",
    icon: <Palette className="h-4 w-4" />
  },
  "Data & Analytics": {
    color: "text-blue-700 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800",
    icon: <Database className="h-4 w-4" />
  },
  "Infrastructure & DevOps": {
    color: "text-orange-700 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800",
    icon: <Server className="h-4 w-4" />
  },
  "Writing & Communication": {
    color: "text-emerald-700 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800",
    icon: <PenTool className="h-4 w-4" />
  },
  "Business & Leadership": {
    color: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800",
    icon: <Users className="h-4 w-4" />
  },
};

// Magnitude bar component - memoized to prevent re-renders
const MagnitudeBar = memo(function MagnitudeBar({ magnitude, maxMagnitude = 5 }: { magnitude: number; maxMagnitude?: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxMagnitude }).map((_, i) => (
        <div
          key={i}
          className={`h-2 w-4 rounded-sm ${
            i < magnitude
              ? "bg-primary"
              : "bg-muted"
          }`}
        />
      ))}
      <span className="ml-2 text-xs text-muted-foreground">{magnitude}/{maxMagnitude}</span>
    </div>
  );
});

// Strip markdown for plain text preview (faster than ReactMarkdown)
function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s/g, '') // headers
    .replace(/\*\*(.+?)\*\*/g, '$1') // bold
    .replace(/\*(.+?)\*/g, '$1') // italic
    .replace(/`(.+?)`/g, '$1') // code
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // links
    .replace(/^\s*[-*+]\s/gm, '') // list items
    .replace(/^\s*\d+\.\s/gm, '') // numbered lists
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
}

interface Skill {
  id: string;
  name: string;
  category: string;
  magnitude: number;
  description: string;
  tags: string[];
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
  achievements: any[];
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

export default function RepositoryPage() {
  const [activeTab, setActiveTab] = useState("writings");
  const [writings, setWritings] = useState<Document[]>([]);
  const [prompts, setPrompts] = useState<Document[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [experience, setExperience] = useState<WorkExperience[]>([]);
  const [education, setEducation] = useState<Education[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [editingSkill, setEditingSkill] = useState<string | null>(null);
  const [editingExperience, setEditingExperience] = useState<string | null>(null);
  const [editingEducation, setEditingEducation] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Get unique categories from skills - memoized
  const categories = useMemo(() =>
    [...new Set(skills.map(s => s.category))].sort(),
    [skills]
  );

  // Memoize lowercase search query to avoid recalculating
  const searchLower = useMemo(() => searchQuery.toLowerCase(), [searchQuery]);

  // Filter skills by category and search - memoized
  const filteredSkills = useMemo(() =>
    skills.filter(s => {
      const matchesCategory = selectedCategory === "all" || s.category === selectedCategory;
      const matchesSearch = !searchQuery ||
        s.name.toLowerCase().includes(searchLower) ||
        s.description.toLowerCase().includes(searchLower);
      return matchesCategory && matchesSearch;
    }),
    [skills, selectedCategory, searchQuery, searchLower]
  );

  // Group skills by category for display - memoized
  const skillsByCategory = useMemo(() =>
    filteredSkills.reduce((acc, skill) => {
      if (!acc[skill.category]) acc[skill.category] = [];
      acc[skill.category].push(skill);
      return acc;
    }, {} as Record<string, Skill[]>),
    [filteredSkills]
  );

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === "writings") {
        const res = await fetch("/api/documents?type=writing");
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        console.log("Fetched writings:", data.documents?.length || 0);
        setWritings(data.documents || []);
      } else if (activeTab === "prompts") {
        const res = await fetch("/api/documents?type=prompt");
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        console.log("Fetched prompts:", data.documents?.length || 0);
        setPrompts(data.documents || []);
      } else if (activeTab === "cv") {
        const res = await fetch("/api/cv");
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        console.log("Fetched CV data:", {
          skills: data.skills?.length || 0,
          experience: data.experience?.length || 0,
          education: data.education?.length || 0,
        });
        setSkills(data.skills || []);
        setExperience(data.experience || []);
        setEducation(data.education || []);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      // Set empty arrays on error to prevent stale data
      if (activeTab === "writings") setWritings([]);
      else if (activeTab === "prompts") setPrompts([]);
      else if (activeTab === "cv") {
        setSkills([]);
        setExperience([]);
        setEducation([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Extract all unique tags from documents - memoized
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    [...writings, ...prompts].forEach((doc) => {
      const docTags = doc.metadata?.tags || [];
      if (Array.isArray(docTags)) {
        docTags.forEach((tag: string) => tags.add(tag));
      }
    });
    return Array.from(tags).sort();
  }, [writings, prompts]);

  // Extract all unique types from documents - memoized
  const allTypes = useMemo(() => {
    const types = new Set<string>();
    [...writings, ...prompts].forEach((doc) => {
      if (doc.metadata?.type) {
        types.add(doc.metadata.type);
      }
    });
    return Array.from(types).sort();
  }, [writings, prompts]);

  // Filtered writings - memoized
  const filteredWritings = useMemo(() =>
    writings.filter((d) => {
      const matchesSearch = !searchQuery || d.title.toLowerCase().includes(searchLower) || d.content.toLowerCase().includes(searchLower);
      const docTags = d.metadata?.tags || [];
      const matchesTag = selectedTag === "all" || (Array.isArray(docTags) && docTags.includes(selectedTag));
      const matchesType = selectedType === "all" || d.metadata?.type === selectedType;
      return matchesSearch && matchesTag && matchesType;
    }),
    [writings, searchQuery, searchLower, selectedTag, selectedType]
  );

  // Filtered prompts - memoized
  const filteredPrompts = useMemo(() =>
    prompts.filter((d) => {
      const matchesSearch = !searchQuery || d.title.toLowerCase().includes(searchLower) || d.content.toLowerCase().includes(searchLower);
      const docTags = d.metadata?.tags || [];
      const matchesTag = selectedTag === "all" || (Array.isArray(docTags) && docTags.includes(selectedTag));
      const matchesType = selectedType === "all" || d.metadata?.type === selectedType;
      return matchesSearch && matchesTag && matchesType;
    }),
    [prompts, searchQuery, searchLower, selectedTag, selectedType]
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
        fetchData();
      }
    } catch (error) {
      console.error("Failed to save skill:", error);
    }
  }, []);

  const handleSaveExperience = useCallback(async (data: Partial<WorkExperience>) => {
    try {
      const res = await fetch(`/api/cv/experience/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setEditingExperience(null);
        fetchData();
      }
    } catch (error) {
      console.error("Failed to save experience:", error);
    }
  }, []);

  const handleSaveEducation = useCallback(async (data: Partial<Education>) => {
    try {
      const res = await fetch(`/api/cv/education/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setEditingEducation(null);
        fetchData();
      }
    } catch (error) {
      console.error("Failed to save education:", error);
    }
  }, []);

  return (
    <div className="journal-page flex h-full flex-col">
      <header className="journal-header flex h-14 items-center justify-between px-6">
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
            <span>{skills.length} skills • {experience.length} experiences</span>
          )}
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
        <div className="journal-tabs flex items-center gap-4 px-6 py-3">
          <TabsList>
            <TabsTrigger value="writings">
              <FileText className="mr-2 h-4 w-4" />
              Writings
            </TabsTrigger>
            <TabsTrigger value="prompts">
              <Code className="mr-2 h-4 w-4" />
              Prompts
            </TabsTrigger>
            <TabsTrigger value="cv">
              <Briefcase className="mr-2 h-4 w-4" />
              CV
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
          {(activeTab === "writings" || activeTab === "prompts") && (
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
                    const config = CATEGORY_CONFIG[cat];
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
                <Button variant="ghost" size="sm" onClick={() => { setSelectedCategory("all"); setSearchQuery(""); }}>
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
                      <div className="h-1 bg-gradient-to-r from-emerald-400 to-emerald-600" />
                      <CardHeader>
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2 mt-2" />
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
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                      <FileText className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
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
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
                  {filteredWritings.map((doc) => (
                    <Link key={doc.id} href={`/repository/${doc.slug}`}>
                      <Card className="group cursor-pointer hover:shadow-md overflow-hidden border-emerald-100 dark:border-emerald-900/30 h-full flex flex-col">
                        {/* Decorative gradient bar */}
                        <div className="h-1 bg-gradient-to-r from-emerald-400 to-emerald-600 shrink-0" />

                        <CardHeader className="pb-2">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                              <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base font-semibold line-clamp-2 h-12">
                                {doc.title}
                              </CardTitle>
                              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                {doc.metadata?.year && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {doc.metadata.year}
                                  </span>
                                )}
                                {doc.metadata?.type && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                    {doc.metadata.type}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 flex-1 flex flex-col">
                          <p className="text-muted-foreground line-clamp-3 text-sm flex-1">
                            {stripMarkdown(doc.content).substring(0, 150)}...
                          </p>
                          <div className="mt-3 flex flex-wrap gap-1 min-h-[24px]">
                            {doc.metadata?.tags && Array.isArray(doc.metadata.tags) && doc.metadata.tags.length > 0 ? (
                              <>
                                {doc.metadata.tags.slice(0, 3).map((tag: string) => (
                                  <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400">
                                    {tag}
                                  </Badge>
                                ))}
                                {doc.metadata.tags.length > 3 && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                    +{doc.metadata.tags.length - 3}
                                  </Badge>
                                )}
                              </>
                            ) : null}
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
                      <div className="h-1 bg-gradient-to-r from-violet-400 to-violet-600" />
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
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
                      <Code className="h-8 w-8 text-violet-600 dark:text-violet-400" />
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
                <div className="grid gap-4 md:grid-cols-2 auto-rows-fr">
                  {filteredPrompts.map((doc) => (
                    <Link key={doc.id} href={`/repository/${doc.slug}`}>
                      <Card className="group cursor-pointer hover:shadow-md overflow-hidden border-violet-100 dark:border-violet-900/30 h-full flex flex-col">
                        {/* Decorative gradient bar */}
                        <div className="h-1 bg-gradient-to-r from-violet-400 to-violet-600 shrink-0" />

                        <CardHeader className="pb-2">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
                              <Code className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base font-semibold line-clamp-2 h-12">
                                {doc.title}
                              </CardTitle>
                              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                {doc.metadata?.type && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400">
                                    {doc.metadata.type}
                                  </Badge>
                                )}
                                {doc.language && doc.language !== 'en' && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                    {doc.language.toUpperCase()}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 flex-1 flex flex-col">
                          <div className="relative flex-1">
                            <pre className="text-muted-foreground overflow-hidden text-xs bg-violet-50 dark:bg-violet-900/10 p-3 rounded-lg border border-violet-100 dark:border-violet-900/30 h-24 font-mono whitespace-pre-wrap break-words">
                              {doc.content.substring(0, 200)}...
                            </pre>
                            <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-violet-50 dark:from-violet-900/10 to-transparent pointer-events-none rounded-b-lg" />
                          </div>
                          <div className="mt-3 flex flex-wrap gap-1 min-h-[24px]">
                            {doc.metadata?.tags && Array.isArray(doc.metadata.tags) && doc.metadata.tags.length > 0 ? (
                              <>
                                {doc.metadata.tags.slice(0, 4).map((tag: string) => (
                                  <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-400">
                                    {tag}
                                  </Badge>
                                ))}
                                {doc.metadata.tags.length > 4 && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                    +{doc.metadata.tags.length - 4}
                                  </Badge>
                                )}
                              </>
                            ) : null}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="cv" className="mt-0 space-y-8">
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i}>
                      <Skeleton className="h-8 w-48 mb-4" />
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
                        <Badge variant="secondary" className="ml-2">{filteredSkills.length}</Badge>
                      </h2>
                    </div>

                    {Object.entries(skillsByCategory).length === 0 ? (
                      <div className="py-12 text-center">
                        <p className="text-muted-foreground">No skills match your filters.</p>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        {Object.entries(skillsByCategory).map(([category, categorySkills]) => {
                          const config = CATEGORY_CONFIG[category] || {
                            color: "text-gray-700 dark:text-gray-400",
                            bgColor: "bg-gray-100 dark:bg-gray-900/30 border-gray-200 dark:border-gray-800",
                            icon: <Tag className="h-4 w-4" />
                          };

                          return (
                            <div key={category}>
                              {/* Category Header */}
                              <div className={`mb-4 flex items-center gap-3 rounded-lg border p-3 ${config.bgColor}`}>
                                <span className={config.color}>{config.icon}</span>
                                <h3 className={`font-semibold ${config.color}`}>{category}</h3>
                                <Badge variant="outline" className={config.color}>
                                  {categorySkills.length} skills
                                </Badge>
                              </div>

                              {/* Skills Grid */}
                              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                {categorySkills.map((skill) =>
                                  editingSkill === skill.id ? (
                                    <SkillEditForm
                                      key={skill.id}
                                      skill={skill}
                                      onSave={handleSaveSkill}
                                      onCancel={() => setEditingSkill(null)}
                                    />
                                  ) : (
                                    <Card
                                      key={skill.id}
                                      className="group hover:shadow-sm"
                                    >
                                      <CardHeader className="pb-2">
                                        <div className="flex items-start justify-between">
                                          <div className="flex items-center gap-2">
                                            {getSkillIconUrl(skill.name) ? (
                                              <img
                                                src={getSkillIconUrl(skill.name)!}
                                                alt={skill.name}
                                                className="h-6 w-6"
                                                onError={(e) => {
                                                  (e.target as HTMLImageElement).style.display = "none";
                                                }}
                                              />
                                            ) : (
                                              <span className={config.color}>{config.icon}</span>
                                            )}
                                            <CardTitle className="text-sm font-medium">
                                              {skill.name}
                                            </CardTitle>
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                                            onClick={() => setEditingSkill(skill.id)}
                                          >
                                            <Edit className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </CardHeader>
                                      <CardContent className="space-y-3">
                                        <p className="text-muted-foreground text-xs line-clamp-2">
                                          {skill.description}
                                        </p>
                                        <MagnitudeBar magnitude={skill.magnitude} maxMagnitude={5} />
                                      </CardContent>
                                    </Card>
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
                        <Badge variant="secondary" className="ml-2">{experience.length}</Badge>
                      </h2>
                    </div>

                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-amber-400 via-amber-300 to-transparent" />

                      <div className="space-y-6">
                        {experience.map((exp, index) => (
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
                              <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                                !exp.dateEnd
                                  ? "border-amber-500 bg-amber-100 dark:bg-amber-900/50"
                                  : "border-amber-300 bg-white dark:bg-gray-900"
                              }`}>
                                <Briefcase className={`h-4 w-4 ${
                                  !exp.dateEnd ? "text-amber-600" : "text-amber-400"
                                }`} />
                              </div>

                              {/* Experience Card */}
                              <Card className={`flex-1 group hover:shadow-sm ${
                                !exp.dateEnd
                                  ? "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10"
                                  : ""
                              }`}>
                                <CardHeader className="pb-3">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <CardTitle className="text-base font-semibold">
                                          {exp.title}
                                        </CardTitle>
                                        {!exp.dateEnd && (
                                          <Badge className="bg-amber-500 text-white text-xs">
                                            Current
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                                        {exp.company}
                                      </p>
                                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                          <Calendar className="h-3 w-3" />
                                          {exp.dateStart} - {exp.dateEnd || "Present"}
                                        </span>
                                        <span className="flex items-center gap-1">
                                          •
                                        </span>
                                        <span>{exp.location}</span>
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                                      onClick={() => setEditingExperience(exp.id)}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </CardHeader>
                                {exp.tagline && (
                                  <CardContent className="pt-0">
                                    <p className="text-sm text-muted-foreground">
                                      {exp.tagline}
                                    </p>
                                  </CardContent>
                                )}
                              </Card>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Education Section - Card Grid Style */}
                  <div>
                    <div className="mb-6 flex items-center justify-between">
                      <h2 className="flex items-center gap-2 text-xl font-semibold">
                        <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        Education
                        <Badge variant="secondary" className="ml-2">{education.length}</Badge>
                      </h2>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {education.map((edu) => (
                        editingEducation === edu.id ? (
                          <EducationEditForm
                            key={edu.id}
                            education={edu}
                            onSave={handleSaveEducation}
                            onCancel={() => setEditingEducation(null)}
                          />
                        ) : (
                          <Card
                            key={edu.id}
                            className="group hover:shadow-sm border-blue-100 dark:border-blue-900/30"
                          >
                            <CardHeader className="pb-3">
                              {/* Decorative top bar */}
                              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-blue-600 rounded-t-lg" />

                              <div className="flex items-start justify-between pt-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                                      <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                      <CardTitle className="text-base font-semibold">
                                        {edu.degree}
                                      </CardTitle>
                                      <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">
                                        {edu.field}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                                  onClick={() => setEditingEducation(edu.id)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              <p className="text-sm font-medium">
                                {edu.institution}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>{edu.dateStart} - {edu.dateEnd}</span>
                                <span>•</span>
                                <span>{edu.location}</span>
                              </div>
                              {edu.tagline && (
                                <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                                  {edu.tagline}
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        )
                      ))}
                    </div>
                  </div>
                </>
              )}
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
