import {useEffect,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import {X} from 'lucide-react'
import RekordGorilla from './RekordGorilla.jsx'
import RekordLift from './RekordLift.jsx'
import './pr-victory-overlay.css'
export default function PRVictoryOverlay({victories,onClose}){
 const close=useRef(onClose),button=useRef(null),dialog=useRef(null)
 const [selected,setSelected]=useState(0)
 const p=victories[Math.min(selected,victories.length-1)]
 close.current=onClose
 useEffect(()=>{
  const previous=document.activeElement
  button.current?.focus()
  const timer=victories.length===1?window.setTimeout(()=>close.current(),12000):null
  const keyboard=e=>{if(e.key==='Escape'){e.preventDefault();close.current()}else if(e.key==='Tab'){const bs=[...dialog.current.querySelectorAll('button')];if(e.shiftKey&&document.activeElement===bs[0]){e.preventDefault();bs.at(-1)?.focus()}else if(!e.shiftKey&&document.activeElement===bs.at(-1)){e.preventDefault();bs[0]?.focus()}}}
  window.addEventListener('keydown',keyboard)
  return()=>{window.clearTimeout(timer);window.removeEventListener('keydown',keyboard);if(previous?.isConnected)previous.focus?.()}
 },[victories.length])
 if(!victories.length)return null
 return createPortal(<div ref={dialog} className="gg-victory-overlay" role="dialog" aria-modal="true" aria-labelledby="gg-victory-title">
 <div className="gg-victory-stage">
  <section className="gg-victory-hero"><header><p>49 GARASJEGYM · THE BIG SEVEN</p><h2 id="gg-victory-title">DU HAST <em>REKORD!</em></h2></header><div className="gg-victory-scene"><RekordGorilla/></div></section>
  <section className="gg-victory-record" aria-label="Ny personleg rekord">
   {victories.length>1&&<nav className="gg-victory-tabs" aria-label="Vel rekord">{victories.map((v,i)=><button type="button" key={v.name} aria-pressed={i===selected} onClick={()=>setSelected(i)}>{v.label}</button>)}</nav>}
   <div className="gg-victory-result"><div className="gg-victory-subtitle">NY PERSONLEG REKORD</div><h3>{p.label}</h3><strong className="gg-victory-weight">{Number(p.load_kg).toLocaleString('nn-NO')} <small>kg</small></strong><div className="gg-victory-gain">+{Number((p.load_kg-p.previous_kg).toFixed(3)).toLocaleString('nn-NO')} kg <span>frå førre rekord</span></div><div className="gg-victory-previous">Førre rekord: {Number(p.previous_kg).toLocaleString('nn-NO')} kg</div></div>
   <div className="gg-victory-lift"><RekordLift name={p.name} label={p.label}/></div>
  </section>
  <footer className="gg-victory-footer"><button ref={button} type="button" className="gg-victory-close" onClick={()=>close.current()}><X size={18}/> Vidare</button></footer>
 </div></div>,document.body)
}
