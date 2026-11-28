import {readFileSync,readdirSync,existsSync} from 'node:fs'
import {resolve,relative,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
const repo=resolve(dirname(fileURLToPath(import.meta.url)),'../..')
const manifest=JSON.parse(readFileSync(resolve(repo,'v2/docs/freiwerk-audit-register.json'),'utf8'))
const slash=p=>p.replaceAll('\\','/')
function walk(dir){if(!existsSync(dir))return [];return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(resolve(dir,e.name)):[slash(relative(repo,resolve(dir,e.name)))])}
const matches=p=>/^v2\/src\/.*\.(jsx|tsx|js|ts|css)$/.test(p)||/^v2\/(?:[^/]+\.html|public\/.*\.(html|js|css|json)|supabase\/templates\/.*\.html|docs\/prototypes\/.*\.html)$/.test(p)||/^[^/]+\.html$/.test(p)||/^src\/.*\.(js|jsx|ts|tsx|css)$/.test(p)
const actual=[...new Set([...walk(resolve(repo,'v2/src')),...walk(resolve(repo,'v2/public')),...walk(resolve(repo,'v2/supabase/templates')),...walk(resolve(repo,'v2/docs/prototypes')),...walk(resolve(repo,'src')),...readdirSync(repo).filter(p=>p.endsWith('.html')),...readdirSync(resolve(repo,'v2')).filter(p=>p.endsWith('.html')).map(p=>'v2/'+p)])].filter(matches).sort()
const registered=new Map(manifest.files.map(row=>[row.path,row]))
if(registered.size!==manifest.files.length)throw Error('Duplicate register paths')
const count=(s,re)=>[...s.matchAll(re)].length
const rows=actual.map(path=>{
 const s=readFileSync(resolve(repo,path),'utf8'),entry=registered.get(path)
 const approved=entry?.state==='approved'&&manifest.requiredChecks.every(key=>entry.checks?.[key]==='pass')&&entry.evidence?.length>0
 return {path,state:approved?'approved':entry?.state==='approved'?'invalid-approval':entry?.state||'unregistered',approved,counts:{inputs:count(s,/<input\b/g),numeric:count(s,/<FlowNumberInput\b/g),selects:count(s,/<select\b|<GarageSelect\b/g),disclosures:count(s,/<details\b/g),dialogs:count(s,/role=["'](?:alertdialog|dialog)["']/g),checkboxes:count(s,/type=["']checkbox["']/g),nativeConfirm:count(s,/window\.confirm\(/g),gestureHandlers:count(s,/onTouch(?:Start|End)|useSwipeGesture\b|onPointerDown\s*=/g)}}
})
const removed=[...registered.keys()].filter(p=>!actual.includes(p))
const result={baseline:manifest.baseline,total:rows.length,approved:rows.filter(r=>r.approved).length,unregistered:rows.filter(r=>r.state==='unregistered').map(r=>r.path),removed,rows}
if(process.argv.includes('--json'))console.log(JSON.stringify(result,null,2))
else console.log('FREIWERK: '+result.total+' files; '+result.approved+' approved; '+result.unregistered.length+' unregistered; '+removed.length+' removed. Static inventory only; not a device test.')
if(process.argv.includes('--release')&&(result.approved!==result.total||removed.length)) {console.error('FREIWERK release gate: every current surface requires evidenced approval; reconcile removed files.');process.exitCode=1}
