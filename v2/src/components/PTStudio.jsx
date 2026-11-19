import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowRight, CalendarDays, CheckCircle2, ClipboardList, Dumbbell, Flag, MessageSquareText, Plus, RefreshCw, Target, UserRound, Users, Search, X } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import Notifications from './Notifications.jsx'
import PTManagement from './PTManagement.jsx'
import PT from './PT.jsx'
import PTInfo from './PTInfo.jsx'
import ScheduleHub from './ScheduleHub.jsx'
import WodPicker from './WodPicker.jsx'
import { isStaff } from '../lib/auth.js'

const GOALS = ['Bli sterkare','Betre kondisjon og uthald','Auka muskelmasse','Gå ned i vekt','Meir energi og overskot','Betre mobilitet','Betre teknikk','Koma i gang med trening','Førebyggja plager','Prestera betre i idrett']
const FOCUS = ['Styrke','Kondisjon','Mobilitet','Kjernestabilitet','Teknikk','Uthald','Eksplosivitet','Generell helse','Rehabilitering']
const CHECK_QUESTIONS = ['Korleis opplever du framgangen sidan sist?','Kva fungerer best i treninga no?','Kva har vore mest utfordrande?','Har måla dine endra seg?','Kva ønskjer du å fokusera på vidare?','Er treningsmengda passeleg?']

function Field({label,children,wide=false}) { return <div className={wide?'pt2-field pt2-wide':'pt2-field'}><span>{label}</span>{children}</div> }
function Pill({children,tone=''}) { return <span className={'pt2-pill '+tone}>{children}</span> }
function Empty({children}) { return <div className="pt2-empty">{children}</div> }
function dateLabel(value) { return value ? new Date(value).toLocaleDateString('nn-NO',{day:'numeric',month:'short',year:'numeric'}) : 'Ikkje sett' }

export default function PTStudio({ profile, onLaunchWorkout, initialClientId=null, focusRequestId=null, onFocusRequestConsumed }) {
 const staff = isStaff(profile)
 const [loading,setLoading] = useState(true)
 const [busy,setBusy] = useState(false)
 const [error,setError] = useState('')
 const [notice,setNotice] = useState('')
 const [members,setMembers] = useState([])
 const [clientId,setClientId] = useState(initialClientId||'')
 const [workspace,setWorkspace] = useState('studio')
 const [showCustomerPicker,setShowCustomerPicker] = useState(false)
 const [customerSearch,setCustomerSearch] = useState('')
 const [rankDraft,setRankDraft] = useState('')
 useEffect(()=>{if(initialClientId)setClientId(initialClientId)},[initialClientId])
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
 const [programStep,setProgramStep] = useState(1)
 const [showSession,setShowSession] = useState(false)
 const [openWodPicker,setOpenWodPicker] = useState(null)
 const [showCheckin,setShowCheckin] = useState(false)
 const [intake,setIntake] = useState({goals:[],primary_goal:'',reason:'',level:'Noko erfaring',frequency:'1–2 dagar',preferred_training:[],avoid:'',weekly_days:'3',constraints:'',commitment:'',expectations:'',desired_outcome:''})
 const [goalDraft,setGoalDraft] = useState({area:'Styrke',title:'',baseline:'',target:'',unit:'',target_date:''})
 const [templateDraft,setTemplateDraft] = useState({title:'',description:'',template_type:'intro',weeks:'6',sessions_per_week:'3',focus_areas:[],session_titles:'Økt 1 – Introduksjon\nØkt 2 – Grunnstyrke\nØkt 3 – Kondisjon'})
 const [progressionSteps,setProgressionSteps] = useState([{title:'Grepsstyrke og heng',description:'Bygg trygg hengposisjon og grepsuthald.',exercises:'Aktivt heng\nGrepsheng',criteria:'Kontrollert heng i 20–30 sekund.',wod_id:''}])
 const [programDraft,setProgramDraft] = useState({template_id:'',title:'',start_date:new Date().toISOString().slice(0,10),notes:''})
 const [sessionDraft,setSessionDraft] = useState({title:'',wod_id:'',scheduled_date:'',week_no:'1',day_no:'1',session_kind:'training',focus_area:'',estimated_minutes:'45',notes:'',agenda:'',materials:'',preparation:''})
 const [checkinAnswers,setCheckinAnswers] = useState({})
 const [checkinTitle,setCheckinTitle] = useState('Status etter treningsperiode')
 const [clientNote,setClientNote] = useState('')

 const selectedMember = members.find(m=>m.id===clientId)
 useEffect(()=>{setRankDraft(selectedMember?.member_rank||'')},[clientId,selectedMember?.member_rank])
 const currentIntake = intakes.filter(x=>x.member_id===clientId).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0]
 const activeProgram = programs.filter(p=>p.client_id===clientId&&p.status==='active').sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0]
 const clientGoals = goals.filter(g=>g.member_id===clientId)
 const clientSessions = sessions.filter(s=>s.program_id===activeProgram?.id).sort((a,b)=>(a.week_no||1)-(b.week_no||1)||(a.day_no||1)-(b.day_no||1)||a.sequence_no-b.sequence_no)
 const pendingCheckin = checkins.find(c=>c.member_id===profile.id&&c.status==='pending')
 const myPrograms = programs.filter(p=>p.client_id===profile.id)
 const myGoals = goals.filter(g=>g.member_id===profile.id&&g.is_visible)
 const myCheckins = checkins.filter(c=>c.member_id===profile.id)
 function programProgress(programId) {
  const rows=sessions.filter(s=>s.program_id===programId)
  const actionable=rows.filter(s=>!['rest','information'].includes(s.session_kind))
  const completed=actionable.filter(s=>s.status==='completed').length
  const percent=actionable.length?Math.round(completed/actionable.length*100):0
  return {total:actionable.length,completed,percent,remaining:Math.max(0,actionable.length-completed)}
 }

 async function load() {
  setError('')
  const results = await Promise.all([
   staff ? supabase.from('profiles').select('id,display_name,role,avatar_url,member_rank').eq('active',true).order('display_name') : Promise.resolve({data:[],error:null}),
   supabase.from('pt_intakes').select('*').order('created_at',{ascending:false}).limit(300),
   supabase.from('pt_client_goals').select('*').order('created_at',{ascending:false}),
   supabase.from('pt_program_templates').select('*').eq('is_active',true).order('title'),
   supabase.from('pt_programs').select('*').order('created_at',{ascending:false}),
   supabase.from('pt_program_sessions').select('*').order('sequence_no'),
   supabase.from('pt_checkins').select('*').order('created_at',{ascending:false}),
   (()=>{let q=supabase.from('wods').select('id,name,format,duration_minutes,movements,notes,timer_settings,is_published,is_archived').eq('is_archived',false).order('name');if(!staff)q=q.eq('is_published',true);return q})()
  ])
  const labels=['medlemslista','innmeldingar','mål','introprogram','treningsplanar','planøkter','statussjekkar','WOD-bibliotek']
  results.forEach((r,i)=>{if(r.error&&i!==0)setError(labels[i]+': '+r.error.message)})
  if(results[0].data)setMembers(results[0].data)
  setIntakes(results[1].data||[]);setGoals(results[2].data||[]);setTemplates(results[3].data||[])
  setPrograms(results[4].data||[]);setSessions(results[5].data||[]);setCheckins(results[6].data||[]);setWods(results[7].data||[])
  if(staff&&initialClientId)setClientId(initialClientId)
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
 function applySixSessionIntro() {
  setTemplateDraft({
   template_type:'intro',title:'Introduksjonskurs – 6 økter',
   description:'Eit strukturert introduksjonsløp som gjev medlemmen tryggleik i treningsrommet, grunnleggande teknikk, innføring i styrke og kondisjon, individuell tilpassing og ein plan for vegen vidare. Tilpass alltid innhald og belastning til personen.',
   weeks:'3',
   sessions_per_week:'2',
   focus_areas:['Generell helse','Teknikk','Styrke','Kondisjon','Mobilitet'],
   session_titles:'Økt 1 – Velkomst, mål og kartlegging\nØkt 2 – Grunnteknikk og trygg utføring\nØkt 3 – Styrke og bevegelseskvalitet\nØkt 4 – Kondisjon og arbeidskapasitet\nØkt 5 – Individuell tilpassing og progresjon\nØkt 6 – Evaluering og vegen vidare'
  })
 }
 function applyIntroWithInfo() {
  setTemplateDraft({template_type:'intro',title:'PT-start – introduksjon og treningsplan',description:'Eit praktisk oppstartsløp med kartlegging, informasjon om treningsprinsipp, teknikk, tilpassa trening og evaluering.',weeks:'3',sessions_per_week:'2',focus_areas:['Generell helse','Teknikk','Styrke','Mobilitet'],session_titles:'INFO: Oppstartssamtale, mål og forventningar\nØkt 1 – Grunnteknikk og trygg utføring\nØkt 2 – Styrke og bevegelseskvalitet\nINFO: Gjennomgang av treningsplan og sjølvstendig trening\nØkt 3 – Kondisjon og arbeidskapasitet\nTEST: Evaluering og vegen vidare'})
 }
 function applyRehabPreset() {
  setTemplateDraft({
   template_type:'training_plan',title:'Gradvis opptrapping – rehabilitering',
   description:'Ein generell, individuelt tilpassa plan for gradvis retur til trening. PT-en tilpassar øvingar, rørsleutslag, belastning og progresjon etter medlemmen sine føresetnader. Dette er ikkje ein medisinsk behandlingsplan.',
   weeks:'4',
   sessions_per_week:'2',
   focus_areas:['Rehabilitering','Mobilitet','Teknikk','Styrke','Generell helse'],
   session_titles:'Økt 1 – Kartlegging og toleranse\nØkt 2 – Kontrollert rørsle og grunnteknikk\nØkt 3 – Lett styrke og bevegelseskvalitet\nØkt 4 – Stabilitet og kontroll\nØkt 5 – Gradvis auka belastning\nØkt 6 – Kapasitet og funksjon\nØkt 7 – Eigenøkt og sjølvregulering\nØkt 8 – Evaluering og vidare plan'
  })
 }
 function applyPullupPreset(){
  setTemplateDraft({template_type:'progression',title:'Vegen til din første pull-up',description:'Eit stegvis utviklingsløp frå grunnleggjande heng og skulderkontroll til første kontrollerte pull-up. Tilpass stega etter kunden sitt nivå.',weeks:'8',sessions_per_week:'1',focus_areas:['Styrke','Teknikk','Kjernestabilitet'],session_titles:''})
  setProgressionSteps([
   {title:'Grepsstyrke og grunnleggjande heng',description:'Bygg trygg hengposisjon og grepsuthald.',exercises:'Aktivt heng\nGrepsheng',criteria:'Kontrollert heng i 20–30 sekund.',wod_id:''},
   {title:'Aktivt heng og skulderkontroll',description:'Lær å stabilisera skulderblada utan å bøya albogane.',exercises:'Scapular pull-ups\nHeng med skulderdepresjon',criteria:'10 kontrollerte skuldertrekk utan smerte.',wod_id:''},
   {title:'Horisontal trekkstyrke',description:'Bygg trekkstyrke gjennom kontrollert roing.',exercises:'Ring rows\nSittande roing med strikk',criteria:'3 × 10 kontrollerte repetisjonar.',wod_id:''},
   {title:'Assisterte pull-ups',description:'Bruk strikk eller fotstøtte for å trena heile rørsla.',exercises:'Pull-up med strikk\nIsometrisk hald i topposisjon',criteria:'3 × 5 med jamn rørsle og kontroll.',wod_id:''},
   {title:'Negative pull-ups',description:'Start i topposisjon og senk kroppen kontrollert.',exercises:'Negative pull-ups\nEksentrisk hald',criteria:'3 kontrollerte senkingar på 4–6 sekund.',wod_id:''},
   {title:'Delvise pull-ups',description:'Arbeid gjennom stadig større rørsleutslag.',exercises:'Pull-up frå halv posisjon\nAssistert full rørsle',criteria:'Fleire repetisjonar med kontrollert rørsle.',wod_id:''},
   {title:'Første fullstendige pull-up',description:'Test full rørsle utan assistanse når kunden er klar.',exercises:'Pull-up\nAktivt heng mellom forsøka',criteria:'Éi full repetisjon frå strake armar til haka over stanga.',wod_id:''},
   {title:'Bygg vidare på pull-up',description:'Utvikle repetisjonskapasitet og teknisk kvalitet.',exercises:'Pull-ups i kontrollerte sett\nEksentrisk arbeid ved behov',criteria:'Auka tal gode repetisjonar utan å mista teknikken.',wod_id:''}
  ])
 }
 function updateProgressionStep(index,patch){setProgressionSteps(rows=>rows.map((row,i)=>i===index?{...row,...patch}:row))}
 async function saveTemplate(e) {
  e.preventDefault()
  await run(async()=>{
   const isProgression=templateDraft.template_type==='progression'
   const lines=isProgression?progressionSteps.filter(step=>step.title.trim()).map((step,index)=>({title:step.title.trim(),sequence_no:index+1,week_no:index+1,day_no:1,session_kind:'progression_step',focus_area:'Styrke',estimated_minutes:45,wod_id:step.wod_id||null,workout_snapshot:{description:step.description.trim(),exercises:step.exercises.split('\n').map(x=>x.trim()).filter(Boolean),advancement_criteria:step.criteria.trim()}})):templateDraft.session_titles.split('\n').map(x=>x.trim()).filter(Boolean).map(raw=>({title:raw.replace(/^(INFO|TEST):\s*/i,''),session_kind:/^INFO:/i.test(raw)?'information':/^TEST:/i.test(raw)?'assessment':'training'}))
   const capacity=Number(templateDraft.weeks)*Number(templateDraft.sessions_per_week)
   if(!templateDraft.title.trim()||!lines.length)throw new Error('Programmet må ha namn og minst eitt steg eller éi økt.')
   if(!isProgression&&(!Number.isFinite(capacity)||capacity<1||lines.length>capacity))throw new Error('Programmet har plass til '+capacity+' økter. Reduser øktlista eller auk veker / økter per veke.')
   const {error:e}=await supabase.from('pt_program_templates').insert({title:templateDraft.title.trim(),description:templateDraft.description,template_type:templateDraft.template_type,weeks:isProgression?Math.max(1,lines.length):Number(templateDraft.weeks),sessions_per_week:isProgression?1:Number(templateDraft.sessions_per_week),focus_areas:templateDraft.focus_areas,sessions:lines.map((item,index)=>({...item,sequence_no:index+1,week_no:item.week_no||Math.floor(index/Number(templateDraft.sessions_per_week))+1,day_no:item.day_no||(index%Number(templateDraft.sessions_per_week))+1,focus_area:item.focus_area||'',estimated_minutes:item.estimated_minutes||(item.session_kind==='information'?30:45)})),created_by:profile.id})
   if(e)throw e
   setShowTemplate(false);setNotice('Kurs- eller planmalen er lagra i biblioteket.')
  })
 }
 async function createProgram(e) {
  e.preventDefault()
  await run(async()=>{
   const template=templates.find(t=>t.id===programDraft.template_id)
   if(!template||!clientId)throw new Error('Vel aktiv kunde og kurs-/planmal.')
   const title=programDraft.title.trim()||template.title
   const rows=(template.sessions||[]).map((s,index)=>({
    sequence_no:index+1,
    title:s.title,
    week_no:Number(s.week_no)||Math.floor(index/Math.max(1,Number(template.sessions_per_week)||3))+1,
    day_no:Number(s.day_no)||((index%Math.max(1,Number(template.sessions_per_week)||3))+1),
    session_kind:s.session_kind||'training',
    focus_area:s.focus_area||'',
    estimated_minutes:Number(s.estimated_minutes)||45,
    wod_id:s.wod_id||null,
    workout_snapshot:s.workout_snapshot||(s.session_kind==='information'?{title:s.title,format:'Informasjonstime',agenda:s.title,materials:'',preparation:'Ta med spørsmål og relevante treningsmål'}:{title:s.title,format:s.session_kind==='progression_step'?'Progresjonssteg':'',description:s.description||'',exercises:s.exercises||[],advancement_criteria:s.advancement_criteria||'',movements:[],notes:'Tilpass økta for kunden'}),
    status:'planned'
   }))
   const {data:programId,error:e}=await supabase.rpc('create_pt_program_with_sessions',{
    p_program:{
     client_id:clientId,
     template_id:template.id,
     program_type:template.template_type||'intro',
     title,
     description:template.description,
     start_date:programDraft.start_date||null,
     weeks:template.weeks,
     focus_areas:template.focus_areas,
     coach_notes:programDraft.notes
    },
    p_sessions:rows
   })
   if(e)throw e
   if(!programId)throw new Error('Databasen stadfesta ikkje at PT-programmet vart oppretta.')
   setShowProgram(false);setProgramDraft({template_id:'',title:'',start_date:new Date().toISOString().slice(0,10),notes:''});setNotice('Treningsplanen er oppretta og tildelt kunden.')
  })
 }
 async function addSession(e) {
  e.preventDefault()
  await run(async()=>{
   if(!activeProgram)throw new Error('Kunden må ha ein aktiv treningsplan.')
   if(!sessionDraft.title.trim()&&!sessionDraft.wod_id)throw new Error('Gi økta eit namn eller vel ein WOD.')
   if(sessionDraft.session_kind==='information'&&!sessionDraft.title.trim())throw new Error('Infotimen må ha eit namn eller tema.')
   const wod=sessionDraft.session_kind==='information'?null:wods.find(w=>w.id===sessionDraft.wod_id)
   const existing=sessions.filter(s=>s.program_id===activeProgram.id)
   const snapshot=wod?{...(session.workout_snapshot||{}),id:wod.id,wod_title:wod.name,format:wod.format,duration_minutes:wod.duration_minutes,movements:wod.movements,notes:wod.notes}:{...(session.workout_snapshot||{}),title:session.title,format:'Eigen økt',movements:[],notes:session.coach_note||''}
   const {error:e}=await supabase.from('pt_program_sessions').insert({program_id:activeProgram.id,sequence_no:existing.length+1,title:sessionDraft.title.trim()||wod?.name||'Ny økt',wod_id:wod?.id||null,scheduled_date:sessionDraft.scheduled_date||null,week_no:Number(sessionDraft.week_no)||1,day_no:Number(sessionDraft.day_no)||1,session_kind:sessionDraft.session_kind,focus_area:sessionDraft.focus_area,estimated_minutes:sessionDraft.estimated_minutes?Number(sessionDraft.estimated_minutes):null,workout_snapshot:snapshot,coach_note:sessionDraft.notes,status:'planned'})
   if(e)throw e
   setShowSession(false);setSessionDraft({title:'',wod_id:'',scheduled_date:'',week_no:'1',day_no:'1',session_kind:'training',focus_area:'',estimated_minutes:'45',notes:'',agenda:'',materials:'',preparation:''});setNotice('Økta er lagt sist i treningsrekkja.')
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
 async function updateGoalStatus(goal,status) {
  await run(async()=>{
   const {error:e}=await supabase.from('pt_client_goals').update({status}).eq('id',goal.id)
   if(e)throw e
   setNotice(status==='achieved'?'Målet er markert som nådd.':status==='paused'?'Målet er sett på pause.':'Målet er aktivert igjen.')
  })
 }
 async function reviewCheckin(row) {
  await run(async()=>{const {error:e}=await supabase.from('pt_checkins').update({status:'reviewed'}).eq('id',row.id);if(e)throw e;setNotice('Statussvaret er markert som gjennomgått.')})
 }
 async function attachWodToSession(session,wodId) {
  await run(async()=>{
   const wod=wods.find(x=>x.id===wodId)
   const snapshot=wod?{id:wod.id,title:wod.name,format:wod.format,duration_minutes:wod.duration_minutes,movements:wod.movements,notes:wod.notes}:{title:session.title,format:'Eigen økt',movements:[],notes:session.coach_note||''}
   const {error:e}=await supabase.from('pt_program_sessions').update({wod_id:wod?.id||null,title:wod?.name||session.title,workout_snapshot:snapshot}).eq('id',session.id)
   if(e)throw e
   setNotice(wod?'WOD er knytt til økta.':'WOD-koplinga er fjerna.')
  })
 }
 async function moveSession(session,direction) {
  const rows=clientSessions;const index=rows.findIndex(x=>x.id===session.id);const next=rows[index+direction];if(!next)return;
  await run(async()=>{
   const {error:e1}=await supabase.from('pt_program_sessions').update({sequence_no:-1}).eq('id',session.id);if(e1)throw e1;
   const {error:e2}=await supabase.from('pt_program_sessions').update({sequence_no:session.sequence_no,week_no:session.week_no||1,day_no:session.day_no||1}).eq('id',next.id);if(e2)throw e2;
   const {error:e3}=await supabase.from('pt_program_sessions').update({sequence_no:next.sequence_no,week_no:next.week_no||1,day_no:next.day_no||1}).eq('id',session.id);if(e3)throw e3;
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
 async function saveRank(){if(!staff||!clientId)throw new Error('Vel kunde før du endrar rang.');await run(async()=>{const {error:e}=await supabase.from('profiles').update({member_rank:rankDraft.trim()||null}).eq('id',clientId);if(e)throw e;setNotice(rankDraft.trim()?'Kunderang er oppdatert.':'Kunderang er fjerna.')})}
 if(loading)return <div className="training-state">Hentar PT Studio …</div>
 if(staff&&workspace==='groups')return <div className="pt2 pt2-group-workspace"><header className="pt2-workspace-head"><div><span className="section-kicker">GARASJEGYM · PT STUDIO</span><h2>Gruppetimeadministrasjon</h2><p>Opprett timar, administrer påmeldingar og planlegg WOD-ar.</p></div><nav className="pt2-workspace-switch"><button type="button" onClick={()=>setWorkspace('studio')}>PT Studio</button><button type="button" className="selected">Gruppetimeadministrasjon</button></nav></header><ScheduleHub profile={profile} initialTab="booking" hidePTTab onLaunchWorkout={(wodId)=>onLaunchWorkout?.(wodId,null,'')} onLogResult={(wodId,sessionId)=>onLaunchWorkout?.(wodId,sessionId,'')}/></div>

 return <div className="pt2">
  <header className="pt2-head pt2-workspace-head"><div><div className="section-kicker">GARASJEGYM · {staff?'PT STUDIO':'MI PT'}</div><h2>{staff?'PT Studio':'Mi PT'}</h2><p>{staff?'Kundeoppfølging, treningsplanar og individuell PT i éi arbeidsflate.':'Treningsplanen din, måla dine og oppfølging frå PT.'}</p></div>{staff?<nav className="pt2-workspace-switch"><button type="button" className="selected">PT Studio</button><button type="button" onClick={()=>setWorkspace('groups')}>Gruppetimeadministrasjon</button></nav>:<button className="primary-button" onClick={()=>setShowIntake(v=>!v)}><Plus size={16}/> Ny PT-innmelding</button>}</header>
  <Notifications compact context="pt-studio"/>
  {error&&<div className="auth-error">{error}</div>}{notice&&<div className="auth-message"><CheckCircle2 size={15}/> {notice}</div>}
  {(staff&&tab==='administrasjon'||!staff&&tab==='tenester')&&<PTManagement profile={profile}/>} 
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
  {staff&&<section className="pt2-panel pt2-customer-bar pt2-customer-bar-secure"><div className="pt2-customer-identity"><span className="pt2-customer-avatar">{selectedMember?.avatar_url?<img src={selectedMember.avatar_url} alt=""/>:(selectedMember?.display_name||'Kunde').split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase()}</span><div><span className="section-kicker">AKTIV KUNDE</span><strong>{selectedMember?.display_name||'Ingen kunde vald'}</strong><small>{selectedMember?selectedMember.role==='member'?'Medlem':selectedMember.role:'Vel ein kunde før du arbeider vidare'}</small></div><div className="pt2-customer-rank"><span>RANG</span><b>{selectedMember?.member_rank||'Ikkje tildelt'}</b></div><button type="button" className="secondary-button" onClick={()=>{setCustomerSearch('');setShowCustomerPicker(true)}}><Search size={15}/>{clientId?'Vel / byt kunde':'Vel kunde'}</button></div>{clientId&&<div className="pt2-rank-editor"><label>Endre rang<input maxLength="40" value={rankDraft} onChange={e=>setRankDraft(e.target.value)} placeholder="Til dømes Nybyrjar, Bronse, Sølv …"/></label><button type="button" className="secondary-button" disabled={busy||rankDraft.trim()===(selectedMember?.member_rank||'')} onClick={saveRank}>Lagra rang</button></div>}<div className="pt2-customer-actions"><Pill>{members.length} medlemmar</Pill><button className="secondary-button" disabled={!clientId} onClick={()=>{setShowTemplate(true)}}><Plus size={15}/> Ny kurs- / planmal</button></div></section>
  {staff&&clientId&&<nav className="pt2-tabs">{[['oversikt','Oversikt'],['plan','Kurs og plan'],['mål','Mål og fokus'],['kartlegging','Kartlegging'],['status','Statussjekk'],['pt-timar','PT-timar og dialog'],['administrasjon','PT-administrasjon']].map(([id,label])=><button key={id} className={tab===id?'selected':''} onClick={()=>setTab(id)}>{label}</button>)}</nav>}
  {!staff&&<nav className="pt2-tabs">{[['oversikt','Oversikt'],['plan','Treningsplan'],['mål','Mine mål'],['status','Statussjekk'],['meldingar','Frå PT'],['tenester','PT-tenester']].map(([id,label])=><button key={id} className={tab===id?'selected':''} onClick={()=>setTab(id)}>{label}</button>)}</nav>}
  {staff&&clientId&&tab==='pt-timar'&&<PT profile={profile} controlledClientId={clientId} onClientChange={setClientId} hideCustomerPicker focusRequestId={focusRequestId} onFocusConsumed={onFocusRequestConsumed} onLaunchWorkout={onLaunchWorkout}/>}
  {!staff&&tab==='meldingar'&&<PTInfo/>}
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
   <section className="pt2-panel"><span className="section-kicker">MI AKTIVE PLAN</span><h3>{myPrograms.find(p=>p.status==='active')?.title||'Ingen aktiv treningsplan enno'}</h3><p>{myPrograms.find(p=>p.status==='active')?.description||'Når PT-en har tildelt deg ein plan, finn du øktene her.'}</p><div className="pt2-stat-row"><div><strong>{myGoals.length}</strong><span>Synlege mål</span></div><div><strong>{myPrograms.filter(p=>p.status==='active').length}</strong><span>Aktive planar</span></div><div><strong>{myCheckins.filter(c=>c.status==='submitted'||c.status==='reviewed').length}</strong><span>Statussvar</span></div></div></section>
   <section className="pt2-panel"><span className="section-kicker">NESTE STEG</span><h3>{pendingCheckin?'Du har ein statussjekk':'Hald fram med planen'}</h3><p>{pendingCheckin?'PT-en ønskjer ei oppdatering frå deg.':'Opne treningsplanen for å sjå kva som kjem vidare.'}</p><button className="secondary-button" onClick={()=>setTab(pendingCheckin?'status':'plan')}>{pendingCheckin?'Svar på statussjekk':'Sjå treningsplan'} <ArrowRight size={14}/></button></section>
  </div>}
  {staff&&clientId&&tab==='plan'&&<section className="pt2-panel"><div className="pt2-panel-head"><div><span className="section-kicker">PROGRAM OG REKKJEFØLGJE</span><h3>{activeProgram?.title||'Treningsplan'}</h3><p>Øktene ligg i den rekkjefølgja kunden skal gjennomføra dei.</p></div><div className="pt2-inline-actions"><button className="secondary-button" onClick={()=>{setProgramStep(1);setShowProgram(true)}}><Plus size={15}/> Tildel introprogram</button>{activeProgram&&<button className="secondary-button" onClick={()=>setShowSession(true)}><Plus size={15}/> Legg til økt</button>}</div></div>
   {!activeProgram?<Empty>Ingen aktiv plan. Vel eit introprogram og tilpass det til kunden.</Empty>:<><div className="pt2-plan-meta"><Pill tone="success">Aktiv plan</Pill><span>Starta {dateLabel(activeProgram.start_date)}</span><span>{activeProgram.weeks||'–'} veker</span></div><div className="pt2-progress-card"><div className="pt2-progress-head"><strong>Framdrift</strong><b>{programProgress(activeProgram.id).percent}%</b></div><div className="pt2-progress-track"><span style={{width:programProgress(activeProgram.id).percent+'%'}}/></div><small>{programProgress(activeProgram.id).completed} av {programProgress(activeProgram.id).total} treningsøkter fullførte · {programProgress(activeProgram.id).remaining} att</small></div><div className="pt2-week-list">{Array.from({length:Math.max(1,Number(activeProgram.weeks)||1)},(_,i)=>i+1).map(week=>{const weekSessions=clientSessions.filter(s=>(s.week_no||1)===week);return <section className="pt2-week" key={week}><header><strong>Veke {week}</strong><span>{weekSessions.length} element</span></header>{weekSessions.length?weekSessions.map(s=><article className="pt2-session" key={s.id}><div className="pt2-seq">{s.day_no||1}</div><div className="pt2-session-main"><strong>{s.title}</strong><small>{({training:"Treningsøkt",recovery:"Restitusjon",rest:"Kviledag",assessment:"Test / evaluering",information:"Infotime"})[s.session_kind]||"Treningsøkt"} · {s.session_kind==='information'?'Infotime':s.wod_id?"WOD":"Eiga økt"} · {s.estimated_minutes?s.estimated_minutes+" min · ":""}{s.scheduled_date?dateLabel(s.scheduled_date):"Dato ikkje fastsett"}</small>{s.focus_area&&<small>Fokus: {s.focus_area}</small>}{s.coach_note&&<p>{s.coach_note}</p>}{s.session_kind==='information'&&<div className="pt2-info-content">{s.workout_snapshot?.agenda&&<p><b>Agenda:</b> {s.workout_snapshot.agenda}</p>}{s.workout_snapshot?.materials&&<p><b>Materiell:</b> {s.workout_snapshot.materials}</p>}{s.workout_snapshot?.preparation&&<p><b>Førebuing:</b> {s.workout_snapshot.preparation}</p>}</div>}{staff&&s.session_kind!=='information'&&<><button type="button" className="secondary-button pt2-wod-open" onClick={()=>setOpenWodPicker(openWodPicker===s.id?null:s.id)}>{s.wod_id?'Byt WOD':'Vel WOD frå biblioteket'}</button>{openWodPicker===s.id&&<WodPicker compact wods={wods} selectedIds={s.wod_id?[s.wod_id]:[]} multiple={false} onChange={async ids=>{await attachWodToSession(s,ids[0]||'');setOpenWodPicker(null)}} onCancel={()=>setOpenWodPicker(null)} title="WOD til økta" hint="Søk i heile WOD-biblioteket."/>}</>}</div><div className="pt2-inline-actions">{staff&&<><button className="pt2-order-button" disabled={s.sequence_no===1} onClick={()=>moveSession(s,-1)} title="Flytt opp">↑</button><button className="pt2-order-button" disabled={s.sequence_no===clientSessions.length} onClick={()=>moveSession(s,1)} title="Flytt ned">↓</button></>}<Pill tone={s.status==="completed"?"success":""}>{s.status==="completed"?"Gjennomført":s.status==="rest"?"Kvile":"Planlagd"}</Pill></div></article>):<div className="pt2-week-empty">Ingen økter lagde til denne veka.</div>}</section>})}</div></>}
  </section>}
  {!staff&&tab==='plan'&&<div className="pt2-panel"><span className="section-kicker">MI TRENINGSREKKE</span>{myPrograms.filter(p=>p.status==='active').map(p=><section key={p.id}><h3>{p.title}</h3><p>{p.description}</p><div className="pt2-progress-card"><div className="pt2-progress-head"><strong>Di framdrift</strong><b>{programProgress(p.id).percent}%</b></div><div className="pt2-progress-track"><span style={{width:programProgress(p.id).percent+'%'}}/></div><small>{programProgress(p.id).completed} av {programProgress(p.id).total} treningsøkter fullførte · {programProgress(p.id).remaining} att</small></div><div className="pt2-session-list">{sessions.filter(s=>s.program_id===p.id).sort((a,b)=>a.sequence_no-b.sequence_no).map(s=><article className="pt2-session" key={s.id}><div className="pt2-seq">{s.sequence_no}</div><div className="pt2-session-main"><strong>{s.title}</strong><small>Veke {s.week_no||1} · Dag {s.day_no||1} · {s.session_kind==='rest'?'Kviledag':s.session_kind==='recovery'?'Restitusjon':s.session_kind==='assessment'?'Test / evaluering':s.session_kind==='information'?'Infotime':'Treningsøkt'} · {s.estimated_minutes?s.estimated_minutes+' min · ':''}{s.scheduled_date?dateLabel(s.scheduled_date):'Ikkje datofesta'}</small>{s.workout_snapshot?.movements&&<p>{Array.isArray(s.workout_snapshot.movements)?s.workout_snapshot.movements.map(m=>typeof m==='string'?m:m.name||m.exercise_name).join(' · '):s.workout_snapshot.movements}</p>}{s.session_kind==='information'&&<div className="pt2-info-content">{s.workout_snapshot?.agenda&&<p><b>Agenda:</b> {s.workout_snapshot.agenda}</p>}{s.workout_snapshot?.materials&&<p><b>Materiell:</b> {s.workout_snapshot.materials}</p>}{s.workout_snapshot?.preparation&&<p><b>Førebuing:</b> {s.workout_snapshot.preparation}</p>}</div>}{s.coach_note&&<p>{s.coach_note}</p>}</div>{s.status==='completed'?<Pill tone="success">Gjennomført</Pill>:s.session_kind==='rest'?<Pill>Kviledag</Pill>:s.session_kind==='information'?<Pill>Planlagt infotime</Pill>:<div className="pt2-inline-actions">{onLaunchWorkout&&<button className="primary-button" onClick={()=>onLaunchWorkout(s.wod_id||null,s.id,s.title)}>{s.wod_id?'Start økt':'Start eiga økt'}</button>}</div>}</article>)}</div></section>)}{!myPrograms.length&&<Empty>PT-en har ikkje tildelt deg ein treningsplan enno.</Empty>}</div>}
  {staff&&clientId&&tab==='mål'&&<section className="pt2-panel"><div className="pt2-panel-head"><div><span className="section-kicker">MÅL OG FOKUSOMRÅDE</span><h3>Kunden sine mål</h3></div><button className="secondary-button" onClick={()=>setShowGoal(true)}><Plus size={15}/> Legg til mål</button></div><div className="pt2-goal-list">{clientGoals.map(g=><article className="pt2-goal" key={g.id}><div><Pill>{g.area}</Pill><strong>{g.title}</strong><small>{g.baseline||'–'} → {g.target||'–'} {g.unit}</small><small>Status: {g.status==='achieved'?'Nådd':g.status==='paused'?'På pause':'Aktivt'} · Evaluering: {dateLabel(g.target_date)}</small></div><div className="pt2-inline-actions"><button className="secondary-button" disabled={busy||g.status==='active'} onClick={()=>updateGoalStatus(g,'active')}>Aktiver</button><button className="secondary-button" disabled={busy||g.status==='paused'} onClick={()=>updateGoalStatus(g,'paused')}>Pause</button><button className="secondary-button" disabled={busy||g.status==='achieved'} onClick={()=>updateGoalStatus(g,'achieved')}>Marker nådd</button></div></article>)}</div>{!clientGoals.length&&<Empty>Ingen mål er registrerte for kunden.</Empty>}</section>}
  {!staff&&tab==='mål'&&<section className="pt2-panel"><span className="section-kicker">MÅL OG FOKUS</span><h3>Dette arbeider du mot</h3><div className="pt2-goal-list">{myGoals.filter(g=>g.status!=='paused').map(g=><article className="pt2-goal" key={g.id}><div><Pill>{g.area}</Pill><strong>{g.title}</strong><small>{g.baseline||'–'} → {g.target||'–'} {g.unit}</small><small>{g.status==='achieved'?'Mål nådd':'Aktivt mål'} · Evaluering: {dateLabel(g.target_date)}</small></div>{g.status==='achieved'&&<Pill tone="success">Nådd</Pill>}</article>)}</div>{!myGoals.length&&<Empty>PT-en har ikkje lagt inn synlege mål enno.</Empty>}</section>}
  {staff&&clientId&&tab==='kartlegging'&&<section className="pt2-panel"><div className="pt2-panel-head"><div><span className="section-kicker">INNMELDINGAR</span><h3>Kartleggingshistorikk</h3></div></div>{intakes.filter(i=>i.member_id===clientId).map(i=><article className="pt2-detail" key={i.id}><div className="pt2-tags">{(i.goals||[]).map(g=><Pill key={g}>{g}</Pill>)}</div><p><b>Treningsnivå:</b> {i.level} · <b>Frekvens:</b> {i.frequency}</p><p><b>Kvifor PT:</b> {i.reason}</p><p><b>Forventningar:</b> {i.expectations}</p><p><b>Praktiske omsyn:</b> {i.constraints||'Ingen oppgitt'}</p><small>{dateLabel(i.created_at)}</small></article>)}{!intakes.some(i=>i.member_id===clientId)&&<Empty>Ingen kartleggingar enno.</Empty>}</section>}
  {staff&&clientId&&tab==='status'&&<section className="pt2-panel"><div className="pt2-panel-head"><div><span className="section-kicker">MANUELL OPPFØLGING</span><h3>Statussjekkar</h3><p>PT sender skjema når det er behov – ingen automatisk utsending.</p></div><button className="secondary-button" onClick={()=>setShowCheckin(true)}><Plus size={15}/> Send statussjekk</button></div>{checkins.filter(c=>c.member_id===clientId).map(c=><article className="pt2-detail" key={c.id}><div className="pt2-panel-head"><strong>{c.title}</strong><Pill tone={c.status==='submitted'?'success':''}>{c.status==='submitted'?'Besvart':'Ventar på svar'}</Pill></div><small>{dateLabel(c.created_at)}</small>{c.status==='submitted'&&<><button className="secondary-button" onClick={()=>reviewCheckin(c)}>Marker som gjennomgått</button><div className="pt2-answer-list">{(c.questions||[]).map((q,i)=><p key={i}><b>{q}</b><br/>{c.answers?.[i]||''}</p>)}</div></>}</article>)}{!checkins.some(c=>c.member_id===clientId)&&<Empty>Ingen statussjekkar sende.</Empty>}</section>}
  {!staff&&tab==='status'&&<section className="pt2-panel"><span className="section-kicker">STATUSSJEKK</span><h3>Oppfølging frå PT</h3>{pendingCheckin?<form className="pt2-form" onSubmit={answerCheckin}><h4>{pendingCheckin.title}</h4>{pendingCheckin.questions.map((q,i)=><Field key={q} label={q}><textarea rows="2" value={checkinAnswers[i]||''} onChange={e=>setCheckinAnswers(v=>({...v,[i]:e.target.value}))} required/></Field>)}<button className="primary-button" disabled={busy}>Send svar til PT</button></form>:<Empty>Du har ingen statussjekk som ventar på svar.</Empty>}{myCheckins.filter(c=>c.status==='submitted').map(c=><article className="pt2-detail" key={c.id}><strong>{c.title}</strong><small>Sendt {dateLabel(c.submitted_at)}</small>{(c.questions||[]).map((q,i)=><p key={i}><b>{q}</b><br/>{c.answers?.[i]||''}</p>)}</article>)}</section>}
  {showTemplate&&staff&&<div className="pt2-modal-backdrop"><form className="pt2-modal pt2-form" onSubmit={saveTemplate}><div className="pt2-panel-head"><h3>Nytt introprogram</h3><button type="button" className="icon-button" onClick={()=>setShowTemplate(false)}><X size={16}/></button></div><div className="pt2-preset-callout"><div><strong>Snarveg: 6-økters introduksjonskurs</strong><p>Fyller inn eit ferdig oppsett over tre veker. Du kan redigera alle felta før lagring.</p></div><div className="pt2-preset-actions"><button type="button" className="secondary-button" onClick={applySixSessionIntro}>Bruk 6-økters mal</button><button type="button" className="secondary-button" onClick={applyRehabPreset}>Bruk rehab-mal</button><button type="button" className="secondary-button" onClick={applyIntroWithInfo}>Oppstart med infotimar</button></div></div><Field label="Programnamn"><input value={templateDraft.title} onChange={e=>setTemplateDraft(v=>({...v,title:e.target.value}))} required placeholder="Til dømes Start sterk"/></Field><Field label="Skildring"><textarea rows="2" value={templateDraft.description} onChange={e=>setTemplateDraft(v=>({...v,description:e.target.value}))}/></Field><div className="pt2-form-grid"><Field label="Lengd i veker"><input type="number" min="1" max="52" value={templateDraft.weeks} onChange={e=>setTemplateDraft(v=>({...v,weeks:e.target.value}))}/></Field><Field label="Økter per veke"><input type="number" min="1" max="7" value={templateDraft.sessions_per_week} onChange={e=>setTemplateDraft(v=>({...v,sessions_per_week:e.target.value}))}/></Field></div><Field label="Fokusområde"><div className="pt2-check-grid">{FOCUS.map(f=><label className="pt2-check" key={f}><input type="checkbox" checked={templateDraft.focus_areas.includes(f)} onChange={e=>setTemplateDraft(v=>({...v,focus_areas:e.target.checked?[...v.focus_areas,f]:v.focus_areas.filter(x=>x!==f)}))}/>{f}</label>)}</div></Field><Field label="Økter i programmet – ei per linje"><textarea rows="5" value={templateDraft.session_titles} onChange={e=>setTemplateDraft(v=>({...v,session_titles:e.target.value}))}/></Field><div className="pt2-modal-actions"><button type="button" className="secondary-button" onClick={()=>setShowTemplate(false)}>Avbryt</button><button className="primary-button" disabled={busy}>Lagra introprogram</button></div></form></div>}
  {showProgram&&staff&&<div className="pt2-modal-backdrop"><form className="pt2-modal pt2-form" onSubmit={programStep===2?createProgram:e=>{e.preventDefault();setProgramStep(2)}}><div className="pt2-panel-head"><div><span className="section-kicker">TILDEL TRENINGSPLAN · STEG {programStep} AV 2</span><h3>{programStep===1?'Vel program':'Kontroller og tilpass'}</h3></div><button type="button" className="icon-button" onClick={()=>setShowProgram(false)}><X size={16}/></button></div><div className="pt2-step-progress"><span className={programStep===1?'active':'done'}>1 · Program</span><span className={programStep===2?'active':'next'}>2 · Kunde og start</span></div>{programStep===1?<><Field label="Introprogram"><select value={programDraft.template_id} onChange={e=>setProgramDraft(v=>({...v,template_id:e.target.value}))} required><option value="">Vel program …</option>{templates.map(t=><option key={t.id} value={t.id}>{t.title} · {t.weeks} veker</option>)}</select></Field>{templates.find(t=>t.id===programDraft.template_id)&&<div className="pt2-detail"><strong>{templates.find(t=>t.id===programDraft.template_id).title}</strong><p>{templates.find(t=>t.id===programDraft.template_id).description}</p><small>{templates.find(t=>t.id===programDraft.template_id).weeks} veker · {(templates.find(t=>t.id===programDraft.template_id).sessions||[]).length} planlagde element</small><div className="pt2-template-preview">{(templates.find(t=>t.id===programDraft.template_id).sessions||[]).map((row,i)=><span key={i}>{i+1}. {row.title} · {row.session_kind==='information'?'Infotime':row.session_kind==='assessment'?'Evaluering':'Trening'}</span>)}</div></div>}</>:<><Field label="Namn på kundens plan"><input value={programDraft.title} onChange={e=>setProgramDraft(v=>({...v,title:e.target.value}))} placeholder={templates.find(t=>t.id===programDraft.template_id)?.title||'Tilpassa treningsplan'}/></Field><Field label="Startdato"><input type="date" value={programDraft.start_date} onChange={e=>setProgramDraft(v=>({...v,start_date:e.target.value}))}/></Field><Field label="PT sine instruksjonar"><textarea rows="3" value={programDraft.notes} onChange={e=>setProgramDraft(v=>({...v,notes:e.target.value}))} placeholder="Kva skal kunden prioritera? Kva bør justerast?"/></Field></>}<div className="pt2-modal-actions">{programStep===2&&<button type="button" className="secondary-button" onClick={()=>setProgramStep(1)}>← Tilbake</button>}<button type="button" className="secondary-button" onClick={()=>setShowProgram(false)}>Avbryt</button>{programStep===1?<button type="submit" className="primary-button" disabled={!programDraft.template_id}>Neste steg →</button>:<button className="primary-button" disabled={busy}>Opprett og tildel plan</button>}</div></form></div>}
  {showGoal&&staff&&<div className="pt2-modal-backdrop"><form className="pt2-modal pt2-form" onSubmit={saveGoal}><div className="pt2-panel-head"><h3>Nytt mål</h3><button type="button" className="icon-button" onClick={()=>setShowGoal(false)}><X size={16}/></button></div><Field label="Fokusområde"><select value={goalDraft.area} onChange={e=>setGoalDraft(v=>({...v,area:e.target.value}))}>{FOCUS.map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Konkret mål"><input value={goalDraft.title} onChange={e=>setGoalDraft(v=>({...v,title:e.target.value}))} required placeholder="Auka knebøy frå 60 til 80 kg"/></Field><div className="pt2-form-grid"><Field label="Startverdi"><input value={goalDraft.baseline} onChange={e=>setGoalDraft(v=>({...v,baseline:e.target.value}))}/></Field><Field label="Målverdi"><input value={goalDraft.target} onChange={e=>setGoalDraft(v=>({...v,target:e.target.value}))}/></Field><Field label="Eining"><input value={goalDraft.unit} onChange={e=>setGoalDraft(v=>({...v,unit:e.target.value}))} placeholder="kg, min, meter …"/></Field><Field label="Dato for evaluering"><input type="date" value={goalDraft.target_date} onChange={e=>setGoalDraft(v=>({...v,target_date:e.target.value}))}/></Field></div><div className="pt2-modal-actions"><button type="button" className="secondary-button" onClick={()=>setShowGoal(false)}>Avbryt</button><button className="primary-button" disabled={busy}>Lagra mål</button></div></form></div>}
  {showSession&&staff&&<div className="pt2-modal-backdrop"><form className="pt2-modal pt2-form" onSubmit={addSession}><div className="pt2-panel-head"><h3>Legg til økt i rekkja</h3><button type="button" className="icon-button" onClick={()=>setShowSession(false)}><X size={16}/></button></div>{sessionDraft.session_kind!=='information'&&<WodPicker wods={wods} selectedIds={sessionDraft.wod_id?[sessionDraft.wod_id]:[]} multiple={false} onChange={ids=>setSessionDraft(v=>({...v,wod_id:ids[0]||'',title:wods.find(w=>w.id===ids[0])?.name||v.title}))} title="Knytt WOD til økta" hint="Søk etter namn, øving eller format – også private PT-WOD-ar."/>}<Field label="Namn på økta"><input value={sessionDraft.title} onChange={e=>setSessionDraft(v=>({...v,title:e.target.value}))} placeholder="Til dømes Teknikk og mobilitet"/></Field><div className="pt2-form-grid"><Field label="Veke"><input type="number" min="1" max={activeProgram?.weeks||52} value={sessionDraft.week_no} onChange={e=>setSessionDraft(v=>({...v,week_no:e.target.value}))}/></Field><Field label="Dag i veka"><select value={sessionDraft.day_no} onChange={e=>setSessionDraft(v=>({...v,day_no:e.target.value}))}>{[1,2,3,4,5,6,7].map(n=><option key={n} value={n}>Dag {n}</option>)}</select></Field><Field label="Type"><select value={sessionDraft.session_kind} onChange={e=>setSessionDraft(v=>({...v,session_kind:e.target.value}))}><option value="training">Treningsøkt</option><option value="recovery">Restitusjon</option><option value="rest">Kviledag</option><option value="assessment">Test / evaluering</option><option value="information">Infotime / rettleiing</option></select></Field><Field label="Estimert tid (min)"><input type="number" min="1" max="360" value={sessionDraft.estimated_minutes} onChange={e=>setSessionDraft(v=>({...v,estimated_minutes:e.target.value}))}/></Field><Field label="Fokusområde"><select value={sessionDraft.focus_area} onChange={e=>setSessionDraft(v=>({...v,focus_area:e.target.value}))}><option value="">Vel fokus</option>{FOCUS.map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Konkret dato (valfri)"><input type="date" value={sessionDraft.scheduled_date} onChange={e=>setSessionDraft(v=>({...v,scheduled_date:e.target.value}))}/></Field></div>{sessionDraft.session_kind==='information'&&<><Field label="Agenda / tema"><textarea rows="3" value={sessionDraft.agenda} onChange={e=>setSessionDraft(v=>({...v,agenda:e.target.value}))} placeholder="Kva skal gjennomgåast? Mål, teknikk, utstyr eller treningsplan …"/></Field><Field label="Materiell / ressursar"><textarea rows="2" value={sessionDraft.materials} onChange={e=>setSessionDraft(v=>({...v,materials:e.target.value}))} placeholder="Dokument, sjekkliste, utstyr eller lenkjer …"/></Field><Field label="Førebuing for kunden"><textarea rows="2" value={sessionDraft.preparation} onChange={e=>setSessionDraft(v=>({...v,preparation:e.target.value}))} placeholder="Kva bør kunden tenkja gjennom eller ta med?"/></Field></>}<Field label={sessionDraft.session_kind==='information'?'PT sine notat':'Instruksjon til kunden'}><textarea rows="3" value={sessionDraft.notes} onChange={e=>setSessionDraft(v=>({...v,notes:e.target.value}))}/></Field><div className="pt2-modal-actions"><button type="button" className="secondary-button" onClick={()=>setShowSession(false)}>Avbryt</button><button className="primary-button" disabled={busy}>Legg til i planen</button></div></form></div>}
  {staff&&showCustomerPicker&&<div className="pt2-modal-backdrop" role="presentation" onClick={()=>setShowCustomerPicker(false)}><section className="pt2-modal pt2-customer-picker-modal" role="dialog" aria-modal="true" aria-label="Vel aktiv PT-kunde" onClick={e=>e.stopPropagation()}><div className="pt2-panel-head"><div><span className="section-kicker">PT STUDIO · KUNDEVAL</span><h3>Vel kunde</h3></div><button type="button" className="icon-button" onClick={()=>setShowCustomerPicker(false)}><X size={17}/></button></div><label className="pt2-customer-search"><Search size={16}/><input autoFocus value={customerSearch} onChange={e=>setCustomerSearch(e.target.value)} placeholder="Søk etter kundenamn …"/></label><div className="pt2-customer-picker-list">{members.filter(m=>(m.display_name||'').toLowerCase().includes(customerSearch.trim().toLowerCase())).map(m=><button type="button" key={m.id} className={m.id===clientId?'selected':''} onClick={()=>{setClientId(m.id);setTab('oversikt');setShowCustomerPicker(false);setOpenWodPicker(null)}}><span className="pt2-customer-avatar">{m.avatar_url?<img src={m.avatar_url} alt=""/>:(m.display_name||'M').split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase()}</span><span><strong>{m.display_name||'Utan namn'}</strong><small>{m.member_rank||'Rang ikkje tildelt'} · {m.active?'Aktiv':'Inaktiv'}</small></span>{m.id===clientId&&<Pill tone="success">Vald</Pill>}</button>)}{!members.some(m=>(m.display_name||'').toLowerCase().includes(customerSearch.trim().toLowerCase()))&&<Empty>Ingen kundar passar søket.</Empty>}</div></section></div>}
  {showCheckin&&staff&&<div className="pt2-modal-backdrop"><form className="pt2-modal pt2-form" onSubmit={sendCheckin}><div className="pt2-panel-head"><h3>Send statussjekk</h3><button type="button" className="icon-button" onClick={()=>setShowCheckin(false)}><X size={16}/></button></div><Field label="Tittel på skjema"><input value={checkinTitle} onChange={e=>setCheckinTitle(e.target.value)} required/></Field><div className="pt2-detail"><b>Spørsmål som blir sende</b>{CHECK_QUESTIONS.map(q=><p key={q}>• {q}</p>)}</div><div className="pt2-modal-actions"><button type="button" className="secondary-button" onClick={()=>setShowCheckin(false)}>Avbryt</button><button className="primary-button" disabled={busy}>Send til kunden</button></div></form></div>}
 </div>
}
