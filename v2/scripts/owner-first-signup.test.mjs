import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('first-owner signup is opt-in and never grants admin from the browser', async () => {
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')
  assert.match(app, /VITE_OWNER_BOOTSTRAP_SIGNUP === 'true'/)
  assert.match(app, /supabase\.auth\.signUp\(/)
  assert.match(app, /minLength=\{mode === 'update' \|\| mode === 'register' \? 12/)
  const signupCall = app.slice(app.indexOf('supabase.auth.signUp('), app.indexOf('supabase.auth.signUp(') + 300)
  assert.equal(/role:\s*['"]admin['"]/.test(signupCall), false)
})

test('owner bootstrap requires verified email and rejects unrelated first signups', async () => {
  const sql = await readFile(new URL('../supabase/candidates/owner_first_signup_bootstrap_gate.sql', import.meta.url), 'utf8')
  assert.match(sql, /NOT AN INSTALLED MIGRATION/)
  assert.match(sql, /tibrakestad@gmail\.com/g)
  assert.match(sql, /NEW\.email_confirmed_at IS NULL/)
  assert.match(sql, /OLD\.email_confirmed_at IS NOT NULL/)
  assert.match(sql, /pg_advisory_xact_lock/)
  assert.match(sql, /REVOKE ALL ON FUNCTION app_private\.guard_first_owner_registration\(\) FROM PUBLIC, anon, authenticated/)
  assert.doesNotMatch(sql, /raw_user_meta_data|user_metadata/)
})
