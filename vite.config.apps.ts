import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "node:path";

/**
 * Vite configuration for building MCP Apps
 *
 * Bundles each app's UI into a single HTML file that can be served
 * as an MCP resource and rendered in host clients (Claude, VS Code, etc.)
 */
export default defineConfig({
  plugins: [viteSingleFile()],
  root: "src/modules/apps/linear-review/ui",
  build: {
    outDir: path.resolve(__dirname, "src/modules/apps/linear-review/ui/dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, "src/modules/apps/linear-review/ui/index.html"),
    },
    // Inline all assets for single-file output
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
