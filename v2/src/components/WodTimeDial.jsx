import { useRef,useState } from 'react'
import './design-dna.css'
import { clampWodDuration, dialValueFromPoint } from '../lib/wodTimeDial.js'

const pad = value => String(value).padStart(2, '0')

export default function WodTimeDial({ label, value, onChange, unit = 'min', maximum = 600 }) {
  const dragging = useRef(false)
  const [expanded,setExpanded]=useState(false)
  const number = clampWodDuration(value, maximum)
  const dialNumber = Math.min(60, number)
  const theta = dialNumber / 60 * Math.PI * 2 - Math.PI / 2
  const markerX = 120 + 87 * Math.cos(theta)
  const markerY = 120 + 87 * Math.sin(theta)
  const display = unit === 'sek' ? `${pad(Math.floor(number / 60))}:${pad(number % 60)}` : `${pad(number)}:00`

  const set = next => onChange(String(clampWodDuration(next, maximum)))
  const readPointer = event => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width * 240 - 120
    const y = (event.clientY - rect.top) / rect.height * 240 - 120
    set(dialValueFromPoint(x, y))
  }

  return <section className="gg-analog-time" aria-label={label}>
    <button type="button" className="gg-dna-duration-toggle" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)}><span>{label}</span><strong>{display}</strong><span>{expanded?'−':'+'}</span></button>
    {expanded&&<div className="gg-analog-time-wheel">
      <svg className="gg-time-clock-face" viewBox="0 0 240 240" role="slider" tabIndex={0} aria-label={`${label}, ${number} ${unit}`} aria-valuemin={1} aria-valuemax={maximum} aria-valuenow={number} aria-valuetext={`${number} ${unit}`} onKeyDown={event => {if(event.key==='ArrowRight'||event.key==='ArrowUp'){event.preventDefault();set(number+1)}else if(event.key==='ArrowLeft'||event.key==='ArrowDown'){event.preventDefault();set(number-1)}else if(event.key==='Home'){event.preventDefault();set(1)}else if(event.key==='End'){event.preventDefault();set(maximum)}}} onPointerDown={event => {event.currentTarget.setPointerCapture(event.pointerId);dragging.current=true;readPointer(event)}} onPointerMove={event => {if(dragging.current)readPointer(event)}} onPointerUp={event => {if(dragging.current)readPointer(event);dragging.current=false;if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)}} onPointerCancel={() => {dragging.current=false}}>
        <circle cx="120" cy="120" r="87" fill="#0d171c" stroke="#354b56" strokeWidth="11"/>
        <circle cx="120" cy="120" r="87" fill="none" stroke="#ee9d34" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${2*Math.PI*87*dialNumber/60} ${2*Math.PI*87}`} transform="rotate(-90 120 120)"/>
        {Array.from({length:60},(_,i)=>{const a=i/60*Math.PI*2-Math.PI/2;const major=i%5===0;return <line key={i} x1={120+Math.cos(a)*(major?73:78)} y1={120+Math.sin(a)*(major?73:78)} x2={120+Math.cos(a)*81} y2={120+Math.sin(a)*81} stroke={major?'#ffd39a':'#768e99'} strokeWidth={major?2:1}/>})}
        {Array.from({length:12},(_,i)=>{const n=(i+1)*5;const a=n/60*Math.PI*2-Math.PI/2;return <text key={n} x={120+Math.cos(a)*103} y={124+Math.sin(a)*103} fill="#dae5e9" fontSize="12" fontWeight="700" textAnchor="middle">{n}</text>})}
        <line x1="120" y1="120" x2={markerX} y2={markerY} stroke="#ffb457" strokeWidth="4" strokeLinecap="round"/>
        <circle cx={markerX} cy={markerY} r="8" fill="#ffac3c" stroke="#fff2d4" strokeWidth="2"/>
        <circle cx="120" cy="120" r="5" fill="#ffbc62"/>
        <text x="120" y="154" textAnchor="middle" fill="#f2a64c" fontSize="12" fontWeight="800">{unit === 'sek' ? 'SEKUND' : 'MINUTT'}</text>
      </svg>
      <div className="gg-time-clock-readout" aria-live="polite"><strong>{display}</strong></div>
    </div>}
    <div className="gg-time-adjust"><button type="button" aria-label="Reduser med eitt" onClick={() => set(number-1)}>−</button><label>Eige val ({unit})<input type="number" min="1" max={maximum} value={value} onChange={event => onChange(event.target.value)} onBlur={() => set(value)}/></label><button type="button" aria-label="Auk med eitt" onClick={() => set(number+1)}>+</button></div>
    {expanded && number > 60 && <small className="gg-time-overflow-note">Over 60 {unit}: bruk talfeltet. Urskiva viser dei første 60.</small>}
  </section>
}
