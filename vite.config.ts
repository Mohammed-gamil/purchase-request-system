import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    strictPort: true,
    open: false,
    proxy: {
      // Proxy API requests to Laravel backend during development
      "/api": {
        target: `http://127.0.0.1:${process.env.BACKEND_PORT || 8000}`,
        changeOrigin: true,
        // keep the /api prefix as Laravel routes use it
        // If your Laravel app is behind a different base path, adjust here
        rewrite: (path) => path,
      },
    },
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
