import {useEffect,useState,useRef} from 'react'
import {CheckCircle2,LoaderCircle,MessageCircle,Send,Trash2,ThumbsUp,Heart,Flame,Dumbbell} from 'lucide-react'
import {supabase} from '../lib/supabase.js'
import {isStaff} from '../lib/auth.js'
import GarageOwnerBadge from './GarageOwnerBadge.jsx'

export default function Community({profile}){
 const staff=isStaff(profile)
 const publishing=useRef(false)
 const composer=useRef(null)
 const [posts,setPosts]=useState([]),[comments,setComments]=useState([])
 const [body,setBody]=useState(''),[topic,setTopic]=useState('Treningsprat'),[drafts,setDrafts]=useState({}),[imageData,setImageData]=useState('')
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('')
 async function load(silent=false){
  if(!silent)setLoading(true);setError('')
  const [p,c]=await Promise.all([
   supabase.from('social_posts').select('id,author_id,author_name,author_role,body,topic,kind,reactions,image_data,created_at').order('created_at',{ascending:false}).limit(60),
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
   const scale=Math.min(1,900/Math.max(image.width,image.height))
   const canvas=document.createElement('canvas')
   canvas.width=Math.max(1,Math.round(image.width*scale))
   canvas.height=Math.max(1,Math.round(image.height*scale))
   const context=canvas.getContext('2d')
   if(!context)throw new Error('Nettlesaren kan ikkje handsama biletet.')
   context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height)
   context.drawImage(image,0,0,canvas.width,canvas.height)
   const compressed=canvas.toDataURL('image/jpeg',0.66)
   if(compressed.length>450000)throw new Error('Biletet er for stort etter komprimering. Prøv eit mindre bilete.')
   setImageData(compressed)
  }catch(err){setError(err.message||'Kunne ikkje klargjera biletet.')}
 }
 function chooseTemplate(kind){
  if(publishing.current||body.trim()||imageData)return
  const templates={partner:['Sosialt','Nokon som vil trena saman?\nTid: \nØkt: '],invite:['Sosialt','Eg planlegg ei økt i garasjen.\nTid: \nOpplegg: '],achievement:['Resultat','Ein liten treningssiger: ']}
  const template=templates[kind]
  if(!template)return
  setTopic(template[0]);setBody(template[1]);composer.current?.focus()
 }
 async function publish(e){
  e.preventDefault();if(!body.trim()||publishing.current)return
  publishing.current=true;setBusy('post');setError('');setNotice('')
  try{
   const {data:{user},error:userError}=await supabase.auth.getUser()
   if(userError||!user||user.id!==profile.id)throw Error('Logg inn på nytt før publisering.')
   const {error:e}=await supabase.from('social_posts').insert({author_id:user.id,author_name:profile.display_name||'Medlem',author_role:profile.role||'member',body:body.trim(),topic,kind:'post',image_data:imageData||null})
   if(e)throw e
   setBody('');setImageData('');setNotice('Innlegget er publisert.');await load()
  }catch(e){setError(e.message||'Kunne ikkje publisera.')}
  finally{publishing.current=false;setBusy('')}
 }
 const reactionOptions=[
  {key:'like',label:'Likar',emoji:'👍',Icon:ThumbsUp},
  {key:'fire',label:'Sterkt',emoji:'🔥',Icon:Flame},
  {key:'muscle',label:'Sterk',emoji:'💪',Icon:Dumbbell},
  {key:'heart',label:'Hjarte',emoji:'❤️',Icon:Heart},
 ]
 async function toggleReaction(post,key){
  setBusy('reaction-'+post.id+'-'+key);setError('')
  try{
   const {data,error:e}=await supabase.rpc('toggle_social_reaction',{p_post_id:post.id,p_reaction:key})
   if(e)throw e
   setPosts(v=>v.map(row=>row.id===post.id?{...row,reactions:data||{}}:row))
  }catch(e){
   const message=e.message||'Kunne ikkje lagra reaksjonen.'
   setError(message.includes('toggle_social_reaction')?'Reaksjonar krev migrering 009 (social_reactions). '+message:message)
  }finally{setBusy('')}
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
  <form className="community-compose" onSubmit={publish}><div className="customer-home-quick-actions"><button type="button" disabled={!!body.trim()||!!imageData||busy==='post'} onClick={()=>chooseTemplate('partner')}>Finn treningspartnar</button><button type="button" disabled={!!body.trim()||!!imageData||busy==='post'} onClick={()=>chooseTemplate('invite')}>Inviter til trening</button><button type="button" disabled={!!body.trim()||!!imageData||busy==='post'} onClick={()=>chooseTemplate('achievement')}>Del ein siger</button></div><small>Dette lagar berre eit utkast. Innlegget blir synleg for fellesskapet først når du publiserer. Ei invitasjon er ikkje ei booking.</small><label>Del noko med gjengen<textarea ref={composer} value={body} onChange={e=>setBody(e.target.value)} rows="3" maxLength="3000" placeholder="Treningsglede, spørsmål, resultat eller ein liten siger …" required/></label><div className="community-compose-foot"><select value={topic} onChange={e=>setTopic(e.target.value)}><option>Treningsprat</option><option>Resultat</option><option>Spørsmål</option><option>Sosialt</option></select><label className="secondary-button">Legg ved bilete<input type="file" accept="image/*" onChange={chooseImage} hidden/></label><button className="primary-button" disabled={busy==='post'}><Send size={15}/>{busy==='post'?'Publiserer …':'Publiser innlegg'}</button></div>{imageData&&<div className="community-image-preview"><img src={imageData} alt="Førehandsvising av vedlagt bilete"/><button type="button" className="secondary-button" onClick={()=>setImageData('')}>Fjern bilete</button></div>}</form>
  {posts.length?posts.map(post=><article className="community-post" key={post.id}><div className="community-post-head"><div className="avatar-mark">{(post.author_name||'?').slice(0,1).toUpperCase()}</div><div className="community-author-identity"><div className="community-author-line"><strong>{post.author_name}</strong><GarageOwnerBadge userId={post.author_id}/></div><small>{post.topic} · {new Date(post.created_at).toLocaleString('nn-NO')}</small></div>{(post.author_id===profile.id||staff)&&<button type="button" className="icon-button" aria-label="Slett innlegg" title="Slett innlegg" disabled={busy==='delete-'+post.id} onClick={()=>removePost(post)}><Trash2 size={15}/></button>}</div><p>{post.body}</p>{post.image_data&&<img className="community-post-image" src={post.image_data} alt="Bilete ved innlegget"/>}<div className="community-reactions">{reactionOptions.map(({key,label,emoji})=>{const users=Array.isArray(post.reactions?.[key])?post.reactions[key]:[];const selected=users.includes(profile.id);return <button type="button" key={key} className={selected?'secondary-button active':'secondary-button'} disabled={busy==='reaction-'+post.id+'-'+key} onClick={()=>toggleReaction(post,key)} aria-pressed={selected}>{emoji} {users.length||''} <span>{label}</span></button>})}</div><div className="community-comments"><div className="community-comment-title"><MessageCircle size={14}/> {comments.filter(c=>c.post_id===post.id).length} kommentarar</div>{comments.filter(c=>c.post_id===post.id).map(c=><div className="community-comment" key={c.id}><div className="community-comment-author"><strong>{c.author_name}</strong><GarageOwnerBadge userId={c.author_id}/></div><span>{c.body}</span>{(c.author_id===profile.id||staff)&&<button type="button" className="icon-button" aria-label="Slett kommentar" title="Slett kommentar" disabled={busy==='comment-delete-'+c.id} onClick={()=>removeComment(c)}><Trash2 size={13}/></button>}</div>)}<form className="community-reply" onSubmit={e=>{e.preventDefault();comment(post)}}><input value={drafts[post.id]||''} onChange={e=>setDrafts(v=>({...v,[post.id]:e.target.value}))} placeholder="Skriv ein kommentar …"/><button className="secondary-button" disabled={busy===post.id}>Send</button></form></div></article>):<div className="empty-state">Det er stille i Garasjeprat enno. Start samtalen!</div>}
 </div>
}
