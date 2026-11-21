import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const migrationDir = path.join(root, 'supabase', 'migrations')
const readinessFile = path.join(root, 'supabase', 'preflight', 'production_release_readiness_read_only.sql')

// Exact set confirmed in read-only Production readiness SQL on 2026-11-21.
// Their historical CREATE files are not present in the v2 migration chain;
// this allowlist must be rechecked against Production before any rollout.
export const productionBaselineTables = new Set([
  'class_bookings', 'classes', 'exercises', 'personal_records', 'profiles',
  'pt_bookings', 'pt_client_notes', 'pt_messages', 'pt_requests',
  'pt_session_exercises', 'pt_sessions', 'social_comments', 'social_posts',
  'wods', 'workout_exercises', 'workout_logs', 'workout_sets',
])

function expectedNames(sql, first, next) {
  const start = sql.indexOf(first)
  const end = sql.indexOf(next, start + first.length)
  if (start < 0 || end < 0) throw new Error(`Unable to find ${first} in release readiness contract`)
  return [...sql.slice(start + first.length, end).matchAll(/\('([a-z][a-z0-9_]*)'\)/g)].map((match) => match[1])
}

function sqlCreatesObject(sql, type, name) {
  // Only count explicit public-schema definitions, not later ALTERs or mentions
  // in comments. This is an inventory, not a SQL dependency/parser guarantee.
  const definition = type === 'table'
    ? /^\s*create\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-z][a-z0-9_]*)\b/gim
    : /^\s*create\s+(?:or\s+replace\s+)?function\s+public\.([a-z][a-z0-9_]*)\s*\(/gim
  return [...sql.matchAll(definition)].some((match) => match[1].toLowerCase() === name)
}

export async function collectSchemaProvenance() {
  const contract = await readFile(readinessFile, 'utf8')
  const tables = expectedNames(contract, 'expected_tables(table_name) AS (VALUES', 'expected_columns(table_name,column_name) AS')
  const functions = expectedNames(contract, 'expected_rpcs(function_name) AS (VALUES', 'missing_tables AS')
  if (tables.length !== 46 || functions.length !== 26) {
    throw new Error(`Release contract changed: ${tables.length} tables, ${functions.length} RPCs; review provenance parser`)
  }

  // Existing history contains one valid legacy 12-digit version. Match the
  // repository's migration validator instead of silently ignoring it.
  const files = (await readdir(migrationDir)).filter((file) => /^\d{12}(?:\d{2})?_.+\.sql$/.test(file)).sort()
  const sources = await Promise.all(files.map(async (file) => ({ file, sql: await readFile(path.join(migrationDir, file), 'utf8') })))
  const enumerate = (names, type) => names.map((name) => {
    const definitions = sources.filter(({ sql }) => sqlCreatesObject(sql, type, name)).map(({ file }) => file)
    return { name, definitions }
  })

  return {
    warning: 'Source locations only. Do not replay the TEST migration chain into Production. Dependency order, existing objects, role grants, RLS and Auth differences require separate review.',
    migrationFilesInspected: files.length,
    tables: enumerate(tables, 'table'),
    rpcs: enumerate(functions, 'function'),
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const inventory = await collectSchemaProvenance()
  const unexpected = [
    ...inventory.tables.filter((item) => item.definitions.length === 0 && !productionBaselineTables.has(item.name)),
    ...inventory.rpcs.filter((item) => item.definitions.length === 0),
  ]
  process.stdout.write(JSON.stringify({ ...inventory, productionBaselineTables: [...productionBaselineTables].sort(), unexpectedMissingSources: unexpected.map((item) => item.name) }, null, 2) + '\n')
  if (unexpected.length) {
    process.stderr.write(`Missing SQL CREATE source for ${unexpected.length} required new objects; manual reconciliation needed.\n`)
    process.exitCode = 1
  }
}
