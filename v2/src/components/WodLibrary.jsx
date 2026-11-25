import DailyWodStrip from './DailyWodStrip.jsx'
import {useEffect,useMemo,useRef,useState} from 'react'
import {BookOpen,Search,Eye,EyeOff,LoaderCircle,Clock3,Dumbbell,Play,Layers,UserPlus,Trash2,Archive,Edit3,Star,CalendarDays,Info,MoreHorizontal,ChevronDown,ChevronUp,ChevronRight} from 'lucide-react'
import WodCard from './WodCard.jsx'
import {supabase} from '../lib/supabase.js'
import {formatComplexSequence} from '../lib/wodComplexes.js'
import {getWodSideLabel} from '../lib/wodSides.js'
const formatDose=(item,level)=>{const d=item?.levels?.[level]||{};const parts=[];if(d.sets)parts.push(d.sets+' sett');if(d.reps)parts.push(d.reps+' reps');if(d.heightCm)parts.push(d.heightCm+' cm');if(d.durationSeconds)parts.push(d.durationSeconds+' sek');if(d.distanceMeters)parts.push(d.distanceMeters+' m');if(d.calories)parts.push(d.calories+' cal');if(d.loadMode==='kg'){const v=[d.loadKgMen!=null&&d.loadKgMen!==''?'M '+d.loadKgMen+' kg':'',d.loadKgWomen!=null&&d.loadKgWomen!==''?'K '+d.loadKgWomen+' kg':''].filter(Boolean);if(v.length)parts.push(v.join(' / '))}else if(d.loadMode==='percent'&&d.percent1rm)parts.push(d.percent1rm+' % 1RM');else if(d.loadMode==='rir'&&(d.rirRange||d.rir!==''))parts.push('RIR '+(d.rirRange||d.rir));else if(d.loadMode==='bodyweight')parts.push('Kroppsvekt');if(d.tempo)parts.push('Tempo '+d.tempo);if(d.variant)parts.push('Variant: '+d.variant);if(d.instruction)parts.push(d.instruction);return parts.join(' · ')};
const localDateISO=(value=new Date())=>{const y=value.getFullYear(),m=String(value.getMonth()+1).padStart(2,'0'),d=String(value.getDate()).padStart(2,'0');return `${y}-${m}-${d}`}
const categoryOf=w=>{const stored=w?.timer_settings?.workout_schema?.library_category||w?.category;if(!stored||stored==='main')return 'standard';return stored}
const categoryLabels={warmup:'Oppvarming',daily:'Dagens WOD',standard:'Standard-WOD',benchmark:'Benchmark-WOD',assessment:'Test og evaluering',rehab:'Rehabilitering',recovery:'Restitusjon og mobilitet',other:'Anna / spesialøkt'}
const categoryLabel=value=>categoryLabels[value]||value||'Standard-WOD'
const compactDose=(item,level)=>{
 const d=item?.levels?.[level]
 if(!d)return ''
 const values=[]
 if(d.sets)values.push(`${d.sets} sett`)
 if(d.reps)values.push(`${d.reps} reps`)
 if(d.calories)values.push(`${d.calories} cal`)
 if(d.distanceMeters)values.push(`${d.distanceMeters} m`)
 if(d.heightCm)values.push(`${d.heightCm} cm`)
 if(d.durationSeconds)values.push(`${d.durationSeconds} sek`)
 if(d.loadMode==='kg'){
  const men=d.loadKgMen!==''&&d.loadKgMen!=null?d.loadKgMen:null
  const women=d.loadKgWomen!==''&&d.loadKgWomen!=null?d.loadKgWomen:null
  if(men!=null&&women!=null)values.push(`${men}/${women} kg`)
  else if(men!=null||women!=null)values.push(`${men??women} kg`)
 }else if(d.loadMode==='percent'&&d.percent1rm)values.push(`${d.percent1rm} % 1RM`)
 else if(d.loadMode==='rir'&&(d.rirRange||d.rir!==''))values.push('RIR '+(d.rirRange||d.rir))
 else if(d.loadMode==='bodyweight')values.push('kroppsvekt')
 const side=getWodSideLabel(item,level)
 if(side)values.push(side)
 return values.join(' · ')
}

export default function WodLibrary({onLaunchWod,onEditWod,onCopyWod,staff=true,isAdmin=false,focusWodId=null,onFocusConsumed,simpleMode=false}){
 const [wods,setWods]=useState([]),[query,setQuery]=useState(''),[filter,setFilter]=useState('all'),[quickFilter,setQuickFilter]=useState('all'),[formatFilter,setFormatFilter]=useState('all'),[durationFilter,setDurationFilter]=useState('all'),[intensityFilter,setIntensityFilter]=useState('all'),[currentUserId,setCurrentUserId]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const [customers,setCustomers]=useState([]),[customersLoading,setCustomersLoading]=useState(true),[assignWod,setAssignWod]=useState(null),[customerId,setCustomerId]=useState(''),[dueDate,setDueDate]=useState(''),[coachNote,setCoachNote]=useState('')
 const [sessionWods,setSessionWods]=useState([]),[sessionName,setSessionName]=useState(''),[sessionDate,setSessionDate]=useState(localDateISO()),[showSession,setShowSession]=useState(false),[favorites,setFavorites]=useState([]),[dailyWodId,setDailyWodId]=useState(null),[dailyDate,setDailyDate]=useState(null),[classes,setClasses]=useState([]),[classWod,setClassWod]=useState(null),[classId,setClassId]=useState(''),[expanded,setExpanded]=useState(null),[categoryFilter,setCategoryFilter]=useState('all'),[dailyScheduleWod,setDailyScheduleWod]=useState(null),[dailyScheduleDate,setDailyScheduleDate]=useState(localDateISO()),[dailyScheduleClassId,setDailyScheduleClassId]=useState(''),[dailySchedulePublished,setDailySchedulePublished]=useState(true)
 const [showAdvancedFilters,setShowAdvancedFilters]=useState(false)
 const [openCardMenu,setOpenCardMenu]=useState(null)
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
    supabase.from('wod_daily_schedules').select('wod_id,scheduled_date').eq('scheduled_date',localDateISO()).is('target_class_id',null).eq('is_published',true).maybeSingle(),
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
   setDailyWodId(daily.data?.wod_id||null);setDailyDate(daily.data?.scheduled_date||null)
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
 const featuredDaily=filtered.find(w=>w.id===dailyWodId&&w.is_published&&dailyDate===localDateISO())
 const ordinaryWods=filtered.filter(w=>staff&&!simpleMode||w.id!==featuredDaily?.id)
 const categoryOptions=useMemo(()=>{const base=['warmup','daily','standard','benchmark','assessment','rehab','recovery','other'];const custom=[...new Set(wods.map(categoryOf).filter(x=>!base.includes(x)))];return [...base,...custom]},[wods])
 const formatOptions=useMemo(()=>[...new Set(wods.filter(w=>!w.is_archived).map(w=>w.format).filter(Boolean))].sort(),[wods])
 const activeAdvancedCount=[quickFilter,formatFilter,durationFilter,intensityFilter,filter].filter(value=>value!=='all').length
 async function publish(w){setBusy(w.id);setError('');const {error:e}=await supabase.from('wods').update({is_published:!w.is_published}).eq('id',w.id);if(e)setError(e.message);else{setWods(rows=>rows.map(x=>x.id===w.id?{...x,is_published:!w.is_published}:x));setNotice(w.is_published?'WOD-en er no berre i PT-biblioteket.':'WOD-en er publisert for medlemmene.')}setBusy('')}
 async function toggleFavorite(w){
  if(busy===w.id)return
  setBusy(w.id);setError('');setNotice('')
  try{
   const {data:{user},error:authError}=await supabase.auth.getUser()
   if(authError||!user)throw authError||new Error('Logg inn på nytt.')
   const exists=favorites.includes(w.id)
   const result=exists
    ?await supabase.from('wod_favorites').delete().eq('user_id',user.id).eq('wod_id',w.id)
    :await supabase.from('wod_favorites').insert({user_id:user.id,wod_id:w.id})
   if(result.error)throw result.error
   setFavorites(v=>exists?v.filter(id=>id!==w.id):v.includes(w.id)?v:[...v,w.id])
  }catch(e){setError('Favoritten kunne ikkje oppdaterast: '+(e?.message||'Ukjend feil'))}
  finally{setBusy('')}
 }
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
   if(dailyScheduleDate===localDateISO()&&!dailyScheduleClassId){setDailyWodId(dailySchedulePublished?dailyScheduleWod.id:null);setDailyDate(dailySchedulePublished?dailyScheduleDate:null)}
   setNotice(`${dailyScheduleWod.name} er ${dailySchedulePublished?'publisert':'lagra som utkast'} for ${new Date(dailyScheduleDate+'T12:00:00').toLocaleDateString('nn-NO')}${dailyScheduleClassId?' for vald gruppetime':' for alle medlemmar'}.`)
   setDailyScheduleWod(null)
  }catch(e){setError('Kunne ikkje planleggja Dagens WOD: '+(e.message||'Ukjend feil'))}
  finally{setBusy('')}
 }
 async function addToClass(){
  if(!classWod||!classId||busy==='class')return
  setBusy('class');setError('');setNotice('')
  try{
   const {data:{user},error:authError}=await supabase.auth.getUser()
   if(authError||!user)throw authError||new Error('Logg inn på nytt.')
   const {data:wodIds,error:addError}=await supabase.rpc('add_wod_to_class',{p_class_id:classId,p_wod_id:classWod.id})
   if(addError)throw addError
   const next=Array.isArray(wodIds)?wodIds:[]
   setClasses(rows=>rows.map(x=>x.id===classId?{...x,wod_ids:next}:x))
   setNotice(classWod.name+' er lagt til i gruppetimen.')
   setClassWod(null);setClassId('')
  }catch(e){setError('Kunne ikkje leggja WOD til gruppetimen: '+(e?.message||'Ukjend feil'))}
  finally{setBusy('')}
 }
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
 async function removeWod(w,{permanent=false}={}){
   if(!isAdmin)return
   const ask=permanent
    ? 'Slette «'+w.name+'» PERMANENT? Dette er berre tillate dersom WOD-en ikkje har lagra resultat, tildelingar eller andre koplingar. Ei forkasta økt utan slike koplingar hindrar ikkje sletting. Vel «Fjern frå biblioteket» for å ta vare på historikk.'
    : 'Fjerne «'+w.name+'» frå WOD-biblioteket? Økta blir arkivert, og treningsloggar, PT-tildelingar og PR-ar blir bevarte.'
   if(!window.confirm(ask))return
   setBusy(w.id);setError('');setNotice('')
   try{
     if(permanent){
       // Fail closed: a complete dependency check is required for destructive removal,
       // but never required for safe archiving.
       const checks=await Promise.all([
        supabase.from('pt_wod_assignments').select('*',{count:'exact',head:true}).eq('wod_id',w.id),
        supabase.from('workout_logs').select('*',{count:'exact',head:true}).eq('source_wod_id',w.id),
        supabase.from('wod_favorites').select('*',{count:'exact',head:true}).eq('wod_id',w.id),
        supabase.from('class_live_sessions').select('*',{count:'exact',head:true}).eq('wod_id',w.id),
        supabase.from('class_live_sessions').select('*',{count:'exact',head:true}).contains('wod_ids',JSON.stringify([w.id])),
        supabase.from('classes').select('*',{count:'exact',head:true}).contains('wod_ids',JSON.stringify([w.id])),
        supabase.from('pt_sessions').select('*',{count:'exact',head:true}).contains('wod_ids',[w.id]),
        supabase.from('pt_program_sessions').select('*',{count:'exact',head:true}).eq('wod_id',w.id),
        supabase.from('training_session_wods').select('*',{count:'exact',head:true}).eq('wod_id',w.id),
        supabase.from('class_session_wod_completions').select('*',{count:'exact',head:true}).eq('wod_id',w.id),
        supabase.from('daily_wod').select('*',{count:'exact',head:true}).eq('wod_id',w.id),
        supabase.from('wod_daily_schedules').select('*',{count:'exact',head:true}).eq('wod_id',w.id),
       ])
       const failedCheck=checks.find(x=>x.error)
       if(failedCheck)throw new Error('Kan ikkje stadfesta at WOD-en er ubrukt: '+(failedCheck.error.message||'Kontrollfeil')+'. Ingen WOD er sletta.')
       if(checks.some(x=>(x.count||0)>0))throw new Error('Denne WOD-en er i bruk eller har historikk. Bruk «Fjern frå biblioteket» for å bevara alle koplingar.')
       // Composite references are JSON snapshots. Do not delete a referenced source WOD.
       const {data:composites,error:compositesError}=await supabase.from('wods').select('id,timer_settings').eq('format','Samansett økt')
       if(compositesError)throw new Error('Kunne ikkje kontrollera samansette økter. Arkiver i staden.')
       const referenced=(composites||[]).some(row=>row.id!==w.id&&[...(row.timer_settings?.workout_schema?.composite_blocks||[]),...(row.timer_settings?.workout_schema?.wod_engine?.blocks||[])].some(block=>block.source_wod_id===w.id||block.sourceWodId===w.id))
       if(referenced)throw new Error('WOD-en er nytta i ei samansett økt. Arkiver i staden for å slette permanent.')
       const {data,error:e}=await supabase.from('wods').delete().eq('id',w.id).select('id').maybeSingle()
       if(e||!data)throw e||new Error('Databasen stadfesta ikkje slettinga. Prøv arkivering.')
       setNotice('Den ubrukte WOD-en er sletta permanent.')
     }else{
       const {data,error:e}=await supabase.from('wods').update({is_archived:true,is_published:false}).eq('id',w.id).select('id').maybeSingle()
       if(e||!data)throw e||new Error('Arkiveringa vart ikkje stadfesta. WOD-en er ikkje fjerna.')
       setNotice('WOD-en er fjerna frå biblioteket. Eksisterande loggar og PT-koplingar er bevarte.')
     }
     setWods(rows=>rows.filter(x=>x.id!==w.id))
     setExpanded(value=>value===w.id?null:value)
   }catch(e){setError(e.message||'Kunne ikkje fjerna WOD-en.')}
   finally{setBusy('')}
 }
 function toggleSession(id){setSessionWods(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id])}
 return <div className={simpleMode?"wod-library-page simple-wod-library":"wod-library-page"}>{simpleMode?<div className="training-heading"><div><div className="section-kicker">EIGENTRENING</div><h3>Vel ei økt</h3><p>Trykk på økta for å sjå WOD-kortet.</p></div><span className="count-pill">{filtered.length} økter</span></div>:<div className="wod-library-compact-heading"><strong>WOD-bibliotek</strong><span>{filtered.length} WOD-ar</span></div>}
 {error&&<div className="auth-error">{error}</div>}{notice&&<div className="auth-message">{notice}</div>}
 {featuredDaily&&!loading&&<DailyWodStrip wod={featuredDaily} date={dailyDate} onOpen={id=>{setExpanded(id);setOpenCardMenu(null)}}/>}
 <div className={simpleMode?"wod-library-toolbar simple-wod-toolbar":"wod-library-toolbar wod-library-compact-toolbar"}>
  <div className="wod-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={simpleMode?"Søk etter økt …":"Søk namn, øving eller format …"}/></div>
  {simpleMode?<div className="calendar-view-switch">{[['all','Alle'],...['warmup','standard','benchmark','rehab'].map(v=>[v,categoryLabel(v)])].map(([v,label])=><button type="button" key={v} className={categoryFilter===v?'selected':''} aria-pressed={categoryFilter===v} onClick={()=>setCategoryFilter(v)}>{label}</button>)}</div>:<>
   <div className="wod-library-mobile-filters">
    <label className="wod-library-type-pick"><span>Type</span><select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)} aria-label="WOD-type"><option value="all">Alle typar</option>{categoryOptions.map(v=><option key={v} value={v}>{categoryLabel(v)}</option>)}</select></label>
    <button type="button" className={showAdvancedFilters||activeAdvancedCount?'wod-library-filter-toggle is-active':'wod-library-filter-toggle'} onClick={()=>setShowAdvancedFilters(value=>!value)} aria-expanded={showAdvancedFilters} aria-controls="wod-library-more-filters">Filter{activeAdvancedCount?` (${activeAdvancedCount})`:''} <span aria-hidden="true">{showAdvancedFilters?'−':'+'}</span></button>
   </div>
   <div id="wod-library-more-filters" className={showAdvancedFilters?'wod-library-expanded-filters is-open':'wod-library-expanded-filters'}>
    <div className="calendar-view-switch wod-library-category-chips" role="group" aria-label="Filtrer etter WOD-type">{[['all','Alle'],...categoryOptions.map(v=>[v,categoryLabel(v)])].map(([v,label])=><button type="button" key={v} className={categoryFilter===v?'selected':''} aria-pressed={categoryFilter===v} onClick={()=>setCategoryFilter(v)}>{label}</button>)}</div>
    <div className="wod-library-advanced-filters"><select value={quickFilter} onChange={e=>setQuickFilter(e.target.value)} aria-label="Vis WOD"><option value="all">Alle WOD-ar</option><option value="favorites">Favorittar</option>{staff&&<option value="mine">Mine WOD-ar</option>}</select><select value={formatFilter} onChange={e=>setFormatFilter(e.target.value)} aria-label="Format"><option value="all">Alle format</option>{formatOptions.map(v=><option value={v} key={v}>{v}</option>)}</select><select value={durationFilter} onChange={e=>setDurationFilter(e.target.value)} aria-label="Varigheit"><option value="all">All varigheit</option><option value="short">Under 15 min</option><option value="medium">15–30 min</option><option value="long">Over 30 min</option></select><select value={intensityFilter} onChange={e=>setIntensityFilter(e.target.value)} aria-label="Intensitet"><option value="all">Alle intensitetar</option><option value="1">Kontrollert</option><option value="2">Utfordrande</option><option value="3">Høg intensitet</option></select></div>
    {staff&&<div className="calendar-view-switch wod-library-visibility-chips" role="group" aria-label="Filtrer etter publiseringsstatus">{[['all','Alle'],['private','Berre PT/admin'],['published','Publisert']].map(([v,l])=><button type="button" key={v} className={filter===v?'selected':''} aria-pressed={filter===v} onClick={()=>setFilter(v)}>{l}</button>)}</div>}
   </div>
  </>}
 </div>
 {showSession&&<form className="booking-create" onSubmit={e=>{e.preventDefault();createSession()}}><h4>Ny treningsøkt · {sessionWods.length} WOD-ar valde</h4><label>Namn på økta<input value={sessionName} onChange={e=>setSessionName(e.target.value)} placeholder="t.d. Styrke + kondisjon"/></label><label>Dato<input type="date" value={sessionDate} onChange={e=>setSessionDate(e.target.value)}/></label><p>Vel WOD-ar med «Legg til i økt» på korta under. Du kan endra rekkjefølgja seinare.</p><button className="primary-button" disabled={!sessionWods.length||busy==='session'}>Opprett økt med {sessionWods.length} WOD-ar</button><button type="button" className="secondary-button" onClick={()=>setShowSession(false)}>Avbryt</button></form>}
 {loading?<div className="training-state"><LoaderCircle className="spin"/> Hentar WOD-bibliotek …</div>:filtered.length?<div className="wod-library-grid">
  {ordinaryWods.map(w=>{
   const items=w.timer_settings?.workout_schema?.items||[]
   const compositeBlocks=w.timer_settings?.workout_schema?.composite_blocks||[]
   const useMenuOpen=openCardMenu==='use:'+w.id
   const adminMenuOpen=openCardMenu==='admin:'+w.id
   return <article className="wod-library-card wod-library-card-compact" key={w.id}>
    <div className="wod-library-card-head">
     <span className="wod-library-icon"><BookOpen size={18}/></span>
     <div className="wod-card-head-actions">
      <span className={'gg-info-status '+(w.is_published?'is-public':'is-private')}>{staff?(w.is_published?'Publisert':'Privat PT-WOD'):'Tilgjengeleg'}</span>
      {!simpleMode&&<button type="button" className={favorites.includes(w.id)?'wod-card-icon-action is-favorite':'wod-card-icon-action'} aria-label={favorites.includes(w.id)?'Fjern frå favorittar':'Legg til favorittar'} aria-pressed={favorites.includes(w.id)} title="Favoritt" disabled={busy===w.id} onClick={()=>toggleFavorite(w)}><Star size={19} fill={favorites.includes(w.id)?'currentColor':'none'}/></button>}
      {staff&&!simpleMode&&<button type="button" className="wod-card-icon-action" aria-label={'Administrer '+w.name} aria-expanded={adminMenuOpen} title="Administrer WOD" onClick={()=>setOpenCardMenu(value=>value==='admin:'+w.id?null:'admin:'+w.id)}><MoreHorizontal size={21}/></button>}
     </div>
    </div>
    {adminMenuOpen&&<div className="wod-card-action-panel" aria-label={'Administrer '+w.name}>
      {isAdmin&&<button type="button" onClick={()=>{setOpenCardMenu(null);onEditWod?.(w.id)}}><Edit3 size={17}/> Rediger</button>}{isAdmin&&onCopyWod&&<button type="button" onClick={()=>{setOpenCardMenu(null);onCopyWod(w.id)}}>Lag kopi som kladd</button>}
      <button type="button" disabled={busy===w.id} onClick={()=>{setOpenCardMenu(null);publish(w)}}>{w.is_published?<EyeOff size={17}/>:<Eye size={17}/>} {w.is_published?'Trekk tilbake':'Publiser'}</button>
      {isAdmin&&<button type="button" className="wod-card-danger-action" disabled={busy===w.id} onClick={()=>{setOpenCardMenu(null);removeWod(w)}}><Archive size={17}/> Fjern frå biblioteket</button>}
      {isAdmin&&<button type="button" className="wod-card-danger-action" disabled={busy===w.id} onClick={()=>{setOpenCardMenu(null);removeWod(w,{permanent:true})}}><Trash2 size={17}/> Slett WOD permanent</button>}
     </div>}
    <h4><button className="wod-light-title" type="button" aria-label={'Opna WOD-kort med fire sider: '+w.name} onClick={()=>{setExpanded(w.id);setOpenCardMenu(null)}}><span>{w.name}</span><span className="gg-wod-more-pages"><Layers size={14} aria-hidden="true"/> 4 sider <ChevronRight size={16} aria-hidden="true"/></span></button></h4>
    <div className="wod-card-mini-category gg-info-meta"><span>{categoryLabel(categoryOf(w))}</span>{dailyWodId===w.id&&<strong>Dagens WOD</strong>}</div>
    <div className="wod-library-meta gg-info-meta"><span>{w.format}</span><span><Clock3 size={14}/>{w.duration_minutes||'–'} min</span><span><Dumbbell size={14}/>{items.length||w.movements?.split('\n').filter(Boolean).length||0} øvingar</span></div>
    {compositeBlocks.length>1&&<small className="wod-light-parts">{compositeBlocks.length} delar · {[...new Set(compositeBlocks.map(b=>b.format))].join(" / ")}</small>}
    {!simpleMode&&(w.timer_settings?.workout_schema?.stimulus||(staff?w.notes:''))&&<p className="wod-card-short-stimulus">{w.timer_settings?.workout_schema?.stimulus||(staff?w.notes:'')}</p>}
    {!simpleMode&&<div className="wod-card-exercise-preview wod-card-exercise-compact">
      {items.length?(items.slice(0,3)).map((item,index)=>{
       const rx=compactDose(item,'rx'),scaled=compactDose(item,'scaled')
       const dose=[rx?'RX '+rx:'',scaled?'Scaled '+scaled:''].filter(Boolean).join('  |  ')||[item.reps?item.reps+' reps':'',item.load_kg?item.load_kg+' kg':''].filter(Boolean).join(' · ')
       return <div className="wod-card-exercise-line" key={item.id||index}><strong>{index+1}. {item.exercise_name||item.name||'Øving'}</strong>{dose&&<small>{dose}</small>}</div>
      }):(w.movements?.split('\n').filter(Boolean).slice(0,3))?.map((name,index)=><div className="wod-card-exercise-line" key={index}><strong>{index+1}. {name}</strong></div>)}
      {items.length>3&&<small className="wod-card-exercise-more">+ {items.length-3} fleire øvingar</small>}
     </div>}
    <div className="wod-library-actions wod-card-primary-actions">
     <button type="button" className="primary-button" onClick={()=>{setExpanded(w.id);setOpenCardMenu(null)}}><BookOpen size={16}/>Sjå kort</button>
     {staff&&!simpleMode&&<button type="button" className="secondary-button wod-card-use-button" aria-expanded={useMenuOpen} onClick={()=>setOpenCardMenu(value=>value==='use:'+w.id?null:'use:'+w.id)}>Bruk <ChevronDown size={17}/></button>}
    </div>
    {useMenuOpen&&<div className="wod-card-action-panel wod-card-use-panel" aria-label={'Bruk '+w.name}>
     <button type="button" onClick={()=>{setOpenCardMenu(null);toggleSession(w.id);setShowSession(true)}}><Layers size={17}/>{sessionWods.includes(w.id)?'Fjern frå økt':'Legg til i økt'}</button>
     <button type="button" disabled={busy==='assign'} onClick={()=>{setOpenCardMenu(null);setError('');setNotice('');setAssignWod(w);setCustomerId('');setDueDate('');setCoachNote('')}}><UserPlus size={17}/> Tildel til kunde</button>
     <button type="button" onClick={()=>{setOpenCardMenu(null);setClassWod(w);setClassId('')}}><CalendarDays size={17}/> Gruppetime</button>
     <button type="button" disabled={busy==='daily'} onClick={()=>{setOpenCardMenu(null);setDailyScheduleWod(w);setDailyScheduleDate(localDateISO());setDailyScheduleClassId('');setDailySchedulePublished(true)}}><CalendarDays size={17}/> Dagens WOD</button>
    </div>}
   </article>
  })}
 </div>:<div className="empty-state">{simpleMode?'Ingen økter er tilgjengelege akkurat no.':'Ingen WOD-ar samsvarar med søket.'}</div>}
 {expanded&&wods.some(w=>w.id===expanded)&&<WodCard key={expanded} wod={wods.find(w=>w.id===expanded)} memberId={currentUserId} staff={staff} onClose={()=>setExpanded(null)} onLaunch={()=>{const id=expanded;setExpanded(null);onLaunchWod?.(id)}}/>}
 {dailyScheduleWod&&<div className="modal-backdrop" role="presentation" onClick={()=>busy!=="daily"&&setDailyScheduleWod(null)}><form className="booking-create daily-wod-schedule-modal" role="dialog" aria-modal="true" aria-labelledby="daily-wod-title" onClick={e=>e.stopPropagation()} onSubmit={e=>{e.preventDefault();saveDailySchedule()}}><div className="training-heading"><div><span className="section-kicker">DAGENS WOD</span><h4 id="daily-wod-title">Planlegg «{dailyScheduleWod.name}»</h4></div><button type="button" className="icon-button" disabled={busy==="daily"} onClick={()=>setDailyScheduleWod(null)} aria-label="Lukk">×</button></div><label>Dato<input type="date" required value={dailyScheduleDate} onChange={e=>setDailyScheduleDate(e.target.value)} disabled={busy==="daily"}/></label><label>Synleg for<select value={dailyScheduleClassId} onChange={e=>setDailyScheduleClassId(e.target.value)} disabled={busy==="daily"}><option value="">Alle medlemmar</option>{classes.map(c=><option key={c.id} value={c.id}>{c.title} · {new Date(c.starts_at).toLocaleString("nn-NO",{dateStyle:"medium",timeStyle:"short"})}</option>)}</select></label><label className="inline-check"><input type="checkbox" checked={dailySchedulePublished} onChange={e=>setDailySchedulePublished(e.target.checked)} disabled={busy==="daily"}/> Publiser med ein gong</label><div className="wizard-stage-actions"><button type="button" className="secondary-button" disabled={busy==="daily"} onClick={()=>setDailyScheduleWod(null)}>Avbryt</button><button type="submit" className="primary-button" disabled={busy==="daily"}>{busy==="daily"?"Lagrar …":"Lagre plan"}</button></div></form></div>}{classWod&&<div className="modal-backdrop" role="presentation" onClick={()=>busy!=='class'&&setClassWod(null)}><form className="booking-create wod-link-modal" role="dialog" aria-modal="true" aria-labelledby="class-wod-title" onClick={e=>e.stopPropagation()} onSubmit={e=>{e.preventDefault();addToClass()}}><div className="assign-wod-modal-head"><div><span className="section-kicker">WOD · GRUPPETIME</span><h4 id="class-wod-title">Legg «{classWod.name}» til gruppetime</h4></div><button type="button" className="icon-button" disabled={busy==='class'} onClick={()=>setClassWod(null)} aria-label="Lukk">×</button></div><label>Vel gruppetime<select required value={classId} onChange={e=>setClassId(e.target.value)} disabled={busy==='class'}><option value="">Vel komande gruppetime …</option>{classes.map(x=><option key={x.id} value={x.id}>{x.title} · {new Date(x.starts_at).toLocaleString('nn-NO',{dateStyle:'medium',timeStyle:'short'})}</option>)}</select></label>{!classes.length&&<p>Ingen publiserte komande gruppetimar funne.</p>}<div className="wizard-stage-actions"><button type="button" className="secondary-button" disabled={busy==='class'} onClick={()=>setClassWod(null)}>Avbryt</button><button type="submit" className="primary-button" disabled={!classId||busy==='class'}>{busy==='class'?'Lagrar …':'Legg til i gruppetime'}</button></div></form></div>}{assignWod&&<div className="modal-backdrop" role="presentation" onClick={()=>busy!=='assign'&&setAssignWod(null)}><form className="booking-create assign-wod-modal" role="dialog" aria-modal="true" aria-labelledby="assign-wod-title" onClick={e=>e.stopPropagation()} onSubmit={e=>{e.preventDefault();assign()}}><div className="assign-wod-modal-head"><div><span className="section-kicker">PT · TILDELING</span><h4 id="assign-wod-title">Tildel «{assignWod.name}»</h4></div><button type="button" className="icon-button" aria-label="Lukk" disabled={busy==='assign'} onClick={()=>setAssignWod(null)}>×</button></div>{assignWod.timer_settings?.workout_schema?.composite_blocks?.length>1&&<div className="wod-composite-card-summary"><strong>Dette blir tildelt:</strong>{assignWod.timer_settings.workout_schema.composite_blocks.map((block,index)=><span key={block.id}>{index+1}. {block.title} · {block.format} · {Math.floor((block.duration_seconds||Number(block.minutes)*60)/60)}:{String((block.duration_seconds||Number(block.minutes)*60)%60).padStart(2,'0')} min:sek</span>)}</div>}<label>Kunde<select required value={customerId} onChange={e=>setCustomerId(e.target.value)} disabled={customersLoading||busy==='assign'}><option value="">{customersLoading?'Hentar kundar …':'Vel kunde …'}</option>{customers.map(c=><option key={c.id} value={c.id}>{c.display_name||'Medlem'}</option>)}</select></label>{!customersLoading&&!customers.length&&<p className="assign-wod-hint">Ingen aktive kundar er tilgjengelege. Kontroller at medlemmet er aktivt.</p>}<label>Frist (valfri)<input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} disabled={busy==='assign'}/></label><label>Melding frå PT<textarea rows="3" value={coachNote} onChange={e=>setCoachNote(e.target.value)} placeholder="Instruksjon eller fokusområde …" disabled={busy==='assign'}/></label><button type="submit" className="primary-button" disabled={!customerId||customersLoading||busy==='assign'}>{busy==='assign'?<><LoaderCircle size={15} className="spin"/> Tildeler …</>:'Tildel WOD'}</button><button type="button" className="secondary-button" disabled={busy==='assign'} onClick={()=>setAssignWod(null)}>Avbryt</button></form></div>}
 </div>
}
