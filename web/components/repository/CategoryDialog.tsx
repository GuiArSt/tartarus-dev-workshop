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
import { Edit, Plus, Trash2, Tag } from "lucide-react";
import {
  CATEGORY_ICONS,
  CATEGORY_COLORS,
  getColorClasses,
} from "@/components/repository/shared";
import type { SkillCategory } from "@/lib/types/repository";

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCategory: SkillCategory | null;
  categoryForm: { name: string; color: string; icon: string };
  setCategoryForm: React.Dispatch<
    React.SetStateAction<{ name: string; color: string; icon: string }>
  >;
  categoryError: string | null;
  savingCategory: boolean;
  deletingCategory: boolean;
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
  getSkillCountInCategory: (name: string) => number;
}

export function CategoryDialog({
  open,
  onOpenChange,
  editingCategory,
  categoryForm,
  setCategoryForm,
  categoryError,
  savingCategory,
  deletingCategory,
  onSave,
  onDelete,
  onClose,
  getSkillCountInCategory,
}: CategoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              onChange={(e) =>
                setCategoryForm((prev) => ({ ...prev, name: e.target.value }))
              }
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
                    className={`h-8 w-8 rounded-full border-2 transition-[transform,box-shadow] duration-150 ${
                      categoryForm.color === color
                        ? "ring-primary scale-110 ring-2 ring-offset-2"
                        : "hover:scale-105"
                    } ${colorClasses.barColor}`}
                    onClick={() =>
                      setCategoryForm((prev) => ({ ...prev, color }))
                    }
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
                    className={`flex h-10 w-10 items-center justify-center rounded-lg border-2 transition-[background-color,border-color,box-shadow] duration-150 ${
                      categoryForm.icon === iconName
                        ? `${colorClasses.bgColor} ring-primary border-current ring-2 ring-offset-1`
                        : "border-muted hover:border-muted-foreground/50"
                    }`}
                    onClick={() =>
                      setCategoryForm((prev) => ({ ...prev, icon: iconName }))
                    }
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
              <h3
                className={`font-semibold ${getColorClasses(categoryForm.color).color}`}
              >
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
              onClick={onDelete}
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
            onClick={onClose}
            disabled={savingCategory || deletingCategory}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSave}
            disabled={savingCategory || deletingCategory || !categoryForm.name.trim()}
          >
            {savingCategory
              ? "Saving..."
              : editingCategory
                ? "Update"
                : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
