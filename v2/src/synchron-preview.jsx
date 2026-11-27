import React,{useMemo,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {prepareSynchronLobby} from './lib/synchronPreparation.js'
import {createSynchronGateway} from './lib/synchronTransport.js'
import SynchronSessionPanel from './components/SynchronSessionPanel.jsx'
import SynchronPreparation from './components/SynchronPreparation.jsx'
import './styles.css'
import './components/timer-viewport.css'
const moves=[['step','Box step-ups',{reps:100}],['hang','Dead hang',{durationSeconds:180}],['wall','Wall ball shots',{reps:150}],['row','Row',{distanceMeters:2000}]]
const wod={id:'four-fronts-test',name:'Four Fronts',format:'Chipper',is_published:true,timer_settings:{workout_schema:{items:moves.map(([exercise_id,exercise_name,rx])=>({exercise_id,exercise_name,levels:{rx}}))}}}
const members=[{id:'demo-b',display_name:'Kunde 1'},{id:'demo-c',display_name:'Kunde 2'}]
// Development fixture only; no genuine auth, notifications or writes.
function fixture(state){
 const plan=state.plan,clone=x=>JSON.parse(JSON.stringify(x))
 const calibrations=plan.movements.flatMap(m=>plan.members.flatMap((memberId,i)=>m.unit==='reps'||m.unit==='meters'?[{memberId,exerciseId:m.exerciseId,variant:m.doses[memberId].variant,loadKg:m.doses[memberId].loadKg,unit:m.unit,source:'observed',perMinute:m.unit==='meters'?(i===0?230:200):(i===0?22:18)}]:[]))
 const gateway=createSynchronGateway({readCalibrations:async()=>calibrations,authenticate:async key=>[plan.leaderId,...plan.members].includes(key)?key:null,read:async id=>id===plan.id?clone(state):null,compareAndSwap:async(id,rev,next)=>{if(id!==plan.id||rev!==state.revision)return false;state=clone(next);return true},now:()=>Date.now()})
 return [...new Set([plan.leaderId,...plan.members])].map(actor=>({actor,adapter:{read:()=>gateway.snapshot(plan.id,actor),command:cmd=>gateway.command(plan.id,actor,cmd)}}))
}
function Demo(){
 const [prepared,setPrepared]=useState(null),[online,setOnline]=useState(true)
 const adapters=useMemo(()=>prepared?fixture(prepared.state):[],[prepared])
 function prepare(request){
  if(request.wodId!==wod.id)return {issue:'Ukjend WOD.'}
  const result=prepareSynchronLobby({...request,wod},{actorId:'demo-a',canCoach:true,eligibleMemberIds:members.map(m=>m.id)})
  if(result.issue)return result
  setPrepared(result);return {sessionId:result.state.plan.id}
 }
 return <main className="gg-sync-preview"><h1>SYNCHRON · utviklingstest</h1><p>Simulerte deltakarar, syntetiske kalibreringar. Ingen ekte brukarar, varsel, nettverk eller treningslogg.</p>{!prepared?<SynchronPreparation wods={[wod]} members={members} leaderId="demo-a" initialMemberId="demo-b" onPrepare={prepare}/>:<><p>{prepared.invitations.length} simulerte invitasjonar. Kunden vel Delta i økta.</p><button className="secondary-button" onClick={()=>setOnline(v=>!v)}>{online?'Simuler nettutfall for kundane':'Kople kundane til att'}</button><div className="gg-sync-preview-grid">{adapters.map(({actor,adapter})=><SynchronSessionPanel key={actor} adapter={adapter} label={actor==='demo-a'?'PT · øktleiar':members.find(m=>m.id===actor)?.display_name} online={actor==='demo-a'||online}/>)}</div></>}</main>
}
if(import.meta.env.DEV)createRoot(document.getElementById('root')).render(<Demo/>)
