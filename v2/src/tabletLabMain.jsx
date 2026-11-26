// Separate build: the Supabase module is replaced by an in-memory adapter.
import React from 'react'
import {createRoot} from 'react-dom/client'
import App from './App.jsx'
import MobileNativeControls from './components/MobileNativeControls.jsx'
import './styles.css'
import './app-shell-mobile.css'
import {LAB_CHANNEL,isLabMessage,labWod} from './lib/tabletLabProtocol.js'
import {setLabWod,setLabPlan} from './tabletLabSupabase.js'
document.documentElement.dataset.ggTabletLab='true'
const origin=location.origin
window.addEventListener('message',event=>{
 if(event.origin!==origin||event.source!==window.parent||window.parent===window)return
 try{if(isLabMessage(event.data,'wod')){setLabWod(labWod(event.data.wod));document.documentElement.dataset.ggLabContent='wod';window.dispatchEvent(new CustomEvent('gg-tablet-lab-content',{detail:'wod'}))}else if(isLabMessage(event.data,'plan')){setLabPlan(event.data.plan);document.documentElement.dataset.ggLabContent='plan';window.dispatchEvent(new CustomEvent('gg-tablet-lab-content',{detail:'plan'}))}}
 catch(error){window.parent.postMessage({channel:LAB_CHANNEL,type:'error',message:error.message},origin)}
})
createRoot(document.getElementById('root')).render(<><div className="gg-lab-banner" role="status">TESTLAB · ingen resultat blir lagra i produksjon</div><MobileNativeControls/><App/></>)

