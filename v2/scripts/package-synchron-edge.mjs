// Candidate packaging only. No deploy, no SQL execution, no credentials.
import {readFileSync,writeFileSync,mkdirSync,realpathSync,existsSync} from 'node:fs'
import {dirname,resolve,relative,isAbsolute,sep} from 'node:path'
import {fileURLToPath} from 'node:url'
import {createHash} from 'node:crypto'
const root=realpathSync(fileURLToPath(new URL('../',import.meta.url)))
const out=resolve(process.argv[2]||'')
if(!process.argv[2]||existsSync(out)||out===root||out.startsWith(root+sep))throw Error('Choose a new output directory outside v2')
const entry='server/edge-candidate/index.ts'
const allowedNpm=new Set(['npm:postgres@3.4.7','npm:@supabase/supabase-js@2.119.2'])
const files=new Map()
function include(name){
 if(files.has(name))return
 if(!/^(server\/(?:edge-candidate\/index\.ts|synchron[A-Za-z]+\.js)|src\/lib\/(?:synchron[A-Za-z]*|individualCalibration|performanceEvidence)\.js)$/.test(name))throw Error('Unexpected server module '+name)
 const absolute=resolve(root,name)
 if(realpathSync(absolute)!==absolute)throw Error('Unexpected module symlink')
 const source=readFileSync(absolute,'utf8')
 if(/\bimport\s*\(/.test(source))throw Error('Dynamic import requires review: '+name)
 files.set(name,source)
 for(const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*)['"]([^'"]+)['"]/g)){
  const spec=match[1]
  if(allowedNpm.has(spec))continue
  if(!spec.startsWith('.'))throw Error('Unexpected dependency '+spec)
  const next=relative(root,resolve(dirname(absolute),spec)).split(sep).join('/')
  if(isAbsolute(next)||next.startsWith('../'))throw Error('Module outside source root')
  include(next)
 }
}
include(entry)
files.set('index.ts',"import './"+entry+"'\n")
files.set('deno.lock',readFileSync(resolve(root,'server/edge-candidate/deno.lock'),'utf8'))
const functionDir=resolve(out,'functions','synchron-live')
const manifest={}
for(const [name,source] of [...files.entries()].sort(([a],[b])=>a.localeCompare(b))){
 const target=resolve(functionDir,name)
 mkdirSync(dirname(target),{recursive:true})
 writeFileSync(target,source,{flag:'wx'})
 manifest['functions/synchron-live/'+name]=createHash('sha256').update(source).digest('hex')
}
const sqlNames=['synchron_pg_candidate.sql','synchron_pg_result_candidate.sql','synchron_pg_notification_candidate.sql','synchron_pg_role_candidate.sql','synchron_pg_auth_candidate.sql']
for(const name of sqlNames){
 const source=readFileSync(resolve(root,'supabase/preflight',name))
 const target=resolve(out,'REVIEW-SQL',name)
 mkdirSync(dirname(target),{recursive:true})
 writeFileSync(target,source,{flag:'wx'})
 manifest['REVIEW-SQL/'+name]=createHash('sha256').update(source).digest('hex')
}
writeFileSync(resolve(out,'SHA256.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'})
writeFileSync(resolve(out,'READ-ME.txt'),'REVIEW CANDIDATE ONLY. No deployment or migration authorization.\nFunction name: synchron-live. Both runtime flags remain off.\nREVIEW-SQL contains additive candidate SQL only. Never run fixtures on production.\nReview DATABUNKER recovery and exact release gates in v2/SYNCHRON_SERVER_GATE.md.\nNo credentials or production records are included.\n',{flag:'wx'})
console.log('SYNCHRON review package: '+files.size+' function files, '+sqlNames.length+' candidate SQL files; no deployment.')
