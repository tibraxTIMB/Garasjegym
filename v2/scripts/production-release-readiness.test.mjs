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

test('KLARHEIT production release requires manual approval on the production branch', async () => {
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
