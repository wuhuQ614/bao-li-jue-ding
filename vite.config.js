import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api-proxy/deepseek': {
        target: 'https://api.deepseek.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-proxy\/deepseek/, ''),
      },
      '/api-proxy/openai': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-proxy\/openai/, ''),
      },
      '/api-proxy/dashscope': {
        target: 'https://dashscope.aliyuncs.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-proxy\/dashscope/, ''),
      },
      '/api-proxy/mimo': {
        target: 'https://api.xiaomimimo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-proxy\/mimo/, ''),
      },
      '/api-proxy/openai-proxy': {
        target: 'https://api.openai-proxy.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-proxy\/openai-proxy/, ''),
      },
    }
  }
})
