import {synchronAnatomyRows} from '../lib/synchronAnatomy.js'
import React,{useState} from 'react'
import {documentedExerciseRows,plannedAnatomyRows,muscleExerciseEvidence,summarizeMuscleExposure,MUSCLE_LABELS} from '../lib/anatomicalIntelligence.js'
import {BODY_REGIONS,BODY_OUTLINE,muscleMapRole} from '../lib/anatomyMap.js'

const roleLabels={primary:'Primær',secondary:'Sekundær',stabilizing:'Stabilisering'}
const colors={primary:'#2d9d78',secondary:'#d9a441',stabilizing:'#6f91bc',none:'#9299a4'}
const mapLabels={...roleLabels,none:'Ingen dokumentert aktivitet'}
function BodyMap({side,roles,selected,onSelect,planned=false}){
 return <figure style={{margin:0,minWidth:0,textAlign:'center'}}>
  <figcaption>{side==='front'?'Framside':'Bakside'}</figcaption>
  <svg viewBox="0 0 120 240" width="100%" style={{maxWidth:180,display:'block',margin:'0 auto'}} role="group" aria-label={'Skjematisk muskelkart · '+(side==='front'?'framside':'bakside')}>
   <path d={BODY_OUTLINE} fill="currentColor" fillOpacity=".09" stroke="currentColor" strokeOpacity=".4" strokeWidth="1"/>
   {BODY_REGIONS[side].map(([muscle,d])=>{const role=muscleMapRole(roles[muscle]);return <path key={muscle} d={d} fill={colors[role]} fillOpacity={role==='none'?.22:.85} stroke={selected===muscle?'currentColor':'#ffffff'} strokeWidth={selected===muscle?2.3:.7} role="button" tabIndex={0} aria-pressed={selected===muscle} aria-label={MUSCLE_LABELS[muscle]+', '+(planned&&role==='none'?'Ikkje markert':mapLabels[role])} style={{cursor:'pointer'}} onClick={()=>onSelect(muscle)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(muscle)}}}><title>{MUSCLE_LABELS[muscle]} · {(planned&&role==='none'?'Ikkje markert':mapLabels[role])}</title></path>})}
  </svg>
 </figure>
}
export default function AnatomyEvidence({exercises=[],scope='Registrerte øvingar',planned=false,expanded=false,observedSegments=null,compact=false}){
 const [selected,setSelected]=useState(null)
 const observed=observedSegments!==null
 const rows=observed?synchronAnatomyRows(observedSegments):planned?plannedAnatomyRows(exercises):documentedExerciseRows(exercises)
 const unit=observed?'observerte arbeidsbolkar':planned?'rørsler':'registreringar'
 const result=summarizeMuscleExposure(rows)
 const evidence=muscleExerciseEvidence(rows)
 const confirmed=rows.filter(r=>r.evidenceKind==='confirmed').length
 const complex=rows.filter(r=>r.evidenceKind==='complex').length
 const selectedEvidence=evidence.get(selected)
 const select=muscle=>setSelected(old=>old===muscle?null:muscle)
 const Wrapper=compact?'section':'details'
 return <Wrapper className={compact?'gg-pt-muscle-compact':'engine-section'} {...(compact?{'aria-label':'Muskelkart · '+scope}:{open:expanded||undefined})}>
  {compact?<><h4>Muskelkart</h4><small>{scope}{planned?' · ikkje personleg belastning':''}</small></>:<summary>Muskelgrupper · {scope}</summary>}
  {!compact&&<p>{observed?'Berre uavhengig observerte arbeidsbolkar som samsvarar med godkjende resultat. Øvingsklassifiseringa viser sannsynleg anatomisk rolle.':planned?'Planlagd anatomisk involvering. Ikkje dokumentert gjennomføring.':'Basert på registrert arbeid og stadfesta øvingar.'} Ikkje målt belastning eller restitusjon.</p>}
  {!compact&&<small>{result.classifiedSets} klassifiserte {unit} · {result.unclassifiedSets} uklassifiserte {unit}{!planned&&confirmed>0?' · '+confirmed+' stadfesta utan måling':''}{!planned&&complex>0?' · '+complex+' kompleksrørsler':''}</small>}
  <div className="gg-fw-anatomy-map" style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:8,maxWidth:compact?270:420,margin:'8px auto'}}>
   <BodyMap side="front" roles={result.roles} selected={selected} onSelect={select} planned={planned}/>
   <BodyMap side="back" roles={result.roles} selected={selected} onSelect={select} planned={planned}/>
  </div>
  <div style={{display:'flex',flexWrap:'wrap',gap:'6px 12px',fontSize:'0.8rem'}} aria-label="Fargeforklaring, ikkje filter">{Object.entries(colors).map(([key,color])=><span key={key}><span aria-hidden="true" style={{display:'inline-block',width:10,height:10,borderRadius:3,background:color,marginRight:5}}/>{planned&&key==='none'?'Ikkje markert':mapLabels[key]}</span>)}</div>
  <small>{compact?'Anatomiske roller, ikkje målt muskelkraft.':'Skjematiske regionar. Fargen viser anatomisk rolle, ikkje intensitet. Rotatormansjett, hoftebøyarar og hofteabduktorar kan veljast i lista. Begge sider vert viste likt når side ikkje er dokumentert.'}</small>
  {!compact&&(observed?<small>Tal viser observerte bolkar, ikkje effektiv arbeidstid, repetisjonar, sett eller muskelbelastning. Ikkje innlemma i ordinær individuell muskelstatistikk.</small>:!planned&&<small>Tal viser registrerte rørsleførekomstar, ikkje samla reps, settvolum eller belastning.</small>)}
  <label style={{display:'block',marginTop:12}}>Vel muskelgruppe <select value={selected||''} onChange={e=>setSelected(e.target.value||null)} style={{display:'block',maxWidth:'100%'}}><option value="">Alle muskelgrupper</option>{Object.entries(MUSCLE_LABELS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
  {selected&&<section aria-live="polite"><h4>{MUSCLE_LABELS[selected]}</h4>{selectedEvidence?Object.entries(selectedEvidence).filter(([,names])=>names.size).map(([role,names])=><p key={role}><strong>{roleLabels[role]} · {result.roles[selected][role]} {unit}</strong> · {[...names].join(', ')}</p>):<p>Ingen oppføringar for denne gruppa i utvalet.</p>}</section>}
  {!compact&&!selected&&(evidence.size?<details className="gg-anatomy-evidence-list"><summary>Øvingar per muskelgruppe</summary>{[...evidence].map(([muscle,roles])=><details key={muscle}>
    <summary>{MUSCLE_LABELS[muscle]}</summary>
    {Object.entries(roles).filter(([,names])=>names.size).map(([role,names])=><p key={role}><strong>{roleLabels[role]}</strong> · {[...names].join(', ')}</p>)}
  </details>)}</details>:<p>Ingen klassifiserte øvingar med slike resultat.</p>)}
  {result.unclassified.length>0&&<p>Uklassifiserte øvingar: {result.unclassified.join(', ')}</p>}
 </Wrapper>
}
