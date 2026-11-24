import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {ptPartCompletion,ptIsAmrapPart,ptPartScore,ptRoundSplits,ptReviewHighlights,ptPrescribedWorkContext} from '../src/lib/ptWodReview.js'

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8')

test('nine-minute E3MOM manually stopped at 7:36 can mean work done, not a failed WOD',()=>{
 const partial={format:'E3MOM',duration_seconds:540,elapsed:456,completed:true,phase:'FULLFØRT'}
 assert.equal(ptPartCompletion(partial).kind,'manual')
 assert.equal(ptPartCompletion(partial).label,'Manuelt vidare')
 assert.match(ptPartCompletion(partial).detail,/7:36/)
 assert.match(ptPartCompletion(partial).detail,/9:00/)
 assert.match(ptPartCompletion(partial).detail,/siste arbeidssett/)
 assert.equal(ptPartCompletion({...partial,phase:'PÅGÅR'}).kind,'early')
 assert.equal(ptPartCompletion({...partial,elapsed:540}).kind,'done')
 assert.equal(ptPartCompletion({...partial,completed:false}).kind,'unknown')
 assert.equal(ptPartCompletion({...partial,time_cap_reached:true}).kind,'timed')
})

test('composite AMRAP highlights and round times stay scoped to the relevant part',()=>{
 const result={format:'Samansett økt',result_data:{elapsed_seconds:936,split_seconds:[999],block_summary:[
  {id:'a',title:'Del A',format:'E3MOM',elapsed:456,duration_seconds:540,completed:true,laps:[]},
  {id:'b',title:'Del B',format:'AMRAP',elapsed:480,duration_seconds:480,roundsCompleted:2,extra_reps:20,completed:true,laps:[96,143]}
 ]}}
 const parts=result.result_data.block_summary
 assert.equal(ptIsAmrapPart(parts[0]),false)
 assert.equal(ptIsAmrapPart(parts[1]),true)
 assert.equal(ptPartScore(parts[1]),'2 rundar + 20 reps')
 assert.deepEqual(ptRoundSplits(result,parts[0]),[])
 assert.deepEqual(ptRoundSplits(result,parts[1]),[96,143])
 assert.deepEqual(ptReviewHighlights(result).map(x=>x.value),['15:36','2 rundar + 20 reps'])
 assert.equal(ptPartCompletion(parts[1]).kind,'done')
})

test('missing round times and exercise measurements are never inferred',()=>{
 assert.deepEqual(ptRoundSplits({result_data:{split_seconds:[90]}},{laps:[]}),[])
 assert.deepEqual(ptRoundSplits({result_data:{}},{laps:[null,-1,'',100]}),[100])
 const screen=read('../src/components/PTWodReview.jsx')
 assert.match(screen,/Rundetider er ikkje registrerte/)
 assert.match(screen,/er WOD-oppsettet utgangspunktet/)
 assert.match(screen,/Ingen separate settmålingar/)
 assert.match(screen,/Registrert · sett/)
 assert.doesNotMatch(screen,/reps ikkje registrerte/)
 assert.doesNotMatch(screen,/\.from\('workout_logs'\)/)
})

test('mobile-first review puts summary and feedback ahead of collapsible details',()=>{
 const screen=read('../src/components/PTWodReview.jsx')
 const css=read('../src/components/pt-client-followup.css')
 assert.ok(screen.indexOf('ptreview-metrics')<screen.indexOf('ptreview-next-action'))
 assert.ok(screen.indexOf('ptreview-next-action')<screen.indexOf('ptreview-blocks'))
 assert.match(screen,/ptreview-feedback-panel/)
 assert.match(screen,/Gje tilbakemelding/)
 assert.match(screen,/<details className="ptreview-disclosure"/)
 assert.match(screen,/defaultOpen=\{index===firstAmrapPart\}/)
 assert.match(screen,/ptreview-dose/)
 assert.match(screen,/ptreview-client-rank/)
 assert.match(css,/ptreview-disclosure>summary/)
 assert.match(css,/@media\(max-width:600px\)/)
})

test('selecting a PT result shows it alone instead of unrelated next-step blocks',()=>{
 const parent=read('../src/components/PTStudio.jsx')
 const list=read('../src/components/PTClientWods.jsx')
 assert.match(parent,/setFocusedPtReview\(key\);setTab\('wodar'\)/)
 assert.match(parent,/clientRank=\{selectedRank\}/)
 assert.match(list,/ptfollow-fullreview/)
 assert.match(parent,/initialReview=\{focusedPtReview\}/)
 assert.match(list,/onReviewClosed/)
 assert.match(list,/clientRank=\{clientRank\}/)
 assert.match(list,/row.member_id===clientId/)
 assert.doesNotMatch(list,/\.from\('workout_logs'\)/)
})

test('prescribed AMRAP and E3MOM movements count as WOD work unless athlete reported a deviation',()=>{
 const schema={composite_blocks:[{id:'a',format:'E3MOM',emomIntervalSeconds:180,minutes:9}],
  items:[
   {block_id:'a',exercise_name:'Strict press',reps:5,levels:{rx:{reps:'5'}}},
   {block_id:'b',exercise_name:'Burpee Over Dumbbell',reps:4,levels:{rx:{reps:'4'}}}
  ]}
 const base={format:'Samansett økt',result_data:{prescription_level:'rx',completed:true,block_summary:[
  {id:'a',format:'E3MOM',duration_seconds:540,elapsed:456,completed:true,phase:'FULLFØRT'},
  {id:'b',format:'AMRAP',duration_seconds:480,elapsed:480,completed:true}
 ]}}
 const press={block_id:'a',exercise_name:'Strict press',sets:[{load_kg:7.5,reps:null}]}
 const pressContext=ptPrescribedWorkContext(base,schema,press)
 assert.equal(pressContext.kind,'assumed')
 assert.match(pressContext.text,/3 planlagde intervall × 5 reps/)
 assert.match(pressContext.text,/ikkje ei måling/)
 const burpee={block_id:'b',exercise_name:'Burpee Over Dumbbell',sets:[{reps:null,load_kg:null}]}
 assert.equal(ptPrescribedWorkContext(base,schema,burpee).kind,'assumed')
 assert.match(ptPrescribedWorkContext(base,schema,burpee).text,/AMRAP/)
 assert.equal(ptPrescribedWorkContext(base,schema,{...press,sets:[{reps:4}]}).kind,'deviation')
 const incomplete={...base,result_data:{...base.result_data,block_summary:[{...base.result_data.block_summary[0],completed:false},base.result_data.block_summary[1]]}}
 assert.equal(ptPrescribedWorkContext(incomplete,schema,press).kind,'unconfirmed')
 // Derivation is read-only: neither the original result nor its sparse set receives invented reps.
 assert.equal(press.sets[0].reps,null)
 assert.equal(base.result_data.block_summary[0].elapsed,456)
})

test('EMOM prescription follows saved minute slots and standalone rotation',()=>{
 const multi={format:'EMOM',result_data:{completed:true,prescription_level:'rx'}}
 const schema={duration_seconds:600,interval:{work_every_seconds:60},items:[
  {exercise_name:'Strict press',reps:5,levels:{rx:{reps:'5'}}},
  {exercise_name:'Push Press',reps:3,levels:{rx:{reps:'3'}}}
 ]}
 assert.match(ptPrescribedWorkContext(multi,schema,{exercise_name:'Strict press',sets:[]}).text,/5 planlagde intervall × 5 reps/)
 assert.match(ptPrescribedWorkContext(multi,schema,{exercise_name:'Push Press',sets:[]}).text,/5 planlagde intervall × 3 reps/)
 const specific={...schema,items:[{...schema.items[0],minute_slot:'1, 4, 7'},schema.items[1]]}
 assert.match(ptPrescribedWorkContext(multi,specific,{exercise_name:'Strict press',sets:[]}).text,/3 planlagde intervall × 5 reps/)
})
