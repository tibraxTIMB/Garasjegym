import {useEffect,useState} from 'react'
import {Bell,CheckCheck,Coffee,CalendarDays,MessageCircle,UserRound,Info,Check} from 'lucide-react'
import {supabase} from '../lib/supabase.js'

const icons={coffee:Coffee,booking:CalendarDays,pt:UserRound,community:MessageCircle,system:Info,general:Bell}
export default function Notifications({onNavigate}){
 const [items,setItems]=useState([])
 const [open,setOpen]=useState(false)
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const unread=items.filter(item=>!item.is_read).length
 async function load(){
  const {data:{user}}=await supabase.auth.getUser()
  if(!user)return
  const {data,error:e}=await supabase.from('notifications').select('id,title,body,category,href,is_read,created_at').eq('recipient_id',user.id).order('created_at',{ascending:false}).limit(50)
  if(e)setError(e.message);else setItems(data||[])
  setLoading(false)
 }
 useEffect(()=>{
  load()
  const channel=supabase.channel('notification-inbox').on('postgres_changes',{event:'*',schema:'public',table:'notifications'},()=>load()).subscribe()
  return()=>{supabase.removeChannel(channel)}
 },[])
 async function markRead(id){
  const {error:e}=await supabase.from('notifications').update({is_read:true}).eq('id',id)
  if(e){setError(e.message);return}
  setItems(rows=>rows.map(row=>row.id===id?{...row,is_read:true}:row))
 }
 async function markAll(){
  const {data:{user}}=await supabase.auth.getUser()
  if(!user)return
  const {error:e}=await supabase.from('notifications').update({is_read:true}).eq('recipient_id',user.id).eq('is_read',false)
  if(e){setError(e.message);return}
  setItems(rows=>rows.map(row=>({...row,is_read:true})))
 }
 function openItem(item){
  if(!item.is_read)markRead(item.id)
  if(item.href&&onNavigate)onNavigate(item)
  setOpen(false)
 }
 return <div className="notification-wrap">
  <button type="button" className="icon-button notification-trigger" aria-label={unread?unread+' uleste varsel':'Varslingssenter'} aria-expanded={open} onClick={()=>setOpen(value=>!value)}>
   <Bell size={17}/>{unread>0&&<span className="notification-badge">{unread>99?'99+':unread}</span>}
  </button>
  {open&&<><button className="notification-dismiss" aria-label="Lukk varslingssenter" onClick={()=>setOpen(false)}/><section className="notification-panel">
   <header><div><span className="section-kicker">GARASJEGYM · INNBOKS</span><h3>Varslingar</h3></div><button type="button" className="notification-close" onClick={()=>setOpen(false)}>Lukk</button></header>
   {error&&<div className="auth-error">{error}</div>}
   {unread>0&&<button type="button" className="notification-mark-all" onClick={markAll}><CheckCheck size={14}/> Merk alle som lesne</button>}
   <div className="notification-list">{loading?<div className="empty-state">Hentar varsel …</div>:items.length?items.map(item=>{const ItemIcon=icons[item.category]||Bell;return <button type="button" key={item.id} className={'notification-item '+(!item.is_read?'unread':'')} onClick={()=>openItem(item)}><span className="notification-item-icon"><ItemIcon size={17}/></span><span className="notification-item-copy"><strong>{item.title}</strong><span>{item.body}</span><time>{new Date(item.created_at).toLocaleString('nn-NO',{dateStyle:'short',timeStyle:'short'})}</time></span>{!item.is_read&&<i aria-label="Ulest"/>}</button>}):<div className="empty-state">Du har ingen varsel enno.</div>}</div>
   <footer>{items.length} siste varsel · {unread} uleste</footer>
  </section></>}
 </div>
}
