import {useEffect,useState} from 'react'
import {CheckCircle2,LoaderCircle,MessageCircle,Send,Trash2} from 'lucide-react'
import {supabase} from '../lib/supabase.js'
import {isStaff} from '../lib/auth.js'

export default function Community({profile}){
 const staff=isStaff(profile)
 const [posts,setPosts]=useState([]),[comments,setComments]=useState([])
 const [body,setBody]=useState(''),[topic,setTopic]=useState('Treningsprat'),[drafts,setDrafts]=useState({}),[imageData,setImageData]=useState('')
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('')
 async function load(silent=false){
  if(!silent)setLoading(true);setError('')
  const [p,c]=await Promise.all([
   supabase.from('social_posts').select('id,author_id,author_name,body,topic,kind,created_at').order('created_at',{ascending:false}).limit(60),
   supabase.from('social_comments').select('id,post_id,author_id,author_name,body,created_at').order('created_at',{ascending:true}).limit(200)
  ])
  if(p.error)setError(p.error.message);else setPosts(p.data||[])
  if(c.error)setError(c.error.message);else setComments(c.data||[])
  setLoading(false)
 }
 useEffect(()=>{load();const refresh=setInterval(()=>load(true),30000);return()=>clearInterval(refresh)},[])
 async function chooseImage(event){
  const file=event.target.files?.[0]
  if(!file)return
  event.target.value=''
  setError('')
  if(!file.type.startsWith('image/')){setError('Vel ei bildefil.');return}
  if(file.size>8*1024*1024){setError('Biletet er for stort. Vel ei fil under 8 MB.');return}
  try{
   const dataUrl=await new Promise((resolve,reject)=>{
    const reader=new FileReader()
    reader.onload=()=>resolve(reader.result)
    reader.onerror=()=>reject(new Error('Kunne ikkje lesa biletet.'))
    reader.readAsDataURL(file)
   })
   const image=await new Promise((resolve,reject)=>{
    const element=new Image()
    element.onload=()=>resolve(element)
    element.onerror=()=>reject(new Error('Biletet kunne ikkje opnast.'))
    element.src=dataUrl
   })
   const scale=Math.min(1,1200/Math.max(image.width,image.height))
   const canvas=document.createElement('canvas')
   canvas.width=Math.max(1,Math.round(image.width*scale))
   canvas.height=Math.max(1,Math.round(image.height*scale))
   const context=canvas.getContext('2d')
   if(!context)throw new Error('Nettlesaren kan ikkje handsama biletet.')
   context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height)
   context.drawImage(image,0,0,canvas.width,canvas.height)
   const compressed=canvas.toDataURL('image/jpeg',0.72)
   if(compressed.length>1500000)throw new Error('Biletet er framleis for stort etter komprimering.')
   setImageData(compressed)
  }catch(err){setError(err.message||'Kunne ikkje klargjera biletet.')}
 }
 async function publish(e){
  e.preventDefault();if(!body.trim())return
  setBusy('post');setError('');setNotice('')
  try{
   const {data:{user}}=await supabase.auth.getUser()
   const {error:e}=await supabase.from('social_posts').insert({author_id:user.id,author_name:profile.display_name||user.email,body:body.trim(),topic,kind:'post',image_data:imageData||null})
   if(e)throw e
   setBody('');setImageData('');setNotice('Innlegget er publisert.');await load()
  }catch(e){setError(e.message||'Kunne ikkje publisera.')}
  finally{setBusy('')}
 }
 async function removePost(post){
  if(!window.confirm('Sletta dette innlegget og alle kommentarane?'))return
  setBusy('delete-'+post.id);setError('');setNotice('')
  try{
   const {error:e}=await supabase.from('social_posts').delete().eq('id',post.id)
   if(e)throw e
   setPosts(v=>v.filter(row=>row.id!==post.id))
   setComments(v=>v.filter(row=>row.post_id!==post.id))
   setNotice('Innlegget er sletta.')
  }catch(e){setError(e.message||'Kunne ikkje sletta innlegget.')}
  finally{setBusy('')}
 }
 async function removeComment(commentRow){
  if(!window.confirm('Sletta kommentaren?'))return
  setBusy('comment-delete-'+commentRow.id);setError('')
  try{
   const {error:e}=await supabase.from('social_comments').delete().eq('id',commentRow.id)
   if(e)throw e
   setComments(v=>v.filter(row=>row.id!==commentRow.id))
  }catch(e){setError(e.message||'Kunne ikkje sletta kommentaren.')}
  finally{setBusy('')}
 }
 async function comment(post){
  const text=(drafts[post.id]||'').trim();if(!text)return
  setBusy(post.id);setError('')
  try{
   const {data:{user}}=await supabase.auth.getUser()
   const {error:e}=await supabase.from('social_comments').insert({post_id:post.id,author_id:user.id,author_name:profile.display_name||user.email,body:text})
   if(e)throw e
   setDrafts(v=>({...v,[post.id]:''}));await load()
  }catch(e){setError(e.message||'Kunne ikkje leggja til kommentar.')}
  finally{setBusy('')}
 }
 if(loading)return <div className="training-state"><LoaderCircle className="spin" size={20}/> Hentar fellesskapet …</div>
 return <div className="community-module">
  <div className="training-heading"><div><div className="section-kicker">GARASJEGYM · FELLESSKAP</div><h3>Garasjeprat</h3></div><span className="count-pill">{posts.length} innlegg</span></div>
  {error&&<div className="auth-error" role="alert">{error}</div>}{notice&&<div className="auth-message" role="status"><CheckCircle2 size={15}/>{notice}</div>}
  <form className="community-compose" onSubmit={publish}><label>Del noko med gjengen<textarea value={body} onChange={e=>setBody(e.target.value)} rows="3" maxLength="3000" placeholder="Treningsglede, spørsmål, resultat eller ein liten siger …" required/></label><div className="community-compose-foot"><select value={topic} onChange={e=>setTopic(e.target.value)}><option>Treningsprat</option><option>Resultat</option><option>Spørsmål</option><option>Sosialt</option></select><label className="secondary-button">Legg ved bilete<input type="file" accept="image/*" onChange={chooseImage} hidden/></label><button className="primary-button" disabled={busy==='post'}><Send size={15}/>{busy==='post'?'Publiserer …':'Publiser innlegg'}</button></div>{imageData&&<div className="community-image-preview"><img src={imageData} alt="Førehandsvising av vedlagt bilete"/><button type="button" className="secondary-button" onClick={()=>setImageData('')}>Fjern bilete</button></div>}</form>
  {posts.length?posts.map(post=><article className="community-post" key={post.id}><div className="community-post-head"><div className="avatar-mark">{(post.author_name||'?').slice(0,1).toUpperCase()}</div><div><strong>{post.author_name}</strong><small>{post.topic} · {new Date(post.created_at).toLocaleString('nn-NO')}</small></div>{(post.author_id===profile.id||staff)&&<button type="button" className="icon-button" aria-label="Slett innlegg" title="Slett innlegg" disabled={busy==='delete-'+post.id} onClick={()=>removePost(post)}><Trash2 size={15}/></button>}</div><p>{post.body}</p>{post.image_data&&<img className="community-post-image" src={post.image_data} alt="Bilete ved innlegget"/>}<div className="community-comments"><div className="community-comment-title"><MessageCircle size={14}/> {comments.filter(c=>c.post_id===post.id).length} kommentarar</div>{comments.filter(c=>c.post_id===post.id).map(c=><div className="community-comment" key={c.id}><strong>{c.author_name}</strong><span>{c.body}</span>{(c.author_id===profile.id||staff)&&<button type="button" className="icon-button" aria-label="Slett kommentar" title="Slett kommentar" disabled={busy==='comment-delete-'+c.id} onClick={()=>removeComment(c)}><Trash2 size={13}/></button>}</div>)}<form className="community-reply" onSubmit={e=>{e.preventDefault();comment(post)}}><input value={drafts[post.id]||''} onChange={e=>setDrafts(v=>({...v,[post.id]:e.target.value}))} placeholder="Skriv ein kommentar …"/><button className="secondary-button" disabled={busy===post.id}>Send</button></form></div></article>):<div className="empty-state">Det er stille i Garasjeprat enno. Start samtalen!</div>}
 </div>
}
