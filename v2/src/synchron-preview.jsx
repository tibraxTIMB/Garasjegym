import React,{useMemo,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {createSynchronSession} from './lib/synchron.js'
import {createSynchronGateway} from './lib/synchronTransport.js'
import SynchronSessionPanel from './components/SynchronSessionPanel.jsx'
import './styles.css'
import './components/timer-viewport.css'
// Local dev-only fixture. Never reads authentication, user records or production DB.
function fixture(){
 const moves=[['step','Box step-ups','reps',100,'estimate'],['hang','Dead hang','seconds',180,'clock'],['wall','Wall ball shots','reps',150,'estimate'],['row','Row','meters',2000,'hybrid']]
 const plan={id:'four-fronts-test',title:'Four Fronts',leaderId:'demo-a',members:['demo-a','demo-b'],movements:moves.map(([id,name,unit,target,method])=>({id,exerciseId:id,name,unit,target,method,collaboration:'relay',doses:{'demo-a':{variant:id==='step'?'50 cm':'Standard',loadKg:id==='wall'?9:null},'demo-b':{variant:id==='step'?'40 cm':'Tilpassa',loadKg:id==='wall'?4:null}}}))}
 let state=createSynchronSession(plan)
 const clone=x=>JSON.parse(JSON.stringify(x))
 const calibrations=plan.movements.flatMap(m=>plan.members.flatMap((memberId,i)=>m.unit==='reps'||m.unit==='meters'?[{memberId,exerciseId:m.exerciseId,variant:m.doses[memberId].variant,loadKg:m.doses[memberId].loadKg,unit:m.unit,source:'observed',perMinute:m.unit==='meters'?(i===0?230:200):(i===0?22:18)}]:[]))
 const gateway=createSynchronGateway({readCalibrations:async()=>calibrations,authenticate:async key=>['demo-a','demo-b'].includes(key)?key:null,read:async id=>id===plan.id?clone(state):null,compareAndSwap:async(id,rev,next)=>{if(id!==plan.id||rev!==state.revision)return false;state=clone(next);return true},now:()=>Date.now()})
 return actor=>({read:()=>gateway.snapshot(plan.id,actor),command:cmd=>gateway.command(plan.id,actor,cmd)})
}
function Demo(){
 const adapters=useMemo(()=>{const make=fixture();return [make('demo-a'),make('demo-b')]},[]),[online,setOnline]=useState(true)
 return <main className="gg-sync-preview"><h1>SYNCHRON · utviklingstest</h1><p>To simulerte einingar, same økt. Ingen ekte brukarar, nettverk eller treningslogg. Kalibreringstala er syntetiske testdata. Last sida på nytt for å nullstilla testdata.</p><button className="secondary-button" onClick={()=>setOnline(v=>!v)}>{online?'Simuler nettutfall for kunden':'Kople kunden til att'}</button><div className="gg-sync-preview-grid"><SynchronSessionPanel adapter={adapters[0]} label="PT · utøvar 1"/><SynchronSessionPanel adapter={adapters[1]} label="Kunde · utøvar 2" online={online}/></div></main>
}
if(import.meta.env.DEV)createRoot(document.getElementById('root')).render(<Demo/>)
