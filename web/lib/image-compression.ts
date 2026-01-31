/**
 * Image Compression Utility
 *
 * Compresses images to be under a target size (default 5MB) for API compatibility.
 * Strategy:
 * 1. First try format conversion (PNG to JPEG) which often reduces size significantly
 * 2. If still too large, progressively reduce quality
 * 3. If still too large, reduce dimensions while maintaining aspect ratio
 */

export interface CompressionResult {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  wasCompressed: boolean;
  method: "none" | "format" | "quality" | "resize";
  format: string;
  width?: number;
  height?: number;
}

export interface CompressionOptions {
  maxSizeBytes?: number; // Default: 5MB
  maxDimension?: number; // Max width/height, default: 4096
  initialQuality?: number; // Starting quality for JPEG, default: 0.92
  minQuality?: number; // Minimum quality before resizing, default: 0.5
  qualityStep?: number; // Quality reduction per iteration, default: 0.1
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxSizeBytes: 5 * 1024 * 1024, // 5MB
  maxDimension: 4096,
  initialQuality: 0.92,
  minQuality: 0.5,
  qualityStep: 0.1,
};

/**
 * Load an image from a File or Blob
 */
function loadImage(source: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(source);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

/**
 * Draw image to canvas and export as blob
 */
function canvasToBlob(canvas: HTMLCanvasElement, format: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to convert canvas to blob"));
        }
      },
      format,
      quality
    );
  });
}

/**
 * Draw image to canvas at specified dimensions
 */
function drawToCanvas(img: HTMLImageElement, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  // Use high-quality image smoothing for downscaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, width, height);

  return canvas;
}

/**
 * Calculate new dimensions maintaining aspect ratio
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxDimension: number,
  scale: number = 1
): { width: number; height: number } {
  let width = originalWidth * scale;
  let height = originalHeight * scale;

  // First ensure we don't exceed maxDimension
  if (width > maxDimension || height > maxDimension) {
    const ratio = Math.min(maxDimension / width, maxDimension / height);
    width *= ratio;
    height *= ratio;
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}

/**
 * Compress an image file to be under the target size
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const originalSize = file.size;

  // If already under limit, return as-is
  if (originalSize <= opts.maxSizeBytes) {
    return {
      blob: file,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1,
      wasCompressed: false,
      method: "none",
      format: file.type,
    };
  }

  // Load the image
  const img = await loadImage(file);
  const originalWidth = img.naturalWidth;
  const originalHeight = img.naturalHeight;

  // Calculate initial dimensions (respecting maxDimension)
  let { width, height } = calculateDimensions(originalWidth, originalHeight, opts.maxDimension);

  // Strategy 1: Try format conversion (PNG -> JPEG)
  // This often provides significant size reduction without visible quality loss
  const isPng = file.type === "image/png";
  const format = isPng ? "image/jpeg" : file.type;
  let quality = opts.initialQuality;

  let canvas = drawToCanvas(img, width, height);
  let blob = await canvasToBlob(canvas, format, quality);

  // Check if format conversion alone was enough
  if (blob.size <= opts.maxSizeBytes) {
    return {
      blob,
      originalSize,
      compressedSize: blob.size,
      compressionRatio: blob.size / originalSize,
      wasCompressed: true,
      method: "format",
      format,
      width,
      height,
    };
  }

  // Strategy 2: Reduce quality progressively
  while (quality > opts.minQuality && blob.size > opts.maxSizeBytes) {
    quality -= opts.qualityStep;
    blob = await canvasToBlob(canvas, format, quality);
  }

  if (blob.size <= opts.maxSizeBytes) {
    return {
      blob,
      originalSize,
      compressedSize: blob.size,
      compressionRatio: blob.size / originalSize,
      wasCompressed: true,
      method: "quality",
      format,
      width,
      height,
    };
  }

  // Strategy 3: Reduce dimensions progressively
  let scale = 0.9;
  while (scale > 0.1 && blob.size > opts.maxSizeBytes) {
    ({ width, height } = calculateDimensions(
      originalWidth,
      originalHeight,
      opts.maxDimension,
      scale
    ));

    canvas = drawToCanvas(img, width, height);
    blob = await canvasToBlob(canvas, format, opts.minQuality);
    scale -= 0.1;
  }

  return {
    blob,
    originalSize,
    compressedSize: blob.size,
    compressionRatio: blob.size / originalSize,
    wasCompressed: true,
    method: "resize",
    format,
    width,
    height,
  };
}

/**
 * Compress multiple images
 */
export async function compressImages(
  files: File[],
  options: CompressionOptions = {}
): Promise<CompressionResult[]> {
  return Promise.all(files.map((file) => compressImage(file, options)));
}

/**
 * Convert a File to a data URL (base64)
 */
export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
