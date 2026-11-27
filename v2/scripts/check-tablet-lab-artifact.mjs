import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const knownProjectRefs = ['izwzwvlexqxqewzijhhd', 'kultdmklwmilhoytrrig']
const labPath = name => name === 'tablet-lab.html' || name.startsWith('tablet-lab-assets/')
export function validateTabletLabArtifact(entries) {
 const failures=[]
 const files=entries.filter(e=>labPath(e.name))
 const page=files.find(e=>e.name==='tablet-lab.html')
 const scripts=files.filter(e=>e.name.startsWith('tablet-lab-assets/')&&e.name.endsWith('.js'))
 if(!page||!scripts.length)failures.push('Isolated tablet laboratory page or scripts missing')
 if(!page?.text.includes("connect-src 'none'"))failures.push('Tablet laboratory network-deny policy missing')
 if(!scripts.some(e=>e.text.includes('werkstatt-isolated-tablet-member-v1')))failures.push('Isolated test identity missing')
 for(const {name,text} of files){
  if(knownProjectRefs.some(ref=>text.includes(ref))||/https?:\/\/[a-z0-9-]+\.supabase\.co\b/i.test(text))failures.push('Database project reference in Tablet Lab: '+name)
  if(/sb_(?:publishable|secret)_[A-Za-z0-9_-]{16,}/.test(text)||/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/.test(text))failures.push('Possible database credential in Tablet Lab: '+name)
 }
 return failures
}
export async function checkTabletLabDirectory(dist){
 const entries=[]
 async function walk(dir){
  for(const entry of await readdir(dir,{withFileTypes:true})){
   const full=path.join(dir,entry.name),name=path.relative(dist,full).split(path.sep).join('/')
   if(entry.isDirectory()){if(name==='tablet-lab-assets'||name.startsWith('tablet-lab-assets/'))await walk(full)}
   else if(labPath(name)){
    if(!entry.isFile())throw Error('Non-regular Tablet Lab artifact: '+name)
    if(/\.(html|js|css|json|map|svg|txt|webmanifest)$/i.test(name))entries.push({name,text:await readFile(full,'utf8')})
   }
  }
 }
 await walk(dist)
 return validateTabletLabArtifact(entries)
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const failures=await checkTabletLabDirectory(path.resolve('dist'))
 if(failures.length){for(const failure of failures)console.error(failure);process.exitCode=1}
 else console.log('Tablet Lab artifact isolation check passed')
}
