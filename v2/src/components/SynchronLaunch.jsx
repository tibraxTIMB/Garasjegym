import React,{useEffect,useMemo,useState} from 'react'
import SynchronSessionPanel from './SynchronSessionPanel.jsx'
// Bound to one authenticated runtime and one invitation by the App route key.
// Opening is read-only; the participant must explicitly join in the panel.
export default function SynchronLaunch({runtime,href,onBack}){
 const [result,setResult]=useState(null),[attempt,setAttempt]=useState(0),[online,setOnline]=useState(()=>navigator.onLine)
 useEffect(()=>{
  const update=()=>setOnline(navigator.onLine)
  window.addEventListener('online',update);window.addEventListener('offline',update)
  return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update)}
 },[])
 useEffect(()=>{
  let live=true
  setResult(null)
  runtime.open(href).then(r=>{if(live)setResult(r)}).catch(()=>{if(live)setResult({issue:'Kunne ikkje opna fellesøkta.'})})
  return()=>{live=false}
 },[runtime,href,attempt])
 const adapter=useMemo(()=>result?.sessionId?runtime.adapter(result.sessionId):null,[runtime,result])
 return <section className="content-card training-content">
  <button type="button" className="secondary-button" onClick={onBack}>Tilbake</button>
  {!result?<p role="status">Kontrollerer tilgang til fellesøkta …</p>:result.issue||!adapter?<><p role="alert">{result.issue||'Fellesøkta er ikkje tilgjengeleg.'}</p><button type="button" className="secondary-button" onClick={()=>setAttempt(v=>v+1)}>Prøv igjen</button></>:<SynchronSessionPanel key={result.sessionId} adapter={adapter} label={result.snapshot.leader?'PT · øktleiar':'Mi fellesøkt'} online={online}/>}
 </section>
}
