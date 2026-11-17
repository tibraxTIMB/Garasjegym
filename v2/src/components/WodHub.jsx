import {useState} from 'react'
import {BookOpen,WandSparkles} from 'lucide-react'
import WodBuilder from './WodBuilder.jsx'
import WodLibrary from './WodLibrary.jsx'

export default function WodHub({onLaunchWod,staff,focusWodId=null,onFocusConsumed}){
 const [tab,setTab]=useState('library')
 const [editWodId,setEditWodId]=useState(null)
 function editWod(id){setEditWodId(id);setTab('builder')}
 function saved(){setEditWodId(null);setTab('library')}
 return <div className="wod-hub">
  <div className="training-heading"><div><span className="section-kicker">TRENINGSPROGRAM</span><h3>WOD</h3><p>Finn, bygg, rediger og administrer treningsøkter.</p></div></div>
  <div className="hub-tabs" role="tablist" aria-label="WOD">
   <button type="button" role="tab" aria-selected={tab==='library'} className={tab==='library'?'selected':''} onClick={()=>{setTab('library');setEditWodId(null)}}><BookOpen size={16}/> Bibliotek</button>
   {staff&&<button type="button" role="tab" aria-selected={tab==='builder'} className={tab==='builder'?'selected':''} onClick={()=>{setTab('builder');setEditWodId(null)}}><WandSparkles size={16}/> {editWodId?'Rediger WOD':'Bygg WOD'}</button>}
  </div>
  {tab==='library'?<WodLibrary key="library" staff={staff} onLaunchWod={onLaunchWod} onEditWod={editWod} focusWodId={focusWodId} onFocusConsumed={onFocusConsumed}/>:<WodBuilder key={editWodId||'new'} editWodId={editWodId} onSaved={saved}/>}
 </div>
}
