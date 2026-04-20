"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, RefreshCw, Trello } from "lucide-react";
import type { LinearCachedProject, LinearCachedIssue } from "@/lib/types/repository";

interface LinearTabProps {
  loading: boolean;
  linearProjects: LinearCachedProject[];
  linearIssues: LinearCachedIssue[];
  linearLastSync: string | null;
  linearSyncing: boolean;
  syncLinearData: () => void;
}

export function LinearTab({
  loading,
  linearProjects,
  linearIssues,
  linearLastSync,
  linearSyncing,
  syncLinearData,
}: LinearTabProps) {
  return (
    <div className="space-y-6 p-6">
      {/* Header with sync button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Linear Cache</h3>
          <p className="text-muted-foreground text-sm">
            {linearLastSync
              ? `Last synced: ${new Date(linearLastSync).toLocaleString()}`
              : "Not synced yet"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={syncLinearData}
            disabled={linearSyncing}
            className="border-[var(--tartarus-linear)]/30 hover:border-[var(--tartarus-linear)]"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${linearSyncing ? "animate-spin" : ""}`} />
            {linearSyncing ? "Syncing..." : "Sync Now"}
          </Button>
          <Link href="/integrations/linear">
            <Button className="bg-[var(--tartarus-linear)] text-white hover:bg-[var(--tartarus-linear)]/90">
              <ExternalLink className="mr-2 h-4 w-4" />
              Full Dashboard
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        <Card className="border-[var(--tartarus-linear)]/20 bg-[var(--tartarus-linear)]/5">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-[var(--tartarus-linear)]">{linearProjects.length}</div>
            <div className="text-muted-foreground text-sm">Projects</div>
          </CardContent>
        </Card>
        <Card className="border-[var(--tartarus-linear)]/20 bg-[var(--tartarus-linear)]/5">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-[var(--tartarus-linear)]">{linearIssues.length}</div>
            <div className="text-muted-foreground text-sm">Issues</div>
          </CardContent>
        </Card>
        <Card className="border-[var(--tartarus-linear)]/20 bg-[var(--tartarus-linear)]/5">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-[var(--tartarus-linear)]">
              {linearIssues.filter((i) => i.state?.name === "In Progress").length}
            </div>
            <div className="text-muted-foreground text-sm">In Progress</div>
          </CardContent>
        </Card>
        <Card className="border-[var(--tartarus-linear)]/20 bg-[var(--tartarus-linear)]/5">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-[var(--tartarus-linear)]">
              {linearProjects.filter((p) => p.summary).length +
                linearIssues.filter((i) => i.summary).length}
            </div>
            <div className="text-muted-foreground text-sm">With Summaries</div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[var(--tartarus-linear)]" />
        </div>
      ) : linearProjects.length === 0 && linearIssues.length === 0 ? (
        <Card className="text-muted-foreground border-dashed p-12 text-center">
          <Trello className="text-muted-foreground/50 mx-auto mb-4 h-12 w-12" />
          <p className="mb-2 text-lg font-medium">No cached Linear data</p>
          <p className="mb-4 text-sm">
            Sync your Linear workspace to see your projects and issues here.
          </p>
          <Button
            onClick={syncLinearData}
            disabled={linearSyncing}
            className="bg-[var(--tartarus-linear)] text-white hover:bg-[var(--tartarus-linear)]/90"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${linearSyncing ? "animate-spin" : ""}`} />
            Sync Linear Data
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Projects */}
          {linearProjects.length > 0 && (
            <div>
              <h4 className="mb-3 text-lg font-medium">
                Projects ({linearProjects.length})
              </h4>
              <div className="grid gap-3 md:grid-cols-2">
                {linearProjects.slice(0, 6).map((project) => (
                  <Card
                    key={project.id}
                    className="transition-colors hover:border-[var(--tartarus-linear)]/50"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{project.name}</span>
                            {project.state && (
                              <Badge variant="outline" className="text-xs">
                                {project.state}
                              </Badge>
                            )}
                          </div>
                          {project.summary ? (
                            <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                              {project.summary}
                            </p>
                          ) : project.description ? (
                            <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                              {project.description.substring(0, 150)}...
                            </p>
                          ) : null}
                          {project.progress !== null && (
                            <div className="mt-2">
                              <div className="bg-muted h-1.5 w-full rounded-full">
                                <div
                                  className="h-1.5 rounded-full bg-[var(--tartarus-linear)]"
                                  style={{
                                    width: `${(project.progress || 0) * 100}%`,
                                  }}
                                />
                              </div>
                              <span className="text-muted-foreground text-xs">
                                {Math.round((project.progress || 0) * 100)}% complete
                              </span>
                            </div>
                          )}
                        </div>
                        {project.url && (
                          <a
                            href={project.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="text-muted-foreground hover:text-foreground h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Issues */}
          {linearIssues.length > 0 && (
            <div>
              <h4 className="mb-3 text-lg font-medium">
                Recent Issues ({linearIssues.length})
              </h4>
              <div className="space-y-2">
                {linearIssues.slice(0, 10).map((issue) => (
                  <Card
                    key={issue.id}
                    className="transition-colors hover:border-[var(--tartarus-linear)]/50"
                  >
                    <CardContent className="flex items-center gap-4 p-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground font-mono text-xs">
                            {issue.identifier}
                          </span>
                          <span className="font-medium">{issue.title}</span>
                        </div>
                        {issue.summary && (
                          <p className="text-muted-foreground mt-0.5 line-clamp-1 text-sm">
                            {issue.summary}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {issue.state?.name && (
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              issue.state.name === "Done"
                                ? "border-green-500/30 bg-green-500/10 text-green-600"
                                : issue.state.name === "In Progress"
                                  ? "border-blue-500/30 bg-blue-500/10 text-blue-600"
                                  : ""
                            }`}
                          >
                            {issue.state.name}
                          </Badge>
                        )}
                        {issue.url && (
                          <a
                            href={issue.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="text-muted-foreground hover:text-foreground h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
