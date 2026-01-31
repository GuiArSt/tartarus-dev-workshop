import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

// Google model patterns
const GOOGLE_IMAGEN_MODELS = ["imagen-3.0-generate-002", "imagen-3.0-generate-001"];
const GOOGLE_GEMINI_IMAGE_MODELS = [
  "gemini-2.0-flash-exp",
  "gemini-2.0-flash-preview-image-generation",
  "gemini-2.5-flash-image-preview",
  "gemini-3-pro-image-preview", // Nano Banana Pro
  "nano-banana-pro", // Alias
];

function isGoogleModel(model: string): boolean {
  return model.startsWith("imagen-") || model.startsWith("gemini-") || model === "nano-banana-pro";
}

function getActualModelName(model: string): string {
  // Map aliases to actual model names
  if (model === "nano-banana-pro") {
    return "gemini-3-pro-image-preview";
  }
  return model;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      prompt,
      model = "black-forest-labs/flux-2-pro",
      width = 1024,
      height = 1024,
      num_outputs = 1,
      guidance_scale,
      num_inference_steps,
    } = body;

    if (!prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    // Check if using any Google model
    if (isGoogleModel(model)) {
      const googleApiKey = process.env.GOOGLE_API_KEY;

      if (!googleApiKey) {
        return NextResponse.json(
          { error: "GOOGLE_API_KEY must be configured for Google models" },
          { status: 500 }
        );
      }

      const actualModel = getActualModelName(model);
      const isImagenModel = actualModel.startsWith("imagen-");
      const isGeminiModel = actualModel.startsWith("gemini-");

      if (isImagenModel) {
        // Use Google's Imagen API (generateImages endpoint)
        console.log(
          `[Imagen] Generating image with model ${actualModel}, prompt: ${prompt.substring(0, 50)}...`
        );

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${actualModel}:generateImages?key=${googleApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt,
              number_of_images: num_outputs,
              aspect_ratio: width > height ? "16:9" : width === height ? "1:1" : "9:16",
              safety_filter_level: "block_some",
              person_generation: "allow_all",
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
          console.error("[Imagen] API error:", errorData);
          throw new Error(errorData.error?.message || `Google API error: ${response.statusText}`);
        }

        const data = await response.json();

        let imageUrls: string[] = [];
        if (data.generatedImages && Array.isArray(data.generatedImages)) {
          imageUrls = data.generatedImages
            .map((img: any) => img.imageUrl || img.base64Image)
            .filter((url: any) => url)
            .map((url: string) =>
              url.startsWith("data:") || url.startsWith("http")
                ? url
                : `data:image/png;base64,${url}`
            );
        }

        if (imageUrls.length === 0) {
          return NextResponse.json(
            { error: "No images generated", details: JSON.stringify(data) },
            { status: 500 }
          );
        }

        console.log(`[Imagen] Generated ${imageUrls.length} image(s)`);

        return NextResponse.json({
          success: true,
          images: imageUrls,
          model: actualModel,
          prompt,
        });
      } else if (isGeminiModel) {
        // Use Gemini native image generation (generateContent endpoint)
        console.log(
          `[Gemini] Generating image with model ${actualModel}, prompt: ${prompt.substring(0, 50)}...`
        );

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${actualModel}:generateContent?key=${googleApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [{ text: prompt }],
                },
              ],
              generationConfig: {
                responseModalities: ["IMAGE", "TEXT"],
                imageConfig: {
                  aspectRatio: width > height ? "16:9" : width === height ? "1:1" : "9:16",
                },
              },
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
          console.error("[Gemini] API error:", errorData);
          throw new Error(errorData.error?.message || `Google API error: ${response.statusText}`);
        }

        const data = await response.json();

        const imageUrls: string[] = [];

        // Extract images from Gemini response
        if (data.candidates && Array.isArray(data.candidates)) {
          for (const candidate of data.candidates) {
            if (candidate.content?.parts) {
              for (const part of candidate.content.parts) {
                if (part.inlineData?.mimeType?.startsWith("image/")) {
                  const base64 = part.inlineData.data;
                  const mimeType = part.inlineData.mimeType;
                  imageUrls.push(`data:${mimeType};base64,${base64}`);
                } else if (part.fileData?.fileUri) {
                  imageUrls.push(part.fileData.fileUri);
                }
              }
            }
          }
        }

        if (imageUrls.length === 0) {
          console.error(
            "[Gemini] No images in response:",
            JSON.stringify(data, null, 2).substring(0, 1000)
          );
          return NextResponse.json(
            {
              error: "No images generated by Gemini",
              details: JSON.stringify(data).substring(0, 500),
            },
            { status: 500 }
          );
        }

        console.log(`[Gemini] Generated ${imageUrls.length} image(s)`);

        return NextResponse.json({
          success: true,
          images: imageUrls,
          model: actualModel,
          prompt,
        });
      }
    }

    // Use Replicate API for FLUX and other models
    const replicateApiToken = process.env.REPLICATE_API_TOKEN;
    if (!replicateApiToken) {
      return NextResponse.json({ error: "REPLICATE_API_TOKEN not configured" }, { status: 500 });
    }

    const replicate = new Replicate({
      auth: replicateApiToken,
    });

    const input: any = {
      prompt,
      width,
      height,
      num_outputs,
    };

    if (guidance_scale !== undefined) {
      input.guidance_scale = guidance_scale;
    }
    if (num_inference_steps !== undefined) {
      input.num_inference_steps = num_inference_steps;
    }

    console.log(
      `[Replicate] Generating image with model ${model}, prompt: ${prompt.substring(0, 50)}...`
    );

    const output = await replicate.run(model as `${string}/${string}`, { input });

    console.log(`[Replicate] Raw output type: ${typeof output}, isArray: ${Array.isArray(output)}`);
    console.log(`[Replicate] Raw output:`, JSON.stringify(output, null, 2).substring(0, 500));

    // Extract URLs from various output formats
    const imageUrls: string[] = [];

    // Helper to extract URL from various formats
    const extractUrl = (item: any): string | null => {
      if (typeof item === "string") {
        return item;
      }
      if (item && typeof item === "object") {
        // FileOutput object - has url() method or url property
        if (typeof item.url === "function") {
          return item.url();
        }
        if (typeof item.url === "string") {
          return item.url;
        }
        // Some models return { uri: "..." }
        if (typeof item.uri === "string") {
          return item.uri;
        }
        // ReadableStream - convert to string
        if (item.toString && typeof item.toString === "function") {
          const str = item.toString();
          if (str.startsWith("http")) {
            return str;
          }
        }
      }
      return null;
    };

    if (Array.isArray(output)) {
      for (const item of output) {
        const url = extractUrl(item);
        if (url) imageUrls.push(url);
      }
    } else {
      const url = extractUrl(output);
      if (url) {
        imageUrls.push(url);
      } else if (output && typeof output === "object") {
        // Check for nested output property
        const nestedOutput = (output as any).output;
        if (Array.isArray(nestedOutput)) {
          for (const item of nestedOutput) {
            const nestedUrl = extractUrl(item);
            if (nestedUrl) imageUrls.push(nestedUrl);
          }
        } else if (nestedOutput) {
          const nestedUrl = extractUrl(nestedOutput);
          if (nestedUrl) imageUrls.push(nestedUrl);
        }
      }
    }

    if (imageUrls.length === 0) {
      console.error(`[Replicate] Could not extract URLs from output:`, output);
      return NextResponse.json(
        { error: "No images returned from Replicate", details: JSON.stringify(output) },
        { status: 500 }
      );
    }

    console.log(`[Replicate] Generated ${imageUrls.length} image(s):`, imageUrls);

    return NextResponse.json({
      success: true,
      images: imageUrls,
      model,
      prompt,
    });
  } catch (error: any) {
    console.error("[Image Generation] Error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to generate image",
        details: error.toString(),
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
