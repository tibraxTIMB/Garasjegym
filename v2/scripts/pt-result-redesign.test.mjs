import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {ptPartCompletion,ptIsAmrapPart,ptPartScore,ptRoundSplits,ptReviewHighlights} from '../src/lib/ptWodReview.js'

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8')

test('nine-minute E3MOM stopped at 7:36 is not presented as fully completed',()=>{
 const partial={format:'E3MOM',duration_seconds:540,elapsed:456,completed:true,phase:'FULLFØRT'}
 assert.equal(ptPartCompletion(partial).kind,'early')
 assert.equal(ptPartCompletion(partial).label,'Avslutta før planlagt tid')
 assert.match(ptPartCompletion(partial).detail,/7:36/)
 assert.match(ptPartCompletion(partial).detail,/9:00/)
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
 assert.match(screen,/Utført arbeid ikkje detaljregistrert/)
 assert.match(screen,/Det tyder ikkje at øvinga ikkje vart gjennomført/)
 assert.match(screen,/reps ikkje registrerte/)
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
 assert.match(list,/initialReview=\{?/)
 assert.match(list,/onReviewClosed/)
 assert.match(list,/clientRank=\{clientRank\}/)
 assert.match(list,/row.member_id===clientId/)
 assert.doesNotMatch(list,/\.from\('workout_logs'\)/)
})
