"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Plus,
  User,
  Building2,
  Layers,
  Circle,
  RefreshCw,
  ExternalLink,
  Filter,
  Expand,
  MessageSquare,
  Sparkles,
} from "lucide-react";

interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  priority: number;
  state: {
    id: string;
    name: string;
    color: string;
  };
  assignee?: {
    id: string;
    name: string;
    email: string;
  };
  project?: {
    id: string;
    name: string;
  };
  team: {
    id: string;
    name: string;
  };
  url: string;
}

interface LinearProject {
  id: string;
  name: string;
  description?: string;
  state: string;
  progress: number;
  targetDate?: string;
  lead?: {
    id: string;
    name: string;
  };
}

interface LinearViewer {
  id: string;
  name: string;
  email: string;
  teams: Array<{ id: string; name: string }>;
  configuredUserId?: string; // LINEAR_USER_ID from env
}

const priorityLabels: Record<number, { label: string; color: string; emoji: string }> = {
  0: { label: "No priority", color: "text-muted-foreground", emoji: "⚪" },
  1: { label: "Urgent", color: "text-red-500", emoji: "🔴" },
  2: { label: "High", color: "text-orange-500", emoji: "🟠" },
  3: { label: "Medium", color: "text-yellow-500", emoji: "🟡" },
  4: { label: "Low", color: "text-blue-500", emoji: "🔵" },
};

export default function LinearPage() {
  const router = useRouter();
  const [viewer, setViewer] = useState<LinearViewer | null>(null);
  const [issues, setIssues] = useState<LinearIssue[]>([]);
  const [projects, setProjects] = useState<LinearProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [showAllIssues, setShowAllIssues] = useState(false);
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [filteredByUser, setFilteredByUser] = useState(false);
  
  // Detail dialogs
  const [selectedIssue, setSelectedIssue] = useState<LinearIssue | null>(null);
  const [selectedProject, setSelectedProject] = useState<LinearProject | null>(null);

  useEffect(() => {
    fetchViewer();
  }, []);

  useEffect(() => {
    fetchIssues();
  }, [showAllIssues]);

  useEffect(() => {
    fetchProjects();
  }, [showAllProjects]);

  const fetchViewer = async () => {
    try {
      const response = await fetch("/api/integrations/linear/viewer");
      if (response.ok) {
        const data = await response.json();
        setViewer(data);
      }
    } catch (error) {
      console.error("Failed to fetch viewer:", error);
    }
  };

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (showAllIssues) params.set("showAll", "true");
      
      const response = await fetch(`/api/integrations/linear/issues?${params}`);
      if (response.ok) {
        const data = await response.json();
        setIssues(data.issues || []);
        setFilteredByUser(data.filteredByUser || false);
      }
    } catch (error) {
      console.error("Failed to fetch issues:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const params = new URLSearchParams();
      if (showAllProjects) params.set("showAll", "true");
      
      const response = await fetch(`/api/integrations/linear/projects?${params}`);
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    }
  };

  // Navigate to chat with issue context
  const workWithAI = (issue: LinearIssue) => {
    const context = `I want to discuss this Linear issue:\n\n**${issue.identifier}: ${issue.title}**\n- Status: ${issue.state.name}\n- Priority: ${priorityLabels[issue.priority]?.emoji} ${priorityLabels[issue.priority]?.label}\n- Team: ${issue.team.name}${issue.project ? `\n- Project: ${issue.project.name}` : ""}${issue.assignee ? `\n- Assignee: ${issue.assignee.name}` : ""}${issue.description ? `\n\n**Description:**\n${issue.description}` : ""}\n\n**URL:** ${issue.url}`;
    
    // Store in sessionStorage and navigate
    sessionStorage.setItem("kronusPrefill", context);
    router.push("/chat");
  };

  // Navigate to chat with project context
  const workWithProjectAI = (project: LinearProject) => {
    const context = `I want to discuss this Linear project:\n\n**${project.name}**\n- State: ${project.state}\n- Progress: ${Math.round(project.progress * 100)}%${project.lead ? `\n- Lead: ${project.lead.name}` : ""}${project.targetDate ? `\n- Target: ${project.targetDate}` : ""}${project.description ? `\n\n**Description:**\n${project.description}` : ""}`;
    
    sessionStorage.setItem("kronusPrefill", context);
    router.push("/chat");
  };

  const filteredIssues = issues.filter((issue) => {
    const matchesSearch =
      !searchQuery ||
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.identifier.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTeam = selectedTeam === "all" || issue.team.id === selectedTeam;
    return matchesSearch && matchesTeam;
  });

  return (
    <div className="journal-page flex h-full flex-col">
      {/* Header */}
      <header className="journal-header flex h-14 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <h1 className="journal-title text-lg">Linear Integration</h1>
          {viewer && (
            <Badge variant="outline" className="gap-1">
              <User className="h-3 w-3" />
              {viewer.name}
            </Badge>
          )}
          {viewer && !viewer.configuredUserId && (
            <Badge variant="destructive" className="gap-1 text-xs">
              ⚠️ LINEAR_USER_ID not set
            </Badge>
          )}
          {filteredByUser && !showAllIssues && (
            <Badge variant="secondary" className="gap-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              <Filter className="h-3 w-3" />
              My Issues
            </Badge>
          )}
          {showAllIssues && (
            <Badge variant="outline" className="gap-1">
              All Issues
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchIssues();
              fetchProjects();
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New Issue
          </Button>
        </div>
      </header>

      {/* Config Warning */}
      {viewer && !viewer.configuredUserId && (
        <div className="border-b border-yellow-500/20 bg-yellow-50 px-6 py-3 dark:bg-yellow-900/20">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Tip:</strong> Set <code className="rounded bg-yellow-200 px-1 dark:bg-yellow-800">LINEAR_USER_ID</code> in your .env file to filter by your issues.
            Your user ID is: <code className="rounded bg-yellow-200 px-1 dark:bg-yellow-800">{viewer.id}</code>
          </p>
        </div>
      )}

      {/* Content */}
      <Tabs defaultValue="issues" className="flex flex-1 flex-col">
        <div className="journal-tabs px-6">
          <TabsList className="h-12">
            <TabsTrigger value="issues" className="gap-2">
              <Circle className="h-4 w-4" />
              Issues
              {issues.length > 0 && (
                <Badge variant="secondary" className="ml-1">{issues.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="projects" className="gap-2">
              <Layers className="h-4 w-4" />
              Projects
              {projects.length > 0 && (
                <Badge variant="secondary" className="ml-1">{projects.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1 bg-[var(--journal-paper)]">
          <TabsContent value="issues" className="mt-0 p-6">
            {/* Filters */}
            <div className="mb-6 flex flex-wrap items-center gap-4">
              <div className="relative max-w-sm flex-1">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  placeholder="Search issues..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              {/* Owner Filter */}
              <Select 
                value={showAllIssues ? "all" : "mine"} 
                onValueChange={(v) => setShowAllIssues(v === "all")}
              >
                <SelectTrigger className="w-[160px]">
                  <User className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mine">
                    <span className="flex items-center gap-2">
                      🎯 My Issues
                    </span>
                  </SelectItem>
                  <SelectItem value="all">
                    <span className="flex items-center gap-2">
                      📋 All Issues
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              {/* Team Filter */}
              {viewer && viewer.teams.length > 0 && (
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger className="w-[180px]">
                    <Building2 className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="All Teams" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Teams</SelectItem>
                    {viewer.teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Issues List */}
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="mb-2 h-5 w-1/3" />
                      <Skeleton className="h-4 w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredIssues.length === 0 ? (
              <div className="py-12 text-center">
                <Circle className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                <h3 className="mb-2 font-semibold">No issues found</h3>
                <p className="text-muted-foreground text-sm">
                  {searchQuery
                    ? "Try a different search term"
                    : showAllIssues
                    ? "No issues in your workspace"
                    : "No issues assigned to you. Toggle 'Show all' to see others."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredIssues.map((issue) => (
                  <Card key={issue.id} className="hover:bg-accent/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs">
                              {issue.identifier}
                            </Badge>
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: issue.state.color }}
                            />
                            <span className="text-muted-foreground text-xs">
                              {issue.state.name}
                            </span>
                            <span
                              className={`text-xs ${priorityLabels[issue.priority]?.color || ""}`}
                            >
                              {priorityLabels[issue.priority]?.emoji} {priorityLabels[issue.priority]?.label}
                            </span>
                          </div>
                          <h3 className="font-medium">{issue.title}</h3>
                          <div className="text-muted-foreground mt-2 flex items-center gap-3 text-xs">
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {issue.team.name}
                            </span>
                            {issue.project && (
                              <span className="flex items-center gap-1">
                                <Layers className="h-3 w-3" />
                                {issue.project.name}
                              </span>
                            )}
                            {issue.assignee && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {issue.assignee.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedIssue(issue)}
                            title="View details"
                          >
                            <Expand className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => workWithAI(issue)}
                            title="Discuss with Kronus"
                            className="text-primary hover:text-primary"
                          >
                            <Sparkles className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" asChild title="Open in Linear">
                            <a href={issue.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="projects" className="mt-0 p-6">
            {/* Project Filters */}
            <div className="mb-6 flex items-center gap-4">
              <Select 
                value={showAllProjects ? "all" : "mine"} 
                onValueChange={(v) => setShowAllProjects(v === "all")}
              >
                <SelectTrigger className="w-[180px]">
                  <User className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mine">
                    <span className="flex items-center gap-2">
                      🎯 My Projects
                    </span>
                  </SelectItem>
                  <SelectItem value="all">
                    <span className="flex items-center gap-2">
                      📋 All Projects
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {projects.length === 0 ? (
              <div className="py-12 text-center">
                <Layers className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                <h3 className="mb-2 font-semibold">No projects found</h3>
                <p className="text-muted-foreground text-sm">
                  {showAllProjects
                    ? "No projects in your workspace"
                    : "No projects you're a member of. Toggle 'Show all' to see others."}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                  <Card key={project.id} className="hover:bg-accent/50 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{project.name}</CardTitle>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setSelectedProject(project)}
                            title="View details"
                          >
                            <Expand className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:text-primary"
                            onClick={() => workWithProjectAI(project)}
                            title="Discuss with Kronus"
                          >
                            <Sparkles className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {project.description && (
                        <CardDescription className="line-clamp-2">
                          {project.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm">
                        <Badge variant="outline">{project.state}</Badge>
                        <span className="text-muted-foreground">
                          {Math.round(project.progress * 100)}% complete
                        </span>
                      </div>
                      <div className="bg-muted mt-2 h-2 overflow-hidden rounded-full">
                        <div
                          className="bg-primary h-full transition-all"
                          style={{ width: `${project.progress * 100}%` }}
                        />
                      </div>
                      {project.lead && (
                        <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Lead: {project.lead.name}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>

      {/* Issue Detail Dialog */}
      <Dialog open={!!selectedIssue} onOpenChange={() => setSelectedIssue(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          {selectedIssue && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    {selectedIssue.identifier}
                  </Badge>
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: selectedIssue.state.color }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {selectedIssue.state.name}
                  </span>
                </div>
                <DialogTitle className="text-xl">{selectedIssue.title}</DialogTitle>
                <DialogDescription asChild>
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <Badge variant="secondary">
                      {priorityLabels[selectedIssue.priority]?.emoji} {priorityLabels[selectedIssue.priority]?.label}
                    </Badge>
                    <Badge variant="outline">
                      <Building2 className="h-3 w-3 mr-1" />
                      {selectedIssue.team.name}
                    </Badge>
                    {selectedIssue.project && (
                      <Badge variant="outline">
                        <Layers className="h-3 w-3 mr-1" />
                        {selectedIssue.project.name}
                      </Badge>
                    )}
                    {selectedIssue.assignee && (
                      <Badge variant="outline">
                        <User className="h-3 w-3 mr-1" />
                        {selectedIssue.assignee.name}
                      </Badge>
                    )}
                  </div>
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {selectedIssue.description ? (
                  <div>
                    <h4 className="font-medium mb-2">Description</h4>
                    <div className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap">
                      {selectedIssue.description}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm italic">No description</p>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <Button variant="outline" asChild>
                  <a href={selectedIssue.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in Linear
                  </a>
                </Button>
                <Button onClick={() => { setSelectedIssue(null); workWithAI(selectedIssue); }}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Discuss with Kronus
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Project Detail Dialog */}
      <Dialog open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          {selectedProject && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedProject.name}</DialogTitle>
                <DialogDescription asChild>
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <Badge variant="secondary">{selectedProject.state}</Badge>
                    <Badge variant="outline">
                      {Math.round(selectedProject.progress * 100)}% complete
                    </Badge>
                    {selectedProject.lead && (
                      <Badge variant="outline">
                        <User className="h-3 w-3 mr-1" />
                        Lead: {selectedProject.lead.name}
                      </Badge>
                    )}
                    {selectedProject.targetDate && (
                      <Badge variant="outline">
                        Target: {selectedProject.targetDate}
                      </Badge>
                    )}
                  </div>
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div>
                  <h4 className="font-medium mb-2">Progress</h4>
                  <div className="bg-muted h-4 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all"
                      style={{ width: `${selectedProject.progress * 100}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {Math.round(selectedProject.progress * 100)}% complete
                  </p>
                </div>

                {selectedProject.description ? (
                  <div>
                    <h4 className="font-medium mb-2">Description</h4>
                    <div className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap">
                      {selectedProject.description}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm italic">No description</p>
                )}
              </div>

              <div className="flex items-center justify-end pt-4 border-t">
                <Button onClick={() => { setSelectedProject(null); workWithProjectAI(selectedProject); }}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Discuss with Kronus
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
