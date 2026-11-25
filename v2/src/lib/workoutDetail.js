export function normalizeWorkoutNote(value){
 return String(value||'').replace(/\\n/g,'\n').replace(/\r\n?/g,'\n')
}

export function splitWorkoutNote(value){
 const lines=normalizeWorkoutNote(value).split('\n')
 const system=[],personal=[]
 for(const line of lines){
  if(/^\s*(Timer:|Mellomtider:)/i.test(line))system.push(line.trim())
  else personal.push(line)
 }
 return {personal:personal.join('\n').trim(),system}
}

export function formatWorkoutSeconds(value){
 const seconds=Math.max(0,Math.floor(Number(value)||0))
 return String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0')
}

export function formatWorkoutSet(set){
 const parts=[]
 if(set.reps!=null)parts.push(set.reps+' reps')
 if(set.load_kg!=null)parts.push(set.load_kg+' kg')
 if(set.height_cm!=null)parts.push(set.height_cm+' cm')
 if(set.time_text)parts.push(set.time_text)
 else if(set.time_seconds!=null)parts.push(formatWorkoutSeconds(set.time_seconds))
 return parts.length?parts.join(' · '):'Ingen måleverdiar'
}

export function optionalNumber(value){
 const raw=String(value??'').trim().replace(',','.')
 if(!raw)return null
 const result=Number(raw)
 if(!Number.isFinite(result)||result<0)throw new Error('Bruk eit gyldig tal som er 0 eller høgare.')
 return result
}

/** Read-only ACTA view: prefer saved workout structure; never guess a block assignment. */
export function reportRepTotals(part,score,level){
 if(!level||!score||!Number.isInteger(score.roundsCompleted)||score.roundsCompleted<0||!Number.isInteger(score.extra_reps)||score.extra_reps<0)return null
 const items=part.items||[]
 if(!items.length||items.some(i=>i.is_rest||i.is_complex||i.side_mode||i.reps_mode==='amrap'||i.reps_mode==='max'))return null
 const counts=items.map(i=>{const d=i.levels?.[level];if(i.levels&&!d)return NaN;if(d?.durationSeconds||d?.distanceMeters||d?.calories||i.work_seconds||i.meters||i.calories)return NaN;return Number(d?.reps??i.reps)})
 if(counts.some(n=>!Number.isInteger(n)||n<=0)||score.extra_reps>=counts.reduce((a,b)=>a+b,0))return null
 let extra=score.extra_reps
 return items.map((i,index)=>{const n=counts[index],add=Math.min(extra,n);extra-=add;return {name:i.exercise_name||i.name,reps:score.roundsCompleted*n+add}})
}
export function buildWorkoutReport(workout,partsFromSnapshot=[]){
 const data=workout.result_data||{},summary=Array.isArray(data.block_summary)?data.block_summary:[],primary=Array.isArray(data.block_primary_results)?data.block_primary_results:[],flow=Array.isArray(data.flow_completion)?data.flow_completion:[],complex=Array.isArray(data.complex_results)?data.complex_results:[],snap=Array.isArray(data.exercise_results)?data.exercise_results:[],exercises=workout.exercises||[]
 const parts=partsFromSnapshot.map(p=>({...p,items:p.items||[]}))
 for(const row of [...summary,...primary,...flow]){
  const id=row.id||row.block_id
  if(id&&!parts.some(p=>p.id===id))parts.push({id,title:row.title||'Del',format:row.format||'',items:[],seconds:row.duration_seconds||0,warm:/oppvarming|warm.?up/i.test(row.title||'')})
 }
 if(!parts.length)return null
 // Only use positional snapshot mapping if the full list of names matches.
 const norm=x=>String(x||'').trim().toLowerCase()
 const aligned=snap.length===exercises.length&&snap.every((x,i)=>norm(x.exercise_name)===norm(exercises[i].exercise_name))
 const used=new Set(),usedComplex=new Set()
 const sections=parts.map((part,index)=>{
  const score=summary.find(x=>x.id===part.id)||null
  const main=primary.find(x=>x.block_id===part.id||x.id===part.id)||null
  const status=flow.find(x=>x.id===part.id)||null
  const rows=exercises.flatMap((ex,i)=>{
   const exact=aligned&&snap[i]?.block_id===part.id
   const single=parts.length===1&&(!aligned||!snap[i]?.block_id)
   if(!exact&&!single)return []
   used.add(i);return [ex]
  })
  const names=new Set([...part.items.map(i=>norm(i.exercise_name||i.name)),...rows.map(x=>norm(x.exercise_name))])
  const complexes=complex.filter((x,i)=>{const matches=x.block_id?x.block_id===part.id: names.has(norm(x.name))&&parts.filter(p=>p.items.some(y=>norm(y.exercise_name||y.name)===norm(x.name))).length===1;if(matches)usedComplex.add(i);return matches})
  return {...part,index,score,main,status,rows,complexes}
 })
 const amrap=sections.filter(p=>/amrap/i.test(p.format||'')||p.score?.combination_mode==='AMRAP')
 // Top-level score is only assigned when the original part is unambiguous.
 if(amrap.length===1&&!amrap[0].score&&workout.score_rounds!=null&&workout.score_reps!=null){
  amrap[0].score={roundsCompleted:Number(workout.score_rounds),extra_reps:Number(workout.score_reps),legacy:true}
 }
 return {sections,unassigned:exercises.filter((_,i)=>!used.has(i)),unassignedComplex:complex.filter((_,i)=>!usedComplex.has(i)),showOverall:!amrap.some(p=>p.score&&p.score.roundsCompleted!=null),level:data.prescription_level||null}
}
