import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

import path from "path";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: true, // Expose to all network interfaces
    port: 5173,
    strictPort: true,
    // Allows access from CodeSandbox (csb.app) preview URLs and local development
    allowedHosts: [
      "lf42rx-5173.csb.app",
      "*.csb.app",
      "localhost",
      "127.0.0.1",
    ],
  },
  plugins: [react(), TanStackRouterVite()],
  define: {
    "process.env": {},
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "excalidraw-monorepo": path.resolve(__dirname, "../../ReDraw/ReDraw/packages/excalidraw"),
      // Force excalidraw to use the same React instance as the main app
      "react": path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
    },
  },
});
