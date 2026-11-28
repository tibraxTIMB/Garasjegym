import PlanExchange from './PlanExchange.jsx'
import {PT_FLOW_PRESETS,getPtFlowPreset} from '../lib/ptFlowPresets.js'
import {ptFlowRows,ptNextAction,flowStatus,FLOW_MODES,osloDate} from '../lib/ptFlow.js'
import PTPreparation from './PTPreparation.jsx'
import SynchronPreparation from './SynchronPreparation.jsx'
import {priorPtReferences,clientWodUsage} from '../lib/ptPreparationHistory.js'
import {PTWeekCalendar,PTScheduleDialog,PTMoveDialog,PTDirectMoveDialog} from './PTSchedule.jsx'
import {dateSlot,planDate,planTime,slotDate,canMovePlan,resolvePlanSlot} from '../lib/ptSchedule.js'
import {copyProgramWeekRows,nextCoachSession} from '../lib/programReuse.js'
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Activity, ArrowRight, CalendarDays, CheckCircle2, ClipboardList, Dumbbell, Flag, MessageSquareText, Plus, RefreshCw, Target, UserRound, Users, Search, X, MoreVertical, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import Notifications from './Notifications.jsx'
import PTManagement from './PTManagement.jsx'
import PTInquiry from './PTInquiry.jsx'
import PT from './PT.jsx'
import PTInfo from './PTInfo.jsx'
import ScheduleHub from './ScheduleHub.jsx'
import {useFlowConfirm,FlowConfirmDialog} from './FlowEntry.jsx'
import WodPicker from './WodPicker.jsx'
import WodCard from './WodCard.jsx'
const WodBuilder=lazy(()=>import('./WodBuilder.jsx'))
import PTClientWods from './PTClientWods.jsx'
import { isStaff } from '../lib/auth.js'
import { rankForCount } from './Overview.jsx'
import './pt-studio-refine.css'
import './builder-form-contrast.css'
import './customer-journey.css'

const GOALS = ['Bli sterkare','Betre kondisjon og uthald','Auka muskelmasse','Gå ned i vekt','Meir energi og overskot','Betre mobilitet','Betre teknikk','Koma i gang med trening','Førebyggja plager','Prestera betre i idrett']
const FOCUS = ['Styrke','Muskelbygging','Kondisjon','Uthald','Vektreduksjon','Aktivitetsoppbygging','Mobilitet','Kjernestabilitet','Teknikk','Eksplosivitet','Rehabilitering','Seniortrening','Golf og idrett','Generell helse']
const CHECK_QUESTIONS = ['Korleis opplever du framgangen sidan sist?','Kva fungerer best i treninga no?','Kva har vore mest utfordrande?','Har måla dine endra seg?','Kva ønskjer du å fokusera på vidare?','Er treningsmengda passeleg?']
const INTAKE_PREVIEW_QUESTIONS = [
 ['Kva ønskjer du å oppnå?', 'Vel eitt eller fleire mål: '+GOALS.join(', '),true],
 ['Viktigaste mål', 'Vel eitt av måla du har kryssa av for.',false],
 ['Treningsnivå', 'Nybyrjar, Noko erfaring eller Erfaren.',false],
 ['Kor ofte trenar du no?', 'Sjeldan, 1–2 dagar, 3–4 dagar eller 5+ dagar.',false],
 ['Kor mange dagar kan du realistisk trena?', 'Vel 1–6 dagar.',false],
 ['Kvifor ønskjer du PT?', 'Fritekstsvar.',true],
 ['Kva trening likar du?', 'Valfritt fritekstsvar.',false],
 ['Øvingar eller aktivitetar du vil unngå', 'Valfritt fritekstsvar.',false],
 ['Praktiske omsyn / fysiske avgrensingar', 'Valfritt fritekstsvar.',false],
 ['Kva er du sjølv villig til å bidra med?', 'Fritekstsvar.',false],
 ['Kva forventar du av PT-en?', 'Fritekstsvar.',true],
 ['Kva vil vera eit godt resultat etter 8–12 veker?', 'Fritekstsvar.',false]
]
const TEMPLATE_TYPE_LABELS = {intro:'Introduksjon',course:'Kurs',training_plan:'Treningsplan',progression:'Progresjonsløp'}

function Field({label,children,wide=false}) { return <div className={wide?'pt2-field pt2-wide':'pt2-field'}><span>{label}</span>{children}</div> }
function Pill({children,tone=''}) { return <span className={'pt2-pill gg-info-status '+tone}>{children}</span> }
function Empty({children}) { return <div className="pt2-empty">{children}</div> }
function dateLabel(value) { return value ? new Date(value).toLocaleDateString('nn-NO',{day:'numeric',month:'short',year:'numeric'}) : 'Ikkje sett' }

export default function PTStudio({ profile, coachMode=false, simpleMode=false, officeMode=false, onLaunchWorkout, onGroupSchedule=()=>{}, onOpenNotification=()=>{}, focusServiceRequest=null, initialClientId=null, initialWorkspace='studio', initialTab='oversikt', focusRequestId=null, focusGroupClassId=null, focusPanel=null, onFocusPanelConsumed, onFocusRequestConsumed, onFocusGroupClassConsumed, onPrepareSynchron = null, onRecordCalibration = null }) {
 const staff = isStaff(profile)
 const canManageClients = staff || coachMode
 const [loading,setLoading] = useState(true)
 const [busy,setBusy] = useState(false)
 const completionConfirm=useFlowConfirm()
 const [showAllProgress,setShowAllProgress]=useState(false)
 useEffect(()=>setShowAllProgress(false),[initialClientId])
 const [error,setError] = useState('')
 const [notice,setNotice] = useState('')
 const [members,setMembers] = useState([])
 const [clientId,setClientId] = useState(initialClientId||'')
 const [programTargetClientId,setProgramTargetClientId] = useState('')
 useEffect(()=>{if(initialWorkspace)setWorkspace(initialWorkspace)},[initialWorkspace])
 useEffect(()=>{if(initialTab){setTab(initialTab==='ny-kartlegging'?'tenester':initialTab);if(initialTab==='ny-kartlegging'&&!canManageClients)setShowIntake(true)}},[initialTab,canManageClients])
 const [workspace,setWorkspace] = useState('studio')
 const [showCustomerPicker,setShowCustomerPicker] = useState(false)
 const followupTab=id=>{setAssignRequest(null);setFocusedPtReview(null);setTab(id);setShowCustomerPicker(false)}
 const [customerSearch,setCustomerSearch] = useState('')
 const [focusedPtReview,setFocusedPtReview] = useState(null)
 const [assignRequest,setAssignRequest]=useState(null)
 const [moveTarget,setMoveTarget]=useState(null)
 const [directMoveTarget,setDirectMoveTarget]=useState(null)
 const [calendarData,setCalendarData]=useState({clientId:'',assignments:[],appointments:[],error:''})
 const [calendarRevision,setCalendarRevision]=useState(0)
 useEffect(()=>{let live=true;setCalendarData({clientId:'',assignments:[],appointments:[],error:''});setMoveTarget(null);setDirectMoveTarget(null);if(!canManageClients||!clientId)return()=>{live=false};Promise.all([supabase.from('pt_wod_assignments').select('*,wods(id,name,duration_minutes)').eq('member_id',clientId).neq('status','cancelled').limit(200),supabase.from('pt_sessions').select('id,client_id,title,starts_at,duration_minutes,status').eq('client_id',clientId).in('status',['planned','published','completed']).order('starts_at').limit(100)]).then(([a,p])=>{if(live)setCalendarData({clientId,assignments:(a.data||[]).filter(x=>x.member_id===clientId),appointments:(p.data||[]).filter(x=>x.client_id===clientId),error:[a.error,p.error].filter(Boolean).map(e=>e.message).join(' · ')})}).catch(e=>{if(live)setCalendarData({clientId,assignments:[],appointments:[],error:e.message})});return()=>{live=false}},[clientId,canManageClients,calendarRevision])
 const calendar=calendarData.clientId===clientId?calendarData:{assignments:[],appointments:[],error:''}
 useEffect(()=>{setAssignRequest(null);setFocusedPtReview(null);setShowSession(false);setSessionDraft({title:'',wod_id:'',scheduled_date:'',schedule_time:'',week_no:'1',day_no:'1',session_kind:'training',focus_area:'',estimated_minutes:'45',notes:'',agenda:'',materials:'',preparation:''})},[clientId])
 const openClientAssignment=(date='',mode)=>{if(clientId&&selectedMember){setFocusedPtReview(null);setAssignRequest({clientId,id:crypto.randomUUID(),date:typeof date==='string'?date:'',mode})}}
 const refreshCalendar=()=>setCalendarRevision(n=>n+1)
 const [intakePreview,setIntakePreview] = useState(null)
 const [rankCounts,setRankCounts] = useState(null)
 useEffect(()=>{if(initialClientId)setClientId(initialClientId)},[initialClientId])
 useEffect(()=>{if(focusRequestId)setTab('pt-timar')},[focusRequestId])
 const [intakes,setIntakes] = useState([])
 const [goals,setGoals] = useState([])
 const [templates,setTemplates] = useState([])
 const [templateSearch,setTemplateSearch] = useState('')
 const [templateTypeFilter,setTemplateTypeFilter] = useState('all')
 const [programs,setPrograms] = useState([])
 const [sessions,setSessions] = useState([])
 const [checkins,setCheckins] = useState([])
 const [wods,setWods] = useState([])
 const [tab,setTab] = useState('oversikt')
 const [showIntake,setShowIntake] = useState(false)
  const [intakeRequestState,setIntakeRequestState] = useState('not_requested')
 const [showGoal,setShowGoal] = useState(false)
 const [showTemplate,setShowTemplate] = useState(false)
 const [showProgram,setShowProgram] = useState(false)
 const [programStep,setProgramStep] = useState(1)
 const [showSession,setShowSession] = useState(false)
 const [openWodPicker,setOpenWodPicker] = useState(null)
 const evidenceRequest=useRef(0)
 const previewRequest=useRef(0)
 const [planEditor,setPlanEditor]=useState(null)
 const privateDraftRef=useRef(null)
 const planSaveLock=useRef(false)
 const [sessionMenu,setSessionMenu]=useState(null),[previewWod,setPreviewWod]=useState(null),[previewLoading,setPreviewLoading]=useState(false)
 useEffect(()=>{previewRequest.current++;setSessionMenu(null);setPreviewWod(null);setPreviewLoading(false);setPlanEditor(null);privateDraftRef.current=null},[clientId])
 const [editPlan,setEditPlan]=useState(false),[evidenceTarget,setEvidenceTarget]=useState(null),[evidenceRows,setEvidenceRows]=useState([]),[evidenceError,setEvidenceError]=useState(''),[evidenceLoading,setEvidenceLoading]=useState(false),[evidenceSearch,setEvidenceSearch]=useState('')
 useEffect(()=>{evidenceRequest.current++;setEditPlan(false);setOpenWodPicker(null);setEvidenceTarget(null);setEvidenceRows([]);setShowAllProgress(false)},[clientId])
 const [showCheckin,setShowCheckin] = useState(false)
 const [intake,setIntake] = useState({goals:[],primary_goal:'',reason:'',level:'Noko erfaring',frequency:'1–2 dagar',preferred_training:[],avoid:'',weekly_days:'3',constraints:'',commitment:'',expectations:'',desired_outcome:''})
 const [goalDraft,setGoalDraft] = useState({area:'Styrke',title:'',baseline:'',target:'',unit:'',target_date:''})
 const [templateDraft,setTemplateDraft] = useState({title:'',description:'',template_type:'intro',weeks:'6',sessions_per_week:'3',focus_areas:[],session_titles:'Økt 1 – Introduksjon\nØkt 2 – Grunnstyrke\nØkt 3 – Kondisjon'})
 const [customFocusArea,setCustomFocusArea] = useState('')
 const [progressionSteps,setProgressionSteps] = useState([{title:'Grepsstyrke og heng',description:'Bygg trygg hengposisjon og grepsuthald.',exercises:'Aktivt heng\nGrepsheng',criteria:'Kontrollert heng i 20–30 sekund.',wod_id:''}])
 const [programDraft,setProgramDraft] = useState({template_id:'',title:'',start_date:osloDate(),notes:'',flow_unlock_mode:'open',flow_require_all:false})
 const [sessionDraft,setSessionDraft] = useState({title:'',wod_id:'',scheduled_date:'',schedule_time:'',week_no:'1',day_no:'1',session_kind:'training',focus_area:'',estimated_minutes:'45',notes:'',agenda:'',materials:'',preparation:''})
 const [checkinAnswers,setCheckinAnswers] = useState({})
 const [checkinTitle,setCheckinTitle] = useState('Status etter treningsperiode')
 const [clientNote,setClientNote] = useState('')
 const [showArchivedPrograms,setShowArchivedPrograms] = useState(false)
 const [sessionSlotDrafts,setSessionSlotDrafts] = useState({})
 const loadSequence = useRef(0)

 const selectedMember = members.find(m=>m.id===clientId)
 useEffect(()=>{if(canManageClients&&!clientId&&members.length>0&&!initialClientId&&tab!=='administrasjon')setShowCustomerPicker(true)},[canManageClients,clientId,members.length,initialClientId,tab])
 const visibleTemplates = useMemo(()=>templates.filter(template=>{
  const matchesType=templateTypeFilter==='all'||template.template_type===templateTypeFilter
  const query=templateSearch.trim().toLowerCase()
  const matchesSearch=!query||[template.title,template.description,...(template.focus_areas||[])].some(value=>String(value||'').toLowerCase().includes(query))
  return matchesType&&matchesSearch
 }),[templates,templateTypeFilter,templateSearch])
 useEffect(()=>{setIntakePreview(null);setFocusedPtReview(null)},[clientId])
 const selectedRank=rankCounts!==null&&selectedMember?rankForCount(rankCounts[selectedMember.id]||0):null
 const currentIntake = intakes.filter(x=>x.member_id===clientId).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0]
  useEffect(()=>{let cancelled=false;if(!canManageClients||!clientId){setIntakeRequestState('not_requested');return}
    setIntakeRequestState('loading')
    supabase.rpc('get_pt_intake_request_state',{p_member_id:clientId}).then(({data,error})=>{
      if(!cancelled)setIntakeRequestState(error?'unknown':data||'not_requested')
    })
    return()=>{cancelled=true}
  },[canManageClients,clientId,intakes])
 const activeProgram = programs.filter(p=>p.client_id===clientId&&p.status==='active'&&!p.archived_at).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0]
 const archivedPrograms = programs.filter(p=>p.client_id===clientId&&p.archived_at)
 const archivedClientSessions = sessions.filter(s=>s.program_id===activeProgram?.id&&s.archived_at)
 const clientGoals = goals.filter(g=>g.member_id===clientId)
 const clientProgramIds=new Set(programs.filter(p=>p.client_id===clientId).map(p=>p.id))
 const clientProgramWods=sessions.filter(s=>clientProgramIds.has(s.program_id)&&s.wod_id&&!s.archived_at).sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0))
 const pendingClientCheckin = checkins.some(c=>c.member_id===clientId&&c.status==='pending')
 const clientSessions = sessions.filter(s=>s.program_id===activeProgram?.id&&!s.archived_at).sort((a,b)=>(Number(a.week_no)||1)-(Number(b.week_no)||1)||(Number(a.day_no)||1)-(Number(b.day_no)||1)||(Number(a.sequence_no)||0)-(Number(b.sequence_no)||0))
 const flowClientRows=ptFlowRows(activeProgram,clientSessions)
 const nextAction=ptNextAction(flowClientRows)
 const nextClientSession=nextAction.next
 const wodUsage=clientWodUsage({clientId,programs,sessions,assignments:calendar.assignments})
 const previousPt=priorPtReferences({clientId,wodId:nextClientSession?.wod_id,assignments:calendar.assignments,programs,sessions,excludeId:nextClientSession?.id})
 const waitingClientRows=flowClientRows.filter(s=>s.flowState==='review')
 const flowRow=id=>flowClientRows.find(s=>s.id===id)
 const pendingCheckin = checkins.find(c=>c.member_id===profile.id&&c.status==='pending')
 const myPrograms = programs.filter(p=>p.client_id===profile.id&&!p.archived_at)
 const myGoals = goals.filter(g=>g.member_id===profile.id&&g.is_visible)
 const myCheckins = checkins.filter(c=>c.member_id===profile.id)
 function programProgress(programId) {
  const rows=sessions.filter(s=>s.program_id===programId&&!s.archived_at)
  const actionable=rows.filter(s=>!['rest','information'].includes(s.session_kind))
  const completed=actionable.filter(s=>s.status==='completed').length
  const percent=actionable.length?Math.round(completed/actionable.length*100):0
  return {total:actionable.length,completed,percent,remaining:Math.max(0,actionable.length-completed)}
 }

 async function load() {
  const requestId=++loadSequence.current
  setError('')
  try {
   const results = await Promise.all([
    canManageClients ? (async()=>{
     let clients=supabase.from('profiles').select('id,display_name,role,avatar_url,active,membership_status').eq('role','member').neq('id',profile.id).eq('active',true).eq('membership_status','approved').order('display_name')
     // A regular PT works with assigned clients only. Staff retain the full
     // administrative register; database RLS still governs every data read.
     if(coachMode&&!staff){
      const {data:assigned,error:assignmentError}=await supabase.from('pt_client_assignments').select('member_id').eq('coach_user_id',profile.id).eq('status','active')
      if(assignmentError)return {data:[],error:assignmentError}
      if(!assigned?.length)return {data:[],error:null}
      clients=clients.in('id',assigned.map(row=>row.member_id))
     }
     return clients
    })() : Promise.resolve({data:[],error:null}),
    supabase.from('pt_intakes').select('*').order('created_at',{ascending:false}).limit(300),
    supabase.from('pt_client_goals').select('*').order('created_at',{ascending:false}),
    supabase.from('pt_program_templates').select('*').eq('is_active',true).order('title'),
    supabase.from('pt_programs').select('*').order('created_at',{ascending:false}),
    supabase.from('pt_program_sessions').select('*').order('sequence_no'),
    supabase.from('pt_checkins').select('*').order('created_at',{ascending:false}),
    (()=>{let q=supabase.from('wods').select('id,name,format,duration_minutes,movements,notes,timer_settings,is_published,is_archived').eq('is_archived',false).order('name');return q})(),
     canManageClients?supabase.rpc('get_member_workout_leaderboard'):Promise.resolve({data:[],error:null})
   ])
   if(requestId!==loadSequence.current)return
   const labels=['medlemslista','innmeldingar','mål','programmalbibliotek','kundeprogram','programøkter','statussjekkar','WOD-bibliotek','treningsrang']
   const loadErrors=results.flatMap((result,index)=>result.error&&!(index===0&&!canManageClients)?[labels[index]+': '+result.error.message]:[])
   if(loadErrors.length)setError(loadErrors.join(' · '))
   if(results[0].data){
    setMembers(results[0].data)
    // GG-013: Vel kunde eksplisitt når PT Studio ikkje har fått ein kunde frå før.
   }
   setIntakes(results[1].data||[]);setGoals(results[2].data||[]);setTemplates(results[3].data||[])
   setPrograms(results[4].data||[]);setSessions(results[5].data||[]);setCheckins(results[6].data||[]);setWods(results[7].data||[])
    setRankCounts(results[8].error?null:Object.fromEntries((results[8].data||[]).map(row=>[row.member_id,Number(row.workout_count)||0])))
  } catch(loadError) {
   if(requestId===loadSequence.current)setError(loadError?.message||'PT-studioet kunne ikkje hentast.')
  } finally {
   if(requestId===loadSequence.current)setLoading(false)
  }
 }
 useEffect(()=>{load();return()=>{loadSequence.current+=1}},[canManageClients])
 useEffect(()=>{if(!canManageClients)setClientId(profile.id)},[canManageClients,profile.id])

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
 function applyFlowPreset(id){const preset=getPtFlowPreset(id);if(!preset)return;setTemplateDraft(preset.draft);if(preset.steps)setProgressionSteps(preset.steps);setCustomFocusArea('')}
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
 function addTemplateFocusArea(){const value=customFocusArea.trim();if(!value)return;setTemplateDraft(current=>({...current,focus_areas:[...new Set([...(current.focus_areas||[]),value])]}));setCustomFocusArea('')}
 async function saveTemplate(e) {
  e.preventDefault()
  await run(async()=>{
   const isProgression=templateDraft.template_type==='progression'
   const lines=isProgression?progressionSteps.filter(step=>step.title.trim()).map((step,index)=>({title:step.title.trim(),sequence_no:index+1,week_no:index+1,day_no:1,session_kind:'progression_step',focus_area:templateDraft.focus_areas[0]||'Styrke',estimated_minutes:45,wod_id:step.wod_id||null,workout_snapshot:{description:step.description.trim(),exercises:step.exercises.split('\n').map(x=>x.trim()).filter(Boolean),advancement_criteria:step.criteria.trim()}})):templateDraft.session_titles.split('\n').map(x=>x.trim()).filter(Boolean).map(raw=>({title:raw.replace(/^(INFO|TEST):\s*/i,''),session_kind:/^INFO:/i.test(raw)?'information':/^TEST:/i.test(raw)?'assessment':'training'}))
   const capacity=Number(templateDraft.weeks)*Number(templateDraft.sessions_per_week)
   if(!templateDraft.title.trim()||!lines.length)throw new Error('Programmet må ha namn og minst eitt steg eller éi økt.')
   if(!isProgression&&(!Number.isFinite(capacity)||capacity<1||lines.length>capacity))throw new Error('Programmet har plass til '+capacity+' økter. Reduser øktlista eller auk veker / økter per veke.')
   const {error:e}=await supabase.from('pt_program_templates').insert({title:templateDraft.title.trim(),description:templateDraft.description,template_type:templateDraft.template_type,weeks:isProgression?Math.max(1,lines.length):Number(templateDraft.weeks),sessions_per_week:isProgression?1:Number(templateDraft.sessions_per_week),focus_areas:templateDraft.focus_areas,sessions:lines.map((item,index)=>({...item,sequence_no:index+1,week_no:item.week_no||Math.floor(index/Number(templateDraft.sessions_per_week))+1,day_no:item.day_no||(index%Number(templateDraft.sessions_per_week))+1,focus_area:item.focus_area||'',estimated_minutes:item.estimated_minutes||(item.session_kind==='information'?30:45)})),created_by:profile.id})
   if(e)throw e
   setShowTemplate(false);setCustomFocusArea('');setNotice('Kurs- eller planmalen er lagra i biblioteket.')
  })
 }
 async function createProgram(e) {
  e.preventDefault()
  await run(async()=>{
   const template=templates.find(t=>t.id===programDraft.template_id)
   if(!template||!(programTargetClientId||clientId))throw new Error('Vel aktiv kunde og kurs-/planmal.')
   if(programDraft.flow_unlock_mode==='date'&&!programDraft.start_date)throw new Error('Datostyrt plan krev startdato.')
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
   const targetClientId=programTargetClientId||clientId
   const {data:programId,error:e}=await supabase.rpc('create_pt_flow_program_with_sessions',{
    p_program:{
     client_id:targetClientId,
     template_id:template.id,
     program_type:template.template_type||'intro',
     title,
     description:template.description,
     start_date:programDraft.start_date||null,
     weeks:template.weeks,
     focus_areas:template.focus_areas,
     coach_notes:programDraft.notes
    },
    p_sessions:rows,
    p_unlock_mode:programDraft.flow_unlock_mode||'open',
    p_require_approval:programDraft.flow_unlock_mode==='sequence'&&!!programDraft.flow_require_all
   })
   if(e)throw e
   if(!programId)throw new Error('Databasen stadfesta ikkje at PT-programmet vart oppretta.')
   setShowProgram(false);setProgramTargetClientId('');setProgramDraft({template_id:'',title:'',start_date:osloDate(),notes:'',flow_unlock_mode:'open',flow_require_all:false});setNotice('Treningsplanen er oppretta og tildelt kunden.')
  })
 }
 async function addSession(e) {
  e.preventDefault()
  await run(async()=>{
   if(!activeProgram)throw new Error('Kunden må ha ein aktiv treningsplan.')
   if(activeProgram.client_id!==clientId)throw Error('Vel rett kunde og plan.')
   const timing=resolvePlanSlot(activeProgram,{week:Number(sessionDraft.week_no),day:Number(sessionDraft.day_no),date:sessionDraft.scheduled_date,time:sessionDraft.schedule_time})
   if(!sessionDraft.title.trim()&&!sessionDraft.wod_id)throw new Error('Gi økta eit namn eller vel ein WOD.')
   if(sessionDraft.session_kind==='information'&&!sessionDraft.title.trim())throw new Error('Infotimen må ha eit namn eller tema.')
   const wod=sessionDraft.session_kind==='information'?null:wods.find(w=>w.id===sessionDraft.wod_id)
   const existing=sessions.filter(s=>s.program_id===activeProgram.id)
   const nextSequenceNo=existing.reduce((max,row)=>Math.max(max,Number(row.sequence_no)||0),0)+1
   const snapshot=wod
    ? {id:wod.id,title:wod.name,wod_title:wod.name,format:wod.format,duration_minutes:wod.duration_minutes,movements:wod.movements,notes:wod.notes,timer_settings:wod.timer_settings}
    : sessionDraft.session_kind==='information'
     ? {title:sessionDraft.title.trim(),format:'Informasjonstime',agenda:sessionDraft.agenda.trim(),materials:sessionDraft.materials.trim(),preparation:sessionDraft.preparation.trim(),movements:[],notes:sessionDraft.notes.trim()}
     : {title:sessionDraft.title.trim()||'Eigen økt',format:'Eigen økt',movements:[],notes:sessionDraft.notes.trim()}
   const {error:e}=await supabase.from('pt_program_sessions').insert({program_id:activeProgram.id,sequence_no:nextSequenceNo,title:sessionDraft.title.trim()||wod?.name||'Ny økt',wod_id:wod?.id||null,scheduled_date:timing.date||null,week_no:timing.week,day_no:timing.day,session_kind:sessionDraft.session_kind,focus_area:sessionDraft.focus_area,estimated_minutes:sessionDraft.estimated_minutes?Number(sessionDraft.estimated_minutes):null,workout_snapshot:{...snapshot,...(timing.time?{schedule_time:timing.time}:{})},coach_note:sessionDraft.notes,status:'planned'})
   if(e)throw e
   setShowSession(false);setSessionDraft({title:'',wod_id:'',scheduled_date:'',schedule_time:'',week_no:'1',day_no:'1',session_kind:'training',focus_area:'',estimated_minutes:'45',notes:'',agenda:'',materials:'',preparation:''});setNotice('Økta er lagt sist i treningsrekkja.')
  })
 }
 function previewIntroIntake(){
   if(!clientId||!selectedMember){setError('Vel ein kunde før du opnar kartlegging.');return}
   if(intakeRequestState==='loading'){setError('Hentar kartleggingsstatus. Prøv igjen.');return}
   setIntakePreview({id:clientId,name:selectedMember.display_name,readOnly:intakeRequestState==='pending'})
 }
 async function sendIntroIntake(){
   const recipient=intakePreview
   if(!recipient||recipient.readOnly||intakeRequestState==='pending'||!selectedMember||recipient.id!==clientId||selectedMember.id!==recipient.id){
     setIntakePreview(null);setError('Kunden har endra seg. Vel kunde og sjå skjemaet på nytt før du sender.');return
   }
   await run(async()=>{
     const {error:e}=await supabase.rpc('request_pt_intake',{p_member_id:recipient.id})
     if(e)throw e
     setIntakePreview(null)
     setIntakeRequestState('pending')
     setNotice('Oppstartskartlegginga er sendt til '+recipient.name+'. Kunden får varsel og svarar på sitt eige skjema.')
   })
 }
 async function sendCheckin(e) {
  e.preventDefault()
  await run(async()=>{
   if(checkins.some(c=>c.member_id===clientId&&c.status==='pending'))throw new Error('Kunden har allereie ein statussjekk som ventar på svar.')
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
  await run(async()=>{const {error:e}=await supabase.from('pt_checkins').update({status:'reviewed',reviewed_at:new Date().toISOString()}).eq('id',row.id);if(e)throw e;setNotice('Statussvaret er markert som gjennomgått.')})
 }
 async function attachWodToSession(session,wodId) {
  await run(async()=>{
   const wod=wods.find(x=>x.id===wodId)
   const snapshot={...(wod?{id:wod.id,title:wod.name,format:wod.format,duration_minutes:wod.duration_minutes,movements:wod.movements,notes:wod.notes,timer_settings:wod.timer_settings}:{title:session.title,format:'Eigen økt',movements:[],notes:session.coach_note||''}),...(planTime(session)?{schedule_time:planTime(session)}:{})}
   if(!canManageClients||activeProgram?.client_id!==clientId||session.program_id!==activeProgram.id||session.status==='completed'||session.workout_log_id||session.workout_snapshot?.pt_equivalent)throw new Error('Fullførte økter kan ikkje bytast ut.')
   const {data,error:e}=await supabase.from('pt_program_sessions').update({wod_id:wod?.id||null,workout_snapshot:snapshot}).eq('id',session.id).eq('program_id',activeProgram.id).in('status',['planned','in_progress']).is('workout_log_id',null).is('archived_at',null).select('id').maybeSingle()
   if(e||!data)throw e||new Error('Økta er ikkje oppdatert.')
   setOpenWodPicker(null);setNotice(wod?'WOD er knytt til økta.':'WOD-koplinga er fjerna.')
  })
 }
 async function archiveProgram(program) { await run(async()=>{const {error:e}=await supabase.rpc('archive_pt_program',{p_program_id:program.id});if(e)throw e;setNotice('PT-programmet og aktive økter er flytta til arkivet.')}) }
 async function restoreProgram(program) { await run(async()=>{const {error:e}=await supabase.rpc('restore_pt_program',{p_program_id:program.id});if(e)throw e;setNotice('PT-programmet er gjenoppretta.')}) }
 async function archiveProgramSession(session) { await run(async()=>{const {error:e}=await supabase.rpc('archive_pt_program_session',{p_session_id:session.id});if(e)throw e;setNotice('PT-økta er arkivert.')}) }
 async function restoreProgramSession(session) { await run(async()=>{const {error:e}=await supabase.rpc('restore_pt_program_session',{p_session_id:session.id});if(e)throw e;setNotice('PT-økta er gjenoppretta.')}) }
 async function copyClientWeek(week){
  if(busy||!canManageClients||!activeProgram||activeProgram.client_id!==clientId)return
  const target=Array.from({length:Math.max(0,Math.min(activeProgram.weeks||52,52)-week)},(_,i)=>week+i+1).find(n=>!clientSessions.some(s=>Number(s.week_no)===n));if(!target){setError('Ingen ledig veke etter denne.');return}
  let rows;try{rows=copyProgramWeekRows(activeProgram.id,sessions,week,target).map(row=>({...row,scheduled_date:slotDate(activeProgram,target,row.day_no)||null}))}catch(e){setError(e.message);return}
  if(!window.confirm('Kopiera '+rows.length+' planlagde øktelement for '+selectedMember.display_name+' frå veke '+week+' til veke '+target+'? Datoane blir rekna ut for den nye veka. Resultat blir ikkje kopierte.'))return
  await run(async()=>{const {error:e}=await supabase.from('pt_program_sessions').insert(rows);if(e)throw e;setNotice('Veke '+week+' er kopiert til veke '+target+'. Datoane er oppdaterte.')})
 }
 async function moveSessionSlot(session) {
  const draft=sessionSlotDrafts[session.id]||{week_no:String(session.week_no||1),day_no:String(session.day_no||1)}
  const week=Number(draft.week_no),day=Number(draft.day_no)
  if(!canMovePlan(session)||activeProgram?.client_id!==clientId||session.program_id!==activeProgram.id){setError('Berre planlagde økter utan resultat kan flyttast.');return}
  if(!Number.isInteger(week)||week<1||week>Math.min(activeProgram.weeks||52,52)||!Number.isInteger(day)||day<1||day>7){setError('Vel ein dag innanfor planen.');return}
  if(week===Number(session.week_no)&&day===Number(session.day_no)){setSessionSlotDrafts(rows=>({...rows,[session.id]:undefined}));return}
  await run(async()=>{
   const date=slotDate(activeProgram,week,day)
   if(!date&&activeProgram.flow_unlock_mode==='date')throw Error('Bruk kalenderen for å setja dato.')
   const snapshot={...session.workout_snapshot};if(!date)delete snapshot.schedule_time
   const {data,error:e}=await supabase.from('pt_program_sessions').update({week_no:week,day_no:day,scheduled_date:date||null,workout_snapshot:snapshot}).eq('id',session.id).eq('program_id',activeProgram.id).eq('status','planned').is('archived_at',null).is('workout_log_id',null).select('id').maybeSingle()
   if(e||!data)throw e||Error('Økta er ikkje flytta.')
   setSessionSlotDrafts(rows=>({...rows,[session.id]:undefined}))
   setSessionMenu(null);setNotice('Økta er flytta til veke '+week+', dag '+day+'.')
  })
 }
 async function moveSession(session,direction) {
  // The RPC swaps sequence_no; keep this control within the same week/day slot.
  const rows=clientSessions.filter(row=>(row.week_no||1)===(session.week_no||1)&&(row.day_no||1)===(session.day_no||1))
  const index=rows.findIndex(row=>row.id===session.id)
  const next=rows[index+direction]
  if(!next)return
  await run(async()=>{
   const {error:e}=await supabase.rpc('reorder_pt_program_sessions',{p_session_id:session.id,p_target_session_id:next.id})
   if(e)throw e
   setSessionMenu(null);setNotice('Rekkjefølgja i økta er oppdatert.')
  })
 }
 async function updateFlowMode(mode){
  if(busy||!canManageClients||!activeProgram||activeProgram.client_id!==clientId)return
  await run(async()=>{const {data,error:e}=await supabase.from('pt_programs').update({flow_unlock_mode:mode}).eq('id',activeProgram.id).eq('client_id',clientId).select('id').single();if(e||!data)throw e||new Error('Planen vart ikkje oppdatert.');setNotice('Opplåsing er oppdatert.')})
 }
 async function updateFlowSession(s,patch){
  if(busy||!canManageClients||!activeProgram||activeProgram.client_id!==clientId||s.program_id!==activeProgram.id)return
  await run(async()=>{const {data,error:e}=await supabase.from('pt_program_sessions').update(patch).eq('id',s.id).eq('program_id',activeProgram.id).select('id').single();if(e||!data)throw e||new Error('Økta vart ikkje oppdatert.');setNotice('Økta er oppdatert.')})
 }
 async function launchFlowSession(s){
  const {data,error:e}=await supabase.rpc('pt_flow_can_start',{p_session_id:s.id});if(e||data!==true){await load();setError('Økta er ikkje tilgjengeleg no. Oppdater planen eller spør PT.');return}onLaunchWorkout?.(s.wod_id||null,s.id,s.title)
 }
 const evidenceFor=s=>s.workout_snapshot?.pt_equivalent
 const canMark=s=>staff&&['planned','in_progress'].includes(s.status)&&flowRow(s.id)?.flowState==='ready'&&!['rest','information'].includes(s.session_kind)
 const canReference=s=>staff&&!s.workout_log_id&&!evidenceFor(s)&&!['rest','information'].includes(s.session_kind)&&(canMark(s)||s.status==='completed')
 const canUndo=s=>staff&&s.status==='completed'&&!s.workout_log_id&&!s.flow_approved&&!clientSessions.slice(clientSessions.findIndex(x=>x.id===s.id)+1).some(x=>['completed','in_progress'].includes(x.status))
 async function undoManual(s){
  if(busy||!canUndo(s)||activeProgram?.client_id!==clientId)return
  if(!await completionConfirm.ask({title:'Rett feil gjennomføring',message:selectedMember.display_name+' · '+s.title+'. Berre kursstatus og eventuell referanse blir nullstilte. Treningsloggar og PR-ar blir ikkje endra.',confirmLabel:'Set tilbake til planlagd'}))return
  await run(async()=>{const snapshot={...(s.workout_snapshot||{})};delete snapshot.pt_equivalent;const {data,error:e}=await supabase.from('pt_program_sessions').update({status:'planned',completed_at:null,workout_snapshot:snapshot}).eq('id',s.id).eq('program_id',activeProgram.id).eq('status','completed').eq('flow_approved',false).is('workout_log_id',null).is('archived_at',null).select('id').maybeSingle();if(e||!data)throw e||new Error('Økta kunne ikkje rettast.');setNotice('Kursstatus er retta.')})
 }
 const openResult=key=>{setFocusedPtReview(key);setTab('wodar')}
 async function openEvidence(s){
  if(!canReference(s)||!selectedMember)return
  const request=++evidenceRequest.current
  setEvidenceTarget({id:s.id,clientId,programId:activeProgram.id});setEvidenceRows([]);setEvidenceSearch('');setEvidenceError('');setEvidenceLoading(true)
  try{
   const {data,error:e}=await supabase.from('pt_wod_assignments').select('id,member_id,wod_id,status,completed_at,workout_log_id,wods(id,name)').eq('member_id',clientId).eq('status','completed').not('workout_log_id','is',null).order('completed_at',{ascending:false}).limit(150)
   if(e)throw e
   if(request!==evidenceRequest.current)return
   setEvidenceRows((data||[]).filter(a=>a.member_id===clientId&&a.workout_log_id&&!sessions.some(row=>row.id!==s.id&&row.workout_snapshot?.pt_equivalent?.assignment_id===a.id)))
  }catch(e){if(request===evidenceRequest.current)setEvidenceError(e.message||'Kunne ikkje henta delte PT-resultat.')}finally{if(request===evidenceRequest.current)setEvidenceLoading(false)}
 }
 async function linkEvidence(a){
  const s=clientSessions.find(x=>x.id===evidenceTarget?.id)
  if(busy||!s||!canReference(s)||evidenceTarget.clientId!==clientId||evidenceTarget.programId!==activeProgram.id||a.member_id!==clientId||!a.workout_log_id)return
  if(!await completionConfirm.ask({title:'Godkjenn tilsvarande økt',message:selectedMember.display_name+' · '+s.title+' ← '+(a.wods?.name||'Tidlegare PT-økt')+'. Treningsloggen og opphavleg tildeling blir behaldne. Kurssteget blir markert utført.',confirmLabel:'Kopla og marker utført'}))return
  await run(async()=>{
   const {data:verified,error:ve}=await supabase.from('pt_wod_assignments').select('id,member_id,status,workout_log_id,completed_at,wods(id,name)').eq('id',a.id).eq('member_id',clientId).eq('status','completed').maybeSingle()
   if(ve||!verified?.workout_log_id||verified.workout_log_id!==a.workout_log_id)throw ve||new Error('PT-resultatet er ikkje lenger tilgjengeleg.')
   // Preserve planned WOD, original assignment and unique completion-log link.
   const evidence={assignment_id:verified.id,title:verified.wods?.name||'Gjennomført PT-økt',completed_at:verified.completed_at||null,confirmed_at:new Date().toISOString()}
   const patch={workout_snapshot:{...(s.workout_snapshot||{}),pt_equivalent:evidence},...(s.status==='completed'?{}:{status:'completed',completed_at:verified.completed_at||new Date().toISOString()})}
   const {data,error:e}=await supabase.from('pt_program_sessions').update(patch).eq('id',s.id).eq('program_id',activeProgram.id).eq('status',s.status).is('workout_log_id',null).is('archived_at',null).select('id').maybeSingle()
   if(e||!data)throw e||new Error('Planøkta er endra. Oppdater planen og prøv igjen.')
   setEvidenceTarget(null);setNotice('Tilsvarande PT-økt er kopla til '+s.title+'.')
  })
 }
 function openPlanEditor(s){
  if(!staff||busy||!s.wod_id||s.status!=='planned'||s.workout_log_id||evidenceFor(s)||activeProgram?.client_id!==clientId||s.program_id!==activeProgram.id)return
  privateDraftRef.current=null
  setSessionMenu(null);setPlanEditor({sessionId:s.id,programId:s.program_id,clientId,clientName:selectedMember.display_name,sessionTitle:s.title,wodId:s.wod_id})
 }
 async function savePlanEditor(payload){
  const ctx=planEditor
  if(!ctx||!staff||planSaveLock.current||ctx.clientId!==clientId||ctx.programId!==activeProgram?.id||activeProgram.client_id!==clientId)throw new Error('Vel rett kunde og plan på nytt.')
  planSaveLock.current=true
  try{
   const {data:current,error:ce}=await supabase.from('pt_program_sessions').select('id,program_id,wod_id,status,workout_log_id,workout_snapshot').eq('id',ctx.sessionId).eq('program_id',ctx.programId).is('archived_at',null).single()
   if(ce||!current||current.wod_id!==ctx.wodId||current.status!=='planned'||current.workout_log_id||current.workout_snapshot?.pt_equivalent)throw ce||new Error('Planøkta er endra eller påbegynt. Opna ho på nytt.')
   const row={...payload,is_published:false}
   let draftId=privateDraftRef.current
   if(draftId){const {data,error:e}=await supabase.from('wods').update(row).eq('id',draftId).eq('is_published',false).select('id').single();if(e||!data)throw e||new Error('Privat kladd kunne ikkje oppdaterast.')}
   else{const {data,error:e}=await supabase.from('wods').insert(row).select('id').single();if(e||!data)throw e||new Error('Privat kladd kunne ikkje lagrast.');draftId=data.id;privateDraftRef.current=draftId}
   const snapshot={...current.workout_snapshot,id:draftId,title:row.name,wod_title:row.name,format:row.format,duration_minutes:row.duration_minutes,movements:row.movements,notes:row.notes,timer_settings:row.timer_settings}
   const {data,error:e}=await supabase.from('pt_program_sessions').update({wod_id:draftId,workout_snapshot:snapshot}).eq('id',ctx.sessionId).eq('program_id',ctx.programId).eq('wod_id',ctx.wodId).eq('status','planned').is('workout_log_id',null).is('archived_at',null).select('id').maybeSingle()
   if(e||!data)throw new Error('Privat kladd er lagra, men kopling til planen feila. Prøv på nytt i same vindauge. '+(e?.message||'Planøkta kan ha blitt endra.'))
   privateDraftRef.current=null;setPlanEditor(null);await load();setNotice('Tilpassa økt lagra for '+ctx.clientName+'. Original-WOD er uendra.')
  }finally{planSaveLock.current=false}
 }
 async function previewPlanWod(s){
  if(!s.wod_id||previewLoading||activeProgram?.client_id!==clientId||s.program_id!==activeProgram.id)return
  const req=++previewRequest.current;setPreviewLoading(true);setError('')
  try{const {data,error:e}=await supabase.from('wods').select('*').eq('id',s.wod_id).maybeSingle()
   if(req!==previewRequest.current)return
   if(e||!data)throw e||new Error('WOD-en er ikkje tilgjengeleg.')
   setSessionMenu(null);setPreviewWod(data)
  }catch(e){if(req===previewRequest.current)setError(e.message||'Kunne ikkje opna WOD.')}finally{if(req===previewRequest.current)setPreviewLoading(false)}
 }
 function planStatus(s){
  const state=flowRow(s.id)?.flowState
  return state==='review'?'Til godkjenning':state==='locked'?'Låst':state==='ready'?'Klar':s.status==='completed'?'Utført':s.session_kind==='rest'?'Kvile':s.session_kind==='information'?'Informasjon':'Planlagd'
 }
 function openSessionMenu(s,panel='menu'){setSessionMenu({id:s.id,clientId,programId:s.program_id,panel});setOpenWodPicker(null)}
 async function confirmArchive(s){
  if(busy||activeProgram?.client_id!==clientId||s.program_id!==activeProgram.id||s.status==='completed'||s.workout_log_id)return
  if(!await completionConfirm.ask({title:'Arkiver økta?',message:selectedMember.display_name+' · '+s.title+'. Kan gjenopprettast frå arkivet.',confirmLabel:'Arkiver økt',danger:true}))return
  setSessionMenu(null);await archiveProgramSession(s)
 }
 function planCard(s){
  const state=flowRow(s.id)?.flowState, evidence=evidenceFor(s)
  const done=s.status==='completed', ready=state==='ready'
  return <article className={'pt-plan-card pt-compact-session'+(ready?' is-ready':'')+(done?' is-done':'')} key={s.id}>
   <button type="button" className="pt-compact-main" aria-label={'Detaljar: '+s.title} onClick={()=>openSessionMenu(s,'details')}>
    <span className="pt-compact-number">{String(s.sequence_no||s.day_no||1).padStart(2,'0')}</span>
    <span className="pt-compact-copy"><strong>{s.title}</strong><small>Veke {s.week_no||1}{Number(s.day_no)>1?' · Dag '+s.day_no:''}{s.estimated_minutes?' · '+s.estimated_minutes+' min':''}{s.scheduled_date?' · '+dateLabel(s.scheduled_date):''} <span className={'pt-compact-status '+(done?'is-done':ready?'is-ready':'')}>· {planStatus(s)}</span></small></span>
   </button>
   <button type="button" className="pt-compact-more" aria-label={'Handlingar for '+s.title} onClick={()=>openSessionMenu(s)}><MoreVertical size={20}/></button>
   {(state==='review'||ready||done&&!!(s.workout_log_id||evidence?.assignment_id))&&<div className="pt-compact-action">
    {state==='review'?<button type="button" className="primary-button" disabled={busy} onClick={()=>updateFlowSession(s,{flow_approved:true})}>Godkjenn</button>:done?<button type="button" className="secondary-button" onClick={()=>openResult(evidence?.assignment_id?'assignment:'+evidence.assignment_id:'program:'+s.id)}>Sjå resultat</button>:s.wod_id?<button type="button" className="primary-button" disabled={previewLoading} onClick={()=>previewPlanWod(s)}>Opna WOD <ChevronRight size={15}/></button>:<button type="button" className="secondary-button" onClick={()=>openSessionMenu(s,'details')}>Sjå økt</button>}
    {canMark(s)&&<button type="button" className="text-button" disabled={busy} onClick={()=>markClientSessionComplete(s)}>Marker utført</button>}
   </div>}
  </article>
 }
 function sessionActions(s){
  const row=flowRow(s.id),evidence=evidenceFor(s)
  return <div className="pt-plan-actions">
   {row?.flowState==='review'&&<button type="button" className="primary-button" disabled={busy} onClick={()=>updateFlowSession(s,{flow_approved:true})}>Godkjenn og gå vidare</button>}
   {canMark(s)&&<button type="button" className="secondary-button" disabled={busy} onClick={()=>markClientSessionComplete(s)}>Marker utført</button>}
   {canReference(s)&&<button type="button" className="secondary-button" disabled={busy} onClick={()=>openEvidence(s)}>Kopla til utført PT-økt</button>}
   {evidence?.assignment_id&&<button type="button" className="secondary-button" onClick={()=>openResult('assignment:'+evidence.assignment_id)}>Sjå kopla resultat</button>}
   {s.workout_log_id&&s.status==='completed'&&<button type="button" className="secondary-button" onClick={()=>openResult('program:'+s.id)}>Sjå resultat</button>}
   {editPlan&&canUndo(s)&&<button type="button" className="secondary-button" disabled={busy} onClick={()=>undoManual(s)}>Rett gjennomføring</button>}
   {row?.flowState==='locked'&&<small>{row.flowReason}</small>}
  </div>
 }
 async function markClientSessionComplete(session) {
  if(busy||!canManageClients||!selectedMember||!activeProgram||activeProgram.client_id!==clientId||session.program_id!==activeProgram.id||session.archived_at||!canMark(session))return
  if(!await completionConfirm.ask({title:'Marker økta utført',message:selectedMember.display_name+' · '+session.title+'. Oppdaterer berre framdrifta, ikkje treningslogg eller PR.',confirmLabel:'Stadfest utført'}))return
  await run(async()=>{
   const {data,error:e}=await supabase.from('pt_program_sessions').update({status:'completed',completed_at:new Date().toISOString()}).eq('id',session.id).eq('program_id',activeProgram.id).is('archived_at',null).neq('status','completed').select('id').maybeSingle()
   if(e||!data)throw e||new Error('Økta er ikkje oppdatert. Opna planen på nytt og kontroller status.')
   setNotice('Gjennomføring stadfesta for '+selectedMember.display_name+': '+session.title+'.')
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
 
 if(loading)return <div className="training-state">Hentar PT Studio …</div>
 if(staff&&workspace==='groups')return <div className="pt2 pt2-group-workspace"><header className="pt2-workspace-head"><div><span className="section-kicker">GARASJEGYM · PT STUDIO</span><h2>Gruppetimeadministrasjon</h2><p>Opprett timar, administrer påmeldingar og planlegg WOD-ar.</p></div><nav className="pt2-workspace-switch"><button type="button" onClick={()=>setWorkspace('studio')}>PT Studio</button><button type="button" className="selected">Gruppetimeadministrasjon</button></nav></header><ScheduleHub profile={profile} initialTab="booking" initialClassId={focusGroupClassId} onInitialClassConsumed={onFocusGroupClassConsumed} hidePTTab onLaunchWorkout={(wodId)=>onLaunchWorkout?.(wodId,null,'')} onLogResult={(wodId,sessionId)=>onLaunchWorkout?.(wodId,sessionId,'')}/></div>

 return <div className={canManageClients&&clientId&&tab!=='administrasjon'?'pt2 pt2-client-active':'pt2'}>
  <header className="pt2-head pt2-workspace-head"><div><div className="section-kicker">GARASJEGYM · {canManageClients?'PT-KUNDAR':'PERSONLEG TRENING'}</div><h2>{canManageClients?'PT Studio':'PT og oppfølging'}</h2>{!canManageClients&&<p>PT-tenester og personleg treningsoppfølging.</p>}</div></header>
  {canManageClients&&<nav className="pt2-workspace-switch" aria-label="PT-arbeidsflate"><button type="button" className={tab!=='administrasjon'?'selected':''} onClick={()=>{setWorkspace('studio');setTab('oversikt')}}>PT-kundar</button>{staff&&<><button type="button" className={tab==='administrasjon'?'selected':''} onClick={()=>setTab('administrasjon')}>PT-drift</button><button type="button" onClick={()=>setWorkspace('groups')}>Gruppetimar</button></>}</nav>}
  <Notifications compact hideWhenEmpty context="pt-studio" staff={staff} isAdmin={profile.role==='admin'} onNavigate={onOpenNotification}/>
  {error&&<div className="auth-error">{error}</div>}{notice&&<div className="auth-message"><CheckCircle2 size={15}/> {notice}</div>}
  {staff&&tab==='administrasjon'&&<PTManagement profile={profile} focusServiceRequest={focusServiceRequest} onOpenClient={(id,section='oversikt')=>{setClientId(id);setTab(section);setWorkspace('studio')}}/>}
  {!canManageClients&&tab==='tenester'&&!showIntake&&<button type="button" className="secondary-button" onClick={()=>setShowIntake(true)}><ClipboardList size={16}/> Opna kartlegging – fortel PT om måla dine</button>}
   {!canManageClients&&showIntake&&<form className="pt2-panel pt2-form" onSubmit={submitIntake}>
   <div className="pt2-panel-head"><div><span className="section-kicker">KOM I GANG</span><h3>{initialTab==='ny-kartlegging'?'Oppstartskartlegging frå PT':'Fortel oss kva du ønskjer hjelp til'}</h3><p>{initialTab==='ny-kartlegging'?'Svar på spørsmåla slik at PT-en kan planleggja oppfølginga di.':'Kort innmelding – PT-en går gjennom svara før de lagar ein plan saman.'}</p></div><button type="button" className="icon-button" onClick={()=>setShowIntake(false)}><X size={17}/></button></div>
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
   <div className="pt2-form-actions"><button className="primary-button" disabled={busy}>{busy?'Sender …':initialTab==='ny-kartlegging'?'Send svar til PT':'Send innmelding'}</button><span>Opplysningane blir lagra i PT-studioet og er berre tilgjengelege for deg og autorisert PT-personell.</span></div>
  </form>}
  {canManageClients&&tab!=='administrasjon'&&<section className="pt2-panel pt2-customer-bar pt2-customer-bar-secure">
 <div className="pt2-customer-identity">
  <span className="pt2-customer-avatar">{selectedMember?.avatar_url?<img src={selectedMember.avatar_url} alt=""/>:(selectedMember?.display_name||'PT').split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase()}</span>
  <div className="pt2-customer-person"><span className="section-kicker">AKTIV PT-KUNDE</span><strong>{selectedMember?.display_name||'Vel ein kunde'}</strong>
   {selectedMember&&<span className="pt2-customer-rank-pill" title="Rang viser registrert treningsaktivitet, ikkje den private treningsloggen">{selectedRank?<><span>{selectedRank.title}</span>{selectedRank.stars>0&&<span className="pt2-rank-stars" aria-label={selectedRank.stars+' stjerner'}>{'★'.repeat(selectedRank.stars)}</span>}</>:<span>Rang ikkje tilgjengeleg</span>}</span>}
  </div>
  <button type="button" className="secondary-button" onClick={()=>{setCustomerSearch('');setShowCustomerPicker(true)}}><Search size={15}/>{clientId?'Byt kunde':'Vel kunde'}</button>
 </div>
</section>}
  {coachMode&&!loading&&members.length===0&&<section className="pt2-panel"><span className="section-kicker">PT STUDIO</span><h3>Ingen kundar er tildelte deg enno</h3><p>Du får tilgang til kundar når administrator har registrert deg som PT og tildelt deg eit aktivt kundeforhold. Når tildelinga er på plass, kjem kundane automatisk opp her.</p></section>}
  {canManageClients&&selectedMember&&tab!=='administrasjon'&&<nav className="pt2-tabs pt2-coach-primary-tabs" aria-label={'Oppfølging for '+selectedMember.display_name}>
 {[['oversikt','Arbeidsflate'],['plan','Treningsplan'],['wodar','WOD-ar / resultat'],['meir','Meir']].map(([id,label])=><button type="button" key={id} className={tab===id||(id==='meir'&&['mål','kartlegging','status','notat','pt-timar','dialog'].includes(tab))?'selected':''} aria-current={tab===id?'page':undefined} onClick={()=>followupTab(id)}>{label}</button>)}
</nav>}
{canManageClients&&selectedMember&&['mål','kartlegging','status','notat','pt-timar','dialog'].includes(tab)&&<button type="button" className="secondary-button" onClick={()=>setTab('meir')}>← Fleire PT-verktøy</button>}
{canManageClients&&selectedMember&&tab==='meir'&&<section className="pt2-panel pt2-more-tools">
 <div><span className="section-kicker">FLEIRE VERKTØY · {selectedMember.display_name}</span><h3>Vel ei oppgåve</h3></div>
 <div className="pt2-client-overview-actions">
  <button type="button" className="secondary-button" onClick={()=>setTab('mål')}>Mål og fokus</button>
  <button type="button" className="secondary-button" onClick={()=>setTab('kartlegging')}>Kartlegging og svar</button>
  <button type="button" className="secondary-button" onClick={()=>setTab('status')}>Statussjekkar</button>
  <button type="button" className="secondary-button" onClick={()=>setTab('notat')}>Trenarnotat</button>

 </div>
 <p className="ptfollow-footnote">Avanserte PT-verktøy er her når du treng dei, men tek ikkje plass på kundeoversikta.</p>
</section>}
{!canManageClients&&(simpleMode? <><nav className="pt2-tabs pt2-member-primary-tabs">{[['tenester','Få hjelp frå PT'],['oversikt','Min PT'],['plan','Treningsplan'],['meldingar','Meldingar']].map(([id,label])=><button key={id} className={tab===id||(id==='tenester'&&tab==='forespurnader')?'selected':''} onClick={()=>setTab(id)}>{label}</button>)}</nav><details className="pt2-member-extra"><summary>Meir frå PT</summary><nav className="pt2-tabs">{[['mål','Mine mål'],['status','Statussjekk']].map(([id,label])=><button key={id} className={tab===id?'selected':''} onClick={()=>setTab(id)}>{label}</button>)}</nav></details></> : <nav className="pt2-tabs">{[['tenester','Få hjelp frå PT'],['oversikt','Min PT'],['plan','Treningsplan'],['mål','Mine mål'],['status','Statussjekk'],['meldingar','Frå PT']].map(([id,label])=><button key={id} className={tab===id||(id==='tenester'&&tab==='forespurnader')?'selected':''} onClick={()=>setTab(id)}>{label}</button>)}</nav>)}
  {!canManageClients&&(tab==='tenester'||tab==='forespurnader')&&<PTInquiry profile={profile} onGroupSchedule={onGroupSchedule} initialTab={tab==='forespurnader'?'mine':'start'}/>}
  {canManageClients&&selectedMember&&['pt-timar','dialog','notat'].includes(tab)&&<PT key={clientId+'-'+tab} profile={profile} coachMode={coachMode} controlledClientId={clientId} onClientChange={setClientId} hideCustomerPicker focusRequestId={focusRequestId} focusPanel={tab==='dialog'?'dialog':tab==='notat'?'notat':focusPanel||'plan'} onFocusPanelConsumed={onFocusPanelConsumed} onFocusConsumed={onFocusRequestConsumed} onLaunchWorkout={onLaunchWorkout} onPrepareSynchron={officeMode?null:onPrepareSynchron} onClientFollowup={()=>setTab('oversikt')}/>}{!canManageClients&&tab==='meldingar'&&<PTInfo/>}
  {canManageClients&&selectedMember&&tab==='oversikt'&&<div className="pt2-client-overview">
  {<details className="pt2-panel" open={undefined}><summary className="primary-button" style={{cursor:'pointer',padding:12}}>Start fellesøkt med {selectedMember.display_name}</summary>{typeof onPrepareSynchron==='function'?<SynchronPreparation key={clientId} wods={wods} members={members} leaderId={profile.id} initialMemberId={clientId} onPrepare={onPrepareSynchron}/>:<p role="status">Felles styring er ikkje tilgjengeleg no. Kontroller tilkoplinga og avslutt eventuell lokal økt før du prøver igjen. Ikkje start to separate klokker.</p>}</details>}
  <section className="pt2-panel pt2-workbench-actions" aria-label="Kva vil du gjera med kunden?"><h3>Arbeid med {selectedMember.display_name}</h3><div className="pt2-client-overview-actions" style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8}}><button type="button" className="primary-button" onClick={()=>openClientAssignment()}><Dumbbell size={16}/> Tildel WOD</button><button type="button" className="secondary-button" onClick={()=>followupTab('plan')}><CalendarDays size={16}/> {activeProgram?'Jobb med treningsplan':'Tildel treningsplan'}</button><button type="button" className="secondary-button" onClick={()=>followupTab('wodar')}>Sjå resultat</button><button type="button" className="secondary-button" onClick={()=>followupTab('notat')}><ClipboardList size={16}/> PT-notat</button></div></section>
  <section className="pt2-panel">
   <div className="pt2-panel-head"><div><span className="section-kicker">NESTE STEG</span><h3>{activeProgram?activeProgram.title:'Følg opp etter PT-timen'}</h3></div></div>
   <p>{activeProgram?'Kunden har ein aktiv plan. Du finn øktene i Plan.':'Tildel ein WOD eller skriv eit kort trenarnotat. Du treng ikkje oppretta eit heilt program.'}</p>{activeProgram&&<div className="pt2-progress-card"><div className="pt2-progress-head"><strong>{programProgress(activeProgram.id).completed} av {programProgress(activeProgram.id).total} treningsøkter</strong><b>{programProgress(activeProgram.id).percent}%</b></div><div className="pt2-progress-track"><span style={{width:programProgress(activeProgram.id).percent+'%'}}/></div>{nextClientSession?<div><strong>Neste: {nextClientSession.title} · veke {nextClientSession.week_no||1}</strong><PTPreparation session={nextClientSession} references={previousPt} onReview={openResult} expanded/><div className="pt2-client-overview-actions">{nextClientSession.wod_id&&<button type="button" className="primary-button" disabled={previewLoading||busy} onClick={()=>previewPlanWod(nextClientSession)}>Opna WOD</button>}<button type="button" className="secondary-button" onClick={()=>setTab('plan')}>Sjå plan</button></div></div>:<small>{nextAction.review?'Ventar på PT-godkjenning: '+nextAction.review.title:nextAction.blocked?.flowReason||(nextAction.state==='complete'?'Planen er gjennomført.':'Ingen treningsøkter enno.')}</small>}</div>}{activeProgram&&<div className="pt2-acta-progress" aria-label="Framdrift i kundeplan">{clientSessions.filter(s=>!['rest','information'].includes(s.session_kind)).filter(s=>showAllProgress||s.status!=='completed'||flowRow(s.id)?.flowState==='review').slice(0,showAllProgress?undefined:3).map(s=><div className="pt2-acta-progress-row" key={s.id}><span className="pt2-acta-seq">{s.sequence_no}</span><strong>{s.title}</strong><Pill tone={s.status==='completed'?'success':''}>{flowRow(s.id)?.flowState==='review'?'Til vurdering':s.status==='completed'?'Utført':flowRow(s.id)?.flowState==='ready'?'Klar':'Låst'}</Pill>{evidenceFor(s)&&<small className="pt-plan-evidence">{evidenceFor(s).before_launch?'Før lansering: ':'Tilsvarande: '}{evidenceFor(s).title}</small>}{sessionActions(s)}</div>)}<button type="button" className="text-button" onClick={()=>setShowAllProgress(v=>!v)}>{showAllProgress?'Vis neste økter':'Vis alle økter og framdrift'}</button></div>}{pendingClientCheckin&&<button type="button" className="text-button" onClick={()=>setTab('status')}>Statussjekk ventar</button>}
  </section>
  
  <PTClientWods key={clientId} clientId={clientId} onRecordCalibration={onRecordCalibration} clientName={selectedMember.display_name} clientRank={selectedRank} mode="overview" revisionToken={calendarRevision} planSessions={clientProgramWods} wods={wods} onOpenFull={()=>followupTab('wodar')} onOpenReview={key=>{setAssignRequest(null);setFocusedPtReview(key);setTab('wodar')}}/>
 </div>}
 {canManageClients&&selectedMember&&tab==='wodar'&&<PTClientWods key={clientId} clientId={clientId} onRecordCalibration={onRecordCalibration} clientName={selectedMember.display_name} clientRank={selectedRank} mode="full" actorId={officeMode?null:profile.id} onPrepareSynchron={officeMode?null:onPrepareSynchron} onAssign={()=>openClientAssignment()} revisionToken={calendarRevision} planSessions={clientProgramWods} wods={wods} initialReview={focusedPtReview} onReviewClosed={()=>setFocusedPtReview(null)}/>}
 {!canManageClients&&tab==='oversikt'&&<div className="pt2-grid">
   <section className="pt2-panel"><span className="section-kicker">MIN AKTIVE PLAN</span><h3>{myPrograms.find(p=>p.status==='active')?.title||'Ingen aktiv treningsplan enno'}</h3><p>{myPrograms.find(p=>p.status==='active')?.description||'Når PT-en har tildelt deg ein plan, finn du øktene her.'}</p><div className="pt2-stat-row"><div><strong>{myGoals.length}</strong><span>Synlege mål</span></div><div><strong>{myPrograms.filter(p=>p.status==='active').length}</strong><span>Aktive planar</span></div><div><strong>{myCheckins.filter(c=>c.status==='submitted'||c.status==='reviewed').length}</strong><span>Statussvar</span></div></div></section>
   <section className="pt2-panel"><span className="section-kicker">NESTE STEG</span><h3>{pendingCheckin?'Du har ein statussjekk':'Hald fram med planen'}</h3><p>{pendingCheckin?'PT-en ønskjer ei oppdatering frå deg.':'Opne treningsplanen for å sjå kva som kjem vidare.'}</p><button className="secondary-button" onClick={()=>setTab(pendingCheckin?'status':'plan')}>{pendingCheckin?'Svar på statussjekk':'Sjå treningsplan'} <ArrowRight size={14}/></button></section>
  </div>}
  {canManageClients&&clientId&&tab==='plan'&&<>
   <details className="pt2-plan-template-details" open={!activeProgram||undefined}><summary>{activeProgram?'Programmalar og planbibliotek':'Vel treningsplan frå biblioteket'}</summary>
   <section className="pt2-panel pt2-template-library"><div className="pt2-panel-head"><div><span className="section-kicker">PROGRAMMALBIBLIOTEK</span><h3>Vel eit program for kunden</h3><p>Her finn du aktive malar som kan kopierast til eit individuelt kundeprogram.</p></div>{staff&&<button type="button" className="primary-button" onClick={()=>{setTemplateDraft({title:'',description:'',template_type:'course',weeks:'6',sessions_per_week:'3',focus_areas:[],session_titles:'Økt 1 – Grunnlag\nØkt 2 – Progresjon\nØkt 3 – Evaluering'});setShowTemplate(true)}}><Plus size={15}/> Ny programmal</button>}</div>
    {templates.length===0&&<div className="pt2-empty" role="status">Ingen programmalar er oppretta enno. {staff?<button type="button" className="secondary-button" onClick={()=>setShowTemplate(true)}>Opprett første programmal <Plus size={15}/></button>:<span>Be administrator oppretta den første programmalen.</span>}</div>}
     <div className="pt2-template-controls"><label className="pt2-template-search"><Search size={16}/><input value={templateSearch} onChange={e=>setTemplateSearch(e.target.value)} placeholder="Søk etter namn, mål eller fokusområde …"/></label><select aria-label="Filtrer programmalar" value={templateTypeFilter} onChange={e=>setTemplateTypeFilter(e.target.value)}><option value="all">Alle programtypar</option><option value="intro">Introduksjon</option><option value="course">Kurs</option><option value="training_plan">Treningsplan</option><option value="progression">Progresjonsløp</option></select><span className="pt2-template-count">{visibleTemplates.length} av {templates.length} malar</span></div>
    {visibleTemplates.length>0?<div className="pt2-template-grid">{visibleTemplates.map(template=><article className="pt2-template-card" key={template.id}><div className="pt2-template-card-head"><Pill>{TEMPLATE_TYPE_LABELS[template.template_type]||'Program'}</Pill><span>{template.weeks} veker</span></div><h4>{template.title}</h4>{template.description&&<p>{template.description}</p>}<div className="pt2-template-tags">{(template.focus_areas||[]).map(area=><Pill key={area}>{area}</Pill>)}</div><div className="pt2-template-meta"><span><b>{(template.sessions||[]).length}</b> økter / steg</span><span><b>{template.sessions_per_week||'–'}</b> per veke</span></div><button type="button" className="secondary-button" disabled={!!activeProgram} title={activeProgram?'Arkiver eller set den aktive planen på pause før du tildeler ein ny.':''} onClick={()=>{setProgramTargetClientId(clientId);setProgramDraft({template_id:template.id,title:'',start_date:osloDate(),notes:'',flow_unlock_mode:template.template_type==='progression'?'sequence':'open',flow_require_all:template.template_type==='progression'});setProgramStep(1);setShowProgram(true)}}>{activeProgram?'Kunden har aktiv plan':<><Plus size={15}/> Tildel til {selectedMember?.display_name||'kunden'}</>}</button></article>)}</div>:<Empty>{templates.length?'Ingen programmalar passar søket. Prøv eit anna filter.':'Programbiblioteket er tomt. Opprett den første malen for å byggja opp eit bibliotek med introduksjon, styrke, kondisjon, mobilitet eller andre treningsmål.'}</Empty>}
   </section></details>
   <section className="pt2-panel pt-compact-plan"><div className="pt2-panel-head"><div><span className="section-kicker">KUNDEPROGRAM</span><h3>{activeProgram?.title||'Ingen aktiv plan'}</h3></div><div className="pt2-inline-actions">{activeProgram&&<><button type="button" className="secondary-button" aria-pressed={editPlan} onClick={()=>{setEditPlan(v=>!v);setOpenWodPicker(null)}}>{editPlan?'Lukk planinnstillingar':'Planinnstillingar'}</button>{editPlan&&<><button className="secondary-button" onClick={()=>setShowSession(true)}><Plus size={15}/> Legg til økt</button><button type="button" className="secondary-button" disabled={busy} onClick={()=>{if(window.confirm('Arkivera heile PT-programmet og dei aktive øktene? Det kan gjenopprettast seinare.'))archiveProgram(activeProgram)}}>Arkiver program</button></>}</>}</div></div>
   {officeMode&&profile.role==='admin'&&activeProgram&&activeProgram.client_id===clientId&&<PlanExchange key={activeProgram.id} program={activeProgram} sessions={clientSessions} wods={wods}/>}
   {calendar.error&&<p className="auth-error" role="alert">Kalender: {calendar.error}</p>}
   <PTWeekCalendar key={clientId+'-'+(activeProgram?.id||'none')} program={activeProgram} plan={flowClientRows} assignments={calendar.assignments} appointments={calendar.appointments} onAdd={date=>{const slot=dateSlot(activeProgram,date);openClientAssignment(date,slot&&slot.week<=(activeProgram.weeks||52)?'plan':'deadline')}} onOpen={entry=>{if(entry.kind==='plan'){if(entry.row.status==='completed'&&entry.row.workout_log_id){setFocusedPtReview('program:'+entry.row.id);setTab('wodar')}else if(entry.row.wod_id)previewPlanWod(entry.row);else openSessionMenu(entry.row,'details')}else if(entry.kind==='assignment'){if(entry.row.status==='completed'&&entry.row.workout_log_id)setFocusedPtReview('assignment:'+entry.row.id);setTab('wodar')}else setTab('pt-timar')}} onMove={session=>setMoveTarget(session)} onMoveAssignment={staff?setDirectMoveTarget:undefined}/>
   {!activeProgram?<Empty>Ingen aktiv plan. Vel eit kurs eller ein planmal, eller opprett eit eige utviklingsløp.</Empty>:<><div className="pt2-plan-meta"><Pill tone="success">Aktiv plan</Pill><span>Starta {dateLabel(activeProgram.start_date)}</span><span>{activeProgram.weeks||'–'} veker</span></div><div className="pt2-progress-card"><div className="pt2-progress-head"><strong>Framdrift</strong><b>{programProgress(activeProgram.id).percent}%</b></div><div className="pt2-progress-track"><span style={{width:programProgress(activeProgram.id).percent+'%'}}/></div><small>{programProgress(activeProgram.id).completed} av {programProgress(activeProgram.id).total} treningsøkter fullførte · {programProgress(activeProgram.id).remaining} att</small></div>{editPlan&&<div className="pt2-panel pt2-flow-control"><div className="pt2-panel-head"><div><h4>Opplåsing</h4><small>{waitingClientRows.length?waitingClientRows.length+' ventar på PT':nextClientSession?'Neste: '+nextClientSession.title:'Ingen økt klar'}</small></div><select aria-label="Opplåsingsmetode" value={activeProgram.flow_unlock_mode||'open'} disabled={busy} onChange={e=>updateFlowMode(e.target.value)}>{Object.entries(FLOW_MODES).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></div><small>{activeProgram.flow_unlock_mode==='sequence'?'Neste økt opnar etter fullføring og eventuell PT-godkjenning.':activeProgram.flow_unlock_mode==='date'?'Økter utan dato er låste.':'Alle aktive økter er tilgjengelege.'}</small>{waitingClientRows.map(s=><div className="pt2-inline-actions" key={s.id}><strong>{s.title}</strong><button type="button" className="primary-button" disabled={busy} onClick={()=>updateFlowSession(s,{flow_approved:true})}>Godkjenn og gå vidare</button></div>)}</div>}<div className="pt-compact-plan-list" aria-label="Kursøkter">{clientSessions.length?clientSessions.map(planCard):<Empty>Ingen økter i planen.</Empty>}</div>{editPlan&&<div className="pt-compact-week-tools"><strong>Kopier ei veke</strong>{[...new Set(clientSessions.map(s=>Number(s.week_no)||1))].filter(week=>week<52).map(week=><button type="button" className="text-button" key={week} disabled={busy} onClick={()=>copyClientWeek(week)}>Veke {week}</button>)}</div>}</>}
  </section>
  </>}
  {canManageClients&&tab==='plan'&&archivedPrograms.length>0&&<section className="pt2-panel pt2-archive-panel"><div className="pt2-panel-head"><div><span className="section-kicker">ARKIV</span><h3>Arkiverte treningsplanar ({archivedPrograms.length})</h3></div><button type="button" className="secondary-button" onClick={()=>setShowArchivedPrograms(v=>!v)}>{showArchivedPrograms?'Skjul arkiv':'Vis arkiv'}</button></div>{showArchivedPrograms&&archivedPrograms.map(program=><article className="pt2-session" key={program.id}><div className="pt2-session-main"><strong>{program.title}</strong><small>Arkivert {dateLabel(program.archived_at)} · {program.weeks||'–'} veker</small><p>{program.description}</p></div><button type="button" className="primary-button" disabled={busy||!!activeProgram} title={activeProgram?'Arkiver eller set den aktive planen på pause før du gjenopprettar denne.':''} onClick={()=>restoreProgram(program)}>Gjenopprett</button></article>)}</section>}
  {canManageClients&&tab==='plan'&&showArchivedPrograms&&archivedClientSessions.length>0&&<section className="pt2-panel"><span className="section-kicker">ARKIVERTE ØKTER</span><h4>Økter i arkivet ({archivedClientSessions.length})</h4>{archivedClientSessions.map(session=><article className="pt2-session" key={session.id}><div className="pt2-session-main"><strong>{session.title}</strong><small>Veke {session.week_no} · Dag {session.day_no} · Arkivert {dateLabel(session.archived_at)}</small></div><button type="button" className="primary-button" disabled={busy} onClick={()=>restoreProgramSession(session)}>Gjenopprett</button></article>)}</section>}
  {!canManageClients&&tab==='plan'&&<div className="pt2-panel"><span className="section-kicker">MI TRENINGSREKKE</span>{myPrograms.filter(p=>p.status==='active').map(p=><section key={p.id}><h3>{p.title}</h3><p>{p.description}</p><div className="pt2-progress-card"><div className="pt2-progress-head"><strong>Di framdrift</strong><b>{programProgress(p.id).percent}%</b></div><div className="pt2-progress-track"><span style={{width:programProgress(p.id).percent+'%'}}/></div><small>{programProgress(p.id).completed} av {programProgress(p.id).total} treningsøkter fullførte · {programProgress(p.id).remaining} att</small></div><div className="pt2-session-list">{sessions.filter(s=>s.program_id===p.id&&!s.archived_at).sort((a,b)=>(Number(a.week_no)||1)-(Number(b.week_no)||1)||(Number(a.day_no)||1)-(Number(b.day_no)||1)||(Number(a.sequence_no)||0)-(Number(b.sequence_no)||0)).map(s=><article className="pt2-session" key={s.id}><div className="pt2-seq">{s.sequence_no}</div><div className="pt2-session-main"><strong>{s.title}</strong><small>Veke {s.week_no||1} · Dag {s.day_no||1} · {s.session_kind==='rest'?'Kviledag':s.session_kind==='recovery'?'Restitusjon':s.session_kind==='assessment'?'Test / evaluering':s.session_kind==='information'?'Infotime':'Treningsøkt'} · {s.estimated_minutes?s.estimated_minutes+' min · ':''}{s.scheduled_date?dateLabel(s.scheduled_date):'Ikkje datofesta'}</small>{s.session_kind==='progression_step'&&<div className="pt2-progression-summary">{s.workout_snapshot?.description&&<p>{s.workout_snapshot.description}</p>}{s.workout_snapshot?.exercises?.length>0&&<div><b>Øvingar</b><ul>{s.workout_snapshot.exercises.map((exercise,i)=><li key={i}>{exercise}</li>)}</ul></div>}{s.workout_snapshot?.advancement_criteria&&<p><b>Kriterium for neste steg:</b> {s.workout_snapshot.advancement_criteria}</p>}</div>}{s.workout_snapshot?.movements&&<p>{Array.isArray(s.workout_snapshot.movements)?s.workout_snapshot.movements.map(m=>typeof m==='string'?m:m.name||m.exercise_name).join(' · '):s.workout_snapshot.movements}</p>}{s.session_kind==='information'&&<div className="pt2-info-content">{s.workout_snapshot?.agenda&&<p><b>Agenda:</b> {s.workout_snapshot.agenda}</p>}{s.workout_snapshot?.materials&&<p><b>Materiell:</b> {s.workout_snapshot.materials}</p>}{s.workout_snapshot?.preparation&&<p><b>Førebuing:</b> {s.workout_snapshot.preparation}</p>}</div>}{s.coach_note&&<p>{s.coach_note}</p>}</div>{flowStatus(p,sessions,s.id)?.flowState==='review'?<Pill>Til PT-vurdering</Pill>:s.status==='completed'?<Pill tone="success">Gjennomført</Pill>:s.session_kind==='rest'?<Pill>Kviledag</Pill>:s.session_kind==='information'?<Pill>Planlagt infotime</Pill>:flowStatus(p,sessions,s.id)?.flowState!=='ready'?<Pill>{flowStatus(p,sessions,s.id)?.flowReason||'Låst'}</Pill>:<div className="pt2-inline-actions">{s.session_kind==='progression_step'&&<button type="button" className="secondary-button" disabled={busy} onClick={()=>markSession(s,'completed')}>Marker steg fullført</button>}{onLaunchWorkout&&<button className="primary-button" onClick={()=>launchFlowSession(s)}>{s.wod_id?'Start økt':'Start eiga økt'}</button>}</div>}</article>)}</div></section>)}{!myPrograms.length&&<Empty>PT-en har ikkje tildelt deg ein treningsplan enno.</Empty>}</div>}
  {canManageClients&&clientId&&tab==='mål'&&<section className="pt2-panel"><div className="pt2-panel-head"><div><span className="section-kicker">MÅL OG FOKUSOMRÅDE</span><h3>Kunden sine mål</h3></div><button className="secondary-button" onClick={()=>setShowGoal(true)}><Plus size={15}/> Legg til mål</button></div><div className="pt2-goal-list">{clientGoals.map(g=><article className="pt2-goal" key={g.id}><div><Pill>{g.area}</Pill><strong>{g.title}</strong><small>{g.baseline||'–'} → {g.target||'–'} {g.unit}</small><small>Status: {g.status==='achieved'?'Nådd':g.status==='paused'?'På pause':'Aktivt'} · Evaluering: {dateLabel(g.target_date)}</small></div><div className="pt2-inline-actions"><button className="secondary-button" disabled={busy||g.status==='active'} onClick={()=>updateGoalStatus(g,'active')}>Aktiver</button><button className="secondary-button" disabled={busy||g.status==='paused'} onClick={()=>updateGoalStatus(g,'paused')}>Pause</button><button className="secondary-button" disabled={busy||g.status==='achieved'} onClick={()=>updateGoalStatus(g,'achieved')}>Marker nådd</button></div></article>)}</div>{!clientGoals.length&&<Empty>Ingen mål er registrerte for kunden.</Empty>}</section>}
  {!canManageClients&&tab==='mål'&&<section className="pt2-panel"><span className="section-kicker">MÅL OG FOKUS</span><h3>Dette arbeider du mot</h3><div className="pt2-goal-list">{myGoals.filter(g=>g.status!=='paused').map(g=><article className="pt2-goal" key={g.id}><div><Pill>{g.area}</Pill><strong>{g.title}</strong><small>{g.baseline||'–'} → {g.target||'–'} {g.unit}</small><small>{g.status==='achieved'?'Mål nådd':'Aktivt mål'} · Evaluering: {dateLabel(g.target_date)}</small></div>{g.status==='achieved'&&<Pill tone="success">Nådd</Pill>}</article>)}</div>{!myGoals.length&&<Empty>PT-en har ikkje lagt inn synlege mål enno.</Empty>}</section>}
  {canManageClients&&clientId&&tab==='kartlegging'&&<section className="pt2-panel"><div className="pt2-panel-head"><div><span className="section-kicker">INNMELDINGAR</span><h3>Kartleggingshistorikk for {selectedMember?.display_name||'kunden'}</h3></div><div className="pt2-client-overview-actions"><button type="button" className="secondary-button" onClick={()=>load()} disabled={busy}><RefreshCw size={14}/> Oppdater svar</button><button type="button" className="secondary-button" disabled={busy||intakeRequestState==='loading'} onClick={previewIntroIntake}>{intakeRequestState==='pending'?'Sjå utsendt skjema':'Sjå og send oppstartsskjema'}</button></div></div>{intakes.filter(i=>i.member_id===clientId).map(i=><article className="pt2-detail" key={i.id}><div className="pt2-tags">{(i.goals||[]).map(g=><Pill key={g}>{g}</Pill>)}</div><p><b>Treningsnivå:</b> {i.level} · <b>Frekvens:</b> {i.frequency}</p><p><b>Kvifor PT:</b> {i.reason}</p><p><b>Forventningar:</b> {i.expectations}</p><p><b>Praktiske omsyn:</b> {i.constraints||'Ingen oppgitt'}</p><small>{i.status==='reviewed'?'Gjennomgått':'Ventar på vurdering'} · {dateLabel(i.created_at)}</small>{i.status!=='reviewed'&&<button type="button" className="secondary-button" onClick={()=>reviewIntake(i)}>Marker som vurdert</button>}</article>)}{!intakes.some(i=>i.member_id===clientId)&&<Empty>Ingen kartlegging er levert enno. Du kan senda oppstartsskjema her.</Empty>}</section>}
  {canManageClients&&clientId&&tab==='status'&&<section className="pt2-panel"><div className="pt2-panel-head"><div><span className="section-kicker">MANUELL OPPFØLGING</span><h3>Statussjekkar</h3><p>PT sender skjema når det er behov – ingen automatisk utsending.</p></div><button className="secondary-button" disabled={pendingClientCheckin} title={pendingClientCheckin?'Vent til kunden har svart på den opne statussjekken.':''} onClick={()=>setShowCheckin(true)}>{pendingClientCheckin?'Ventande statussjekk':<><Plus size={15}/> Send statussjekk</>}</button></div>{checkins.filter(c=>c.member_id===clientId).map(c=><article className="pt2-detail" key={c.id}><div className="pt2-panel-head"><strong>{c.title}</strong><Pill tone={c.status==='submitted'||c.status==='reviewed'?'success':''}>{c.status==='reviewed'?'Gjennomgått':c.status==='submitted'?'Besvart':'Ventar på svar'}</Pill></div><small>{dateLabel(c.created_at)}</small>{c.status==='submitted'&&<><button className="secondary-button" onClick={()=>reviewCheckin(c)}>Marker som gjennomgått</button><div className="pt2-answer-list">{(c.questions||[]).map((q,i)=><p key={i}><b>{q}</b><br/>{c.answers?.[i]||''}</p>)}</div></>}</article>)}{!checkins.some(c=>c.member_id===clientId)&&<Empty>Ingen statussjekkar sende.</Empty>}</section>}
  {!canManageClients&&tab==='status'&&<section className="pt2-panel"><span className="section-kicker">STATUSSJEKK</span><h3>Oppfølging frå PT</h3>{pendingCheckin?<form className="pt2-form" onSubmit={answerCheckin}><h4>{pendingCheckin.title}</h4>{pendingCheckin.questions.map((q,i)=><Field key={q} label={q}><textarea rows="2" value={checkinAnswers[i]||''} onChange={e=>setCheckinAnswers(v=>({...v,[i]:e.target.value}))} required/></Field>)}<button className="primary-button" disabled={busy}>Send svar til PT</button></form>:<Empty>Du har ingen statussjekk som ventar på svar.</Empty>}{myCheckins.filter(c=>c.status==='submitted').map(c=><article className="pt2-detail" key={c.id}><strong>{c.title}</strong><small>Sendt {dateLabel(c.submitted_at)}</small>{(c.questions||[]).map((q,i)=><p key={i}><b>{q}</b><br/>{c.answers?.[i]||''}</p>)}</article>)}</section>}
  {intakePreview&&canManageClients&&<div className="pt2-modal-backdrop"><section className="pt2-modal pt2-intake-preview" role="dialog" aria-modal="true" aria-labelledby="pt2-intake-preview-title">
   <div className="pt2-panel-head"><div><span className="section-kicker">KONTROLLER FØR UTSENDING</span><h3 id="pt2-intake-preview-title">Oppstartskartlegging til {intakePreview.name}</h3><p>{intakePreview.readOnly?'Dette er skjemaet som vart sendt. Ingen ny utsending blir gjort.':'Dette er alle spørsmåla kunden får. Ingen melding er sendt enno.'}</p></div><button type="button" className="icon-button" aria-label="Avbryt utsending" onClick={()=>setIntakePreview(null)}><X size={18}/></button></div>
   <div className="pt2-intake-preview-recipient"><strong>Mottakar: {intakePreview.name}</strong><small>Dette er det eksisterande oppstartsskjemaet. Kunden svarar på sin eigen mobil.</small></div>
   <ol className="pt2-intake-preview-questions">{INTAKE_PREVIEW_QUESTIONS.map(([question,options,required])=><li key={question}><strong>{question}</strong><span>{options}</span><small>{required?'Obligatorisk':'Valfritt / standardval'}</small></li>)}</ol>
   <div className="pt2-intake-preview-actions"><button type="button" className="secondary-button" onClick={()=>setIntakePreview(null)}>{intakePreview.readOnly?'Lukk':'Avbryt – ikkje send'}</button>{!intakePreview.readOnly&&<button type="button" className="primary-button" disabled={busy||intakeRequestState==='pending'||intakePreview.id!==clientId||selectedMember?.id!==intakePreview.id} onClick={sendIntroIntake}><ClipboardList size={16}/>{busy?'Sender …':'Send skjema til '+intakePreview.name}</button>}</div>
  </section></div>}
  {showTemplate&&staff&&<div className="pt2-modal-backdrop"><form className="pt2-modal pt2-form gg-plan-template-form" onSubmit={saveTemplate}><div className="pt2-panel-head"><h3>Ny kurs- / planmal</h3><button type="button" className="icon-button" onClick={()=>{setShowTemplate(false);setCustomFocusArea('')}}><X size={16}/></button></div><div className="pt2-preset-callout"><div><strong>Start med ei ferdig mal</strong><p>Vel eit utgangspunkt og tilpass innhaldet før lagring.</p></div><div className="pt2-preset-actions"><button type="button" className="secondary-button" onClick={applySixSessionIntro}>Introkurs · 6 økter</button><button type="button" className="secondary-button" onClick={applyRehabPreset}>Rehab-plan</button><button type="button" className="secondary-button" onClick={applyIntroWithInfo}>Oppstart med infotimar</button><button type="button" className="secondary-button" onClick={applyPullupPreset}>Vegen til første pull-up</button>{PT_FLOW_PRESETS.map(p=><button key={p.id} type="button" className="secondary-button" onClick={()=>applyFlowPreset(p.id)}>{p.label}</button>)}</div></div><Field label="Programnamn"><input value={templateDraft.title} onChange={e=>setTemplateDraft(v=>({...v,title:e.target.value}))} required placeholder="Til dømes Start sterk"/></Field><Field label="Programstruktur"><select value={templateDraft.template_type} onChange={e=>setTemplateDraft(v=>({...v,template_type:e.target.value}))}><option value="intro">Introkurs</option><option value="course">Eige kurs</option><option value="training_plan">Treningsplan</option><option value="progression">Progresjonskonsept</option></select></Field><Field label="Skildring"><textarea rows="2" value={templateDraft.description} onChange={e=>setTemplateDraft(v=>({...v,description:e.target.value}))}/></Field><div className="pt2-form-grid"><Field label="Lengd i veker"><input type="number" min="1" max="52" value={templateDraft.weeks} onChange={e=>setTemplateDraft(v=>({...v,weeks:e.target.value}))}/></Field><Field label="Økter per veke"><input type="number" min="1" max="7" value={templateDraft.sessions_per_week} onChange={e=>setTemplateDraft(v=>({...v,sessions_per_week:e.target.value}))}/></Field></div><Field label="Fokusområde / programkategori"><div className="pt2-check-grid">{FOCUS.map(f=><label className="pt2-check" key={f}><input type="checkbox" checked={templateDraft.focus_areas.includes(f)} onChange={e=>setTemplateDraft(v=>({...v,focus_areas:e.target.checked?[...v.focus_areas,f]:v.focus_areas.filter(x=>x!==f)}))}/>{f}</label>)}</div><div className="pt2-custom-focus"><input value={customFocusArea} onChange={e=>setCustomFocusArea(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addTemplateFocusArea()}}} placeholder="Skriv eit eige fokusområde …"/><button type="button" className="secondary-button" disabled={!customFocusArea.trim()} onClick={addTemplateFocusArea}>Legg til</button></div>{templateDraft.focus_areas.filter(area=>!FOCUS.includes(area)).map(area=><Pill key={area}>{area}</Pill>)}</Field>{templateDraft.template_type==='progression'?<section className="pt2-progression-builder"><div className="pt2-panel-head"><div><h4>Progresjonssteg</h4><p>Start enkelt og bygg fram mot målet. WOD-kopling er valfri.</p></div><Pill>{progressionSteps.length} steg</Pill></div>{progressionSteps.map((step,index)=><article className="pt2-progression-step" key={index}><div className="pt2-progression-step-head"><strong>STEG {index+1}</strong><button type="button" className="danger-icon" aria-label="Fjern steg" disabled={progressionSteps.length<=1} onClick={()=>setProgressionSteps(rows=>rows.filter((_,i)=>i!==index))}><X size={15}/></button></div><div className="pt2-progression-fields"><Field label="Namn på steg"><input value={step.title} onChange={e=>updateProgressionStep(index,{title:e.target.value})} required/></Field><Field label="Kort beskriving"><textarea rows="2" value={step.description} onChange={e=>updateProgressionStep(index,{description:e.target.value})}/></Field><Field label="Øvingar – ei per linje"><textarea rows="3" value={step.exercises} onChange={e=>updateProgressionStep(index,{exercises:e.target.value})}/></Field><Field label="Kriterium for å gå vidare"><textarea rows="2" value={step.criteria} onChange={e=>updateProgressionStep(index,{criteria:e.target.value})}/></Field><Field label="Knytt WOD (valfritt)"><select value={step.wod_id} onChange={e=>updateProgressionStep(index,{wod_id:e.target.value})}><option value="">Utan WOD-kopling</option>{wods.map(w=><option key={w.id} value={w.id}>{w.name} · {w.format}</option>)}</select></Field></div></article>)}<button type="button" className="secondary-button" onClick={()=>setProgressionSteps(rows=>[...rows,{title:'Nytt steg',description:'',exercises:'',criteria:'',wod_id:''}])}><Plus size={15}/> Legg til steg</button></section>:<section className="gg-plan-template-rows"><div className="pt2-panel-head"><h4>Økter i programmet</h4><small>{templateDraft.session_titles.split('\n').filter(x=>x.trim()).length} økter</small></div>{templateDraft.session_titles.split('\n').map((raw,i)=><div className="gg-plan-template-row" key={i}><span>{String(i+1).padStart(2,'0')}</span><input aria-label={'Namn på økt '+(i+1)} value={raw} onChange={e=>setTemplateDraft(v=>({...v,session_titles:v.session_titles.split('\n').map((x,j)=>j===i?e.target.value:x).join('\n')}))}/><button type="button" aria-label={'Fjern økt '+(i+1)} onClick={()=>setTemplateDraft(v=>({...v,session_titles:v.session_titles.split('\n').filter((_,j)=>j!==i).join('\n')}))}><X size={16}/></button></div>)}<button type="button" className="secondary-button" onClick={()=>setTemplateDraft(v=>({...v,session_titles:(v.session_titles.trim()?v.session_titles+'\n':'')+'Ny økt'}))}><Plus size={16}/> Legg til økt</button><small>Dette er kursstrukturen. Sjølve treningsøktene kan knytast til WOD og tilpassast i kunden sin plan.</small></section>}<div className="pt2-modal-actions"><button type="button" className="secondary-button" onClick={()=>{setShowTemplate(false);setCustomFocusArea('')}}>Avbryt</button><button className="primary-button" disabled={busy}>Lagra mal</button></div></form></div>}
  {showProgram&&canManageClients&&<div className="pt2-modal-backdrop"><form className="pt2-modal pt2-form" onSubmit={programStep===2?createProgram:e=>{e.preventDefault();setProgramStep(2)}}><div className="pt2-panel-head"><div><span className="section-kicker">TILDEL TRENINGSPLAN · STEG {programStep} AV 2</span><h3>{programStep===1?'Vel kurs eller plan':'Kontroller og tilpass'}</h3></div><button type="button" className="icon-button" onClick={()=>{setShowProgram(false);setProgramTargetClientId('')}}><X size={16}/></button></div><div className="pt2-step-progress"><span className={programStep===1?'active':'done'}>1 · Program</span><span className={programStep===2?'active':'next'}>2 · Mottakar og start</span></div><div className="pt2-detail pt2-assignment-recipient"><span className="section-kicker">MOTTAR TILDELINGA</span><strong>{members.find(member=>member.id===(programTargetClientId||clientId))?.display_name||'Kunde ikkje vald'}</strong><small>Treningsrang: {rankCounts!==null?rankForCount(rankCounts[programTargetClientId||clientId]||0).title:'Ikkje tilgjengeleg'}</small></div>{programStep===1?<><Field label="Kurs- eller planmal"><select value={programDraft.template_id} onChange={e=>{const id=e.target.value,progression=templates.find(t=>t.id===id)?.template_type==='progression';setProgramDraft(v=>({...v,template_id:id,flow_unlock_mode:progression?'sequence':'open',flow_require_all:progression}))}} required><option value="">Vel mal …</option>{templates.map(t=><option key={t.id} value={t.id}>{t.title} · {({intro:'Intro',course:'Kurs',training_plan:'Treningsplan',progression:'Progresjon'}[t.template_type]||'Plan')} · {t.weeks} veker</option>)}</select></Field>{templates.find(t=>t.id===programDraft.template_id)&&<div className="pt2-detail"><strong>{templates.find(t=>t.id===programDraft.template_id).title}</strong><p>{templates.find(t=>t.id===programDraft.template_id).description}</p><small>{templates.find(t=>t.id===programDraft.template_id).weeks} veker · {(templates.find(t=>t.id===programDraft.template_id).sessions||[]).length} planlagde element</small><div className="pt2-template-preview">{(templates.find(t=>t.id===programDraft.template_id).sessions||[]).map((row,i)=><span key={i}>{i+1}. {row.title} · {row.session_kind==='information'?'Infotime':row.session_kind==='assessment'?'Evaluering':'Trening'}</span>)}</div></div>}</>:<><Field label="Namn på kundens plan"><input value={programDraft.title} onChange={e=>setProgramDraft(v=>({...v,title:e.target.value}))} placeholder={templates.find(t=>t.id===programDraft.template_id)?.title||'Tilpassa treningsplan'}/></Field><Field label="Startdato"><input type="date" value={programDraft.start_date} onChange={e=>setProgramDraft(v=>({...v,start_date:e.target.value}))}/></Field><Field label="Opplåsing"><select value={programDraft.flow_unlock_mode||'open'} onChange={e=>setProgramDraft(v=>({...v,flow_unlock_mode:e.target.value,flow_require_all:e.target.value==='sequence'&&v.flow_require_all}))}>{Object.entries(FLOW_MODES).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select><small>{programDraft.flow_unlock_mode==='date'?'Datoane blir rekna frå startdato, veke og dag. Juster ved behov i Plan.':programDraft.flow_unlock_mode==='sequence'?'Neste økt opnar etter lagra resultat.':'Alle øktene er opne.'}</small></Field>{programDraft.flow_unlock_mode==='sequence'&&<label className="pt2-check"><input type="checkbox" checked={!!programDraft.flow_require_all} onChange={e=>setProgramDraft(v=>({...v,flow_require_all:e.target.checked}))}/> Krev PT-godkjenning før neste økt</label>}<Field label="PT sine instruksjonar"><textarea rows="3" value={programDraft.notes} onChange={e=>setProgramDraft(v=>({...v,notes:e.target.value}))} placeholder="Kva skal kunden prioritera? Kva bør justerast?"/></Field></>}<div className="pt2-modal-actions">{programStep===2&&<button type="button" className="secondary-button" onClick={()=>setProgramStep(1)}>← Tilbake</button>}<button type="button" className="secondary-button" onClick={()=>setShowProgram(false)}>Avbryt</button>{programStep===1?<button type="submit" className="primary-button" disabled={!programDraft.template_id}>Neste steg →</button>:<button className="primary-button" disabled={busy}>Opprett og tildel plan</button>}</div></form></div>}
  {showGoal&&canManageClients&&<div className="pt2-modal-backdrop"><form className="pt2-modal pt2-form" onSubmit={saveGoal}><div className="pt2-panel-head"><h3>Nytt mål</h3><button type="button" className="icon-button" onClick={()=>setShowGoal(false)}><X size={16}/></button></div><Field label="Fokusområde"><select value={goalDraft.area} onChange={e=>setGoalDraft(v=>({...v,area:e.target.value}))}>{FOCUS.map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Konkret mål"><input value={goalDraft.title} onChange={e=>setGoalDraft(v=>({...v,title:e.target.value}))} required placeholder="Auka knebøy frå 60 til 80 kg"/></Field><div className="pt2-form-grid"><Field label="Startverdi"><input value={goalDraft.baseline} onChange={e=>setGoalDraft(v=>({...v,baseline:e.target.value}))}/></Field><Field label="Målverdi"><input value={goalDraft.target} onChange={e=>setGoalDraft(v=>({...v,target:e.target.value}))}/></Field><Field label="Eining"><input value={goalDraft.unit} onChange={e=>setGoalDraft(v=>({...v,unit:e.target.value}))} placeholder="kg, min, meter …"/></Field><Field label="Dato for evaluering"><input type="date" value={goalDraft.target_date} onChange={e=>setGoalDraft(v=>({...v,target_date:e.target.value}))}/></Field></div><div className="pt2-modal-actions"><button type="button" className="secondary-button" onClick={()=>setShowGoal(false)}>Avbryt</button><button className="primary-button" disabled={busy}>Lagra mål</button></div></form></div>}
  {showSession&&canManageClients&&<div className="pt2-modal-backdrop"><form className="pt2-modal pt2-form" onSubmit={addSession}><div className="pt2-panel-head"><div><h3>Legg til økt i rekkja</h3><small>{selectedMember?.display_name} · {activeProgram?.title}</small></div><button type="button" className="icon-button" onClick={()=>setShowSession(false)}><X size={16}/></button></div>{sessionDraft.session_kind!=='information'&&<WodPicker wods={wods} selectedIds={sessionDraft.wod_id?[sessionDraft.wod_id]:[]} multiple={false} onChange={ids=>setSessionDraft(v=>({...v,wod_id:ids[0]||'',title:wods.find(w=>w.id===ids[0])?.name||v.title}))} title="Knytt WOD til økta" hint="Søk etter namn, øving eller format – også private PT-WOD-ar."/>}<Field label="Namn på økta"><input value={sessionDraft.title} onChange={e=>setSessionDraft(v=>({...v,title:e.target.value}))} placeholder="Til dømes Teknikk og mobilitet"/></Field><div className="pt2-form-grid"><Field label="Veke"><input type="number" min="1" max={activeProgram?.weeks||52} value={sessionDraft.week_no} onChange={e=>setSessionDraft(v=>({...v,week_no:e.target.value,scheduled_date:''}))}/></Field><Field label="Dag i veka"><select value={sessionDraft.day_no} onChange={e=>setSessionDraft(v=>({...v,day_no:e.target.value,scheduled_date:''}))}>{[1,2,3,4,5,6,7].map(n=><option key={n} value={n}>Dag {n}</option>)}</select></Field><Field label="Type"><select value={sessionDraft.session_kind} onChange={e=>setSessionDraft(v=>({...v,session_kind:e.target.value}))}><option value="training">Treningsøkt</option><option value="recovery">Restitusjon</option><option value="rest">Kviledag</option><option value="assessment">Test / evaluering</option><option value="information">Infotime / rettleiing</option></select></Field><Field label="Estimert tid (min)"><input type="number" min="1" max="360" value={sessionDraft.estimated_minutes} onChange={e=>setSessionDraft(v=>({...v,estimated_minutes:e.target.value}))}/></Field><Field label="Fokusområde"><select value={sessionDraft.focus_area} onChange={e=>setSessionDraft(v=>({...v,focus_area:e.target.value}))}><option value="">Vel fokus</option>{FOCUS.map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Planlagd dato"><input type="date" value={sessionDraft.scheduled_date||slotDate(activeProgram,Number(sessionDraft.week_no),Number(sessionDraft.day_no))||''} onChange={e=>{const date=e.target.value,slot=dateSlot(activeProgram,date);setSessionDraft(v=>({...v,scheduled_date:date,...(slot?{week_no:String(slot.week),day_no:String(slot.day)}:{})}))}}/></Field><Field label="Klokkeslett (valfritt)"><input type="time" value={sessionDraft.schedule_time} onChange={e=>setSessionDraft(v=>({...v,schedule_time:e.target.value}))}/></Field></div>{sessionDraft.session_kind==='information'&&<><Field label="Agenda / tema"><textarea rows="3" value={sessionDraft.agenda} onChange={e=>setSessionDraft(v=>({...v,agenda:e.target.value}))} placeholder="Kva skal gjennomgåast? Mål, teknikk, utstyr eller treningsplan …"/></Field><Field label="Materiell / ressursar"><textarea rows="2" value={sessionDraft.materials} onChange={e=>setSessionDraft(v=>({...v,materials:e.target.value}))} placeholder="Dokument, sjekkliste, utstyr eller lenkjer …"/></Field><Field label="Førebuing for kunden"><textarea rows="2" value={sessionDraft.preparation} onChange={e=>setSessionDraft(v=>({...v,preparation:e.target.value}))} placeholder="Kva bør kunden tenkja gjennom eller ta med?"/></Field></>}<Field label={sessionDraft.session_kind==='information'?'PT sine notat':'Instruksjon til kunden'}><textarea rows="3" value={sessionDraft.notes} onChange={e=>setSessionDraft(v=>({...v,notes:e.target.value}))}/></Field><div className="pt2-modal-actions"><button type="button" className="secondary-button" onClick={()=>setShowSession(false)}>Avbryt</button><button className="primary-button" disabled={busy}>Legg til i planen</button></div></form></div>}
  {canManageClients&&showCustomerPicker&&<div className="pt2-modal-backdrop" role="presentation" onClick={()=>setShowCustomerPicker(false)}><section className="pt2-modal pt2-customer-picker-modal" role="dialog" aria-modal="true" aria-label="Vel aktiv PT-kunde" onClick={e=>e.stopPropagation()}><div className="pt2-panel-head"><div><span className="section-kicker">PT STUDIO · KUNDEVAL</span><h3>Vel kunde</h3></div><button type="button" className="icon-button" onClick={()=>setShowCustomerPicker(false)}><X size={17}/></button></div><label className="pt2-customer-search"><Search size={16}/><input autoFocus value={customerSearch} onChange={e=>setCustomerSearch(e.target.value)} placeholder="Søk etter kundenamn …"/></label><div className="pt2-customer-picker-list">{members.filter(m=>(m.display_name||'').toLowerCase().includes(customerSearch.trim().toLowerCase())).map(m=><button type="button" key={m.id} className={m.id===clientId?'selected':''} onClick={()=>{setClientId(m.id);setTab('oversikt');setShowCustomerPicker(false);setOpenWodPicker(null);setShowProgram(false);setProgramTargetClientId('');setShowCheckin(false);setIntakePreview(null)}}><span className="pt2-customer-avatar">{m.avatar_url?<img src={m.avatar_url} alt=""/>:(m.display_name||'M').split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase()}</span><span><strong>{m.display_name||'Utan namn'}</strong><small>{rankCounts!==null?rankForCount(rankCounts[m.id]||0).title:'Rang ikkje tilgjengeleg'} · {m.active?'Aktiv':'Inaktiv'}</small></span>{m.id===clientId&&<Pill tone="success">Vald</Pill>}</button>)}{!members.some(m=>(m.display_name||'').toLowerCase().includes(customerSearch.trim().toLowerCase()))&&<Empty>Ingen kundar passar søket.</Empty>}</div></section></div>}
  {showCheckin&&canManageClients&&<div className="pt2-modal-backdrop"><form className="pt2-modal pt2-form" onSubmit={sendCheckin}><div className="pt2-panel-head"><h3>Send statussjekk</h3><button type="button" className="icon-button" onClick={()=>setShowCheckin(false)}><X size={16}/></button></div><Field label="Tittel på skjema"><input value={checkinTitle} onChange={e=>setCheckinTitle(e.target.value)} required/></Field><div className="pt2-detail"><b>Spørsmål som blir sende</b>{CHECK_QUESTIONS.map(q=><p key={q}>• {q}</p>)}</div><div className="pt2-modal-actions"><button type="button" className="secondary-button" onClick={()=>setShowCheckin(false)}>Avbryt</button><button className="primary-button" disabled={busy}>Send til kunden</button></div></form></div>}
  {sessionMenu&&sessionMenu.clientId===clientId&&sessionMenu.programId===activeProgram?.id&&(()=>{const s=clientSessions.find(x=>x.id===sessionMenu.id);if(!s)return null;const panel=sessionMenu.panel,done=s.status==='completed',state=flowRow(s.id)?.flowState,ev=evidenceFor(s),sameSlot=clientSessions.filter(row=>(row.week_no||1)===(s.week_no||1)&&(row.day_no||1)===(s.day_no||1)),position=sameSlot.findIndex(x=>x.id===s.id);const back=()=>openSessionMenu(s);return <div className="pt2-modal-backdrop" onClick={()=>setSessionMenu(null)}><section className="pt2-modal pt-plan-picker-modal pt-compact-menu" role="dialog" aria-modal="true" aria-label={'Øktmeny: '+s.title} onClick={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==='Escape')setSessionMenu(null)}}><header className="pt-plan-picker-head"><div><strong>{s.title}</strong><small>{selectedMember?.display_name} · Veke {s.week_no||1} · {planStatus(s)}</small></div><button type="button" className="icon-button" aria-label="Lukk" onClick={()=>setSessionMenu(null)}><X size={18}/></button></header>
  {panel==='menu'&&<div className="pt-compact-menu-list">
   <button type="button" onClick={()=>openSessionMenu(s,'details')}>Sjå øktdetaljar <ChevronRight size={16}/></button>
   {s.wod_id&&<button type="button" disabled={previewLoading} onClick={()=>previewPlanWod(s)}>Opna WOD <ChevronRight size={16}/></button>}
   {canMark(s)&&<button type="button" onClick={()=>{setSessionMenu(null);markClientSessionComplete(s)}}>Marker utført <ChevronRight size={16}/></button>}
   {canReference(s)&&<button type="button" onClick={()=>{setSessionMenu(null);openEvidence(s)}}>Kopla til utført PT-økt <ChevronRight size={16}/></button>}
   {canUndo(s)&&<button type="button" onClick={()=>{setSessionMenu(null);undoManual(s)}}>Rett gjennomføring <ChevronRight size={16}/></button>}
   {ev?.assignment_id&&<button type="button" onClick={()=>{setSessionMenu(null);openResult('assignment:'+ev.assignment_id)}}>Sjå kopla resultat <ChevronRight size={16}/></button>}
   {s.workout_log_id&&done&&<button type="button" onClick={()=>{setSessionMenu(null);openResult('program:'+s.id)}}>Sjå resultat <ChevronRight size={16}/></button>}
   {staff&&s.status==='planned'&&s.wod_id&&!s.workout_log_id&&!ev&&<button type="button" onClick={()=>openPlanEditor(s)}>Tilpass økt <ChevronRight size={16}/></button>}{canMovePlan(s)&&<button type="button" onClick={()=>openSessionMenu(s,'move')}>Flytt økt <ChevronRight size={16}/></button>}
   {!done&&s.session_kind!=='information'&&<button type="button" onClick={()=>{setSessionMenu(null);setOpenWodPicker(s.id)}}>{s.wod_id?'Byt WOD':'Vel WOD'} <ChevronRight size={16}/></button>}
   {!done&&!['rest','information'].includes(s.session_kind)&&<button type="button" onClick={()=>openSessionMenu(s,'flow')}>Opplåsingsreglar <ChevronRight size={16}/></button>}
   {!done&&!s.workout_log_id&&<button type="button" className="pt-compact-danger" disabled={busy} onClick={()=>confirmArchive(s)}>Arkiver økt <ChevronRight size={16}/></button>}
  </div>}
  {panel==='details'&&<div className="pt-compact-details"><small>{s.estimated_minutes?s.estimated_minutes+' min · ':''}{s.scheduled_date?dateLabel(s.scheduled_date):'Dato ikkje fastsett'}</small>{s.focus_area&&<p><b>Fokus:</b> {s.focus_area}</p>}{s.coach_note&&<p>{s.coach_note}</p>}{ev&&<p>{ev.before_launch?'Før lansering: ':'Tilsvarande: '}{ev.title}</p>}{s.workout_snapshot?.description&&<p>{s.workout_snapshot.description}</p>}{s.workout_snapshot?.exercises?.length>0&&<ul>{s.workout_snapshot.exercises.map((exercise,i)=><li key={i}>{exercise}</li>)}</ul>}{['advancement_criteria','agenda','materials','preparation'].map(key=>s.workout_snapshot?.[key]&&<p key={key}>{s.workout_snapshot[key]}</p>)}{state==='locked'&&<p>{flowRow(s.id)?.flowReason}</p>}{s.wod_id&&<button type="button" className="primary-button" disabled={previewLoading} onClick={()=>previewPlanWod(s)}>Opna WOD</button>}{staff&&s.status==='planned'&&s.wod_id&&!s.workout_log_id&&!ev&&<button type="button" className="secondary-button" onClick={()=>openPlanEditor(s)}>Tilpass økt</button>}<button type="button" className="secondary-button" onClick={back}>Alle handlingar</button></div>}
  {panel==='move'&&<><div className="pt2-inline-actions pt2-session-slot-editor"><label>Veke <select aria-label={'Flytt '+s.title+' til veke'} value={sessionSlotDrafts[s.id]?.week_no??String(s.week_no||1)} disabled={busy} onChange={e=>setSessionSlotDrafts(rows=>({...rows,[s.id]:{week_no:e.target.value,day_no:rows[s.id]?.day_no??String(s.day_no||1)}}))}>{Array.from({length:52},(_,i)=>i+1).map(n=><option key={n} value={n}>{n}</option>)}</select></label><label>Dag <select aria-label={'Flytt '+s.title+' til dag'} value={sessionSlotDrafts[s.id]?.day_no??String(s.day_no||1)} disabled={busy} onChange={e=>setSessionSlotDrafts(rows=>({...rows,[s.id]:{week_no:rows[s.id]?.week_no??String(s.week_no||1),day_no:e.target.value}}))}>{[1,2,3,4,5,6,7].map(n=><option key={n} value={n}>{n}</option>)}</select></label><button type="button" className="primary-button" disabled={busy} onClick={()=>moveSessionSlot(s)}>Lagra plassering</button></div>{sameSlot.length>1&&<div className="pt-compact-menu-list"><button type="button" disabled={busy||position===0} onClick={()=>moveSession(s,-1)}>Tidlegare same dag</button><button type="button" disabled={busy||position===sameSlot.length-1} onClick={()=>moveSession(s,1)}>Seinare same dag</button></div>}<button type="button" className="secondary-button" onClick={back}>Tilbake</button></>}
  {panel==='flow'&&<div className="pt-compact-details"><p>{flowRow(s.id)?.flowReason||'Opplåsing'}</p>{activeProgram.flow_unlock_mode==='sequence'&&<label><input type="checkbox" checked={!!s.flow_requires_approval} disabled={busy} onChange={e=>updateFlowSession(s,{flow_requires_approval:e.target.checked})}/> Krev PT-godkjenning</label>}{activeProgram.flow_unlock_mode==='date'&&<label>Opningsdato <input type="date" value={s.scheduled_date||''} disabled={busy} onChange={e=>updateFlowSession(s,{scheduled_date:e.target.value||null})}/></label>}{(state==='locked'||s.flow_override)&&<button type="button" className="secondary-button" disabled={busy} onClick={()=>updateFlowSession(s,{flow_override:!s.flow_override})}>{s.flow_override?'Fjern manuell opplåsing':'Opne manuelt'}</button>}<button type="button" className="secondary-button" onClick={back}>Tilbake</button></div>}
  {error&&<p className="auth-error" role="alert">{error}</p>}
  </section></div>})()}
  {openWodPicker&&clientSessions.some(s=>s.id===openWodPicker&&s.status!=='completed')&&(()=>{const s=clientSessions.find(x=>x.id===openWodPicker);return <div className="pt2-modal-backdrop" onClick={()=>setOpenWodPicker(null)}><section className="pt2-modal pt-plan-picker-modal" role="dialog" aria-modal="true" aria-label="WOD til økta" onClick={e=>e.stopPropagation()}><WodPicker compact wods={wods} usage={wodUsage} selectedIds={s.wod_id?[s.wod_id]:[]} multiple={false} onChange={ids=>attachWodToSession(s,ids[0]||'')} onCancel={()=>setOpenWodPicker(null)} title="WOD til økta" hint="Søk i heile WOD-biblioteket."/>{error&&<p className="auth-error" role="alert">{error}</p>}</section></div>})()}
  {assignRequest?.clientId===clientId&&selectedMember&&<PTScheduleDialog key={assignRequest.id} clientId={clientId} clientName={selectedMember.display_name} program={activeProgram} existing={clientSessions} wods={wods} usage={wodUsage} appointments={calendar.appointments} initialDate={assignRequest.date} initialMode={assignRequest.mode} onClose={()=>setAssignRequest(null)} onSaved={(count,mode)=>{setAssignRequest(null);setNotice(count+' WOD-ar '+(mode==='plan'?'lagde inn i treningsplanen.':'tildelte kunden.'));refreshCalendar();load();if(mode==='plan')setTab('plan')}}/>}
  {directMoveTarget?.member_id===clientId&&staff&&selectedMember&&<PTDirectMoveDialog key={directMoveTarget.id} assignment={directMoveTarget} clientId={clientId} onClose={()=>setDirectMoveTarget(null)} onSaved={()=>{setDirectMoveTarget(null);setNotice('Tidspunktet er oppdatert.');refreshCalendar()}}/>}
  {moveTarget&&activeProgram&&selectedMember&&<PTMoveDialog key={moveTarget.id} program={activeProgram} session={moveTarget} clientId={clientId} onClose={()=>setMoveTarget(null)} onSaved={()=>{setMoveTarget(null);setNotice('Tidspunktet er oppdatert.');load();refreshCalendar()}}/>}
  {previewWod&&<WodCard wod={previewWod} onClose={()=>setPreviewWod(null)}/>}
  {planEditor&&planEditor.clientId===clientId&&<div className="pt2-modal-backdrop gg-pt-architect-backdrop"><section className="pt2-modal gg-pt-architect-modal" role="dialog" aria-modal="true" aria-label={'Tilpass økt for '+planEditor.clientName}><Suspense fallback={<p>Opnar WOD Studio …</p>}><WodBuilder key={planEditor.sessionId} editWodId={planEditor.wodId} copyMode planContext={planEditor} onSavePlanWod={savePlanEditor} onCancel={()=>{if(!planSaveLock.current)setPlanEditor(null)}}/></Suspense></section></div>}
  {evidenceTarget&&evidenceTarget.clientId===clientId&&<div className="pt2-modal-backdrop" onClick={()=>setEvidenceTarget(null)}><section className="pt2-modal pt-plan-picker-modal" role="dialog" aria-modal="true" aria-label="Kopla til utført PT-økt" onClick={e=>e.stopPropagation()}><header className="pt-plan-picker-head"><div><strong>{selectedMember?.display_name} · {clientSessions.find(s=>s.id===evidenceTarget.id)?.title}</strong><small>Vel eit allereie delt PT-resultat. Privat treningshistorikk er ikkje synleg her.</small></div><button type="button" className="icon-button" aria-label="Lukk" onClick={()=>setEvidenceTarget(null)}><X size={18}/></button></header><input aria-label="Søk gjennomførte PT-økter" placeholder="Søk gjennomførte PT-økter …" value={evidenceSearch} onChange={e=>setEvidenceSearch(e.target.value)}/>{evidenceLoading?<p>Hentar PT-resultat …</p>:evidenceError?<p className="auth-error">{evidenceError}</p>:<div className="pt-plan-evidence-list">{evidenceRows.filter(a=>String(a.wods?.name||'').toLowerCase().includes(evidenceSearch.trim().toLowerCase())).map(a=><button key={a.id} type="button" className="secondary-button" disabled={busy} onClick={()=>linkEvidence(a)}><strong>{a.wods?.name||'Tidlegare PT-økt'}</strong><small>{a.completed_at?new Date(a.completed_at).toLocaleDateString('nn-NO'):'Dato ikkje registrert'}</small></button>)}{!evidenceRows.length&&<p>Ingen delte PT-resultat å kopla. Bruk Marker utført dersom økta vart gjennomført privat.</p>}</div>}</section></div>}
  <FlowConfirmDialog dialog={completionConfirm.dialog} onClose={completionConfirm.finish}/>
 </div>
}
