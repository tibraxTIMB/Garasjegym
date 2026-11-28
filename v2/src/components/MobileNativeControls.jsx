import {useEffect,useId,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import {Check,X} from 'lucide-react'
import {chooseNativeSelectOption,nativeSelectOptions,nativeSelectTitle} from '../lib/nativeMobileControls.js'
import './garage-select.css'
import './mobile-native-controls.css'
import {DnaSheetHandle} from './DesignDNA.jsx'

/**
 * Mobile-only progressive enhancement for existing form selects.
 * Touch opens a GarasjeGym choice sheet; keyboard/screen reader activation
 * still has the standard accessible HTML select as a fallback.
 */
export default function MobileNativeControls(){
 const [picker,setPicker]=useState(null)
 const titleId=useId()
 const listRef=useRef(null)
 const sheetRef=useRef(null)
 const lastSelectRef=useRef(null)

 useEffect(()=>{
  let active=null
  let pending=null
  let suppressUntil=0
  function onPointerDown(event){
   if(!event.isPrimary||(event.pointerType!=='touch'&&event.pointerType!=='pen'))return
   const select=event.target?.closest?.('select')||
    (!event.target?.closest?.('button, input, textarea, a')&&event.target?.closest?.('label')?.querySelector('select'))
   if(!select||select.disabled||select.multiple||select.size>1||select.hasAttribute('data-native-picker'))return
   const options=nativeSelectOptions(select)
   if(!options.length)return
   // Prevent the Android system dropdown before it is opened by pointerup.
   event.preventDefault()
   event.stopPropagation()
   active=select
   pending={select,options,title:nativeSelectTitle(select),selectedIndex:select.selectedIndex,pointerId:event.pointerId,x:event.clientX,y:event.clientY}
   suppressUntil=performance.now()+800
  }
  function onPointerUp(event){
   if(!pending||event.pointerId!==pending.pointerId)return
   event.preventDefault()
   event.stopPropagation()
   const next=pending
   pending=null
   if(Math.hypot(event.clientX-next.x,event.clientY-next.y)>12)return
   if(!next.select.isConnected||next.select.disabled)return
   lastSelectRef.current=next.select
   next.select.blur()
   // Vent til Android har sendt klikket til den gamle kontrollen.
   // Å leggja arket over skjermen på pointerdown kunne opna og lukka det same trykket.
   window.setTimeout(()=>{
    if(next.select.isConnected&&!next.select.disabled)setPicker({select:next.select,options:nativeSelectOptions(next.select),title:nativeSelectTitle(next.select),selectedIndex:next.select.selectedIndex})
   },0)
  }
  function suppressNativeClick(event){
   if(active&&(event.target===active||event.target?.closest?.('label')?.contains(active))&&performance.now()<suppressUntil){
    event.preventDefault();event.stopPropagation()
   }
   active=null
  }
  function onPointerCancel(event){if(pending&&event.pointerId===pending.pointerId){pending=null;active=null}}
  function closeOnFullscreenChange(){setPicker(null)}
  document.addEventListener('pointerdown',onPointerDown,true)
  document.addEventListener('pointerup',onPointerUp,true)
  document.addEventListener('pointercancel',onPointerCancel,true)
  document.addEventListener('click',suppressNativeClick,true)
  document.addEventListener('fullscreenchange',closeOnFullscreenChange)
  return()=>{
   document.removeEventListener('pointerdown',onPointerDown,true)
   document.removeEventListener('pointerup',onPointerUp,true)
   document.removeEventListener('pointercancel',onPointerCancel,true)
   document.removeEventListener('click',suppressNativeClick,true)
   document.removeEventListener('fullscreenchange',closeOnFullscreenChange)
  }
 },[])

 useEffect(()=>{
  if(!picker)return undefined
  const previousOverflow=document.body.style.overflow
  document.body.style.overflow='hidden'
  const frame=requestAnimationFrame(()=>{
   const choices=[...(listRef.current?.querySelectorAll('[role="option"]:not([disabled])')||[])]
   const selectedChoice=choices.find(choice=>choice.getAttribute('aria-selected')==='true')||choices[0]
   if(selectedChoice)selectedChoice.focus()
   else sheetRef.current?.querySelector('.gg-select-close')?.focus()
  })
  return()=>{
   cancelAnimationFrame(frame)
   document.body.style.overflow=previousOverflow
   if(lastSelectRef.current?.isConnected)lastSelectRef.current.focus({preventScroll:true})
  }
 },[picker])

 function close(){setPicker(null)}
 function choose(index){
  if(chooseNativeSelectOption(picker.select,index))close()
 }
 function onKeyDown(event){
  if(event.key==='Escape'){event.preventDefault();close();return}
  const controls=[...(sheetRef.current?.querySelectorAll('button:not([disabled])')||[])]
  const choices=[...(listRef.current?.querySelectorAll('[role="option"]:not([disabled])')||[])]
  if(event.key==='Tab'&&controls.length){
   const index=controls.indexOf(document.activeElement)
   if((event.shiftKey&&index===0)||(!event.shiftKey&&index===controls.length-1)){
    event.preventDefault();controls[event.shiftKey?controls.length-1:0].focus()
   }
  }
  if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)&&choices.length){
   event.preventDefault()
   const index=choices.indexOf(document.activeElement)
   const next=event.key==='Home'?0:event.key==='End'?choices.length-1:
    (index+(event.key==='ArrowDown'?1:-1)+choices.length)%choices.length
   choices[next].focus()
  }
 }

 if(!picker)return null
 return createPortal(<div className="gg-select-backdrop gg-native-select-backdrop" onPointerDown={event=>event.stopPropagation()} onClick={close}>
  <section ref={sheetRef} className="gg-select-sheet gg-native-select-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={event=>event.stopPropagation()} onKeyDown={onKeyDown}>
   <DnaSheetHandle onClose={close}/><header><div><span className="section-kicker">GARASJEGYM · VAL</span><h2 id={titleId}>{picker.title}</h2></div><button type="button" className="gg-select-close" onClick={close} aria-label="Lukk val"><X size={20}/></button></header>
   <div className="gg-select-options" role="listbox" ref={listRef} aria-label={picker.title}>
    {picker.options.map((option,index)=><div key={index} className="gg-native-option-group">
     {option.group&&(index===0||picker.options[index-1].group!==option.group)&&<span className="gg-native-optgroup-label">{option.group}</span>}
     <button type="button" role="option" disabled={option.disabled} aria-selected={option.index===picker.selectedIndex} className={option.index===picker.selectedIndex?'selected':''} onClick={()=>choose(option.index)}>
      <span>{option.label}</span>{option.index===picker.selectedIndex&&<Check size={19}/>}
     </button>
    </div>)}
   </div>
  </section>
 </div>,document.fullscreenElement||document.body)
}
