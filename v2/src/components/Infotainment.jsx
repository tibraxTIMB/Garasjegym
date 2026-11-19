import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Clock3, MonitorUp, Play, Pause, RotateCcw, TimerReset, Music2, LoaderCircle } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { MusicMiniPlayer } from './Music.jsx'
import './infotainment.css'

const pad=value=>String(value).padStart(2,'0')
const clock=value=>{const n=Math.max(0,Number(value)||0);return pad(Math.floor(n/3600))+':'+pad(Math.floor((n%3600)/60))+':'+pad(n%60)}
const dateKey=value=>{const d=new Date(value);return [d.getFullYear(),pad(d.getMonth()+1),pad(d.getDate())].join('-')}

export default function Infotainment({onExit,timerSnapshot=null}){
 const [now,setNow]=useState(()=>new Date())
 const [events,setEvents]=useState([])
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const [elapsed,setElapsed]=useState(0)
 const [running,setRunning]=useState(false)

 useEffect(()=>{const id=window.setInterval(()=>setNow(new Date()),1000);return()=>window.clearInterval(id)},[])
 useEffect(()=>{if(!running)return undefined;const id=window.setInterval(()=>setElapsed(value=>value+1),1000);return()=>window.clearInterval(id)},[running])
 useEffect(()=>{
  let live=true
  const load=async()=>{
   setLoading(true);setError('')
   const from=new Date()
   const to=new Date(from.getTime()+7*86400000)
   const {data,error:loadError}=await supabase.rpc('get_infotainment_schedule',{p_from:from.toISOString(),p_to:to.toISOString()})
   if(!live)return
   if(loadError){setError('Kalenderen kunne ikkje hentast.');setEvents([])}
   else setEvents((data||[]).filter(item=>new Date(item.ends_at)>=new Date()).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at)))
   setLoading(false)
  }
  load()
  const id=window.setInterval(load,60000)
  return()=>{live=false;window.clearInterval(id)}
 },[])

 const groups=useMemo(()=>{
  const result=new Map()
  events.forEach(item=>{const key=dateKey(item.starts_at);if(!result.has(key))result.set(key,[]);result.get(key).push(item)})
  return [...result.entries()]
 },[events])
 const trainingActive=Boolean(timerSnapshot?.running)
 const timerValue=trainingActive?(timerSnapshot?.remaining>0?timerSnapshot.remaining:timerSnapshot?.elapsed||0):elapsed
 const timerCaption=trainingActive?'AKTIV TRENINGSØKT':'GARASJEKLKOKKE'
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
  <div className="infotainment-grid">
   <section className="infotainment-panel infotainment-calendar">
    <div className="infotainment-panel-head"><div><span className="infotainment-kicker">KOMANDE AKTIVITET</span><h2><CalendarDays size={19}/> Kalender</h2></div><span className="infotainment-window">Neste 7 dagar</span></div>
    {loading?<div className="infotainment-loading"><LoaderCircle className="infotainment-spin"/> Hentar kalender …</div>:error?<div className="infotainment-empty">{error}</div>:groups.length?groups.map(([day,items])=><div className="infotainment-day" key={day}><h3>{new Date(day+'T12:00:00').toLocaleDateString('nn-NO',{weekday:'long',day:'numeric',month:'long'})}</h3>{items.map(item=><article key={item.event_key} className={'infotainment-event '+(item.category==='pt'?'pt-event':'class-event')}><span className="infotainment-event-time">{new Date(item.starts_at).toLocaleTimeString('nn-NO',{hour:'2-digit',minute:'2-digit'})}</span><span className="infotainment-event-main"><strong>{item.category==='pt'?'PT-time':item.title}</strong><small>{item.category==='pt'?'Privat avtale · kundeinformasjon skjult':'Gruppetime'}</small></span><span className="infotainment-event-duration">{Math.max(1,Math.round((new Date(item.ends_at)-new Date(item.starts_at))/60000))} min</span></article>)}</div>):<div className="infotainment-empty">Ingen komande aktivitetar er publiserte.</div>}
   </section>
   <div className="infotainment-side">
    <section className="infotainment-panel infotainment-music">
     <div className="infotainment-panel-head"><div><span className="infotainment-kicker">LYD I GARASJEN</span><h2><Music2 size={19}/> Musikk</h2></div></div>
     <MusicMiniPlayer/>
     <p className="infotainment-note">Styr musikken via den personlege Spotify-tilkoplinga di.</p>
    </section>
    <section className="infotainment-panel infotainment-timer">
     <div className="infotainment-panel-head"><div><span className="infotainment-kicker">TID OG INTERVALL</span><h2><TimerReset size={19}/> Timer</h2></div><span className={'infotainment-live '+(trainingActive?'active':'')}>{trainingActive?'TRENING PÅGÅR':'KLAR'}</span></div>
     <div className="infotainment-timer-caption">{trainingActive?(timerSnapshot?.title||'Aktiv treningsøkt'):timerCaption}</div>
     <strong className="infotainment-timer-value">{clock(timerValue)}</strong>
     <div className="infotainment-timer-state">{trainingActive?(timerSnapshot?.phase||'PÅGÅR'):running?'STOPPEKLOKKE GÅR':'STOPPEKLOKKE PAUSA'}</div>
     {!trainingActive&&<div className="infotainment-timer-actions"><button type="button" onClick={()=>setRunning(value=>!value)}>{running?<Pause size={15}/>:<Play size={15}/>} {running?'Pause':'Start'}</button><button type="button" onClick={()=>{setRunning(false);setElapsed(0)}}><RotateCcw size={15}/> Nullstill</button></div>}
     {trainingActive&&<p className="infotainment-note">Den aktive WOD-timeren held fram i treningsmodus.</p>}
    </section>
   </div>
  </div>
  <footer className="infotainment-footer"><span>GARASJEGYM · STURMKOPF</span><span>Privat PT-informasjon er skjerma på denne skjermen</span></footer>
 </main>
}
