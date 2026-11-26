import {makeCsv} from './werkstattExchange.js'
export const exportAllowed=p=>p?.role==='admin'&&p.active===true&&p.membership_status==='approved'
const dateOk=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s
export function validateExportRange(from,to){if(!dateOk(from)||!dateOk(to)||from>to)throw Error('Vel gyldig frå- og tildato.');return {from,to}}
async function pages(build,max=50000){
 const rows=[],ids=new Set()
 for(let i=0;;i+=200){
  const {data,error}=await build().order('id',{ascending:true}).range(i,i+199)
  if(error)throw error
  if(!Array.isArray(data)||data.length>200)throw Error('Uventa svar frå databasen.')
  for(const row of data){if(!row.id||ids.has(row.id))throw Error('Data endra under eksport. Hent på nytt.');ids.add(row.id);rows.push(row)}
  if(rows.length>max)throw Error('For stort utval. Vel eit kortare tidsrom.')
  if(data.length<200)return rows
 }
}
const batches=xs=>Array.from({length:Math.ceil(xs.length/50)},(_,i)=>xs.slice(i*50,i*50+50))
export async function ownWorkoutExport(client,profile,from,to){
 validateExportRange(from,to)
 if(!exportAllowed(profile))throw Error('Eksporten krev godkjend administrator.')
 const identity=async()=>{const {data,error}=await client.auth.getUser();if(error||data?.user?.id!==profile.id)throw Error('Innlogginga er endra.');const p=await client.from('profiles').select('id,role,active,membership_status').eq('id',profile.id).single();if(p.error||!exportAllowed(p.data)||p.data.id!==profile.id)throw Error('Tilgangen er endra.')}
 await identity()
 const logs=await pages(()=>client.from('workout_logs').select('id,title,workout_date,format,score_rounds,score_reps,score_time_seconds,score_load_kg,score_calories,score_distance,score_unit,result_data').eq('member_id',profile.id).gte('workout_date',from).lte('workout_date',to),10000)
 const exercises=[],sets=[]
 for(const ids of batches(logs.map(x=>x.id))){exercises.push(...await pages(()=>client.from('workout_exercises').select('id,workout_log_id,exercise_name,sort_order').in('workout_log_id',ids)));if(exercises.length>50000)throw Error('For stort utval av øvingar.')}
 for(const ids of batches(exercises.map(x=>x.id))){sets.push(...await pages(()=>client.from('workout_sets').select('id,workout_exercise_id,set_number,reps,load_kg,height_cm,time_seconds').in('workout_exercise_id',ids)));if(sets.length>100000)throw Error('For stort utval av sett.')}
 await identity()
 return makeWorkoutExport(logs,exercises,sets)
}
export function makeWorkoutExport(logs,exercises,sets){
 const lm=new Map(logs.map(l=>[l.id,l])),em=new Map(exercises.map(e=>[e.id,e]))
 if(exercises.some(e=>!lm.has(e.workout_log_id))||sets.some(s=>!em.has(s.workout_exercise_id)))throw Error('Ufullstendig øktkopling.')
 const setMap=new Map();for(const s of sets){const list=setMap.get(s.workout_exercise_id)||[];list.push(s);setMap.set(s.workout_exercise_id,list)}
 const lr=[...logs].sort((a,b)=>String(a.workout_date).localeCompare(String(b.workout_date))||a.id.localeCompare(b.id))
 const sr=[]
 for(const e of [...exercises].sort((a,b)=>a.workout_log_id.localeCompare(b.workout_log_id)||(a.sort_order??0)-(b.sort_order??0))){const l=lm.get(e.workout_log_id);const rows=(setMap.get(e.id)||[]).sort((a,b)=>(a.set_number??0)-(b.set_number??0));for(const s of rows.length?rows:[null])sr.push([l.id,l.workout_date,l.title,e.exercise_name,e.sort_order,s?.set_number,s?.reps,s?.load_kg,s?.height_cm,s?.time_seconds,s?'registrert sett':'ingen registrerte sett'])}
 return {logs:lr.length,exercises:exercises.length,sets:sets.length,records:{logs:lr.map(({result_data,...row})=>({...row,fit_evidence:{participation:result_data?.wod_engine?.participation||null,team:result_data?.samspel?.team_score===true,completionOnly:result_data?.flow_completion_only===true,manual:result_data?.manual_entry===true,elapsed:result_data?.manual_entry?null:result_data?.elapsed_seconds??null}})),exercises,sets},
 workouts:makeCsv(['økt_id','dato','namn','format','rundar','reps','resultattid_sekund','resultatvekt_kg','kaloriar','distanse','resultateining'],lr.map(l=>[l.id,l.workout_date,l.title,l.format,l.score_rounds,l.score_reps,l.score_time_seconds,l.score_load_kg,l.score_calories,l.score_distance,l.score_unit])),
 setRows:makeCsv(['økt_id','dato','økt','øving','øving_rekkjefølgje','sett','reps','kg','høgd_cm','tid_sekund','datastatus'],sr)}
}
