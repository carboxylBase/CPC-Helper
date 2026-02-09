import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // 在这里加入 Tailwind 插件
  ],
  // Tauri 相关的默认配置通常不需要动，但在开发模式下为了兼容性保留以下两项是个好习惯
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
})