"use client";

import { useState, useCallback } from "react";
import type { Skill, SkillCategory } from "@/lib/types/repository";

export function useCategoryManagement(
  skills: Skill[],
  invalidateTabCache: (tab: string) => void,
  fetchData: (forceRefresh?: boolean) => Promise<void>
) {
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<SkillCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: "", color: "violet", icon: "tag" });
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [savingCategory, setSavingCategory] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState(false);

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
      fetchData(true);
    } catch (error: any) {
      setCategoryError(error.message);
    } finally {
      setSavingCategory(false);
    }
  }, [categoryForm, editingCategory, closeCategoryDialog, invalidateTabCache, fetchData]);

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
      fetchData(true);
    } catch (error: any) {
      setCategoryError(error.message);
    } finally {
      setDeletingCategory(false);
    }
  }, [editingCategory, closeCategoryDialog, invalidateTabCache, fetchData]);

  const getSkillCountInCategory = useCallback(
    (categoryName: string) => {
      return skills.filter((s) => s.category === categoryName).length;
    },
    [skills]
  );

  return {
    categoryDialogOpen,
    setCategoryDialogOpen,
    editingCategory,
    categoryForm,
    setCategoryForm,
    categoryError,
    savingCategory,
    deletingCategory,
    openCategoryDialog,
    closeCategoryDialog,
    handleSaveCategory,
    handleDeleteCategory,
    getSkillCountInCategory,
  };
}
