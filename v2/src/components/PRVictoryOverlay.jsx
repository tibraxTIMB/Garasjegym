import {useEffect,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import panserGorilla from '../assets/pansergorilla-rekord.webp'
import './pr-victory-overlay.css'

// One still image for every confirmed PR. No exercise animation or video.
export default function PRVictoryOverlay({victories,onClose}){
 const close=useRef(onClose),button=useRef(null)
 const [imageFailed,setImageFailed]=useState(false)
 close.current=onClose
 useEffect(()=>{
  if(!victories.length)return
  const previous=document.activeElement
  button.current?.focus()
  const timer=window.setTimeout(()=>close.current(),12000)
  const keyboard=e=>{if(e.key==='Escape'){e.preventDefault();close.current()}else if(e.key==='Tab'){e.preventDefault();button.current?.focus()}}
  window.addEventListener('keydown',keyboard)
  return()=>{window.clearTimeout(timer);window.removeEventListener('keydown',keyboard);if(previous?.isConnected)previous.focus?.()}
 },[victories.length])
 if(!victories.length)return null
 return createPortal(<div className="gg-victory-overlay" role="dialog" aria-modal="true" aria-labelledby="gg-victory-title">
  <div className="gg-victory-poster">
   <h2 id="gg-victory-title">DU HAST <em>REKORD!</em></h2>
   <div className="gg-victory-picture"><img src={imageFailed?import.meta.env.BASE_URL+'garasjegym-49-512.png':panserGorilla} onError={()=>setImageFailed(true)} alt="PanserGorilla feirar med armane i vêret i garasjen" width="384" height="564" /></div>
   <button ref={button} type="button" className="gg-victory-close" onClick={()=>close.current()}>Vidare</button>
  </div>
 </div>,document.body)
}
