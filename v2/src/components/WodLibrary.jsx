import {useEffect,useMemo,useRef,useState} from 'react'
import {BookOpen,Search,Eye,EyeOff,LoaderCircle,Clock3,Dumbbell,Play,Layers,UserPlus,Trash2,Archive,Edit3,Star,CalendarDays,Info} from 'lucide-react'
import {supabase} from '../lib/supabase.js'
import {formatComplexSequence} from '../lib/wodComplexes.js'
const formatDose=(item,level)=>{const d=item?.levels?.[level]||{};const parts=[];if(d.sets)parts.push(d.sets+' sett');if(d.reps)parts.push(d.reps+' reps');if(d.heightCm)parts.push(d.heightCm+' cm');if(d.durationSeconds)parts.push(d.durationSeconds+' sek');if(d.distanceMeters)parts.push(d.distanceMeters+' m');if(d.calories)parts.push(d.calories+' cal');if(d.loadMode==='kg'){const v=[d.loadKgMen!=null&&d.loadKgMen!==''?'M '+d.loadKgMen+' kg':'',d.loadKgWomen!=null&&d.loadKgWomen!==''?'K '+d.loadKgWomen+' kg':''].filter(Boolean);if(v.length)parts.push(v.join(' / '))}else if(d.loadMode==='percent'&&d.percent1rm)parts.push(d.percent1rm+' % 1RM');else if(d.loadMode==='rir'&&d.rir!=='')parts.push('RIR '+d.rir);else if(d.loadMode==='bodyweight')parts.push('Kroppsvekt');if(d.tempo)parts.push('Tempo '+d.tempo);if(d.variant)parts.push('Variant: '+d.variant);if(d.instruction)parts.push(d.instruction);return parts.join(' · ')};
const localDateISO=(value=new Date())=>{const y=value.getFullYear(),m=String(value.getMonth()+1).padStart(2,'0'),d=String(value.getDate()).padStart(2,'0');return `${y}-${m}-${d}`}
const categoryOf=w=>{const stored=w?.timer_settings?.workout_schema?.library_category||w?.category;if(!stored||stored==='main')return 'standard';return stored}
const categoryLabels={warmup:'Oppvarming',daily:'Dagens WOD',standard:'Standard-WOD',benchmark:'Benchmark-WOD',assessment:'Test og evaluering',rehab:'Rehabilitering',recovery:'Restitusjon og mobilitet',other:'Anna / spesialøkt'}
const categoryLabel=value=>categoryLabels[value]||value||'Standard-WOD'

export default function WodLibrary({onLaunchWod,onEditWod,staff=true,isAdmin=false,focusWodId=null,onFocusConsumed,simpleMode=false}){
 const [wods,setWods]=useState([]),[query,setQuery]=useState(''),[filter,setFilter]=useState('all'),[quickFilter,setQuickFilter]=useState('all'),[formatFilter,setFormatFilter]=useState('all'),[durationFilter,setDurationFilter]=useState('all'),[intensityFilter,setIntensityFilter]=useState('all'),[currentUserId,setCurrentUserId]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const [customers,setCustomers]=useState([]),[customersLoading,setCustomersLoading]=useState(true),[assignWod,setAssignWod]=useState(null),[customerId,setCustomerId]=useState(''),[dueDate,setDueDate]=useState(''),[coachNote,setCoachNote]=useState('')
 const [sessionWods,setSessionWods]=useState([]),[sessionName,setSessionName]=useState(''),[sessionDate,setSessionDate]=useState(localDateISO()),[showSession,setShowSession]=useState(false),[favorites,setFavorites]=useState([]),[dailyWodId,setDailyWodId]=useState(null),[classes,setClasses]=useState([]),[classWod,setClassWod]=useState(null),[classId,setClassId]=useState(''),[expanded,setExpanded]=useState(null),[categoryFilter,setCategoryFilter]=useState('all'),[dailyScheduleWod,setDailyScheduleWod]=useState(null),[dailyScheduleDate,setDailyScheduleDate]=useState(localDateISO()),[dailyScheduleClassId,setDailyScheduleClassId]=useState(''),[dailySchedulePublished,setDailySchedulePublished]=useState(true)
 const loadSequence=useRef(0)
 async function load(){
  const requestId=++loadSequence.current
  setLoading(true);setError('')
  try{
   const {data:{user},error:userError}=await supabase.auth.getUser()
   if(userError)throw userError
   const request=supabase.from('wods').select('id,name,format,duration_minutes,movements,notes,is_published,is_archived,created_at,timer_settings,created_by,category').order('created_at',{ascending:false})
   const [w,fav,daily,cls]=await Promise.all([
    request,
    user?supabase.from('wod_favorites').select('wod_id').eq('user_id',user.id):Promise.resolve({data:[],error:null}),
    supabase.from('wod_daily_schedules').select('wod_id').eq('scheduled_date',localDateISO()).is('target_class_id',null).eq('is_published',true).maybeSingle(),
    staff?supabase.from('classes').select('id,title,starts_at,wod_ids,published').eq('published',true).gte('starts_at',new Date().toISOString()).order('starts_at').limit(50):Promise.resolve({data:[],error:null})
   ])
   if(requestId!==loadSequence.current)return
   if(w.error)throw w.error
   if(fav.error)throw fav.error
   if(daily.error)throw daily.error
   if(cls.error)throw cls.error
   setCurrentUserId(user?.id||'')
   setWods(w.data||[])
   setFavorites((fav.data||[]).map(x=>x.wod_id))
   setDailyWodId(daily.data?.wod_id||null)
   setClasses(cls.data||[])
  }catch(e){
   if(requestId===loadSequence.current)setError('WOD-biblioteket kunne ikkje hentast: '+(e?.message||'Ukjend feil'))
  }finally{
   if(requestId===loadSequence.current)setLoading(false)
  }
 }
 useEffect(()=>{let active=true;load();async function loadCustomers(){if(!staff){if(active)setCustomersLoading(false);return}if(active)setCustomersLoading(true);try{const {data,error:customerError}=await supabase.from('profiles').select('id,display_name').eq('active',true).order('display_name');if(!active)return;if(customerError)setError('Kundelista kunne ikkje hentast: '+customerError.message);else setCustomers((data||[]).filter(c=>c.id))}catch(e){if(active)setError('Kundelista kunne ikkje hentast: '+(e?.message||'Ukjend feil'))}finally{if(active)setCustomersLoading(false)}}loadCustomers();return()=>{active=false;loadSequence.current++}},[])
 useEffect(()=>{if(focusWodId){setExpanded(focusWodId);onFocusConsumed?.();if(!loading&&!wods.some(w=>w.id===focusWodId)){supabase.from('wods').select('id,name,format,duration_minutes,movements,notes,is_published,is_archived,created_at,timer_settings,created_by,category').eq('id',focusWodId).maybeSingle().then(({data,error:e})=>{if(data&&!e)setWods(rows=>rows.some(w=>w.id===data.id)?rows:[data,...rows]);else if(e)setError('Kunne ikkje opna WOD-kortet: '+e.message)})}}},[focusWodId,loading])
 const filtered=useMemo(()=>wods.filter(w=>{
  const minutes=Number(w.duration_minutes)||0
  const intensity=String(w.timer_settings?.workout_schema?.intensity??'')
  return !w.is_archived
   &&(categoryFilter==='all'||categoryOf(w)===categoryFilter)
   &&(staff?(filter==='all'||(filter==='published'?w.is_published:!w.is_published)):true)
   &&(quickFilter==='all'||(quickFilter==='favorites'&&favorites.includes(w.id))||(quickFilter==='mine'&&w.created_by===currentUserId))
   &&(formatFilter==='all'||w.format===formatFilter)
   &&(durationFilter==='all'||(durationFilter==='short'&&minutes>0&&minutes<15)||(durationFilter==='medium'&&minutes>=15&&minutes<=30)||(durationFilter==='long'&&minutes>30))
   &&(intensityFilter==='all'||intensity===intensityFilter)
   &&(`${w.name} ${w.format} ${w.movements} ${w.notes} ${categoryOf(w)}`).toLowerCase().includes(query.toLowerCase())
 }),[wods,query,filter,staff,categoryFilter,quickFilter,formatFilter,durationFilter,intensityFilter,favorites,currentUserId])
 const categoryOptions=useMemo(()=>{const base=['warmup','daily','standard','benchmark','assessment','rehab','recovery','other'];const custom=[...new Set(wods.map(categoryOf).filter(x=>!base.includes(x)))];return [...base,...custom]},[wods])
 const formatOptions=useMemo(()=>[...new Set(wods.filter(w=>!w.is_archived).map(w=>w.format).filter(Boolean))].sort(),[wods])
 async function publish(w){setBusy(w.id);setError('');const {error:e}=await supabase.from('wods').update({is_published:!w.is_published}).eq('id',w.id);if(e)setError(e.message);else{setWods(rows=>rows.map(x=>x.id===w.id?{...x,is_published:!w.is_published}:x));setNotice(w.is_published?'WOD-en er no berre i PT-biblioteket.':'WOD-en er publisert for medlemmene.')}setBusy('')}
 async function toggleFavorite(w){const {data:{user}}=await supabase.auth.getUser();if(!user)return;const exists=favorites.includes(w.id);const result=exists?await supabase.from('wod_favorites').delete().eq('user_id',user.id).eq('wod_id',w.id):await supabase.from('wod_favorites').insert({user_id:user.id,wod_id:w.id});if(result.error){setError(result.error.message);return}setFavorites(v=>exists?v.filter(id=>id!==w.id):[...v,w.id])}
 async function saveDailySchedule(){
  if(!dailyScheduleWod||!dailyScheduleDate||busy==='daily')return
  setBusy('daily');setError('');setNotice('')
  try{
   const {data:{user},error:userError}=await supabase.auth.getUser()
   if(userError||!user)throw userError||new Error('Logg inn på nytt.')
   let existingQuery=supabase.from('wod_daily_schedules').select('id').eq('scheduled_date',dailyScheduleDate)
   existingQuery=dailyScheduleClassId?existingQuery.eq('target_class_id',dailyScheduleClassId):existingQuery.is('target_class_id',null)
   const {data:existing,error:lookupError}=await existingQuery.maybeSingle()
   if(lookupError)throw lookupError
   const payload={wod_id:dailyScheduleWod.id,scheduled_date:dailyScheduleDate,target_class_id:dailyScheduleClassId||null,is_published:dailySchedulePublished,created_by:user.id,updated_at:new Date().toISOString()}
   let result=existing?.id
    ?await supabase.from('wod_daily_schedules').update(payload).eq('id',existing.id)
    :await supabase.from('wod_daily_schedules').insert(payload)
   if(result.error?.code==='23505'){
    let retryQuery=supabase.from('wod_daily_schedules').select('id').eq('scheduled_date',dailyScheduleDate)
    retryQuery=dailyScheduleClassId?retryQuery.eq('target_class_id',dailyScheduleClassId):retryQuery.is('target_class_id',null)
    const {data:concurrent,error:retryLookupError}=await retryQuery.maybeSingle()
    if(retryLookupError)throw retryLookupError
    if(!concurrent?.id)throw result.error
    result=await supabase.from('wod_daily_schedules').update(payload).eq('id',concurrent.id)
   }
   if(result.error)throw result.error
   if(dailyScheduleDate===localDateISO()&&!dailyScheduleClassId&&dailySchedulePublished)setDailyWodId(dailyScheduleWod.id)
   setNotice(`${dailyScheduleWod.name} er ${dailySchedulePublished?'publisert':'lagra som utkast'} for ${new Date(dailyScheduleDate+'T12:00:00').toLocaleDateString('nn-NO')}${dailyScheduleClassId?' for vald gruppetime':' for alle medlemmar'}.`)
   setDailyScheduleWod(null)
  }catch(e){setError('Kunne ikkje planleggja Dagens WOD: '+(e.message||'Ukjend feil'))}
  finally{setBusy('')}
 }
 async function addToClass(){if(!classWod||!classId)return;setBusy('class');const target=classes.find(x=>x.id===classId);const ids=Array.isArray(target?.wod_ids)?target.wod_ids:[];const next=[...new Set([...ids,classWod.id])];const {error:e}=await supabase.from('classes').update({wod_ids:next}).eq('id',classId);if(e)setError(e.message);else{setClasses(rows=>rows.map(x=>x.id===classId?{...x,wod_ids:next}:x));setNotice(classWod.name+' er lagt til i gruppetimen.');setClassWod(null);setClassId('')}setBusy('')}
 async function assign(){if(!assignWod||!customerId||busy==='assign')return;setBusy('assign');setError('');setNotice('');try{const {data:{user},error:authError}=await supabase.auth.getUser();if(authError||!user)throw authError||new Error('Du må vere innlogga for å tildele ein WOD.');const {data:existing,error:lookupError}=await supabase.from('pt_wod_assignments').select('id,status').eq('member_id',customerId).eq('wod_id',assignWod.id).in('status',['assigned','in_progress']).limit(1);if(lookupError)throw lookupError;if(existing?.length){const selectedCustomer=customers.find(c=>c.id===customerId);setNotice(assignWod.name+' er allereie aktivt tildelt '+(selectedCustomer?.display_name||'kunden')+'. Ingen ny tildeling vart oppretta.');setAssignWod(null);return}const {data:created,error:e}=await supabase.from('pt_wod_assignments').insert({member_id:customerId,wod_id:assignWod.id,assigned_by:user.id,due_date:dueDate||null,coach_note:coachNote.trim(),status:'assigned'}).select('id').single();if(e){if(e.code==='23505')throw new Error('Denne WOD-en vart nettopp tildelt kunden. Den aktive tildelinga er bevart.');throw e}if(!created?.id)throw new Error('Tildelinga blei ikkje stadfesta av databasen.');const selectedCustomer=customers.find(c=>c.id===customerId);setNotice(assignWod.name+' er tildelt '+(selectedCustomer?.display_name||'kunden')+'.');setAssignWod(null);setCustomerId('');setDueDate('');setCoachNote('')}catch(e){setError('Kunne ikkje tildele WOD: '+(e?.message||'Ukjend feil'))}finally{setBusy('')}}
 async function createSession(){
  if(!sessionWods.length||busy==='session')return
  setBusy('session');setError('');setNotice('')
  try{
   const {data:{user},error:authError}=await supabase.auth.getUser()
   if(authError||!user)throw authError||new Error('Logg inn på nytt.')
   const {data:sessionId,error:createError}=await supabase.rpc('create_training_session_with_wods',{
    p_name:sessionName.trim()||'Treningsøkt',
    p_session_date:sessionDate||null,
    p_wod_ids:sessionWods
   })
   if(createError)throw createError
   if(!sessionId)throw new Error('Databasen stadfesta ikkje at treningsøkta vart oppretta.')
   setNotice('Treningsøkta er oppretta med '+sessionWods.length+' WOD-ar.')
   setShowSession(false);setSessionWods([]);setSessionName('')
  }catch(e){setError('Kunne ikkje oppretta treningsøkta: '+(e?.message||'Ukjend feil'))}
  finally{setBusy('')}
 }
 async function removeWod(w){
   if(!confirm('Slett «'+w.name+'»? WOD-ar som er brukte blir arkiverte for å ta vare på historikk.'))return;
   setBusy(w.id);setError('');
   const checks=await Promise.all([
    supabase.from('pt_wod_assignments').select('id',{count:'exact',head:true}).eq('wod_id',w.id),
    supabase.from('workout_logs').select('id',{count:'exact',head:true}).eq('source_wod_id',w.id),
    supabase.from('wod_favorites').select('id',{count:'exact',head:true}).eq('wod_id',w.id),
    supabase.from('class_live_sessions').select('id',{count:'exact',head:true}).eq('wod_id',w.id),
    supabase.from('class_live_sessions').select('id',{count:'exact',head:true}).contains('wod_ids',[w.id]),
    supabase.from('classes').select('id',{count:'exact',head:true}).contains('wod_ids',[w.id]),
    supabase.from('pt_sessions').select('id',{count:'exact',head:true}).contains('wod_ids',[w.id]),
    supabase.from('pt_program_sessions').select('id',{count:'exact',head:true}).eq('wod_id',w.id),
    supabase.from('training_session_wods').select('id',{count:'exact',head:true}).eq('wod_id',w.id),
    supabase.from('class_session_wod_completions').select('id',{count:'exact',head:true}).eq('wod_id',w.id),
    supabase.from('daily_wod').select('id',{count:'exact',head:true}).eq('wod_id',w.id),
    supabase.from('wod_daily_schedules').select('id',{count:'exact',head:true}).eq('wod_id',w.id)
   ]);
   if(checks.some(x=>x.error)){setError('Kunne ikkje kontrollera alle WOD-koplingane: '+checks.find(x=>x.error).error.message);setBusy('');return}
   const used=checks.some(x=>(x.count||0)>0);
   if(used){
    const {error:e}=await supabase.from('wods').update({is_archived:true,is_published:false}).eq('id',w.id);
    if(e)setError(e.message);else{setWods(rows=>rows.filter(x=>x.id!==w.id));setNotice('WOD-en er arkivert. Alle koplingar og historikk er bevarte.')}
   }else{
    const {error:e}=await supabase.from('wods').delete().eq('id',w.id);
    if(e)setError('WOD-en kunne ikkje slettast: '+e.message);else{setWods(rows=>rows.filter(x=>x.id!==w.id));setNotice('WOD-en er sletta permanent.')}
   }
   setBusy('')
  }
 function toggleSession(id){setSessionWods(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id])}
 return <div className={simpleMode?"wod-library-page simple-wod-library":"wod-library-page"}>{simpleMode?<div className="training-heading"><div><div className="section-kicker">EIGENTRENING</div><h3>Vel ei økt</h3><p>Trykk på økta for å sjå WOD-kortet.</p></div><span className="count-pill">{filtered.length} økter</span></div>:<div className="training-heading"><div><div className="section-kicker">GARASJEGYM · PT / ADMIN</div><h3>WOD-bibliotek</h3><p>Same WOD kan brukast i eiga trening, PT og gruppetimar.</p></div><span className="count-pill">{filtered.length} WOD-ar</span></div>}
 {error&&<div className="auth-error">{error}</div>}{notice&&<div className="auth-message">{notice}</div>}
 <div className={simpleMode?"wod-library-toolbar simple-wod-toolbar":"wod-library-toolbar"}><div className="wod-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={simpleMode?"Søk etter økt …":"Søk namn, øving eller format …"}/></div><div className="calendar-view-switch">{[['all','Alle'],...(simpleMode?['warmup','standard','benchmark','rehab']:categoryOptions).map(v=>[v,categoryLabel(v)])].map(([v,label])=><button key={v} className={categoryFilter===v?"selected":""} onClick={()=>setCategoryFilter(v)}>{label}</button>)}</div>{!simpleMode&&<div className="wod-library-advanced-filters"><select value={quickFilter} onChange={e=>setQuickFilter(e.target.value)} aria-label="Vis WOD"><option value="all">Alle WOD-ar</option><option value="favorites">Favorittar</option>{staff&&<option value="mine">Mine WOD-ar</option>}</select><select value={formatFilter} onChange={e=>setFormatFilter(e.target.value)} aria-label="Format"><option value="all">Alle format</option>{formatOptions.map(v=><option value={v} key={v}>{v}</option>)}</select><select value={durationFilter} onChange={e=>setDurationFilter(e.target.value)} aria-label="Varigheit"><option value="all">All varigheit</option><option value="short">Under 15 min</option><option value="medium">15–30 min</option><option value="long">Over 30 min</option></select><select value={intensityFilter} onChange={e=>setIntensityFilter(e.target.value)} aria-label="Intensitet"><option value="all">Alle intensitetar</option><option value="1">Kontrollert</option><option value="2">Utfordrande</option><option value="3">Høg intensitet</option></select></div>}{staff&&!simpleMode&&<div className="calendar-view-switch">{[['all','Alle'],['private','Berre PT/admin'],['published','Publisert']].map(([v,l])=><button key={v} className={filter===v?'selected':''} onClick={()=>setFilter(v)}>{l}</button>)}</div>}</div>
 {showSession&&<form className="booking-create" onSubmit={e=>{e.preventDefault();createSession()}}><h4>Ny treningsøkt · {sessionWods.length} WOD-ar valde</h4><label>Namn på økta<input value={sessionName} onChange={e=>setSessionName(e.target.value)} placeholder="t.d. Styrke + kondisjon"/></label><label>Dato<input type="date" value={sessionDate} onChange={e=>setSessionDate(e.target.value)}/></label><p>Vel WOD-ar med «Legg til i økt» på korta under. Du kan endra rekkjefølgja seinare.</p><button className="primary-button" disabled={!sessionWods.length||busy==='session'}>Opprett økt med {sessionWods.length} WOD-ar</button><button type="button" className="secondary-button" onClick={()=>setShowSession(false)}>Avbryt</button></form>}
 {loading?<div className="training-state"><LoaderCircle className="spin"/> Hentar WOD-bibliotek …</div>:filtered.length?<div className="wod-library-grid">{filtered.map(w=><article className="wod-library-card" key={w.id}><div className="wod-library-card-head"><span className="wod-library-icon"><BookOpen size={18}/></span><span className={w.is_published?'coffee-status status-ready':'coffee-status status-new'}>{staff?(w.is_published?'Publisert':'Privat PT-WOD'):'Tilgjengeleg for deg'}</span></div><h4>{w.name}</h4><span className="wod-library-category">{categoryLabel(categoryOf(w))}</span>{dailyWodId===w.id&&<span className="wod-library-category">Dagens WOD i dag</span>}<div className="wod-library-meta"><span>{w.format}</span><span><Clock3 size={13}/>{w.duration_minutes||'–'} min</span><span><Dumbbell size={13}/>{(w.timer_settings?.workout_schema?.items||[]).length||w.movements?.split('\n').filter(Boolean).length||0} øvingar</span></div>{!simpleMode&&<p>{w.timer_settings?.workout_schema?.stimulus||(staff?w.notes:'Ingen kort beskriving lagt inn.')}</p>}{!simpleMode&&<div className="wod-card-exercise-preview">{(w.timer_settings?.workout_schema?.items||[]).slice(0,4).map((item,i)=><span key={i}>{item.exercise_name||item.name}{item.levels?(['rx','scaled','foundation'].map(level=>{const text=formatDose(item,level);return text?level.toUpperCase()+': '+text:''}).filter(Boolean).join(' | ')):item.reps?' · '+item.reps+' reps':''}{item.is_complex&&<small className="wod-library-complex-sequence">{formatComplexSequence(item.complex_steps)}</small>}</span>)}</div>}<div className="wod-library-actions">{staff?<button className="primary-button" onClick={()=>onLaunchWod?.(w.id)}><Play size={14}/> Utfør WOD</button>:<button className="primary-button" onClick={()=>simpleMode?onLaunchWod?.(w.id):setExpanded(expanded===w.id?null:w.id)}>{simpleMode?<><Play size={14}/> Start økt</>:<><Info size={14}/>{expanded===w.id?'Skjul WOD-kort':'Opne WOD-kortet'}</>}</button>}{!simpleMode&&<button className="secondary-button" onClick={()=>toggleFavorite(w)}><Star size={14} fill={favorites.includes(w.id)?'currentColor':'none'}/>{favorites.includes(w.id)?'Favoritt':'Favoritt'}</button>}{staff&&<><button className="secondary-button" onClick={()=>{toggleSession(w.id);setShowSession(true)}}><Layers size={14}/>{sessionWods.includes(w.id)?'Fjern frå økt':'Legg til i økt'}</button><button type="button" className="secondary-button" disabled={busy==='assign'} onClick={e=>{e.stopPropagation();setError('');setNotice('');setAssignWod(w);setCustomerId('');setDueDate('');setCoachNote('')}}><UserPlus size={14}/> Tildel</button><button className="secondary-button" onClick={()=>{setClassWod(w);setClassId('')}}><CalendarDays size={14}/> Gruppetime</button><button className="secondary-button" disabled={busy==='daily'} onClick={()=>{setDailyScheduleWod(w);setDailyScheduleDate(localDateISO());setDailyScheduleClassId('');setDailySchedulePublished(true)}}><CalendarDays size={14}/> Planlegg Dagens WOD</button><button className="secondary-button" disabled={busy===w.id} onClick={()=>publish(w)}>{w.is_published?<EyeOff size={14}/>:<Eye size={14}/>} {w.is_published?'Trekk tilbake publisering':'Publiser for medlemmer'}</button>{isAdmin&&<><button className="secondary-button" onClick={()=>onEditWod?.(w.id)}><Edit3 size={14}/> Rediger</button><button className="secondary-button danger-button" disabled={busy===w.id} onClick={()=>removeWod(w)}><Trash2 size={14}/> Slett</button></>}</>}</div>{expanded===w.id&&<div className="wod-card-detail"><strong>WOD-kort</strong>{staff?<><p>{w.notes||'Ingen coach-notat.'}</p>{w.timer_settings?.workout_schema?.coach_notes&&<p>{w.timer_settings.workout_schema.coach_notes}</p>}</>:<p>{w.timer_settings?.workout_schema?.stimulus||'Følg instruksjonane og tilpass belastninga etter nivået ditt.'}</p>}<div className="wod-card-detail-list">{(w.timer_settings?.workout_schema?.items||[]).length?(w.timer_settings.workout_schema.items.map((item,i)=><span key={i}>{i+1}. {item.exercise_name||item.name}{item.levels?(['rx','scaled','foundation'].map(level=>{const text=formatDose(item,level);return text?level.toUpperCase()+': '+text:''}).filter(Boolean).join(' | ')):[item.reps?item.reps+' reps':'',item.load_kg?item.load_kg+' kg':'',item.row_value!=null?item.row_value+' '+(item.row_unit||''):'',item.work_seconds!=null?item.work_seconds+' sek':''].filter(Boolean).join(' · ')}{item.is_complex&&<small className="wod-library-complex-sequence">{formatComplexSequence(item.complex_steps)}</small>}</span>)):<p>{w.movements||'Øvingsliste manglar.'}</p>}</div><small>Format: {w.format} · Varigheit: {w.duration_minutes||'–'} min</small>{!staff&&<button type="button" className="primary-button wod-card-start" onClick={()=>onLaunchWod?.(w.id)}><Play size={15}/> START TRENING</button>}</div>}</article>)}</div>:<div className="empty-state">{simpleMode?'Ingen økter er tilgjengelege akkurat no.':'Ingen WOD-ar samsvarar med søket.'}</div>}
 {dailyScheduleWod&&<div className="modal-backdrop" role="presentation" onClick={()=>busy!=="daily"&&setDailyScheduleWod(null)}><form className="booking-create daily-wod-schedule-modal" role="dialog" aria-modal="true" aria-labelledby="daily-wod-title" onClick={e=>e.stopPropagation()} onSubmit={e=>{e.preventDefault();saveDailySchedule()}}><div className="training-heading"><div><span className="section-kicker">DAGENS WOD</span><h4 id="daily-wod-title">Planlegg «{dailyScheduleWod.name}»</h4></div><button type="button" className="icon-button" disabled={busy==="daily"} onClick={()=>setDailyScheduleWod(null)} aria-label="Lukk">×</button></div><label>Dato<input type="date" required value={dailyScheduleDate} onChange={e=>setDailyScheduleDate(e.target.value)} disabled={busy==="daily"}/></label><label>Synleg for<select value={dailyScheduleClassId} onChange={e=>setDailyScheduleClassId(e.target.value)} disabled={busy==="daily"}><option value="">Alle medlemmar</option>{classes.map(c=><option key={c.id} value={c.id}>{c.title} · {new Date(c.starts_at).toLocaleString("nn-NO",{dateStyle:"medium",timeStyle:"short"})}</option>)}</select></label><label className="inline-check"><input type="checkbox" checked={dailySchedulePublished} onChange={e=>setDailySchedulePublished(e.target.checked)} disabled={busy==="daily"}/> Publiser med ein gong</label><div className="wizard-stage-actions"><button type="button" className="secondary-button" disabled={busy==="daily"} onClick={()=>setDailyScheduleWod(null)}>Avbryt</button><button type="submit" className="primary-button" disabled={busy==="daily"}>{busy==="daily"?"Lagrar …":"Lagre plan"}</button></div></form></div>}{classWod&&<div className="modal-backdrop" role="presentation" onClick={()=>busy!=='class'&&setClassWod(null)}><form className="booking-create wod-link-modal" role="dialog" aria-modal="true" aria-labelledby="class-wod-title" onClick={e=>e.stopPropagation()} onSubmit={e=>{e.preventDefault();addToClass()}}><div className="assign-wod-modal-head"><div><span className="section-kicker">WOD · GRUPPETIME</span><h4 id="class-wod-title">Legg «{classWod.name}» til gruppetime</h4></div><button type="button" className="icon-button" disabled={busy==='class'} onClick={()=>setClassWod(null)} aria-label="Lukk">×</button></div><label>Vel gruppetime<select required value={classId} onChange={e=>setClassId(e.target.value)} disabled={busy==='class'}><option value="">Vel komande gruppetime …</option>{classes.map(x=><option key={x.id} value={x.id}>{x.title} · {new Date(x.starts_at).toLocaleString('nn-NO',{dateStyle:'medium',timeStyle:'short'})}</option>)}</select></label>{!classes.length&&<p>Ingen publiserte komande gruppetimar funne.</p>}<div className="wizard-stage-actions"><button type="button" className="secondary-button" disabled={busy==='class'} onClick={()=>setClassWod(null)}>Avbryt</button><button type="submit" className="primary-button" disabled={!classId||busy==='class'}>{busy==='class'?'Lagrar …':'Legg til i gruppetime'}</button></div></form></div>}{assignWod&&<div className="modal-backdrop" role="presentation" onClick={()=>busy!=='assign'&&setAssignWod(null)}><form className="booking-create assign-wod-modal" role="dialog" aria-modal="true" aria-labelledby="assign-wod-title" onClick={e=>e.stopPropagation()} onSubmit={e=>{e.preventDefault();assign()}}><div className="assign-wod-modal-head"><div><span className="section-kicker">PT · TILDELING</span><h4 id="assign-wod-title">Tildel «{assignWod.name}»</h4></div><button type="button" className="icon-button" aria-label="Lukk" disabled={busy==='assign'} onClick={()=>setAssignWod(null)}>×</button></div><label>Kunde<select required value={customerId} onChange={e=>setCustomerId(e.target.value)} disabled={customersLoading||busy==='assign'}><option value="">{customersLoading?'Hentar kundar …':'Vel kunde …'}</option>{customers.map(c=><option key={c.id} value={c.id}>{c.display_name||'Medlem'}</option>)}</select></label>{!customersLoading&&!customers.length&&<p className="assign-wod-hint">Ingen aktive kundar er tilgjengelege. Kontroller at medlemmet er aktivt.</p>}<label>Frist (valfri)<input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} disabled={busy==='assign'}/></label><label>Melding frå PT<textarea rows="3" value={coachNote} onChange={e=>setCoachNote(e.target.value)} placeholder="Instruksjon eller fokusområde …" disabled={busy==='assign'}/></label><button type="submit" className="primary-button" disabled={!customerId||customersLoading||busy==='assign'}>{busy==='assign'?<><LoaderCircle size={15} className="spin"/> Tildeler …</>:'Tildel WOD'}</button><button type="button" className="secondary-button" disabled={busy==='assign'} onClick={()=>setAssignWod(null)}>Avbryt</button></form></div>}
 </div>
}
