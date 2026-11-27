import test from 'node:test'
import assert from 'node:assert/strict'
import {validateTabletLabArtifact} from './check-tablet-lab-artifact.mjs'
const good=[{name:'tablet-lab.html',text:"<meta content=\"connect-src 'none'\">"},{name:'tablet-lab-assets/app.js',text:'werkstatt-isolated-tablet-member-v1'}]
test('isolated laboratory requires own page, script, CSP and synthetic identity',()=>{
 assert.deepEqual(validateTabletLabArtifact(good),[])
 assert.ok(validateTabletLabArtifact(good.slice(0,1)).length)
 assert.ok(validateTabletLabArtifact(good.slice(1)).length)
 assert.ok(validateTabletLabArtifact([{...good[0],text:'missing CSP'},good[1]]).length)
 assert.ok(validateTabletLabArtifact([good[0],{...good[1],text:'missing identity'}]).length)
})
test('database project references and credentials are rejected only inside the lab',()=>{
 for(const text of ['https://example-project.supabase.co','izwzwvlexqxqewzijhhd','kultdmklwmilhoytrrig','sb_publishable_'+ 'x'.repeat(24),'sb_secret_'+ 'x'.repeat(24),'eyJabcdef.abc.def']){
  assert.ok(validateTabletLabArtifact([...good,{name:'tablet-lab-assets/extra.js.map',text}]).length)
  assert.deepEqual(validateTabletLabArtifact([...good,{name:'assets/production.js',text}]),[])
 }
})
