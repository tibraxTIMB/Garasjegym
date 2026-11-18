import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowRight, CalendarDays, CheckCircle2, ClipboardList, Dumbbell, Flag, MessageSquareText, Plus, RefreshCw, Target, UserRound, X } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { isStaff } from '../lib/auth.js'

const GOALS = ['Bli sterkare','Betre kondisjon og uthald','Auka muskelmasse','Gå ned i vekt','Meir energi og overskot','Betre mobilitet','Betre teknikk','Koma i gang med trening','Førebyggja plager','Prestera betre i idrett']
const FOCUS = ['Styrke','Kondisjon','Mobilitet','Kjernestabilitet','Teknikk','Uthald','Eksplosivitet','Generell helse','Rehabilitering']
const CHECK_QUESTIONS = ['Korleis opplever du framgangen sidan sist?','Kva fungerer best i treninga no?','Kva har vore mest utfordrande?','Har måla dine endra seg?','Kva ønskjer du å fokusera på vidare?','Er treningsmengda passeleg?']

function Field({label,children,wide=false}) { return <div className={wide?'pt2-field pt2-wide':'pt2-field'}><span>{label}</span>{children}</div> }
function Pill({children,tone=''}) { return <span className={'pt2-pill '+tone}>{children}</span> }
function Empty({children}) { return <div className="pt2-empty">{children}</div> }
function dateLabel(value) { return value ? new Date(value).toLocaleDateString('nn-NO',{day:'numeric',month:'short',year:'numeric'}) : 'Ikkje sett' }

export default function PTStudio({ profile, onLaunchWorkout }) {
 const staff = isStaff(profile)
 const [loading,setLoading] = useState(true)
 const [busy,setBusy] = useState(false)
 const [error,setError] = useState('')
 const [notice,setNotice] = useState('')
 const [members,setMembers] = useState([])
 const [clientId,setClientId] = useState('')
 const [intakes,setIntakes] = useState([])
 const [goals,setGoals] = useState([])
 const [templates,setTemplates] = useState([])
 const [programs,setPrograms] = useState([])
 const [sessions,setSessions] = useState([])
 const [checkins,setCheckins] = useState([])
 const [wods,setWods] = useState([])
 const [tab,setTab] = useState('oversikt')
 const [showIntake,setShowIntake] = useState(false)
 const [showGoal,setShowGoal] = useState(false)
 const [showTemplate,setShowTemplate] = useState(false)
 const [showProgram,setShowProgram] = useState(false)
 const [showSession,setShowSession] = useState(false)
 const [showCheckin,setShowCheckin] = useState(false)
 const [intake,setIntake] = useState({goals:[],primary_goal:'',reason:'',level:'Noko erfaring',frequency:'1–2 dagar',preferred_training:[],avoid:'',weekly_days:'3',constraints:'',commitment:'',expectations:'',desired_outcome:''})
 const [goalDraft,setGoalDraft] = useState({area:'Styrke',title:'',baseline:'',target:'',unit:'',target_date:''})
 const [templateDraft,setTemplateDraft] = useState({title:'',description:'',weeks:'6',sessions_per_week:'3',focus_areas:[],session_titles:'Økt 1 – Introduksjon\nØkt 2 – Grunnstyrke\nØkt 3 – Kondisjon'})
 const [programDraft,setProgramDraft] = useState({template_id:'',title:'',start_date:new Date().toISOString().slice(0,10),notes:''})
 const [sessionDraft,setSessionDraft] = useState({title:'',wod_id:'',scheduled_date:'',notes:''})
 const [checkinAnswers,setCheckinAnswers] = useState({})
 const [checkinTitle,setCheckinTitle] = useState('Status etter treningsperiode')
 const [clientNote,setClientNote] = useState('')

 const selectedMember = members.find(m=>m.id===clientId)
 const currentIntake = intakes.filter(x=>x.member_id===clientId).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0]
 const activeProgram = programs.filter(p=>p.client_id===clientId&&p.status==='active').sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0]
 const clientGoals = goals.filter(g=>g.member_id===clientId)
 const clientSessions = sessions.filter(s=>s.program_id===activeProgram?.id).sort((a,b)=>a.sequence_no-b.sequence_no)
 const pendingCheckin = checkins.find(c=>c.member_id===profile.id&&c.status==='pending')
 const myPrograms = programs.filter(p=>p.client_id===profile.id)
 const myGoals = goals.filter(g=>g.member_id===profile.id&&g.is_visible)
 const myCheckins = checkins.filter(c=>c.member_id===profile.id)

 async function load() {
  setError('')
  const results = await Promise.all([
   staff ? supabase.from('profiles').select('id,display_name,role').eq('active',true).order('display_name') : Promise.resolve({data:[],error:null}),
   supabase.from('pt_intakes').select('*').order('created_at',{ascending:false}).limit(300),
   supabase.from('pt_client_goals').select('*').order('created_at',{ascending:false}),
   supabase.from('pt_program_templates').select('*').eq('is_active',true).order('title'),
   supabase.from('pt_programs').select('*').order('created_at',{ascending:false}),
   supabase.from('pt_program_sessions').select('*').order('sequence_no'),
   supabase.from('pt_checkins').select('*').order('created_at',{ascending:false}),
   supabase.from('wods').select('id,name,format,duration_minutes,movements,notes').eq('is_published',true).eq('is_archived',false).order('name')
  ])
  const labels=['medlemslista','innmeldingar','mål','introprogram','treningsplanar','planøkter','statussjekkar','WOD-bibliotek']
  results.forEach((r,i)=>{if(r.error&&i!==0)setError(labels[i]+': '+r.error.message)})
  if(results[0].data)setMembers(results[0].data)
  setIntakes(results[1].data||[]);setGoals(results[2].data||[]);setTemplates(results[3].data||[])
  setPrograms(results[4].data||[]);setSessions(results[5].data||[]);setCheckins(results[6].data||[]);setWods(results[7].data||[])
  if(staff&&results[0].data?.length)setClientId(v=>v||results[0].data[0].id)
  setLoading(false)
 }
 useEffect(()=>{load()},[])
 useEffect(()=>{if(!staff)setClientId(profile.id)},[staff,profile.id])

 async function run(action) {
  setBusy(true);setError('');setNotice('')
  try { await action(); await load() }
  catch(e) { setError(e.message||'Kunne ikkje lagra endringa.') }
  finally { setBusy(false) }
 }
 async function submitIntake(e) {
  e.preventDefault()
  await run(async()=>{
   if(!intake.goals.length||!intake.reason.trim()||!intake.expectations.trim())throw new Error('Vel minst eitt mål og fyll ut kvifor du ønskjer PT og kva du forventar.')
   const {error:e}=await supabase.from('pt_intakes').insert({...intake,member_id:profile.id,weekly_days:Number(intake.weekly_days),status:'new'})
   if(e)throw e
   setShowIntake(false);setIntake({goals:[],primary_goal:'',reason:'',level:'Noko erfaring',frequency:'1–2 dagar',preferred_training:[],avoid:'',weekly_days:'3',constraints:'',commitment:'',expectations:'',desired_outcome:''})
   setNotice('Innmeldinga er sendt til PT-studioet.')
  })
 }
 async function saveGoal(e) {
  e.preventDefault()
  await run(async()=>{
   if(!goalDraft.title.trim())throw new Error('Skriv inn eit konkret mål.')
   const {error:e}=await supabase.from('pt_client_goals').insert({...goalDraft,member_id:clientId,created_by:profile.id,is_visible:true,target_date:goalDraft.target_date||null})
   if(e)throw e
   setShowGoal(false);setGoalDraft({area:'Styrke',title:'',baseline:'',target:'',unit:'',target_date:''});setNotice('Målet er lagt til på kunden.')
  })
 }
 async function saveTemplate(e) {
  e.preventDefault()
  await run(async()=>{
   const lines=templateDraft.session_titles.split('\n').map(x=>x.trim()).filter(Boolean)
   if(!templateDraft.title.trim()||!lines.length)throw new Error('Programmet må ha namn og minst éi økt.')
   const {error:e}=await supabase.from('pt_program_templates').insert({title:templateDraft.title.trim(),description:templateDraft.description,weeks:Number(templateDraft.weeks),sessions_per_week:Number(templateDraft.sessions_per_week),focus_areas:templateDraft.focus_areas,sessions:lines.map((title,index)=>({title,sequence_no:index+1})),created_by:profile.id})
   if(e)throw e
   setShowTemplate(false);setNotice('Introprogrammet er lagra i biblioteket.')
  })
 }
 async function createProgram(e) {
  e.preventDefault()
  await run(async()=>{
   const template=templates.find(t=>t.id===programDraft.template_id)
   if(!template||!clientId)throw new Error('Vel kunde og introprogram.')
   const {data:program,error:e}=await supabase.from('pt_programs').insert({client_id:clientId,template_id:template.id,title:programDraft.title.trim()||template.title,description:template.description,start_date:programDraft.start_date||null,weeks:template.weeks,focus_areas:template.focus_areas,status:'active',created_by:profile.id,coach_notes:programDraft.notes}).select().single()
   if(e)throw e
   const rows=(template.sessions||[]).map((s,index)=>({program_id:program.id,sequence_no:index+1,title:s.title,workout_snapshot:{title:s.title,format:'',movements:[],notes:'Tilpass økta for kunden'},status:'planned'}))
   if(rows.length){const {error:se}=await supabase.from('pt_program_sessions').insert(rows);if(se)throw se}
   setShowProgram(false);setProgramDraft({template_id:'',title:'',start_date:new Date().toISOString().slice(0,10),notes:''});setNotice('Treningsplanen er oppretta og tildelt kunden.')
  })
 }
 async function addSession(e) {
  e.preventDefault()
  await run(async()=>{
   if(!activeProgram)throw new Error('Kunden må ha ein aktiv treningsplan.')
   const wod=wods.find(w=>w.id===sessionDraft.wod_id)
   const existing=sessions.filter(s=>s.program_id===activeProgram.id)
   const snapshot=wod?{id:wod.id,title:wod.name,format:wod.format,duration_minutes:wod.duration_minutes,movements:wod.movements,notes:wod.notes}: {title:sessionDraft.title,format:'Eigen økt',movements:[],notes:sessionDraft.notes}
   const {error:e}=await supabase.from('pt_program_sessions').insert({program_id:activeProgram.id,sequence_no:existing.length+1,title:sessionDraft.title.trim()||wod?.name||'Ny økt',wod_id:wod?.id||null,scheduled_date:sessionDraft.scheduled_date||null,workout_snapshot:snapshot,coach_note:sessionDraft.notes,status:'planned'})
   if(e)throw e
   setShowSession(false);setSessionDraft({title:'',wod_id:'',scheduled_date:'',notes:''});setNotice('Økta er lagt sist i treningsrekkja.')
  })
 }
 async function sendCheckin(e) {
  e.preventDefault()
  await run(async()=>{
   const questions=CHECK_QUESTIONS
   const {error:e}=await supabase.from('pt_checkins').insert({member_id:clientId,created_by:profile.id,title:checkinTitle,questions,status:'pending'})
   if(e)throw e
   setShowCheckin(false);setNotice('Statussjekken er sendt til kunden.')
  })
 }
 async function answerCheckin(e) {
  e.preventDefault()
  await run(async()=>{
   const row=pendingCheckin
   if(!row)throw new Error('Ingen statussjekk ventar.')
   if(row.questions.some((q,i)=>!String(checkinAnswers[i]||'').trim()))throw new Error('Svar på alle spørsmåla før innsending.')
   const {error:e}=await supabase.from('pt_checkins').update({answers:checkinAnswers,status:'submitted',submitted_at:new Date().toISOString()}).eq('id',row.id)
   if(e)throw e
   setCheckinAnswers({});setNotice('Statussvaret er sendt til PT-en.')
  })
 }
 async function reviewIntake(row) {
  await run(async()=>{const {error:e}=await supabase.from('pt_intakes').update({status:'reviewed',reviewed_by:profile.id,reviewed_at:new Date().toISOString()}).eq('id',row.id);if(e)throw e;setNotice('Innmeldinga er markert som vurdert.')})
 }
 async function reviewCheckin(row) {
  await run(async()=>{const {error:e}=await supabase.from('pt_checkins').update({status:'reviewed',reviewed_at:new Date().toISOString()}).eq('id',row.id);if(e)throw e;setNotice('Statussvaret er markert som gjennomgått.')})
 }
 async function moveSession(session,direction) {
  const rows=clientSessions;const index=rows.findIndex(x=>x.id===session.id);const next=rows[index+direction];if(!next)return;
  await run(async()=>{
   const {error:e1}=await supabase.from('pt_program_sessions').update({sequence_no:-1}).eq('id',session.id);if(e1)throw e1;
   const {error:e2}=await supabase.from('pt_program_sessions').update({sequence_no:session.sequence_no}).eq('id',next.id);if(e2)throw e2;
   const {error:e3}=await supabase.from('pt_program_sessions').update({sequence_no:next.sequence_no}).eq('id',session.id);if(e3)throw e3;
   setNotice('Rekkjefølgja er oppdatert.')
  })
 }
 async function markSession(session,status) {
  await run(async()=>{
   const update=status==='completed'?{status,completed_at:new Date().toISOString()}:{status}
   const {error:e}=await supabase.from('pt_program_sessions').update(update).eq('id',session.id)
   if(e)throw e
   setNotice(status==='completed'?'Økta er markert som gjennomført.':'Økta er oppdatert.')
  })
 }
 if(loading)return <div className="training-state">Hentar PT-oppfølging …</div>

 return <div className="pt2">
  <header className="pt2-head">
   <div><div className="section-kicker">GARASJEGYM · {staff?'PT-STUDIO':'MI PT-OPPFØLGING'}</div><h2>{staff?'Kundeoppfølging':'Mi PT-oppfølging'}</h2><p>{staff?'Kundar, mål, introprogram og treningsløp samla.':'Treningsplanen din, måla dine og utviklinga di.'}</p></div>
   {!staff&&<button className="primary-button" onClick={()=>setShowIntake(v=>!v)}><Plus size={16}/> Ny PT-innmelding</button>}
  </header>
  {error&&<div className="auth-error">{error}</div>}{notice&&<div className="auth-message"><CheckCircle2 size={15}/> {notice}</div>}
  {!staff&&showIntake&&<form className="pt2-panel pt2-form" onSubmit={submitIntake}>
   <div className="pt2-panel-head"><div><span className="section-kicker">KOM I GANG</span><h3>Fortel oss kva du ønskjer hjelp til</h3><p>Kort innmelding – PT-en går gjennom svara før de lagar ein plan saman.</p></div><button type="button" className="icon-button" onClick={()=>setShowIntake(false)}><X size={17}/></button></div>
   <div className="pt2-form-grid">
    <Field label="Kva ønskjer du å oppnå?" wide><div className="pt2-check-grid">{GOALS.map(g=><label key={g} className="pt2-check"><input type="checkbox" checked={intake.goals.includes(g)} onChange={e=>setIntake(v=>({...v,goals:e.target.checked?[...v.goals,g]:v.goals.filter(x=>x!==g)}))}/>{g}</label>)}</div></Field>
    <Field label="Viktigaste mål"><select value={intake.primary_goal} onChange={e=>setIntake(v=>({...v,primary_goal:e.target.value}))}><option value="">Vel hovudmål</option>{intake.goals.map(g=><option key={g}>{g}</option>)}</select></Field>
    <Field label="Treningsnivå"><select value={intake.level} onChange={e=>setIntake(v=>({...v,level:e.target.value}))}><option>Nybyrjar</option><option>Noko erfaring</option><option>Erfaren</option></select></Field>
    <Field label="Kor ofte trenar du no?"><select value={intake.frequency} onChange={e=>setIntake(v=>({...v,frequency:e.target.value}))}><option>Sjeldan</option><option>1–2 dagar</option><option>3–4 dagar</option><option>5+ dagar</option></select></Field>
    <Field label="Kor mange dagar kan du realistisk trena?"><select value={intake.weekly_days} onChange={e=>setIntake(v=>({...v,weekly_days:e.target.value}))}>{[1,2,3,4,5,6].map(n=><option key={n} value={n}>{n} dagar</option>)}</select></Field>
    <Field label="Kvifor ønskjer du PT?" wide><textarea rows="3" value={intake.reason} onChange={e=>setIntake(v=>({...v,reason:e.target.value}))} placeholder="Kva ønskjer du hjelp med – struktur, motivasjon, teknikk, måloppnåing …" required/></Field>
    <Field label="Kva trening likar du?"><input value={intake.preferred_training.join(', ')} onChange={e=>setIntake(v=>({...v,preferred_training:e.target.value.split(',').map(x=>x.trim()).filter(Boolean)}))} placeholder="Styrke, roing, sykling …"/></Field>
    <Field label="Øvingar eller aktivitetar du vil unngå"><input value={intake.avoid} onChange={e=>setIntake(v=>({...v,avoid:e.target.value}))} placeholder="Valfritt"/></Field>
    <Field label="Praktiske omsyn / fysiske avgrensingar" wide><textarea rows="2" value={intake.constraints} onChange={e=>setIntake(v=>({...v,constraints:e.target.value}))} placeholder="Berre det som er relevant for treninga. Valfritt."/></Field>
    <Field label="Kva er du sjølv villig til å bidra med?" wide><textarea rows="2" value={intake.commitment} onChange={e=>setIntake(v=>({...v,commitment:e.target.value}))} placeholder="Tid, innsats, regelmessig trening …"/></Field>
    <Field label="Kva forventar du av PT-en?" wide><textarea rows="2" value={intake.expectations} onChange={e=>setIntake(v=>({...v,expectations:e.target.value}))} required placeholder="Oppfølging, rettleiing, motivasjon, tilbakemelding …"/></Field>
    <Field label="Kva vil vera eit godt resultat etter 8–12 veker?" wide><textarea rows="2" value={intake.desired_outcome} onChange={e=>setIntake(v=>({...v,desired_outcome:e.target.value}))} placeholder="Beskriv kort kva du håpar å oppnå."/></Field>
   </div>
   <div className="pt2-form-actions"><button className="primary-button" disabled={busy}>{busy?'Sender …':'Send innmelding'}</button><span>Opplysningane blir lagra i PT-studioet og er berre tilgjengelege for deg og autorisert PT-personell.</span></div>
  </form>}
  {staff&&<section className="pt2-panel pt2-customer-bar"><Field label="Vel kunde"><select value={clientId} onChange={e=>{setClientId(e.target.value);setTab('oversikt')}}><option value="">Vel kunde …</option>{members.map(m=><option key={m.id} value={m.id}>{m.display_name||'Utan namn'} · {m.role}</option>)}</select></Field><div className="pt2-customer-actions"><Pill tone="success">{members.length} medlemmar</Pill><button className="secondary-button" onClick={()=>setShowTemplate(true)}><Plus size={15}/> Nytt introprogram</button></div></section>}
  {staff&&clientId&&<nav className="pt2-tabs">{[['oversikt','Oversikt'],['plan','Treningsplan'],['mål','Mål og fokus'],['kartlegging','Kartlegging'],['status','Statussjekk']].map(([id,label])=><button key={id} className={tab===id?'selected':''} onClick={()=>setTab(id)}>{label}</button>)}</nav>}
  {!staff&&<nav className="pt2-tabs">{[['oversikt','Oversikt'],['plan','Treningsplan'],['mål','Mine mål'],['status','Statussjekk']].map(([id,label])=><button key={id} className={tab===id?'selected':''} onClick={()=>setTab(id)}>{label}</button>)}</nav>}
  {staff&&clientId&&tab==='oversikt'&&<div className="pt2-grid">
   <section className="pt2-panel"><div className="pt2-panel-head"><div><span className="section-kicker">KUNDEPROFIL</span><h3>{selectedMember?.display_name||'Kunde'}</h3></div><Pill>{selectedMember?.role||'medlem'}</Pill></div>
    <div className="pt2-stat-row"><div><strong>{clientGoals.length}</strong><span>Aktive mål</span></div><div><strong>{activeProgram?clientSessions.length:0}</strong><span>Planøkter</span></div><div><strong>{intakes.filter(i=>i.member_id===clientId).length}</strong><span>Innmeldingar</span></div></div>
    <h4>Siste innmelding</h4>{currentIntake?<div className="pt2-detail"><div className="pt2-tags">{(currentIntake.goals||[]).map(g=><Pill key={g}>{g}</Pill>)}</div><p><b>Kvifor PT:</b> {currentIntake.reason}</p><p><b>Forventningar:</b> {currentIntake.expectations}</p><p><b>Eigeninnsats:</b> {currentIntake.commitment||'Ikkje oppgitt'}</p><p><b>Ønskja resultat:</b> {currentIntake.desired_outcome||'Ikkje oppgitt'}</p><small>Sendt {dateLabel(currentIntake.created_at)} · {currentIntake.status==='reviewed'?'Vurdert av PT':'Ny innmelding'}</small>{currentIntake.status!=='reviewed'&&<button className="secondary-button" onClick={()=>reviewIntake(currentIntake)}>Marker som vurdert</button>}</div>:<Empty>Ingen innmelding er sendt enno.</Empty>}
   </section>
   <section className="pt2-panel"><div className="pt2-panel-head"><div><span className="section-kicker">AKTIV PLAN</span><h3>{activeProgram?.title||'Ingen aktiv treningsplan'}</h3></div>{activeProgram&&<Pill tone="success">Aktiv</Pill>}</div>
    {activeProgram?<><p>{activeProgram.description}</p><div className="pt2-stat-row"><div><strong>{clientSessions.filter(s=>s.status==='completed').length}/{clientSessions.length}</strong><span>Gjennomført</span></div><div><strong>{activeProgram.weeks||'–'}</strong><span>Veker</span></div><div><strong>{clientGoals.length}</strong><span>Fokusmål</span></div></div><button className="secondary-button" onClick={()=>setTab('plan')}>Opne treningsplan <ArrowRight size={14}/></button></>:<button className="primary-button" onClick={()=>setShowProgram(true)}>Opprett treningsplan</button>}
   </section>
  </div>}
  {!staff&&tab==='oversikt'&&<div className="pt2-grid">
   <section className="pt2-panel"><span className="section-kicker">MI AKTIVE PLAN</span><h3>{myPrograms.find(p=>p.status==='active')?.title||'Ingen aktiv treningsplan enno'}</h3><p>{myPrograms.find(p=>p.status==='active')?.description||'Når PT-en har tildelt deg ein plan, finn du øktene her.'}</p><div className="pt2-stat-row"><div><strong>{myGoals.length}</strong><span>Synlege mål</span></div><div><strong>{myPrograms.filter(p=>p.status==='active').length}</strong><span>Aktive planar</span></div><div><strong>{myCheckins.filter(c=>c.status==='submitted').length}</strong><span>Statussvar</span></div></div></section>
   <section className="pt2-panel"><span className="section-kicker">NESTE STEG</span><h3>{pendingCheckin?'Du har ein statussjekk':'Hald fram med planen'}</h3><p>{pendingCheckin?'PT-en ønskjer ei oppdatering frå deg.':'Opne treningsplanen for å sjå kva som kjem vidare.'}</p><button className="secondary-button" onClick={()=>setTab(pendingCheckin?'status':'plan')}>{pendingCheckin?'Svar på statussjekk':'Sjå treningsplan'} <ArrowRight size={14}/></button></section>
  </div>}
  {staff&&clientId&&tab==='plan'&&<section className="pt2-panel"><div className="pt2-panel-head"><div><span className="section-kicker">PROGRAM OG REKKJEFØLGJE</span><h3>{activeProgram?.title||'Treningsplan'}</h3><p>Øktene ligg i den rekkjefølgja kunden skal gjennomføra dei.</p></div><div className="pt2-inline-actions"><button className="secondary-button" onClick={()=>setShowProgram(true)}><Plus size={15}/> Tildel introprogram</button>{activeProgram&&<button className="secondary-button" onClick={()=>setShowSession(true)}><Plus size={15}/> Legg til økt</button>}</div></div>
   {!activeProgram?<Empty>Ingen aktiv plan. Vel eit introprogram og tilpass det til kunden.</Empty>:<><div className="pt2-plan-meta"><Pill tone="success">Aktiv plan</Pill><span>Starta {dateLabel(activeProgram.start_date)}</span><span>{activeProgram.weeks||'–'} veker</span></div><div className="pt2-session-list">{clientSessions.map(s=><article className="pt2-session" key={s.id}><div className="pt2-seq">{s.sequence_no}</div><div className="pt2-session-main"><strong>{s.title}</strong><small>{s.wod_id?'WOD':'Eiga økt'} · {s.scheduled_date?dateLabel(s.scheduled_date):'Dato ikkje fastsett'}</small>{s.coach_note&&<p>{s.coach_note}</p>}</div><div className="pt2-inline-actions"><button className="pt2-order-button" disabled={s.sequence_no===1} onClick={()=>moveSession(s,-1)} title="Flytt opp">↑</button><button className="pt2-order-button" disabled={s.sequence_no===clientSessions.length} onClick={()=>moveSession(s,1)} title="Flytt ned">↓</button><Pill tone={s.status==='completed'?'success':''}>{s.status==='completed'?'Gjennomført':'Planlagd'}</Pill></div></article>)}</div></>}
  </section>}
  {!staff&&tab==='plan'&&<div className="pt2-panel"><span className="section-kicker">MI TRENINGSREKKE</span>{myPrograms.filter(p=>p.status==='active').map(p=><section key={p.id}><h3>{p.title}</h3><p>{p.description}</p><div className="pt2-session-list">{sessions.filter(s=>s.program_id===p.id).sort((a,b)=>a.sequence_no-b.sequence_no).map(s=><article className="pt2-session" key={s.id}><div className="pt2-seq">{s.sequence_no}</div><div className="pt2-session-main"><strong>{s.title}</strong><small>{s.scheduled_date?dateLabel(s.scheduled_date):'Ikkje datofesta'}</small>{s.workout_snapshot?.movements&&<p>{Array.isArray(s.workout_snapshot.movements)?s.workout_snapshot.movements.map(m=>typeof m==='string'?m:m.name||m.exercise_name).join(' · '):s.workout_snapshot.movements}</p>}{s.coach_note&&<p>{s.coach_note}</p>}</div>{s.status==='completed'?<Pill tone="success">Gjennomført</Pill>:<div className="pt2-inline-actions">{s.wod_id&&onLaunchWorkout&&<button className="primary-button" onClick={()=>onLaunchWorkout(s.wod_id)}>Start økt</button>}<button className="secondary-button" onClick={()=>markSession(s,'completed')}>Marker utført</button></div>}</article>)}</div></section>)}{!myPrograms.length&&<Empty>PT-en har ikkje tildelt deg ein treningsplan enno.</Empty>}</div>}
  {staff&&clientId&&tab==='mål'&&<section className="pt2-panel"><div className="pt2-panel-head"><div><span className="section-kicker">MÅL OG FOKUSOMRÅDE</span><h3>Kunden sine mål</h3></div><button className="secondary-button" onClick={()=>setShowGoal(true)}><Plus size={15}/> Legg til mål</button></div><div className="pt2-goal-list">{clientGoals.map(g=><article className="pt2-goal" key={g.id}><div><Pill>{g.area}</Pill><strong>{g.title}</strong><small>{g.baseline||'–'} → {g.target||'–'} {g.unit}</small></div><span>{dateLabel(g.target_date)}</span></article>)}</div>{!clientGoals.length&&<Empty>Ingen mål er registrerte for kunden.</Empty>}</section>}
  {!staff&&tab==='mål'&&<section className="pt2-panel"><span className="section-kicker">MÅL OG FOKUS</span><h3>Dette arbeider du mot</h3><div className="pt2-goal-list">{myGoals.map(g=><article className="pt2-goal" key={g.id}><div><Pill>{g.area}</Pill><strong>{g.title}</strong><small>{g.baseline||'–'} → {g.target||'–'} {g.unit}</small></div><span>{dateLabel(g.target_date)}</span></article>)}</div>{!myGoals.length&&<Empty>PT-en har ikkje lagt inn synlege mål enno.</Empty>}</section>}
  {staff&&clientId&&tab==='kartlegging'&&<section className="pt2-panel"><div className="pt2-panel-head"><div><span className="section-kicker">INNMELDINGAR</span><h3>Kartleggingshistorikk</h3></div></div>{intakes.filter(i=>i.member_id===clientId).map(i=><article className="pt2-detail" key={i.id}><div className="pt2-tags">{(i.goals||[]).map(g=><Pill key={g}>{g}</Pill>)}</div><p><b>Treningsnivå:</b> {i.level} · <b>Frekvens:</b> {i.frequency}</p><p><b>Kvifor PT:</b> {i.reason}</p><p><b>Forventningar:</b> {i.expectations}</p><p><b>Praktiske omsyn:</b> {i.constraints||'Ingen oppgitt'}</p><small>{dateLabel(i.created_at)}</small></article>)}{!intakes.some(i=>i.member_id===clientId)&&<Empty>Ingen kartleggingar enno.</Empty>}</section>}
  {staff&&clientId&&tab==='status'&&<section className="pt2-panel"><div className="pt2-panel-head"><div><span className="section-kicker">MANUELL OPPFØLGING</span><h3>Statussjekkar</h3><p>PT sender skjema når det er behov – ingen automatisk utsending.</p></div><button className="secondary-button" onClick={()=>setShowCheckin(true)}><Plus size={15}/> Send statussjekk</button></div>{checkins.filter(c=>c.member_id===clientId).map(c=><article className="pt2-detail" key={c.id}><div className="pt2-panel-head"><strong>{c.title}</strong><Pill tone={c.status==='submitted'?'success':''}>{c.status==='submitted'?'Besvart':'Ventar på svar'}</Pill></div><small>{dateLabel(c.created_at)}</small>{c.status==='submitted'&&<><button className="secondary-button" onClick={()=>reviewCheckin(c)}>Marker som gjennomgått</button><div className="pt2-answer-list">{(c.questions||[]).map((q,i)=><p key={i}><b>{q}</b><br/>{c.answers?.[i]||''}</p>)}</div></>}</article>)}{!checkins.some(c=>c.member_id===clientId)&&<Empty>Ingen statussjekkar sende.</Empty>}</section>}
  {!staff&&tab==='status'&&<section className="pt2-panel"><span className="section-kicker">STATUSSJEKK</span><h3>Oppfølging frå PT</h3>{pendingCheckin?<form className="pt2-form" onSubmit={answerCheckin}><h4>{pendingCheckin.title}</h4>{pendingCheckin.questions.map((q,i)=><Field key={q} label={q}><textarea rows="2" value={checkinAnswers[i]||''} onChange={e=>setCheckinAnswers(v=>({...v,[i]:e.target.value}))} required/></Field>)}<button className="primary-button" disabled={busy}>Send svar til PT</button></form>:<Empty>Du har ingen statussjekk som ventar på svar.</Empty>}{myCheckins.filter(c=>c.status==='submitted').map(c=><article className="pt2-detail" key={c.id}><strong>{c.title}</strong><small>Sendt {dateLabel(c.submitted_at)}</small>{(c.questions||[]).map((q,i)=><p key={i}><b>{q}</b><br/>{c.answers?.[i]||''}</p>)}</article>)}</section>}
  {showTemplate&&staff&&<div className="pt2-modal-backdrop"><form className="pt2-modal pt2-form" onSubmit={saveTemplate}><div className="pt2-panel-head"><h3>Nytt introprogram</h3><button type="button" className="icon-button" onClick={()=>setShowTemplate(false)}><X size={16}/></button></div><Field label="Programnamn"><input value={templateDraft.title} onChange={e=>setTemplateDraft(v=>({...v,title:e.target.value}))} required placeholder="Til dømes Start sterk"/></Field><Field label="Skildring"><textarea rows="2" value={templateDraft.description} onChange={e=>setTemplateDraft(v=>({...v,description:e.target.value}))}/></Field><div className="pt2-form-grid"><Field label="Lengd i veker"><input type="number" min="1" max="52" value={templateDraft.weeks} onChange={e=>setTemplateDraft(v=>({...v,weeks:e.target.value}))}/></Field><Field label="Økter per veke"><input type="number" min="1" max="7" value={templateDraft.sessions_per_week} onChange={e=>setTemplateDraft(v=>({...v,sessions_per_week:e.target.value}))}/></Field></div><Field label="Fokusområde"><div className="pt2-check-grid">{FOCUS.map(f=><label className="pt2-check" key={f}><input type="checkbox" checked={templateDraft.focus_areas.includes(f)} onChange={e=>setTemplateDraft(v=>({...v,focus_areas:e.target.checked?[...v.focus_areas,f]:v.focus_areas.filter(x=>x!==f)}))}/>{f}</label>)}</div></Field><Field label="Økter i programmet – ei per linje"><textarea rows="5" value={templateDraft.session_titles} onChange={e=>setTemplateDraft(v=>({...v,session_titles:e.target.value}))}/></Field><button className="primary-button" disabled={busy}>Lagra introprogram</button></form></div>}
  {showProgram&&staff&&<div className="pt2-modal-backdrop"><form className="pt2-modal pt2-form" onSubmit={createProgram}><div className="pt2-panel-head"><h3>Tildel treningsplan</h3><button type="button" className="icon-button" onClick={()=>setShowProgram(false)}><X size={16}/></button></div><Field label="Introprogram"><select value={programDraft.template_id} onChange={e=>setProgramDraft(v=>({...v,template_id:e.target.value}))} required><option value="">Vel program …</option>{templates.map(t=><option key={t.id} value={t.id}>{t.title} · {t.weeks} veker</option>)}</select></Field><Field label="Namn på kundens plan"><input value={programDraft.title} onChange={e=>setProgramDraft(v=>({...v,title:e.target.value}))} placeholder={templates.find(t=>t.id===programDraft.template_id)?.title||'Tilpassa treningsplan'}/></Field><Field label="Startdato"><input type="date" value={programDraft.start_date} onChange={e=>setProgramDraft(v=>({...v,start_date:e.target.value}))}/></Field><Field label="PT sine instruksjonar"><textarea rows="3" value={programDraft.notes} onChange={e=>setProgramDraft(v=>({...v,notes:e.target.value}))}/></Field><button className="primary-button" disabled={busy}>Opprett og tildel plan</button></form></div>}
  {showGoal&&staff&&<div className="pt2-modal-backdrop"><form className="pt2-modal pt2-form" onSubmit={saveGoal}><div className="pt2-panel-head"><h3>Nytt mål</h3><button type="button" className="icon-button" onClick={()=>setShowGoal(false)}><X size={16}/></button></div><Field label="Fokusområde"><select value={goalDraft.area} onChange={e=>setGoalDraft(v=>({...v,area:e.target.value}))}>{FOCUS.map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Konkret mål"><input value={goalDraft.title} onChange={e=>setGoalDraft(v=>({...v,title:e.target.value}))} required placeholder="Auka knebøy frå 60 til 80 kg"/></Field><div className="pt2-form-grid"><Field label="Startverdi"><input value={goalDraft.baseline} onChange={e=>setGoalDraft(v=>({...v,baseline:e.target.value}))}/></Field><Field label="Målverdi"><input value={goalDraft.target} onChange={e=>setGoalDraft(v=>({...v,target:e.target.value}))}/></Field><Field label="Eining"><input value={goalDraft.unit} onChange={e=>setGoalDraft(v=>({...v,unit:e.target.value}))} placeholder="kg, min, meter …"/></Field><Field label="Dato for evaluering"><input type="date" value={goalDraft.target_date} onChange={e=>setGoalDraft(v=>({...v,target_date:e.target.value}))}/></Field></div><button className="primary-button" disabled={busy}>Lagra mål</button></form></div>}
  {showSession&&staff&&<div className="pt2-modal-backdrop"><form className="pt2-modal pt2-form" onSubmit={addSession}><div className="pt2-panel-head"><h3>Legg til økt i rekkja</h3><button type="button" className="icon-button" onClick={()=>setShowSession(false)}><X size={16}/></button></div><Field label="Hent WOD frå biblioteket"><select value={sessionDraft.wod_id} onChange={e=>setSessionDraft(v=>({...v,wod_id:e.target.value,title:wods.find(w=>w.id===e.target.value)?.name||v.title}))}><option value="">Eigen økt / ikkje WOD</option>{wods.map(w=><option key={w.id} value={w.id}>{w.name} · {w.format}</option>)}</select></Field><Field label="Namn på økta"><input value={sessionDraft.title} onChange={e=>setSessionDraft(v=>({...v,title:e.target.value}))} placeholder="Til dømes Teknikk og mobilitet"/></Field><Field label="Planlagd dato (valfri)"><input type="date" value={sessionDraft.scheduled_date} onChange={e=>setSessionDraft(v=>({...v,scheduled_date:e.target.value}))}/></Field><Field label="Instruksjon til kunden"><textarea rows="3" value={sessionDraft.notes} onChange={e=>setSessionDraft(v=>({...v,notes:e.target.value}))}/></Field><button className="primary-button" disabled={busy}>Legg økta sist i rekkja</button></form></div>}
  {showCheckin&&staff&&<div className="pt2-modal-backdrop"><form className="pt2-modal pt2-form" onSubmit={sendCheckin}><div className="pt2-panel-head"><h3>Send statussjekk</h3><button type="button" className="icon-button" onClick={()=>setShowCheckin(false)}><X size={16}/></button></div><Field label="Tittel på skjema"><input value={checkinTitle} onChange={e=>setCheckinTitle(e.target.value)} required/></Field><div className="pt2-detail"><b>Spørsmål som blir sende</b>{CHECK_QUESTIONS.map(q=><p key={q}>• {q}</p>)}</div><button className="primary-button" disabled={busy}>Send til kunden</button></form></div>}
 </div>
}
