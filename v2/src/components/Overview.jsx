import {useEffect,useRef,useState} from 'react'
import {Activity,CalendarDays,ClipboardList,Dumbbell,LoaderCircle,Trophy,ArrowRight} from 'lucide-react'
import {supabase} from '../lib/supabase.js'
import Notifications from './Notifications.jsx'
import {isStaff} from '../lib/auth.js'
import {deriveBenchmarkRecords,deriveExerciseRecords} from '../lib/prMetrics.js'
export const RANK_TITLES = ["Garasjekadett","Kraftknøtt","Schwitzling","Kneipenkrieger","Tattenmaester","Kraftknöchel","Kraftbengel","Kraftritter","Kraftbaron","Kraftfürst","Kraftmeister","Kraftgeneral","Kraftkaiser","Kraftkoloss","Kraftlegende","Kraftheld","Kraftkobold","Kraftochse","Kraftpanzer","Kraftorkan","Kraftmagier","Kraftmonarch","Krafttitan","Kraftüberlord","Kraftweltmeister","Muskelknöchel","Muskelbengel","Muskelritter","Muskelbaron","Muskelfürst","Muskelmeister","Muskelgeneral","Muskelkaiser","Muskelkoloss","Muskellegende","Muskelheld","Muskelkobold","Muskelochse","Muskelpanzer","Muskelorkan","Muskelmagier","Muskelmonarch","Muskeltitan","Muskelüberlord","Muskelweltmeister","Hantelknöchel","Hantelbengel","Hantelritter","Hantelbaron","Hantelfürst","Hantelmeister","Hantelgeneral","Hantelkaiser","Hantelkoloss","Hantellegende","Hantelheld","Hantelkobold","Hantelochse","Hantelpanzer","Hantelorkan","Hantelmagier","Hantelmonarch","Hanteltitan","Hantelüberlord","Hantelweltmeister","Schwitzknöchel","Schwitzbengel","Schwitzritter","Schwitzbaron","Schwitzfürst","Schwitzmeister","Schwitzgeneral","Schwitzkaiser","Schwitzkoloss","Schwitzlegende","Schwitzheld","Schwitzkobold","Schwitzochse","Schwitzpanzer","Schwitzorkan","Schwitzmagier","Schwitzmonarch","Schwitztitan","Schwitzüberlord","Schwitzweltmeister","Eisenknöchel","Eisenbengel","Eisenritter","Eisenbaron","Eisenfürst","Eisenmeister","Eisengeneral","Eisenkaiser","Eisenkoloss","Eisenlegende","Eisenheld","Eisenkobold","Eisenochse","Eisenpanzer","Eisenorkan","Eisenmagier","Eisenmonarch","Eisentitan","Eisenüberlord","Eisenweltmeister","Pumpenknöchel","Pumpenbengel","Pumpenritter","Pumpenbaron","Pumpenfürst","Pumpenmeister","Pumpengeneral","Pumpenkaiser","Pumpenkoloss","Pumpenlegende","Pumpenheld","Pumpenkobold","Pumpenochse","Pumpenpanzer","Pumpenorkan","Pumpenmagier","Pumpenmonarch","Pumpentitan","Pumpenüberlord","Pumpenweltmeister","Bizepsknöchel","Bizepsbengel","Bizepsritter","Bizepsbaron","Bizepsfürst","Bizepsmeister","Bizepsgeneral","Bizepskaiser","Bizepskoloss","Bizepslegende","Bizepsheld","Bizepskobold","Bizepsochse","Bizepspanzer","Bizepsorkan","Bizepsmagier","Bizepsmonarch","Bizepstitan","Bizepsüberlord","Bizepsweltmeister","Garagenknöchel","Garagenbengel","Garagenritter","Garagenbaron","Garagenfürst","Garagenmeister","Garagengeneral","Garagenkaiser","Garagenkoloss","Garagenlegende","Garagenheld","Garagenkobold","Garagenochse","Garagenpanzer","Garagenorkan","Garagenmagier","Garagenmonarch","Garagentitan","Garagenüberlord","Garagenweltmeister","Schnitzelknöchel","Schnitzelbengel","Schnitzelritter","Schnitzelbaron","Schnitzelfürst","Schnitzelmeister","Schnitzelgeneral","Schnitzelkaiser","Schnitzelkoloss","Schnitzellegende","Schnitzelheld","Schnitzelkobold","Schnitzelochse","Schnitzelpanzer","Schnitzelorkan","Schnitzelmagier","Schnitzelmonarch","Schnitzeltitan","Schnitzelüberlord","Schnitzelweltmeister","Knödelknöchel","Knödelbengel","Knödelritter","Knödelbaron","Knödelfürst","Knödelmeister","Knödelgeneral","Knödelkaiser","Knödelkoloss","Knödellegende","Knödelheld","Knödelkobold","Knödelochse","Knödelpanzer","Tattenkaiser Supreme"]
export const rankForCount = count => { const n=Math.max(0,Number(count)||0); if(n>=600)return {level:200,stars:3,title:RANK_TITLES[199],next:600,gold:true}; if(n===0)return {level:1,stars:0,title:RANK_TITLES[0],next:1,gold:false}; const level=Math.min(200,Math.floor((n-1)/3)+1),stars=((n-1)%3)+1; return {level,stars,title:RANK_TITLES[level-1],next:level*3,gold:false} }

export default function Overview({profile,onNavigate,onOpenNotification=()=>{},onOpenWorkout,onOpenWod=()=>{},dailyWod=null,refreshToken=0}){
 const [logs,setLogs]=useState([]),[prs,setPrs]=useState([]),[assignments,setAssignments]=useState([]),[bookings,setBookings]=useState([]),[totalCount,setTotalCount]=useState(0),[ranking,setRanking]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('')
 const loadSequence=useRef(0)
 useEffect(()=>{
  let live=true
  async function load(){
   const requestId=++loadSequence.current
   try{
    const {data:{user},error:authError}=await supabase.auth.getUser()
    if(authError)throw authError
    if(!user){if(live&&requestId===loadSequence.current)setLoading(false);return}
    const [l,count,a,b,leaderboard]=await Promise.all([
     supabase.from('workout_logs').select('id,title,workout_date,format,source_wod_id,score_rounds,score_reps,score_time_seconds,result_data,note,workout_exercises(id,exercise_id,exercise_name,sort_order,workout_sets(id,reps,load_kg,height_cm,time_seconds))').eq('member_id',user.id).order('workout_date',{ascending:false}).limit(200),
     supabase.from('workout_logs').select('id',{count:'exact',head:true}).eq('member_id',user.id),
     supabase.from('pt_wod_assignments').select('id,status,due_date,wods(name,format,duration_minutes)').eq('member_id',user.id).in('status',['assigned','in_progress']).order('due_date',{ascending:true,nullsFirst:false}).limit(5),
     supabase.from('class_bookings').select('id,status,classes(id,title,starts_at,duration_minutes,cancelled_at)').eq('member_id',user.id).eq('status','confirmed').limit(100),
     supabase.rpc('get_member_workout_leaderboard')
    ])
    if(!live||requestId!==loadSequence.current)return
    const failures=[]
    if(l.error)failures.push('Treningshistorikk: '+l.error.message);else{
     const rows=l.data||[]
     setLogs(rows)
     const exercisePRs=deriveExerciseRecords(rows).flatMap(exercise=>exercise.records.map(item=>({id:exercise.key+'-'+item.key,exercise_name:exercise.label+' · '+item.label,result:item.value,unit:item.unit,record_date:item.date})))
     const wodPRs=deriveBenchmarkRecords(rows).map(wod=>({id:wod.key,exercise_name:wod.name+' · '+wod.level.toUpperCase(),result:wod.score.rounds!=null?`${wod.score.rounds} + ${wod.score.reps}`:`${Math.floor(wod.score.value/60)}:${String(Math.round(wod.score.value%60)).padStart(2,'0')}`,unit:wod.score.rounds!=null?'rundar/reps':'min:sek',record_date:wod.date}))
     setPrs([...exercisePRs,...wodPRs].sort((a,b)=>String(b.record_date||'').localeCompare(String(a.record_date||''))))
    }
    if(count.error)failures.push('Treningsstatistikk: '+count.error.message);else setTotalCount(count.count||0)
    if(a.error)failures.push('PT-tildelingar: '+a.error.message);else setAssignments((a.data||[]).filter(x=>x.wods))
    if(b.error)failures.push('Gruppetimebooking: '+b.error.message);else setBookings((b.data||[]).filter(x=>x.classes&&!x.classes.cancelled_at&&new Date(x.classes.starts_at)>=new Date()).map(x=>x.classes).sort((x,y)=>new Date(x.starts_at)-new Date(y.starts_at)))
    if(leaderboard.error)failures.push('Treningsrangering: '+leaderboard.error.message)
    else{
     const rows=(leaderboard.data||[]).map(person=>({id:person.member_id,name:person.display_name||'Medlem',count:Number(person.workout_count)||0}))
     setRanking(rows.map((row,index)=>({...row,position:index+1})))
    }
    setError(failures.join(' · '))
   }catch(loadError){
    if(live&&requestId===loadSequence.current)setError('Kunne ikkje henta oversikta: '+(loadError?.message||'Ukjend feil'))
   }finally{
    if(live&&requestId===loadSequence.current)setLoading(false)
   }
  }
  load()
  const timer=setInterval(load,60000)
  return()=>{live=false;clearInterval(timer);loadSequence.current++}
 },[refreshToken])

 const now=new Date(),weekStart=new Date(now);weekStart.setHours(0,0,0,0);weekStart.setDate(weekStart.getDate()-(weekStart.getDay()+6)%7)
 const weekCount=logs.filter(x=>new Date(x.workout_date+'T12:00:00')>=weekStart).length
 const rank=rankForCount(totalCount)
 const nextBooking=bookings.find(x=>new Date(x.starts_at)>=now)
 if(loading)return <div className="training-state"><LoaderCircle className="spin" size={20}/> Hentar oversikta …</div>
 return <div className="overview-module overview-dashboard">
  <div className="training-heading overview-compact-header"><div><div className="section-kicker">GARASJEGYM · DI TRENING</div><h3>Hei, {profile.display_name||'medlem'}!</h3></div><div className="overview-rank-label" aria-label={`Din rang: ${rank.title}, nivå ${rank.level}`}><div className="overview-rank-main"><span className="overview-rank-title">{rank.title}</span><span className="overview-rank-stars" role="img" aria-label={`${rank.stars} av 3 stjerner`}>{[0,1,2].map(index=><span key={index} className={index<rank.stars?"is-filled":"is-empty"}>{index<rank.stars?"★":"☆"}</span>)}</span></div><div className="overview-rank-progress"><span>Rang {rank.level} · {totalCount} økter</span><small>{rank.gold?'Maks rang':rank.stars===3?'1 økt → ny rang':'1 økt → ★'}</small></div><div className="overview-rank-progressbar"><span style={{width:`${rank.stars/3*100}%`}}/></div></div></div>
  {error&&<div className="auth-error" role="alert">{error}</div>}{dailyWod&&<button type="button" className="overview-daily-wod" onClick={()=>onOpenWod(dailyWod.id)}><span className="section-kicker">DAGENS WOD</span><strong>{dailyWod.name}</strong><span>{dailyWod.format} · {dailyWod.duration_minutes||'–'} min · Trykk for å sjå økta <ArrowRight size={15}/></span><small>{dailyWod.timer_settings?.workout_schema?.stimulus||dailyWod.notes||''}</small></button>}
  <Notifications compact hideWhenEmpty context="oversikt" staff={isStaff(profile)} isAdmin={profile.role==='admin'} onNavigate={onOpenNotification}/>
  <details className="engine-section overview-ranking"><summary><Trophy size={16}/> Rangering <span>{ranking.length} aktive medlemer · {totalCount>0&&ranking.find(x=>x.id===profile.id)?.position?'Du er #'+ranking.find(x=>x.id===profile.id).position:'Opne topplista'}</span></summary>{ranking.length?<><div className="overview-ranking-self"><strong>{totalCount>0&&ranking.find(x=>x.id===profile.id)?.position ? '#'+ranking.find(x=>x.id===profile.id).position : '–'}</strong><span>Di plassering · {rank.title}</span><b>{totalCount} økter</b></div><ol>{ranking.slice(0,5).map(person=><li key={person.id} className={person.id===profile.id?'is-current-member':''}><span className="overview-ranking-position">{person.position}</span><span>{person.name}{person.id===profile.id?' (deg)':''}</span><b>{person.count} økter</b></li>)}</ol></>:<div className="empty-state">Rangeringa er ikkje tilgjengeleg akkurat no.</div>}</details>
  <div className="overview-stats">
   <button type="button" onClick={()=>onNavigate('mi-historikk')}><Activity size={18}/><strong>{weekCount}</strong><span>Økter denne veka</span></button>
   <button type="button" onClick={()=>onNavigate('mi-historikk')}><Dumbbell size={18}/><strong>{totalCount}</strong><span>Gjennomførte økter</span></button>
   <button type="button" onClick={()=>onNavigate('pr-senter')}><Trophy size={18}/><strong>{prs.length}</strong><span>Personlege rekordar</span><small>Opne PR-senter →</small></button>
  </div>
  <div className="overview-dashboard-grid">
   <section className="engine-section overview-mini-panel"><div className="engine-section-title"><h4><CalendarDays size={16}/> Påmeldingar</h4><span>{bookings.length}</span></div>{nextBooking?<button type="button" className="overview-mini-item" onClick={()=>onNavigate('timeplan')}><strong>{nextBooking.title}</strong><small>{new Date(nextBooking.starts_at).toLocaleString('nn-NO',{dateStyle:'medium',timeStyle:'short'})}</small><span>Opne timeplan <ArrowRight size={13}/></span></button>:<div className="empty-state">Ingen komande gruppetimar. <button className="text-action" onClick={()=>onNavigate('timeplan')}>Sjå timeplan</button></div>}</section>
   <section className="engine-section overview-mini-panel"><div className="engine-section-title"><h4><ClipboardList size={16}/> Tildelte økter</h4><span>{assignments.length}</span></div>{assignments.length?assignments.slice(0,3).map(a=><button type="button" className="overview-mini-item" key={a.id} onClick={()=>onNavigate('mi-trening')}><strong>{a.wods.name}</strong><small>{a.wods.format} · {a.wods.duration_minutes||'–'} min{a.due_date?' · Frist '+a.due_date:''}</small><span>Opne tildelt trening <ArrowRight size={13}/></span></button>):<div className="empty-state">Ingen tildelte WOD-ar akkurat no.</div>}</section>
  </div>
  <section className="engine-section"><div className="training-heading"><div><div className="section-kicker">SISTE AKTIVITET</div><h3>Gjennomførte økter</h3></div><button className="secondary-button" onClick={()=>onNavigate('mi-historikk')}>Treningslogg <ArrowRight size={14}/></button></div>
   {logs.length?logs.slice(0,4).map(log=><button type="button" className="history-card overview-log-button" key={log.id} onClick={()=>onOpenWorkout?.(log)}><div className="history-card-top"><strong>{log.title}</strong><span>{new Date(log.workout_date+'T12:00:00').toLocaleDateString('nn-NO')}</span></div><small>{log.format}{log.score_rounds!=null?' · '+log.score_rounds+' rundar':''}{log.score_reps!=null?' + '+log.score_reps+' reps':''}</small><span className="overview-log-open">Sjå resultat og analyse <ArrowRight size={13}/></span></button>):<div className="empty-state">Du har ikkje registrert ei økt enno. Start trening frå menyen.</div>}
  </section>
  <section className="engine-section"><div className="training-heading"><div><div className="section-kicker">PERSONLEGE REKORDAR</div><h3>Siste PR</h3></div><button className="secondary-button" onClick={()=>onNavigate('pr-senter')}>Alle PR-ar</button></div>
   {prs.length?<div className="overview-pr-grid">{prs.slice(0,3).map(pr=><button type="button" className="history-card pr-click-card" key={pr.id} onClick={()=>onNavigate('pr-senter')}><strong>{pr.exercise_name}</strong><div className="pr-result">{pr.result} {pr.unit}</div><small>{pr.record_date}</small><span className="overview-log-open">Opne PR-senter <ArrowRight size={13}/></span></button>)}</div>:<div className="empty-state">Registrer den første personlege rekorden din.</div>}
  </section>
  <div className="overview-shortcuts"><button onClick={()=>onNavigate('trening')}><Dumbbell size={17}/> Start trening</button><button onClick={()=>onNavigate('timeplan')}><CalendarDays size={17}/> Finn ei time</button><button onClick={()=>onNavigate('mi-side')}><Trophy size={17}/> Min treningsprofil</button></div>
 </div>
}
