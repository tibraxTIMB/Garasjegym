import React,{useEffect,useRef,useState} from 'react'
import TimerClockFace from './TimerClockFace.jsx'
import SynchronResultReview from './SynchronResultReview.jsx'
import SynchronCalibrationReview from './SynchronCalibrationReview.jsx'
import {acceptSynchronSnapshot,synchronControls,submitSynchronAction} from '../lib/synchronClient.js'
import './synchron-preview.css'

const unitLabel={reps:'reps',seconds:'sek',meters:'m',calories:'cal'}
// Controlled view: transport is supplied by the caller; no local workout/log writes.
export default function SynchronSessionPanel({adapter,label,online=true,onSnapshot}){
 const [record,setRecord]=useState(null),[tick,setTick]=useState(()=>performance.now()),[issue,setIssue]=useState(''),[busy,setBusy]=useState(false),[contactLost,setContactLost]=useState(true),[actual,setActual]=useState(''),[load,setLoad]=useState(''),[review,setReview]=useState(null)
 const recordRef=useRef(null),pending=useRef(false),generation=useRef(0),readPending=useRef(false),onlineRef=useRef(online)
 onlineRef.current=online
 function publish(next){recordRef.current=next;setRecord(next);onSnapshot?.(next?.snapshot)}
 useEffect(()=>{
  let alive=true
  async function refresh(){
   if(!onlineRef.current||pending.current||readPending.current)return
   readPending.current=true
   const seq=++generation.current,started=performance.now()
   try{const r=await adapter.read();if(!alive||seq!==generation.current||pending.current)return
    if(r.issue||!r.snapshot){setContactLost(true);setIssue(r.issue||'Økta er ikkje tilgjengeleg.');return}
    const next=acceptSynchronSnapshot(recordRef.current,r.snapshot,performance.now(),started)
    if(next!==recordRef.current){publish(next);setContactLost(false);setIssue('')}else{setContactLost(true);setIssue('Ugyldig eller utdaterte øktdata. Ventar på stadfesting.')}
   }catch{if(alive&&seq===generation.current){setContactLost(true);setIssue('Mista kontakt med økta.')}}finally{readPending.current=false}
  }
  refresh()
  const poll=setInterval(refresh,900),clock=setInterval(()=>setTick(performance.now()),200)
  return()=>{alive=false;generation.current++;clearInterval(poll);clearInterval(clock)}
 },[adapter])
 const now=Math.max(tick,record?.receivedAt??0)
 const c=synchronControls(record,{now,online:online&&!contactLost,busy}),s=record?.snapshot,m=s?.movements?.[c?.stage]
 async function act(type,fields={}){
  if(pending.current||!onlineRef.current||contactLost)return
  pending.current=true;generation.current++;setBusy(true);setIssue('')
  try{
   const r=await submitSynchronAction(recordRef.current,type,fields,crypto.randomUUID(),{read:adapter.read,command:adapter.command,now:()=>performance.now(),online:()=>onlineRef.current})
   if(r.record)publish(r.record)
   if(r.uncertain)setContactLost(true)
   if(r.issue)setIssue(r.issue)
   else {setReview(null);setActual('');if(type==='load')setLoad('')}
  }finally{pending.current=false;setBusy(false)}
 }
 if(!s||!c||!m)return <section className="gg-synchron-panel engine-timer"><strong>{label}</strong><p role="status">{issue||'Koplar til økta …'}</p></section>
 const reviewType=review?.stage===c.stage?review.type:null
 const active=c.active===null?'Ingen arbeider':'Utøvar '+c.active
 const role=c.phase==='finished'?'FERDIG':c.phase==='countdown'?'GJER DEG KLAR':c.phase==='paused'?'PAUSE':c.role==='work'?'ARBEID':c.role==='rest'?'KVILE':c.role==='invited'?'INVITERT':c.role==='leader'&&c.phase==='running'?'ØKTLEIAR':'VENTAR'
 const first=s.participants?.find(p=>p.joined&&p.slot===1)?.id
 const canSubmit=actual.trim()!==''&&/^\d+$/.test(actual)&&Number(actual)<=100000
 return <section className="gg-synchron-panel engine-timer timer-customized" aria-label={label}>
  <div className="timer-caption">{label} · {s.title}</div>
  <div className="gg-sync-status"><span>{s.joinedCount}/{s.participantCount} klare</span><span>{c.stale?'Fråkopla / utdaterte data':'Tilkopla'}</span></div>
  <div className="timer-center">
   <div className="timer-phase">{role}</div>
   <TimerClockFace value={c.phase==='countdown'?c.countdown:c.elapsed}/>
   <small>{c.phase==='countdown'?'START OM':'MEDGÅTT TID'}{c.waitingForStart?' · ventar på stadfesting':''}</small>
   <div className="timer-active-under-clock"><span>ØVING {c.stage+1}/{s.movements.length}</span><b>{m.name} · {m.target} {unitLabel[m.unit]}</b></div>
   <small>{active}{s.ownDose?' · '+s.ownDose.variant+(s.ownDose.loadKg!==null?' · '+s.ownDose.loadKg+' kg':''):''}</small>
   {s.isMember&&<small>Di registrerte arbeidsbolktid: {Math.floor(s.ownAssignedSeconds??0)} sek</small>}
  </div>
  {c.stale&&<p role="status">Klokka er lokal visning. Handlingar er låste fram til ny stadfesting.</p>}
  {issue&&<p role="alert">{issue}</p>}
  {c.phase==='ready'&&<div className="gg-sync-actions">
    {s.isMember&&!s.joined&&<button className="primary-button" disabled={!c.canJoin} onClick={()=>act('join')}>Delta i økta</button>}
    <button className={s.leader?'primary-button':'secondary-button'} disabled={!c.canStart||!first} onClick={()=>act('start',{memberId:first})}>{s.leader?'Start':'Start · ventar på PT'}</button>
  </div>}
  {['countdown','running','paused'].includes(c.phase)&&<div className="gg-sync-actions">
   {s.isMember&&<button className="primary-button gg-sync-takeover" disabled={!c.canTakeover} onClick={()=>act('takeover')}>{c.role==='work'?'Du arbeider':'Ta over'}</button>}
   {(c.role==='work'||s.leader)&&<button className="secondary-button" disabled={!c.canIdle} onClick={()=>act('idle')}>Ingen arbeider</button>}
   {s.leader&&<><button className="secondary-button" disabled={!(c.canPause||c.canResume)} onClick={()=>act(c.phase==='paused'?'resume':'pause')}>{c.phase==='paused'?'Gjenoppta':'Pause'}</button>
   {c.stage<s.movements.length-1&&<button className="secondary-button" disabled={!c.canAdvance} onClick={()=>{setReview({type:'advance',stage:c.stage});setActual('')}}>Neste øving</button>}
   <button className="secondary-button" disabled={!c.canFinish} onClick={()=>{setReview({type:'finish',stage:c.stage});setActual('')}}>{c.stage<s.movements.length-1?'Avbryt økta':'Avslutt økta'}</button></>}
  </div>}
  {reviewType&&s.leader&&<section className="gg-sync-review" aria-label="Stadfest lagresultat"><strong>{reviewType==='advance'?'Neste øving':'Avslutt økta'} · faktisk lagresultat</strong><label>{m.name} ({unitLabel[m.unit]})<input type="number" min="0" max="100000" step="1" inputMode="numeric" value={actual} onChange={e=>setActual(e.target.value)} placeholder="Faktisk mengd"/></label><div className="gg-sync-actions"><button className="primary-button" disabled={!canSubmit||c.actionsLocked||!(reviewType==='advance'?c.canAdvance:c.canFinish)} onClick={()=>act(reviewType,{actual:Number(actual),...(reviewType==='finish'&&c.stage<s.movements.length-1?{abort:true}:{})})}>Stadfest</button><button className="secondary-button" disabled={c.actionsLocked||!(reviewType==='advance'?c.canAdvance:c.canFinish)} onClick={()=>act(reviewType,{actual:null,...(reviewType==='finish'&&c.stage<s.movements.length-1?{abort:true}:{})})}>Ukjend mengd</button><button className="secondary-button" onClick={()=>setReview(null)}>Tilbake</button></div><small>Planlagt mål blir aldri automatisk registrert som utført.</small></section>}
  {c.phase==='running'&&s.isMember&&<details><summary>Endra eiga belastning</summary><label>Ny vekt (kg)<input type="number" min="0" step="any" inputMode="decimal" value={load} onChange={e=>setLoad(e.target.value)}/></label><button className="secondary-button" disabled={!c.canLoad||load.trim()===''||!Number.isFinite(Number(load))||Number(load)<0} onClick={()=>act('load',{loadKg:Number(load)})}>Stadfest ny vekt</button></details>}
  {c.phase==='finished'&&<><section><strong>Lagresultat · ikkje lagra i treningslogg</strong>{s.movements.map(x=><p key={x.id}>{x.name}: {s.totals[x.id]?.actual??'Ikkje registrert'} {unitLabel[x.unit]}</p>)}</section>{s.review&&<SynchronResultReview review={s.review} controls={c} onAction={act}/>} {s.calibration&&<SynchronCalibrationReview calibration={s.calibration} revision={s.revision} controls={c} onAction={act}/>}</>}
 </section>
}
