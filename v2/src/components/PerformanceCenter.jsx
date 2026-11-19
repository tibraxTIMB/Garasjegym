import {useEffect,useMemo,useState} from 'react'
import {Activity,TrendingUp,Trophy} from 'lucide-react'
import './performance-center.css'

const dateLabel=value=>value?new Date(value+'T12:00:00').toLocaleDateString('nn-NO',{day:'numeric',month:'short',year:'numeric'}):'Ukjend dato'
const asNumber=value=>{const n=Number(String(value??'').replace(',','.'));return Number.isFinite(n)&&n>0?n:null}

function collectExerciseHistory(history){
 const map=new Map()
 for(const log of history||[]){
  const date=log.workout_date||String(log.created_at||'').slice(0,10)
  for(const exercise of [...(log.workout_exercises||[])].sort((a,b)=>(a.sort_order||0)-(b.sort_order||0))){
   const name=(exercise.exercise_name||'').trim()
   if(!name)continue
   const key=name.toLocaleLowerCase('nn-NO')
   if(!map.has(key))map.set(key,{name,points:[]})
   const sets=exercise.workout_sets||[]
   const singleExercise=(log.workout_exercises||[]).length===1
   const distanceUnit=log.score_unit||'m'
   const point={date,title:log.title,level:String(log.result_data?.prescription_level||'rx').toLowerCase(),load:Math.max(0,...sets.map(s=>asNumber(s.load_kg)||0),singleExercise?asNumber(log.score_load_kg)||0:0),height:Math.max(0,...sets.map(s=>asNumber(s.height_cm)||0)),reps:Math.max(0,...sets.map(s=>asNumber(s.reps)||0),singleExercise?asNumber(log.score_reps)||0:0),time:Math.min(...[...sets.map(s=>asNumber(s.time_seconds)),singleExercise?asNumber(log.score_time_seconds):null].filter(Boolean)),distance:Math.max(0,distanceUnit==='km'?(asNumber(log.score_distance)||0)*1000:distanceUnit==='cal'?0:asNumber(log.score_distance)||0),calories:Math.max(0,asNumber(log.score_calories)||0,distanceUnit==='cal'?asNumber(log.score_distance)||0:0)}
   if(point.load||point.height||point.reps||point.distance||point.calories||Number.isFinite(point.time))map.get(key).points.push(point)
  }
 }
 return [...map.values()].map(entry=>({...entry,points:entry.points.sort((a,b)=>String(a.date).localeCompare(String(b.date)))})).sort((a,b)=>a.name.localeCompare(b.name,'nn'))
}

function LineChart({points,metric,label,unit}){
 const values=points.map(point=>point[metric]).filter(value=>Number.isFinite(value)&&value>0)
 if(!values.length)return <div className="pr-chart-empty">Ingen historikk for denne måleverdien enno.</div>
 const width=620,height=190,pad=28,min=Math.min(...values),max=Math.max(...values),range=max-min||1
 const plotted=points.map((point,index)=>({point,value:point[metric]})).filter(x=>Number.isFinite(x.value)&&x.value>0)
 const coords=plotted.map((item,index)=>({x:pad+(plotted.length===1?(width-pad*2)/2:index*(width-pad*2)/(plotted.length-1)),y:height-pad-((item.value-min)/range)*(height-pad*2),...item}))
 return <div className="pr-chart-wrap">
  <svg className="pr-history-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Utvikling i ${label} for ${plotted.length} registreringar`}>
   <line x1={pad} y1={height-pad} x2={width-pad} y2={height-pad} className="pr-chart-axis"/>
   <line x1={pad} y1={pad} x2={pad} y2={height-pad} className="pr-chart-axis"/>
   {coords.length>1&&<polyline points={coords.map(p=>`${p.x},${p.y}`).join(' ')} className="pr-chart-line" fill="none"/>}
   {coords.map((p,index)=><g key={index}><circle cx={p.x} cy={p.y} r="5" className="pr-chart-point"><title>{dateLabel(p.point.date)} · {p.value} {unit}</title></circle></g>)}
   <text x={pad} y="16" className="pr-chart-label">{max} {unit}</text>
   <text x={pad} y={height-5} className="pr-chart-label">{min} {unit}</text>
  </svg>
  <div className="pr-chart-dates"><span>{dateLabel(plotted[0].point.date)}</span><span>{dateLabel(plotted[plotted.length-1].point.date)}</span></div>
 </div>
}

export default function PerformanceCenter({history=[],records=[]}){
 const exerciseHistory=useMemo(()=>collectExerciseHistory(history),[history])
 const [selected,setSelected]=useState('')
 const [metric,setMetric]=useState('load')
 const [level,setLevel]=useState('rx')
 useEffect(()=>{if(!exerciseHistory.some(item=>item.name===selected))setSelected(exerciseHistory[0]?.name||'')},[exerciseHistory,selected])
 const active=exerciseHistory.find(item=>item.name===selected)
 const points=active?.points.filter(point=>level==='all'||point.level===level)||[]
 const availableMetrics=useMemo(()=>[
  {key:'load',label:'Belastning',unit:'kg'},
  {key:'reps',label:'Repetisjonar',unit:'reps'},
  {key:'height',label:'Høgde',unit:'cm'},
  {key:'time',label:'Tid',unit:'sek'},
  {key:'distance',label:'Distanse',unit:'m'},
  {key:'calories',label:'Kaloriar',unit:'cal'}
 ].filter(option=>points.some(point=>Number.isFinite(point[option.key])&&point[option.key]>0)),[points])
 useEffect(()=>{if(!availableMetrics.some(item=>item.key===metric))setMetric(availableMetrics[0]?.key||'load')},[availableMetrics,metric])
 const best=active?points.reduce((result,point)=>{for(const key of ['load','reps','height','distance','calories'])if(point[key]>0)result[key]=Math.max(result[key]||0,point[key]);if(Number.isFinite(point.time)&&point.time>0)result.time=result.time?Math.min(result.time,point.time):point.time;return result},{ }):{}
 return <section className="pr-center">
  <div className="pr-center-heading"><div><span className="section-kicker">PRESTASJONSDATA</span><h4><Trophy size={17}/> PR-senter og progresjon</h4><p>Historiske resultat frå treningsloggen, samla per øving.</p></div><span className="count-pill">{exerciseHistory.length} øvingar</span></div>
  {exerciseHistory.length>0?<>
   <div className="pr-center-controls"><label>Vel øving<select value={selected} onChange={event=>setSelected(event.target.value)}>{exerciseHistory.map(item=><option key={item.name} value={item.name}>{item.name}</option>)}</select></label><label>Nivå<select value={level} onChange={event=>setLevel(event.target.value)}><option value="all">Alle nivå</option><option value="rx">RX</option><option value="scaled">Scaled</option><option value="foundation">Foundation</option></select></label><label>Vis utvikling<select value={metric} onChange={event=>setMetric(event.target.value)}>{availableMetrics.map(item=><option key={item.key} value={item.key}>{item.label}</option>)}</select></label></div>
   {active&&<><div className="pr-best-grid">{best.load>0&&<article><small>BESTE BELASTNING</small><strong>{best.load} kg</strong></article>}{best.reps>0&&<article><small>FLEST REPS I EITT SETT</small><strong>{best.reps}</strong></article>}{best.height>0&&<article><small>STØRSTE HØGDE</small><strong>{best.height} cm</strong></article>}{best.distance>0&&<article><small>LENGSTE DISTANSE</small><strong>{best.distance} m</strong></article>}{best.calories>0&&<article><small>FLEST KALORIAR</small><strong>{best.calories} cal</strong></article>}{best.time>0&&<article><small>BESTE TID</small><strong>{best.time} sek</strong></article>}</div>
    <div className="pr-chart-card"><div className="pr-chart-title"><strong><TrendingUp size={16}/> {availableMetrics.find(item=>item.key===metric)?.label||'Utvikling'}</strong><span>{points.length} registreringar</span></div><LineChart points={points} metric={metric} label={availableMetrics.find(item=>item.key===metric)?.label||''} unit={availableMetrics.find(item=>item.key===metric)?.unit||''}/></div>
    <div className="pr-history-list"><strong><Activity size={16}/> Historikk · {active.name}</strong>{[...points].reverse().map((point,index)=><article key={point.date+'-'+index}><span><b>{point.title||active.name}</b><small>{dateLabel(point.date)}</small></span><span>{point.load>0?point.load+' kg ':''}{point.reps>0?point.reps+' reps ':''}{point.height>0?point.height+' cm ':''}{point.distance>0?point.distance+' m ':''}{point.calories>0?point.calories+' cal ':''}{Number.isFinite(point.time)&&point.time>0?point.time+' sek':''}</span></article>)}</div>
   </>}
  </>:<div className="empty-state">Det finst ikkje nok treningsresultat til å teikne progresjonsgraf enno. Lagre ei økt med registrerte sett for å byggje historikk.</div>}
  {records.length>0&&<details className="pr-manual-records"><summary>Registrerte PR-noteringar ({records.length})</summary><div className="history-list">{records.map(record=><article className="history-card" key={record.id}><div className="history-card-top"><strong>{record.exercise_name}</strong><span>{record.record_date}</span></div><div className="pr-result">{record.result} {record.unit}</div>{record.note&&<small>{record.note}</small>}</article>)}</div></details>}
 </section>
}
