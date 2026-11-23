import { isErgExercise } from './exerciseMeasurements.js'

const positive = value => {
  if (value === '' || value == null) return 0
  const number = Number(String(value).replace(',', '.'))
  return Number.isFinite(number) && number > 0 ? number : 0
}

const SIDE_LABELS = {right:'Høgre',left:'Venstre',both:'Per side',alternating:'Vekslande'}

export function exerciseRecordType(name, sets = [], result = {}) {
  const text = String(name || '').toLowerCase()
  if (/box\s*(jump|step|over)|burpee\s*box/.test(text)) return 'height'
  if (/plank|hold|(?:^|\s)(?:dead|active|flexed.arm) hang\b|wall sit|l.?sit/.test(text)) return 'hold'
  if (isErgExercise({name}) || /rowerg|ski.?erg|assault bike|bikeerg|romaskin|løping|running|run\b|sykkel|swim|svømm|\bcrawl\b/.test(text)) return 'endurance'
  if (sets.some(set => positive(set.load_kg))) return 'load'
  if (/^trx\b/.test(text)) return 'reps'
  if (/kettlebell|dumbbell|manual|barbell|markløft|deadlift|squat|snatch|clean|jerk|press|curl|thruster|carry|swing|lunges?/.test(text)) return 'load'
  if (positive(result.meters) || ['m','km','cal'].includes(result.row_unit)) return 'endurance'
  if (sets.some(set => positive(set.height_cm))) return 'height'
  if (sets.some(set => positive(set.time_seconds))) return 'hold'
  return 'reps'
}

const record = (key, label, unit, value, date, title, logId, detail = '') => ({key,label,unit,value,date,title,logId,detail})
const bestBy = (candidates, key, direction = 'max') => {
  const eligible = candidates.filter(item => item.key === key && positive(item.value))
  return eligible.sort((a,b)=>direction==='min' ? a.value-b.value : b.value-a.value)[0] || null
}

/** Calculates measurable PRs from saved training results; never guesses missing reps or standards. */
export function deriveExerciseRecords(logs = []) {
  const exercises = new Map()
  for (const log of logs) {
    const rows = [...(log.workout_exercises || [])].sort((a,b)=>(a.sort_order||0)-(b.sort_order||0))
    for (const [index, exercise] of rows.entries()) {
      const result = log.result_data?.exercise_results?.[index] || {}
      const name = String(exercise.exercise_name || result.exercise_name || '').trim()
      if (!name) continue
      const side = result.side_mode || ''
      const key = `${exercise.exercise_id || name.toLowerCase()}|${side}`
      const sets = (exercise.workout_sets?.length ? exercise.workout_sets : result.sets) || []
      const type = exerciseRecordType(name, sets, result)
      if (!exercises.has(key)) exercises.set(key,{key,name,side,type,performances:[]})
      const distance = result.row_unit === 'km' ? positive(result.row_value)*1000 : result.row_unit === 'm' ? positive(result.row_value) : positive(result.meters)
      const calories = result.row_unit === 'cal' ? positive(result.row_value) : positive(result.calories)
      const seconds = result.row_unit === 'min' ? positive(result.row_value)*60 : result.row_unit === 's' ? positive(result.row_value) : positive(result.work_seconds)
      exercises.get(key).performances.push({
        sets, distance, calories, seconds, date:log.workout_date || String(log.created_at || '').slice(0,10),
        title:log.title || 'Treningsøkt', logId:log.id,
      })
    }
  }
  return [...exercises.values()].map(exercise => {
    const {type,performances} = exercise
    const candidates = []
    const maxLoad = Math.max(0,...performances.flatMap(p=>p.sets.filter(set=>positive(set.reps)).map(set=>positive(set.load_kg))))
    const highestBox = Math.max(0,...performances.flatMap(p=>p.sets.filter(set=>positive(set.reps)).map(set=>positive(set.height_cm))))
    const threshold = maxLoad * 0.8
    for (const p of performances) {
      const {date,title,logId,sets} = p
      const withReps = sets.filter(set=>positive(set.reps))
      const loads = withReps.filter(set=>positive(set.load_kg))
      if(type==='load' && loads.length) {
        candidates.push(record('load','Høgaste vekt','kg',Math.max(...loads.map(set=>positive(set.load_kg))),date,title,logId,'Minst 1 registrert repetisjon'))
        const heavySets = loads.filter(set=>positive(set.load_kg)>=threshold)
        if(heavySets.length) candidates.push(record('heavy_sets','Flest tunge sett','sett',heavySets.length,date,title,logId,`Minst 80 % av toppvekta (${Number(threshold.toFixed(1))} kg) · minst 1 rep per sett`))
        const totalVolume = loads.reduce((sum,set)=>sum+positive(set.load_kg)*positive(set.reps),0)
        candidates.push(record('volume','Størst øktvolum','kg·reps',Number(totalVolume.toFixed(1)),date,title,logId,'Summen av kg × reps for registrerte sett'))
      }
      if(type==='height') {
        const valid = withReps.filter(set=>positive(set.height_cm))
        if(valid.length) {
          const maxHeight = Math.max(...valid.map(set=>positive(set.height_cm)))
          candidates.push(record('height','Høgaste boks','cm',maxHeight,date,title,logId,'Minst 1 registrert repetisjon'))
          candidates.push(record('height_reps','Flest reps på høgaste boks','reps',valid.filter(set=>positive(set.height_cm)===highestBox).reduce((sum,set)=>sum+positive(set.reps),0),date,title,logId,`På ${highestBox} cm`))
        }
      }
      if(type==='reps') {
        if(withReps.length) {
          candidates.push(record('reps','Flest reps i eitt sett','reps',Math.max(...withReps.map(set=>positive(set.reps))),date,title,logId))
          candidates.push(record('total_reps','Flest reps i ei økt','reps',withReps.reduce((sum,set)=>sum+positive(set.reps),0),date,title,logId))
        }
      }
      if(type==='hold') {
        const durations = [...sets.map(set=>positive(set.time_seconds)),p.seconds].filter(Boolean)
        if(durations.length) candidates.push(record('hold','Lengste hald','sek',Math.max(...durations),date,title,logId))
      }
      if(type==='endurance') {
        if(p.distance) candidates.push(record('distance','Lengste distanse','m',p.distance,date,title,logId))
        if(p.calories) candidates.push(record('calories','Flest kaloriar','cal',p.calories,date,title,logId))
      }
    }
    const keys={load:['load','heavy_sets','volume'],height:['height','height_reps'],reps:['reps','total_reps'],hold:['hold'],endurance:['distance','calories']}[type] || []
    return {...exercise,label:exercise.name+(SIDE_LABELS[exercise.side]?` · ${SIDE_LABELS[exercise.side]}`:''),records:keys.map(key=>bestBy(candidates,key)).filter(Boolean),sessions:performances.length}
  }).sort((a,b)=>a.name.localeCompare(b.name,'nn'))
}

export function deriveBenchmarkRecords(logs = []) {
 const groups=new Map()
 function addScore({log,level,format,key,name,score}) {
  if(!score)return
  if(!groups.has(key))groups.set(key,{key,name,level,format,score:null,date:'',logId:null,count:0})
  const group=groups.get(key)
  group.count++
  const better=!group.score || (score.rounds!=null
   ? score.rounds>group.score.rounds || (score.rounds===group.score.rounds&&score.reps>group.score.reps)
   : score.value<group.score.value)
  if(better){group.score=score;group.date=log.workout_date;group.logId=log.id}
 }
 for(const log of logs){
  if(!log.source_wod_id)continue
  const level=String(log.result_data?.prescription_level||'rx').toLowerCase()
  const composite=log.result_data?.block_summary
  if(Array.isArray(composite)&&composite.length&&String(log.format)==='Samansett økt'){
   for(const [index,part] of composite.entries()){
    if(part.completed!==true)continue
    const format=String(part.format||'')
    const key=`${log.source_wod_id}|${part.id||index}|${level}|${format.toLowerCase()}`
    const name=(log.result_data?.wod_names?.[0]||log.title||'Samansett WOD')+' · '+(part.title||'Del '+(index+1))
    let score=null
    if(format==='AMRAP'||(['Couplet','Triplet'].includes(format)&&part.combination_mode==='AMRAP')){
     const rounds=Number(part.roundsCompleted),reps=Number(part.extra_reps||0)
     if(Number.isInteger(rounds)&&rounds>=0&&Number.isInteger(reps)&&reps>=0)
      score={rounds,reps,unit:'rundar + reps'}
    } else if(['For Time','Chipper','Couplet','Triplet','Ladder','Death By'].includes(format)){
     if(!part.time_cap_reached&&positive(part.elapsed))
      score={value:positive(part.elapsed),unit:'sek',direction:'min'}
    }
    addScore({log,level,format:format.toLowerCase(),key,name,score})
   }
   continue
  }
  // Existing single-format WODs keep their original benchmark history.
  const format=String(log.format||'').toLowerCase()
  const key=`${log.source_wod_id}|${level}|${format}`
  let score=null
  if(format.includes('amrap')){
   if(log.score_rounds==null)continue
   score={rounds:Number(log.score_rounds)||0,reps:Number(log.score_reps)||0,unit:'rundar + reps'}
  } else if(['for time','chipper'].includes(format)){
   if(!positive(log.score_time_seconds)||log.result_data?.time_cap_reached)continue
   score={value:positive(log.score_time_seconds),unit:'sek',direction:'min'}
  }
  addScore({log,level,format,key,name:log.result_data?.wod_names?.[0]||log.title||'Benchmark-WOD',score})
 }
 return [...groups.values()].sort((a,b)=>a.name.localeCompare(b.name,'nn'))
}
