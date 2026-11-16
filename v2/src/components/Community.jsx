import {useEffect,useState} from 'react'
import {CheckCircle2,LoaderCircle,MessageCircle,Send} from 'lucide-react'
import {supabase} from '../lib/supabase.js'

export default function Community({profile}){
 const [posts,setPosts]=useState([]),[comments,setComments]=useState([])
 const [body,setBody]=useState(''),[topic,setTopic]=useState('Treningsprat'),[drafts,setDrafts]=useState({})
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('')
 async function load(){
  setLoading(true);setError('')
  const [p,c]=await Promise.all([
   supabase.from('social_posts').select('id,author_id,author_name,body,topic,kind,created_at').order('created_at',{ascending:false}).limit(60),
   supabase.from('social_comments').select('id,post_id,author_id,author_name,body,created_at').order('created_at',{ascending:true}).limit(200)
  ])
  if(p.error)setError(p.error.message);else setPosts(p.data||[])
  if(c.error)setError(c.error.message);else setComments(c.data||[])
  setLoading(false)
 }
 useEffect(()=>{load()},[])
 async function publish(e){
  e.preventDefault();if(!body.trim())return
  setBusy('post');setError('');setNotice('')
  try{
   const {data:{user}}=await supabase.auth.getUser()
   const {error:e}=await supabase.from('social_posts').insert({author_id:user.id,author_name:profile.display_name||user.email,body:body.trim(),topic,kind:'post'})
   if(e)throw e
   setBody('');setNotice('Innlegget er publisert.');await load()
  }catch(e){setError(e.message||'Kunne ikkje publisera.')}
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
  <form className="community-compose" onSubmit={publish}><label>Del noko med gjengen<textarea value={body} onChange={e=>setBody(e.target.value)} rows="3" maxLength="3000" placeholder="Treningsglede, spørsmål, resultat eller ein liten siger …" required/></label><div className="community-compose-foot"><select value={topic} onChange={e=>setTopic(e.target.value)}><option>Treningsprat</option><option>Resultat</option><option>Spørsmål</option><option>Sosialt</option></select><button className="primary-button" disabled={busy==='post'}><Send size={15}/>{busy==='post'?'Publiserer …':'Publiser innlegg'}</button></div></form>
  {posts.length?posts.map(post=><article className="community-post" key={post.id}><div className="community-post-head"><div className="avatar-mark">{(post.author_name||'?').slice(0,1).toUpperCase()}</div><div><strong>{post.author_name}</strong><small>{post.topic} · {new Date(post.created_at).toLocaleString('nn-NO')}</small></div></div><p>{post.body}</p><div className="community-comments"><div className="community-comment-title"><MessageCircle size={14}/> {comments.filter(c=>c.post_id===post.id).length} kommentarar</div>{comments.filter(c=>c.post_id===post.id).map(c=><div className="community-comment" key={c.id}><strong>{c.author_name}</strong><span>{c.body}</span></div>)}<form className="community-reply" onSubmit={e=>{e.preventDefault();comment(post)}}><input value={drafts[post.id]||''} onChange={e=>setDrafts(v=>({...v,[post.id]:e.target.value}))} placeholder="Skriv ein kommentar …"/><button className="secondary-button" disabled={busy===post.id}>Send</button></form></div></article>):<div className="empty-state">Det er stille i Garasjeprat enno. Start samtalen!</div>}
 </div>
}
