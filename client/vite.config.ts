import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
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
  },
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
});
