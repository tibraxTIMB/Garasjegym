import {writeFileSync} from 'node:fs'
import {workoutXlsx} from '../src/lib/exportwerkXlsx.js'
import {makeWorkoutExport} from '../src/lib/exportwerk.js'
const d=makeWorkoutExport([{id:'w',title:'=1+1',workout_date:'2026-11-26',format:'Strength'}],[{id:'e',workout_log_id:'w',exercise_name:'Air squat'},{id:'f',workout_log_id:'w',exercise_name:'Row'}],[{id:'s',workout_exercise_id:'e',set_number:1,reps:5,load_kg:20},{id:'t',workout_exercise_id:'e',set_number:2,reps:0,load_kg:null}])
writeFileSync('/tmp/exportwerk.xlsx',workoutXlsx(d,'2026-11-01','2026-11-26'))
