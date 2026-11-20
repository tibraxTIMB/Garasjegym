import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const candidatePath = new URL('../supabase/candidates/wave1_membership_auth_production_candidate.sql', import.meta.url)
test('Wave 1 production candidate is isolated outside the auto-applied migrations directory', async () => {
  const candidate = await readFile(candidatePath, 'utf8')
  assert.match(candidate, /NOT AN INSTALLED MIGRATION/i)
  assert.match(candidate, /app\.sturmkopf_wave0_verified/)
  assert.match(candidate, /IS DISTINCT FROM 'true'/)
  assert.match(candidate, /ALTER COLUMN active SET DEFAULT false/)
  assert.match(candidate, /membership_status text NOT NULL DEFAULT 'pending'/)
  assert.match(candidate, /membership_status = CASE WHEN p\.active THEN 'approved' ELSE 'pending' END/)
  assert.match(candidate, /ON CONFLICT \(id\) DO UPDATE\s+SET email = EXCLUDED\.email/i)
  assert.match(candidate, /AND p\.membership_status = 'approved'/)
  assert.match(candidate, /REVOKE UPDATE ON TABLE public\.profiles FROM authenticated/)
  assert.match(candidate, /GRANT UPDATE \(display_name, role, active, membership_status\)/)
  assert.match(candidate, /BEGIN;[\s\S]*COMMIT;\s*$/)
  assert.doesNotMatch(candidate, /\b(DROP\s+TABLE|TRUNCATE|DELETE\s+FROM)\b/i)
  assert.match(candidatePath.pathname, /\/candidates\//)
  assert.equal(candidatePath.pathname.includes('/migrations/'), false)
})

test('candidate has balanced dollar-quote blocks', async () => {
  const candidate = await readFile(candidatePath, 'utf8')
  const tags = candidate.match(/\$[A-Za-z_][A-Za-z0-9_]*\$|\$\$/g) || []
  const counts = new Map()
  for (const tag of tags) counts.set(tag, (counts.get(tag) || 0) + 1)
  for (const [tag, count] of counts) assert.equal(count % 2, 0, tag + ' must be balanced')
})

test('Wave 0 owner approval template pins the exact candidate Git blob revision', async () => {
  const candidate = await readFile(candidatePath, 'utf8')
  const templatePath = new URL('../supabase/preflight/wave0_owner_evidence_template.md', import.meta.url)
  const template = await readFile(templatePath, 'utf8')
  const blobHeader = Buffer.from(`blob ${Buffer.byteLength(candidate)}\\0`)
  const blobSha = createHash('sha1').update(blobHeader).update(candidate).digest('hex')
  assert.ok(template.includes(blobSha), `Owner evidence template must pin candidate blob SHA ${blobSha}`)
})
