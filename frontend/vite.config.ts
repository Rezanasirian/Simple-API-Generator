import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const backend = process.env.BACKEND_URL ?? "http://localhost:8000"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    proxy: {
      "/admin-api": backend,
      "/api": backend,
      "/docs": backend,
      "/openapi.json": backend,
    },
  },
})
