import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

import path from "path";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    // Allows access from CodeSandbox (csb.app) preview URLs
    allowedHosts: [
      "lf42rx-5173.csb.app", // You can explicitly list the specific host
      "*.csb.app", // OR use a wildcard for all CodeSandbox previews
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
    },
  },
});
