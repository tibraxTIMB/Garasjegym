import {readFileSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
// Run every command in the canonical npm test chain, even after a failed group.
// Never report success if any group fails, or if the manifest is missing.
const manifest=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'))
const commands=manifest.scripts.test.split(' && ').map(s=>s.trim()).filter(Boolean)
if(!commands.length)throw Error('Empty test chain')
const failures=[]
for(const command of commands){
 console.log('\nRELEASE GROUP: '+command)
 const r=spawnSync(command,{shell:true,stdio:'inherit',cwd:new URL('../',import.meta.url)})
 if(r.status!==0||r.error)failures.push({command,status:r.status,error:r.error?.message})
}
console.log('RELEASE SUMMARY: '+JSON.stringify({groups:commands.length,passed:commands.length-failures.length,failures}))
if(failures.length)process.exitCode=1
