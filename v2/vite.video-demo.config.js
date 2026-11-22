import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import {fileURLToPath} from 'node:url'

export default defineConfig({
  base: '/',
  plugins: [react()],
  resolve: {alias: [{find: /^(?:\.\.\/)*\.?\/?lib\/supabase\.js$/, replacement: fileURLToPath(new URL('./src/videoDemoSupabase.js', import.meta.url))}]},
  server: {host: '127.0.0.1', port: 4173, strictPort: true},
  build: {rollupOptions: {input: fileURLToPath(new URL('./video-demo.html', import.meta.url))}},
})
