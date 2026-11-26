import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import {fileURLToPath} from 'node:url'
import path from 'node:path'

const realClient=fileURLToPath(new URL('./src/lib/supabase.js',import.meta.url))
const labClient=fileURLToPath(new URL('./src/tabletLabSupabase.js',import.meta.url))
const realSafehouse=fileURLToPath(new URL('./src/components/Safehouse.jsx',import.meta.url))
const realBackup=fileURLToPath(new URL('./src/lib/safehouse.js',import.meta.url))
const labSafehouse=fileURLToPath(new URL('./src/components/TabletLabSafehouse.jsx',import.meta.url))
const withoutQuery=id=>id.split('?')[0]
const forbidden=id=>[realClient,realSafehouse,realBackup].includes(withoutQuery(id))||/[\\/]node_modules[\\/]@supabase[\\/]/.test(id)
function isolatedBackend(){
 return {
  name:'tablet-lab-isolated-backend',
  enforce:'pre',
  resolveId(source,importer){
   if(source==='@supabase/supabase-js'||source.startsWith('@supabase/'))this.error('Supabase SDK is forbidden in Tablet Lab')
   if(source===realSafehouse)return labSafehouse
   if(importer&&source.startsWith('.')&&path.resolve(path.dirname(withoutQuery(importer)),source)===realSafehouse)return labSafehouse
   if(source===realClient)return labClient
   if(importer&&source.startsWith('.')&&path.resolve(path.dirname(withoutQuery(importer)),source)===realClient)return labClient
   return null
  },
  moduleParsed(info){if(forbidden(info.id))this.error('Production database module is forbidden in Tablet Lab: '+info.id)},
  generateBundle(_,bundle){
   for(const output of Object.values(bundle))if(output.type==='chunk'){
    if(Object.keys(output.modules).some(forbidden))this.error('Production client found in Tablet Lab chunk '+output.fileName)
   }
  }
 }
}
export default defineConfig({
 base:'/Garasjegym/',
 publicDir:false,
 // Override inherited VITE credentials as a second line of defence.
 envPrefix:'GG_TABLET_LAB_',
 define:{
  'import.meta.env.VITE_SUPABASE_URL':'undefined',
  'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY':'undefined',
  'import.meta.env.VITE_SUPABASE_ANON_KEY':'undefined'
 },
 plugins:[isolatedBackend(),react()],
 build:{outDir:'dist',emptyOutDir:false,assetsDir:'tablet-lab-assets',rollupOptions:{input:fileURLToPath(new URL('./tablet-lab.html',import.meta.url))}}
})
