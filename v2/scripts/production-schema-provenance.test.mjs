import test from 'node:test'
import assert from 'node:assert/strict'
import { collectSchemaProvenance, productionBaselineTables } from './check-production-schema-provenance.mjs'

test('release readiness schema contract has source locations in reviewed migrations', async () => {
  const inventory = await collectSchemaProvenance()
  assert.equal(inventory.tables.length, 46)
  assert.equal(inventory.rpcs.length, 26)
  assert.ok(inventory.migrationFilesInspected > 100)
  const unlocatedTables = inventory.tables.filter((item) => item.definitions.length === 0).map((item) => item.name)
  assert.deepEqual(unlocatedTables.sort(), [...productionBaselineTables].sort(), 'Untracked baseline changed; reverify against live Production')
  for (const item of [...inventory.tables.filter((row) => !productionBaselineTables.has(row.name)), ...inventory.rpcs]) {
    assert.ok(item.definitions.length, `No CREATE source for required new object ${item.name}`)
    assert.ok(item.definitions.every((file) => /^\d{12}(?:\d{2})?_.+\.sql$/.test(file)))
  }
})
