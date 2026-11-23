import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, Clock3, MonitorUp, Play, Pause, RotateCcw, TimerReset, Music2, LoaderCircle, Lock, Unlock, Maximize2, Minimize2, X } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { groupEventsByLocalDay } from '../lib/infotainmentEvents.js'
import { getDemoTimerState } from '../lib/infotainmentTimer.js'
import { Music, MusicMiniPlayer } from './Music.jsx'
import './infotainment.css'

const pad=value=>String(value).padStart(2,'0')
const clock=value=>{const n=Math.max(0,Number(value)||0);return pad(Math.floor(n/3600))+':'+pad(Math.floor((n%3600)/60))+':'+pad(n%60)}

const DEMO_FORMATS=[
 {id:'stopwatch',name:'Stoppeklokke',description:'Tel medgått tid utan fast sluttid'},
 {id:'countdown',name:'Nedteljing',description:'Tel ned frå vald varigheit til null'},
 {id:'amrap',name:'AMRAP',description:'Arbeid så mykje som mogleg innan tidsramma'},
 {id:'fortime',name:'For Time',description:'Tel opp medan oppgåva blir gjennomført'},
 {id:'emom',name:'EMOM',description:'Arbeid ved starten av kvart minutt'},
 {id:'e2mom',name:'E2MOM',description:'Arbeid ved starten av kvart andre minutt'},
 {id:'tabata',name:'Tabata',description:'Arbeid og pause i faste rundar'},
 {id:'interval',name:'Intervall',description:'Justerbar arbeidstid, pause og rundar'}
]
const demoClock=value=>{
 const n=Math.max(0,Number(value)||0)
 const hours=Math.floor(n/3600)
 const minutes=Math.floor((n%3600)/60)
 const seconds=n%60
 return hours>0?pad(hours)+':'+pad(minutes)+':'+pad(seconds):pad(minutes)+':'+pad(seconds)
}

function DemoClock({onClose}){
 const [format,setFormat]=useState('stopwatch')
 const [formatLocked,setFormatLocked]=useState(false)
 const [screenFormat,setScreenFormat]=useState('auto')
 const [screenFormatLocked,setScreenFormatLocked]=useState(false)
 const [minutes,setMinutes]=useState(5)
 const [workSeconds,setWorkSeconds]=useState(20)
 const [restSeconds,setRestSeconds]=useState(10)
 const [rounds,setRounds]=useState(8)
 const [elapsed,setElapsed]=useState(0)
 const [running,setRunning]=useState(false)
 const [fullscreen,setFullscreen]=useState(Boolean(document.fullscreenElement))
 const isCountdown=format==='countdown'||format==='amrap'
 const isEmom=format==='emom'||format==='e2mom'
 const isIntervals=format==='tabata'||format==='interval'
 const demoState=useMemo(()=>getDemoTimerState({format,elapsed,minutes,workSeconds,restSeconds,rounds}),[format,elapsed,minutes,workSeconds,restSeconds,rounds])
 const {limited,totalSeconds,remaining,phase,displayTime,roundLabel,safeWork,safeRest,intervalSeconds}=demoState
 const formatInfo=DEMO_FORMATS.find(item=>item.id===format)
 useEffect(()=>{
  if(!running)return undefined
  const timerId=window.setInterval(()=>setElapsed(value=>value+1),1000)
  return()=>window.clearInterval(timerId)
 },[running])
 useEffect(()=>{
  if(running&&limited&&elapsed>=totalSeconds)setRunning(false)
 },[running,limited,elapsed,totalSeconds])
 useEffect(()=>{
  const sync=()=>setFullscreen(Boolean(document.fullscreenElement))
  const keyboard=event=>{if(event.key==='Escape')closeDemo()}
  document.addEventListener('fullscreenchange',sync)
  window.addEventListener('keydown',keyboard)
  return()=>{document.removeEventListener('fullscreenchange',sync);window.removeEventListener('keydown',keyboard)}
 },[])
 function reset(){setRunning(false);setElapsed(0)}
 async function closeDemo(){
  try{if(document.fullscreenElement)await document.exitFullscreen?.()}catch{/* Lukking skal fungera også utan støtte for fullskjerm. */}
  onClose?.()
 }
 function chooseFormat(next){
  if(formatLocked)return
  setFormat(next)
  reset()
  if(next==='tabata'){setWorkSeconds(20);setRestSeconds(10);setRounds(8)}
  if(next==='interval'){setWorkSeconds(45);setRestSeconds(15);setRounds(6)}
  if(next==='emom'){setWorkSeconds(45);setRestSeconds(15);setRounds(5)}
  if(next==='e2mom'){setWorkSeconds(60);setRestSeconds(30);setRounds(5)}
  if(next==='amrap')setMinutes(10)
  if(next==='countdown')setMinutes(5)
 }
 async function toggleFullscreen(){
  try{
   if(document.fullscreenElement)await document.exitFullscreen?.()
   else await document.documentElement.requestFullscreen?.()
  }catch{/* Fullscreen er valfri på eininga. */}
 }
 const stageClass='infotainment-demo-stage'+(screenFormat==='landscape'?' is-landscape':screenFormat==='portrait'?' is-portrait':'')
 return <div className="infotainment-demo-overlay" role="presentation" onClick={closeDemo}>
  <section className={stageClass} role="dialog" aria-modal="true" aria-label="Demoklokke for intro og teori" onClick={event=>event.stopPropagation()}>
   <header className="infotainment-demo-header">
    <div><span className="infotainment-kicker">INTRO · TEORI · DEMONSTRASJON</span><h2><TimerReset size={22}/> Demoklokke</h2><p>Vis tidstypane utan å påverka ei aktiv treningsøkt eller treningsloggen.</p></div>
    <div className="infotainment-demo-header-actions">
     <button type="button" onClick={toggleFullscreen} aria-label={fullscreen?'Avslutt fullskjerm':'Vis i fullskjerm'} title={fullscreen?'Avslutt fullskjerm':'Vis i fullskjerm'}>{fullscreen?<Minimize2 size={18}/>:<Maximize2 size={18}/>}</button>
     <button type="button" onClick={closeDemo} aria-label="Lukk demoklokka" title="Lukk"><X size={20}/></button>
    </div>
   </header>
   <div className="infotainment-demo-body">
    <div className="infotainment-demo-display">
     <div className="infotainment-demo-display-top"><span>{formatInfo.name.toUpperCase()}</span><span className={running?'is-running':''}>{running?'DEMO GÅR':'KLAR FOR DEMO'}</span></div>
     <div className="infotainment-demo-phase">{phase}</div>
     <strong className="infotainment-demo-clock">{demoClock(displayTime)}</strong>
     <div className="infotainment-demo-caption">{roundLabel||formatInfo.description}</div>
     <div className="infotainment-demo-progress" aria-label="Framdrift"><span style={{width:(limited?Math.min(100,elapsed/Math.max(1,totalSeconds)*100):Math.min(100,elapsed%60/60*100))+'%'}}/></div>
     <div className="infotainment-demo-actions">
      <button type="button" className="primary" onClick={()=>setRunning(value=>!value)} disabled={limited&&elapsed>=totalSeconds}>{running?<><Pause size={18}/> Pause</>:<><Play size={18}/> {elapsed>0?'Hald fram':'Start demo'}</>}</button>
      <button type="button" onClick={reset}><RotateCcw size={17}/> Nullstill</button>
     </div>
     <div className="infotainment-demo-description">{formatInfo.description}</div>
    </div>
    <aside className="infotainment-demo-controls">
     <div className="infotainment-demo-control-head"><div><strong>Vel tidstype</strong><small>Vel kva du vil visa i introduksjonen</small></div><button type="button" className={formatLocked?'is-locked':''} onClick={()=>setFormatLocked(value=>!value)} aria-pressed={formatLocked}>{formatLocked?<><Lock size={15}/> Låst</>:<><Unlock size={15}/> Lås format</>}</button></div>
     <div className="infotainment-demo-format-list">{DEMO_FORMATS.map(item=><button type="button" key={item.id} className={format===item.id?'selected':''} disabled={formatLocked} onClick={()=>chooseFormat(item.id)}><strong>{item.name}</strong><small>{item.description}</small></button>)}</div>
     <div className="infotainment-demo-setup">
      <strong>Demoinnstillingar</strong>
      {isCountdown&&<label>Varigheit · minutt<input type="number" min="1" max="120" value={minutes} onChange={event=>{setMinutes(Math.max(1,Math.min(120,Number(event.target.value)||1)));reset()}}/></label>}
      {isIntervals&&<><label>Arbeid · sekund<input type="number" min="1" max="600" value={workSeconds} onChange={event=>{setWorkSeconds(Math.max(1,Math.min(600,Number(event.target.value)||1)));reset()}}/></label><label>Pause · sekund<input type="number" min="0" max="600" value={restSeconds} onChange={event=>{setRestSeconds(Math.max(0,Math.min(600,Number(event.target.value)||0)));reset()}}/></label><label>Rundar<input type="number" min="1" max="50" value={rounds} onChange={event=>{setRounds(Math.max(1,Math.min(50,Number(event.target.value)||1)));reset()}}/></label></>}
      {isEmom&&<><label>Arbeid · sekund<input type="number" min="1" max={intervalSeconds} value={workSeconds} onChange={event=>{setWorkSeconds(Math.max(1,Math.min(intervalSeconds,Number(event.target.value)||1)));reset()}}/></label><label>Rundar<input type="number" min="1" max="50" value={rounds} onChange={event=>{setRounds(Math.max(1,Math.min(50,Number(event.target.value)||1)));reset()}}/></label></>}
      {isEmom&&<small>Arbeidsdelen går først. Resten av minuttet er pause eller ventetid fram til neste arbeidsstart.</small>}
      {format==='fortime'&&<small>Stoppeklokka tel opp medan gruppa arbeider med ei oppgåve. Instruktøren stoppar demonstrasjonen manuelt.</small>}
      {format==='stopwatch'&&<small>Bruk stoppeklokka til å visa medgått tid og korleis ei vanleg klokke tel opp.</small>}
     </div>
     <div className="infotainment-demo-screen-lock">
      <div><strong>Skjermformat</strong><small>{screenFormatLocked?'Formatet er låst':'Automatisk tilpassing er tilgjengeleg'}</small></div>
      <select aria-label="Skjermformat" value={screenFormat} disabled={screenFormatLocked} onChange={event=>setScreenFormat(event.target.value)}><option value="auto">Automatisk</option><option value="landscape">Liggjande · brei vising</option><option value="portrait">Ståande · høg vising</option></select>
      <button type="button" onClick={()=>setScreenFormatLocked(value=>!value)}>{screenFormatLocked?<><Unlock size={14}/> Lås opp format</>:<><Lock size={14}/> Lås skjermformat</>}</button>
     </div>
    </aside>
   </div>
   <footer className="infotainment-demo-footer"><span>Demoklokka er separat frå WOD og treningslogg.</span><span>GarasjeGym · Intro og teori</span></footer>
  </section>
 </div>
}

export default function Infotainment({onExit,timerSnapshot=null}){
 useEffect(()=>{try{sessionStorage.setItem('garasjegym:infotainment-active','1')}catch{}},[])
 const [now,setNow]=useState(()=>new Date())
 const [events,setEvents]=useState([])
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const [elapsed,setElapsed]=useState(0)
 const [running,setRunning]=useState(false)
 const runStartedAt=useRef(null)
 const toggleClock=()=>{if(running){setElapsed(Math.floor((Date.now()-runStartedAt.current)/1000));setRunning(false);runStartedAt.current=null}else{runStartedAt.current=Date.now()-elapsed*1000;setRunning(true)}}
 const clearClock=()=>{setRunning(false);setElapsed(0);runStartedAt.current=null}
 const [showDemoClock,setShowDemoClock]=useState(false)
 const [activeTab,setActiveTab]=useState(()=>{try{const saved=sessionStorage.getItem('garasjegym:infotainment-tab');return ['oversikt','kalender','musikk','timer'].includes(saved)?saved:'oversikt'}catch{return 'oversikt'}})
 useEffect(()=>{try{sessionStorage.setItem('garasjegym:infotainment-tab',activeTab)}catch{}},[activeTab])

 useEffect(()=>{const id=window.setInterval(()=>setNow(new Date()),1000);return()=>window.clearInterval(id)},[])
 useEffect(()=>{if(!running)return undefined;const refresh=()=>setElapsed(Math.max(0,Math.floor((Date.now()-(runStartedAt.current||Date.now()))/1000)));const id=window.setInterval(refresh,250);document.addEventListener('visibilitychange',refresh);return()=>{window.clearInterval(id);document.removeEventListener('visibilitychange',refresh)}},[running])
 useEffect(()=>{
  let live=true
  const load=async()=>{
   setLoading(true);setError('')
   const from=new Date()
   const to=new Date(from.getTime()+7*86400000)
   const {data,error:loadError}=await supabase.rpc('get_infotainment_schedule',{p_from:from.toISOString(),p_to:to.toISOString()})
   if(!live)return
   if(loadError){setError('Kalenderen kunne ikkje hentast.');setEvents([])}
   else setEvents((data||[]).filter(item=>item.category!=='pt'&&new Date(item.ends_at)>=new Date()).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at)))
   setLoading(false)
  }
  load()
  const id=window.setInterval(load,60000)
  return()=>{live=false;window.clearInterval(id)}
 },[])

 const groups=useMemo(()=>groupEventsByLocalDay(events),[events])
 const trainingActive=Boolean(timerSnapshot?.sessionOpen&&timerSnapshot?.title)
 const timerValue=trainingActive?(Number(timerSnapshot?.displayTime)||0):elapsed
 const timerCaption=trainingActive?'AKTIV TRENINGSØKT':'GARASJEKLOKKE'
 const dayLabel=now.toLocaleDateString('nn-NO',{weekday:'long',day:'numeric',month:'long'})
 const timeLabel=now.toLocaleTimeString('nn-NO',{hour:'2-digit',minute:'2-digit',second:'2-digit'})

 return <main className="infotainment-screen" aria-label="GarasjeGym infotainment">
  <header className="infotainment-header">
   <div className="infotainment-brand"><span className="infotainment-brand-mark"><MonitorUp size={24}/></span><div><strong>GARASJEGYM</strong><small>GARASJEN · INFOTAINMENT</small></div></div>
   <div className="infotainment-clock-head"><strong>{timeLabel}</strong><span>{dayLabel}</span></div>
   <button type="button" className="infotainment-exit" onClick={onExit}>Vanleg modus <MonitorUp size={16}/></button>
  </header>
  <section className="infotainment-welcome">
   <div><span className="infotainment-kicker">TRENING · FELLESSKAP · UTVIKLING</span><h1>Velkomen til GarasjeGym</h1><p>Oversikt over aktivitetane i garasjen, musikk og timer.</p></div>
   <div className="infotainment-date"><span>{dayLabel}</span><strong>{timeLabel.slice(0,5)}</strong></div>
  </section>
  <nav className="infotainment-tabs" aria-label="Infotainment-faner">
   <button type="button" aria-pressed={activeTab==='oversikt'} className={activeTab==='oversikt'?'selected':''} onClick={()=>setActiveTab('oversikt')}><MonitorUp size={17}/> Oversikt</button>
   <button type="button" aria-pressed={activeTab==='kalender'} className={activeTab==='kalender'?'selected':''} onClick={()=>setActiveTab('kalender')}><CalendarDays size={17}/> Kalender</button>
   <button type="button" aria-pressed={activeTab==='musikk'} className={activeTab==='musikk'?'selected':''} onClick={()=>setActiveTab('musikk')}><Music2 size={17}/> Spotify</button>
   <button type="button" aria-pressed={activeTab==='timer'} className={activeTab==='timer'?'selected':''} onClick={()=>setActiveTab('timer')}><TimerReset size={17}/> Timer</button>
  </nav>
  <div className={'infotainment-grid'+(activeTab!=='oversikt'?' is-focused-tab':'')}>
   {(activeTab==='oversikt'||activeTab==='kalender')&&<section className="infotainment-panel infotainment-calendar">
    <div className="infotainment-panel-head"><div><span className="infotainment-kicker">KOMANDE AKTIVITET</span><h2><CalendarDays size={19}/> Kalender</h2></div><span className="infotainment-window">Neste 7 dagar</span></div>
    {loading?<div className="infotainment-loading"><LoaderCircle className="infotainment-spin"/> Hentar kalender …</div>:error?<div className="infotainment-empty">{error}</div>:groups.length?groups.map(([day,items])=><div className="infotainment-day" key={day}><h3>{new Date(day+'T12:00:00').toLocaleDateString('nn-NO',{weekday:'long',day:'numeric',month:'long'})}</h3>{items.map(item=><article key={item.event_key} className={'infotainment-event '+(item.category==='pt'?'pt-event':'class-event')}><span className="infotainment-event-time">{new Date(item.starts_at).toLocaleTimeString('nn-NO',{hour:'2-digit',minute:'2-digit'})}</span><span className="infotainment-event-main"><strong>{item.category==='pt'?'PT-time':item.title}</strong><small>{item.category==='pt'?'PT-time · ledig for booking':'Gruppetime'}</small></span><span className="infotainment-event-duration">{Math.max(1,Math.round((new Date(item.ends_at)-new Date(item.starts_at))/60000))} min</span></article>)}</div>):<div className="infotainment-empty">Ingen komande aktivitetar er publiserte.</div>}
   </section>}
   {(activeTab==='oversikt'||activeTab==='musikk'||activeTab==='timer')&&<div className="infotainment-side">
    {activeTab==='oversikt'&&<section className="infotainment-panel infotainment-music">
     <div className="infotainment-panel-head"><div><span className="infotainment-kicker">LYD I GARASJEN</span><h2><Music2 size={19}/> Musikk</h2></div></div>
     <MusicMiniPlayer/>
     <p className="infotainment-note">Styr musikken via den personlege Spotify-tilkoplinga di.</p>
    </section>}
    {activeTab==='musikk'&&<section className="infotainment-panel infotainment-music infotainment-music-expanded"><Music/></section>}
    {(activeTab==='oversikt'||activeTab==='timer')&&<section className="infotainment-panel infotainment-timer">
     <div className="infotainment-panel-head"><div><span className="infotainment-kicker">TID OG INTERVALL</span><h2><TimerReset size={19}/> Timer</h2></div><div className="infotainment-timer-head-actions"><span className={'infotainment-live '+(trainingActive?'active':'')}>{trainingActive?'TRENING PÅGÅR':'KLAR'}</span><button type="button" className="infotainment-demo-open" onClick={()=>setShowDemoClock(true)}><TimerReset size={15}/> Demoklokke</button></div></div>
     <div className="infotainment-timer-caption">{trainingActive?(timerSnapshot?.title||'Aktiv treningsøkt'):timerCaption}</div>
     <strong className="infotainment-timer-value">{clock(timerValue)}</strong>
     <div className="infotainment-timer-state">{trainingActive?(timerSnapshot?.running?'TRENING PÅGÅR':timerSnapshot?.phase||'PAUSA'):running?'STOPPEKLOKKE GÅR':'STOPPEKLOKKE PAUSA'}</div>
     {!trainingActive&&<div className="infotainment-timer-actions"><button type="button" onClick={toggleClock}>{running?<Pause size={15}/>:<Play size={15}/>} {running?'Pause':'Start'}</button><button type="button" onClick={clearClock}><RotateCcw size={15}/> Nullstill</button></div>}
     {trainingActive&&<p className="infotainment-note">{timerSnapshot?.running?'Den aktive WOD-timeren held fram i treningsmodus.':'Treningsøkta er pausa eller ferdig i treningsmodus.'}</p>}
    </section>}
   </div>}
  </div>
  <footer className="infotainment-footer"><span>GARASJEGYM · STURMKOPF</span><span>Privat PT-informasjon er skjerma på denne skjermen</span></footer>
  {showDemoClock&&<DemoClock onClose={()=>setShowDemoClock(false)}/>}
 </main>
}
