import React from 'react'
import {ptPreparation} from '../lib/ptFlow.js'
export default function PTPreparation({session}){
 const p=ptPreparation(session)
 if(!p.format&&!p.minutes&&!p.focus&&!p.note&&!p.preparation&&!p.materials)return null
 return <details className="customer-plan-details">
  <summary>Førebu økta</summary>
  <div style={{display:'grid',gap:4,padding:'8px 0'}}>
   {(p.format||p.minutes)&&<small>{[p.format,p.minutes?p.minutes+' min':null].filter(Boolean).join(' · ')}</small>}
   {p.focus&&<div><strong>Fokus:</strong> {p.focus}</div>}
   {p.preparation&&<div><strong>Førebuing:</strong> {p.preparation}</div>}
   {p.materials&&<div><strong>Utstyr og materiell:</strong> {p.materials}</div>}
   {p.note&&<div><strong>PT-notat:</strong> {p.note}</div>}
  </div>
 </details>
}
