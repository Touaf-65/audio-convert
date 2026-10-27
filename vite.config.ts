import { defineConfig } from "vite";

export default defineConfig({
  // ffmpeg.wasm charge ses workers dynamiquement : le pré-bundling de Vite les casse.
  optimizeDeps: {
    exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
  },
  build: {
    target: "es2023",
  },
});
