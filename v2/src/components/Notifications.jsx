import {useEffect,useMemo,useState} from 'react'
import {Bell,CheckCheck,Coffee,CalendarDays,MessageCircle,UserRound,Info,Check,AlertTriangle,Clock3,Archive,ArrowUpRight,ClipboardCheck,RefreshCw,X} from 'lucide-react'
import {supabase} from '../lib/supabase.js'

const icons={coffee:Coffee,booking:CalendarDays,pt:UserRound,community:MessageCircle,system:Info,general:Bell,group:CalendarDays}
const priorityMeta={
 urgent:{label:'Hastar',tone:'urgent',icon:AlertTriangle},
 high:{label:'Viktig',tone:'high',icon:AlertTriangle},
 normal:{label:'Vanleg',tone:'normal',icon:Info},
 low:{label:'Info',tone:'low',icon:Info}
}
const hrefLabel=href=>href?.startsWith('pt-request:')?'Opna PT-førespurnad':href?.startsWith('pt-client:')?'Opna kunde i PT-studio':href?.startsWith('group-class:')?'Opna gruppetime':href?.startsWith('booking:')?'Opna booking':href==='pt-studio'?'Opna PT-studio':href==='booking'?'Opna timeplan':href==='kaffi'?'Opna kaffibar':'Opna'
const isExpired=item=>item.expires_at&&new Date(item.expires_at)<new Date()
function ageDays(value){return (Date.now()-new Date(value).getTime())/86400000}

export default function Notifications({onNavigate=()=>{},compact=false,context='oversikt'}){
 const [items,setItems]=useState([])
 const [open,setOpen]=useState(false)
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const [tab,setTab]=useState('active')
 const [busy,setBusy]=useState('')
 const [showAll,setShowAll]=useState(false)
 const urgent=items.filter(x=>x.priority==='urgent'&&x.status==='open'&&!x.archived_at).length
 const actionItems=items.filter(x=>x.requires_action&&x.status==='open'&&!x.archived_at&&!isExpired(x))
 const ackItems=items.filter(x=>x.requires_ack&&!x.acknowledged_at&&x.status==='open'&&!x.archived_at&&!isExpired(x))
 const unread=items.filter(x=>!x.is_read&&!x.archived_at&&!isExpired(x)).length
 const visible=useMemo(()=>items.filter(x=>!x.archived_at&&!isExpired(x)).filter(x=>{
  if(tab==='action')return x.requires_action&&x.status==='open'
  if(tab==='ack')return x.requires_ack&&!x.acknowledged_at&&x.status==='open'
  if(tab==='info')return !x.requires_action&&!x.requires_ack&&x.status==='open'
  if(tab==='history')return x.status!=='open'||x.acknowledged_at
  return x.status==='open'&&(!x.requires_ack||!x.acknowledged_at)
 }).slice(0,showAll?100:30),[items,tab,showAll])
 async function load(){
  const {data:{user}}=await supabase.auth.getUser()
  if(!user){setLoading(false);return}
  const {data,error:e}=await supabase.from('notifications')
   .select('id,title,body,category,href,is_read,created_at,priority,requires_ack,requires_action,status,read_at,acknowledged_at,resolved_at,expires_at,archived_at')
   .eq('recipient_id',user.id).is('archived_at',null).order('created_at',{ascending:false}).limit(100)
  if(e)setError(e.message);else{
   const rows=data||[]
   setItems(rows)
   // Automatic housekeeping: expired notices, old read-only information and completed cases leave the active inbox.
   const archiveIds=rows.filter(x=>isExpired(x)||(!x.requires_action&&!x.requires_ack&&ageDays(x.created_at)>30)||(x.requires_ack&&x.acknowledged_at&&ageDays(x.acknowledged_at)>14)||((x.status==='resolved'||x.status==='dismissed')&&ageDays(x.resolved_at||x.created_at)>30)).map(x=>x.id)
   if(archiveIds.length){
    await supabase.from('notifications').update({archived_at:new Date().toISOString()}).in('id',archiveIds).eq('recipient_id',user.id)
    setItems(current=>current.filter(x=>!archiveIds.includes(x.id)))
   }
  }
  setLoading(false)
 }
 useEffect(()=>{
  load()
  const channel=supabase.channel('notification-inbox-'+context).on('postgres_changes',{event:'*',schema:'public',table:'notifications'},()=>load()).subscribe()
  return()=>{supabase.removeChannel(channel)}
 },[context])
 async function patch(id,values){
  setBusy(id);setError('')
  const {data:{user}}=await supabase.auth.getUser()
  const {error:e}=await supabase.from('notifications').update(values).eq('id',id).eq('recipient_id',user.id).select('id')
  if(e)setError(e.message)
  else setItems(rows=>rows.map(x=>x.id===id?{...x,...values}:x))
  setBusy('')
  return !e
 }
 async function markRead(item){if(item.is_read)return true;return patch(item.id,{is_read:true,read_at:new Date().toISOString()})}
 async function acknowledge(item){return patch(item.id,{is_read:true,read_at:new Date().toISOString(),acknowledged_at:new Date().toISOString()})}
 async function resolve(item){return patch(item.id,{is_read:true,read_at:new Date().toISOString(),status:'resolved',resolved_at:new Date().toISOString()})}
 async function archive(item){return patch(item.id,{archived_at:new Date().toISOString(),status:item.status==='open'?'dismissed':item.status})}
 async function openItem(item){
  if(!item.is_read){await markRead(item)}
  onNavigate(item)
  if(!compact)setOpen(false)
 }
 const renderItem=item=>{
  const ItemIcon=icons[item.category]||Bell
  const p=priorityMeta[item.priority]||priorityMeta.normal
  const PriorityIcon=p.icon
  const pending=item.status==='open'
  return <article className={'notification-item-v2 priority-'+p.tone+(item.is_read?' read':'')} key={item.id}>
   <span className={'notification-item-icon-v2 '+p.tone}><ItemIcon size={17}/></span>
   <div className="notification-item-copy-v2">
    <div className="notification-item-title"><strong>{item.title}</strong>{item.priority!=='normal'&&<span className={'notification-priority '+p.tone}><PriorityIcon size={11}/>{p.label}</span>}</div>
    <span>{item.body}</span>
    <div className="notification-meta-v2"><time>{new Date(item.created_at).toLocaleString('nn-NO',{dateStyle:'short',timeStyle:'short'})}</time>{item.requires_action&&pending&&<b className="notification-kind action">KREV HANDLING</b>}{item.requires_ack&&!item.acknowledged_at&&<b className="notification-kind ack">KVITTER LESING</b>}{item.status==='resolved'&&<b className="notification-kind done">LØYST</b>}</div>
    <div className="notification-actions-v2">
     {(item.href||item.requires_action)&&<button type="button" className="notification-open-action" disabled={busy===item.id} onClick={()=>openItem(item)}>{hrefLabel(item.href)} <ArrowUpRight size={13}/></button>}
     {item.requires_ack&&!item.acknowledged_at&&<button type="button" className="notification-ack-action" disabled={busy===item.id} onClick={()=>acknowledge(item)}><ClipboardCheck size={13}/> Stadfest lest</button>}
     {item.requires_action&&pending&&<button type="button" className="notification-done-action" disabled={busy===item.id} onClick={()=>resolve(item)}><Check size={13}/> Marker løyst</button>}
     {!item.requires_action&&!item.requires_ack&&pending&&<button type="button" className="notification-dismiss-action" disabled={busy===item.id} onClick={()=>archive(item)}><Archive size={13}/> Skjul</button>}
    </div>
   </div>
   {!item.is_read&&<i className="notification-unread-dot" aria-label="Ulest"/>}
  </article>
 }
 if(compact){
  const rows=items.filter(x=>!x.archived_at&&!isExpired(x)&&x.status==='open'&&(!x.requires_ack||!x.acknowledged_at)).filter(x=>context==='pt-studio'?x.category==='pt'||x.href?.startsWith('pt-'):context==='group'?x.category==='booking'||x.category==='group'||x.href?.startsWith('group-class:'):true).slice(0,4)
  if(!rows.length)return <section className="notification-context"><div className="notification-context-head"><Bell size={16}/><strong>{context==='pt-studio'?'PT-varslingar':context==='group'?'Gruppetime-varslingar':'Varslingar'}</strong><span>0</span></div><p>Ingen oppfølging ventar her.</p></section>
  return <section className="notification-context"><div className="notification-context-head"><Bell size={16}/><strong>{context==='pt-studio'?'PT-varslingar':context==='group'?'Gruppetime-varslingar':'Varslingar'}</strong><span>{rows.length}</span></div>{rows.map(renderItem)}</section>
 }
 return <div className="notification-wrap">
  <button type="button" className="icon-button notification-trigger" aria-label={urgent?urgent+' hastar-varsel':unread?unread+' uleste varsel':'Varslingssenter'} aria-expanded={open} onClick={()=>setOpen(v=>!v)}>
   <Bell size={17}/>{(unread+actionItems.length+ackItems.length)>0&&<span className={'notification-badge '+(urgent?'urgent':'')}>{Math.min(99,Math.max(unread,actionItems.length+ackItems.length))}</span>}
  </button>
  {open&&<><button className="notification-dismiss" aria-label="Lukk varslingssenter" onClick={()=>setOpen(false)}/><section className="notification-panel notification-panel-v2">
   <header><div><span className="section-kicker">GARASJEGYM · INNBOKS</span><h3>Varslingssenter</h3><small>{actionItems.length} krev handling · {ackItems.length} ventar på kvittering</small></div><button type="button" className="notification-close" onClick={()=>setOpen(false)}><X size={15}/> Lukk</button></header>
   {error&&<div className="auth-error">{error}</div>}
   <div className="notification-summary">{urgent>0&&<span className="urgent"><AlertTriangle size={13}/>{urgent} hastar</span>}<span><ClipboardCheck size={13}/>{ackItems.length} må stadfestast</span><span><Clock3 size={13}/>{actionItems.length} opne saker</span></div>
   <nav className="notification-tabs">{[['active','Aktive'],['action','Handling'],['ack','Kvittering'],['info','Info'],['history','Historikk']].map(([id,label])=><button type="button" key={id} className={tab===id?'selected':''} onClick={()=>setTab(id)}>{label}{id==='action'&&actionItems.length>0?' '+actionItems.length:id==='ack'&&ackItems.length>0?' '+ackItems.length:''}</button>)}</nav>
   <div className="notification-list">{loading?<div className="empty-state">Hentar varsel …</div>:visible.length?visible.map(renderItem):<div className="empty-state"><CheckCheck size={22}/><strong>Alt er ryddig</strong><span>Ingen varsel i denne kategorien.</span></div>}</div>
   <footer><span>{visible.length} viste · {unread} uleste</span><button type="button" onClick={()=>{setShowAll(v=>!v);if(!showAll)setTab('active')}}>{showAll?'Vis færre':'Vis fleire'}</button><button type="button" onClick={load}><RefreshCw size={12}/> Oppdater</button></footer>
  </section></>}
 </div>
}
