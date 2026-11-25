import {muscleProfile,MUSCLE_LABELS} from '../lib/muscleProfile.js'
import './muscle-map.css'
// Simplified regions; deep muscles are represented in text, not falsely drawn on the surface.
const shape={
 "frontDelts": "M22 26 Q12 26 10 37 L18 40 L25 33 Z M48 26 Q58 26 60 37 L52 40 L45 33 Z",
 "sideDelts": "M15 28 L10 35 L10 41 L15 43 L20 37 Z M55 28 L60 35 L60 41 L55 43 L50 37 Z",
 "rearDelts": "M22 26 Q12 26 11 37 L18 43 L25 34 Z M48 26 Q58 26 59 37 L52 43 L45 34 Z",
 "biceps": "M12 43 L18 45 L15 60 L9 60 Z M58 43 L52 45 L55 60 L61 60 Z",
 "triceps": "M12 43 L18 45 L15 60 L9 60 Z M58 43 L52 45 L55 60 L61 60 Z",
 "forearms": "M9 62 L15 62 L11 82 L5 80 Z M61 62 L55 62 L59 82 L65 80 Z",
 "chest": "M24 29 L34 31 L34 47 L23 44 L20 36 Z M46 29 L36 31 L36 47 L47 44 L50 36 Z",
 "upperBack": "M24 29 L35 24 L46 29 L43 42 L35 49 L27 42 Z",
 "lats": "M21 38 L27 44 L33 51 L29 62 L23 53 Z M49 38 L43 44 L37 51 L41 62 L47 53 Z",
 "lowerBack": "M30 52 L34 48 L34 65 L29 64 Z M40 52 L36 48 L36 65 L41 64 Z",
 "abs": "M30 47 L40 47 L39 65 L35 70 L31 65 Z",
 "obliques": "M24 47 L29 48 L29 65 L24 61 Z M46 47 L41 48 L41 65 L46 61 Z",
 "glutes": "M25 66 Q35 61 34 82 L24 79 Z M45 66 Q35 61 36 82 L46 79 Z",
 "abductors": "M22 65 L26 65 L24 81 L19 78 Z M48 65 L44 65 L46 81 L51 78 Z",
 "quads": "M22 79 L31 83 L30 109 L23 111 L19 90 Z M48 79 L39 83 L40 109 L47 111 L51 90 Z",
 "adductors": "M32 84 L34 86 L33 106 L30 105 Z M38 84 L36 86 L37 106 L40 105 Z",
 "hamstrings": "M22 81 L34 85 L32 109 L23 111 L19 90 Z M48 81 L36 85 L38 109 L47 111 L51 90 Z",
 "calves": "M23 113 L32 112 L30 139 L22 139 L20 125 Z M47 113 L38 112 L40 139 L48 139 L50 125 Z"
}
function Figure({side,profile,heatCounts}){
 const heat=k=>{const v=heatCounts?.[k]||0;return v===0?'#627077':v>=4?'#e35f44':v>=2?'#eda748':'#ddc579'}
 const keys=side==='front'?['sideDelts','frontDelts','biceps','forearms','chest','abs','obliques','quads','adductors','calves']:['rearDelts','triceps','forearms','upperBack','lats','lowerBack','abductors','glutes','hamstrings','calves']
 return <svg viewBox="0 0 70 150" aria-hidden="true"><circle cx="35" cy="13" r="10" className="gg-muscle-base"/><path className="gg-muscle-base" d="M28 22 L42 22 L57 29 L64 43 L69 81 L59 87 L52 62 L49 80 L52 106 L49 141 L39 146 L36 112 L35 88 L34 112 L31 146 L21 141 L18 106 L21 80 L18 62 L11 87 L1 81 L6 43 L13 29 Z"/>{keys.map(k=><path key={k} d={shape[k]} className={profile.primary.includes(k)?'gg-muscle-primary':profile.secondary.includes(k)?'gg-muscle-secondary':profile.stabilizers.includes(k)?'gg-muscle-stabilizer':'gg-muscle-neutral'} style={heatCounts?{fill:heat(k),opacity:1}:undefined}/>)}</svg>
}
export default function MuscleMap({items=[],heatCounts=null}){
 const p=muscleProfile(items)
 if(!p.known)return null
 const label=keys=>keys.map(k=>MUSCLE_LABELS[k]).join(', ')
 if(p.known===p.mobility)return <div className="gg-muscle-map"><small>Mobilitetsarbeid · ikkje rekna som styrkestimulus.</small></div>
 return <div className="gg-muscle-map" aria-label="Rettleiande muskelgrupper"><div className="gg-muscle-figures"><Figure side="front" profile={p} heatCounts={heatCounts}/><Figure side="back" profile={p} heatCounts={heatCounts}/></div><div><strong>{heatCounts?'Økter med primær involvering':'Muskelinvolvering'}</strong>{heatCounts?<small>{Object.entries(heatCounts).filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]).map(([k,n])=>MUSCLE_LABELS[k]+': '+n).join(' · ')||'Ingen registrert arbeid'}</small>:<><small>Primært: {label(p.primary)||'–'}</small>{p.secondary.length>0&&<small>Medverkande: {label(p.secondary)}</small>}{p.stabilizers.length>0&&<small>Stabilisering: {label(p.stabilizers)}</small>}</>}<small>{p.known} av {p.total} rørsler klassifiserte{p.unknown.length?' · ukjent: '+p.unknown.join(', '):''}</small>{heatCounts&&<small>Grå: 0 · gul: 1 · oransje: 2–3 · raud: 4+ økter</small>}<small>Djupare musklar blir viste i tekst. Rettleiande, ikkje målt aktivering.</small></div></div>
}
