import {Encoder,Decoder,Profile,Stream} from '@garmin/fitsdk'
// Explicit exact-name mappings to the pinned official profile. No substring guesses.
const key=s=>String(s??'').normalize('NFKC').trim().toLowerCase()
const known={
 'bench press':['benchPress','barbellBenchPress'],
 'bench press – manualar, flat':['benchPress','dumbbellBenchPress'],
 'incline bench press – manualar':['benchPress','inclineDumbbellBenchPress'],
 'incline bench press – stong':['benchPress','inclineBarbellBenchPress'],
 'back squat':['squat','barbellBackSquat'],'front squat':['squat','barbellFrontSquat'],
 'air squat':['squat','airSquat'],'goblet squat':['squat','gobletSquat'],'overhead squat':['squat','overheadSquat'],
 'dumbbell front squat':['squat','dumbbellFrontSquat'],'dumbbell step-up':['squat','dumbbellStepUp'],
 'deadlift':['deadlift','barbellDeadlift'],'romanian deadlift':['deadlift','romanianDeadlift'],
 'kettlebell deadlift':['deadlift','kettlebellDeadlift'],'sumo deadlift':['deadlift','sumoDeadlift'],
 'sumo deadlift high pull':['deadlift','sumoDeadliftHighPull'],
 'power clean':['olympicLift','barbellPowerClean'],'hang power clean':['olympicLift','barbellHangPowerClean'],
 'hang squat clean':['olympicLift','barbellHangSquatClean'],'squat clean':['olympicLift','barbellSquatClean'],
 'clean':['olympicLift','clean'],'power snatch':['olympicLift','barbellPowerSnatch'],
 'snatch':['olympicLift','snatch'],'hang power snatch':['olympicLift','barbellHangPowerSnatch'],
 'clean and jerk':['olympicLift','cleanAndJerk'],'push jerk':['olympicLift','pushJerk'],
 'kettlebell snatch':['olympicLift','singleArmKettlebellSnatch'],
 'strict press':['shoulderPress','strictPress'],'dumbbell push press':['shoulderPress','dumbbellPushPress'],
 'dumbbell shoulder press':['shoulderPress','dumbbellShoulderPress'],
 'barbell row':['row','barbellRow'],'chest-supported dumbbell row':['row','chestSupportedDumbbellRow'],
 'ring row':['row','ringRow'],'trx row':['row','trxInvertedRow'],
 'pull-up':['pullUp','pullUp'],'push-up':['pushUp','pushUp'],'handstand push-up':['pushUp','handstandPushUp'],
 'walking lunge':['lunge','walkingLunge'],'dumbbell reverse lunge':['lunge','dumbbellReverseLunge'],
 'sit-up':['sitUp','sitUp'],'burpee':['totalBody','burpee'],'burpees over barbell':['totalBody','totalBodyBurpeeOverBar']
}
const enumValue=(type,name)=>Object.entries(Profile.types[type]||{}).find(([,v])=>v===name)?.[0]
export function fitExerciseOptions(){
 return Object.values(Profile.types.exerciseCategory||{}).filter(c=>c!=='unknown'&&Profile.types[c+'ExerciseName']).map(c=>({category:c,exercises:Object.values(Profile.types[c+'ExerciseName']).filter(n=>typeof n==='string')}))
}
export function fitMapping(name,override){
 const pair=override||known[key(name)];if(!Array.isArray(pair)||pair.length!==2)return null
 const [category,subtype]=pair,a=enumValue('exerciseCategory',category),b=enumValue(category+'ExerciseName',subtype)
 if(a==null||b==null||category==='unknown')return null
 return {category,subtype,categoryCode:Number(a),subtypeCode:Number(b)}
}
const numeric=x=>x==null||x===''?null:Number(x)
export function fitPreview(records,id,mappings={}){
 const log=records?.logs?.find(l=>l.id===id);if(!log)throw Error('Vel ei eiga økt.')
 const ev=log.fit_evidence||{}
 if(ev.team||ev.participation&&ev.participation!=='individual')throw Error('Lagresultat kan ikkje eksporterast som personleg styrkeaktivitet.')
 if(ev.completionOnly)throw Error('Økta er berre markert som utført.')
 const exercises=records.exercises.filter(e=>e.workout_log_id===id).sort((a,b)=>(a.sort_order??0)-(b.sort_order??0)),byExercise=new Map(exercises.map(e=>[e.id,e]))
 const ordered=records.sets.filter(s=>byExercise.has(s.workout_exercise_id)).sort((a,b)=>exercises.indexOf(byExercise.get(a.workout_exercise_id))-exercises.indexOf(byExercise.get(b.workout_exercise_id))||(a.set_number??0)-(b.set_number??0))
 const rows=ordered.map(s=>{const ex=byExercise.get(s.workout_exercise_id),mapping=fitMapping(ex.exercise_name,mappings[ex.exercise_name]);const reps=numeric(s.reps),kg=numeric(s.load_kg);let problem=''
  if(!Number.isInteger(reps)||reps<=0||reps>65534)problem='Ingen gyldige registrerte repetisjonar'
  else if(kg!=null&&(!Number.isFinite(kg)||kg<0||kg>4095.875||Math.abs(kg*16-Math.round(kg*16))>1e-6))problem='Vekta kan ikkje representerast nøyaktig i FIT (1/16 kg)'
  else if(!mapping)problem='Vel ein nøyaktig Garmin-øving'
  return {id:s.id,exercise:ex.exercise_name,number:s.set_number,reps,kg,mapping,problem}
 })
 return {log,rows,knownIndividual:ev.participation==='individual'||ev.manual===true,elapsed:Number(ev.elapsed)>0?Number(ev.elapsed):null}
}
export function encodeStrengthFit(preview,{startIso,elapsed,timer,individualConfirmed,confirmed,skipInvalid=false,timings={}}){
 if(!confirmed||!individualConfirmed)throw Error('Stadfest eiga økt og tidsdata.')
 if(!preview?.log||preview.log.fit_evidence?.team||preview.log.fit_evidence?.completionOnly)throw Error('Ikkje ein individuell målt aktivitet.')
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})$/.test(startIso))throw Error('Start må ha dato, klokkeslett og tidssone.')
 const start=new Date(startIso),duration=Number(elapsed),active=Number(timer)
 if(!Number.isFinite(start.getTime())||!Number.isInteger(duration)||duration<=0||duration>86400||!Number.isInteger(active)||active<=0||active>duration)throw Error('Kontroller start og faktisk medgått/aktiv tid i sekund.')
 const end=new Date(start.getTime()+duration*1000)
 if(end.getTime()>Date.now()+60000)throw Error('Aktiviteten kan ikkje liggja i framtida.')
 const errors=preview.rows.filter(r=>r.problem)
 if(errors.length&&!skipInvalid)throw Error('Kontroller alle sett eller stadfest eksplisitt at avvik skal utelatast.')
 const rows=preview.rows.filter(r=>!r.problem)
 if(!rows.length||rows.length>65534)throw Error('Ingen gyldige sett å eksportera.')
 // Optional exact set timestamps. Missing set timing is omitted, not invented.
 const e=new Encoder(),M=Profile.MesgNum
 e.onMesg(M.FILE_ID,{type:'activity',manufacturer:'development',product:1,timeCreated:start})
 e.onMesg(M.DEVICE_INFO,{timestamp:start,deviceIndex:0,manufacturer:'development',product:1,productName:'GarasjeGym 49'})
 e.onMesg(M.EVENT,{timestamp:start,event:'timer',eventType:'start'})
 e.onMesg(M.RECORD,{timestamp:start})
 let previousEnd=0
 for(const [i,r] of rows.entries()){
  const set={messageIndex:i,setType:'active',repetitions:r.reps,category:[r.mapping.categoryCode],categorySubtype:[r.mapping.subtypeCode],...(r.kg==null?{}:{weight:r.kg,weightDisplayUnit:'kilogram'})}
  const t=timings[r.id]
  if(t&&(t.offset!==''||t.duration!=='')){
   if(t.offset===''||t.duration==='')throw Error('Settid krev både startoffset og varigheit.')
   const offset=Number(t.offset),seconds=Number(t.duration)
   if(!Number.isInteger(offset)||!Number.isInteger(seconds)||offset<previousEnd||seconds<=0||offset+seconds>duration)throw Error('Settidene må liggja i rekkjefølgje innan økta.')
   previousEnd=offset+seconds;set.startTime=new Date(start.getTime()+offset*1000);set.timestamp=new Date(start.getTime()+previousEnd*1000);set.duration=seconds
  }
  e.onMesg(M.SET,set)
 }
 e.onMesg(M.RECORD,{timestamp:end})
 e.onMesg(M.EVENT,{timestamp:end,event:'timer',eventType:'stopAll'})
 e.onMesg(M.LAP,{messageIndex:0,timestamp:end,startTime:start,totalElapsedTime:duration,totalTimerTime:active,event:'lap',eventType:'stop',sport:'training',subSport:'strengthTraining'})
 e.onMesg(M.SESSION,{messageIndex:0,timestamp:end,startTime:start,totalElapsedTime:duration,totalTimerTime:active,sport:'training',subSport:'strengthTraining',event:'session',eventType:'stop',firstLapIndex:0,numLaps:1})
 e.onMesg(M.ACTIVITY,{timestamp:end,totalTimerTime:active,numSessions:1,type:'manual',event:'activity',eventType:'stop'})
 const bytes=e.close(),d=new Decoder(Stream.fromByteArray(Array.from(bytes)))
 if(!d.checkIntegrity())throw Error('FIT-integritetskontroll feila.')
 const decoded=d.read({convertTypesToStrings:false})
 if(decoded.errors.length||decoded.messages.setMesgs?.length!==rows.length)throw Error('FIT-kontroll av sett feila.')
 for(const [i,set] of decoded.messages.setMesgs.entries()){
  const r=rows[i]
  if(set.repetitions!==r.reps||set.category?.[0]!==r.mapping.categoryCode||set.categorySubtype?.[0]!==r.mapping.subtypeCode||r.kg!=null&&set.weight!==r.kg)throw Error('FIT endra ei måling eller øvingskode.')
 }
 return bytes
}
