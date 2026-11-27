import assert from 'node:assert/strict'
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {makeZip} from './build-safehouse.mjs'
const root=mkdtempSync(join(tmpdir(),'gg-backup-verifier-'))
const digest=bytes=>createHash('sha256').update(bytes).digest('hex')
const db=Buffer.alloc(2048,42)
const receipt={version:1,project:'izwzwvlexqxqewzijhhd',completed_at:new Date().toISOString(),archive_checked:true,auth_tables_present:true,public_tables_present:true,storage_objects:0,code_zip_checked:true,archive_sha256:digest(db),archive_bytes:db.length,code_commit:'b'.repeat(40)}
const entries=[['01-DATABASE/database.pgbackup',db],['01-DATABASE/roles.sql','synthetic'],['02-APP/app-source.zip','synthetic'],['03-KONTROLL/DATABUNKER-receipt.json',JSON.stringify(receipt)],['04-GJENOPPRETTING/START-HER.txt','synthetic']]
const manifest=['03-KONTROLL/SHA256SUMS.txt',entries.map(([name,data])=>digest(data)+'  '+name).join('\n')]
const cases=[['valid',[...entries,manifest],0],['tampered',[[entries[0][0],Buffer.alloc(2048,7)],...entries.slice(1),manifest],1],['missing',[...entries.slice(1),manifest],1],['duplicate',[...entries,entries[0],manifest],1],['unlisted',[...entries,['extra','synthetic'],manifest],1]]
try{
 for(const [name,files,code] of cases){
  const path=join(root,name+'.zip');writeFileSync(path,makeZip(files))
  const result=spawnSync('pwsh',['-NoProfile','-File',fileURLToPath(new URL('../public/safehouse/Kontroller-Backup.ps1',import.meta.url)),'-Archive',path],{encoding:'utf8',timeout:20000})
  if(result.error)throw result.error
  assert.equal(result.status,code,name+' '+result.stdout+' '+result.stderr)
 }
 console.log('DATABUNKER offline checksum verification: five synthetic cases passed; no actual production archive or restore tested.')
}finally{rmSync(root,{recursive:true,force:true})}
