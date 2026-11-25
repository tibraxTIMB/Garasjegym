import {muscleProfile,MUSCLE_LABELS} from '../lib/muscleProfile.js'
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
function Figure({side,profile,heatCounts}){
 const heat=k=>{const v=heatCounts?.[k]||0;return v===0?'#627077':v>=4?'#e35f44':v>=2?'#eda748':'#ddc579'}
 const keys=side==='front'?['sideDelts','frontDelts','biceps','forearms','chest','abs','obliques','quads','adductors']:['rearDelts','triceps','forearms','upperBack','lats','lowerBack','abductors','glutes','hamstrings','calves']
 return <svg viewBox="0 0 70 150" aria-hidden="true"><ellipse cx="35" cy="13" rx="8" ry="10" className="gg-muscle-base"/><path className="gg-muscle-base" d="M29 22 Q35 24 41 22 L43 26 Q54 25 59 34 Q63 42 63 53 L66 72 Q71 83 65 88 Q60 91 57 80 L51 60 Q50 70 49 79 Q54 94 49 112 L48 132 Q51 142 46 146 L39 146 Q36 143 38 135 L36 111 L35 86 L34 111 L32 135 Q34 143 31 146 L24 146 Q19 142 22 132 L21 112 Q16 94 21 79 Q20 70 19 60 L13 80 Q10 91 5 88 Q-1 83 4 72 L7 53 Q7 42 11 34 Q16 25 27 26 Z"/>{keys.map(k=><path key={k} d={shape[k]} className={profile.primary.includes(k)?'gg-muscle-primary':profile.secondary.includes(k)?'gg-muscle-secondary':profile.stabilizers.includes(k)?'gg-muscle-stabilizer':'gg-muscle-neutral'} style={heatCounts?{fill:heat(k),opacity:1}:undefined}/>)}</svg>
}
export default function MuscleMap({items=[],heatCounts=null}){
 const p=muscleProfile(items)
 if(!p.known)return null
 const label=keys=>keys.map(k=>MUSCLE_LABELS[k]).join(', ')
 if(p.known===p.mobility)return <div className="gg-muscle-map"><small>Mobilitetsarbeid · ikkje rekna som styrkestimulus.</small></div>
 return <div className="gg-muscle-map" aria-label="Rettleiande muskelgrupper"><div className="gg-muscle-figures"><Figure side="front" profile={p} heatCounts={heatCounts}/><Figure side="back" profile={p} heatCounts={heatCounts}/></div><div><strong>{heatCounts?'Økter med primær involvering':'Muskelinvolvering'}</strong>{heatCounts?<small>{Object.entries(heatCounts).filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]).map(([k,n])=>MUSCLE_LABELS[k]+': '+n).join(' · ')||'Ingen registrert arbeid'}</small>:<><small>Primært: {label(p.primary)||'–'}</small>{p.secondary.length>0&&<small>Medverkande: {label(p.secondary)}</small>}{p.stabilizers.length>0&&<small>Stabilisering: {label(p.stabilizers)}</small>}</>}<small>{p.known} av {p.total} rørsler klassifiserte{p.unknown.length?' · ukjent: '+p.unknown.join(', '):''}</small>{heatCounts&&<small>Grå: 0 · gul: 1 · oransje: 2–3 · raud: 4+ økter</small>}<small>Djupare musklar blir viste i tekst. Rettleiande, ikkje målt aktivering.</small></div></div>
}
