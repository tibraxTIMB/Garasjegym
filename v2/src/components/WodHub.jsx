import {useState} from 'react'
import {BookOpen,WandSparkles} from 'lucide-react'
import WodBuilder from './WodBuilder.jsx'
import WodLibrary from './WodLibrary.jsx'

export default function WodHub({onLaunchWod,staff}){
 const [tab,setTab]=useState(staff?'library':'library')
 return <div className="wod-hub">
  <div className="training-heading"><div><span className="section-kicker">TRENINGSPROGRAM</span><h3>WOD</h3><p>Finn ei økt, start trening eller bygg og administrer WOD-ar.</p></div></div>
  <div className="hub-tabs" role="tablist" aria-label="WOD">
   <button type="button" role="tab" aria-selected={tab==='library'} className={tab==='library'?'selected':''} onClick={()=>setTab('library')}><BookOpen size={16}/> WOD-bibliotek</button>
   {staff&&<button type="button" role="tab" aria-selected={tab==='builder'} className={tab==='builder'?'selected':''} onClick={()=>setTab('builder')}><WandSparkles size={16}/> Bygg WOD</button>}
  </div>
  {tab==='library'?<WodLibrary staff={staff} onLaunchWod={onLaunchWod}/>:<WodBuilder/>}
 </div>
}