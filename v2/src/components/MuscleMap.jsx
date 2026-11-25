import {useState} from 'react'
import {muscleProfile,MUSCLE_LABELS} from '../lib/muscleProfile.js'
import {muscleGradeSummary,rankedMuscles,muscleRegionFor,MUSCLE_REGIONS,MUSCLE_GRADE_COLORS,MUSCLE_GRADE_LABELS} from '../lib/muscleGrades.js'
import './muscle-map.css'
// Simplified regions; deep muscles are represented in text, not falsely drawn on the surface.
const shape={
 "frontDelts": "M22 28 Q13 27 11 36 Q14 43 19 40 Q24 35 25 32 Z M48 28 Q57 27 59 36 Q56 43 51 40 Q46 35 45 32 Z",
 "sideDelts": "M15 28 L10 35 L10 41 L15 43 L20 37 Z M55 28 L60 35 L60 41 L55 43 L50 37 Z",
 "rearDelts": "M22 26 Q12 26 11 37 L18 43 L25 34 Z M48 26 Q58 26 59 37 L52 43 L45 34 Z",
 "biceps": "M12 43 L18 45 L15 60 L9 60 Z M58 43 L52 45 L55 60 L61 60 Z",
 "triceps": "M12 43 L18 45 L15 60 L9 60 Z M58 43 L52 45 L55 60 L61 60 Z",
 "forearms": "M9 62 L15 62 L11 82 L5 80 Z M61 62 L55 62 L59 82 L65 80 Z",
 "chest": "M25 30 Q30 28 34 32 L34 46 Q26 48 22 43 Q20 37 25 30 Z M45 30 Q40 28 36 32 L36 46 Q44 48 48 43 Q50 37 45 30 Z",
 "upperBack": "M24 29 L35 24 L46 29 L43 42 L35 49 L27 42 Z",
 "lats": "M21 38 L27 44 L33 51 L29 62 L23 53 Z M49 38 L43 44 L37 51 L41 62 L47 53 Z",
 "lowerBack": "M30 52 L34 48 L34 65 L29 64 Z M40 52 L36 48 L36 65 L41 64 Z",
 "abs": "M30 47 L40 47 L39 65 L35 70 L31 65 Z",
 "obliques": "M24 47 L29 48 L29 65 L24 61 Z M46 47 L41 48 L41 65 L46 61 Z",
 "glutes": "M25 66 Q35 61 34 82 L24 79 Z M45 66 Q35 61 36 82 L46 79 Z",
 "abductors": "M22 65 L26 65 L24 81 L19 78 Z M48 65 L44 65 L46 81 L51 78 Z",
 "quads": "M23 80 Q28 80 31 84 Q34 97 29 109 Q23 114 21 104 Q18 90 23 80 Z M47 80 Q42 80 39 84 Q36 97 41 109 Q47 114 49 104 Q52 90 47 80 Z",
 "adductors": "M32 84 L34 86 L33 106 L30 105 Z M38 84 L36 86 L37 106 L40 105 Z",
 "hamstrings": "M23 82 Q29 81 34 86 Q34 101 30 110 Q23 114 21 104 Q18 90 23 82 Z M47 82 Q41 81 36 86 Q36 101 40 110 Q47 114 49 104 Q52 90 47 82 Z",
 "calves": "M25 113 Q30 111 32 118 Q34 125 29 135 L26 138 Q22 131 21 123 Q20 115 25 113 Z M45 113 Q40 111 38 118 Q36 125 41 135 L44 138 Q48 131 49 123 Q50 115 45 113 Z"
}
const frequencyColor=n=>!n?'#62686e':n>=4?'#e25240':n>=2?'#ed963a':'#ddc45c'
function Figure({side,summary,heatCounts,interactive,onSelect,region}){
 const keys=side==='front'?['sideDelts','frontDelts','biceps','forearms','chest','abs','obliques','quads','adductors']:['rearDelts','triceps','forearms','upperBack','lats','lowerBack','abductors','glutes','hamstrings','calves']
 return <svg viewBox="0 0 70 150" role={interactive?'group':undefined} aria-label={interactive?(side==='front'?'Framside – trykk på ein kroppsregion':'Bakside – trykk på ein kroppsregion'):undefined} aria-hidden={!interactive}><ellipse cx="35" cy="13" rx="8" ry="10" className="gg-muscle-base"/><path className="gg-muscle-base" d="M29 22 Q35 24 41 22 L43 26 Q54 25 59 34 Q63 42 63 53 L66 72 Q71 83 65 88 Q60 91 57 80 L51 60 Q50 70 49 79 Q54 94 49 112 L48 132 Q51 142 46 146 L39 146 Q36 143 38 135 L36 111 L35 86 L34 111 L32 135 Q34 143 31 146 L24 146 Q19 142 22 132 L21 112 Q16 94 21 79 Q20 70 19 60 L13 80 Q10 91 5 88 Q-1 83 4 72 L7 53 Q7 42 11 34 Q16 25 27 26 Z"/>{keys.map(k=>{const value=heatCounts?(heatCounts[k]||0):(summary.grades[k]||0);return <path key={k} d={shape[k]} className={'gg-muscle-region'+(interactive?' is-interactive':'')+(region&&muscleRegionFor(k)===region?' is-selected':'')} style={{fill:heatCounts?frequencyColor(value):MUSCLE_GRADE_COLORS[value]}} role={interactive?'button':undefined} tabIndex={interactive?0:undefined} aria-label={interactive?MUSCLE_LABELS[k]+': '+(heatCounts?value+' økter':MUSCLE_GRADE_LABELS[value]):undefined} onClick={interactive?()=>onSelect(muscleRegionFor(k),k):undefined} onKeyDown={interactive?e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(muscleRegionFor(k),k)}}:undefined}><title>{MUSCLE_LABELS[k]}</title></path>})}</svg>
}
export default function MuscleMap({items=[],heatCounts=null,interactive=false}){
 const [region,setRegion]=useState(null),[selected,setSelected]=useState(null)
 const p=muscleProfile(items),summary=muscleGradeSummary(items)
 const choose=(r,k=null)=>{setRegion(r);setSelected(k)}
 const ranks=rankedMuscles(summary,region).sort((a,b)=>heatCounts?(heatCounts[b.key]||0)-(heatCounts[a.key]||0):b.grade-a.grade)
 if(!p.known)return interactive?<p>Ingen klassifiserte øvingar enno. Ukjende øvingar får ikkje automatisk muskelprofil.</p>:null
 if(p.known===p.mobility)return <div className="gg-muscle-map"><small>Mobilitetsarbeid · ikkje gradert som styrke- eller kraftarbeid.</small></div>
 const gradeText=heatCounts?'Økter med stor eller svært stor forventa involvering':'Forventa muskelinvolvering'
 const top=rankedMuscles(summary).filter(x=>x.grade>=3)
 return <div className={'gg-muscle-map'+(interactive?' gg-muscle-explorer':'')} aria-label="Rettleiande muskelgrupper">
 <div className="gg-muscle-figures">{['front','back'].map(side=><div key={side} className="gg-muscle-figure"><Figure side={side} summary={summary} heatCounts={heatCounts} interactive={interactive} onSelect={choose} region={region}/>{interactive&&<small>{side==='front'?'Framside':'Bakside'}</small>}</div>)}</div>
 <div className="gg-muscle-content"><strong>{gradeText}</strong>
 {interactive?<><div className="gg-muscle-legend">{(heatCounts?[['#62686e','0 økter'],['#ddc45c','1 økt'],['#ed963a','2–3 økter'],['#e25240','4+ økter']]:MUSCLE_GRADE_LABELS.slice(1).reverse().map((label,i)=>[MUSCLE_GRADE_COLORS[4-i],label])).map(([color,label])=><span key={label}><i style={{background:color}}/>{label}</span>)}</div>
 <small>Trykk på kartet eller vel kroppsregion.</small><div className="gg-muscle-regions">{Object.keys(MUSCLE_REGIONS).map(r=><button type="button" key={r} aria-pressed={r===region} onClick={()=>choose(region===r?null:r)}>{r}</button>)}</div>
 <div className="gg-muscle-ranked"><strong>{region||'Muskelgrupper frå mest til minst'}</strong>{ranks.filter(x=>region|| (heatCounts?(heatCounts[x.key]||0)>0:x.grade>0)).map(x=>{const n=heatCounts?(heatCounts[x.key]||0):x.grade;return <div key={x.key} className="gg-muscle-rank"><button type="button" aria-expanded={selected===x.key} onClick={()=>setSelected(selected===x.key?null:x.key)}><span>{x.label}</span><span className="gg-muscle-rank-value"><i style={{background:heatCounts?frequencyColor(n):MUSCLE_GRADE_COLORS[n]}}/>{heatCounts?n+' økter':MUSCLE_GRADE_LABELS[n]}</span></button>{selected===x.key&&<div className="gg-muscle-explanation">{heatCounts?<small>Registrert øktfrekvens, ikkje total belastning eller restitusjon.</small>:x.details.length?x.details.map(d=><small key={d.name}><b>{d.name}</b> · {MUSCLE_GRADE_LABELS[d.grade]} · {d.role}</small>):<small>Ikkje markert i dei klassifiserte øvingane.</small>}</div>}</div>})}</div></>:<small>{top.map(x=>x.label).join(', ')||'Ingen store involveringsgrader registrerte'}</small>}
 <small>{summary.known} av {summary.total} rørsler klassifiserte{summary.unknown.length?' · ukjent: '+summary.unknown.join(', '):''}</small><small>{heatCounts?'Grått betyr ingen registrerte treff i dette datagrunnlaget.':'Høgaste forventa grad per muskelgruppe, ikkje summerte belastningstal. Grått betyr ikkje markert.'} Rettleiande, ikkje målt muskelkraft.</small></div></div>
}
