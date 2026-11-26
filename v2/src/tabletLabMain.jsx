// Separate build: the Supabase module is replaced by an in-memory adapter.
import React from 'react'
import {createRoot} from 'react-dom/client'
import App from './App.jsx'
import MobileNativeControls from './components/MobileNativeControls.jsx'
import './styles.css'
import './app-shell-mobile.css'
import {LAB_CHANNEL,isLabMessage,labWod} from './lib/tabletLabProtocol.js'
import {setLabWod} from './tabletLabSupabase.js'
document.documentElement.dataset.ggTabletLab='true'
const origin=location.origin
window.addEventListener('message',event=>{
 if(event.origin!==origin||event.source!==window.parent||window.parent===window||!isLabMessage(event.data,'wod'))return
 try{setLabWod(labWod(event.data.wod));window.dispatchEvent(new Event('gg-tablet-lab-wod'))}
 catch(error){window.parent.postMessage({channel:LAB_CHANNEL,type:'error',message:error.message},origin)}
})
createRoot(document.getElementById('root')).render(<><div className="gg-lab-banner" role="status">TESTLAB · ingen resultat blir lagra i produksjon</div><MobileNativeControls/><App/></>)
if(window.parent!==window)window.parent.postMessage({channel:LAB_CHANNEL,type:'ready'},origin)
