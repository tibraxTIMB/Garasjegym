import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const script = fileURLToPath(new URL('../scripts/check-production-migrations.mjs', import.meta.url))

async function runWithMigrations(files) {
  const cwd = await mkdtemp(path.join(tmpdir(), 'garasjegym-migrations-'))
  try {
    const directory = path.join(cwd, 'supabase', 'migrations')
    await mkdir(directory, { recursive: true })
    for (const [name, content] of Object.entries(files)) {
      await writeFile(path.join(directory, name), content, 'utf8')
    }
    return spawnSync(process.execPath, [script], { cwd, encoding: 'utf8' })
  } finally {
    await rm(cwd, { recursive: true, force: true })
  }
}

test('production migration preflight accepts ordinary release migrations', async () => {
  const result = await runWithMigrations({
    '20261121090000_add_safe_index.sql': 'create index if not exists example_idx on public.example(id);',
    '20261121090100_fix_rpc.sql': 'select 1;',
  })
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /preflight passed/i)
})

test('production migration preflight blocks test-only filenames', async () => {
  const result = await runWithMigrations({
    '20261121090000_test_seed_data.sql': 'insert into public.example values (1);',
  })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /test-only migrations/i)
})

test('production migration preflight blocks explicit TEST ONLY headers', async () => {
  const result = await runWithMigrations({
    '20261121090000_baseline.sql': '-- TEST ONLY: isolated test project baseline\ncreate table public.example(id int);',
  })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /baseline\.sql/)
})
