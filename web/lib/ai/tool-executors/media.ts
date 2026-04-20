import type { ToolExecutor } from "./types";

export const mediaExecutors: Record<string, ToolExecutor> = {
  save_image: async (args) => {
    const res = await fetch("/api/media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: args.url,
        filename: args.filename,
        description: args.description,
        prompt: args.prompt,
        model: args.model,
        tags: args.tags || [],
        commit_hash: args.commit_hash,
        document_id: args.document_id,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to save image");

    const links = [];
    if (data.commit_hash)
      links.push(`Journal: ${data.commit_hash.substring(0, 7)}`);
    if (data.document_id) links.push(`Document: #${data.document_id}`);
    const linkInfo =
      links.length > 0 ? `\n• Linked to: ${links.join(", ")}` : "";

    return {
      output: `✅ Image saved to Media Library\n• ID: ${data.id}\n• Filename: ${data.filename}\n• Size: ${Math.round(data.file_size / 1024)} KB${linkInfo}`,
    };
  },

  list_media: async (args) => {
    const params = new URLSearchParams();
    if (args.commit_hash) params.set("commit_hash", String(args.commit_hash));
    if (args.document_id) params.set("document_id", String(args.document_id));
    if (args.limit) params.set("limit", String(args.limit));

    const res = await fetch(`/api/media?${params.toString()}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to list media");

    if (data.assets.length === 0) {
      return { output: "No media assets found." };
    }

    let mediaOutput = `**Media Assets** (${data.total} found)\n\n`;
    for (const a of data.assets) {
      const links = [];
      if (a.commit_hash)
        links.push(`Journal: ${a.commit_hash.substring(0, 7)}`);
      if (a.document_id) links.push(`Document: #${a.document_id}`);
      const linkStr = links.length > 0 ? ` | ${links.join(", ")}` : "";

      const alt = a.alt || a.description || a.filename;
      const imageUrl = `/api/media/${a.id}/raw`;

      mediaOutput += `---\n`;
      mediaOutput += `**${a.filename}** (ID: ${a.id})${linkStr}\n`;
      if (a.description) mediaOutput += `${a.description}\n`;
      mediaOutput += `\n![${alt}](${imageUrl})\n\n`;
    }

    return { output: mediaOutput };
  },

  update_media: async (args) => {
    const res = await fetch(`/api/media/${args.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: args.filename,
        description: args.description,
        tags: args.tags,
        commit_hash: args.commit_hash,
        document_id: args.document_id,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to update media");

    const updates = [];
    if (args.description) updates.push("description");
    if (args.tags) updates.push("tags");
    if (args.commit_hash) updates.push("journal link");
    if (args.document_id) updates.push("document link");
    if (args.filename) updates.push("filename");

    return {
      output: `✅ Updated media asset #${args.id}\nModified: ${updates.join(", ") || "no changes"}`,
    };
  },

  get_media: async (args) => {
    const res = await fetch(`/api/media/${args.id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Media not found");

    const media = data;
    const alt = media.alt || media.description || media.filename;
    const imageUrl = `/api/media/${media.id}/raw`;

    let mediaOutput = `**${media.filename}** (ID: ${media.id})\n`;
    if (media.description) mediaOutput += `Description: ${media.description}\n`;
    if (media.prompt) mediaOutput += `Prompt: ${media.prompt}\n`;
    if (media.model) mediaOutput += `Model: ${media.model}\n`;
    if (media.tags && media.tags.length > 0) {
      const tags =
        typeof media.tags === "string" ? JSON.parse(media.tags) : media.tags;
      if (tags.length > 0) mediaOutput += `Tags: ${tags.join(", ")}\n`;
    }
    mediaOutput += `\n![${alt}](${imageUrl})`;

    return { output: mediaOutput };
  },
};
