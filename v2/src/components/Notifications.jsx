import {useEffect,useMemo,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import {Bell,CheckCheck,Coffee,CalendarDays,MessageCircle,UserRound,Info,Check,AlertTriangle,Archive,ArrowUpRight,ClipboardCheck,RefreshCw,X} from 'lucide-react'
import {supabase} from '../lib/supabase.js'
import {maintenanceOverview,maintenanceReminders} from '../lib/maintenancePlan.js'
import {missingPtLeadAlerts} from '../lib/ptNotificationSafety.js'

const icons={coffee:Coffee,booking:CalendarDays,pt:UserRound,community:MessageCircle,system:Info,general:Bell,group:CalendarDays}
const priorityMeta={
 urgent:{label:'Hastar',tone:'urgent',icon:AlertTriangle},
 high:{label:'Viktig',tone:'high',icon:AlertTriangle},
 normal:{label:'Vanleg',tone:'normal',icon:Info},
 low:{label:'Info',tone:'low',icon:Info}
}
const hrefLabel=href=>href?.startsWith('coffee-review:')?'Sjå produktvurdering':href?.startsWith('pt-service-request:')?'Handsama PT-førespurnad':href?.startsWith('pt-request:')?'Opna PT-førespurnad':href?.startsWith('pt-checkin:')?'Opna statussjekk':href?.startsWith('pt-intake:')?'Opna PT-kartlegging':href?.startsWith('pt-client:')?'Opna PT-oppfølging':href?.startsWith('group-class:')?'Opna gruppetime':href?.startsWith('booking:')?'Opna booking':href==='admin-maintenance'?'Opna vedlikehald':href==='pt-studio'?'Opna PT-oppfølging':href==='pt-info'?'Opna PT-meldingar':href==='pt'?'Opna PT Studio':href==='mi-trening'?'Opna Mi trening':href==='booking'||href==='/timeplan'?'Opna timeplan':href==='kaffi'?'Opna kaffibar':'Opna'
const isExpired=item=>item.expires_at&&new Date(item.expires_at)<new Date()

export default function Notifications({onNavigate=()=>{},compact=false,hideWhenEmpty=false,context='oversikt',isAdmin=false,staff=false}){
 const [items,setItems]=useState([])
 const [maintenanceItems,setMaintenanceItems]=useState([])
 const [ptLeadItems,setPtLeadItems]=useState([])
 const [open,setOpen]=useState(false)
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const [tab,setTab]=useState('active')
 const [busy,setBusy]=useState('')
 const [showAll,setShowAll]=useState(false)
 const [hasMore,setHasMore]=useState(false)
 const [loadingMore,setLoadingMore]=useState(false)
 const loadingMoreRef=useRef(false)
 const loadSequence=useRef(0)
 const panelRef=useRef(null)
 const closeRef=useRef(null)
 const allItems=useMemo(()=>[...maintenanceItems,...ptLeadItems,...items],[maintenanceItems,ptLeadItems,items])
 const urgent=allItems.filter(x=>x.priority==='urgent'&&x.status==='open'&&!x.archived_at&&!isExpired(x)).length
 const actionItems=allItems.filter(x=>x.requires_action&&x.status==='open'&&!x.archived_at&&!isExpired(x))
 const ackItems=allItems.filter(x=>x.requires_ack&&!x.acknowledged_at&&x.status==='open'&&!x.archived_at&&!isExpired(x))
 const unread=allItems.filter(x=>!x.is_read&&!x.archived_at&&!isExpired(x)).length
 const visible=useMemo(()=>allItems.filter(x=>!x.archived_at&&!isExpired(x)).filter(x=>{
  if(tab==='action')return x.requires_action&&x.status==='open'
  if(tab==='ack')return x.requires_ack&&!x.acknowledged_at&&x.status==='open'
  if(tab==='info')return !x.requires_action&&!x.requires_ack&&x.status==='open'
  if(tab==='history')return x.status!=='open'||x.acknowledged_at
  return x.status==='open'&&(!x.requires_ack||!x.acknowledged_at)
 }).slice(0,showAll?allItems.length:30),[allItems,tab,showAll])
 async function load(append=false){
  if(append&&loadingMoreRef.current)return
  if(append){loadingMoreRef.current=true;setLoadingMore(true)}
  const requestId=++loadSequence.current
  const offset=append?items.length:0
  try{
   const {data:{user},error:authError}=await supabase.auth.getUser()
   if(authError)throw authError
   if(!user){if(requestId===loadSequence.current){setItems([]);setError('Logg inn på nytt for å sjå varslingane.')}return}
   const {data,error:e}=await supabase.from('notifications')
    .select('id,title,body,category,href,is_read,created_at,priority,requires_ack,requires_action,status,read_at,acknowledged_at,resolved_at,expires_at,archived_at')
    .eq('recipient_id',user.id).is('archived_at',null).order('created_at',{ascending:false}).range(offset,offset+99)
   if(e)throw e
   if(requestId!==loadSequence.current)return
   const rows=data||[]
   let ptLeadError=''
   // Critical safety net: derive an alert from *actual pending PT enquiries*
   // when a database notification is missing or was prematurely dismissed.
   // Only approved staff can read this source table under RLS.
   if(staff){
    const [{data:leads,error:leadError},{data:ptNotices,error:noticeError}]=await Promise.all([
     supabase.from('pt_service_requests')
      .select('id,service_title,created_at,status').in('status',['pending','reviewing']).order('created_at',{ascending:false}).limit(500),
     // Query all active PT notices directly: the main inbox is paginated and
     // may not contain an older PT lead among the most recent 100 entries.
     supabase.from('notifications').select('id,href,status,archived_at')
      .eq('recipient_id',user.id).eq('status','open').is('archived_at',null)
      .like('href','pt-service-request:%'),
    ])
    if(requestId!==loadSequence.current)return
    if(leadError){setPtLeadItems([]);ptLeadError='Kan ikkje kontrollera opne PT-førespurnader: '+leadError.message}
    else{
     setPtLeadItems(missingPtLeadAlerts(leads||[],noticeError?rows:ptNotices||[]))
     if(noticeError)ptLeadError='Kan ikkje kontrollera alle PT-varsla: '+noticeError.message
    }
   }else setPtLeadItems([])
   setHasMore(rows.length===100)
   setItems(current=>append?[...current,...rows.filter(row=>!current.some(existing=>existing.id===row.id))]:rows)
   setError(ptLeadError)
   if(isAdmin){
    const [schedule,receipts]=await Promise.all([
     supabase.from('garage_maintenance_schedule').select('started_at').eq('id',true).maybeSingle(),
     supabase.from('garage_maintenance_log').select('period,completed_at,needs_followup,resolved_at').order('completed_at',{ascending:false}).limit(500),
    ])
    if(requestId!==loadSequence.current)return
    setMaintenanceItems(!schedule.error&&!receipts.error&&schedule.data
      ?maintenanceReminders(maintenanceOverview(receipts.data||[],schedule.data.started_at)):[])
   }else setMaintenanceItems([])
  }catch(loadError){if(requestId===loadSequence.current)setError(loadError?.message||'Varslingane kunne ikkje hentast.')}
  finally{
   if(requestId===loadSequence.current)setLoading(false)
   if(append){loadingMoreRef.current=false;setLoadingMore(false)}
  }
 }
 useEffect(()=>{
  let live=true
  let channel=null
  // Compact feeds are read-only summaries; only the main inbox needs a live subscription.
  // Scope the subscription to the signed-in recipient to avoid refresh storms from other users' notices.
  async function start(){
   await load()
   if(compact||!live)return
   const {data:{user}}=await supabase.auth.getUser()
   if(!live||!user)return
   channel=supabase.channel('notification-inbox-'+user.id)
    .on('postgres_changes',{event:'*',schema:'public',table:'notifications',filter:'recipient_id=eq.'+user.id},()=>{if(live)load()})
    .subscribe()
  }
  start()
  // Realtime is the primary path; polling keeps inboxes correct after reconnects
  // and on clients where the realtime websocket is temporarily unavailable.
  const refreshTimer=window.setInterval(()=>{if(live)load()},60_000)
  const onMaintenanceUpdated=()=>{if(live&&isAdmin)load()}
  window.addEventListener('gg:maintenance-updated',onMaintenanceUpdated)
  return()=>{live=false;loadSequence.current+=1;if(channel)supabase.removeChannel(channel);window.clearInterval(refreshTimer);window.removeEventListener('gg:maintenance-updated',onMaintenanceUpdated)}
 },[context,compact,isAdmin,staff])
 useEffect(()=>{
  if(!open||compact)return
  const previousFocus=document.activeElement
  const previousOverflow=document.body.style.overflow
  document.body.style.overflow='hidden'
  closeRef.current?.focus()
  function onKeyDown(event){
   if(event.key==='Escape'){event.preventDefault();setOpen(false);return}
   if(event.key!=='Tab'||!panelRef.current)return
   const controls=[...panelRef.current.querySelectorAll('button:not(:disabled)')]
   if(!controls.length)return
   const first=controls[0],last=controls[controls.length-1]
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
  }
  document.addEventListener('keydown',onKeyDown)
  return()=>{
   document.removeEventListener('keydown',onKeyDown)
   document.body.style.overflow=previousOverflow
   if(previousFocus?.isConnected)previousFocus.focus()
  }
 },[open,compact])
 async function patch(id,values){
  setBusy(id);setError('')
  try{
   const {data:{user},error:authError}=await supabase.auth.getUser()
   if(authError||!user)throw authError||new Error('Logg inn på nytt før du endrar varslingar.')
   const {data,error:e}=await supabase.from('notifications').update(values).eq('id',id).eq('recipient_id',user.id).select('id')
   if(e)throw e
   if(!data?.length)throw new Error('Varslet vart ikkje oppdatert. Last inn på nytt og prøv igjen.')
   setItems(rows=>rows.map(x=>x.id===id?{...x,...values}:x))
   return true
  }catch(patchError){setError(patchError?.message||'Kunne ikkje oppdatere varslet.');return false}
  finally{setBusy('')}
 }
 async function markRead(item){if(item.is_read)return true;return patch(item.id,{is_read:true,read_at:new Date().toISOString()})}
 async function acknowledge(item){return patch(item.id,{is_read:true,read_at:new Date().toISOString(),acknowledged_at:new Date().toISOString()})}
 async function resolve(item){return patch(item.id,{is_read:true,read_at:new Date().toISOString(),status:'resolved',resolved_at:new Date().toISOString()})}
 async function archive(item){return patch(item.id,{archived_at:new Date().toISOString(),status:item.status==='open'?'dismissed':item.status})}
 async function openItem(item){
  if(item.virtualMaintenance||item.virtualPTLead){onNavigate(item);if(!compact)setOpen(false);return}
  // Ei manglande lesekvittering må aldri blokkera direkte opning av saka.
  if(!item.is_read)void markRead(item)
  onNavigate(item)
  if(!compact)setOpen(false)
 }
 const renderItem=item=>{
  const Root=compact?'button':'article'
  const ItemIcon=icons[item.category]||Bell
  const p=priorityMeta[item.priority]||priorityMeta.normal
  const PriorityIcon=p.icon
  const pending=item.status==='open'
  return <Root type={compact?'button':undefined} onClick={compact?()=>openItem(item):undefined} aria-label={compact?'Opna varsel: '+item.title:undefined} className={'notification-item-v2 priority-'+p.tone+(item.is_read?' read':'')} key={item.id}>
   <span className={'notification-item-icon-v2 '+p.tone}><ItemIcon size={17}/></span>
   <div className="notification-item-copy-v2">
    <div className="notification-item-title"><strong>{item.title}</strong>{compact&&<ArrowUpRight className="notification-tap-cue" size={16} aria-hidden="true"/>}{item.priority!=='normal'&&<span className={'notification-priority '+p.tone}><PriorityIcon size={11}/>{p.label}</span>}</div>
    <span>{item.body}</span>
    <div className="notification-meta-v2"><time>{new Date(item.created_at).toLocaleString('nn-NO',{dateStyle:'short',timeStyle:'short'})}</time>{item.requires_action&&pending&&<b className="notification-kind action">KREV HANDLING</b>}{item.requires_ack&&!item.acknowledged_at&&<b className="notification-kind ack">KVITTER LESING</b>}{item.status==='resolved'&&<b className="notification-kind done">LØYST</b>}</div>
    {!compact&&<div className="notification-actions-v2">
     {(item.href||item.requires_action)&&<button type="button" className="notification-open-action" disabled={busy===item.id} onClick={()=>openItem(item)}>{hrefLabel(item.href)} <ArrowUpRight size={13}/></button>}
     {!item.virtualMaintenance&&item.requires_ack&&!item.acknowledged_at&&<button type="button" className="notification-ack-action" disabled={busy===item.id} onClick={()=>acknowledge(item)}><ClipboardCheck size={13}/> Stadfest lest</button>}
     {!item.virtualMaintenance&&!item.virtualPTLead&&!item.href?.startsWith('pt-service-request:')&&item.requires_action&&pending&&<button type="button" className="notification-done-action" disabled={busy===item.id} onClick={()=>resolve(item)}><Check size={13}/> Marker løyst</button>}
     {!item.virtualMaintenance&&!item.requires_action&&!item.requires_ack&&pending&&<button type="button" className="notification-dismiss-action" disabled={busy===item.id} onClick={()=>archive(item)}><Archive size={13}/> Skjul</button>}
    </div>}
   </div>
   {!item.is_read&&<i className="notification-unread-dot" aria-label="Ulest"/>}
  </Root>
 }
 if(compact){
  const rows=allItems.filter(x=>!x.archived_at&&!isExpired(x)&&x.status==='open'&&(!x.requires_ack||!x.acknowledged_at)).filter(x=>context==='pt-studio'?x.category==='pt'||x.href?.startsWith('pt-'):context==='group'?x.category==='booking'||x.category==='group'||x.href?.startsWith('group-class:'):true).slice(0,4)
  if(!rows.length&&hideWhenEmpty&&!loading&&!error)return null
  if(!rows.length)return <section className="notification-context"><div className="notification-context-head"><Bell size={16}/><strong>{context==='pt-studio'?'PT-varslingar':context==='group'?'Gruppetime-varslingar':'Varslingar'}</strong><span>0</span></div><p>{loading?'Hentar varsel …':error?'Varslingane er ikkje tilgjengelege akkurat no.':'Ingen oppfølging ventar her.'}</p></section>
  return <section className="notification-context"><div className="notification-context-head"><Bell size={16}/><strong>{context==='pt-studio'?'PT-varslingar':context==='group'?'Gruppetime-varslingar':'Varslingar'}</strong><span>{rows.length}</span></div>{rows.map(renderItem)}</section>
 }
 return <div className="notification-wrap">
  <button type="button" className="icon-button notification-trigger" aria-label={urgent?urgent+' hastar-varsel':unread?unread+' uleste varsel':'Varslingssenter'} aria-expanded={open} onClick={()=>setOpen(v=>!v)}>
   <Bell size={17}/>{(unread+actionItems.length+ackItems.length)>0&&<span className={'notification-badge '+(urgent?'urgent':'')}>{Math.min(99,Math.max(unread,actionItems.length+ackItems.length))}</span>}
  </button>
  {open&&createPortal(<><button type="button" className="notification-dismiss" aria-label="Lukk varslingssenter" onClick={()=>setOpen(false)}/><section ref={panelRef} className="notification-panel notification-panel-v2" role="dialog" aria-modal="true" aria-labelledby="gg-notification-title">
   <header><div><span className="section-kicker">GARASJEGYM · INNBOKS</span><h3 id="gg-notification-title">Varslingssenter</h3><small>{urgent>0?`${urgent} hastar · `:''}{actionItems.length} krev handling · {ackItems.length} ventar på kvittering</small></div><button type="button" ref={closeRef} className="notification-close" aria-label="Lukk varslingssenter" onClick={()=>setOpen(false)}><X size={17}/><span>Lukk</span></button></header>
   {error&&<div className="auth-error">{error}</div>}
   <nav className="notification-tabs" aria-label="Filtrer varsel">{[['active','Aktive'],['action','Handling'],['ack','Kvittering'],['info','Info'],['history','Historikk']].map(([id,label])=><button type="button" key={id} className={tab===id?'selected':''} aria-pressed={tab===id} onClick={()=>setTab(id)}>{label}{id==='action'&&actionItems.length>0?' '+actionItems.length:id==='ack'&&ackItems.length>0?' '+ackItems.length:''}</button>)}</nav>
   <div className="notification-list">{loading?<div className="empty-state">Hentar varsel …</div>:visible.length?visible.map(renderItem):<div className="empty-state"><CheckCheck size={22}/><strong>Alt er ryddig</strong><span>Ingen varsel i denne kategorien.</span></div>}</div>
   <footer><span>{visible.length} viste · {unread} uleste</span><button type="button" onClick={()=>{setShowAll(v=>!v);if(!showAll)setTab('active')}}>{showAll?'Vis færre':'Vis fleire'}</button>{showAll&&hasMore&&<button type="button" disabled={loadingMore} onClick={()=>load(true)}>{loadingMore?'Hentar …':'Hent eldre varsel'}</button>}<button type="button" onClick={()=>load(false)}><RefreshCw size={12}/> Oppdater</button></footer>
  </section></>,document.body)}
 </div>
}
