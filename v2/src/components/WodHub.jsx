import {useState} from 'react'
import {BookOpen,WandSparkles,Plus} from 'lucide-react'
import WodBuilder from './WodBuilder.jsx'
import WodLibrary from './WodLibrary.jsx'

export default function WodHub({onLaunchWod,staff,isAdmin=false,focusWodId=null,onFocusConsumed,simpleMode=false,launchAssignmentId=null,launchClassSessionId=null}){
 const [tab,setTab]=useState('library')
 const [editWodId,setEditWodId]=useState(null)
 function editWod(id){setEditWodId(id);setTab('builder')}
 function saved(){setEditWodId(null);setTab('library')}
 return <div className={simpleMode?'wod-hub simple-wod-hub':'wod-hub'}>
  {!simpleMode&&<div className="training-heading"><div><span className="section-kicker">TRENINGSPROGRAM</span><h3>WOD</h3><p>Finn, bygg, rediger og administrer treningsøkter.</p></div>{staff&&<button type="button" className="primary-button" onClick={()=>{setEditWodId(null);setTab("builder")}}><Plus size={15}/> Opprett WOD</button>}</div>}
  {!simpleMode&&<div className="hub-tabs" role="tablist" aria-label="WOD">
   <button type="button" role="tab" aria-selected={tab==='library'} className={tab==='library'?'selected':''} onClick={()=>{setTab('library');setEditWodId(null)}}><BookOpen size={16}/> Bibliotek</button>
   {staff&&<button type="button" role="tab" aria-selected={tab==='builder'} className={tab==='builder'?'selected':''} onClick={()=>{setTab('builder');setEditWodId(null)}}><WandSparkles size={16}/> {editWodId?'Rediger WOD':'Bygg WOD'}</button>}
  </div>}
  {tab==='library'?<WodLibrary key="library" staff={staff} isAdmin={isAdmin} simpleMode={simpleMode} onLaunchWod={(wodId)=>onLaunchWod?.(wodId,launchAssignmentId,launchClassSessionId)} onEditWod={editWod} focusWodId={focusWodId} onFocusConsumed={onFocusConsumed}/>:<WodBuilder key={editWodId||'new'} editWodId={editWodId} onSaved={saved} onCancel={()=>{setEditWodId(null);setTab('library')}}/>}
 </div>
}
