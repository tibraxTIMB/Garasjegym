import {muscleProfile,MUSCLE_LABELS} from '../lib/muscleProfile.js'
import './muscle-map.css'
const shape={
 shoulders:'M22 26 Q12 26 10 39 L18 45 L25 37 Z M48 26 Q58 26 60 39 L52 45 L45 37 Z',
 arms:'M10 40 L18 46 L15 65 L11 82 L5 80 L7 61 Z M60 40 L52 46 L55 65 L59 82 L65 80 L63 61 Z',
 chest:'M24 29 L34 31 L34 47 L23 44 L20 36 Z M46 29 L36 31 L36 47 L47 44 L50 36 Z',
 back:'M24 29 L35 31 L46 29 L50 38 L42 57 L35 53 L28 57 L20 38 Z',
 core:'M26 48 L44 48 L43 65 L35 70 L27 65 Z',
 glutes:'M23 64 Q35 60 47 64 L48 79 L35 83 L22 79 Z',
 quads:'M22 79 L34 83 L32 109 L23 111 L19 90 Z M48 79 L36 83 L38 109 L47 111 L51 90 Z',
 hamstrings:'M22 79 L34 83 L32 109 L23 111 L19 90 Z M48 79 L36 83 L38 109 L47 111 L51 90 Z',
 calves:'M23 113 L32 112 L30 139 L22 139 L20 125 Z M47 113 L38 112 L40 139 L48 139 L50 125 Z'
}
function Figure({side,profile,heatCounts}){
 const max=Math.max(1,...Object.values(heatCounts||{}))
 const heat=k=>{const v=(heatCounts?.[k]||0)/max;return v===0?'#627077':v>=.75?'#e35f44':v>=.4?'#eda748':'#ddc579'}
 const keys=side==='front'?['shoulders','arms','chest','core','quads','calves']:['shoulders','arms','back','glutes','hamstrings','calves']
 return <svg viewBox="0 0 70 150" aria-hidden="true"><circle cx="35" cy="13" r="10" className="gg-muscle-base"/><path className="gg-muscle-base" d="M28 22 L42 22 L57 29 L64 43 L69 81 L59 87 L52 62 L49 80 L52 106 L49 141 L39 146 L36 112 L35 88 L34 112 L31 146 L21 141 L18 106 L21 80 L18 62 L11 87 L1 81 L6 43 L13 29 Z"/>{keys.map(k=><path key={k} d={shape[k]} className={profile.primary.includes(k)?'gg-muscle-primary':profile.secondary.includes(k)?'gg-muscle-secondary':'gg-muscle-neutral'} style={heatCounts?{fill:heat(k),opacity:1}:undefined}/>)}</svg>
}
export default function MuscleMap({items=[],heatCounts=null}){
 const p=muscleProfile(items)
 if(!p.known)return null
 return <div className="gg-muscle-map" aria-label="Omtrentlege muskelgrupper"><div className="gg-muscle-figures"><Figure side="front" profile={p} heatCounts={heatCounts}/><Figure side="back" profile={p} heatCounts={heatCounts}/></div><div><strong>{heatCounts?'Relativ øvingsførekomst':'Muskelgrupper'}</strong><small>Primært: {p.primary.map(k=>MUSCLE_LABELS[k]).join(', ')}</small>{p.secondary.length>0&&<small>Sekundært: {p.secondary.map(k=>MUSCLE_LABELS[k]).join(', ')}</small>}<small>Rettleiande · {p.known} av {p.total} rørsler klassifiserte</small></div></div>
}
