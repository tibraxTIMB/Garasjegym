import {useRef} from 'react'
import {ArrowLeft,ArrowRight,ArrowDown,Check,Delete} from 'lucide-react'
import {DNA_NUMBER_KEYS,shouldDismissSheet} from '../lib/designDNA.js'
import './design-dna.css'

// One visual key matrix for builder and results. Each host retains its domain validation.
export function DnaKeyMatrix({onKey,onPrevious,onNext,onSame,previousDisabled=false,last=false,decimal=false,time=false,negative=false,feedback,preventFocus=false}){
 const protect=preventFocus?e=>e.preventDefault():undefined
 const keyButton=(key,label,disabled=false)=> <button type="button" key={key} disabled={disabled} data-feedback={feedback?.key===key?feedback.kind:undefined} aria-label={key==='backspace'?'Slett siste siffer':key==='clear'?'Tøm felt':undefined} onPointerDown={protect} onClick={()=>onKey(key)}>{label}</button>
 return <div className="gg-dna-keys" role="group" aria-label="Numerisk tastatur">
  {DNA_NUMBER_KEYS.map(key=>key==='previous'?<button key={key} type="button" aria-label="Førre felt" disabled={previousDisabled} onPointerDown={protect} onClick={onPrevious}><ArrowLeft size={20}/></button>:key==='same'?<button key={key} type="button" aria-label="Neste felt av same type" disabled={!onSame} onPointerDown={protect} onClick={onSame}><ArrowDown size={20}/></button>:key==='next'?<button key={key} type="button" className="gg-dna-next" aria-label={last?'Ferdig':'Neste talfelt'} onPointerDown={protect} onClick={onNext}>{last?<Check size={20}/>:<ArrowRight size={20}/>}</button>:key==='separator'?keyButton(time?':':',',time?':':',',!time&&!decimal):key==='reset'?keyButton(negative?'-':'clear',negative?'−':'C'):keyButton(key,key==='backspace'?<Delete size={19}/>:key))}
 </div>
}
export function DnaChoice({label,value,options,onChange,disabled=false}){
 return <div className="gg-dna-choice" role="group" aria-label={label}>{options.map(option=><button key={option.value} type="button" aria-pressed={value===option.value} disabled={disabled||option.disabled} onClick={()=>onChange(option.value)}>{option.label}</button>)}</div>
}
export function DnaSheetHandle({onClose}){
 const start=useRef(null)
 return <button type="button" className="gg-dna-sheet-handle" aria-label="Lukk valark" onClick={onClose} onPointerDown={e=>{if(!e.isPrimary)return;start.current={id:e.pointerId,x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture?.(e.pointerId)}} onPointerUp={e=>{const s=start.current;start.current=null;if(s&&s.id===e.pointerId&&shouldDismissSheet(e.clientX-s.x,e.clientY-s.y))onClose()}} onPointerCancel={()=>{start.current=null}}><span aria-hidden="true"/></button>
}
export function DnaDateTimeInput({type,...props}){
 return <input {...props} type={type} className={'gg-dna-date-time '+(props.className||'')}/>
}
