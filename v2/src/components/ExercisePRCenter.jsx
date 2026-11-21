import {useMemo,useState} from 'react'
import {Activity,ArrowRight,Dumbbell,Search,Trophy} from 'lucide-react'
import {deriveBenchmarkRecords,deriveExerciseRecords} from '../lib/prMetrics.js'
import './exercise-pr-center.css'

const dateLabel = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString('nn-NO',{day:'numeric',month:'short',year:'numeric'}) : 'Ukjend dato'
const timeLabel = seconds => `${String(Math.floor(seconds / 60)).padStart(2,'0')}:${String(Math.round(seconds % 60)).padStart(2,'0')}`
const RECORD_CATEGORIES=[{key:'all',label:'Alle'},{key:'load',label:'Løft og vekt'},{key:'reps',label:'Kroppsvekt / reps'},{key:'hold',label:'Statiske hald'},{key:'height',label:'Boks / høgd'},{key:'endurance',label:'Kondisjon'}]

export default function ExercisePRCenter({history=[],legacyRecords=[],onOpenWorkout}){
 const exercises=useMemo(()=>deriveExerciseRecords(history),[history])
 const benchmarks=useMemo(()=>deriveBenchmarkRecords(history),[history])
 const [category,setCategory]=useState('exercise')
 const [recordCategory,setRecordCategory]=useState('all')
 const [search,setSearch]=useState('')
 const [selectedKey,setSelectedKey]=useState('')
 const visibleExercises=useMemo(()=>exercises.filter(exercise=>(recordCategory==='all'||exercise.type===recordCategory)&&exercise.label.toLocaleLowerCase('nn').includes(search.trim().toLocaleLowerCase('nn'))),[exercises,recordCategory,search])
 const current=visibleExercises.find(exercise=>exercise.key===selectedKey)||visibleExercises[0]
 const openSource=id=>{const log=history.find(row=>row.id===id);if(log)onOpenWorkout?.(log)}
 return <section className="exercise-pr-center">
  <header className="exercise-pr-intro"><span className="section-kicker">PERSONLEGE REKORDAR</span><h3><Trophy size={23}/> Mine PR-ar</h3><p>Rekordane blir rekna frå øvingar, sett og resultat i treningsloggen. Du treng ikkje fylle ut eit eige PR-skjema.</p></header>
  <div className="exercise-pr-tabs" role="group" aria-label="Vel rekordtype"><button type="button" className={category==='exercise'?'active':''} onClick={()=>setCategory('exercise')}><Dumbbell size={17}/> Øvingar <span>{exercises.length}</span></button><button type="button" className={category==='benchmark'?'active':''} onClick={()=>setCategory('benchmark')}><Trophy size={17}/> Benchmark-WOD <span>{benchmarks.length}</span></button></div>
  {category==='exercise'&&<div className="exercise-pr-filters" aria-label="Filtrer PR-øvingar"><div className="exercise-pr-category-scroll" role="group" aria-label="Øvingskategori">{RECORD_CATEGORIES.map(option=><button key={option.key} type="button" aria-pressed={recordCategory===option.key} className={recordCategory===option.key?'active':''} onClick={()=>setRecordCategory(option.key)}>{option.label} <span>{option.key==='all'?exercises.length:exercises.filter(exercise=>exercise.type===option.key).length}</span></button>)}</div><label className="exercise-pr-search"><Search size={16}/><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Søk etter øving …" aria-label="Søk etter PR-øving"/></label></div>}
  {category==='exercise'&&(current?<>
   <label className="exercise-pr-select">Vel øving<select value={current.key} onChange={event=>setSelectedKey(event.target.value)}>{visibleExercises.map(exercise=><option key={exercise.key} value={exercise.key}>{exercise.label}</option>)}</select></label>
   <div className="exercise-pr-summary"><strong>{current.label}</strong><span>{current.sessions} registrerte økter</span></div>
   {current.records.length?<div className="exercise-pr-grid">{current.records.map(item=><article className="exercise-pr-record" key={item.key}><small>{item.label}</small><strong>{item.value.toLocaleString('nn-NO')} <span>{item.unit}</span></strong><p>{item.detail||'Beste dokumenterte resultat'}</p><footer><span>{dateLabel(item.date)}</span><button type="button" onClick={()=>openSource(item.logId)}>Sjå økta <ArrowRight size={14}/></button></footer></article>)}</div>:<div className="empty-state">Det er ikkje registrert målbare resultat for denne øvinga enno. Loggfør sett, reps, belastning eller tid i ei ny økt.</div>}
   <p className="exercise-pr-explainer"><Activity size={14}/> For vektøvingar tel tunge sett når belastninga er minst 80 % av høgaste registrerte vekt. For andre øvingar blir måla tilpassa: reps, høgd, tid eller distanse.</p>
  </>:<div className="empty-state">{exercises.length?'Ingen PR-øvingar passar dette filteret. Vel ein annan kategori eller fjern søket.':'Ingen øvingsresultat enno. Start ei fri økt, vel øvingar og lagre resultat for å få dei første PR-ane.'}</div>)}
  {category==='benchmark'&&(benchmarks.length?<div className="exercise-pr-benchmarks">{benchmarks.map(wod=><article className="exercise-pr-benchmark" key={wod.key}><div><strong>{wod.name}</strong><small>{wod.format.toUpperCase()} · {wod.level.toUpperCase()} · {wod.count} gjennomføringar</small></div><span>{wod.score.rounds!=null?`${wod.score.rounds} rundar + ${wod.score.reps} reps`:timeLabel(wod.score.value)}</span><footer><small>{dateLabel(wod.date)}</small><button type="button" onClick={()=>openSource(wod.logId)}>Opne beste økt <ArrowRight size={14}/></button></footer></article>)}</div>:<div className="empty-state">Ingen benchmark-WOD-ar med samanliknbare resultat enno. Fullfør ein AMRAP eller For Time-WOD og lagre resultatet.</div>)}
  {category==='benchmark'&&<p className="exercise-pr-explainer">Benchmarkar blir samanlikna berre innan same WOD, format og nivå (RX/Scaled). Dersom sjølve WOD-oppsettet blir endra, bør det lagrast som ein ny versjon.</p>}
  {legacyRecords.length>0&&<details className="exercise-pr-archive"><summary>Tidlegare PR-noteringar ({legacyRecords.length})</summary><div>{legacyRecords.map(record=><article key={record.id}><strong>{record.exercise_name}</strong><span>{record.result} {record.unit}</span><small>{dateLabel(record.record_date)}</small></article>)}</div><p>Desse eldre registreringane kan mangle informasjon om dosering, sett og øvingsvariant. Dei blir viste separat frå rekordar som kan reknast ut frå treningsloggen.</p></details>}
 </section>
}
