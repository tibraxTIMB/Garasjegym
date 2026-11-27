import React from 'react'
import {summarizeSynchronTimeline} from '../lib/synchronDisposition.js'
const units={reps:'reps',seconds:'sek',meters:'m',calories:'cal'}
const fmt=n=>Number.isFinite(n)?n.toLocaleString('nn-NO',{maximumFractionDigits:1}):'—'
export default function SynchronDisposition({timeline}){
 const s=summarizeSynchronTimeline(timeline)
 if(!s.rows.length)return null
 return <details className="gg-sync-review"><summary>Arbeidsbolkar og tempo</summary>
  <div className="gg-sync-status"><strong>{fmt(s.assignedSeconds)} sek tildelt arbeid</strong><small>{s.rows.length} bolkar · {s.observedCount} observerte</small></div>
  <small>{fmt(s.gapSeconds)} sek mellom eigne bolkar. Dette omfattar venting, byte og eventuelle pausar; ikkje målt kvile.</small>
  {s.rows.map(r=><article className="gg-sync-review" key={r.ordinal}>
   <div className="gg-sync-status"><strong>{r.ordinal}. {r.exerciseName}</strong><small>{fmt(r.durationMs/1000)} sek</small></div>
   <small>{r.variant}{r.loadKg!==null?' · '+fmt(r.loadKg)+' kg':''}{r.gapSeconds!==null?' · '+fmt(r.gapSeconds)+' sek sidan førre bolk':''}</small>
   {r.observed?<div><strong>{fmt(r.pacePerMinute)} {units[r.unit]}/min</strong><small> · {r.observed.amount} {units[r.unit]} observert i tildelt bolk</small></div>:<small>Tempo ikkje observert.</small>}
   {r.changePercent!==null&&<small>Tempoendring mot bolk {r.comparedWith}: {r.changePercent>0?'+':''}{fmt(r.changePercent)} %</small>}
  </article>)}
  {!s.comparisonCount&&<small>Ingen to etterfølgjande, samanliknbare observerte bolkar.</small>}
  <small>Tempo blir berre samanlikna ved same øving, variant, vekt og måleeining, og bolklengd innan 10 % av den kortaste. Tempoendring dokumenterer ikkje årsak, fysiologisk trøyttleik eller restitusjon.</small>
 </details>
}
