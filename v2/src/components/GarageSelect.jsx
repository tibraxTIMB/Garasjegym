import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import './garage-select.css'
import {DnaSheetHandle} from './DesignDNA.jsx'

// Styled choice sheet for the most-used mobile selections. Keeps native form
// controls elsewhere, where keyboard and specialised platform input are useful.
export default function GarageSelect({label='',value='',options=[],onChange=()=>{},placeholder='Vel eit alternativ',disabled=false,className=''}) {
  const [open,setOpen]=useState(false)
  const titleId=useId()
  const triggerRef=useRef(null)
  const listRef=useRef(null)
  const sheetRef=useRef(null)
  const selected=options.find(option=>String(option.value)===String(value))

  useEffect(()=>{
    if(!open)return undefined
    const previous=document.body.style.overflow
    document.body.style.overflow='hidden'
    const focus=()=>{const rows=[...(listRef.current?.querySelectorAll('[role="option"]:not([disabled])')||[])];(rows.find(row=>row.getAttribute('aria-selected')==='true')||rows[0]||sheetRef.current?.querySelector('.gg-select-close'))?.focus()}
    const frame=requestAnimationFrame(focus)
    const onKey=event=>{
      if(event.key==='Escape'){event.preventDefault();setOpen(false)}
      if(event.key==='Tab'){event.preventDefault();const controls=[...(sheetRef.current?.querySelectorAll('button:not([disabled])')||[])];if(!controls.length)return;const index=controls.indexOf(document.activeElement);controls[(index+(event.shiftKey?-1:1)+controls.length)%controls.length]?.focus()}
      if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();const rows=[...(listRef.current?.querySelectorAll('[role="option"]:not([disabled])')||[])];if(!rows.length)return;const index=rows.indexOf(document.activeElement);const next=event.key==='Home'?0:event.key==='End'?rows.length-1:index<0?(event.key==='ArrowDown'?0:rows.length-1):(index+(event.key==='ArrowDown'?1:-1)+rows.length)%rows.length;rows[next]?.focus()}
    }
    window.addEventListener('keydown',onKey)
    return()=>{cancelAnimationFrame(frame);document.body.style.overflow=previous;window.removeEventListener('keydown',onKey);if(triggerRef.current?.isConnected)triggerRef.current.focus()}
  },[open])

  useEffect(()=>{if(disabled&&open)setOpen(false)},[disabled,open])
  function choose(next){if(disabled||!options.some(o=>String(o.value)===String(next)&&!o.disabled))return;onChange(next);setOpen(false)}
  return <>
    <button ref={triggerRef} type="button" className={'gg-garage-select '+className} aria-label={label||'Vel eit alternativ'} aria-haspopup="dialog" aria-expanded={open} disabled={disabled} onClick={()=>setOpen(true)}><span className={selected?'':'gg-garage-select-placeholder'}>{selected?.label||placeholder}</span><ChevronDown size={17}/></button>
    {open&&createPortal(<div className="gg-select-backdrop" onClick={()=>setOpen(false)}><section ref={sheetRef} className="gg-select-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={event=>event.stopPropagation()}><DnaSheetHandle onClose={()=>setOpen(false)}/><header><div><span className="section-kicker">GARASJEGYM · VAL</span><h2 id={titleId}>{label||'Vel eit alternativ'}</h2></div><button type="button" className="gg-select-close" onClick={()=>setOpen(false)} aria-label="Lukk val"><X size={20}/></button></header><div className="gg-select-options" role="listbox" ref={listRef} aria-label={label||'Alternativ'}>{options.map(option=><button role="option" type="button" key={String(option.value)} disabled={!!option.disabled} aria-selected={String(value)===String(option.value)} className={String(value)===String(option.value)?'selected':''} onClick={()=>choose(option.value)}><span>{option.label}</span>{String(value)===String(option.value)&&<Check size={19}/>}</button>)}</div></section></div>,document.fullscreenElement||document.body)}
  </>
}
