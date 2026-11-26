import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {ZUENDUNG_PRESETS,ZUENDUNG_CORE,buildZuendung,compositePartLabel} from '../src/lib/zuendung.js'
import {validateCompositeBlocks,compositeSamspelResults} from '../src/lib/compositeWod.js'
const catalogue=JSON.parse(readFileSync(new URL('../supabase/catalog/exercise_catalogue_manifest_sturmKopf_feuer_1_1.json',import.meta.url))).exercises.map((e,i)=>({...e,id:String(i),is_active:true}))
test('all twelve preparation variants retain six fixed exercises, no scores and real catalogue IDs',()=>{
 for(const p of ZUENDUNG_PRESETS)for(const mode of ['individual','partner']){
  const x=buildZuendung(p.id,mode,catalogue,()=>p.id)
  assert.equal(x.blocks.length,3)
  assert.ok(x.blocks.every(b=>b.flowReporting==='done'&&b.scoreMode==='none'))
  assert.deepEqual(x.items.filter(r=>r.blockId.endsWith('-core')).map(r=>r.move.name),ZUENDUNG_CORE.map(r=>r.name))
  assert.equal(validateCompositeBlocks(x.blocks,x.items.map(r=>({...r.exercise,blockId:r.blockId}))), '')
  assert.equal(x.unlinked.length,3);assert.ok(x.items.filter(r=>r.unlinked).every(r=>r.exercise.id===null))
  assert.equal(compositePartLabel([...x.blocks,{id:'a'}],3),'A')
  assert.deepEqual(x.blocks.map((_,i)=>compositePartLabel(x.blocks,i)),['0.1','0.2','0.3'])
 }
})
test('prep partner row has no required distance; missing other exercises fail safely',()=>{
 const x=buildZuendung('eisenkette','partner',catalogue,()=> 'w')
 const scores=Object.fromEntries(x.blocks.filter(b=>b.samspel).map(b=>['samspel:'+b.id,{participants:{1:{quality:'done'},2:{quality:'done'}}}]))
 const result=compositeSamspelResults(x.blocks,scores,{},true)
 assert.equal(result.issue,null);assert.equal(result.rows[0].distance,null)
 assert.throws(()=>buildZuendung('panzerbein','individual',[]),/manglar/)
})

import {skipZuendung} from '../src/lib/zuendung.js'
test('skip only untouched leading prep, keep next main block stopped',()=>{
 const x=buildZuendung('eisenkette','partner',catalogue,()=> 'w')
 const all=[...x.blocks,{id:'main',format:'AMRAP'}]
 const skipped=skipZuendung(all,0,{0:{phase:'Klar',elapsed:0}})
 assert.equal(skipped.next,3)
 assert.equal(Object.keys(skipped.results).length,3)
 assert.ok(Object.values(skipped.results).every(r=>r.prep_skipped&&!r.hasStarted))
 assert.equal(skipZuendung(x.blocks,0,{}),null)
 assert.equal(skipZuendung(all,1,{}),null)
 assert.equal(skipZuendung(all,0,{0:{hasStarted:true}}),null)
 assert.equal(skipZuendung(all,0,{0:{countdownDeadline:123}}),null)
 const result=compositeSamspelResults(all,{},skipped.results,false)
 assert.equal(result.issue,null)
 assert.ok(result.rows.every(r=>!r.completed&&r.samspel.participant_results.every(p=>p.quality_status==='skipped')))
})
