import {STANDARD_PR_LIFTS,exerciseKey} from './prDirectory.js'
const names=new Map(STANDARD_PR_LIFTS.map(lift=>[exerciseKey(lift.name),lift]))
const positive=value=>{const n=Number(String(value??'').replace(',','.'));return Number.isFinite(n)&&n>0?n:0}
const strictKey=name=>String(name||'').trim().toLocaleLowerCase('nn-NO')
function topLoads(rows,requireReps){
 const map=new Map()
 for(const item of rows||[]){
  const key=strictKey(item.exercise_name)
  if(!names.has(key)||item.is_rest||item.side_mode||item.is_complex)continue
  const value=Math.max(0,...(item.workout_sets||item.sets||[]).filter(s=>!requireReps||Number.isInteger(Number(s.reps))&&Number(s.reps)>0).map(s=>positive(s.load_kg)))
  if(value>0)map.set(key,Math.max(map.get(key)||0,value))
 }
 return map
}
export function hasVictoryCandidate(rows){return topLoads(rows,true).size>0}
export function findPRVictories(rows,logs=[],manualRecords=[]){
 const current=topLoads(rows,true),previous=new Map()
 for(const log of logs)for(const [key,value] of topLoads(log.workout_exercises,false))previous.set(key,Math.max(previous.get(key)||0,value))
 for(const record of manualRecords){
  const key=strictKey(record.exercise_name)
  if(names.has(key)&&record.unit==='kg')previous.set(key,Math.max(previous.get(key)||0,positive(record.result)))
 }
 return [...current].flatMap(([key,value])=>{
  const prior=previous.get(key)||0
  return prior>0&&value>prior?[{name:names.get(key).name,label:names.get(key).label,previous_kg:prior,load_kg:value}]:[]
 })
}
// Fail closed for celebration if history cannot be read. A PR lookup must
// never prevent the actual workout from being saved.
async function pages(query){
 const rows=[]
 for(let offset=0;;offset+=200){
  const {data,error}=await query().order('id',{ascending:true}).range(offset,offset+199)
  if(error)throw error
  const page=data||[];rows.push(...page)
  if(page.length<200)return rows
 }
}
export async function checkPRVictories(client,memberId,rows){
 if(!hasVictoryCandidate(rows))return []
 const [logs,records]=await Promise.all([
  pages(()=>client.from('workout_logs').select('id,workout_exercises(exercise_name,workout_sets(reps,load_kg))').eq('member_id',memberId)),
  pages(()=>client.from('personal_records').select('id,exercise_name,result,unit').eq('member_id',memberId).eq('unit','kg'))
 ])
 return findPRVictories(rows,logs,records)
}
// Stored on the workout, not as a new record. If corrected weight/reps no
// longer match, hide the historical marker rather than showing a false PR.
export function workoutPRVictories(log){
 const saved=log?.result_data?.pr_victories
 if(!Array.isArray(saved))return []
 const sets=log.workout_exercises
 if(!Array.isArray(sets))return []
 const actual=topLoads(sets,true)
 return saved.filter(p=>names.has(strictKey(p.name))&&positive(p.previous_kg)>0&&positive(p.load_kg)>positive(p.previous_kg)&&actual.get(strictKey(p.name))===Number(p.load_kg))
}
export function readPRVictoryAudio(){
 try{
  const profile=localStorage.getItem('garasjegym.timer.audio_profile')||'personal'
  const raw=localStorage.getItem('garasjegym.timer.sound_volume'),number=Number(raw)
  return {enabled:localStorage.getItem('garasjegym.timer.pr_victory')!=='off'&&localStorage.getItem('garasjegym.timer.sound_enabled')!=='off'&&profile!=='silent',profile,volume:raw!==null&&Number.isFinite(number)?Math.max(0,Math.min(100,number)):100}
 }catch{return {enabled:true,profile:'personal',volume:100}}
}
