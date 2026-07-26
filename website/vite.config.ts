import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));

// base: "./" 让构建产物可以部署到任意子路径(或直接双击打开 dist/index.html)
// 三入口:
//   index.html  复古像素版
//   pop.html    几何波普版
//   world.html  双世界版(卡拉彼丘 × 异环)
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: {
    port: 3100,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(root, "index.html"),
        pop: resolve(root, "pop.html"),
        world: resolve(root, "world.html"),
      },
    },
  },
});
