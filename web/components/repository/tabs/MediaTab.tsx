"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Image, ExternalLink } from "lucide-react";
import type { MediaAsset } from "@/lib/types/repository";

interface MediaTabProps {
  loading: boolean;
  mediaAssets: MediaAsset[];
  mediaTotal: number;
}

export function MediaTab({ loading, mediaAssets, mediaTotal }: MediaTabProps) {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-[var(--tartarus-ivory)]">Media Library</h3>
          <p className="text-[var(--tartarus-ivory-muted)] text-sm">
            {mediaTotal > 0
              ? `${mediaTotal} media assets`
              : "No media assets found"}
          </p>
        </div>
        <Link href="/multimedia">
          <Button className="bg-[var(--tartarus-teal)] text-[var(--tartarus-void)] hover:bg-[var(--tartarus-teal)]/90">
            <Image className="mr-2 h-4 w-4" />
            Full Gallery
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[var(--tartarus-teal)]" />
        </div>
      ) : mediaAssets.length === 0 ? (
        <Card className="border-dashed border-[var(--tartarus-border)] bg-[var(--tartarus-surface)] p-8 text-center">
          <Image className="mx-auto mb-4 h-12 w-12 text-[var(--tartarus-ivory-faded)]" />
          <p className="text-[var(--tartarus-ivory-muted)] text-sm">
            No media assets found. Upload images, diagrams, or documents to see them here.
          </p>
        </Card>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="group relative overflow-hidden border-[var(--tartarus-border)] bg-[var(--tartarus-surface)] transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-[var(--tartarus-teal-dim)] hover:shadow-[0_0_20px_rgba(0,206,209,0.1)]">
              <div className="h-0.5 bg-[var(--tartarus-teal)]" />
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-[var(--tartarus-teal)]">{mediaTotal}</div>
                <div className="text-[var(--tartarus-ivory-muted)] text-sm">Total Assets</div>
              </CardContent>
            </Card>
            <Card className="group relative overflow-hidden border-[var(--tartarus-border)] bg-[var(--tartarus-surface)] transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-[var(--tartarus-teal-dim)] hover:shadow-[0_0_20px_rgba(0,206,209,0.1)]">
              <div className="h-0.5 bg-[var(--tartarus-teal)]" />
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-[var(--tartarus-teal)]">
                  {mediaAssets.filter((m) => m.mime_type?.startsWith("image/")).length}
                </div>
                <div className="text-[var(--tartarus-ivory-muted)] text-sm">Images</div>
              </CardContent>
            </Card>
            <Card className="group relative overflow-hidden border-[var(--tartarus-border)] bg-[var(--tartarus-surface)] transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-[var(--tartarus-teal-dim)] hover:shadow-[0_0_20px_rgba(0,206,209,0.1)]">
              <div className="h-0.5 bg-[var(--tartarus-teal)]" />
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-[var(--tartarus-teal)]">
                  {mediaAssets.filter((m) => m.destination === "journal").length}
                </div>
                <div className="text-[var(--tartarus-ivory-muted)] text-sm">Journal</div>
              </CardContent>
            </Card>
            <Card className="group relative overflow-hidden border-[var(--tartarus-border)] bg-[var(--tartarus-surface)] transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-[var(--tartarus-teal-dim)] hover:shadow-[0_0_20px_rgba(0,206,209,0.1)]">
              <div className="h-0.5 bg-[var(--tartarus-teal)]" />
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-[var(--tartarus-teal)]">
                  {mediaAssets.filter((m) => m.destination === "media").length}
                </div>
                <div className="text-[var(--tartarus-ivory-muted)] text-sm">Standalone</div>
              </CardContent>
            </Card>
          </div>

          {/* Media Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {mediaAssets.slice(0, 18).map((asset) => {
              const isImage = asset.mime_type?.startsWith("image/");
              return (
                <Link key={asset.id} href={`/multimedia?id=${asset.id}`} className="stagger-item">
                  <Card className="group relative cursor-pointer overflow-hidden border-[var(--tartarus-border)] bg-[var(--tartarus-surface)] transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-[var(--tartarus-teal-dim)] hover:shadow-[0_0_20px_rgba(0,206,209,0.1)]">
                    {!isImage && <div className="h-0.5 bg-[var(--tartarus-teal)]" />}
                    <div className="bg-[var(--tartarus-void)] relative aspect-square">
                      {isImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={
                            asset.supabase_url ||
                            asset.drive_url ||
                            `/api/media/${asset.id}/raw`
                          }
                          alt={asset.alt || asset.filename}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <FileText className="h-8 w-8 text-[var(--tartarus-ivory-faded)]" />
                        </div>
                      )}
                      {/* Destination badge */}
                      <div className="absolute right-1 top-1">
                        <Badge
                          variant="secondary"
                          className="bg-[var(--tartarus-void)]/80 text-[10px] text-[var(--tartarus-ivory-muted)]"
                        >
                          {asset.destination}
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-2">
                      <p className="line-clamp-1 text-xs font-medium text-[var(--tartarus-ivory)]">{asset.filename}</p>
                      <p className="text-[var(--tartarus-ivory-faded)] text-[10px]">
                        {new Date(asset.created_at).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          {/* View All Link */}
          {mediaTotal > 18 && (
            <div className="flex justify-center pt-4">
              <Link href="/multimedia">
                <Button
                  variant="outline"
                  className="border-[var(--tartarus-border)] text-[var(--tartarus-ivory-muted)] hover:border-[var(--tartarus-teal-dim)]"
                >
                  View All {mediaTotal} Assets
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
