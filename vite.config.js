import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // 相对路径，保证 Electron(file://) 与 Capacitor(WebView) 下资源加载正常
  base: './',
  server: {
    port: 5173,
    host: true
  }
})
