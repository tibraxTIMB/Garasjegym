import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read = path => readFile(new URL(path,import.meta.url),'utf8')

test('43 catalogued additions exactly match the system catalogue acceptance gate',async()=>{
 const migration=await read('../supabase/migrations/20261121223000_expand_trx_olympic_core_library.sql')
 const assertion=await read('../supabase/preflight/exercise_catalogue_manifest_assertions.sql')
 const original=JSON.parse(await read('../supabase/catalog/exercise_catalogue_manifest_sturmKopf_feuer_1_1.json'))
 const migrationNames=[...migration.matchAll(/^\s*\('([^']+)','(?:Styrke|Kjerne|CrossFit)'/gm)].map(match=>match[1])
 const addedSection=assertion.match(/expanded_names text\[\] := ARRAY\[([\s\S]+?)\];/)
 assert.ok(addedSection,'The read-only acceptance gate declares the additions')
 const acceptedNames=[...addedSection[1].matchAll(/'([^']+)'/g)].map(match=>match[1])
 assert.equal(migrationNames.length,43)
 assert.equal(new Set(migrationNames.map(name=>name.toLowerCase())).size,43)
 assert.deepEqual([...acceptedNames].sort(),[...migrationNames].sort())
 assert.equal(original.reconciliation.unique_normalized_names+acceptedNames.length,178)
 assert.match(assertion,/expected_count <> 198/)
})

test('20 accessory and burpee variants remain distinct and obsolete duplicates inactive',async()=>{
 const migration=await read('../supabase/migrations/20261122010000_expand_burpees_and_accessory_strength.sql')
 const assertion=await read('../supabase/preflight/exercise_catalogue_manifest_assertions.sql')
 const names=[...migration.matchAll(/^\s*\('([^']+)','(?:Styrke|CrossFit)'/gm)].map(match=>match[1])
 const section=assertion.match(/accessory_names text\[\] := ARRAY\[([\s\S]+?)\];/)
 assert.ok(section)
 const expected=[...section[1].matchAll(/'([^']+)'/g)].map(match=>match[1])
 assert.equal(names.length,20)
 assert.equal(new Set(names.map(name=>name.toLowerCase())).size,20)
 assert.deepEqual(names.slice().sort(),expected.slice().sort())
 assert.match(migration,/kettlebell deadlift \/ markløft/)
 assert.match(migration,/biceps curl/)
 assert.match(assertion,/expected_count <> 198/)
})

test('all live clean-start checks preserve 198 system exercises',async()=>{
 for(const file of ['clean_start_readiness_read_only.sql','clean_start_post_reset_acceptance_read_only.sql','clean_start_reset_isolated_rehearsal.sql']){
  const sql=await read('../supabase/preflight/'+file)
  assert.match(sql, /198/,file)
  assert.doesNotMatch(sql,/<>\s*135|=\s*135|\/135/,file)
 }
})
