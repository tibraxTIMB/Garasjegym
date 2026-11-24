import {useEffect,useRef} from 'react'
import {createPortal} from 'react-dom'
import {X} from 'lucide-react'
import RekordGorilla from './RekordGorilla.jsx'
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
  <div className="gg-victory-content"><p>49 GARASJEGYM · THE BIG SEVEN</p><h2 id="gg-victory-title">DU HAST <em>REKORD!</em></h2><RekordGorilla/><div className="gg-victory-subtitle">NY PERSONLEG REKORD!</div><div className="gg-victory-results">{victories.map(p=><article key={p.name}><span>{p.label}</span><strong>{Number(p.load_kg).toLocaleString('nn-NO')} <small>kg</small></strong><div className="gg-victory-gain">+{Number((p.load_kg-p.previous_kg).toFixed(3)).toLocaleString('nn-NO')} kg <span>frå førre rekord</span></div><div className="gg-victory-previous">Førre rekord: {Number(p.previous_kg).toLocaleString('nn-NO')} kg</div></article>)}</div><button ref={button} type="button" className="gg-victory-close" onClick={()=>close.current()}><X size={19}/> Vidare</button></div>
 </div>,document.body)
}
