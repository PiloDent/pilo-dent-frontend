import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy any front-end fetch("/api/...") → http://localhost:3000/api/...
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        // paths are already /api/..., so no rewrite needed
      },
      // If you still have /functions/... routes, proxy those too:
      "/functions": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});

