import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Production GO LIVE preflight checks every known column gap on existing tables', async () => {
  const sql = await readFile(new URL('../supabase/preflight/production_release_readiness_read_only.sql', import.meta.url), 'utf8')
  const section = sql.match(/expected_columns\(table_name,column_name\) AS \(VALUES([\s\S]*?)\),\s*expected_rpcs/)
  assert.ok(section, 'required-column allowlist must be present')
  const columns = [...section[1].matchAll(/\('([a-z][a-z0-9_]*)','([a-z][a-z0-9_]*)'\)/g)].map((match) => `${match[1]}.${match[2]}`)
  assert.equal(columns.length, 35)
  assert.equal(new Set(columns).size, 35, 'required-column list must not duplicate entries')
  assert.ok(columns.includes('profiles.membership_status'))
  assert.ok(columns.includes('workout_sets.height_cm'))
  assert.ok(columns.includes('member_preferences.hr_share_with_pt'))
  assert.match(sql, /missing_required_column/)
  assert.doesNotMatch(sql, /\b(?:TRUNCATE|DROP\s+TABLE|DELETE\s+FROM|INSERT\s+INTO|UPDATE\s+public\.)\b/i)
})

test('KLARHEIT production release requires explicit approval on the production branch', async () => {
  const workflow = await readFile(new URL('../../.github/workflows/deploy-sturmkopf-pages.yml', import.meta.url), 'utf8')
  assert.ok(workflow.includes('publish_production:'))
  assert.ok(workflow.includes('default: false'))
  assert.ok(workflow.includes("github.event_name == 'workflow_dispatch' && inputs.publish_production == true && github.ref == 'refs/heads/garasjegym-2.0-sturm­kopf'"))
  assert.ok(workflow.includes('EXPECTED_SUPABASE_PROJECT_REF: izwzwvlexqxqewzijhhd'))
  assert.ok(workflow.includes('VITE_SUPABASE_URL: https://izwzwvlexqxqewzijhhd.supabase.co'))
  assert.ok(!workflow.includes('publish_preview'))
  assert.ok(!workflow.includes('ONE-SHOT-PUBLISH'))
  assert.ok(!workflow.includes('kultdmklwmilhoytrrig'))
})

import {validateReleaseOrder,RELEASE_FILE,PRODUCTION_REF} from './check-release-order.mjs'
test('release order is bound to one unchanged tested production parent',()=>{
 const before='a'.repeat(40),head='b'.repeat(40)
 const valid={event:{ref:PRODUCTION_REF,before,after:head,forced:false,deleted:false,created:false},ref:PRODUCTION_REF,head,parents:[before],paths:[RELEASE_FILE],order:{version:1,intent:'PUBLISH_PRODUCTION',target:before}}
 assert.equal(validateReleaseOrder(valid),true)
 assert.equal(validateReleaseOrder({...valid,paths:['v2/src/App.jsx']}),false)
 for(const bad of [{ref:'refs/heads/main'},{parents:[before,head]},{paths:[RELEASE_FILE,'v2/src/App.jsx']},{order:{...valid.order,target:head}},{order:{...valid.order,intent:'TEST'}},{event:{...valid.event,forced:true}},{event:{...valid.event,before:head}},{event:{...valid.event,created:true}}])assert.throws(()=>validateReleaseOrder({...valid,...bad}))
})
test('release workflow gates deployment on verified order and successful real browser audit',async()=>{
 const workflow=await readFile(new URL('../../.github/workflows/deploy-sturmkopf-pages.yml',import.meta.url),'utf8')
 assert.ok(workflow.includes('release_approved: ${{ steps.release_gate.outputs.approved }}'))
 assert.ok(workflow.includes("needs.build.outputs.release_approved == 'true'"))
 assert.ok(workflow.includes('python scripts/responsive-audit.py'))
 assert.ok(workflow.includes('needs: build'))
 assert.ok(workflow.includes('environment:\n      name: github-pages'))
 assert.ok(workflow.includes('fetch-depth: 0'))
})
