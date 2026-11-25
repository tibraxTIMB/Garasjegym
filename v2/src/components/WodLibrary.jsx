import './librarium.css'
import {cardParts} from '../lib/wodCard.js'
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
const categoryLabels={warmup:'Oppvarming',flow_prep:'Felles oppvarming',flow_build:'Teknikk / arbeidsvekt',flow_recovery:'Nedtrapping',daily:'Dagens WOD',standard:'Standard-WOD',benchmark:'Benchmark-WOD',assessment:'Test og evaluering',rehab:'Rehabilitering',recovery:'Restitusjon og mobilitet',other:'Anna / spesialøkt'}
const categoryLabel=value=>categoryLabels[value]||value||'Standard-WOD'
const catalogCategories={fitness:'Fitness',strength:'Styrke',endurance:'Kondisjon',mobility:'Mobilitet',prep:'Oppvarming'}
const catalogCategory=w=>{const c=categoryOf(w),f=String(w.format||'').toLowerCase();if(['warmup','flow_prep','flow_build'].includes(c))return 'prep';if(['rehab','recovery','flow_recovery'].includes(c)||/mobilitet|mobility|yoga|pilates/.test(f))return 'mobility';if(/strength|styrke|superset|complex/.test(f))return 'strength';if(/row intervals|kondisjon|endurance|cardio/.test(f))return 'endurance';return 'fitness'}
const catalogItems=w=>cardParts(w).flatMap(p=>p.items||[]).filter(i=>!i.is_rest)
const equipmentOf=w=>[...new Set(catalogItems(w).flatMap(i=>[i.equipment,...(i.complex_steps||[]).map(x=>x.equipment)]).flatMap(e=>String(e||'').split(/[,;+/]/)).map(e=>e.trim()).filter(Boolean))]
const family=f=>/^(?:e\d+(?:\.\d+)?mom|emom)/i.test(f||'')?'EMOM':f
const catalogFormats=w=>[...new Set([family(w.format),...cardParts(w).map(p=>family(p.format||p.formatLabel))].filter(Boolean))]
const pref=(k,d)=>{try{return localStorage.getItem('gg-librarium-'+k)||d}catch{return d}}
const putPref=(k,v)=>{try{localStorage.setItem('gg-librarium-'+k,v)}catch{}}
const naturalName=(a,b)=>String(a||'').localeCompare(String(b||''),'nn',{numeric:true,sensitivity:'base'})
const sortDefault=collection=>collection==='plans'?'sequence':collection==='recent'?'newest':'name'
const collectionSort=collection=>pref('sort-v11-'+collection,sortDefault(collection))
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
 const [catalogCat,setCatalogCat]=useState('all'),[equipmentFilter,setEquipmentFilter]=useState('all'),[planFilter,setPlanFilter]=useState('all'),[plans,setPlans]=useState([]),[planLinks,setPlanLinks]=useState([]),[planStatus,setPlanStatus]=useState('loading'),[sortBy,setSortBy]=useState(()=>collectionSort('all')),[viewMode,setViewMode]=useState(()=>pref('view','grid')),[visibleCount,setVisibleCount]=useState(36)
 const changeCollection=(next)=>{setQuickFilter(next);setPlanFilter('all');setSortBy(collectionSort(next))}; const changeSort=next=>{setSortBy(next);putPref('sort-v11-'+quickFilter,next)};useEffect(()=>{putPref('view',viewMode)},[viewMode]);
 useEffect(()=>{let active=true;if(!staff){setPlanStatus('unavailable');return}async function readPlans(){try{const [p,l]=await Promise.all([supabase.from('pt_programs').select('id,title,archived_at'),supabase.from('pt_program_sessions').select('program_id,wod_id,sequence_no,week_no,day_no,archived_at').not('wod_id','is',null)]);if(p.error||l.error)throw p.error||l.error;if(active){setPlans((p.data||[]).filter(x=>!x.archived_at).sort((a,b)=>naturalName(a.title,b.title)));setPlanLinks((l.data||[]).filter(x=>!x.archived_at));setPlanStatus('ready')}}catch{if(active)setPlanStatus('unavailable')}}readPlans();return()=>{active=false}},[staff])
 const planIdsByWod=useMemo(()=>{const allowed=new Set(plans.map(p=>p.id)),m=new Map();for(const l of planLinks){if(!allowed.has(l.program_id))continue;if(!m.has(l.wod_id))m.set(l.wod_id,new Set());m.get(l.wod_id).add(l.program_id)}return m},[plans,planLinks])
 const planOrder=useMemo(()=>{const m=new Map(),allowed=new Set(plans.map(p=>p.id));for(const l of planLinks){if(!allowed.has(l.program_id))continue;const n=l.sequence_no!=null&&Number.isFinite(Number(l.sequence_no))?Number(l.sequence_no):Infinity;const k=l.program_id+':'+l.wod_id;m.set(k,Math.min(m.get(k)??Infinity,n))}return m},[plans,planLinks])
 const selectedPlan=plans.find(p=>p.id===planFilter)
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
    &&(catalogCat==='all'||catalogCategory(w)===catalogCat)
    &&(equipmentFilter==='all'||equipmentOf(w).includes(equipmentFilter))
    &&(planFilter==='all'||planIdsByWod.get(w.id)?.has(planFilter))
   &&(staff?(filter==='all'||(filter==='published'?w.is_published:!w.is_published)):true)
   &&((quickFilter==='all'&&(!planIdsByWod.has(w.id)||Boolean(query.trim())))||quickFilter==='everything'||quickFilter==='recent'||(quickFilter==='favorites'&&favorites.includes(w.id))||(quickFilter==='mine'&&w.created_by===currentUserId)||(quickFilter==='benchmark'&&categoryOf(w)==='benchmark')||(quickFilter==='plans'&&planIdsByWod.has(w.id))||(quickFilter==='standalone'&&!planIdsByWod.has(w.id)))
   &&(formatFilter==='all'||catalogFormats(w).includes(formatFilter))
   &&(durationFilter==='all'||(durationFilter==='short'&&minutes>0&&minutes<15)||(durationFilter==='medium'&&minutes>=15&&minutes<=30)||(durationFilter==='long'&&minutes>30))
   &&(intensityFilter==='all'||intensity===intensityFilter)
   &&(`${w.name} ${w.format} ${w.movements||''} ${staff?w.notes||'':''} ${categoryOf(w)} ${catalogItems(w).map(i=>i.exercise_name||i.name).join(' ')} ${equipmentOf(w).join(' ')}`).toLowerCase().includes(query.trim().toLowerCase())
 }).sort((a,b)=>{const name=()=>naturalName(a.name,b.name);const sequence=()=>{const p=w=>planFilter!=='all'?planFilter:plans.find(x=>planIdsByWod.get(w.id)?.has(x.id))?.id;const pa=p(a),pb=p(b);const n=(w,id)=>planOrder.get(id+':'+w.id)??Infinity;return (plans.findIndex(x=>x.id===pa)-plans.findIndex(x=>x.id===pb))||(n(a,pa)-n(b,pb))||name()};if(planFilter!=='all')return sequence();switch(sortBy){case 'sequence':return sequence();case 'name':return name();case 'name-desc':return -name();case 'oldest':return String(a.created_at||'').localeCompare(String(b.created_at||''))||name();case 'format':return String(a.format||'').localeCompare(String(b.format||''),'nn')||name();case 'category':return catalogCategories[catalogCategory(a)].localeCompare(catalogCategories[catalogCategory(b)],'nn')||name();case 'short':return (Number(a.duration_minutes)||Infinity)-(Number(b.duration_minutes)||Infinity)||name();case 'long':return (Number(b.duration_minutes)||0)-(Number(a.duration_minutes)||0)||name();default:return String(b.created_at||'').localeCompare(String(a.created_at||''))||name()}}),[wods,query,filter,staff,categoryFilter,quickFilter,formatFilter,durationFilter,intensityFilter,favorites,currentUserId,catalogCat,equipmentFilter,planFilter,planIdsByWod,planOrder,plans,sortBy])
 const featuredDaily=wods.find(w=>!w.is_archived&&w.id===dailyWodId&&w.is_published&&dailyDate===localDateISO())
 const ordinaryWods=filtered.filter(w=>staff&&!simpleMode||w.id!==featuredDaily?.id)
 const categoryOptions=useMemo(()=>{const base=['warmup','flow_prep','flow_build','daily','standard','benchmark','assessment','rehab','recovery','flow_recovery','other'];const custom=[...new Set(wods.map(categoryOf).filter(x=>!base.includes(x)))];return [...base,...custom]},[wods])
 const formatOptions=useMemo(()=>[...new Set(wods.filter(w=>!w.is_archived).flatMap(catalogFormats))].sort(),[wods])
 const equipmentOptions=useMemo(()=>[...new Set(wods.filter(w=>!w.is_archived).flatMap(equipmentOf))].sort((a,b)=>a.localeCompare(b,'nn')),[wods])
 const activeAdvancedCount=[categoryFilter,formatFilter,durationFilter,intensityFilter,filter,equipmentFilter,planFilter].filter(value=>value!=='all').length
 useEffect(()=>{setVisibleCount(36)},[query,categoryFilter,catalogCat,quickFilter,formatFilter,durationFilter,intensityFilter,filter,equipmentFilter,planFilter,sortBy]);
 const actionWod=wods.find(w=>openCardMenu?.endsWith(':'+w.id))
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
  <div className="librarium-tools">
    <select aria-label="Samling" value={quickFilter} onChange={e=>changeCollection(e.target.value)}><option value="all">Bibliotek</option><option value="everything">Alle WOD-ar</option><option value="recent">Nyaste</option><option value="favorites">Favorittar</option><option value="benchmark">Benchmark</option>{staff&&<option value="mine">Mine WOD-ar</option>}{planStatus==='ready'&&<><option value="plans">Treningsplanar</option><option value="standalone">Utan treningsplan</option></>}</select>
    <select aria-label="Kategori" value={catalogCat} onChange={e=>setCatalogCat(e.target.value)}><option value="all">Kategori</option>{Object.entries(catalogCategories).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>
    <select aria-label="Sorter WOD" value={planFilter!=='all'?'sequence':sortBy} disabled={planFilter!=='all'} onChange={e=>changeSort(e.target.value)}>{[...(quickFilter==='plans'?[['sequence','Øktrekkje']]:[]),['newest','Nyaste'],['oldest','Eldste'],['name','A–Å'],['name-desc','Å–A'],['format','Format'],['category','Kategori'],['short','Kortaste'],['long','Lengste']].map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>
    <button type="button" className="secondary-button" aria-label="Vis fleire filter" aria-expanded={showAdvancedFilters} onClick={()=>setShowAdvancedFilters(v=>!v)}>Filter{activeAdvancedCount?' ('+activeAdvancedCount+')':''}</button>
    <button type="button" className="secondary-button" aria-label="Byt listevisning" onClick={()=>setViewMode(v=>v==='grid'?'list':'grid')}>{viewMode==='grid'?'Liste':'Kort'}</button>
   </div>
   {quickFilter==='plans'&&planStatus==='ready'&&<div className="librarium-plan-picker"><BookOpen size={16}/><select aria-label="Treningsplan" value={planFilter} onChange={e=>setPlanFilter(e.target.value)}><option value="all">Vel treningsplan</option>{plans.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></div>}
   {showAdvancedFilters&&<div className="librarium-tools librarium-extra">
    <select aria-label="Format" value={formatFilter} onChange={e=>setFormatFilter(e.target.value)}><option value="all">Alle format</option>{formatOptions.map(v=><option key={v}>{v}</option>)}</select>
    <select aria-label="Varigheit" value={durationFilter} onChange={e=>setDurationFilter(e.target.value)}><option value="all">All varigheit</option><option value="short">Under 15 min</option><option value="medium">15–30 min</option><option value="long">Over 30 min</option></select>
    <select aria-label="Utstyr" value={equipmentFilter} onChange={e=>setEquipmentFilter(e.target.value)}><option value="all">Alt utstyr</option>{equipmentOptions.map(v=><option key={v}>{v}</option>)}</select>
    <select aria-label="Intensitet" value={intensityFilter} onChange={e=>setIntensityFilter(e.target.value)}><option value="all">Alle intensitetar</option><option value="1">Kontrollert</option><option value="2">Utfordrande</option><option value="3">Høg intensitet</option></select>
    <select aria-label="Opprinneleg WOD-type" value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)}><option value="all">Alle WOD-typar</option>{categoryOptions.map(v=><option key={v} value={v}>{categoryLabel(v)}</option>)}</select>
    {staff&&<select aria-label="Publiseringsstatus" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All synlegheit</option><option value="private">Berre PT/admin</option><option value="published">Publisert</option></select>}
    
    {staff&&planStatus==='unavailable'&&<small>Plansamlingar er ikkje tilgjengelege no.</small>}
    <button type="button" className="secondary-button" onClick={()=>{setCatalogCat('all');setCategoryFilter('all');changeCollection('all');setFormatFilter('all');setDurationFilter('all');setIntensityFilter('all');setFilter('all');setEquipmentFilter('all');setPlanFilter('all')}}>Nullstill</button>
   </div>}
  </div>
  {showSession&&<form className="booking-create" onSubmit={e=>{e.preventDefault();createSession()}}><h4>Ny treningsøkt · {sessionWods.length} WOD-ar valde</h4><label>Namn på økta<input value={sessionName} onChange={e=>setSessionName(e.target.value)} placeholder="t.d. Styrke + kondisjon"/></label><label>Dato<input type="date" value={sessionDate} onChange={e=>setSessionDate(e.target.value)}/></label><p>Vel WOD-ar med «Legg til i økt» på korta under. Du kan endra rekkjefølgja seinare.</p><button className="primary-button" disabled={!sessionWods.length||busy==='session'}>Opprett økt med {sessionWods.length} WOD-ar</button><button type="button" className="secondary-button" onClick={()=>setShowSession(false)}>Avbryt</button></form>}
 {selectedPlan&&<div className="librarium-plan-heading"><BookOpen size={16}/><strong>{selectedPlan.title}</strong><small>{ordinaryWods.length} WOD-ar</small></div>}
 {loading?<div className="training-state"><LoaderCircle className="spin"/> Hentar WOD-bibliotek …</div>:ordinaryWods.length?<><div className={'librarium-grid '+(viewMode==='list'?'librarium-list':'')}>
   {ordinaryWods.slice(0,visibleCount).map(w=>{const parts=cardParts(w),items=catalogItems(w),equipment=equipmentOf(w),mins=Number(w.duration_minutes)||0;const f=family(w.format)||'WOD';const color=/AMRAP/i.test(f)?'amrap':f==='EMOM'?'emom':/for time/i.test(f)?'fortime':parts.length>1?'multi':/intervall|tabata/i.test(f)?'interval':'other';return <article key={w.id} className={'librarium-tile tone-'+color}>
    <button type="button" className="librarium-open" onClick={()=>{setExpanded(w.id);setOpenCardMenu(null)}} aria-label={'Opna WOD-kort: '+w.name} title={w.name}>
    <span className="librarium-format"><span>{parts.length>1?<Layers size={13}/>:<Clock3 size={13}/>} {parts.length>1?'Fleirdelt':f}</span><span className="librarium-flags">{favorites.includes(w.id)&&<Star size={13} fill="currentColor"/>}{dailyWodId===w.id&&<CalendarDays size={13}/>}</span></span>
    <strong className="librarium-name">{w.name}</strong>
    <span className="librarium-number">{mins>0?mins:parts.length>1?parts.length:items.length||'–'} <small>{mins>0?'min':parts.length>1?'delar':'øvingar'}</small></span>
    <span className="librarium-footer"><span title={equipment.join(', ')}>{equipment.length>0?<Dumbbell size={13}/>:null}{parts.length>1?parts.length+' delar':items.length?items.length+' øv.':''}</span><span className="librarium-flags">{categoryOf(w)==='benchmark'&&<span title="Benchmark">PR</span>}{planIdsByWod.has(w.id)&&<BookOpen size={13}/>} {staff&&!w.is_published&&<EyeOff size={13}/>}</span></span>
    </button><button type="button" className="librarium-more" aria-label={'Handlingar: '+w.name} onClick={()=>setOpenCardMenu('use:'+w.id)}><MoreHorizontal size={17}/></button>
   </article>})}
  </div>{ordinaryWods.length>visibleCount&&<button type="button" className="secondary-button" onClick={()=>setVisibleCount(v=>v+36)}>Vis fleire ({ordinaryWods.length-visibleCount})</button>}</>:<div className="empty-state">{simpleMode?'Ingen økter samsvarar med søket.':'Ingen WOD-ar samsvarar med søket.'}</div>}
  {expanded&&wods.some(w=>w.id===expanded)&&<WodCard key={expanded} wod={wods.find(w=>w.id===expanded)} memberId={currentUserId} staff={staff} onClose={()=>setExpanded(null)} onLaunch={()=>{const id=expanded;setExpanded(null);onLaunchWod?.(id)}} onEdit={isAdmin?()=>{const id=expanded;setExpanded(null);onEditWod?.(id)}:undefined} onActions={()=>{const id=expanded;setExpanded(null);setOpenCardMenu('use:'+id)}}/>}
  {actionWod&&(()=>{const w=actionWod,adminMenuOpen=staff&&!simpleMode,useMenuOpen=staff&&!simpleMode;return <div className="modal-backdrop" onClick={()=>setOpenCardMenu(null)}><section className="librarium-actions" role="dialog" aria-modal="true" aria-label={'Handlingar for '+w.name} onClick={e=>e.stopPropagation()}><div className="librarium-action-head"><h4>{w.name}</h4><button type="button" className="icon-button" onClick={()=>setOpenCardMenu(null)} aria-label="Lukk">×</button></div><button type="button" className="secondary-button" disabled={busy===w.id} onClick={()=>toggleFavorite(w)}><Star size={17}/> {favorites.includes(w.id)?'Fjern frå favorittar':'Legg til favorittar'}</button>
  {useMenuOpen&&<div className="wod-card-action-panel wod-card-use-panel" aria-label={'Bruk '+w.name}><small className="librarium-menu-label">BRUK WOD</small>
     <button type="button" onClick={()=>{setOpenCardMenu(null);toggleSession(w.id);setShowSession(true)}}><Layers size={17}/>{sessionWods.includes(w.id)?'Fjern frå økt':'Legg til i økt'}</button>
     <button type="button" disabled={busy==='assign'} onClick={()=>{setOpenCardMenu(null);setError('');setNotice('');setAssignWod(w);setCustomerId('');setDueDate('');setCoachNote('')}}><UserPlus size={17}/> Tildel til kunde</button>
     <button type="button" onClick={()=>{setOpenCardMenu(null);setClassWod(w);setClassId('')}}><CalendarDays size={17}/> Gruppetime</button>
     <button type="button" disabled={busy==='daily'} onClick={()=>{setOpenCardMenu(null);setDailyScheduleWod(w);setDailyScheduleDate(localDateISO());setDailyScheduleClassId('');setDailySchedulePublished(true)}}><CalendarDays size={17}/> Dagens WOD</button>
    </div>}
   
  {adminMenuOpen&&<div className="wod-card-action-panel" aria-label={'Administrer '+w.name}><small className="librarium-menu-label">ADMINISTRASJON</small>
      {isAdmin&&<button type="button" onClick={()=>{setOpenCardMenu(null);onEditWod?.(w.id)}}><Edit3 size={17}/> Rediger</button>}{isAdmin&&onCopyWod&&<button type="button" onClick={()=>{setOpenCardMenu(null);onCopyWod(w.id)}}>Lag kopi som kladd</button>}
      <button type="button" disabled={busy===w.id} onClick={()=>{setOpenCardMenu(null);publish(w)}}>{w.is_published?<EyeOff size={17}/>:<Eye size={17}/>} {w.is_published?'Trekk tilbake':'Publiser'}</button>
      {isAdmin&&<small className="librarium-menu-label danger">ARKIV OG SLETTING</small>}{isAdmin&&<button type="button" className="wod-card-danger-action" disabled={busy===w.id} onClick={()=>{setOpenCardMenu(null);removeWod(w)}}><Archive size={17}/> Fjern frå biblioteket</button>}
      {isAdmin&&<button type="button" className="wod-card-danger-action" disabled={busy===w.id} onClick={()=>{setOpenCardMenu(null);removeWod(w,{permanent:true})}}><Trash2 size={17}/> Slett WOD permanent</button>}
     </div>}
    
  </section></div>})()}
  {dailyScheduleWod&&<div className="modal-backdrop" role="presentation" onClick={()=>busy!=="daily"&&setDailyScheduleWod(null)}><form className="booking-create daily-wod-schedule-modal" role="dialog" aria-modal="true" aria-labelledby="daily-wod-title" onClick={e=>e.stopPropagation()} onSubmit={e=>{e.preventDefault();saveDailySchedule()}}><div className="training-heading"><div><span className="section-kicker">DAGENS WOD</span><h4 id="daily-wod-title">Planlegg «{dailyScheduleWod.name}»</h4></div><button type="button" className="icon-button" disabled={busy==="daily"} onClick={()=>setDailyScheduleWod(null)} aria-label="Lukk">×</button></div><label>Dato<input type="date" required value={dailyScheduleDate} onChange={e=>setDailyScheduleDate(e.target.value)} disabled={busy==="daily"}/></label><label>Synleg for<select value={dailyScheduleClassId} onChange={e=>setDailyScheduleClassId(e.target.value)} disabled={busy==="daily"}><option value="">Alle medlemmar</option>{classes.map(c=><option key={c.id} value={c.id}>{c.title} · {new Date(c.starts_at).toLocaleString("nn-NO",{dateStyle:"medium",timeStyle:"short"})}</option>)}</select></label><label className="inline-check"><input type="checkbox" checked={dailySchedulePublished} onChange={e=>setDailySchedulePublished(e.target.checked)} disabled={busy==="daily"}/> Publiser med ein gong</label><div className="wizard-stage-actions"><button type="button" className="secondary-button" disabled={busy==="daily"} onClick={()=>setDailyScheduleWod(null)}>Avbryt</button><button type="submit" className="primary-button" disabled={busy==="daily"}>{busy==="daily"?"Lagrar …":"Lagre plan"}</button></div></form></div>}{classWod&&<div className="modal-backdrop" role="presentation" onClick={()=>busy!=='class'&&setClassWod(null)}><form className="booking-create wod-link-modal" role="dialog" aria-modal="true" aria-labelledby="class-wod-title" onClick={e=>e.stopPropagation()} onSubmit={e=>{e.preventDefault();addToClass()}}><div className="assign-wod-modal-head"><div><span className="section-kicker">WOD · GRUPPETIME</span><h4 id="class-wod-title">Legg «{classWod.name}» til gruppetime</h4></div><button type="button" className="icon-button" disabled={busy==='class'} onClick={()=>setClassWod(null)} aria-label="Lukk">×</button></div><label>Vel gruppetime<select required value={classId} onChange={e=>setClassId(e.target.value)} disabled={busy==='class'}><option value="">Vel komande gruppetime …</option>{classes.map(x=><option key={x.id} value={x.id}>{x.title} · {new Date(x.starts_at).toLocaleString('nn-NO',{dateStyle:'medium',timeStyle:'short'})}</option>)}</select></label>{!classes.length&&<p>Ingen publiserte komande gruppetimar funne.</p>}<div className="wizard-stage-actions"><button type="button" className="secondary-button" disabled={busy==='class'} onClick={()=>setClassWod(null)}>Avbryt</button><button type="submit" className="primary-button" disabled={!classId||busy==='class'}>{busy==='class'?'Lagrar …':'Legg til i gruppetime'}</button></div></form></div>}{assignWod&&<div className="modal-backdrop" role="presentation" onClick={()=>busy!=='assign'&&setAssignWod(null)}><form className="booking-create assign-wod-modal" role="dialog" aria-modal="true" aria-labelledby="assign-wod-title" onClick={e=>e.stopPropagation()} onSubmit={e=>{e.preventDefault();assign()}}><div className="assign-wod-modal-head"><div><span className="section-kicker">PT · TILDELING</span><h4 id="assign-wod-title">Tildel «{assignWod.name}»</h4></div><button type="button" className="icon-button" aria-label="Lukk" disabled={busy==='assign'} onClick={()=>setAssignWod(null)}>×</button></div>{assignWod.timer_settings?.workout_schema?.composite_blocks?.length>1&&<div className="wod-composite-card-summary"><strong>Dette blir tildelt:</strong>{assignWod.timer_settings.workout_schema.composite_blocks.map((block,index)=><span key={block.id}>{index+1}. {block.title} · {block.format} · {Math.floor((block.duration_seconds||Number(block.minutes)*60)/60)}:{String((block.duration_seconds||Number(block.minutes)*60)%60).padStart(2,'0')} min:sek</span>)}</div>}<label>Kunde<select required value={customerId} onChange={e=>setCustomerId(e.target.value)} disabled={customersLoading||busy==='assign'}><option value="">{customersLoading?'Hentar kundar …':'Vel kunde …'}</option>{customers.map(c=><option key={c.id} value={c.id}>{c.display_name||'Medlem'}</option>)}</select></label>{!customersLoading&&!customers.length&&<p className="assign-wod-hint">Ingen aktive kundar er tilgjengelege. Kontroller at medlemmet er aktivt.</p>}<label>Frist (valfri)<input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} disabled={busy==='assign'}/></label><label>Melding frå PT<textarea rows="3" value={coachNote} onChange={e=>setCoachNote(e.target.value)} placeholder="Instruksjon eller fokusområde …" disabled={busy==='assign'}/></label><button type="submit" className="primary-button" disabled={!customerId||customersLoading||busy==='assign'}>{busy==='assign'?<><LoaderCircle size={15} className="spin"/> Tildeler …</>:'Tildel WOD'}</button><button type="button" className="secondary-button" disabled={busy==='assign'} onClick={()=>setAssignWod(null)}>Avbryt</button></form></div>}
 </div>
}
