"use client";

import { useState, useCallback } from "react";
import type { Document } from "@/lib/types/repository";

interface DocumentType {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  sortOrder: number;
}

export function useDocTypeManagement(
  writings: Document[],
  prompts: Document[],
  documentTypes: DocumentType[],
  invalidateTabCache: (tab: string) => void,
  fetchData: (forceRefresh?: boolean) => Promise<void>
) {
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

  const openDocTypeDialog = useCallback((docType?: DocumentType) => {
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
      invalidateTabCache("writings");
      invalidateTabCache("prompts");
      invalidateTabCache("notes");
      fetchData(true);
    } catch (error: any) {
      setDocTypeError(error.message);
    } finally {
      setSavingDocType(false);
    }
  }, [docTypeForm, editingDocType, closeDocTypeDialog, invalidateTabCache, fetchData]);

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
      invalidateTabCache("writings");
      invalidateTabCache("prompts");
      invalidateTabCache("notes");
      fetchData(true);
    } catch (error: any) {
      setDocTypeError(error.message);
    } finally {
      setDeletingDocType(false);
    }
  }, [editingDocType, closeDocTypeDialog, invalidateTabCache, fetchData]);

  const getDocCountWithType = useCallback(
    (typeName: string) => {
      return (
        writings.filter((d) => d.metadata?.type === typeName).length +
        prompts.filter((d) => d.metadata?.type === typeName).length
      );
    },
    [writings, prompts]
  );

  return {
    docTypeDialogOpen,
    setDocTypeDialogOpen,
    editingDocType,
    docTypeForm,
    setDocTypeForm,
    docTypeError,
    savingDocType,
    deletingDocType,
    openDocTypeDialog,
    closeDocTypeDialog,
    handleSaveDocType,
    handleDeleteDocType,
    getDocCountWithType,
  };
}
