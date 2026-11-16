import {useEffect,useMemo,useState} from 'react'
import {CheckCircle2,Coffee,LoaderCircle,Minus,Plus,ShoppingBag} from 'lucide-react'
import {supabase} from '../lib/supabase.js'
import {isStaff} from '../lib/auth.js'

export default function CoffeeBar({profile}){
 const staff=isStaff(profile)
 const [products,setProducts]=useState([]),[orders,setOrders]=useState([]),[cart,setCart]=useState({})
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const [note,setNote]=useState(''),[newName,setNewName]=useState(''),[newPrice,setNewPrice]=useState(''),[newDesc,setNewDesc]=useState('')
 async function load(){
  setLoading(true);setError('')
  const [p,o]=await Promise.all([
   supabase.from('coffee_products').select('id,name,description,price,is_active,sort_order').order('sort_order').order('name'),
   supabase.from('coffee_orders').select('id,member_id,status,total,note,created_at,coffee_order_items(id,product_name,unit_price,quantity)').order('created_at',{ascending:false}).limit(50)
  ])
  if(p.error)setError(p.error.message);else setProducts(p.data||[])
  if(o.error)setError(o.error.message);else setOrders(o.data||[])
  setLoading(false)
 }
 useEffect(()=>{load()},[])
 const cartItems=useMemo(()=>products.filter(p=>cart[p.id]>0).map(p=>({product_id:p.id,quantity:cart[p.id],price:Number(p.price)})),[products,cart])
 const total=cartItems.reduce((sum,item)=>sum+item.price*item.quantity,0)
 function change(id,delta){setCart(v=>({...v,[id]:Math.max(0,Math.min(20,(v[id]||0)+delta))}))}
 async function order(){
  setBusy('order');setError('');setNotice('')
  try{
   const {data,error:e}=await supabase.rpc('place_coffee_order',{p_items:cartItems.map(({product_id,quantity})=>({product_id,quantity})),p_note:note})
   if(e)throw e
   setCart({});setNote('');setNotice('Bestillinga er sendt til kaffibaren.');await load()
  }catch(e){setError(e.message||'Kunne ikkje senda bestillinga.')}
  finally{setBusy('')}
 }
 async function addProduct(e){
  e.preventDefault();setBusy('product');setError('')
  try{
   const {error:e}=await supabase.from('coffee_products').insert({name:newName.trim(),price:Number(newPrice),description:newDesc.trim()})
   if(e)throw e
   setNewName('');setNewPrice('');setNewDesc('');setNotice('Produkt lagt til.');await load()
  }catch(e){setError(e.message||'Kunne ikkje leggja til produkt.')}
  finally{setBusy('')}
 }
 async function updateStatus(order,status){
  setBusy(order.id);setError('')
  try{const {error:e}=await supabase.from('coffee_orders').update({status}).eq('id',order.id);if(e)throw e;setNotice('Ordrestatus oppdatert.');await load()}
  catch(e){setError(e.message||'Kunne ikkje oppdatera status.')}
  finally{setBusy('')}
 }
 if(loading)return <div className="training-state"><LoaderCircle className="spin" size={20}/> Hentar kaffibaren …</div>
 return <div className="coffee-module">
  <div className="training-heading"><div><div className="section-kicker">GARASJEGYM · BARISTA</div><h3>Kaffibaren</h3></div><span className="count-pill">{products.filter(p=>p.is_active).length} produkt</span></div>
  {error&&<div className="auth-error" role="alert">{error}</div>}{notice&&<div className="auth-message" role="status"><CheckCircle2 size={15}/>{notice}</div>}
  {staff&&<form className="coffee-add-product" onSubmit={addProduct}><strong>Legg til produkt</strong><input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Produktnamn" required/><input type="number" min="0" step="0.5" value={newPrice} onChange={e=>setNewPrice(e.target.value)} placeholder="Pris i kr" required/><input value={newDesc} onChange={e=>setNewDesc(e.target.value)} placeholder="Kort skildring"/><button className="secondary-button" disabled={busy==='product'}><Plus size={14}/> Legg til</button></form>}
  <div className="coffee-product-grid">{products.filter(p=>p.is_active||staff).map(p=><article className="coffee-product" key={p.id}><div className="coffee-product-icon"><Coffee size={22}/></div><div className="coffee-product-info"><strong>{p.name}</strong><p>{p.description}</p><b>{Number(p.price).toLocaleString('nn-NO')} kr</b></div>{!staff&&<div className="coffee-quantity"><button onClick={()=>change(p.id,-1)} aria-label="Fjern ein"><Minus size={14}/></button><strong>{cart[p.id]||0}</strong><button onClick={()=>change(p.id,1)} aria-label="Legg til ein"><Plus size={14}/></button></div>}</article>)}</div>
  {!staff&&<section className="coffee-checkout"><div className="training-heading"><div><div className="section-kicker">BESTILLING</div><h3>Handlekorg</h3></div><span className="count-pill">{cartItems.reduce((s,x)=>s+x.quantity,0)} varer</span></div>{cartItems.length?<><div className="coffee-cart-lines">{cartItems.map(item=>{const p=products.find(x=>x.id===item.product_id);return <div key={item.product_id}><span>{p.name} × {item.quantity}</span><b>{(item.price*item.quantity).toLocaleString('nn-NO')} kr</b></div>})}</div><textarea value={note} onChange={e=>setNote(e.target.value)} rows="2" placeholder="Kommentar til bestilling (valfritt)"/><div className="coffee-total"><span>Totalt</span><strong>{total.toLocaleString('nn-NO')} kr</strong></div><button className="primary-button" onClick={order} disabled={busy==='order'}><ShoppingBag size={16}/>{busy==='order'?'Sender …':'Send bestilling'}</button></>:<div className="empty-state">Legg til kaffi i handlekorga for å bestilla.</div>}</section>}
  <section className="engine-section"><div className="training-heading"><div><div className="section-kicker">{staff?'ORDREKØ':'HISTORIKK'}</div><h3>{staff?'Kaffibestillingar':'Mine bestillingar'}</h3></div><span className="count-pill">{orders.length} ordre</span></div>{orders.length?orders.map(o=><article className="history-card" key={o.id}><div className="history-card-top"><strong>{staff?'Bestilling': 'Kaffibestilling'} · {new Date(o.created_at).toLocaleString('nn-NO')}</strong><span className={'coffee-status status-'+o.status}>{({new:'Ny',preparing:'Lagast',ready:'Klar',collected:'Henta',cancelled:'Avbroten'})[o.status]||o.status}</span></div>{o.coffee_order_items?.map(i=><div className="history-exercise" key={i.id}><b>{i.product_name} × {i.quantity}</b><span>{(Number(i.unit_price)*i.quantity).toLocaleString('nn-NO')} kr</span></div>)}<div className="coffee-total"><span>Sum</span><strong>{Number(o.total).toLocaleString('nn-NO')} kr</strong></div>{o.note&&<small>{o.note}</small>}{staff&&<div className="coffee-order-actions">{[['preparing','Start lagring'],['ready','Klar'],['collected','Henta'],['cancelled','Avbryt']].map(([value,label])=><button key={value} className="secondary-button" disabled={busy===o.id||o.status===value} onClick={()=>updateStatus(o,value)}>{label}</button>)}</div>}</article>):<div className="empty-state">Ingen bestillingar enno.</div>}</section>
 </div>
}
