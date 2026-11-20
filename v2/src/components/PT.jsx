import { useEffect,useRef,useState } from 'react'
import { CalendarClock,CheckCircle2,LoaderCircle,Plus,Trash2,UserRound } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { isStaff } from '../lib/auth.js'
import WodBuilder from './WodBuilder.jsx'

const toLocalDateTimeInput=value=>{
 const date=new Date(value)
 return Number.isFinite(date.getTime())?new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16):''
}
const ptSessionStatusLabel={draft:'Utkast',published:'Publisert',planned:'Planlagd',completed:'Fullført',cancelled:'Avlyst'}
function CalendarSelect({value,onChange,label='Vel dato'}) {
 const [open,setOpen]=useState(false)
 const [month,setMonth]=useState(()=>{const d=value?new Date(value):new Date();return new Date(d.getFullYear(),d.getMonth(),1)})
 const selected=value?value.slice(0,10):'',time=value&&value.length>10?value.slice(11,16):'10:00'
 const year=month.getFullYear(),m=month.getMonth(),first=new Date(year,m,1).getDay(),offset=(first+6)%7,days=new Date(year,m+1,0).getDate()
 const dateKey=d=>year+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0')
 return <div className="pt-calendar-picker"><strong>{label}</strong><button type="button" className="pt-calendar-toggle" onClick={()=>setOpen(v=>!v)}><CalendarClock size={16}/>{value?new Date(value).toLocaleString('nn-NO',{dateStyle:'medium',timeStyle:'short'}):'Vel dato og klokkeslett'}<span>{open?'Lukk':'Opne kalender'}</span></button>{open&&<div className="pt-calendar"><div className="pt-calendar-head"><strong>{month.toLocaleDateString('nn-NO',{month:'long',year:'numeric'})}</strong><div><button type="button" onClick={()=>setMonth(new Date(year,m-1,1))}>‹</button><button type="button" onClick={()=>setMonth(new Date(year,m+1,1))}>›</button></div></div><div className="pt-calendar-grid">{['M','T','O','T','F','L','S'].map((d,i)=><span className="pt-calendar-weekday" key={i}>{d}</span>)}{Array.from({length:offset},(_,i)=><span key={'blank'+i}/>)}{Array.from({length:days},(_,i)=>i+1).map(d=><button type="button" key={d} className={selected===dateKey(d)?'selected':''} onClick={()=>onChange(dateKey(d)+'T'+time)}>{d}</button>)}</div><label className="pt-calendar-time">Klokkeslett<input type="time" value={time} onChange={e=>onChange((selected||dateKey(new Date().getDate()))+'T'+e.target.value)}/></label><button type="button" className="primary-button" onClick={()=>setOpen(false)}>Bruk tidspunkt</button></div>}</div>
}
export default function PT({profile,coachMode=false,focusRequestId,onFocusConsumed,onLaunchWorkout,controlledClientId,hideCustomerPicker=false,onClientChange,focusPanel=null,onFocusPanelConsumed}){
  useEffect(()=>{if(controlledClientId!==undefined){const nextClient=controlledClientId||'';setActiveClient(nextClient);setCustomerDraft(nextClient);setMessageClient(nextClient);setNoteClient(nextClient)}},[controlledClientId])
 useEffect(()=>{if(!focusPanel)return;setActivePanel(focusPanel);onFocusPanelConsumed?.()},[focusPanel])
 const staff=isStaff(profile)||coachMode
 const adminOrManager=isStaff(profile)
 const [sessions,setSessions]=useState([]),[bookings,setBookings]=useState([]),[requests,setRequests]=useState([])
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const [showCreate,setShowCreate]=useState(false),[showRequest,setShowRequest]=useState(false),[activeClient,setActiveClient]=useState(''),[customerDraft,setCustomerDraft]=useState(''),[showWodBuilder,setShowWodBuilder]=useState(false),[activePanel,setActivePanel]=useState('oversikt')
 const [title,setTitle]=useState('Personleg trening'),[starts,setStarts]=useState(''),[duration,setDuration]=useState('60'),[capacity,setCapacity]=useState('1'),[price,setPrice]=useState('')
 const [goal,setGoal]=useState(''),[preferred,setPreferred]=useState(''),[alternative,setAlternative]=useState(''),[availability,setAvailability]=useState('')
 const [members,setMembers]=useState([]),[messages,setMessages]=useState([]),[notes,setNotes]=useState([]),[plans,setPlans]=useState({}),[exerciseLibrary,setExerciseLibrary]=useState([]),[planDrafts,setPlanDrafts]=useState({}),[wodLibrary,setWodLibrary]=useState([]),[prescribeClient,setPrescribeClient]=useState(''),[prescribeWod,setPrescribeWod]=useState(''),[prescribeAt,setPrescribeAt]=useState('')
 const [messageClient,setMessageClient]=useState(''),[messageText,setMessageText]=useState(''),[showRequestArchive,setShowRequestArchive]=useState(false),[requestFilter,setRequestFilter]=useState('pending')
 const [noteClient,setNoteClient]=useState(''),[noteGoals,setNoteGoals]=useState(''),[noteText,setNoteText]=useState(''),[followUp,setFollowUp]=useState(''),[requestDrafts,setRequestDrafts]=useState({}),[noteType,setNoteType]=useState('progress'),[expandedPlanSessions,setExpandedPlanSessions]=useState({})
 const [sessionEditor,setSessionEditor]=useState(null)
 const [sessionDraft,setSessionDraft]=useState({title:'',startsAt:'',duration:'60',message:'',cancellationNote:''})
 const loadSequence=useRef(0)
 async function load(silent=false){
  const requestId=++loadSequence.current
  if(!silent)setLoading(true)
  setError('')
  try{
   const {data:{user},error:authError}=await supabase.auth.getUser()
   if(authError||!user)throw authError||new Error('Logg inn på nytt.')
   const targetClientId=staff
    ?(controlledClientId||activeClient||(!hideCustomerPicker?messageClient:''))
    :user.id
   const bookingQuery=adminOrManager
    ?supabase.from('pt_bookings').select('id,session_id,member_id,status,note')
    :targetClientId
     ?supabase.from('pt_bookings').select('id,session_id,member_id,status,note').eq('member_id',targetClientId)
     :supabase.from('pt_bookings').select('id,session_id,member_id,status,note').limit(0)
   const [s,b,r,m,p,n,ex,wd]=await Promise.all([
    supabase.from('pt_sessions').select('id,title,client_id,starts_at,duration_minutes,capacity,price,status,prep,message,cancellation_note,custom_workout,wod_ids,session_type,coach_notes,completed_notes,attendance_status').in('status',staff?['draft','published','planned','completed','cancelled']:['published','planned','completed','cancelled']).order('starts_at',{ascending:false}).limit(100),
    bookingQuery,
    supabase.from('pt_requests').select('id,member_id,preferred_at,alternative_at,availability_note,goal,status,staff_note,pt_session_id,created_at,handled_at,archived_at').order('created_at',{ascending:false}).limit(100).then(result=>staff?result:{...result,data:(result.data||[]).filter(row=>row.member_id===user.id)}),
    staff ? supabase.from('profiles').select('id,display_name,role,member_rank,avatar_url,membership_status').eq('role','member').neq('id',user.id).eq('active',true).eq('membership_status','approved').order('display_name') : Promise.resolve({data:[],error:null}),
    (()=>{let query=supabase.from('pt_messages').select('id,client_id,sender_id,body,created_at').order('created_at',{ascending:false}).limit(200);if(targetClientId)query=query.eq('client_id',targetClientId);else query=query.limit(0);return query})(),
    staff&&targetClientId ? supabase.from('pt_client_notes').select('id,client_id,coach_id,goals,note,follow_up_at,created_at').eq('client_id',targetClientId).order('updated_at',{ascending:false}).limit(100) : Promise.resolve({data:[],error:null}),
    supabase.from('exercises').select('id,name,category,video_url').eq('is_active',true).order('name'),
    supabase.from('wods').select('id,name,format,duration_minutes,movements,notes').eq('is_published',true).order('created_at',{ascending:false}),
   ])
   if(requestId!==loadSequence.current)return
   const visibleSessionIds=(s.data||[])
    .filter(row=>staff?Boolean(targetClientId&&(row.client_id===targetClientId||(b.data||[]).some(booking=>booking.session_id===row.id&&booking.member_id===targetClientId&&['booked','waitlist'].includes(booking.status)))):(row.status==='published'||row.client_id===user.id))
    .map(row=>row.id)
   const pe=visibleSessionIds.length
    ?await supabase.from('pt_session_exercises').select('id,session_id,sort_order,phase,exercise_name,sets,reps,target_load,rest_seconds,notes').in('session_id',visibleSessionIds).order('sort_order')
    :{data:[],error:null}
   if(requestId!==loadSequence.current)return
   const failures=[s,b,r,m,p,n,ex,wd,pe].filter(result=>result.error).map(result=>result.error.message)
   if(failures.length)setError(failures.join(' · '))
   setSessions(staff?(s.data||[]):(s.data||[]).filter(row=>row.status==='published'||row.client_id===user.id||(b.data||[]).some(booking=>booking.session_id===row.id)))
   setBookings(b.data||[])
   setRequests(r.data||[])
   if(m.data){
    setMembers(m.data)
    if(m.data.length){
     if(!hideCustomerPicker)setActiveClient(v=>v||m.data[0].id)
     setCustomerDraft(v=>v||m.data[0].id)
     if(targetClientId){setMessageClient(targetClientId);setNoteClient(targetClientId)}
     else if(!hideCustomerPicker){setMessageClient(v=>v||m.data[0].id);setNoteClient(v=>v||m.data[0].id)}
     else {setMessageClient('');setNoteClient('')}
    }
   }
   setMessages((p.data||[]).slice().reverse())
   setNotes(n.data||[])
   setPlans((pe.data||[]).reduce((acc,row)=>{(acc[row.session_id] ||= []).push(row);return acc},{}))
   setExerciseLibrary(ex.data||[])
   setWodLibrary(wd.data||[])
  }catch(loadError){
   if(requestId===loadSequence.current)setError(loadError?.message||'PT-data kunne ikkje hentast.')
  }finally{
   if(requestId===loadSequence.current)setLoading(false)
  }
 }
 useEffect(()=>{
  let live=true,channel=null
  load()
  async function subscribe(){
   const {data:{user}}=await supabase.auth.getUser()
   if(!live||!user)return
   const targetClientId=staff?(controlledClientId||activeClient||messageClient):user.id
   let subscription=supabase.channel('pt-client-thread-'+user.id+'-'+(targetClientId||'all'))
   if(targetClientId){
    subscription=subscription
     .on('postgres_changes',{event:'*',schema:'public',table:'pt_messages',filter:'client_id=eq.'+targetClientId},()=>{if(live)load(true)})
     .on('postgres_changes',{event:'*',schema:'public',table:'pt_sessions',filter:'client_id=eq.'+targetClientId},()=>{if(live)load(true)})
   }
   // Admin/manager sees the public-slot totals; coaches and members only
   // subscribe to booking events for their selected/member account.
   if(adminOrManager){
    subscription=subscription.on('postgres_changes',{event:'*',schema:'public',table:'pt_bookings'},()=>{if(live)load(true)})
   }else if(targetClientId){
    subscription=subscription.on('postgres_changes',{event:'*',schema:'public',table:'pt_bookings',filter:'member_id=eq.'+targetClientId},()=>{if(live)load(true)})
   }
   channel=subscription.subscribe()
  }
  subscribe()
  const refresh=window.setInterval(()=>{if(live)load(true)},60000)
  return()=>{live=false;loadSequence.current+=1;window.clearInterval(refresh);if(channel)supabase.removeChannel(channel)}
 },[staff,activeClient,messageClient])
 const hasUnsavedWork=Boolean(showWodBuilder||messageText.trim()||noteGoals.trim()||noteText.trim()||followUp||Object.values(planDrafts).some(d=>d&&Object.values(d).some(v=>String(v||'').trim())));
 useEffect(()=>{if(!hasUnsavedWork)return;const warn=e=>{e.preventDefault();e.returnValue='Du har endringar som ikkje er lagra.'};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn)},[hasUnsavedWork]);
 useEffect(()=>{if(!staff||!focusRequestId||!requests.length)return;const target=requests.find(row=>row.id===focusRequestId);if(target){setActiveClient(target.member_id);setCustomerDraft(target.member_id);setMessageClient(target.member_id);setNoteClient(target.member_id);onClientChange?.(target.member_id);setActivePanel('forespurnader')}const timer=setTimeout(()=>{document.getElementById('pt-request-'+focusRequestId)?.scrollIntoView({behavior:'smooth',block:'center'});onFocusConsumed?.()},180);return()=>clearTimeout(timer)},[staff,focusRequestId,requests])
 async function prescribeWorkout(event){
  event.preventDefault();setBusy('prescribe');setError('');setNotice('')
  try{
   const {data:{user}}=await supabase.auth.getUser()
   if(!prescribeClient||!prescribeWod)throw new Error('Vel PT-klient og WOD.')
   const wod=wodLibrary.find(x=>x.id===prescribeWod)
   const {error:e}=await supabase.from('pt_sessions').insert({client_id:prescribeClient,title:wod.name,starts_at:prescribeAt?new Date(prescribeAt).toISOString():new Date().toISOString(),duration_minutes:wod.duration_minutes||60,capacity:1,status:'planned',created_by:user.id,wod_ids:[wod.id],message:'Foreskriven WOD: '+wod.format})
   if(e)throw e
   setNotice('WOD er foreskriven til PT-klienten.');setPrescribeWod('');setPrescribeAt('');await load()
  }catch(e){setError(e.message||'Kunne ikkje foreskriva WOD.')}finally{setBusy('')}
 }
  async function addPlanExercise(event,session){
  event.preventDefault();const draft=planDrafts[session.id]||{};const exercise=exerciseLibrary.find(x=>x.id===draft.exerciseId)
  if(!exercise){setError('Vel ei øving frå biblioteket.');return}
  setBusy('plan-'+session.id);setError('');setNotice('')
  try{
   const rows=plans[session.id]||[]
   const {data,error:e}=await supabase.from('pt_session_exercises').insert({session_id:session.id,sort_order:rows.length,phase:draft.phase||'main',exercise_name:exercise.name,sets:draft.sets?Number(draft.sets):null,reps:draft.reps||'',target_load:draft.targetLoad||'',rest_seconds:draft.rest?Number(draft.rest):null,notes:draft.notes||''}).select('id,session_id,sort_order,phase,exercise_name,sets,reps,target_load,rest_seconds,notes').single()
   if(e)throw e
   setPlans(v=>({...v,[session.id]:[...(v[session.id]||[]),data]}));setPlanDrafts(v=>({...v,[session.id]:{}}));setNotice('Øving lagra i PT-programmet.')
  }catch(e){setError(e.message||'Kunne ikkje lagra øvinga.')}finally{setBusy('')}
 }
 async function removePlanExercise(row){
  setBusy('plan-'+row.id);setError('')
  try{const {error:e}=await supabase.from('pt_session_exercises').delete().eq('id',row.id);if(e)throw e;setPlans(v=>({...v,[row.session_id]:(v[row.session_id]||[]).filter(x=>x.id!==row.id)}))}
  catch(e){setError(e.message||'Kunne ikkje fjerna øvinga.')}finally{setBusy('')}
 }
 async function book(session){
  setBusy(session.id);setError('');setNotice('')
  try{
   const {data,error:e}=await supabase.rpc('book_pt_session',{p_session_id:session.id})
   if(e)throw e
   const status=data?.[0]?.status||'booked'
   setNotice(status==='waitlist'?'Du er sett på venteliste.':'PT-timen er bestilt.')
   await load()
  }catch(e){setError(e.message||'Kunne ikkje bestilla PT-time.')}
  finally{setBusy('')}
 }
 async function cancelOwnBooking(session,booking){
  if(!session?.id||!booking?.id)return
  if(!window.confirm('Avbestille PT-timen? Dersom nokon står på venteliste, går plassen vidare til neste person.'))return
  setBusy('cancel-booking-'+session.id);setError('');setNotice('')
  try{
   const {error:e}=await supabase.rpc('cancel_pt_booking',{p_booking_id:booking.id})
   if(e)throw e
   setNotice(booking.status==='waitlist'?'Du er fjerna frå ventelista.':'PT-bestillinga er avbestilt.')
   await load()
  }catch(e){setError(e.message||'Kunne ikkje avbestilla PT-bestillinga.')}
  finally{setBusy('')}
 }
 async function create(event){
  event.preventDefault();setBusy('create');setError('')
  try{
   const {data:{user}}=await supabase.auth.getUser()
   const {error:e}=await supabase.from('pt_sessions').insert({title:title.trim(),starts_at:new Date(starts).toISOString(),duration_minutes:Number(duration),capacity:Number(capacity),price:price===''?null:Number(price),status:'published',created_by:user.id})
   if(e)throw e
   setShowCreate(false);setNotice('PT-time publisert.');await load()
  }catch(e){setError(e.message||'Kunne ikkje oppretta PT-time.')}
  finally{setBusy('')}
 }
 async function request(event){
  event.preventDefault();setBusy('request');setError('')
  try{
   const {data:{user}}=await supabase.auth.getUser()
   const {error:e}=await supabase.from('pt_requests').insert({member_id:user.id,preferred_at:preferred?new Date(preferred).toISOString():null,alternative_at:alternative?new Date(alternative).toISOString():null,availability_note:availability.trim(),goal:goal.trim()})
   if(e)throw e
   setShowRequest(false);setGoal('');setAvailability('');setNotice('PT-førespurnaden er sendt.');await load()
  }catch(e){setError(e.message||'Kunne ikkje senda førespurnaden.')}
  finally{setBusy('')}
 }
 async function updateRequest(request){
  const draft=requestDrafts[request.id]||{}
  setBusy('request-'+request.id);setError('');setNotice('')
  try{
   const {data:{user}}=await supabase.auth.getUser()
   const {error:e}=await supabase.from('pt_requests').update({status:draft.status||request.status,staff_note:draft.staffNote??request.staff_note,handled_by:user.id,handled_at:new Date().toISOString()}).eq('id',request.id)
   if(e)throw e
   setRequests(v=>v.map(row=>row.id===request.id?{...row,status:draft.status||row.status,staff_note:draft.staffNote??row.staff_note,handled_at:new Date().toISOString()}:row))
   setNotice('Kommentaren er lagra.')
  }catch(e){setError(e.message||'Kunne ikkje oppdatera førespurnaden.')}finally{setBusy('')}
 }
 async function archiveRequest(request){
  setBusy('request-'+request.id);setError('');setNotice('')
  try{const {error:e}=await supabase.from('pt_requests').update({archived_at:new Date().toISOString()}).eq('id',request.id);if(e)throw e;setRequests(rows=>rows.map(row=>row.id===request.id?{...row,archived_at:new Date().toISOString()}:row));setNotice('Førespurnaden er flytta til arkivet.')}
  catch(e){setError(e.message||'Kunne ikkje arkivera førespurnaden.')}finally{setBusy('')}
 }
 async function restoreRequest(request){
  setBusy('request-'+request.id);setError('');setNotice('')
  try{const {error:e}=await supabase.from('pt_requests').update({archived_at:null}).eq('id',request.id);if(e)throw e;setRequests(rows=>rows.map(row=>row.id===request.id?{...row,archived_at:null}:row));setNotice('Førespurnaden er gjenoppretta.')}
  catch(e){setError(e.message||'Kunne ikkje gjenoppretta førespurnaden.')}finally{setBusy('')}
 }
 async function setRequestDecision(request,status){
  setBusy('request-'+request.id);setError('');setNotice('')
  try{
   const {data:{user}}=await supabase.auth.getUser()
   const draft=requestDrafts[request.id]||{}
   const handledAt=status==='pending'?null:new Date().toISOString()
   const {error:e}=await supabase.from('pt_requests').update({status,staff_note:draft.staffNote??request.staff_note,handled_by:user.id,handled_at:handledAt}).eq('id',request.id)
   if(e)throw e
   setRequests(rows=>rows.map(row=>row.id===request.id?{...row,status,staff_note:draft.staffNote??row.staff_note,handled_at:handledAt}:row))
   setNotice(status==='approved'?'Førespurnaden er godkjend.':status==='declined'?'Førespurnaden er avslått.':'Førespurnaden er sett tilbake som ventande.')
  }catch(e){setError(e.message||'Kunne ikkje oppdatera førespurnaden.')}finally{setBusy('')}
 }
 async function createSessionFromRequest(request){
  const draft=requestDrafts[request.id]||{}
  if(request.pt_session_id){setError('Denne PT-førespurnaden har allereie fått oppretta ein PT-time.');return}
  if(!['pending','approved'].includes(request.status)){setError('Berre ventande eller godkjende førespurnader kan få oppretta PT-time.');return}
  const startsAt=new Date(draft.sessionAt||request.preferred_at||'')
  if(!Number.isFinite(startsAt.getTime())||startsAt<=new Date()){setError('Vel eit gyldig tidspunkt som ligg fram i tid.');return}
  setBusy('request-'+request.id);setError('');setNotice('')
  try{
   const {data:sessionId,error:e}=await supabase.rpc('create_pt_session_from_request',{
    p_request_id:request.id,
    p_starts_at:startsAt.toISOString(),
    p_session_type:draft.sessionType||'guided',
    p_staff_note:draft.staffNote??request.staff_note??null
   })
   if(e)throw e
   setRequests(rows=>rows.map(row=>row.id===request.id?{...row,status:'approved',pt_session_id:sessionId,staff_note:draft.staffNote??row.staff_note,handled_at:new Date().toISOString()}:row))
   setNotice('PT-time oppretta og knytt til førespurnaden. Kunden har fått varsel.')
   await load()
  }catch(e){setError(e.message||'Kunne ikkje oppretta PT-time frå førespurnaden.')}
  finally{setBusy('')}
 }
 function openSessionEditor(session){
  setSessionEditor(session)
  setSessionDraft({title:session.title||'Personleg trening',startsAt:toLocalDateTimeInput(session.starts_at),duration:String(session.duration_minutes||60),message:session.message||'',cancellationNote:''})
 }
 async function saveSessionChanges(event){
  event.preventDefault()
  if(!sessionEditor)return
  const startsAt=new Date(sessionDraft.startsAt),durationValue=Number(sessionDraft.duration)
  if(!sessionDraft.title.trim()){setError('Skriv inn eit namn på PT-timen.');return}
  if(!Number.isFinite(startsAt.getTime())||startsAt<=new Date()){setError('Nytt tidspunkt må vera gyldig og liggja fram i tid.');return}
  if(!Number.isInteger(durationValue)||durationValue<5||durationValue>600){setError('Varigheit må vera eit heilt tal mellom 5 og 600 minutt.');return}
  setBusy('session-edit-'+sessionEditor.id);setError('');setNotice('')
  try{
   const {error:e}=await supabase.rpc('update_pt_session_details',{p_session_id:sessionEditor.id,p_title:sessionDraft.title.trim(),p_starts_at:startsAt.toISOString(),p_duration_minutes:durationValue,p_message:sessionDraft.message.trim()})
   if(e)throw e
   setSessionEditor(null);setNotice('PT-timen er oppdatert. Kunden har fått varsel.');await load()
  }catch(e){setError(e.message||'Kunne ikkje endra PT-timen.')}
  finally{setBusy('')}
 }
 async function cancelPtSession(session,note=''){
  if(!session?.id)return
  if(!window.confirm('Avlysa PT-timen? Kunden og eventuelle påmelde blir varsla, og historikken blir bevart.'))return
  setBusy('session-cancel-'+session.id);setError('');setNotice('')
  try{
   const {error:e}=await supabase.rpc('cancel_pt_session',{p_session_id:session.id,p_note:String(note||'').trim()||null})
   if(e)throw e
   setSessionEditor(null);setNotice('PT-timen er avlyst. Kunden og eventuelle påmelde har fått varsel.');await load()
  }catch(e){setError(e.message||'Kunne ikkje avlysa PT-timen.')}
  finally{setBusy('')}
 }
 async function cancelEditedSession(){return cancelPtSession(sessionEditor,sessionDraft.cancellationNote)}
 async function sendMessage(event){
  event.preventDefault();setBusy('message');setError('');setNotice('')
  try{
   const {data:{user}}=await supabase.auth.getUser()
   const clientId=staff?messageClient:user.id
   if(!clientId)throw new Error('Vel ein PT-kunde.')
   const body=messageText.trim()
   if(!body)throw new Error('Skriv ei melding før du sender.')
   if(body.length>3000)throw new Error('Meldinga kan ikkje vera lengre enn 3000 teikn.')
   const {error:e}=await supabase.from('pt_messages').insert({client_id:clientId,sender_id:user.id,body})
   if(e)throw e
   setMessageText('');setNotice('Meldinga er sendt.');await load()
  }catch(e){setError(e.message||'Kunne ikkje senda meldinga.')}finally{setBusy('')}
 }
  async function removeMessage(message){
   if(!message?.id)return
   if(!window.confirm('Sletta denne meldinga frå PT-dialogen?'))return
   setBusy('message-delete-'+message.id);setError('');setNotice('')
   try{
    const {data,error:e}=await supabase.from('pt_messages').delete().eq('id',message.id).select('id')
    if(e)throw e
    if(!data?.length)throw new Error('Meldinga vart ikkje sletta. Ho kan alt vera fjerna eller du manglar tilgang.')
    setMessages(rows=>rows.filter(row=>row.id!==message.id))
    setNotice('Meldinga er sletta.')
   }catch(e){setError(e.message||'Kunne ikkje sletta meldinga.')}
   finally{setBusy('')}
  }
 async function saveNote(event){
  event.preventDefault();setBusy('note');setError('');setNotice('')
  try{
   const {data:{user}}=await supabase.auth.getUser()
   const {error:e}=await supabase.from('pt_client_notes').insert({client_id:noteClient,coach_id:user.id,goals:noteGoals.trim(),note:noteText.trim(),follow_up_at:followUp?new Date(followUp).toISOString():null})
   if(e)throw e
   setNoteGoals('');setNoteText('');setFollowUp('');setNoteType('progress');setNotice('PT-notatet er lagra privat.');await load()
  }catch(e){setError(e.message||'Kunne ikkje lagra notatet.')}finally{setBusy('')}
 }
 const visiblePTSessions=sessions.filter(session=>!staff||session.client_id===activeClient||bookings.some(booking=>booking.session_id===session.id&&booking.member_id===activeClient&&['booked','waitlist'].includes(booking.status)))
 if(loading)return <div className="training-state"><LoaderCircle className="spin" size={20}/> Hentar PT-studio …</div>
 return <div className="pt-module">
  <div className="training-heading"><div><div className="section-kicker">GARASJEGYM · PT-STUDIO</div><h3>Personleg trening</h3></div><div className="pt-actions">{!staff&&<button className="secondary-button" onClick={()=>setShowRequest(v=>!v)}>Be om PT-time</button>}</div></div>
  {staff&&!hideCustomerPicker&&<section className="pt-customer-picker"><div className="section-kicker">KUNDEARBEIDSPLASS</div><div className="pt-customer-picker-row"><label>Vel kunde<select className="pt-customer-select" value={customerDraft} onChange={e=>setCustomerDraft(e.target.value)}><option value="">Vel kunde …</option>{members.map(m=><option key={m.id} value={m.id}>{m.display_name||'Utan namn'}</option>)}</select></label><button className="primary-button" type="button" disabled={!customerDraft} onClick={()=>{if(hasUnsavedWork&&!window.confirm('Du har arbeid som ikkje er lagra for denne kunden. Vil du forkasta endringane og byta kunde?'))return;setActiveClient(customerDraft);setMessageClient(customerDraft);setNoteClient(customerDraft);setShowWodBuilder(false);setActivePanel('oversikt')}}>Vel kunde</button></div></section>}
  {staff&&activeClient&&<div className="pt-customer-badge"><span className="pt-customer-badge-avatar">{(members.find(m=>m.id===activeClient)?.display_name||'K').trim().split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase()}</span><span><b>{members.find(m=>m.id===activeClient)?.display_name||'Kunde'}</b><small>Aktiv kunde · {members.find(m=>m.id===activeClient)?.role==='admin'?'Administrator':members.find(m=>m.id===activeClient)?.role==='manager'?'Manager':'Medlem'} · Rang: {members.find(m=>m.id===activeClient)?.member_rank||'Ikkje tildelt'}</small></span></div>}
  {adminOrManager&&<section className="engine-section pt-public-slots"><div className="engine-section-title"><div><h4>Publiserte PT-timar</h4><p>Opne timar som medlemmene kan bestilla</p></div><span>{sessions.filter(s=>!s.client_id&&s.status==='published'&&new Date(s.starts_at)>new Date()).length} ledige timar</span></div>{sessions.filter(s=>!s.client_id&&s.status==='published'&&new Date(s.starts_at)>new Date()).length?<div className="class-list">{sessions.filter(s=>!s.client_id&&s.status==='published'&&new Date(s.starts_at)>new Date()).map(session=>{const d=new Date(session.starts_at),booked=bookings.filter(b=>b.session_id===session.id&&b.status==='booked').length,waitlist=bookings.filter(b=>b.session_id===session.id&&b.status==='waitlist').length;return <article className="class-card" key={session.id}><div className="class-date"><UserRound size={21}/><span>PT</span></div><div className="class-info"><div className="class-card-top"><span>Publisert</span><span><CalendarClock size={13}/>{d.toLocaleDateString('nn-NO')} · {d.toLocaleTimeString('nn-NO',{hour:'2-digit',minute:'2-digit'})}</span></div><h4>{session.title}</h4><small>{session.duration_minutes} min · Kapasitet {session.capacity} · {booked} bestilt · {waitlist} på venteliste</small>{session.message&&<p>{session.message}</p>}</div><div className="class-action"><button type="button" className="secondary-button" onClick={()=>openSessionEditor(session)}>Endre</button><button type="button" className="secondary-button" disabled={busy==='session-cancel-'+session.id} onClick={()=>cancelPtSession(session)}>{busy==='session-cancel-'+session.id?'Avlyser …':'Avlys'}</button></div></article>})}</div>:<div className="empty-state">Ingen publiserte PT-timar ligg fram i tid.</div>}</section>}{error&&<div className="auth-error" role="alert">{error}</div>}{notice&&<div className="auth-message" role="status"><CheckCircle2 size={15}/> {notice}</div>}{staff&&activeClient&&<nav className="pt-workspace-tabs" aria-label="Kundearbeidsflate">{[{id:'oversikt',label:'Oversikt'},{id:'plan',label:'Treningsplan'},{id:'dialog',label:'Dialog'},{id:'notat',label:'Trenarnotat'},{id:'forespurnader',label:'Førespurnader'}].map(t=><button type="button" key={t.id} className={activePanel===t.id?'selected':''} onClick={()=>setActivePanel(t.id)}>{t.label}{t.id==='forespurnader'&&requests.filter(r=>r.member_id===activeClient&&r.status==='pending').length>0?<span>{requests.filter(r=>r.member_id===activeClient&&r.status==='pending').length}</span>:null}</button>)}</nav>}{staff&&activePanel==='plan'&&showWodBuilder&&activeClient&&<div className="pt-inline-wod"><div className="pt-inline-wod-head"><strong>WOD-generator · {members.find(m=>m.id===activeClient)?.display_name||'Aktiv kunde'}</strong><button type="button" className="secondary-button" onClick={()=>{if(window.confirm('Lukka WOD-generatoren? Eventuelle endringar som ikkje er lagra, går tapt.'))setShowWodBuilder(false)}}>Lukk</button></div><WodBuilder assignedClientId={activeClient} onAssigned={()=>{setShowWodBuilder(false);setNotice('WOD er lagra og knytt til aktiv kunde.');load(true)}}/></div>}
  {!staff&&showRequest&&<form className="booking-create" onSubmit={request}><h4>Send PT-førespurnad</h4><label>Kva ønskjer du hjelp med?<textarea rows="3" value={goal} onChange={e=>setGoal(e.target.value)} required placeholder="Mål, utfordringar eller ønskje …"/></label><div className="engine-fields"><CalendarSelect value={preferred} onChange={setPreferred} label="Føretrekt tidspunkt"/><CalendarSelect value={alternative} onChange={setAlternative} label="Alternativt tidspunkt"/></div><label>Tilgjenge / kommentar<input value={availability} onChange={e=>setAvailability(e.target.value)} placeholder="Når passar det elles?"/></label><button className="primary-button" disabled={busy==='request'}>{busy==='request'?'Sender …':'Send førespurnad'}</button></form>}
  {false&&showCreate&&staff&&<form className="booking-create" onSubmit={create}><h4>Publiser PT-time</h4><label>Tittel<input value={title} onChange={e=>setTitle(e.target.value)} required/></label><CalendarSelect value={starts} onChange={setStarts} label="Vel PT-dato"/><div className="engine-fields"><label>Minutt<input type="number" min="5" max="600" value={duration} onChange={e=>setDuration(e.target.value)}/></label><label>Kapasitet<input type="number" min="1" max="20" value={capacity} onChange={e=>setCapacity(e.target.value)}/></label><label>Pris (kr)<input type="number" min="0" value={price} onChange={e=>setPrice(e.target.value)} placeholder="Valfritt"/></label></div><button className="primary-button" disabled={busy==='create'}>Publiser PT-time</button></form>}
  {staff&&activePanel==='oversikt'&&activeClient&&<section className="pt-customer-overview"><div className="engine-section-title"><h4>Kundeoversikt</h4><span>Samla status</span></div><div className="pt-overview-grid"><article><span>NESTE ØKT</span><strong>{sessions.filter(s=>s.client_id===activeClient&&s.status==='planned'&&new Date(s.starts_at)>=new Date()).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at))[0]?.title||'Ikkje planlagd'}</strong><small>{sessions.filter(s=>s.client_id===activeClient&&s.status==='planned'&&new Date(s.starts_at)>=new Date()).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at))[0]?.starts_at?new Date(sessions.filter(s=>s.client_id===activeClient&&s.status==='planned'&&new Date(s.starts_at)>=new Date()).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at))[0].starts_at).toLocaleString('nn-NO'):'Ingen komande økt'}</small></article><article><span>TRENINGSØKTER</span><strong>{sessions.filter(s=>s.client_id===activeClient).length}</strong><small>Registrerte PT-økter</small></article><article><span>TRENARNOTAT</span><strong>{notes.filter(n=>n.client_id===activeClient).length}</strong><small>Private notat</small></article><article><span>VENTANDE FØRESPURNADER</span><strong>{requests.filter(r=>r.member_id===activeClient&&r.status==='pending').length}</strong><small>Treng oppfølging</small></article></div><div className="pt-overview-actions"><button className="primary-button" type="button" onClick={()=>setActivePanel('plan')}>Opne treningsplan</button><button className="secondary-button" type="button" onClick={()=>setActivePanel('notat')}>Legg til trenarnotat</button><button className="secondary-button" type="button" onClick={()=>setActivePanel('dialog')}>Opne dialog</button></div></section>}
  {staff&&activePanel==='plan'&&activeClient&&!showWodBuilder&&<div className="pt-customer-wod-action"><div><strong>Lag treningsøkt</strong><p>Opne WOD-generatoren utan å forlata kundebiletet. Økta blir automatisk knytt til {members.find(m=>m.id===activeClient)?.display_name||'kunden'}.</p></div><button className="primary-button" type="button" onClick={()=>setShowWodBuilder(true)}><Plus size={15}/> Lag WOD til kunden</button></div>}
  {(!staff||activePanel==='plan')&&<section className="engine-section"><div className="engine-section-title"><h4>{staff?'Kunden sine treningsøkter':'Ledige PT-timar'}</h4><span>{staff?visiblePTSessions.length+' økter':sessions.filter(s=>s.status==='published').length+' publiserte'}</span></div>
   {visiblePTSessions.length?<div className="class-list">{visiblePTSessions.map(s=>{const d=new Date(s.starts_at),mine=bookings.find(b=>b.session_id===s.id&&(!staff||b.member_id===activeClient)&&['booked','waitlist'].includes(b.status));return <article className={'class-card'+(s.status==='cancelled'?' pt-session-cancelled':'')} key={s.id}><div className="class-date"><UserRound size={21}/><span>PT</span></div><div className="class-info"><div className="class-card-top"><span>{ptSessionStatusLabel[s.status]||s.status}</span><span><CalendarClock size={13}/>{d.toLocaleDateString('nn-NO')} · {d.toLocaleTimeString('nn-NO',{hour:'2-digit',minute:'2-digit'})}</span></div><h4>{s.title}</h4><small>{s.duration_minutes} min · Kapasitet {s.capacity}{s.price!=null?' · '+s.price+' kr':''}</small>{s.message&&<p>{s.message}</p>}{s.cancellation_note&&<p className="pt-session-cancellation-note">Melding ved avlysing: {s.cancellation_note}</p>}{(s.wod_ids||[]).map(id=>wodLibrary.find(w=>w.id===id)).filter(Boolean).map(w=><div className="pt-prescribed-wod" key={w.id}><strong>Foreskriven WOD: {w.name}</strong><small>{w.format} · {w.duration_minutes||'–'} min</small><p>{w.movements}</p>{w.notes&&<small>{w.notes}</small>}{!staff&&s.status!=='cancelled'&&<button type="button" className="primary-button pt-start-workout" onClick={()=>onLaunchWorkout?.(w.id)}>Start økta <span>→</span></button>}</div>)}</div><div className="class-action">{s.status==='cancelled'?<span className="booking-cancelled">PT-time avlyst</span>:s.client_id===profile.id?<span className="booking-confirmed">Din PT-time</span>:mine&&!staff?<><span className="booking-confirmed">{mine.status==='waitlist'?'Venteliste':'Bestilt'}</span><button type="button" className="secondary-button" disabled={busy==='cancel-booking-'+s.id} onClick={()=>cancelOwnBooking(s,mine)}>{busy==='cancel-booking-'+s.id?'Avbestiller …':'Avbestill'}</button></>:mine?<span className="booking-confirmed">{mine.status==='waitlist'?'Venteliste':'Bestilt'}</span>:s.status==='published'&&<button className="primary-button" disabled={busy===s.id} onClick={()=>book(s)}>{busy===s.id?'Vent …':'Bestill'}</button>}{staff&&s.client_id===activeClient&&s.status==='planned'&&<><button type="button" className="secondary-button" onClick={()=>openSessionEditor(s)}>Endre</button><button type="button" className="secondary-button" disabled={busy==='session-cancel-'+s.id} onClick={()=>cancelPtSession(s)}>{busy==='session-cancel-'+s.id?'Avlyser …':'Avlys'}</button></>}</div>{(plans[s.id]||[]).length>0&&<div className="pt-plan-list"><button type="button" className="secondary-button pt-exercise-toggle" aria-expanded={!!expandedPlanSessions[s.id]} onClick={()=>setExpandedPlanSessions(v=>({...v,[s.id]:!v[s.id]}))}> {expandedPlanSessions[s.id]?'Skjul øvingsoversikt':'Vis øvingsoversikt'} · {(plans[s.id]||[]).length} øvingar</button>{expandedPlanSessions[s.id]&&(plans[s.id]||[]).map(row=><div className="live-result-row" key={row.id}><span><b>{row.exercise_name}</b> {exerciseLibrary.find(x=>x.name===row.exercise_name)?.video_url&&<a href={exerciseLibrary.find(x=>x.name===row.exercise_name).video_url} target="_blank" rel="noreferrer">Sjå video</a>} · {row.phase==='warmup'?'Oppvarming':row.phase==='cooldown'?'Avslutning':'Hovuddel'} · {row.sets?row.sets+' × ':''}{row.reps}{row.target_load?' · '+row.target_load:''}{row.rest_seconds?' · '+row.rest_seconds+' sek pause':''}{row.notes?' — '+row.notes:''}</span>{staff&&<button className="secondary-button" disabled={busy==='plan-'+row.id} onClick={()=>removePlanExercise(row)}>Fjern</button>}</div>)}</div>}{false&&staff&&<form className="admin-create-form pt-plan-form" onSubmit={e=>addPlanExercise(e,s)}><strong>Bygg PT-program</strong><div className="engine-fields"><label>Øving<select required value={planDrafts[s.id]?.exerciseId||''} onChange={e=>setPlanDrafts(v=>({...v,[s.id]:{...v[s.id],exerciseId:e.target.value}}))}><option value="">Vel øving</option>{exerciseLibrary.map(x=><option key={x.id} value={x.id}>{x.name} · {x.category}</option>)}</select></label><label>Del<select value={planDrafts[s.id]?.phase||'main'} onChange={e=>setPlanDrafts(v=>({...v,[s.id]:{...v[s.id],phase:e.target.value}}))}><option value="warmup">Oppvarming</option><option value="main">Hovuddel</option><option value="cooldown">Avslutning</option></select></label></div><div className="engine-fields three"><label>Sett<input type="number" min="1" max="30" value={planDrafts[s.id]?.sets||''} onChange={e=>setPlanDrafts(v=>({...v,[s.id]:{...v[s.id],sets:e.target.value}}))}/></label><label>Reps<input value={planDrafts[s.id]?.reps||''} placeholder="8–10" onChange={e=>setPlanDrafts(v=>({...v,[s.id]:{...v[s.id],reps:e.target.value}}))}/></label><label>Pause (sek.)<input type="number" min="0" value={planDrafts[s.id]?.rest||''} onChange={e=>setPlanDrafts(v=>({...v,[s.id]:{...v[s.id],rest:e.target.value}}))}/></label></div><div className="engine-fields"><label>Belastning<input value={planDrafts[s.id]?.targetLoad||''} placeholder="t.d. 60 kg / RPE 7" onChange={e=>setPlanDrafts(v=>({...v,[s.id]:{...v[s.id],targetLoad:e.target.value}}))}/></label><label>Notat<input value={planDrafts[s.id]?.notes||''} onChange={e=>setPlanDrafts(v=>({...v,[s.id]:{...v[s.id],notes:e.target.value}}))}/></label></div><button className="secondary-button" disabled={busy==='plan-'+s.id||!planDrafts[s.id]?.exerciseId}><Plus size={14}/> Legg til øving</button></form>}</article>})}</div>:<div className="empty-state">{staff?'Ingen treningsøkter er knytte til denne kunden enno. Lag ein WOD i arbeidsflata over.':'Ingen publiserte PT-timar no. Du kan senda ein førespurnad.'}</div>}
  </section>}
  {(!staff||activePanel==='dialog')&&<section className="engine-section">
   <div className="engine-section-title"><h4>PT-dialog</h4><span>Privat mellom medlem og trenar</span></div>

   <div className="pt-message-list">{messages.filter(m=>staff?m.client_id===messageClient:m.client_id===profile.id).map(m=><article className="history-card pt-message-card" key={m.id}><div className="history-card-top"><strong>{m.sender_id===profile.id?'Du':members.find(x=>x.id===m.sender_id)?.display_name||(m.sender_id===m.client_id?'Medlem':'Trenar')}</strong><div className="pt-message-meta"><small>{new Date(m.created_at).toLocaleString('nn-NO')}</small>{(!staff||adminOrManager||m.sender_id===profile.id)&&<button type="button" className="icon-button" aria-label="Slett melding" title="Slett melding" disabled={busy==='message-delete-'+m.id} onClick={()=>removeMessage(m)}><Trash2 size={14}/></button>}</div></div><p>{m.body}</p></article>)}</div>
   <form className="admin-create-form" onSubmit={sendMessage}><textarea rows="2" value={messageText} onChange={e=>setMessageText(e.target.value)} required maxLength="3000" placeholder="Skriv ei melding …"/><button className="primary-button" disabled={busy==='message'||!messageText.trim()}>Send melding</button></form>
  </section>}
  {false&&staff&&<section className="engine-section"><h4>Foreskriv WOD til PT-klient</h4><form className="admin-create-form" onSubmit={prescribeWorkout}><label>PT-klient<select required value={prescribeClient} onChange={e=>setPrescribeClient(e.target.value)}><option value="">Vel klient</option>{members.map(m=><option key={m.id} value={m.id}>{m.display_name||'Utan namn'}</option>)}</select></label><label>WOD<select required value={prescribeWod} onChange={e=>setPrescribeWod(e.target.value)}><option value="">Vel WOD</option>{wodLibrary.map(w=><option key={w.id} value={w.id}>{w.name} · {w.format}</option>)}</select></label><label>Dato / tidspunkt (valfritt)<input type="datetime-local" value={prescribeAt} onChange={e=>setPrescribeAt(e.target.value)}/></label><button className="primary-button" disabled={busy==='prescribe'||!prescribeClient||!prescribeWod}>Foreskriv WOD</button></form></section>}
  {staff&&activePanel==='notat'&&<section className="engine-section pt-notes-panel"><div className="engine-section-title"><div><h4>Trenarnotat</h4><p>Privat journal – berre synleg for trenarar og administratorar</p></div><span>{notes.filter(n=>n.client_id===activeClient).length} notat</span></div>
   <form className="admin-create-form pt-note-form" onSubmit={saveNote}>
    <label>Fokus / mål<textarea rows="2" value={noteGoals} onChange={e=>setNoteGoals(e.target.value)} required placeholder="Kva arbeider kunden mot?"/></label>
    <label>Trenaren si vurdering og tiltak<textarea rows="4" value={noteText} onChange={e=>setNoteText(e.target.value)} required placeholder="Observasjonar, progresjon, justeringar og avtalar …"/></label>
    <CalendarSelect value={followUp} onChange={setFollowUp} label="Neste oppfølging (valfri)"/>
    <button className="primary-button" disabled={busy==='note'||!noteClient}>Lagra trenarnotat</button>
   </form>
   <div className="pt-note-history">{notes.filter(n=>n.client_id===activeClient).map(n=><article className="pt-note-card" key={n.id}><div className="pt-note-card-head"><div><span>TRENERJOURNAL</span><strong>{members.find(m=>m.id===n.coach_id)?.display_name||'Trenar'}</strong></div><time>{new Date(n.created_at).toLocaleString('nn-NO')}</time></div><p className="pt-note-goal"><b>Fokus:</b> {n.goals}</p><p>{n.note}</p>{n.follow_up_at&&<small>Neste oppfølging: {new Date(n.follow_up_at).toLocaleString('nn-NO')}</small>}</article>)}</div>
  </section>}
  {(!staff||activePanel==='forespurnader')&&<section className="engine-section pt-requests-panel"><div className="engine-section-title"><div><h4>{staff?'PT-førespurnader':'Mine førespurnader'}</h4><p>{staff?'Førespurnader for aktiv kunde':'Status på dine førespurnader'}</p></div></div>
   {(()=>{const own=requests.filter(r=>!staff||r.member_id===activeClient),active=own.filter(r=>!r.archived_at&&r.status==='pending'),approved=own.filter(r=>!r.archived_at&&r.status==='approved'),declined=own.filter(r=>!r.archived_at&&r.status==='declined'),archived=own.filter(r=>r.archived_at);return <>
    {staff&&<div className="pt-request-summary"><button type="button" className={`pt-request-count pending ${requestFilter==='pending'?'selected':''}`} onClick={()=>{setRequestFilter('pending');setShowRequestArchive(false)}}><strong>{active.length}</strong><span>Ventande</span></button><button type="button" className={`pt-request-count approved ${requestFilter==='approved'?'selected':''}`} onClick={()=>{setRequestFilter('approved');setShowRequestArchive(false)}}><strong>{approved.length}</strong><span>Godkjende</span></button><button type="button" className={`pt-request-count declined ${requestFilter==='declined'?'selected':''}`} onClick={()=>{setRequestFilter('declined');setShowRequestArchive(false)}}><strong>{declined.length}</strong><span>Avslåtte</span></button><button type="button" className={`pt-request-count archive ${showRequestArchive?'selected':''}`} onClick={()=>setShowRequestArchive(v=>!v)}><strong>{archived.length}</strong><span>Arkiv</span></button></div>}
    {(staff?own.filter(r=>!r.archived_at&&r.status===requestFilter):active).length>0&&<div className="pt-request-group"><h5>{staff?({pending:'Ventande førespurnader',approved:'Godkjende førespurnader',declined:'Avslåtte førespurnader'}[requestFilter]):'Treng behandling'}</h5>{(staff?own.filter(r=>!r.archived_at&&r.status===requestFilter):active).map(r=><article id={'pt-request-'+r.id} className="history-card pt-request-card" key={r.id}><div className="history-card-top"><strong>{r.goal}</strong><span>{r.status==='approved'?'Godkjend':r.status==='declined'?'Avslått':'Ventande'}</span></div><small>{r.preferred_at?'Ønskt: '+new Date(r.preferred_at).toLocaleString('nn-NO'):'Tidspunkt ikkje valt'}{r.alternative_at?' · Alternativ: '+new Date(r.alternative_at).toLocaleString('nn-NO'):''}</small>{r.availability_note&&<p>{r.availability_note}</p>}{staff?<div className="pt-request-editor"><label className="pt-request-comment-label">Intern kommentar / svar<textarea rows="2" value={requestDrafts[r.id]?.staffNote??r.staff_note??''} onChange={e=>setRequestDrafts(v=>({...v,[r.id]:{...v[r.id],staffNote:e.target.value}}))} placeholder="Skriv kort kommentar eller forslag til tidspunkt …"/></label><div className="pt-request-time"><CalendarSelect value={requestDrafts[r.id]?.sessionAt||toLocalDateTimeInput(r.preferred_at)||''} onChange={value=>setRequestDrafts(v=>({...v,[r.id]:{...v[r.id],sessionAt:value}}))} label="Tidspunkt ved godkjenning"/></div><label className="pt-request-type">Type PT-time<select value={requestDrafts[r.id]?.sessionType||'guided'} onChange={e=>setRequestDrafts(v=>({...v,[r.id]:{...v[r.id],sessionType:e.target.value}}))}><option value="guided">Generell rettleiing / teknikk</option><option value="free">Fri trening utan fast struktur</option><option value="wod">Strukturert WOD med PT</option></select></label><div className="pt-request-actions">{r.pt_session_id?<span className="booking-confirmed">PT-time oppretta</span>:['pending','approved'].includes(r.status)&&<button className="primary-button" disabled={busy==='request-'+r.id||(!requestDrafts[r.id]?.sessionAt&&!r.preferred_at)} onClick={()=>createSessionFromRequest(r)}>{busy==='request-'+r.id?'Arbeider …':r.status==='approved'?'Opprett PT-time':'Godkjenn og opprett PT-time'}</button>}{!r.pt_session_id&&<><button className="secondary-button" disabled={busy==='request-'+r.id} onClick={()=>setRequestDecision(r,'declined')}>Avslå</button><button className="secondary-button" disabled={busy==='request-'+r.id} onClick={()=>setRequestDecision(r,'pending')}>Set som ventande</button></>}<button className="secondary-button" disabled={busy==='request-'+r.id} onClick={()=>updateRequest(r)}>Lagre kommentar</button>{r.status!=='pending'&&<button className="secondary-button" disabled={busy==='request-'+r.id} onClick={()=>archiveRequest(r)}>Arkiver</button>}</div></div>:null}</article>)}</div>}
    {!staff&&(approved.length>0||declined.length>0)&&<details className="pt-request-resolved" open><summary>Behandla førespurnader <span>{approved.length} godkjende · {declined.length} avslåtte</span></summary><div className="pt-request-group">{approved.map(r=><article className="pt-request-compact approved" key={r.id}><div><strong>{r.goal}</strong><small>Godkjend · {r.handled_at?new Date(r.handled_at).toLocaleDateString('nn-NO'):''}</small></div>{staff&&<button type="button" className="secondary-button" onClick={()=>archiveRequest(r)}>Flytt til søppelbøtte</button>}</article>)}{declined.map(r=><article className="pt-request-compact declined" key={r.id}><div><strong>{r.goal}</strong><small>Avslått · {r.handled_at?new Date(r.handled_at).toLocaleDateString('nn-NO'):''}</small></div>{staff&&<button type="button" className="secondary-button" onClick={()=>archiveRequest(r)}>Flytt til søppelbøtte</button>}</article>)}</div></details>}
    {showRequestArchive&&staff&&<div className="pt-request-group pt-trash"><h5><span>▣</span> Søppelbøtte</h5>{archived.length?archived.map(r=><article className="pt-request-compact" key={r.id}><div><strong>{r.goal}</strong><small>{r.status==='approved'?'Godkjend':r.status==='declined'?'Avslått':'Ventande'} · Arkivert {new Date(r.archived_at).toLocaleDateString('nn-NO')}</small></div><button className="primary-button" type="button" disabled={busy==='request-'+r.id} onClick={()=>restoreRequest(r)}>Gjenopprett</button></article>):<div className="empty-state">Søppelbøtta er tom.</div>}</div>}
    {!active.length&&!approved.length&&!declined.length&&!archived.length&&<div className="empty-state">Ingen PT-førespurnader for denne kunden.</div>}
   </>})()}
  </section>}
  {sessionEditor&&<div className="calendar-modal-backdrop" role="presentation" onClick={()=>setSessionEditor(null)}><form className="calendar-modal" onSubmit={saveSessionChanges} onClick={event=>event.stopPropagation()}><div className="training-heading"><div><div className="section-kicker">PT-STUDIO · TIMEENDRING</div><h3>Endre PT-time</h3></div><button type="button" className="secondary-button" onClick={()=>setSessionEditor(null)}>Lukk</button></div><label>Tittel<input value={sessionDraft.title} onChange={event=>setSessionDraft(v=>({...v,title:event.target.value}))} required/></label><div className="engine-fields"><label>Dato og klokkeslett<input type="datetime-local" value={sessionDraft.startsAt} onChange={event=>setSessionDraft(v=>({...v,startsAt:event.target.value}))} required/></label><label>Varigheit (minutt)<input type="number" min="5" max="600" step="1" value={sessionDraft.duration} onChange={event=>setSessionDraft(v=>({...v,duration:event.target.value}))} required/></label></div><label>Informasjon til kunden<textarea rows="3" value={sessionDraft.message} onChange={event=>setSessionDraft(v=>({...v,message:event.target.value}))}/></label><label>Melding til kunden ved avlysing (valfri)<textarea rows="2" value={sessionDraft.cancellationNote} onChange={event=>setSessionDraft(v=>({...v,cancellationNote:event.target.value}))}/></label><div className="calendar-modal-actions"><button type="submit" className="primary-button" disabled={busy==='session-edit-'+sessionEditor.id}>{busy==='session-edit-'+sessionEditor.id?'Lagrar …':'Lagre endring'}</button><button type="button" className="secondary-button" disabled={busy==='session-cancel-'+sessionEditor.id} onClick={cancelEditedSession}>{busy==='session-cancel-'+sessionEditor.id?'Avlyser …':'Avlys PT-time'}</button><button type="button" className="secondary-button" onClick={()=>setSessionEditor(null)}>Avbryt</button></div><p className="calendar-detail-description">Kunden får automatisk varsel ved endring eller avlysing. Bookinghistorikk blir bevart.</p></form></div>}
 </div>
}
