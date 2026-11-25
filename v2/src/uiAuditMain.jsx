// Browser audit only. Excluded from the production entrypoint.
import {useState} from 'react'
import {createRoot} from 'react-dom/client'
import WodBuilder from './components/WodBuilder.jsx'
import PTStudio from './components/PTStudio.jsx'
import MyTraining from './components/MyTraining.jsx'
import WodCard from './components/WodCard.jsx'
import MobileNativeControls from './components/MobileNativeControls.jsx'
import {FlowEntryProvider,FlowNumberInput,FlowKeypad,FlowConfirmDialog} from './components/FlowEntry.jsx'
import {MusicProvider} from './components/Music.jsx'
import './styles.css'
import './app-shell-mobile.css'
const screen=new URLSearchParams(location.search).get('screen')||'flow'
const profile={id:'demo-admin',display_name:'Demo-eigar',role:'admin',active:true,membership_status:'approved'}
const longName='Alternating Dumbbell Push Jerk – teknisk innøving og kontrollert arbeidsvekt'
const wod={id:'audit-wod',name:'Introkurs – '+longName,format:'AMRAP',duration_minutes:8,notes:'Lett belastning.',movements:'8 reps',timer_settings:{workout_schema:{format:'AMRAP',duration_seconds:480,items:[{exercise_name:longName,reps:8,levels:Object.fromEntries(['rx','intermediate','scaled','foundation'].map(x=>[x,{reps:'8',loadMode:'kg',loadKg:'12.5'}]))}]}}}
function FlowFixture(){
 const [a,setA]=useState(''),[b,setB]=useState(''),[level,setLevel]=useState('scaled'),[confirm,setConfirm]=useState(false)
 return <div className="gg-training-session"><div className="workout-finish-backdrop"><section className="workout-finish-dialog gg-result-wizard" role="dialog" aria-label="Resultat">
 <div className="workout-finish-head gg-result-header"><div><span className="section-kicker">RESULTAT</span><h3>{longName}</h3><small>Del 3 av 4</small></div><button className="gg-result-close" aria-label="Lukk">×</button></div>
 <FlowEntryProvider><div className="gg-result-body">
 <div className="gg-flow-level"><div className="gg-flow-level-buttons">{['RX','Intermediate','Scaled','Foundation'].map(x=><button key={x} className={level===x.toLowerCase()?'selected':''} onClick={()=>setLevel(x.toLowerCase())}>{x}</button>)}</div></div>
 <div className="gg-flow-score-load"><div className="gg-flow-score-load-row"><span>{longName}</span><label>kg<FlowNumberInput aria-label="Arbeidsvekt kg" field="load_kg" inputMode="decimal" step="any" min="0" value={a} onChange={e=>setA(e.target.value)}/></label></div></div>
 <div className="gg-composite-score-fields"><label>Repetisjonar<FlowNumberInput aria-label="Repetisjonar" inputMode="numeric" value={b} onChange={e=>setB(e.target.value)}/></label></div>
 <label className="gg-flow-confirm"><input type="checkbox"/>Økta er utført · også utan måleresultat</label>
 <button type="button" onClick={()=>setConfirm(true)}>Forkast økta</button>
 </div><FlowKeypad/><div className="gg-result-footer"><div className="gg-result-nav"><button>Neste del</button></div></div></FlowEntryProvider>
 <FlowConfirmDialog dialog={confirm?{title:'Forkast denne økta?',message:longName,confirmLabel:'Ja, forkast',cancelLabel:'Avbryt',danger:true}:null} onClose={()=>setConfirm(false)}/>
 </section></div></div>
}
function Audit(){
 const [choice,setChoice]=useState('a')
 return <MusicProvider memberId="demo-admin"><MobileNativeControls/><div className="app-shell simple-app-shell"><main className="main simple-app-main"><section className="content-card training-content">
 {screen==='flow'?<FlowFixture/>:screen==='card'?<WodCard wod={wod} memberId="demo-member" onClose={()=>{}} onLaunch={()=>{}}/>:screen==='builder'?<WodBuilder/>:screen==='pt'?<PTStudio profile={profile} initialClientId="demo-member" initialTab="program"/>:screen==='plan'?<MyTraining simpleMode={true}/>:<label>Vel eit alternativ med eit langt namn<select aria-label="Testval" value={choice} onChange={e=>setChoice(e.target.value)}><option value="a">Første alternativ</option><option value="b">{longName}</option></select><output>{choice}</output></label>}
 </section></main></div></MusicProvider>
}
createRoot(document.getElementById('root')).render(<Audit/>)
