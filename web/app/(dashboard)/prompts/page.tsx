"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  Plus,
  Sparkles,
  FolderOpen,
  MessageSquare,
  User,
  Bot,
  MessagesSquare,
  Clock,
  GitBranch,
  ChevronRight,
} from "lucide-react";

interface Prompt {
  id: number;
  slug: string;
  project_id: string | null;
  name: string;
  content: string;
  role: "system" | "user" | "assistant" | "chat";
  purpose: string | null;
  version: number;
  is_latest: boolean;
  status: "active" | "draft" | "deprecated" | "archived";
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "archived" | "draft";
  prompt_count: number;
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  system: <MessageSquare className="h-4 w-4" />,
  user: <User className="h-4 w-4" />,
  assistant: <Bot className="h-4 w-4" />,
  chat: <MessagesSquare className="h-4 w-4" />,
};

const ROLE_COLORS: Record<string, string> = {
  system: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  user: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  assistant: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  chat: "bg-amber-500/10 text-amber-400 border-amber-500/30",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  draft: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  deprecated: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  archived: "bg-gray-500/10 text-gray-400 border-gray-500/30",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function truncateContent(content: string, maxLength = 150): string {
  // Remove chat format headers and get plain text
  const plainText = content
    .replace(/^##\s+(System|User|Assistant)\s*$/gim, "")
    .replace(/\n{2,}/g, " ")
    .trim();

  if (plainText.length <= maxLength) return plainText;
  return plainText.slice(0, maxLength).trim() + "...";
}

export default function PromptsPage() {
  const router = useRouter();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");

  // Create prompt dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPromptName, setNewPromptName] = useState("");
  const [newPromptContent, setNewPromptContent] = useState("");
  const [newPromptProject, setNewPromptProject] = useState<string>("");
  const [newPromptRole, setNewPromptRole] = useState<string>("system");
  const [creating, setCreating] = useState(false);

  // Create project dialog
  const [showCreateProjectDialog, setShowCreateProjectDialog] = useState(false);
  const [newProjectId, setNewProjectId] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (projectFilter !== "all") params.set("project_id", projectFilter);

      const [promptsRes, projectsRes] = await Promise.all([
        fetch(`/api/prompts?${params.toString()}`),
        fetch("/api/prompts/projects"),
      ]);

      if (promptsRes.ok) {
        const data = await promptsRes.json();
        setPrompts(data.prompts || []);
      }

      if (projectsRes.ok) {
        const data = await projectsRes.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter, projectFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreatePrompt = async () => {
    if (!newPromptName.trim() || !newPromptContent.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPromptName,
          content: newPromptContent,
          project_id: newPromptProject || undefined,
          role: newPromptRole,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setShowCreateDialog(false);
        setNewPromptName("");
        setNewPromptContent("");
        setNewPromptProject("");
        setNewPromptRole("system");
        router.push(`/prompts/${created.slug}`);
      }
    } catch (error) {
      console.error("Failed to create prompt:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectId.trim() || !newProjectName.trim()) return;

    setCreatingProject(true);
    try {
      const res = await fetch("/api/prompts/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: newProjectId,
          name: newProjectName,
          description: newProjectDescription || undefined,
        }),
      });

      if (res.ok) {
        setShowCreateProjectDialog(false);
        setNewProjectId("");
        setNewProjectName("");
        setNewProjectDescription("");
        loadData();
      }
    } catch (error) {
      console.error("Failed to create project:", error);
    } finally {
      setCreatingProject(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-border flex items-center justify-between border-b p-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Sparkles className="h-6 w-6 text-[var(--kronus-teal)]" />
            Prompt Engineering
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage, version, and track your AI prompts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowCreateProjectDialog(true)}>
            <FolderOpen className="mr-2 h-4 w-4" />
            New Project
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Prompt
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="border-border bg-muted/30 flex items-center gap-4 border-b p-4">
        <div className="relative max-w-md flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search prompts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} ({p.prompt_count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="system">System</SelectItem>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="assistant">Assistant</SelectItem>
            <SelectItem value="chat">Chat</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="deprecated">Deprecated</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : prompts.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <Sparkles className="text-muted-foreground mb-4 h-12 w-12" />
            <h3 className="text-lg font-medium">No prompts yet</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Create your first prompt to get started
            </p>
            <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Prompt
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {prompts.map((prompt) => (
              <Link key={prompt.id} href={`/prompts/${prompt.slug}`}>
                <Card className="h-full cursor-pointer transition-all hover:border-[var(--kronus-teal)] hover:shadow-md">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`rounded p-1.5 ${ROLE_COLORS[prompt.role]}`}>
                          {ROLE_ICONS[prompt.role]}
                        </span>
                        <CardTitle className="line-clamp-1 text-base">{prompt.name}</CardTitle>
                      </div>
                      <ChevronRight className="text-muted-foreground h-4 w-4" />
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="outline" className={STATUS_COLORS[prompt.status]}>
                        {prompt.status}
                      </Badge>
                      {prompt.version > 1 && (
                        <Badge variant="outline" className="text-xs">
                          <GitBranch className="mr-1 h-3 w-3" />v{prompt.version}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground line-clamp-3 text-sm">
                      {prompt.purpose || truncateContent(prompt.content)}
                    </p>
                    <div className="border-border mt-3 flex items-center justify-between border-t pt-3">
                      <div className="text-muted-foreground flex items-center gap-1 text-xs">
                        <Clock className="h-3 w-3" />
                        {formatDate(prompt.updated_at)}
                      </div>
                      {prompt.project_id && (
                        <Badge variant="secondary" className="text-xs">
                          {projects.find((p) => p.id === prompt.project_id)?.name ||
                            prompt.project_id}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create Prompt Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Prompt</DialogTitle>
            <DialogDescription>
              Add a new prompt to your collection. You can edit it further after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g., Code Review System Prompt"
                value={newPromptName}
                onChange={(e) => setNewPromptName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={newPromptRole} onValueChange={setNewPromptRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="assistant">Assistant</SelectItem>
                    <SelectItem value="chat">Chat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="project">Project</Label>
                <Select value={newPromptProject} onValueChange={setNewPromptProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                placeholder="Enter your prompt content..."
                value={newPromptContent}
                onChange={(e) => setNewPromptContent(e.target.value)}
                rows={6}
              />
              <p className="text-muted-foreground text-xs">
                Use ## System, ## User, ## Assistant for chat format
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePrompt} disabled={creating || !newPromptName.trim()}>
              {creating ? "Creating..." : "Create Prompt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Project Dialog */}
      <Dialog open={showCreateProjectDialog} onOpenChange={setShowCreateProjectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>Organize related prompts into a project.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-id">ID</Label>
              <Input
                id="project-id"
                placeholder="e.g., kronus-oracle"
                value={newProjectId}
                onChange={(e) =>
                  setNewProjectId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
                }
              />
              <p className="text-muted-foreground text-xs">
                Lowercase letters, numbers, and dashes only
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-name">Name</Label>
              <Input
                id="project-name"
                placeholder="e.g., Kronus Oracle"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-description">Description (optional)</Label>
              <Textarea
                id="project-description"
                placeholder="What is this project for?"
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateProjectDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={creatingProject || !newProjectId.trim() || !newProjectName.trim()}
            >
              {creatingProject ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
