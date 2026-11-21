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
