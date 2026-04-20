"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Edit, Plus, Trash2 } from "lucide-react";

interface DocumentType {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  sortOrder: number;
}

interface DocumentTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingDocType: {
    id: string;
    name: string;
    description: string;
    color: string;
    icon: string;
  } | null;
  docTypeForm: { name: string; description: string; color: string; icon: string };
  setDocTypeForm: React.Dispatch<
    React.SetStateAction<{
      name: string;
      description: string;
      color: string;
      icon: string;
    }>
  >;
  docTypeError: string | null;
  savingDocType: boolean;
  deletingDocType: boolean;
  documentTypes: DocumentType[];
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
  openDocTypeDialog: (dt: DocumentType) => void;
  getDocCountWithType: (name: string) => number;
}

export function DocumentTypeDialog({
  open,
  onOpenChange,
  editingDocType,
  docTypeForm,
  setDocTypeForm,
  docTypeError,
  savingDocType,
  deletingDocType,
  documentTypes,
  onSave,
  onDelete,
  onClose,
  openDocTypeDialog,
  getDocCountWithType,
}: DocumentTypeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              onChange={(e) =>
                setDocTypeForm((prev) => ({ ...prev, name: e.target.value }))
              }
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
                setDocTypeForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
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
              onClick={onDelete}
              disabled={
                deletingDocType ||
                savingDocType ||
                getDocCountWithType(editingDocType.name) > 0
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
            onClick={onClose}
            disabled={savingDocType || deletingDocType}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSave}
            disabled={
              savingDocType || deletingDocType || !docTypeForm.name.trim()
            }
          >
            {savingDocType
              ? "Saving..."
              : editingDocType
                ? "Update"
                : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
