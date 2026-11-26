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
  if(d.ghost_signature!==signature||d.manual_entry||d.flow_completion_only||d.samspel?.team_score||d.wod_engine?.participation&&d.wod_engine.participation!=='individual'||d.completed!==true||!Array.isArray(d.split_seconds))continue
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
