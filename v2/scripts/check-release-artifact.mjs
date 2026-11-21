import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const dist = path.resolve('dist')
const expectedProject = process.env.EXPECTED_SUPABASE_PROJECT_REF || 'izwzwvlexqxqewzijhhd'
const knownProjectRefs = ['izwzwvlexqxqewzijhhd', 'kultdmklwmilhoytrrig']
const releaseName = 'STURMKOPF FEUER 1.1'

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await walk(fullPath))
    else if (entry.isFile()) files.push(fullPath)
  }
  return files
}

const files = await walk(dist)
const requiredFiles = ['index.html', 'manifest.webmanifest']
for (const name of requiredFiles) {
  if (!files.some(file => path.basename(file) === name)) {
    throw new Error(`Missing release artifact file: ${name}`)
  }
}

const textFiles = files.filter(file => /\.(html|js|css|webmanifest|json|svg|txt)$/i.test(file))
const contents = await Promise.all(textFiles.map(file => readFile(file, 'utf8')))
const bundle = contents.join('\n')
const failures = []

if (!bundle.includes(expectedProject)) failures.push(`Expected Supabase project reference is missing: ${expectedProject}`)
for (const projectRef of knownProjectRefs) {
  if (projectRef !== expectedProject && bundle.includes(projectRef)) {
    failures.push(`Unexpected Supabase project reference found in client artifact: ${projectRef}`)
  }
}
if (bundle.includes('service_role')) failures.push('service_role literal found in client artifact')
if (/sb_secret_[A-Za-z0-9_-]{20,}/.test(bundle)) failures.push('Potential Supabase secret key value found in client artifact')
if (!bundle.includes(releaseName)) failures.push(`Release label missing: ${releaseName}`)

for (const moduleName of ['WodBuilder-', 'PTStudio-', 'Training-', 'Admin-']) {
  if (!files.some(file => path.basename(file).startsWith(moduleName) && file.endsWith('.js'))) {
    failures.push(`Expected application module missing: ${moduleName}`)
  }
}

if (failures.length) {
  console.error('Release artifact safety check FAILED:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exitCode = 1
} else {
  console.log(`Release artifact safety check passed: ${files.length} files, Supabase project ${expectedProject}, ${releaseName}`)
}
