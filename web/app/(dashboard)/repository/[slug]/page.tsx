"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Edit, Save, X, MessageSquare, ArrowLeft } from "lucide-react";

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

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDocument();
  }, [slug]);

  const fetchDocument = async () => {
    try {
      const res = await fetch(`/api/documents/${slug}`);
      if (res.ok) {
        const data = await res.json();
        setDocument(data);
        setEditedContent(data.content);
      }
    } catch (error) {
      console.error("Failed to fetch document:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!document) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/documents/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editedContent }),
      });
      if (res.ok) {
        const updated = await res.json();
        setDocument(updated);
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Failed to save document:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscussWithKronus = () => {
    router.push(`/chat?context=document:${slug}`);
  };

  if (loading) {
    return (
      <div className="flex h-full flex-col p-6">
        <Skeleton className="mb-4 h-8 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Document not found</p>
      </div>
    );
  }

  return (
    <div className="journal-page flex h-full flex-col">
      <header className="journal-header flex h-14 items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/repository")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-lg font-semibold">{document.title}</h1>
          <Badge variant="secondary">{document.type}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button size="sm" onClick={handleDiscussWithKronus}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Discuss with Kronus
              </Button>
            </>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6 bg-[var(--journal-paper)]">
        <Card className="bg-[#FEFDFB] border-[#E5E0D8] shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-[#2A2520]">{document.title}</CardTitle>
              <div className="text-[#5C5550] text-sm">
                Updated: {new Date(document.updated_at).toLocaleDateString()}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="min-h-[500px] font-mono text-sm border-[#E5E0D8]"
              />
            ) : (
              <div className="prose prose-sm max-w-none journal-reader">
                {document.type === "prompt" ? (
                  <pre className="whitespace-pre-wrap break-words bg-[#F5F3F0] text-[#2A2520] p-4 rounded-lg border border-[#E5E0D8] font-mono text-sm leading-relaxed">{document.content}</pre>
                ) : (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{document.content}</ReactMarkdown>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
