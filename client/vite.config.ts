import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
    plugins: [react()],
    server: mode === 'development' ? {
      proxy: {
          "/socket.io": {
              target: "http://localhost:3000",
              ws: true,
              changeOrigin: true,
              secure: false,
              timeout: 60000,
              rewrite: (path) => path,
          },
      },
    headers: {
      // Permissions Policy para permitir recursos de mídia
      "Permissions-Policy":
        "camera=*, microphone=*, display-capture=*, screen-wake-lock=*",
      // Cross-Origin headers para WebRTC em desenvolvimento
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
    // HTTPS opcional para desenvolvimento (descomente se necessário)
    // https: true
      hmr: {
          port: 24678,
          overlay: false
      },
      watch: {
          usePolling: true // Useful if you're in a Docker/VM environment
      }
  } : {},
  // Otimizações para WebRTC
  build: {
    target: "es2020",
    rollupOptions: {
      output: {
        manualChunks: {
          webrtc: ["socket.io-client"],
          ui: ["lucide-react", "clsx", "tailwind-merge"],
        },
      },
    },
  },
}));
