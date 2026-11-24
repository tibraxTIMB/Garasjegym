import {useEffect,useRef} from 'react'
import {createPortal} from 'react-dom'
import {Trophy,X} from 'lucide-react'
import './pr-victory-overlay.css'
export default function PRVictoryOverlay({victories,onClose}){
 const close=useRef(onClose),button=useRef(null)
 close.current=onClose
 useEffect(()=>{
  const previous=document.activeElement
  button.current?.focus()
  const timer=window.setTimeout(()=>close.current(),12000)
  const keyboard=e=>{if(e.key==='Escape'){e.preventDefault();close.current()}else if(e.key==='Tab'){e.preventDefault();button.current?.focus()}}
  window.addEventListener('keydown',keyboard)
  return()=>{window.clearTimeout(timer);window.removeEventListener('keydown',keyboard);if(previous?.isConnected)previous.focus?.()}
 },[])
 if(!victories.length)return null
 return createPortal(<div className="gg-victory-overlay" role="dialog" aria-modal="true" aria-labelledby="gg-victory-title">
  <div className="gg-victory-rays" aria-hidden="true"/>
  <div className="gg-victory-content"><div className="gg-victory-emblem"><Trophy size={76} strokeWidth={1.5}/></div><p>THE BIG SEVEN · STURMKOPF</p><h2 id="gg-victory-title">PR VICTORY</h2><div className="gg-victory-subtitle">NY PERSONLEG REKORD!</div><div className="gg-victory-results">{victories.map(p=><article key={p.name}><span>{p.label}</span><strong>{p.load_kg} <small>kg</small></strong><div>{p.previous_kg} kg → {p.load_kg} kg · +{Number((p.load_kg-p.previous_kg).toFixed(3))} kg</div></article>)}</div><button ref={button} type="button" className="gg-victory-close" onClick={()=>close.current()}><X size={19}/> Vidare</button></div>
 </div>,document.body)
}
