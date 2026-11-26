import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import {fileURLToPath} from 'node:url'
export default defineConfig({base:'/Garasjegym/',publicDir:false,plugins:[react()],resolve:{alias:[{find:/^(?:\.\.\/)*\.?\/?lib\/supabase\.js$/,replacement:fileURLToPath(new URL('./src/tabletLabSupabase.js',import.meta.url))}]},build:{outDir:'dist',emptyOutDir:false,assetsDir:'tablet-lab-assets',rollupOptions:{input:fileURLToPath(new URL('./tablet-lab.html',import.meta.url))}}})
