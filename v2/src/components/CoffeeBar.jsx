import {useEffect,useMemo,useState} from 'react'
import {CheckCircle2,Coffee,LoaderCircle,Minus,Plus,ShoppingBag,Star,MessageSquareText,Bell,Clock3,PackageCheck,Store,BarChart3,ClipboardList,Eye,EyeOff,Archive,RefreshCw,Edit3,BookOpen,ArrowRight,Trash2} from 'lucide-react'
import {supabase} from '../lib/supabase.js'
import {isStaff} from '../lib/auth.js'
import {addCoffeeCartItem,availableCoffeeCartItems,changeCoffeeCartItem,coffeeCartTotal} from '../lib/coffeeCart.js'
import GarageOwnerBadge from './GarageOwnerBadge.jsx'
import './coffee-order-flow.css'

const statusMeta={
 new:{label:'Motteken',className:'new',next:'confirmed',nextLabel:'Stadfest'},
 confirmed:{label:'Stadfesta',className:'confirmed',previous:'new',next:'preparing',nextLabel:'Start tilbereding'},
 preparing:{label:'Under tilbereding',className:'preparing',previous:'confirmed',next:'ready',nextLabel:'Klar til henting'},
 ready:{label:'Klar til henting',className:'ready',previous:'preparing',next:'collected',nextLabel:'Marker utlevert'},
 collected:{label:'Utlevert',className:'collected',previous:'ready'},
 cancelled:{label:'Avbestilt',className:'cancelled'}
}
const formatMoney=value=>Number(value||0).toLocaleString('nn-NO',{minimumFractionDigits:0,maximumFractionDigits:2})+' kr'
const formatDate=value=>new Date(value).toLocaleString('nn-NO',{dateStyle:'short',timeStyle:'short'})
const parseOptionGroups=value=>(value||'').split('\n').map(line=>line.trim()).filter(Boolean).map(line=>{
 const [name,...rest]=line.split(':')
 return {name:name.trim().replace(/!$/,'').trim(),choices:rest.join(':').split(',').map(x=>x.trim()).filter(Boolean),required:name.trim().endsWith('!')}
}).filter(group=>group.name&&group.choices.length)
const optionText=groups=>(groups||[]).map(group=>(group.name||'Val')+(group.required?'!':'')+': '+(group.choices||[]).join(', ')).join('\n')
const optionSummary=options=>(options||[]).map(item=>item.group+': '+item.choice).join(' · ')
const coffeePrice=value=>Number(value||0)===0?'Gratis':formatMoney(value)
const coffeeProgress=['new','confirmed','preparing','ready','collected']
const cartDraftKey=userId=>'garasjegym:coffee-cart:'+userId

export default function CoffeeBar({profile,ordersOnly=false,focusReviewId=null,onFocusReviewConsumed,onHelp=()=>{}}){
 const staff=isStaff(profile)
 const [products,setProducts]=useState([]),[orders,setOrders]=useState([]),[cart,setCart]=useState(()=>{try{const saved=JSON.parse(sessionStorage.getItem(cartDraftKey(profile.id))||'[]');return Array.isArray(saved)?saved.filter(row=>row&&typeof row.key==='string'&&typeof row.product_id==='string'&&Number.isInteger(row.quantity)&&Array.isArray(row.options)):[]}catch{return[]}})
 const [settings,setSettings]=useState({is_open:true,closed_message:'Kaffebaren er stengd akkurat no.'})
 const [reviews,setReviews]=useState([]),[reviewNotifications,setReviewNotifications]=useState([])
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const [activeTab,setActiveTab]=useState(staff?'orders':'menu'),[orderView,setOrderView]=useState(staff?'active':'all')
 const [categoryFilter,setCategoryFilter]=useState('Alle'),[reviewFilter,setReviewFilter]=useState('unread'),[reviewProductFilter,setReviewProductFilter]=useState('Alle'),[reviewRatingFilter,setReviewRatingFilter]=useState('Alle'),[selectedReview,setSelectedReview]=useState(null)
 const [note,setNote]=useState('')
 const [optionSelections,setOptionSelections]=useState({})
 const [newName,setNewName]=useState(''),[newPrice,setNewPrice]=useState(''),[newDesc,setNewDesc]=useState(''),[newCategory,setNewCategory]=useState('Kaffi'),[newOptions,setNewOptions]=useState(''),[newPrepMinutes,setNewPrepMinutes]=useState(''),[newImageUrl,setNewImageUrl]=useState('')
 const [editingProduct,setEditingProduct]=useState(null),[staffComments,setStaffComments]=useState({})
 const [reviewDrafts,setReviewDrafts]=useState({})
 const [orderRequestId,setOrderRequestId]=useState(null)

 async function load(silent=false){
  if(!silent)setLoading(true)
  setError('')
  try{
   const {data:{user},error:userError}=await supabase.auth.getUser()
   if(userError||!user)throw userError||new Error('Logg inn på nytt.')
   const orderQuery=staff
    ?supabase.from('coffee_orders').select('id,member_id,status,total,note,staff_comment,archived_at,created_at,confirmed_at,preparing_at,ready_at,collected_at,coffee_order_items(id,product_id,product_name,unit_price,quantity,options,review_skipped_at),profiles:profiles!coffee_orders_member_id_fkey(display_name)').order('created_at',{ascending:false}).limit(300)
    :supabase.from('coffee_orders').select('id,member_id,status,total,note,created_at,confirmed_at,preparing_at,ready_at,collected_at,coffee_order_items(id,product_id,product_name,unit_price,quantity,options,review_skipped_at)').eq('member_id',user.id).order('created_at',{ascending:false}).limit(100)
   const [p,o,stats,r,s,n]=await Promise.all([
    staff&&!ordersOnly
     ?supabase.from('coffee_products').select('id,name,description,price,is_active,sort_order,category,option_groups,prep_minutes,image_url').order('sort_order').order('name')
     :supabase.from('coffee_products').select('id,name,description,price,is_active,sort_order,category,option_groups,prep_minutes,image_url').eq('is_active',true).order('sort_order').order('name'),
    orderQuery,
    supabase.rpc('get_coffee_stats'),
    supabase.from('coffee_product_reviews').select('id,order_item_id,order_id,member_id,product_id,product_name,rating,comment,created_at,profiles:profiles!coffee_product_reviews_member_id_fkey(display_name)').order('created_at',{ascending:false}).limit(300),
    supabase.from('coffee_settings').select('is_open,closed_message').eq('id',true).maybeSingle(),
    staff?supabase.from('notifications').select('id,href,is_read,created_at').eq('recipient_id',user.id).like('href','coffee-review:%').is('archived_at',null):Promise.resolve({data:[],error:null})
   ])
   if(p.error)throw p.error
   setProducts(p.data||[])
   if(o.error)throw o.error
   const reviewRows=r.error?[]:(r.data||[])
   setReviews(reviewRows)
   const byItem=new Map(reviewRows.map(review=>[review.order_item_id,review]))
   const allOrders=(o.data||[]).map(order=>({...order,coffee_order_items:(order.coffee_order_items||[]).map(item=>({...item,review:byItem.get(item.id)||null}))}))
   setOrders(allOrders.filter(row=>orderView==='archive'?!!row.archived_at:!row.archived_at&&(orderView==='all'?true:orderView==='completed'?['collected','cancelled'].includes(row.status):!['collected','cancelled'].includes(row.status))))
   if(!stats.error&&stats.data)setCoffeeStats(stats.data)
   if(!s.error&&s.data)setSettings(s.data)
   if(staff&&!n.error)setReviewNotifications(n.data||[])
   setLoading(false)
  }catch(e){setError(e.message||'Kunne ikkje henta kaffibaren.');setLoading(false)}
 }
 const [coffeeStats,setCoffeeStats]=useState({bought:0,made:0,sold:0,revenue:0,popular:[]})

 useEffect(()=>{
  let live=true
  load()
  const timer=setInterval(()=>{if(live)load(true)},20000)
  const channel=supabase.channel('coffee-bar-live-'+(profile?.id||profile?.role||'user'))
   .on('postgres_changes',{event:'*',schema:'public',table:'coffee_orders'},()=>{if(live)load(true)})
   .on('postgres_changes',{event:'*',schema:'public',table:'coffee_order_items'},()=>{if(live)load(true)})
   .on('postgres_changes',{event:'*',schema:'public',table:'coffee_products'},()=>{if(live)load(true)})
   .on('postgres_changes',{event:'*',schema:'public',table:'coffee_product_reviews'},()=>{if(live)load(true)})
   .subscribe()
  return()=>{live=false;clearInterval(timer);supabase.removeChannel(channel)}
 },[orderView,profile?.id,profile?.role,ordersOnly])

 useEffect(()=>{
  if(!focusReviewId||!staff)return
  setActiveTab('reviews')
  const review=reviews.find(row=>row.id===focusReviewId)
  if(review){setSelectedReview(review);onFocusReviewConsumed?.()}
 },[focusReviewId,staff,reviews])

 const categories=useMemo(()=>['Alle',...new Set(products.map(p=>p.category||'Kaffi').filter(Boolean))],[products])
 const visibleProducts=products.filter(p=>p.is_active||staff).filter(p=>categoryFilter==='Alle'||(p.category||'Kaffi')===categoryFilter)
 const cartItems=useMemo(()=>availableCoffeeCartItems(cart,products),[cart,products])
 const cartQuantity=cartItems.reduce((sum,item)=>sum+item.quantity,0)
 const total=coffeeCartTotal(cartItems,products)
 const unavailableCartCount=cart.length-cartItems.length
 const averageRating=reviews.length?reviews.reduce((sum,review)=>sum+Number(review.rating),0)/reviews.length:0
 const unreadReviews=reviews.filter(review=>{const noticeRow=reviewNotifications.find(item=>item.href==='coffee-review:'+review.id);return noticeRow?!noticeRow.is_read:true}).length

 useEffect(()=>{try{sessionStorage.setItem(cartDraftKey(profile.id),JSON.stringify(cart))}catch{}},[cart,profile.id])
 function addToCart(product){
  setError('');setNotice('')
  try{const next=addCoffeeCartItem(cart,product,optionSelections[product.id]||{});setCart(next);setOrderRequestId(null);setNotice(product.name+' er lagt i handlekorga.')}
  catch(e){setError(e.message||'Kunne ikkje leggja til drikka.')}
 }
 function changeCartQuantity(key,delta){setCart(current=>changeCoffeeCartItem(current,key,delta));setOrderRequestId(null)}
 function setOption(productId,group,choice){setOptionSelections(current=>({...current,[productId]:{...(current[productId]||{}),[group]:choice}}))}
 function resetProductForm(){setNewName('');setNewPrice('');setNewDesc('');setNewCategory('Kaffi');setNewOptions('');setNewPrepMinutes('');setNewImageUrl('');setEditingProduct(null)}
 async function order(){
  if(busy==='order'||!cartItems.length)return
  setBusy('order');setError('');setNotice('')
  try{
   const requestId=orderRequestId||crypto.randomUUID()
   if(!orderRequestId)setOrderRequestId(requestId)
   const payload=cartItems.map(({product_id,quantity,options})=>({product_id,quantity,options:options.filter(x=>x.choice)}))
   const pNote=note.trim()
   const {data,error:e}=await supabase.rpc('place_coffee_order_v2',{p_items:payload,p_note:pNote,p_request_id:requestId})
   if(e)throw e
   setCart([]);setNote('');setOrderRequestId(null);setActiveTab('orders');setNotice('Bestillinga er sendt til kaffibaren.');await load(true)
  }catch(e){setError(e.message||'Kunne ikkje senda bestillinga.')}
  finally{setBusy('')}
 }
 async function addProduct(event){
  event.preventDefault()
  if(busy==='product')return
  setBusy('product');setError('');setNotice('')
  try{
   const values={name:newName.trim(),price:Number(newPrice),description:newDesc.trim(),category:newCategory.trim()||'Kaffi',option_groups:parseOptionGroups(newOptions),prep_minutes:newPrepMinutes?Number(newPrepMinutes):null,image_url:newImageUrl.trim()||null}
   if(values.prep_minutes!==null&&(values.prep_minutes<1||values.prep_minutes>120))throw new Error('Førebuingstid må vera mellom 1 og 120 minutt.')
   const result=editingProduct?await supabase.from('coffee_products').update(values).eq('id',editingProduct.id):await supabase.from('coffee_products').insert(values)
   if(result.error)throw result.error
   resetProductForm();setNotice(editingProduct?'Produktet er oppdatert.':'Produktet er lagt til.');await load(true)
  }catch(e){setError(e.message||'Kunne ikkje lagra produktet.')}
  finally{setBusy('')}
 }
 function editProduct(product){
  setEditingProduct(product);setNewName(product.name||'');setNewPrice(String(product.price??''));setNewDesc(product.description||'')
  setNewCategory(product.category||'Kaffi');setNewOptions(optionText(product.option_groups));setNewPrepMinutes(product.prep_minutes?String(product.prep_minutes):'');setNewImageUrl(product.image_url||'')
 }
 async function toggleProduct(product){
  setBusy('product-'+product.id);setError('');setNotice('')
  try{const {error:e}=await supabase.from('coffee_products').update({is_active:!product.is_active}).eq('id',product.id);if(e)throw e
   setProducts(rows=>rows.map(row=>row.id===product.id?{...row,is_active:!product.is_active}:row));setNotice(product.is_active?'Produktet er sett som utseld / skjult.':'Produktet er tilgjengeleg i menyen.')
  }catch(e){setError(e.message||'Kunne ikkje endra produktstatus.')}finally{setBusy('')}
 }
 async function updateStatus(orderRow,status){
  setBusy(orderRow.id);setError('');setNotice('')
  try{
   const now=new Date().toISOString()
   const timestamps={new:{confirmed_at:null,preparing_at:null,ready_at:null,collected_at:null},confirmed:{confirmed_at:now,preparing_at:null,ready_at:null,collected_at:null},preparing:{preparing_at:now,ready_at:null,collected_at:null},ready:{ready_at:now,collected_at:null},collected:{collected_at:now}}
   const {error:e}=await supabase.from('coffee_orders').update({status,...(timestamps[status]||{}),updated_at:now}).eq('id',orderRow.id)
   if(e)throw e
   setNotice('Ordrestatus oppdatert.');await load(true)
  }catch(e){setError(e.message||'Kunne ikkje oppdatera status.')}finally{setBusy('')}
 }
 async function cancelOwnOrder(orderRow){
  if(!['new','confirmed'].includes(orderRow.status)||!window.confirm('Vil du avbestilla kaffien før tilbereding?'))return
  setBusy('cancel-'+orderRow.id);setError('');setNotice('')
  try{
   const {data,error:e}=await supabase.from('coffee_orders').update({status:'cancelled'}).eq('id',orderRow.id).eq('member_id',profile.id).in('status',['new','confirmed']).select('id')
   if(e)throw e
   if(!data?.length)throw new Error('Ordren kan ha gått vidare til tilbereding. Oppdater status og ta kontakt med kaffibaren.')
   setNotice('Bestillinga er avbestilt.');await load(true)
  }catch(e){setError(e.message||'Kunne ikkje avbestilla ordren.')}finally{setBusy('')}
 }
 async function saveStaffComment(orderRow){
  setBusy('comment-'+orderRow.id);setError('')
  try{const {error:e}=await supabase.from('coffee_orders').update({staff_comment:(staffComments[orderRow.id]??orderRow.staff_comment??'').trim()}).eq('id',orderRow.id);if(e)throw e;setNotice('Kommentaren er lagra.');await load(true)}
  catch(e){setError(e.message||'Kunne ikkje lagra kommentaren.')}finally{setBusy('')}
 }
 async function archiveOrder(orderRow){
  setBusy('archive-'+orderRow.id);setError('')
  try{const {error:e}=await supabase.from('coffee_orders').update({archived_at:orderRow.archived_at?null:new Date().toISOString()}).eq('id',orderRow.id);if(e)throw e;setNotice(orderRow.archived_at?'Bestillinga er gjenoppretta.':'Bestillinga er arkivert.');await load(true)}
  catch(e){setError(e.message||'Kunne ikkje arkivera bestillinga.')}finally{setBusy('')}
 }
 async function skipReview(item){
  setBusy('skip-'+item.id);setError('')
  try{const {data,error:e}=await supabase.rpc('skip_coffee_product_review',{p_order_item_id:item.id});if(e)throw e;if(!data)throw new Error('Vurderinga kunne ikkje hoppast over.');setOrders(rows=>rows.map(order=>({...order,coffee_order_items:(order.coffee_order_items||[]).map(row=>row.id===item.id?{...row,review_skipped_at:new Date().toISOString()}:row)})))}
  catch(e){setError(e.message||'Kunne ikkje hoppa over vurderinga.')}finally{setBusy('')}
 }
 async function submitReview(item){
  const draft=reviewDrafts[item.id]||{rating:5,comment:''}
  setBusy('review-'+item.id);setError('');setNotice('')
  try{const {error:e}=await supabase.rpc('submit_coffee_product_review',{p_order_item_id:item.id,p_rating:draft.rating,p_comment:draft.comment||''});if(e)throw e
   setNotice('Takk for tilbakemeldinga!');setReviewDrafts(current=>{const next={...current};delete next[item.id];return next});await load(true)
  }catch(e){setError(e.message||'Kunne ikkje senda vurderinga.')}finally{setBusy('')}
 }
 async function markReviewRead(review){
  const {data:{user}}=await supabase.auth.getUser()
  const row=reviewNotifications.find(item=>item.href==='coffee-review:'+review.id)
  if(!row||row.is_read){setSelectedReview(review);return}
  setBusy('read-'+review.id)
  const {error:e}=await supabase.from('notifications').update({is_read:true,read_at:new Date().toISOString()}).eq('id',row.id).eq('recipient_id',user.id)
  if(e)setError(e.message);else setReviewNotifications(items=>items.map(item=>item.id===row.id?{...item,is_read:true}:item))
  setSelectedReview(review);setBusy('')
 }
 async function toggleCoffeeOpen(){
  setBusy('opening');setError('')
  try{const {data:{user}}=await supabase.auth.getUser();const {error:e}=await supabase.from('coffee_settings').update({is_open:!settings.is_open,updated_at:new Date().toISOString(),updated_by:user.id}).eq('id',true);if(e)throw e;setSettings(v=>({...v,is_open:!v.is_open}));setNotice(!settings.is_open?'Kaffebaren er opna.':'Kaffebaren er stengd.')}
  catch(e){setError(e.message||'Kunne ikkje endra opningstilstanden.')}finally{setBusy('')}
 }
 async function updateRatingSkip(){}

 const visibleReviews=reviews.filter(review=>
  (reviewFilter==='all'||(reviewFilter==='unread'&&(!reviewNotifications.find(item=>item.href==='coffee-review:'+review.id)||!reviewNotifications.find(item=>item.href==='coffee-review:'+review.id)?.is_read))||(reviewFilter==='read'&&reviewNotifications.find(item=>item.href==='coffee-review:'+review.id)?.is_read))&&
  (reviewProductFilter==='Alle'||review.product_name===reviewProductFilter)&&
  (reviewRatingFilter==='Alle'||String(review.rating)===reviewRatingFilter)
 )

 if(loading)return <div className="training-state"><LoaderCircle className="spin" size={20}/> Hentar kaffebaren …</div>
 return <div className="coffee-module">
  <div className="training-heading coffee-heading">
   <div><div className="section-kicker">GARASJEGYM · KAFFEBAR</div><h3>Kaffebaren</h3><p>{settings.is_open?'Open for bestilling':'Stengd for bestilling'}</p></div>
   <div className="coffee-heading-actions"><button type="button" className="secondary-button coffee-help-button" onClick={()=>onHelp('coffee-order')}><BookOpen size={15}/> Hjelp</button><span className="count-pill">{products.filter(product=>product.is_active).length} produkt</span></div>
  </div>
  {error&&<div className="auth-error" role="alert">{error}</div>}{notice&&<div className="auth-message" role="status"><CheckCircle2 size={15}/>{notice}</div>}
  {!settings.is_open&&!staff&&<div className="coffee-closed-banner"><Store size={18}/><div><strong>Kaffebaren er stengd</strong><span>{settings.closed_message||'Du kan sjå menyen, men ikkje leggja inn bestilling akkurat no.'}</span></div></div>}
  {staff&&!ordersOnly&&<nav className="coffee-tabs" aria-label="Kaffebaradministrasjon">
   <button type="button" className={activeTab==='orders'?'selected':''} onClick={()=>setActiveTab('orders')}><ClipboardList size={15}/> Ordrekø</button>
   <button type="button" className={activeTab==='reviews'?'selected':''} onClick={()=>setActiveTab('reviews')}><MessageSquareText size={15}/> Vurderingar{unreadReviews>0&&<b className="coffee-tab-count">{unreadReviews}</b>}</button>
   <button type="button" className={activeTab==='menu'?'selected':''} onClick={()=>setActiveTab('menu')}><Coffee size={15}/> Meny</button>
   <button type="button" className={activeTab==='stats'?'selected':''} onClick={()=>setActiveTab('stats')}><BarChart3 size={15}/> Statistikk</button>
  </nav>}
  {!staff&&!ordersOnly&&<nav className="coffee-tabs" aria-label="Kaffebar">
   <button type="button" className={activeTab==='menu'?'selected':''} onClick={()=>setActiveTab('menu')}><Coffee size={15}/> Bestill kaffi</button>
   <button type="button" className={activeTab==='orders'?'selected':''} onClick={()=>setActiveTab('orders')}><ShoppingBag size={15}/> Mine bestillingar</button>
  </nav>}
  {staff&&activeTab==='orders'&&<>
   {!ordersOnly&&<div className="coffee-admin-toolbar"><button type="button" className="secondary-button coffee-open-toggle" disabled={busy==='opening'} onClick={toggleCoffeeOpen}>{settings.is_open?<EyeOff size={14}/>:<Eye size={14}/>} {settings.is_open?'Steng kaffebaren':'Opna kaffebaren'}</button><span>{unreadReviews} uleste vurderingar</span><button type="button" className="secondary-button" onClick={()=>load()}><RefreshCw size={13}/> Oppdater</button></div>}
   <section className="engine-section coffee-orders-section"><div className="training-heading"><div><div className="section-kicker">BARISTAPANEL</div><h3>Bestillingskø</h3></div><span className="count-pill">{orders.length} {orderView==='active'?'aktive':orderView==='completed'?'ferdige':'arkiverte'}</span></div>
    <div className="calendar-view-switch coffee-order-views"><button type="button" className={orderView==='active'?'selected':''} onClick={()=>setOrderView('active')}>Aktiv kø</button><button type="button" className={orderView==='completed'?'selected':''} onClick={()=>setOrderView('completed')}>Ferdige</button><button type="button" className={orderView==='archive'?'selected':''} onClick={()=>setOrderView('archive')}>Arkiv</button></div>
    {orders.length?orders.map(orderRow=><article className={'history-card coffee-order-card '+(orderRow.status==='new'?'is-new-order':'')} key={orderRow.id}>
     <div className="history-card-top"><div><strong>{orderRow.profiles?.display_name||'Medlem'} · #{orderRow.id.replaceAll('-','').slice(0,8).toUpperCase()}</strong><small>{formatDate(orderRow.created_at)} · Venta {Math.max(0,Math.floor((Date.now()-new Date(orderRow.created_at).getTime())/60000))} min</small></div><span className={'coffee-status status-'+(statusMeta[orderRow.status]?.className||orderRow.status)}>{statusMeta[orderRow.status]?.label||orderRow.status}</span></div>
     {(orderRow.coffee_order_items||[]).map(item=><div className="history-exercise coffee-order-item" key={item.id}><div><b>{item.product_name} × {item.quantity}</b>{item.options?.length>0&&<small>{optionSummary(item.options)}</small>}</div><span>{formatMoney(Number(item.unit_price)*Number(item.quantity))}</span></div>)}
     <div className="coffee-total"><span>Sum</span><strong>{formatMoney(orderRow.total)}</strong></div>
     {orderRow.note&&<div className="coffee-customer-note"><strong>Ønskje frå kunden</strong><p>{orderRow.note}</p></div>}
     <div className="coffee-staff-comment-editor"><label>Kommentar frå kaffibaren<textarea rows="2" value={staffComments[orderRow.id]??orderRow.staff_comment??''} onChange={e=>setStaffComments(v=>({...v,[orderRow.id]:e.target.value}))} placeholder="Kort melding til kunden …"/></label><button className="secondary-button" disabled={busy==='comment-'+orderRow.id} onClick={()=>saveStaffComment(orderRow)}>{busy==='comment-'+orderRow.id?'Lagrar …':'Lagre kommentar'}</button></div>
     <div className="coffee-order-actions">{statusMeta[orderRow.status]?.previous&&<button type="button" className="secondary-button" disabled={busy===orderRow.id} onClick={()=>updateStatus(orderRow,statusMeta[orderRow.status].previous)}>Angre siste steg</button>}{statusMeta[orderRow.status]?.next&&<button type="button" className="primary-button" disabled={busy===orderRow.id} onClick={()=>updateStatus(orderRow,statusMeta[orderRow.status].next)}>{statusMeta[orderRow.status].nextLabel}</button>}{!['collected','cancelled'].includes(orderRow.status)&&<button type="button" className="secondary-button" disabled={busy===orderRow.id} onClick={()=>{if(window.confirm('Avbestilla bestillinga?'))updateStatus(orderRow,'cancelled')}}>Avbestill</button>}<button type="button" className="secondary-button" disabled={busy==='archive-'+orderRow.id} onClick={()=>archiveOrder(orderRow)}>{orderRow.archived_at?'Gjenopprett':'Arkiver'}</button></div>
    </article>):<div className="empty-state">{orderView==='active'?'Ingen aktive bestillingar.':orderView==='completed'?'Ingen ferdige bestillingar enno.':'Arkivet er tomt.'}</div>}
   </section>
  </>}
  {activeTab==='menu'&&!ordersOnly&&<>
   {staff&&<p className="coffee-admin-price-hint">Menyen er sett opp med 0 kr som startpris (vist som «Gratis» for medlemmar). Rediger produktprisane dersom Garasjen ønskjer å ta betalt. Appen tek ikkje imot betaling.</p>}
   {staff&&<form className="coffee-add-product coffee-add-product-extended" onSubmit={addProduct}>
    <strong>{editingProduct?'Rediger produkt':'Legg til produkt'}</strong>
    <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Produktnamn" required/>
    <input type="number" min="0" step="0.5" value={newPrice} onChange={e=>setNewPrice(e.target.value)} placeholder="Pris i kr" required/>
    <input value={newCategory} onChange={e=>setNewCategory(e.target.value)} placeholder="Kategori (t.d. Espresso)"/>
    <input value={newPrepMinutes} onChange={e=>setNewPrepMinutes(e.target.value)} type="number" min="1" max="120" placeholder="Minutt"/>
    <input value={newImageUrl} onChange={e=>setNewImageUrl(e.target.value)} type="url" placeholder="Bilete-URL (valfri)"/>
    <input value={newDesc} onChange={e=>setNewDesc(e.target.value)} placeholder="Kort skildring"/>
    <label className="coffee-option-config">Tilval – eitt per linje. Bruk ! etter namnet når valet må gjerast, t.d. «Mjølk!: Vanleg, Havre»<textarea rows="2" value={newOptions} onChange={e=>setNewOptions(e.target.value)} placeholder={'Mjølk!: Vanleg mjølk, Havremjølk, Laktosefri\nSmak: Ingen, Vanilje, Karamell'}/></label>
    <div className="coffee-form-actions"><button className="primary-button" disabled={busy==='product'}>{busy==='product'?'Lagrar …':editingProduct?'Lagre produkt':'Legg til produkt'}</button>{editingProduct&&<button type="button" className="secondary-button" onClick={resetProductForm}>Avbryt</button>}</div>
   </form>}
   <div className="calendar-view-switch coffee-category-filters">{categories.map(category=><button type="button" key={category} className={categoryFilter===category?'selected':''} onClick={()=>setCategoryFilter(category)}>{category}</button>)}</div>
   {!staff&&cartQuantity>0&&<button type="button" className="coffee-cart-jump" onClick={()=>document.getElementById('gg-coffee-checkout')?.scrollIntoView({behavior:'smooth',block:'start'})}><ShoppingBag size={19}/><strong>{cartQuantity} {cartQuantity===1?'drikk':'drikkar'} i handlekorga</strong><span>{coffeePrice(total)}</span><ArrowRight size={17}/></button>}
   {!visibleProducts.length&&<div className="empty-state">Det ligg ikkje nokon drikkar i denne kategorien enno. {staff?'Legg til produkt over.':'Vel ein annan kategori eller prøv att seinare.'}</div>}
   <div className="coffee-product-grid">{visibleProducts.map(product=><article className={'coffee-product '+(!product.is_active?'is-inactive':'')} key={product.id}>
    {product.image_url?<img className="coffee-product-image" src={product.image_url} alt={product.name}/>:<div className="coffee-product-icon"><Coffee size={22}/></div>}
    <div className="coffee-product-info"><strong>{product.name}</strong><p>{product.description}</p><b>{coffeePrice(product.price)}</b>{product.prep_minutes&&<small><Clock3 size={12}/> Ca. {product.prep_minutes} min</small>}</div>
    {!staff&&<div className="coffee-product-options">{(product.option_groups||[]).map(group=><label key={group.name}>{group.name}<select value={optionSelections[product.id]?.[group.name]||''} onChange={e=>setOption(product.id,group.name,e.target.value)}><option value="">{group.required?'Vel eit alternativ':'Vel (valfritt)'}</option>{(group.choices||[]).map(choice=><option key={choice} value={choice}>{choice}</option>)}</select></label>)}</div>}
    {staff?<div className="coffee-product-admin-actions"><button type="button" className="secondary-button" onClick={()=>editProduct(product)}><Edit3 size={13}/> Rediger</button><button type="button" className="secondary-button" disabled={busy==='product-'+product.id} onClick={()=>toggleProduct(product)}>{product.is_active?'Marker utseld':'Gjer tilgjengeleg'}</button></div>:<div className="coffee-product-buy"><button type="button" className="secondary-button" disabled={!settings.is_open} onClick={()=>addToCart(product)}><Plus size={17}/>{settings.is_open?'Legg i handlekorg':'Stengd'}</button></div>}
   </article>)}</div>
   {!staff&&!settings.is_open&&<p className="coffee-closed-note">Bestilling er mellombels stengd.</p>}
   {!staff&&<section className="coffee-checkout" id="gg-coffee-checkout"><div className="training-heading"><div><div className="section-kicker">DI BESTILLING</div><h3>Handlekorg</h3></div><span className="count-pill">{cartQuantity} {cartQuantity===1?'drikk':'drikkar'}</span></div>
    {unavailableCartCount>0&&<p className="coffee-cart-warning">Nokre tidlegare val er ikkje lenger tilgjengelege og blir ikkje sende med bestillinga.</p>}
    {cartItems.length?<><div className="coffee-cart-lines">{cartItems.map(item=>{const product=products.find(row=>row.id===item.product_id);return <div className="coffee-cart-line" key={item.key}><div className="coffee-cart-line-info"><strong>{product.name}</strong>{item.options.length>0&&<small>{optionSummary(item.options)}</small>}<b>{coffeePrice(Number(product.price)*item.quantity)}</b></div><div className="coffee-cart-quantity"><button type="button" aria-label={'Fjern ein '+product.name} onClick={()=>changeCartQuantity(item.key,-1)}><Minus size={16}/></button><strong>{item.quantity}</strong><button type="button" aria-label={'Legg til ein '+product.name} onClick={()=>changeCartQuantity(item.key,1)} disabled={item.quantity>=20}><Plus size={16}/></button><button type="button" className="coffee-cart-remove" aria-label={'Fjern '+product.name+' frå handlekorga'} onClick={()=>changeCartQuantity(item.key,-item.quantity)}><Trash2 size={15}/></button></div></div>})}</div>
     <label className="coffee-order-note">Melding til baristaen (valfritt)<textarea value={note} onChange={e=>setNote(e.target.value)} maxLength="500" rows="2" placeholder="Til dømes når du kjem for å henta …"/></label>
     <div className="coffee-total"><span>Totalt</span><strong>{coffeePrice(total)}</strong></div>
     <button className="primary-button coffee-place-order" onClick={order} disabled={busy==='order'||!settings.is_open}><ShoppingBag size={17}/>{busy==='order'?'Sender …':'Send bestilling'}</button>
     <small className="coffee-order-note-hint">Kontroller drikkar og tilval før du sender. Det er ikkje ei nettbetaling i appen.</small>
    </>:<div className="empty-state">Vel ei drikk frå menyen og trykk «Legg i handlekorg».</div>}
   </section>}
  </>}
  {!staff&&activeTab==='orders'&&<section className="engine-section coffee-orders-section">
   <div className="training-heading"><div><span className="section-kicker">MI SIDE</span><h3>Mine bestillingar</h3></div><button type="button" className="secondary-button" onClick={()=>load()}><RefreshCw size={13}/> Oppdater</button></div>
   <div className="calendar-view-switch coffee-order-views"><button type="button" className={orderView==='all'?'selected':''} onClick={()=>setOrderView('all')}>Alle</button><button type="button" className={orderView==='active'?'selected':''} onClick={()=>setOrderView('active')}>Pågåande</button><button type="button" className={orderView==='completed'?'selected':''} onClick={()=>setOrderView('completed')}>Ferdige</button></div>
   {orders.length?orders.map(orderRow=><article className="history-card coffee-order-card" key={orderRow.id}>
    <div className="history-card-top"><div><strong>Bestilling #{orderRow.id.replaceAll('-','').slice(0,8).toUpperCase()}</strong><small>{formatDate(orderRow.created_at)}</small></div><span className={'coffee-status status-'+(statusMeta[orderRow.status]?.className||orderRow.status)}>{statusMeta[orderRow.status]?.label||orderRow.status}</span></div>
    {orderRow.status!=='cancelled'&&<div className="coffee-order-progress" aria-label="Framdrift for bestillinga">{coffeeProgress.map((step,index)=><span key={step} className={index<=coffeeProgress.indexOf(orderRow.status)?'done':''}>{statusMeta[step].label}</span>)}</div>}
    {(orderRow.coffee_order_items||[]).map(item=><div className="coffee-member-item" key={item.id}><div className="history-exercise coffee-order-item"><div><b>{item.product_name} × {item.quantity}</b>{item.options?.length>0&&<small>{optionSummary(item.options)}</small>}</div><span>{formatMoney(Number(item.unit_price)*Number(item.quantity))}</span></div>
     {orderRow.status==='collected'&&!item.review&&!item.review_skipped_at&&<div className="coffee-review-prompt"><div><strong>Korleis var {item.product_name.toLowerCase()}?</strong><small>Vurderinga er heilt frivillig.</small></div><button type="button" className="secondary-button" onClick={()=>setReviewDrafts(current=>({...current,[item.id]:current[item.id]||{rating:5,comment:''}}))}>Gi vurdering</button><button type="button" className="text-button" disabled={busy==='skip-'+item.id} onClick={()=>skipReview(item)}>Ikkje no</button></div>}
     {orderRow.status==='collected'&&reviewDrafts[item.id]&&!item.review&&<div className="coffee-review-editor"><strong>Korleis var produktet?</strong><div className="coffee-star-select" role="radiogroup" aria-label="Stjernevurdering">{[1,2,3,4,5].map(rating=><button key={rating} type="button" aria-label={rating+' av 5 stjerner'} aria-pressed={(reviewDrafts[item.id].rating||5)===rating} onClick={()=>setReviewDrafts(current=>({...current,[item.id]:{...current[item.id],rating}}))}><Star size={25} fill={rating<=(reviewDrafts[item.id].rating||5)?'currentColor':'none'}/></button>)}</div><label>Kommentar (valfri)<textarea rows="2" maxLength="500" value={reviewDrafts[item.id].comment||''} onChange={e=>setReviewDrafts(current=>({...current,[item.id]:{...current[item.id],comment:e.target.value}}))} placeholder="Noko me kan gjera betre?"/></label><div className="coffee-form-actions"><button type="button" className="primary-button" disabled={busy==='review-'+item.id} onClick={()=>submitReview(item)}>{busy==='review-'+item.id?'Sender …':'Send vurdering'}</button><button type="button" className="secondary-button" disabled={busy==='skip-'+item.id} onClick={()=>{setReviewDrafts(current=>{const next={...current};delete next[item.id];return next});skipReview(item)}}>Lukk / ikkje no</button></div><small>Du kan òg lukka dette utan å senda noko.</small></div>}
     {item.review&&<div className="coffee-review-thanks"><span>{'★'.repeat(item.review.rating)}{'☆'.repeat(5-item.review.rating)}</span><small>Takk for vurderinga di.</small></div>}
    </div>)}
    <div className="coffee-total"><span>Sum</span><strong>{formatMoney(orderRow.total)}</strong></div>
    {['new','confirmed'].includes(orderRow.status)&&<button type="button" className="secondary-button coffee-cancel-own" disabled={busy==='cancel-'+orderRow.id} onClick={()=>cancelOwnOrder(orderRow)}>{busy==='cancel-'+orderRow.id?'Avbestiller …':'Avbestill før tilbereding'}</button>}
   </article>):<div className="empty-state">Du har ingen bestillingar enno.</div>}
  </section>}
  {staff&&!ordersOnly&&activeTab==='reviews'&&<section className="engine-section coffee-review-admin">
   <div className="training-heading"><div><span className="section-kicker">BARISTA · TILBAKEMELDING</span><h3>Produktvurderingar</h3><p>{reviews.length} vurderingar · {unreadReviews} uleste</p></div><span className="coffee-average-rating"><Star size={18} fill="currentColor"/>{averageRating.toFixed(1)} / 5</span></div>
   <div className="coffee-review-filters"><select value={reviewFilter} onChange={e=>setReviewFilter(e.target.value)}><option value="unread">Uleste først</option><option value="read">Leste</option><option value="all">Alle</option></select><select value={reviewProductFilter} onChange={e=>setReviewProductFilter(e.target.value)}><option>Alle</option>{[...new Set(reviews.map(review=>review.product_name))].map(name=><option key={name}>{name}</option>)}</select><select value={reviewRatingFilter} onChange={e=>setReviewRatingFilter(e.target.value)}><option value="Alle">Alle stjerner</option>{[5,4,3,2,1].map(rating=><option key={rating} value={String(rating)}>{rating} stjerner</option>)}</select></div>
   <div className="coffee-review-layout"><div className="coffee-review-list">{visibleReviews.length?visibleReviews.map(review=>{const noticeRow=reviewNotifications.find(row=>row.href==='coffee-review:'+review.id);return <button type="button" key={review.id} className={'coffee-review-row '+(selectedReview?.id===review.id?'selected':'')+(!noticeRow||!noticeRow.is_read?' unread':'')} onClick={()=>markReviewRead(review)}><div><strong>{review.product_name}</strong><span>{'★'.repeat(review.rating)}{'☆'.repeat(5-review.rating)}</span></div><small>{review.profiles?.display_name||'Medlem'} · {formatDate(review.created_at)}</small><GarageOwnerBadge userId={review.member_id}/>{review.comment&&<p>{review.comment}</p>}<em>{noticeRow?.is_read?'Lest':'Ulest'}</em></button>}) :<div className="empty-state">Ingen vurderingar i denne visninga.</div>}</div>
    {selectedReview&&<article className="coffee-review-detail"><div className="history-card-top"><strong>{selectedReview.product_name}</strong><span>{selectedReview.rating} / 5 stjerner</span></div><div className="coffee-review-detail-stars">{'★'.repeat(selectedReview.rating)}{'☆'.repeat(5-selectedReview.rating)}</div><p>{selectedReview.comment||'Kunden skreiv ingen kommentar.'}</p><div className="garage-author-line"><small>{selectedReview.profiles?.display_name||'Medlem'} · Bestilling #{selectedReview.order_id?.replaceAll('-','').slice(0,8).toUpperCase()}</small><GarageOwnerBadge userId={selectedReview.member_id}/></div><time>{formatDate(selectedReview.created_at)}</time></article>}
   </div>
  </section>}
  {staff&&!ordersOnly&&activeTab==='stats'&&<section className="engine-section coffee-stats-view">
   <div className="training-heading"><div><span className="section-kicker">KAFFEBAR · RAPPORT</span><h3>Statistikk</h3></div></div>
   <div className="coffee-stats-strip"><div className="coffee-stat"><span>Bestilte einingar</span><strong>{coffeeStats.bought}</strong></div><div className="coffee-stat"><span>Tilberedde einingar</span><strong>{coffeeStats.made}</strong></div><div className="coffee-stat"><span>Utleverte einingar</span><strong>{coffeeStats.sold}</strong></div><div className="coffee-stat"><span>Omsetning utlevert</span><strong>{formatMoney(coffeeStats.revenue)}</strong></div><div className="coffee-stat"><span>Vurderingar</span><strong>{reviews.length}</strong></div><div className="coffee-stat"><span>Snittvurdering</span><strong>{reviews.length?averageRating.toFixed(1)+'/5':'–'}</strong></div></div>
   <section className="engine-section coffee-popular-stats"><div className="engine-section-title"><h4>Mest bestilte produkt</h4><span>Utleverte og aktive bestillingar</span></div>{coffeeStats.popular.length?<div className="admin-rank-list">{coffeeStats.popular.map((item,index)=><article className="admin-rank-row" key={item.name}><div><strong>{index+1}. {item.name}</strong></div><b>{item.quantity} stk.</b></article>)}</div>:<div className="empty-state">Ingen bestillingar å visa enno.</div>}</section>
   <section className="engine-section coffee-popular-stats"><div className="engine-section-title"><h4>Gjennomsnitt per produkt</h4><span>Med tal på vurderingar</span></div>{products.map(product=>{const rows=reviews.filter(review=>review.product_id===product.id);const avg=rows.length?rows.reduce((sum,review)=>sum+review.rating,0)/rows.length:0;return <div className="coffee-product-rating-row" key={product.id}><strong>{product.name}</strong><span>{rows.length?avg.toFixed(1)+' / 5':'Ikkje vurdert'}</span><small>{rows.length} vurderingar</small></div>})}</section>
  </section>}
  {staff&&!ordersOnly&&activeTab==='menu'&&<section className="engine-section coffee-menu-admin">
   <div className="training-heading"><div><span className="section-kicker">KAFFEBAR · MENY</span><h3>Produkt og kategoriar</h3><p>Endringar påverkar menyen framover, ikkje historiske bestillingar.</p></div></div>
   <div className="coffee-admin-product-list">{products.map(product=><div className="coffee-admin-product-row" key={product.id}><div><strong>{product.name}</strong><small>{product.category||'Kaffi'} · {formatMoney(product.price)} · {(product.option_groups||[]).length} tilvalsgrupper</small></div><span className={product.is_active?'coffee-product-active':'coffee-product-off'}>{product.is_active?'Tilgjengeleg':'Utseld / skjult'}</span><button type="button" className="secondary-button" onClick={()=>editProduct(product)}>Rediger</button><button type="button" className="secondary-button" disabled={busy==='product-'+product.id} onClick={()=>toggleProduct(product)}>{product.is_active?'Marker utseld':'Aktiver'}</button></div>)}</div>
  </section>}
 </div>
}
