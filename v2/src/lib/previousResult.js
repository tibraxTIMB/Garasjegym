import {getWodSideMode,getWodSideLabel} from './wodSides.js'
import {isIndividualPerformance,isUsablePerformedSet,recordedSetsWithStatus,performanceSnapshot} from './performanceEvidence.js'
const normalized=s=>String(s||'').trim().toLowerCase().replace(/\s+/g,' ')
const present=v=>v!==null&&v!==undefined&&String(v).trim()!==''&&Number.isFinite(Number(v))
export function previousExerciseResult(logs,item){
 if(!item||item.is_rest)return null
 const id=item.exercise_id
 const side=getWodSideMode(item)
 const name=normalized(item.exercise_name||item.name)
 if(!name)return null
 for(const log of logs||[]){
  if(!isIndividualPerformance(log))continue
  const matches=(log.workout_exercises||[]).map((e,i)=>({e,i})).filter(({e})=>id&&e.exercise_id?String(id)===String(e.exercise_id):normalized(e.exercise_name)===name)
  const sets=matches.flatMap(({e,i})=>{
   const snapshot=performanceSnapshot(log,e,i)
   const matched=normalized(snapshot?.exercise_name)===normalized(e.exercise_name)
   const savedSide=getWodSideMode(matched?snapshot:e)
   if(savedSide!==side)return []
   return recordedSetsWithStatus(e,snapshot)
  }).filter(s=>isUsablePerformedSet(s)&&[s.reps,s.time_seconds].some(v=>present(v)&&Number(v)>0))
  if(!sets.length)continue
  const values=sets.map(s=>[present(s.reps)?s.reps+' reps':'',present(s.load_kg)?s.load_kg+' kg':'',present(s.height_cm)?s.height_cm+' cm':'',present(s.time_seconds)?s.time_seconds+' sek':''].filter(Boolean).join(' × '))
  return {date:log.workout_date,summary:values.slice(0,4).join(' · ')+(values.length>4?' · +'+(values.length-4)+' sett':'')}
 }
 return null
}

// Build a compact reference list without changing prescription or result fields.
export function previousExerciseReferences(logs,items=[]){
 const seen=new Set()
 return items.flatMap(item=>{
  if(!item||item.is_rest)return []
  const name=String(item.exercise_name||item.name||'').trim()
  if(!name)return []
  const side=getWodSideMode(item)
  const key=(item.exercise_id?'id:'+item.exercise_id:'name:'+normalized(name))+(side?'|'+side:'')
  if(seen.has(key))return []
  seen.add(key)
  const result=previousExerciseResult(logs,item)
  return result?[{key,name:side?name+' · '+getWodSideLabel(item):name,...result}]:[]
 })
}
export function ownPreviousLogs(cache,memberId){
 return memberId&&cache?.memberId===memberId?cache.logs||[]:[]
}
