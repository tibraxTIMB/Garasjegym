import {isIndividualPerformance,isUsablePerformedSet} from './performanceEvidence.js'
// Conservative AMRAP pacing reference: same saved WOD, prescription and clock.
// This compares planned standards and recorded round splits, not verified actual loading.
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value
export function ghostSignature({wodId,format,level,seconds,parts,schema}={}){
 if(!wodId||format!=='AMRAP'||!level||!Number.isSafeInteger(seconds)||seconds<=0||!Array.isArray(parts)||parts.length!==1||schema?.samspel||schema?.wod_engine?.participation&&schema.wod_engine.participation!=='individual')return null
 const part=parts[0]
 if(part.format!=='AMRAP'||Number(part.seconds)!==seconds||!Array.isArray(part.items)||!part.items.length||part.reporting==='done')return null
 // Full historical item snapshot, including load, side, order and instructions.
 if(part.items.some(item=>!item.is_rest&&(!item.exercise_id||!item.levels?.[level])))return null
 return JSON.stringify(canonical({wodId,format,level,seconds,items:part.items}))
}
export function findRoundGhost(logs,signature){
 if(!signature)return null
 for(const log of logs||[]){
  const d=log.result_data||{}
  if(d.ghost_signature!==signature||d.manual_entry||!isIndividualPerformance(log)||d.completed!==true||!Array.isArray(d.split_seconds))continue
  const splits=d.split_seconds
  if(!splits.length||!Number.isSafeInteger(log.score_rounds)||log.score_rounds!==splits.length||splits.some(v=>typeof v!=='number'||!Number.isFinite(v)||v<=0))continue
  const total=splits.reduce((a,b)=>a+b,0)
  const duration=Number(d.elapsed_seconds)
  const planned=JSON.parse(signature).seconds
  if(!Number.isFinite(duration)||duration<planned||duration>planned+1||total>duration)continue
  return {id:log.id,date:log.workout_date,splits}
 }
 return null
}
export function ghostPace(ghost,laps,elapsed){
 if(!ghost||!Array.isArray(laps)||!Number.isFinite(elapsed)||elapsed<0)return null
 let sum=0,ghostRounds=0
 for(const split of ghost.splits){sum+=split;if(sum<=elapsed)ghostRounds++;else break}
 const sameRound=laps.length>0&&laps.length<=ghost.splits.length
 const delta=sameRound?laps.reduce((a,b)=>a+b,0)-ghost.splits.slice(0,laps.length).reduce((a,b)=>a+b,0):null
 return {ghostRounds,ownRounds:laps.length,delta}
}

// Compare logged weights only: never assume the prescription was actually used,
// and never equate identical weights with identical effort or training dose.
export function ghostRecordedLoads(data,signature=data?.ghost_signature){
 if(!signature||data?.ghost_signature!==signature||data.manual_entry||!isIndividualPerformance({result_data:data}))return null
 let planned
 try{planned=JSON.parse(signature).items.filter(x=>!x.is_rest)}catch{return null}
 const actual=data.exercise_results
 if(!planned.length||!Array.isArray(actual)||actual.length!==planned.length)return null
 const name=x=>String(x||'').trim().toLowerCase().replace(/\s+/g,' ')
 const rows=[]
 for(let i=0;i<planned.length;i++){
  const p=planned[i],a=actual[i]
  if(!a||name(p.exercise_name||p.name)!==name(a.exercise_name)||a.is_complex||!Array.isArray(a.sets)||!a.sets.length)return null
  const performed=a.sets.filter(s=>isUsablePerformedSet(s)&&[s.reps,s.time_seconds].some(v=>Number.isFinite(Number(v))&&Number(v)>0))
  if(!performed.length||performed.some(s=>s.load_kg==null||String(s.load_kg).trim()===''||!Number.isFinite(Number(s.load_kg))||Number(s.load_kg)<0))return null
  rows.push({name:a.exercise_name,kg:[...new Set(performed.map(s=>Number(s.load_kg)))].sort((x,y)=>x-y)})
 }
 return rows
}
export function compareGhostRecordedLoads(first,second){
 if(!first?.ghost_signature||first.ghost_signature!==second?.ghost_signature)return {status:'different-plan',rows:[]}
 const a=ghostRecordedLoads(first),b=ghostRecordedLoads(second)
 if(!a||!b)return {status:'unknown',rows:[]}
 const rows=a.map((row,i)=>({name:row.name,first:row.kg,second:b[i].kg,same:JSON.stringify(row.kg)===JSON.stringify(b[i].kg)}))
 return {status:rows.every(r=>r.same)?'same-recorded-weights':'changed-recorded-weights',rows}
}
