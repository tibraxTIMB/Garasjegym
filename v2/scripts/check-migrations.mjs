import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const directory = path.resolve('supabase/migrations')
const files = (await readdir(directory)).filter((name) => name.endsWith('.sql')).sort()
const errors = []

if (files.length === 0) errors.push('Ingen SQL-migreringar vart funne.')

const versions = new Set()
for (const file of files) {
  if (!/^\d{12}_[a-z0-9_]+\.sql$/i.test(file)) {
    errors.push(`${file}: filnamnet må starta med ein 12-sifra migreringsversjon.`)
  }
  const version = file.slice(0, 12)
  if (versions.has(version)) errors.push(`${file}: duplikat migreringsversjon ${version}.`)
  versions.add(version)

  const sql = await readFile(path.join(directory, file), 'utf8')
  const delimiters = sql.match(/\$[A-Za-z_][A-Za-z0-9_]*\$|\$\$/g) || []
  const counts = new Map()
  for (const delimiter of delimiters) counts.set(delimiter, (counts.get(delimiter) || 0) + 1)
  for (const [delimiter, count] of counts) {
    if (count % 2 !== 0) errors.push(`${file}: uparleg dollar-quote delimiter ${delimiter}.`)
  }
  if (/\bdo\s+\$(?!\$)/i.test(sql)) {
    errors.push(`${file}: DO-blokk ser ut til å ha ein ufullstendig dollar-quote.`)
  }
}

if (errors.length) {
  console.error('SQL-migreringskontroll feila:')
  for (const error of errors) console.error(`- ${error}`)
  process.exitCode = 1
} else {
  console.log(`SQL-migreringskontroll bestått: ${files.length} filer, balanserte dollar-quote delimiterar.`)
}
