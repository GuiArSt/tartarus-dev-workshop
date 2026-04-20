import type { ToolExecutor } from "./types";

export const replicateExecutors: Record<string, ToolExecutor> = {
  replicate_generate_image: async (args) => {
    const res = await fetch("/api/replicate/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: args.prompt,
        model: args.model || "black-forest-labs/flux-2-pro",
        width: args.width || 1024,
        height: args.height || 1024,
        num_outputs: args.num_outputs || 1,
        guidance_scale: args.guidance_scale,
        num_inference_steps: args.num_inference_steps,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      const errorMsg = data.error || "Failed to generate image";
      const details = data.details ? `\nDetails: ${data.details}` : "";
      throw new Error(`${errorMsg}${details}`);
    }

    if (!data.images || data.images.length === 0) {
      throw new Error(
        "No images were generated. Please try again with a different prompt."
      );
    }

    // Auto-save each generated image to Media Library
    const savedAssets: Array<{ id: number; filename: string; url: string }> = [];
    for (let i = 0; i < data.images.length; i++) {
      const imageUrl = data.images[i];
      const timestamp = Date.now();
      const filename = `generated-${timestamp}-${i + 1}.png`;

      try {
        const saveRes = await fetch("/api/media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: imageUrl,
            filename,
            description: `AI-generated image`,
            prompt: String(args.prompt),
            model: data.model,
            tags: ["ai-generated"],
          }),
        });

        if (saveRes.ok) {
          const saveData = await saveRes.json();
          savedAssets.push({
            id: saveData.id,
            filename: saveData.filename,
            url: imageUrl,
          });
        }
      } catch (saveErr) {
        console.error("Failed to auto-save image:", saveErr);
      }
    }

    // Format output with saved asset info
    let output: string;
    if (savedAssets.length > 0) {
      const assetList = savedAssets
        .map((a) => `• ID ${a.id}: ${a.filename}`)
        .join("\n");
      output = `✅ Generated ${data.images.length} image(s) using ${data.model}\n\n📁 Saved to Media Library:\n${assetList}\n\nYou can edit metadata (description, tags, links) using the update_media tool with the asset ID.`;
    } else {
      const imageList = data.images
        .map((url: string, idx: number) => `${idx + 1}. ${url}`)
        .join("\n");
      output = `✅ Generated ${data.images.length} image(s) using ${data.model}:\n${imageList}`;
    }

    return {
      output,
      metadata: {
        images: data.images,
        model: data.model,
        prompt: data.prompt,
      },
    };
  },
};
