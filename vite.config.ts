import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  plugins: [
    react(),
    {
      name: "catalog-assets",
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          const url = req.url?.split("?")[0];
          if (url?.startsWith("/learn/") && url.endsWith("/"))
            req.url = url + "index.html";
          next();
        });
      },
      generateBundle() {
        for (const file of [
          "library.html",
          "favicon.svg",
          "data/generated-technologies.json",
          "data/technology-extensions.json",
        ]) {
          this.emitFile({
            type: "asset",
            fileName: file,
            source: readFileSync(file, "utf8"),
          });
        }
      },
    },
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          three: ["three"],
          firebase: [
            "firebase/app",
            "firebase/auth",
            "firebase/firestore",
            "firebase/functions",
          ],
        },
      },
    },
  },
});
