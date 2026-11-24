import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {dosageLabel,formatDuration,pacingReview,ptResultSummary,validRoundSplits} from '../src/lib/ptWodReview.js'
const source=path=>readFileSync(new URL(path,import.meta.url),'utf8')

test('AMRAP pacing: a fast start followed by slower rounds is an observation, not a diagnosis',()=>{
 const result={format:'AMRAP',score_rounds:3,score_reps:6,result_data:{split_seconds:[90,170,210],elapsed_seconds:720}}
 assert.deepEqual(validRoundSplits(result),[90,170,210])
 assert.equal(pacingReview(result).kind,'review')
 assert.match(pacingReview(result).text,/spørja/)
 assert.equal(ptResultSummary(result).find(x=>x.label==='Rundar').value,3)
 assert.equal(ptResultSummary(result).find(x=>x.label==='Ekstra reps').value,6)
 assert.equal(formatDuration(210),'3:30')
 assert.equal(formatDuration(3723),'1:02:03')
})

test('Never invent splits; insufficient data produces no pacing diagnosis',()=>{
 assert.deepEqual(validRoundSplits({result_data:{split_seconds:null}}),[])
 assert.deepEqual(validRoundSplits({result_data:{split_seconds:[0,-1,'',120,65]}}),[120,65])
 assert.equal(pacingReview({result_data:{split_seconds:[120]}}).kind,'insufficient')
 assert.equal(pacingReview({result_data:{split_seconds:[90,95,98]}}).kind,'steady')
})

test('Other WOD formats have format-specific summaries and exercise result display',()=>{
 const death={format:'Death By',score_rounds:19,result_data:{death_by:{failed_round:20},elapsed_seconds:1200}}
 assert.equal(ptResultSummary(death).find(x=>x.label==='Stoppa i runde').value,20)
 assert.equal(ptResultSummary({format:'For Time',score_time_seconds:445}).find(x=>x.label==='Sluttid').value,'7:25')
 assert.equal(ptResultSummary({format:'Strength',score_load_kg:62.5}).find(x=>x.label==='Tungaste løft').value,'62.5 kg')
 assert.equal(dosageLabel('pacing'),'Juster disponering')
})

test('PT result screen requests only the selected assignment or program session and saves linked feedback',()=>{
 const screen=source('../src/components/PTWodReview.jsx')
 const list=source('../src/components/PTClientWods.jsx')
 assert.match(screen,/supabase\.rpc\('get_pt_wod_result'/)
 assert.match(screen,/supabase\.rpc\('send_pt_wod_feedback'/)
 assert.match(screen,/pt_wod_feedback/)
 assert.doesNotMatch(screen,/\.from\('workout_logs'\)/)
 assert.doesNotMatch(list,/\.from\('workout_logs'\)/)
 assert.match(list,/completedStatus\(row\.status\)&&row\.workout_log_id/)
 assert.match(list,/completedStatus\(session\.status\)&&session\.workout_log_id/)
 assert.match(screen,/Rundetider er ikkje registrerte/)
 assert.match(screen,/Personleg tilbakemelding/)
 assert.match(screen,/Kunden vil sjå ho i PT-dialogen/)
})

test('SQL gate returns only the linked member/WOD log, guards both access paths and limits privileges',()=>{
 const sql=source('../supabase/migrations/20261124065100_pt_wod_results_feedback.sql')
 assert.match(sql,/enable row level security/)
 assert.match(sql,/where wl\.id=v_log and wl\.member_id=v_member and wl\.source_wod_id=v_wod/)
 assert.match(sql,/public\.is_admin_or_manager\(\)/)
 assert.match(sql,/app_private\.is_pt_coach_for_member\(v_member\)/)
 assert.match(sql,/revoke all on function public\.get_pt_wod_result/)
 assert.match(sql,/grant execute on function public\.get_pt_wod_result\(uuid,uuid\) to authenticated/)
 assert.match(sql,/revoke all on public\.pt_wod_feedback/)
 assert.match(sql,/grant select on public\.pt_wod_feedback to authenticated/)
 assert.match(sql,/insert into public\.pt_messages/)
 assert.match(sql,/insert into public\.pt_wod_feedback/)
 assert.doesNotMatch(sql,/drop table public\.workout_logs/i)
 assert.doesNotMatch(sql,/truncate/i)
})
