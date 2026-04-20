"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit, Layers, ExternalLink, Star } from "lucide-react";
import { PortfolioProjectEditForm } from "@/components/repository/CVEditForms";
import type { PortfolioProject } from "@/lib/types/repository";

interface PortfolioTabProps {
  loading: boolean;
  portfolioProjects: PortfolioProject[];
  editingProject: string | null;
  setEditingProject: (id: string | null) => void;
  handleSaveProject: (data: Partial<PortfolioProject>) => Promise<void>;
  addProjectWithKronus: () => void;
}

export function PortfolioTab({
  loading,
  portfolioProjects,
  editingProject,
  setEditingProject,
  handleSaveProject,
  addProjectWithKronus,
}: PortfolioTabProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
          className="bg-[var(--tartarus-gold)] font-medium text-[var(--tartarus-void)] hover:bg-[var(--tartarus-gold-bright)]"
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
        <div className="rounded-lg border border-dashed border-[var(--tartarus-border)] p-12 text-center">
          <Layers className="mx-auto h-12 w-12 text-[var(--tartarus-ivory-faded)]" />
          <h3 className="mt-4 text-lg font-semibold text-[var(--tartarus-ivory)]">No portfolio projects yet</h3>
          <p className="mt-2 text-[var(--tartarus-ivory-muted)]">
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
                className="group relative flex h-full flex-col overflow-hidden border-[var(--tartarus-border)] bg-[var(--tartarus-surface)] transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-[var(--tartarus-teal-dim)] hover:shadow-[0_0_20px_rgba(0,206,209,0.1)]"
              >
                {/* Decorative top bar */}
                <div
                  className={`h-0.5 ${project.featured ? "bg-gradient-to-r from-[var(--tartarus-gold)] via-[var(--tartarus-gold-bright)] to-[var(--tartarus-gold)]" : "bg-gradient-to-r from-[var(--tartarus-gold)] to-[var(--tartarus-teal)]"}`}
                />

                {/* Featured star */}
                {project.featured && (
                  <div className="absolute top-4 right-3 z-10">
                    <Star className="h-5 w-5 fill-[var(--tartarus-gold)] text-[var(--tartarus-gold-bright)] drop-shadow-sm" />
                  </div>
                )}

                {/* Edit button on hover */}
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-4 left-3 z-10 bg-[var(--tartarus-surface)]/90 text-[var(--tartarus-teal)] opacity-0 shadow-sm transition-opacity hover:bg-[var(--tartarus-surface)] hover:text-[var(--tartarus-teal-bright)] group-hover:opacity-100"
                  onClick={() => setEditingProject(project.id)}
                >
                  <Edit className="h-4 w-4" />
                </Button>

                {/* Image */}
                {project.image && (
                  <div className="h-36 w-full overflow-hidden bg-gradient-to-br from-[var(--tartarus-teal)]/10 to-[var(--tartarus-teal)]/5">
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
                      <CardTitle className="line-clamp-2 text-lg font-bold text-[var(--tartarus-ivory)]">
                        {project.title}
                      </CardTitle>
                      <p className="mt-0.5 text-sm font-medium text-[var(--tartarus-teal)]">
                        {project.company || "Personal Project"}
                        <span className="mx-1.5 text-[var(--tartarus-ivory-faded)]">
                          •
                        </span>
                        <span className="text-[var(--tartarus-ivory-muted)]">
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
                          ? "border-emerald-800 bg-emerald-900/40 text-emerald-300"
                          : project.status === "wip"
                            ? "border-[var(--tartarus-gold-dim)] bg-[var(--tartarus-gold)]/10 text-[var(--tartarus-gold)]"
                            : "border-[var(--tartarus-border)] bg-[var(--tartarus-void)]/50 text-[var(--tartarus-ivory-faded)]"
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
                        className="border-[var(--tartarus-border)] text-xs text-[var(--tartarus-ivory-muted)]"
                      >
                        {project.role}
                      </Badge>
                    )}
                  </div>

                  {/* Excerpt */}
                  {project.excerpt && (
                    <p className="line-clamp-2 flex-1 text-sm leading-relaxed text-[var(--tartarus-ivory-muted)]">
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
                          className="border border-[var(--tartarus-teal-dim)] bg-[var(--tartarus-teal)]/10 px-2 py-0.5 text-[11px] font-medium text-[var(--tartarus-teal)]"
                        >
                          {tech}
                        </Badge>
                      ))}
                      {project.technologies.length > 4 && (
                        <Badge
                          variant="secondary"
                          className="bg-[var(--tartarus-void)]/50 px-2 py-0.5 text-[11px] text-[var(--tartarus-ivory-faded)]"
                        >
                          +{project.technologies.length - 4}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Links */}
                  {Object.keys(project.links).length > 0 && (
                    <div className="flex gap-3 border-t border-[var(--tartarus-border)] pt-2">
                      {Object.entries(project.links).map(([name, url]) => (
                        <a
                          key={name}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs font-medium text-[var(--tartarus-teal)] transition-colors hover:text-[var(--tartarus-teal-bright)] hover:underline"
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
    </div>
  );
}
