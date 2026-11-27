import React,{useMemo,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {createSynchronInvitationGateway,openSynchronInvitation} from './lib/synchronInvitations.js'
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
 const [prepared,setPrepared]=useState(null),[online,setOnline]=useState(true),[opened,setOpened]=useState({}),[errors,setErrors]=useState({})
 const creation=useMemo(()=>{let record=null;const creator=createSynchronInvitationGateway({authenticate:async key=>key,readCoachContext:async actor=>({canCoach:actor==='demo-a',eligibleMemberIds:members.map(m=>m.id)}),readWod:async id=>id===wod.id?wod:null,readCreation:async id=>record?.state.plan.id===id?record:null,createAtomic:async next=>{if(record)return false;record=next;return true}});return {creator,getRecord:()=>record}},[])
 const adapters=useMemo(()=>prepared?fixture(prepared.state):[],[prepared])
 async function prepare(request){
  const result=await creation.creator.create('demo-a',request)
  if(!result.issue&&result.sessionId){setPrepared(creation.getRecord())}
  return result
 }
 async function open(actor,adapter){
  const invite=prepared.invitations.find(i=>i.recipientId===actor)
  if(!invite||!online){setErrors(e=>({...e,[actor]:'Ingen tilkopling. Prøv igjen.'}));return}
  const result=await openSynchronInvitation(invite.href,{readSnapshot:()=>adapter.read()})
  if(result.issue)setErrors(e=>({...e,[actor]:result.issue}))
  else {setOpened(e=>({...e,[actor]:true}));setErrors(e=>({...e,[actor]:''}))}
 }
 return <main className="gg-sync-preview"><h1>SYNCHRON · utviklingstest</h1><p>Simulerte deltakarar, syntetiske kalibreringar. Ingen ekte brukarar, varsel, nettverk eller treningslogg.</p>{!prepared?<SynchronPreparation wods={[wod]} members={members} leaderId="demo-a" initialMemberId="demo-b" onPrepare={prepare}/>:<><p>{prepared.invitations.length} simulerte invitasjonar. Kunden opnar varselet og stadfestar deltaking i timeren.</p><button className="secondary-button" onClick={()=>setOnline(v=>!v)}>{online?'Simuler nettutfall for kundane':'Kople kundane til att'}</button><div className="gg-sync-preview-grid">{adapters.map(({actor,adapter})=>actor==='demo-a'||opened[actor]?<SynchronSessionPanel key={actor} adapter={adapter} label={actor==='demo-a'?'PT · øktleiar':members.find(m=>m.id===actor)?.display_name} online={actor==='demo-a'||online}/>:<section key={actor} className="gg-sync-review"><strong>{members.find(m=>m.id===actor)?.display_name} · innboks</strong><p>Invitasjon frå PT · {prepared.state.plan.title}</p><button className="primary-button" disabled={!online} onClick={()=>open(actor,adapter)}>Delta i økta</button>{errors[actor]&&<p role="alert">{errors[actor]}</p>}</section>)}</div></>}</main>
}
if(import.meta.env.DEV)createRoot(document.getElementById('root')).render(<Demo/>)
