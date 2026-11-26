import assert from 'node:assert/strict'
import {ptFlowRows,osloDate,ptNextAction,ptPreparation} from '../src/lib/ptFlow.js'
const p={id:'p',status:'active',flow_unlock_mode:'sequence'}
const a={id:'a',program_id:'p',week_no:1,day_no:1,sequence_no:1,status:'planned',session_kind:'training',title:'A',wod_id:'same'}
const b={...a,id:'b',day_no:2,sequence_no:2,title:'B'}
const rest={...a,id:'rest',day_no:1,sequence_no:2,session_kind:'rest'}
const st=(program,rows,today='2026-11-25')=>ptFlowRows(program,rows,today).map(s=>s.flowState)
assert.deepEqual(st(p,[b,a]),['ready','locked'])
assert.deepEqual(st(p,[b,{...a,status:'completed'}]),['done','ready'])
assert.deepEqual(st(p,[b,{...a,status:'completed',flow_requires_approval:true}]),['review','locked'])
assert.deepEqual(st(p,[b,{...a,status:'completed',flow_requires_approval:true,flow_approved:true}]),['done','ready'])
assert.deepEqual(st(p,[b,a,rest]),['ready','info','locked'])
assert.deepEqual(st(p,[{...b,flow_override:true},a]),['ready','ready'])
assert.deepEqual(st({...p,flow_unlock_mode:'date'},[{...a,scheduled_date:'2026-11-25'},{...b,scheduled_date:'2026-11-26'}]),['ready','locked'])
assert.deepEqual(st({...p,flow_unlock_mode:'date'},[a]),['locked'])
assert.deepEqual(st({...p,flow_unlock_mode:'open'},[a,b]),['ready','ready'])
assert.deepEqual(st(p,[a,{...b,archived_at:'2026-11-20'}]),['ready'])
assert.deepEqual(st({...p,status:'paused'},[a]),['locked'])
assert.deepEqual(st(p,[{...a,status:'in_progress'},b]),['ready','locked'])
assert.deepEqual(st(p,[a,{...b,program_id:'other'}]),['ready'])
assert.equal(osloDate(new Date('2026-11-24T23:30:00Z')),'2026-11-25')
assert.equal(osloDate(new Date('2026-07-24T22:30:00Z')),'2026-07-25')
console.log('15 PT FLOW checks passed')

assert.deepEqual(ptFlowRows(null,[a]),[])
assert.equal(ptNextAction(ptFlowRows(p,[a,b])).next.id,'a')
assert.equal(ptNextAction(ptFlowRows(p,[{...a,status:'completed'},b])).next.id,'b')
assert.equal(ptNextAction(ptFlowRows(p,[{...a,status:'completed',flow_requires_approval:true},b])).state,'review')
assert.equal(ptNextAction(ptFlowRows({...p,flow_unlock_mode:'open'},[a,{...b,status:'in_progress'}])).next.id,'b')
assert.equal(ptNextAction(ptFlowRows(p,[rest])).state,'empty')
assert.equal(ptNextAction(ptFlowRows(p,[{...a,status:'completed'},{...b,status:'completed'}])).state,'complete')
assert.equal(ptNextAction(ptFlowRows({...p,status:'paused'},[a])).state,'locked')
assert.deepEqual(ptPreparation({...a,estimated_minutes:20,coach_note:' Test ',workout_snapshot:{format:'EMOM',duration_minutes:30,materials:'Stong'}}),{format:'EMOM',minutes:20,focus:'',note:'Test',preparation:'',materials:'Stong'})
assert.equal(ptPreparation(null).minutes,null)
console.log('10 next action and preparation checks passed')
