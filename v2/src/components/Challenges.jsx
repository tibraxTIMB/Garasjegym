import {DnaDateTimeInput} from './DesignDNA.jsx'
import {useEffect,useState} from 'react'
import {CheckCircle2,Flag,LoaderCircle,Plus,Target,Trophy} from 'lucide-react'
import {supabase} from '../lib/supabase.js'
import {isStaff} from '../lib/auth.js'

const METRICS=[
 {value:'workouts',label:'Økter',unit:'økter'},
 {value:'reps',label:'Repetisjonar',unit:'reps'},
 {value:'kg',label:'Kilo',unit:'kg'},
 {value:'km',label:'Kilometer',unit:'km'},
 {value:'minutes',label:'Minutt',unit:'min'},
]
const dateValue=(date)=>{const d=new Date(date.getTime()-date.getTimezoneOffset()*60000);return d.toISOString().slice(0,10)}
const addDays=(date,days)=>{const d=new Date(date);d.setDate(d.getDate()+days);return d}

export default function Challenges({profile}){
 const staff=isStaff(profile)
 const [challenges,setChallenges]=useState([])
 const [participants,setParticipants]=useState([])
 const [members,setMembers]=useState([])
 const [drafts,setDrafts]=useState({})
 const [loading,setLoading]=useState(true)
 const [busy,setBusy]=useState('')
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [showCreate,setShowCreate]=useState(false)
 const [title,setTitle]=useState('')
 const [description,setDescription]=useState('')
 const [metric,setMetric]=useState('workouts')
 const [goal,setGoal]=useState('10')
 const [startsOn,setStartsOn]=useState(dateValue(new Date()))
 const [endsOn,setEndsOn]=useState(dateValue(addDays(new Date(),14)))

 async function load(silent=false){
  if(!silent)setLoading(true)
  setError('')
  const [c,p]=await Promise.all([
   supabase.from('challenges').select('id,title,description,metric,goal,starts_on,ends_on,is_active,created_at').order('starts_on',{ascending:false}),
   supabase.from('challenge_participants').select('id,challenge_id,member_id,progress,note,joined_at').order('progress',{ascending:false})
  ])
  if(c.error)setError(c.error.message);else setChallenges(c.data||[])
  if(p.error)setError(p.error.message);else setParticipants(p.data||[])
  if(staff){
   const {data,error:e}=await supabase.from('profiles').select('id,display_name').eq('active',true).order('display_name')
   if(e)setError(e.message);else setMembers(data||[])
  }
  setLoading(false)
 }
 useEffect(()=>{load();const refresh=setInterval(()=>load(true),60000);return()=>clearInterval(refresh)},[])
 async function create(event){
  event.preventDefault();setBusy('create');setError('');setNotice('')
  try{
   if(new Date(endsOn+'T12:00:00')<new Date(startsOn+'T12:00:00'))throw new Error('Sluttdato må vera etter startdato.')
   const {data:{user}}=await supabase.auth.getUser()
   const {error:e}=await supabase.from('challenges').insert({title:title.trim(),description:description.trim(),metric,goal:Number(goal),starts_on:startsOn,ends_on:endsOn,created_by:user.id,is_active:true})
   if(e)throw e
   setTitle('');setDescription('');setGoal('10');setShowCreate(false);setNotice('Utfordringa er publisert.');await load()
  }catch(e){setError(e.message||'Kunne ikkje oppretta utfordringa.')}
  finally{setBusy('')}
 }
 async function join(challenge){
  setBusy('join-'+challenge.id);setError('');setNotice('')
  try{
   const {data:{user}}=await supabase.auth.getUser()
   const {error:e}=await supabase.from('challenge_participants').insert({challenge_id:challenge.id,member_id:user.id,progress:0})
   if(e)throw e
   setNotice('Du er med i utfordringa!');await load()
  }catch(e){setError(e.message||'Kunne ikkje melda deg på.')}
  finally{setBusy('')}
 }
 async function saveProgress(entry){
  const draft=drafts[entry.id]||{}
  const value=Number(draft.progress??entry.progress)
  if(!Number.isFinite(value)||value<0){setError('Framgang må vera eit tal på null eller meir.');return}
  setBusy('progress-'+entry.id);setError('');setNotice('')
  try{
   const {error:e}=await supabase.from('challenge_participants').update({progress:value,note:(draft.note??entry.note??'').trim(),updated_at:new Date().toISOString()}).eq('id',entry.id)
   if(e)throw e
   setParticipants(v=>v.map(row=>row.id===entry.id?{...row,progress:value,note:(draft.note??entry.note??'').trim()}:row))
   setNotice('Framgangen er oppdatert.')
  }catch(e){setError(e.message||'Kunne ikkje lagra framgangen.')}
  finally{setBusy('')}
 }
 async function toggleActive(challenge){
  setBusy('active-'+challenge.id);setError('');setNotice('')
  try{
   const {error:e}=await supabase.from('challenges').update({is_active:!challenge.is_active}).eq('id',challenge.id)
   if(e)throw e
   setChallenges(v=>v.map(row=>row.id===challenge.id?{...row,is_active:!row.is_active}:row))
   setNotice(challenge.is_active?'Utfordringa er arkivert.':'Utfordringa er aktivert.')
  }catch(e){setError(e.message||'Kunne ikkje endra status.')}
  finally{setBusy('')}
 }
 if(loading)return <div className="training-state"><LoaderCircle className="spin" size={20}/> Hentar utfordringar …</div>
 return <div className="challenge-module">
  <div className="training-heading"><div><div className="section-kicker">GARASJEGYM · FELLESSKAP</div><h3>Utfordringar</h3></div>{staff&&<button className="secondary-button" onClick={()=>setShowCreate(v=>!v)}><Plus size={15}/> Ny utfordring</button>}</div>
  {error&&<div className="auth-error" role="alert">{error}</div>}
  {notice&&<div className="auth-message" role="status"><CheckCircle2 size={15}/>{notice}</div>}
  {showCreate&&staff&&<form className="booking-create" onSubmit={create}>
   <h4>Opprett utfordring</h4>
   <label>Namn<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={100} required placeholder="Til dømes 10 økter i november"/></label>
   <label>Skildring<textarea value={description} onChange={e=>setDescription(e.target.value)} rows="2" maxLength={1000}/></label>
   <div className="engine-fields"><label>Måltype<select value={metric} onChange={e=>setMetric(e.target.value)}>{METRICS.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></label><label>Mål<input type="number" min="0.01" step="0.01" value={goal} onChange={e=>setGoal(e.target.value)} required/></label></div>
   <div className="engine-fields"><label>Startdato<DnaDateTimeInput type="date" value={startsOn} onChange={e=>setStartsOn(e.target.value)} required/></label><label>Sluttdato<DnaDateTimeInput type="date" value={endsOn} onChange={e=>setEndsOn(e.target.value)} required/></label></div>
   <button className="primary-button" disabled={busy==='create'}>{busy==='create'?'Publiserer …':'Publiser utfordring'}</button>
  </form>}
  {challenges.length?challenges.map(challenge=>{
   const metricInfo=METRICS.find(x=>x.value===challenge.metric)||METRICS[0]
   const entry=participants.find(p=>p.challenge_id===challenge.id&&p.member_id===profile.id)
   const team=participants.filter(p=>p.challenge_id===challenge.id)
   const now=dateValue(new Date())
   const ended=challenge.ends_on<now
   const started=challenge.starts_on<=now
   const pct=entry?Math.min(100,Math.round(Number(entry.progress)/Number(challenge.goal)*100)):0
   return <article className="challenge-card" key={challenge.id}>
    <div className="challenge-card-head"><div className="challenge-icon"><Flag size={19}/></div><div className="challenge-title"><strong>{challenge.title}</strong><small>{challenge.starts_on} – {challenge.ends_on} · {ended?'Avslutta':started?'Pågår':'Startar snart'}</small></div>{staff&&<button className="secondary-button" disabled={busy==='active-'+challenge.id} onClick={()=>toggleActive(challenge)}>{challenge.is_active?'Arkiver':'Aktiver'}</button>}</div>
    {challenge.description&&<p>{challenge.description}</p>}
    <div className="challenge-goal"><span><Target size={15}/> Mål: {challenge.goal} {metricInfo.unit}</span><span>{staff?`${team.length} deltakar${team.length===1?'':'ar'}`:entry?'Du deltek':'Bli med'}</span></div>
    {entry?<div className="challenge-progress">
     <div className="challenge-progress-top"><strong>Din framgang</strong><b>{entry.progress} / {challenge.goal} {metricInfo.unit}</b></div>
     <div className="challenge-progress-track"><span style={{width:pct+'%'}}/></div>
     {!ended&&started&&<div className="challenge-progress-form"><label>Registrer framgang<input type="number" min="0" step="0.01" value={drafts[entry.id]?.progress??entry.progress} onChange={e=>setDrafts(v=>({...v,[entry.id]:{...v[entry.id],progress:e.target.value}}))}/></label><label>Notat<input value={drafts[entry.id]?.note??entry.note??''} onChange={e=>setDrafts(v=>({...v,[entry.id]:{...v[entry.id],note:e.target.value}}))} placeholder="Valfritt"/></label><button className="secondary-button" disabled={busy==='progress-'+entry.id} onClick={()=>saveProgress(entry)}>Lagra</button></div>}
     {entry.note&&<small>{entry.note}</small>}
    </div>:<div className="challenge-join">{ended?'Utfordringa er avslutta.':challenge.is_active?<button className="primary-button" disabled={busy==='join-'+challenge.id||!started&&challenge.starts_on<now} onClick={()=>join(challenge)}>{busy==='join-'+challenge.id?'Meldar på …':'Bli med'}</button>:<span>Utfordringa er ikkje aktiv.</span>}</div>}
    {staff&&team.length>0&&<div className="challenge-team"><strong><Trophy size={14}/> Deltakaroversikt</strong>{team.map(person=><div key={person.id}><span>{members.find(m=>m.id===person.member_id)?.display_name||'Medlem'}</span><b>{person.progress} {metricInfo.unit}</b></div>)}</div>}
   </article>
  }):<div className="empty-state">Ingen utfordringar er publiserte enno.</div>}
 </div>
}
