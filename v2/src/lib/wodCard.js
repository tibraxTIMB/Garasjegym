import {muscleProfile,MUSCLE_LABELS} from './muscleProfile.js'
import {exerciseMuscleProfile} from './exerciseMuscleProfiles.js'
export function formatCardTime(value){const n=Math.max(0,Math.round(Number(value)||0));return Math.floor(n/60)+':'+String(n%60).padStart(2,'0')}
export function cardParts(wod){
 const schema=wod?.timer_settings?.workout_schema||{},all=Array.isArray(schema.items)&&schema.items.length?schema.items:String(wod?.movements||'').split('\n').filter(Boolean).map(name=>({exercise_name:name}))
 const engine=schema.wod_engine?.blocks,legacy=schema.composite_blocks
 const blocks=Array.isArray(engine)&&engine.length>1?engine:Array.isArray(legacy)&&legacy.length?legacy:null
 const make=(b,i)=>{const title=String(b.title||'Del '+(i+1)).replace(/^Del\s+[A-H]\s*[–—:-]\s*/i,'');const warm=/oppvarming|warm.?up/i.test(title);const intervalSeconds=Number(b.emomIntervalSeconds??b.interval?.intervalSeconds??b.interval?.work_every_seconds)||0;const format=b.format||wod.format;return {id:b.id||String(i),title,format,formatLabel:warm?'Oppvarming':intervalSeconds&&/emom|e\d/i.test(format)?'E'+(intervalSeconds/60)+'MOM':format,intervalSeconds,seconds:Number(b.duration_seconds)||Math.round(Number(b.minutes||0)*60),items:Array.isArray(b.items)&&b.items.length?b.items:all.filter(x=>(x.block_id||x.blockId)===b.id),warm}}
 if(blocks)return blocks.map(make)
 return [{id:'main',title:wod?.format||'Økt',format:wod?.format,formatLabel:wod?.format,intervalSeconds:Number(schema.interval?.work_every_seconds)||0,seconds:Number(schema.duration_seconds||wod?.timer_settings?.duration_seconds)||Number(wod?.duration_minutes||0)*60,items:all,warm:schema.library_category==='warmup'}]
}
export function cardTone(p){if(p.warm)return 'warmup';const f=String(p.format||'').toLowerCase();if(/amrap/.test(f))return 'amrap';if(/emom|^e\d/.test(f))return 'emom';if(/strength|complex|superset|styrke/.test(f))return 'strength';if(/intervall|interval|tabata|stasjon/.test(f))return 'interval';if(/for time|chipper|couplet|triplet|ladder|death by/.test(f))return 'time';return 'neutral'}
export function cardDose(item,level='rx',compact=false){
 if(item.is_rest)return formatCardTime(item.rest_duration_seconds||item.work_seconds)
 const d=item.levels?.[level];if(item.levels&&!d)return 'Ikkje dosert på dette nivået'
 const p=[],v=d||{};const steps=item.complex_steps||[]
 if(item.is_complex&&steps.length){p.push(steps.map(s=>(s.reps||1)+' × '+(s.name||s.exercise_name)).join(' + '));if(Number(v.reps||item.reps)>1)p.push((v.reps||item.reps)+' syklusar')}
 else if(v.reps||item.reps)p.push((v.reps||item.reps)+' reps')
 if(v.sets)p.push(v.sets+' sett')
 if(v.durationSeconds||item.work_seconds)p.push(formatCardTime(v.durationSeconds||item.work_seconds))
 if(v.distanceMeters||item.meters)p.push((v.distanceMeters||item.meters)+' m')
 if(v.calories||item.calories)p.push((v.calories||item.calories)+' cal')
 if(v.heightCm)p.push(v.heightCm+' cm')
 const val=x=>x!=null&&String(x).trim()!==''&&Number.isFinite(Number(x))
 if(v.loadMode==='kg'){const kg=[val(v.loadKgMen)?'M '+v.loadKgMen+' kg':'',val(v.loadKgWomen)?'K '+v.loadKgWomen+' kg':''].filter(Boolean);if(kg.length)p.push((item.load_per_implement?'2 × (':'')+kg.join(' / ')+(item.load_per_implement?') per manual':''));
 else if(val(v.loadKg))p.push(v.loadKg+' kg')}
 else if(v.loadMode==='percent'&&val(v.percent1rm))p.push(v.percent1rm+' % 1RM')
 else if(v.loadMode==='rir'&&(v.rirRange||val(v.rir)))p.push('RIR '+(v.rirRange||v.rir))
 else if(!d&&val(item.load_kg))p.push(item.load_kg+' kg')
 if(item.percent_1rm_min&&item.percent_1rm_max)p.push(item.percent_1rm_min+'–'+item.percent_1rm_max+' % 1RM '+(item.reference_rm||''))
 if(!compact){if(v.instruction)p.push(v.instruction);if(item.coach_note&&item.coach_note!==v.instruction)p.push(item.coach_note)}else if(!p.length&&v.instruction)p.push(v.instruction)
 return p.filter(Boolean).join(' · ')||'Dosering ikkje oppgitt'
}
// Count distinct sessions, not pseudo physiological workload points.
export function loggedMuscleExposure(logs,days=7,now=new Date()){
 const start=new Date(now);start.setDate(start.getDate()-(days-1));const iso=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')
 const zero=()=>Object.fromEntries(Object.keys(MUSCLE_LABELS).map(k=>[k,0]))
 const counts=zero(),secondaryCounts=zero(),stabilizerCounts=zero(),byMode={};let sessions=0,known=0,total=0,loggedSessions=0,skipped=0;const items=[]
 const seen=new Set()
 for(const log of logs||[]){if(!log.workout_date||log.workout_date<iso(start)||log.workout_date>iso(now)||log.id&&seen.has(log.id))continue;if(log.id)seen.add(log.id);loggedSessions++;const results=log.result_data?.exercise_results;if(!Array.isArray(results)){skipped++;continue}let counted=false;const primary=new Set(),secondary=new Set(),stabilizers=new Set(),modes={};for(const e of results){
  // Row-level meters and calories may represent prescriptions rather than outcomes.
  const performed=(e.sets||[]).some(s=>!['failed','partial'].includes(s.complex_status)&&[s.reps,s.time_seconds].some(v=>Number(v)>0));if(!performed)continue
  const p=muscleProfile([e]);total+=p.total;known+=p.known;if(!p.known||p.known===p.mobility)continue;counted=true;items.push(e);p.primary.forEach(k=>primary.add(k));p.secondary.forEach(k=>secondary.add(k));p.stabilizers.forEach(k=>stabilizers.add(k));
  for(const step of e.complex_steps?.length?e.complex_steps:[e]){const ep=exerciseMuscleProfile(step.name||step.exercise_name);if(!ep||ep.mode==='mobility')continue;const group=modes[ep.mode]||=new Set();ep.primary.forEach(k=>group.add(k))}
 }if(counted){sessions++;primary.forEach(k=>counts[k]++);secondary.forEach(k=>{if(!primary.has(k))secondaryCounts[k]++});stabilizers.forEach(k=>{if(!primary.has(k)&&!secondary.has(k))stabilizerCounts[k]++});for(const [mode,groups] of Object.entries(modes)){const acc=byMode[mode]||=zero();groups.forEach(k=>acc[k]++)}}else skipped++}
 return {counts,secondaryCounts,stabilizerCounts,byMode,items,sessions,known,total,loggedSessions,skipped}
}
