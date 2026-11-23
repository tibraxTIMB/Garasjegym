import {sortWodItems,getWodSchemaItems} from './wodOrdering.js'
import {isEmomFormat,emomPrescribedSetCount} from './wodEngine.js'
import {plannedFixedEmomSets} from './compositeWod.js'

const sameMovement=(a,b)=>String(a||'').trim().toLocaleLowerCase('nn-NO')===String(b||'').trim().toLocaleLowerCase('nn-NO')
/** Proposed historical EMOM sets; NEVER update a training log without athlete approval. */
export function suggestedEmomSets(workout,schema,exercise,index){
 if(!schema)return null
 const items=sortWodItems(getWodSchemaItems(schema))
 const item=sameMovement(items[index]?.exercise_name,exercise.exercise_name)?items[index]:items.find(x=>sameMovement(x.exercise_name,exercise.exercise_name))
 if(!item)return null
 const level=workout.result_data?.prescription_level||schema.prescription||'rx'
 const prescribed=Number(item.levels?.[level]?.reps??item.reps)
 if(!Number.isInteger(prescribed)||prescribed<=0||item.is_rest||item.reps_mode==='amrap')return null
 if(workout.format==='Samansett økt'){
   const part=(schema.composite_blocks||[]).find(b=>b.id===item.block_id)
   if(!part||!(workout.result_data?.block_summary||[]).some(s=>s.id===part.id&&s.completed===true))return null
   const plan=plannedFixedEmomSets(item,schema.composite_blocks,level,false)
   return plan.autoFill?{count:plan.sets.length,reps:prescribed}:null
 }
 if(!isEmomFormat(workout.format)||workout.result_data?.completed===false)return null
 const count=emomPrescribedSetCount({format:workout.format,interval:schema.interval,durationSeconds:schema.duration_seconds,minuteSlot:item.minute_slot,exerciseIndex:items.indexOf(item),exerciseCount:items.length})
 return count>0?{count,reps:prescribed}:null
}
