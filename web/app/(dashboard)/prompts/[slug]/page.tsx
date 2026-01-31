"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Save,
  GitBranch,
  Clock,
  Trash2,
  MessageSquare,
  User,
  Bot,
  MessagesSquare,
  Copy,
  Check,
  History,
  Settings,
  FileText,
  Sparkles,
} from "lucide-react";
import { PromptDisplay } from "@/components/prompts/PromptDisplay";

interface Prompt {
  id: number;
  slug: string;
  project_id: string | null;
  name: string;
  content: string;
  role: "system" | "user" | "assistant" | "chat";
  purpose: string | null;
  input_schema: string | null;
  output_schema: string | null;
  config: Record<string, unknown> | null;
  version: number;
  is_latest: boolean;
  parent_version_id: number | null;
  status: "active" | "draft" | "deprecated" | "archived";
  tags: string[];
  language: string;
  summary: string | null;
  created_at: string;
  updated_at: string;
  version_count?: number;
  versions?: { id: number; version: number }[];
}

interface Project {
  id: string;
  name: string;
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
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PromptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Editable fields
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [purpose, setPurpose] = useState("");
  const [role, setRole] = useState<string>("system");
  const [status, setStatus] = useState<string>("active");
  const [projectId, setProjectId] = useState<string>("");
  const [inputSchema, setInputSchema] = useState("");
  const [outputSchema, setOutputSchema] = useState("");
  const [configJson, setConfigJson] = useState("");

  // Track if there are unsaved changes
  const [hasChanges, setHasChanges] = useState(false);

  // Dialogs
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadPrompt = useCallback(async () => {
    setLoading(true);
    try {
      const [promptRes, projectsRes] = await Promise.all([
        fetch(`/api/prompts/${slug}`),
        fetch("/api/prompts/projects"),
      ]);

      if (promptRes.ok) {
        const data = await promptRes.json();
        setPrompt(data);
        setName(data.name);
        setContent(data.content);
        setPurpose(data.purpose || "");
        setRole(data.role);
        setStatus(data.status);
        setProjectId(data.project_id || "");
        setInputSchema(data.input_schema || "");
        setOutputSchema(data.output_schema || "");
        setConfigJson(data.config ? JSON.stringify(data.config, null, 2) : "");
        setHasChanges(false);
      } else {
        router.push("/prompts");
      }

      if (projectsRes.ok) {
        const data = await projectsRes.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error("Failed to load prompt:", error);
    } finally {
      setLoading(false);
    }
  }, [slug, router]);

  useEffect(() => {
    loadPrompt();
  }, [loadPrompt]);

  // Track changes
  useEffect(() => {
    if (!prompt) return;
    const changed =
      name !== prompt.name ||
      content !== prompt.content ||
      purpose !== (prompt.purpose || "") ||
      role !== prompt.role ||
      status !== prompt.status ||
      projectId !== (prompt.project_id || "") ||
      inputSchema !== (prompt.input_schema || "") ||
      outputSchema !== (prompt.output_schema || "") ||
      configJson !== (prompt.config ? JSON.stringify(prompt.config, null, 2) : "");
    setHasChanges(changed);
  }, [
    prompt,
    name,
    content,
    purpose,
    role,
    status,
    projectId,
    inputSchema,
    outputSchema,
    configJson,
  ]);

  const handleSave = async (createVersion = false) => {
    if (!prompt) return;

    setSaving(true);
    try {
      let parsedConfig = null;
      if (configJson.trim()) {
        try {
          parsedConfig = JSON.parse(configJson);
        } catch {
          alert("Invalid JSON in config field");
          setSaving(false);
          return;
        }
      }

      const res = await fetch(`/api/prompts/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          content,
          purpose: purpose || null,
          role,
          status,
          project_id: projectId || null,
          input_schema: inputSchema || null,
          output_schema: outputSchema || null,
          config: parsedConfig,
          create_version: createVersion,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setPrompt(updated);
        setHasChanges(false);
        if (updated.version_created) {
          // Reload to get fresh version data
          loadPrompt();
        }
      }
    } catch (error) {
      console.error("Failed to save prompt:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!prompt) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/prompts/${slug}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/prompts");
      }
    } catch (error) {
      console.error("Failed to delete prompt:", error);
    } finally {
      setDeleting(false);
    }
  };

  const handleCopyContent = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (!prompt) {
    return (
      <div className="p-6">
        <p>Prompt not found</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-border flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-4">
          <Link href="/prompts">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className={`rounded p-1.5 ${ROLE_COLORS[prompt.role]}`}>
                {ROLE_ICONS[prompt.role]}
              </span>
              <h1 className="text-xl font-bold">{prompt.name}</h1>
              <Badge variant="outline" className={STATUS_COLORS[prompt.status]}>
                {prompt.status}
              </Badge>
              {prompt.version > 1 && (
                <Badge variant="outline" className="text-xs">
                  <GitBranch className="mr-1 h-3 w-3" />v{prompt.version}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Last updated {formatDate(prompt.updated_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCopyContent}>
            {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
            {copied ? "Copied!" : "Copy"}
          </Button>
          {hasChanges && (
            <Button variant="outline" onClick={() => handleSave(true)}>
              <GitBranch className="mr-2 h-4 w-4" />
              Save as New Version
            </Button>
          )}
          <Button onClick={() => handleSave(false)} disabled={saving || !hasChanges}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save"}
          </Button>
          <Button variant="destructive" size="icon" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <Tabs defaultValue="content" className="space-y-4">
          <TabsList>
            <TabsTrigger value="content" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Content
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configuration
            </TabsTrigger>
            <TabsTrigger value="versions" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Versions ({prompt.version_count || 1})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Editor */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Edit Prompt</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select value={role} onValueChange={setRole}>
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
                      <Label htmlFor="status">Status</Label>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="deprecated">Deprecated</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project">Project</Label>
                    <Select value={projectId} onValueChange={setProjectId}>
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
                  <div className="space-y-2">
                    <Label htmlFor="purpose">Purpose</Label>
                    <Textarea
                      id="purpose"
                      placeholder="What is this prompt for?"
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content">Content</Label>
                    <Textarea
                      id="content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={16}
                      className="font-mono text-sm"
                    />
                    <p className="text-muted-foreground text-xs">
                      Use ## System, ## User, ## Assistant for chat format
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <PromptDisplay content={content} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="config" className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Schemas</CardTitle>
                  <CardDescription>
                    Define input/output schemas for validation (JSON/Zod format)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="input-schema">Input Schema</Label>
                    <Textarea
                      id="input-schema"
                      placeholder='{"type": "object", "properties": {...}}'
                      value={inputSchema}
                      onChange={(e) => setInputSchema(e.target.value)}
                      rows={6}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="output-schema">Output Schema</Label>
                    <Textarea
                      id="output-schema"
                      placeholder='{"type": "object", "properties": {...}}'
                      value={outputSchema}
                      onChange={(e) => setOutputSchema(e.target.value)}
                      rows={6}
                      className="font-mono text-sm"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Model Configuration</CardTitle>
                  <CardDescription>Configure model settings (JSON format)</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder='{"model": "claude-sonnet-4", "temperature": 0.7, "max_tokens": 4096}'
                    value={configJson}
                    onChange={(e) => setConfigJson(e.target.value)}
                    rows={10}
                    className="font-mono text-sm"
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="versions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <GitBranch className="h-4 w-4" />
                  Version History
                </CardTitle>
                <CardDescription>
                  This prompt has {prompt.version_count || 1} version(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {prompt.versions && prompt.versions.length > 0 ? (
                  <div className="space-y-2">
                    {prompt.versions.map((v) => (
                      <div
                        key={v.id}
                        className={`flex items-center justify-between rounded-lg border p-3 ${
                          v.version === prompt.version
                            ? "border-[var(--kronus-teal)] bg-[var(--kronus-teal)]/5"
                            : "border-border"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant={v.version === prompt.version ? "default" : "outline"}>
                            v{v.version}
                          </Badge>
                          {v.version === prompt.version && (
                            <span className="text-muted-foreground text-sm">Current</span>
                          )}
                        </div>
                        {v.version !== prompt.version && (
                          <Button variant="outline" size="sm" disabled>
                            View
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    This is the first version of this prompt.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Prompt</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{prompt.name}"? This will delete all versions and
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
