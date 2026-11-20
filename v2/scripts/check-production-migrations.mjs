import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const directory = path.resolve('supabase/migrations')
const files = (await readdir(directory)).filter(name => name.endsWith('.sql')).sort()
const blocked = []

for (const file of files) {
  const sql = await readFile(path.join(directory, file), 'utf8')
  const testOnlyName = /(?:^|_)test(?:_|\.)/i.test(file)
    || /baseline_from_production_schema_no_data/i.test(file)
  const testOnlyHeader = /^\s*--\s*TEST ONLY\b/im.test(sql.slice(0, 1200))
  if (testOnlyName || testOnlyHeader) blocked.push(file)
}

if (blocked.length) {
  console.error('Production migration preflight FAILED: test-only migrations remain in supabase/migrations:')
  for (const file of blocked) console.error(`- ${file}`)
  console.error('Move these files to a separate test-only migration path before any production migration run.')
  process.exitCode = 1
} else {
  console.log(`Production migration preflight passed: ${files.length} migration files contain no test-only markers.`)
}
