import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {checkSafehouseReceipt,safehouseAge,SAFEHOUSE_PROJECT} from '../src/lib/safehouse.js'
const sample={version:1,project:SAFEHOUSE_PROJECT,completed_at:'2026-11-24T10:00:00Z',archive_checked:true,auth_tables_present:true,public_tables_present:true,storage_objects:0,code_zip_checked:true,archive_sha256:'a'.repeat(64),archive_bytes:2048,code_commit:'b'.repeat(40)}
test('receipt must match source project and prove structural checks; strips unrelated fields',()=>{
 const now=Date.parse('2026-11-24T12:00:00Z')
 assert.equal(checkSafehouseReceipt({...sample,secret:'do not store'},now).secret,undefined)
 for(const bad of [{project:'other'},{archive_checked:false},{auth_tables_present:false},{storage_objects:1},{code_commit:'bad'}])assert.throws(()=>checkSafehouseReceipt({...sample,...bad},now))
 assert.equal(safehouseAge(sample,now).status,'recent')
 assert.equal(safehouseAge(sample,now+48*3600000).status,'old')
})
test('admin only, no backup payload upload, local tool checks archive before receipt',()=>{
 const admin=readFileSync(new URL('../src/components/Admin.jsx',import.meta.url),'utf8')
 const ui=readFileSync(new URL('../src/components/Safehouse.jsx',import.meta.url),'utf8')
 const ps=readFileSync(new URL('../public/safehouse/Safehouse.ps1',import.meta.url),'utf8')
 assert.match(admin,/isAdmin&&adminTab==='drift'/)
 assert.match(ui,/profile.role!=='admin'/)
 assert.match(ui,/file.size>16384/)
 assert.match(ui,/localStorage.setItem/)
 assert.match(ps,/PGSSLMODE='verify-full'/)
 assert.match(ps,/--file=NUL/)
 assert.match(ps,/TABLE DATA auth/)
 assert.ok(ps.indexOf('--file=NUL')<ps.indexOf('SAFEHOUSE-receipt.json'))
 assert.doesNotMatch(ps,/Set-ExecutionPolicy|ExecutionPolicy Bypass/)
})
