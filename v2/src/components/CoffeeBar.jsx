import {useEffect,useMemo,useState} from 'react'
import {CheckCircle2,Coffee,LoaderCircle,Minus,Plus,ShoppingBag} from 'lucide-react'
import {supabase} from '../lib/supabase.js'
import {isStaff} from '../lib/auth.js'

export default function CoffeeBar({profile,ordersOnly=false}){
 const staff=isStaff(profile)&&ordersOnly
 const [products,setProducts]=useState([]),[orders,setOrders]=useState([]),[cart,setCart]=useState({})
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[showArchived,setShowArchived]=useState(false)
 const [note,setNote]=useState(''),[staffComments,setStaffComments]=useState({}),[milk,setMilk]=useState('Vanleg mjølk'),[syrup,setSyrup]=useState('Ingen'),[newName,setNewName]=useState(''),[newPrice,setNewPrice]=useState(''),[newDesc,setNewDesc]=useState(''),[editingProduct,setEditingProduct]=useState(null)
 async function load(silent=false){
  if(!silent)setLoading(true);setError('')
  const [p,o]=await Promise.all([
   supabase.from('coffee_products').select('id,name,description,price,is_active,sort_order').order('sort_order').order('name'),
   (staff ? supabase.from('coffee_orders').select('id,member_id,status,total,note,staff_comment,archived_at,created_at,coffee_order_items(id,product_name,unit_price,quantity),profiles:profiles!coffee_orders_member_id_fkey(display_name)').filter('archived_at',showArchived?'not.is':'is',null).order('created_at',{ascending:false}).limit(100) : supabase.from('coffee_orders').select('id,member_id,status,total,note,created_at,coffee_order_items(id,product_name,unit_price,quantity)').eq('member_id',(await supabase.auth.getUser()).data.user.id).order('created_at',{ascending:false}).limit(30))
  ])
  if(p.error)setError(p.error.message);else setProducts(p.data||[])
  if(o.error)setError(o.error.message);else setOrders(o.data||[])
  setLoading(false)
 }
 useEffect(()=>{load();const refresh=setInterval(()=>load(true),30000);return()=>clearInterval(refresh)},[])
 const cartItems=useMemo(()=>products.filter(p=>cart[p.id]>0).map(p=>({product_id:p.id,quantity:cart[p.id],price:Number(p.price)})),[products,cart])
 const total=cartItems.reduce((sum,item)=>sum+item.price*item.quantity,0)
 function change(id,delta){setCart(v=>({...v,[id]:Math.max(0,Math.min(20,(v[id]||0)+delta))}))}
 async function order(){
  setBusy('order');setError('');setNotice('')
  try{
   const {data,error:e}=await supabase.rpc('place_coffee_order',{p_items:cartItems.map(({product_id,quantity})=>({product_id,quantity})),p_note:[note,milk!=='Ingen'?'Mjølk: '+milk:'',syrup!=='Ingen'?'Sirup/smak: '+syrup:''].filter(Boolean).join(' · ')})
   if(e)throw e
   setCart({});setNote('');setNotice('Bestillinga er sendt til kaffibaren.');await load()
  }catch(e){setError(e.message||'Kunne ikkje senda bestillinga.')}
  finally{setBusy('')}
 }
 async function addProduct(e){
  e.preventDefault();setBusy('product');setError('')
  try{
   const values={name:newName.trim(),price:Number(newPrice),description:newDesc.trim()}
   const result=editingProduct?await supabase.from('coffee_products').update(values).eq('id',editingProduct.id):await supabase.from('coffee_products').insert(values)
   if(result.error)throw result.error
   setNewName('');setNewPrice('');setNewDesc('');setEditingProduct(null);setNotice(editingProduct?'Produkt oppdatert.':'Produkt lagt til.');await load()
  }catch(e){setError(e.message||'Kunne ikkje leggja til produkt.')}
  finally{setBusy('')}
 }
 function editProduct(product){
  setEditingProduct(product);setNewName(product.name||'');setNewPrice(String(product.price??''));setNewDesc(product.description||'')
 }
 function cancelProductEdit(){
  setEditingProduct(null);setNewName('');setNewPrice('');setNewDesc('')
 }
 async function toggleProduct(product){
  setBusy('product-'+product.id);setError('');setNotice('')
  try{
   const {error:e}=await supabase.from('coffee_products').update({is_active:!product.is_active}).eq('id',product.id)
   if(e)throw e
   setProducts(v=>v.map(row=>row.id===product.id?{...row,is_active:!row.is_active}:row))
   setNotice(product.is_active?'Produktet er skjult frå menyen.':'Produktet er publisert i menyen.')
  }catch(e){setError(e.message||'Kunne ikkje endra produktstatus.')}
  finally{setBusy('')}
 }
 async function saveStaffComment(order){
  setBusy('comment-'+order.id);setError('')
  try{const {error:e}=await supabase.from('coffee_orders').update({staff_comment:(staffComments[order.id]??order.staff_comment??'').trim()}).eq('id',order.id);if(e)throw e;setNotice('Kommentaren på ordren er lagra.');await load()}
  catch(e){setError(e.message||'Kunne ikkje lagra ord kommentaren.')}
  finally{setBusy('')}
 }
 async function archiveOrder(order){setBusy('archive-'+order.id);setError('');try{const {error:e}=await supabase.from('coffee_orders').update({archived_at:order.archived_at?null:new Date().toISOString()}).eq('id',order.id);if(e)throw e;setNotice(order.archived_at?'Bestillinga er gjenoppretta.':'Bestillinga er arkivert.');await load()}catch(e){setError(e.message||'Kunne ikkje arkivera bestillinga.')}finally{setBusy('')}}
 async function updateStatus(order,status){
  setBusy(order.id);setError('')
  try{const {error:e}=await supabase.from('coffee_orders').update({status}).eq('id',order.id);if(e)throw e;setNotice('Ordrestatus oppdatert.');await load()}
  catch(e){setError(e.message||'Kunne ikkje oppdatera status.')}
  finally{setBusy('')}
 }
 if(loading)return <div className="training-state"><LoaderCircle className="spin" size={20}/> Hentar kaffibaren …</div>
 return <div className="coffee-module">
  <div className="training-heading"><div><div className="section-kicker">GARASJEGYM · KAFFEBAR</div><h3>Kaffibaren</h3></div><span className="count-pill">{products.filter(p=>p.is_active).length} produkt</span></div>
  {error&&<div className="auth-error" role="alert">{error}</div>}{notice&&<div className="auth-message" role="status"><CheckCircle2 size={15}/>{notice}</div>}
  {staff&&!ordersOnly&&<form className="coffee-add-product" onSubmit={addProduct}><strong>{editingProduct?'Rediger produkt':'Legg til produkt'}</strong><input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Produktnamn" required/><input type="number" min="0" step="0.5" value={newPrice} onChange={e=>setNewPrice(e.target.value)} placeholder="Pris i kr" required/><input value={newDesc} onChange={e=>setNewDesc(e.target.value)} placeholder="Kort skildring"/><button className="secondary-button" disabled={busy==='product'}><Plus size={14}/>{editingProduct?'Lagre':'Legg til'}</button>{editingProduct&&<button type="button" className="secondary-button" onClick={cancelProductEdit}>Avbryt</button>}</form>}
  {!ordersOnly&&<div className="coffee-product-grid">{products.filter(p=>p.is_active||staff).map(p=><article className="coffee-product" key={p.id}><div className="coffee-product-icon"><Coffee size={22}/></div><div className="coffee-product-info"><strong>{p.name}</strong><p>{p.description}</p><b>{Number(p.price).toLocaleString('nn-NO')} kr</b></div>{staff?<div className="coffee-product-admin-actions"><button type="button" className="secondary-button" onClick={()=>editProduct(p)}>Rediger</button><button type="button" className="secondary-button" disabled={busy==='product-'+p.id} onClick={()=>toggleProduct(p)}>{p.is_active?'Skjul produkt':'Publiser produkt'}</button></div>:<div className="coffee-quantity"><button type="button" onClick={()=>change(p.id,-1)} aria-label="Fjern ein"><Minus size={14}/></button><strong>{cart[p.id]||0}</strong><button type="button" onClick={()=>change(p.id,1)} aria-label="Legg til ein"><Plus size={14}/></button></div>}</article>)}</div>}
  {!staff&&!ordersOnly&&<section className="coffee-checkout"><div className="training-heading"><div><div className="section-kicker">BESTILLING</div><h3>Handlekorg</h3></div><span className="count-pill">{cartItems.reduce((s,x)=>s+x.quantity,0)} varer</span></div>{cartItems.length?<><div className="coffee-cart-lines">{cartItems.map(item=>{const p=products.find(x=>x.id===item.product_id);return <div key={item.product_id}><span>{p.name} × {item.quantity}</span><b>{(item.price*item.quantity).toLocaleString('nn-NO')} kr</b></div>})}</div><div className="engine-fields"><label>Mjølk<select value={milk} onChange={e=>setMilk(e.target.value)}><option>Vanleg mjølk</option><option>Havremjølk</option><option>Ingen</option></select></label><label>Sirup / smak<select value={syrup} onChange={e=>setSyrup(e.target.value)}><option>Ingen</option><option>Vanilje</option><option>Karamell</option><option>Sjokolade</option></select></label></div><textarea value={note} onChange={e=>setNote(e.target.value)} rows="2" placeholder="Melding om ønskje (valfritt)"/><div className="coffee-total"><span>Totalt</span><strong>{total.toLocaleString('nn-NO')} kr</strong></div><button className="primary-button" onClick={order} disabled={busy==='order'}><ShoppingBag size={16}/>{busy==='order'?'Sender …':'Send bestilling'}</button></>:<div className="empty-state">Legg til kaffi i handlekorga for å bestilla.</div>}</section>}
  {<section className="engine-section"><div className="training-heading"><div><div className="section-kicker">{ordersOnly?'KUNDESENTER':'HISTORIKK'}</div><h3>{ordersOnly?'Bestillingar og produksjonsstatus':'Mine bestillingar'}</h3></div><span className="count-pill">{orders.length} ordre</span></div>{ordersOnly&&<div className="calendar-view-switch"><button type="button" className={!showArchived?'selected':''} onClick={()=>setShowArchived(false)}>Aktive bestillingar</button><button type="button" className={showArchived?'selected':''} onClick={()=>setShowArchived(true)}>Arkiv</button></div>}{orders.length?orders.map(o=><article className="history-card" key={o.id}><div className="history-card-top"><strong>{ordersOnly?(o.profiles?.display_name||'Medlem'):'Kaffibestilling'} · {new Date(o.created_at).toLocaleString('nn-NO')}</strong><span className={'coffee-status status-'+o.status}>{({new:'Ny',preparing:'I produksjon',ready:'Ferdig – klar for henting',collected:'Henta',cancelled:'Avbroten'})[o.status]||o.status}</span></div>{o.coffee_order_items?.map(i=><div className="history-exercise" key={i.id}><b>{i.product_name} × {i.quantity}</b><span>{(Number(i.unit_price)*i.quantity).toLocaleString('nn-NO')} kr</span></div>)}<div className="coffee-total"><span>Sum</span><strong>{Number(o.total).toLocaleString('nn-NO')} kr</strong></div>{o.note&&<div className="coffee-customer-note"><strong>Ønskje frå kunden</strong><p>{o.note}</p></div>}{o.staff_comment&&!ordersOnly&&<div className="coffee-staff-comment"><strong>Melding frå kaffebaren</strong><p>{o.staff_comment}</p></div>}{ordersOnly&&<><div className="coffee-staff-comment-editor"><label>Kommentar frå kaffebaren – er ønsket oppfylt?<textarea rows="2" value={staffComments[o.id]??o.staff_comment??''} onChange={e=>setStaffComments(v=>({...v,[o.id]:e.target.value}))} placeholder="Til dømes: Havremjølk ordna, ekstra varm …" /></label><button className="secondary-button" disabled={busy==='comment-'+o.id} onClick={()=>saveStaffComment(o)}>{busy==='comment-'+o.id?'Lagrar …':'Lagre kommentar'}</button></div><div className="coffee-order-actions">{[['preparing','Start produksjon'],['ready','Ferdig – klar for henting'],['collected','Henta'],['cancelled','Avbryt']].map(([value,label])=><button key={value} className="secondary-button" disabled={busy===o.id||o.status===value} onClick={()=>updateStatus(o,value)}>{label}</button>)}<button type="button" className="secondary-button" disabled={busy==='archive-'+o.id} onClick={()=>archiveOrder(o)}>{o.archived_at?'Gjenopprett':'Arkiver bestilling'}</button></div></>}</article>):<div className="empty-state">Ingen bestillingar enno.</div>}</section>}
 </div>
}
