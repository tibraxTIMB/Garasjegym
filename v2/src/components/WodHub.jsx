import {useEffect,useState} from 'react'
import {BookOpen,WandSparkles,Plus} from 'lucide-react'
import WodBuilder from './WodBuilder.jsx'
import WodLibrary from './WodLibrary.jsx'
import './wod-compact.css'

export default function WodHub({onLaunchWod,staff,isAdmin=false,focusWodId=null,onFocusConsumed,simpleMode=false,launchAssignmentId=null,launchClassSessionId=null,initialImportedWod=null,onImportConsumed,initialBuilder=false,onBuilderConsumed,officeMode=false,onPreview}){
 const [tab,setTab]=useState((initialImportedWod&&isAdmin)||(initialBuilder&&staff)?'builder':'library')
 useEffect(()=>{if(initialBuilder&&staff){setTab('builder');onBuilderConsumed?.()}},[initialBuilder,staff])
 const [editWodId,setEditWodId]=useState(null),[copyMode,setCopyMode]=useState(false)
 function editWod(id){setCopyMode(false);setEditWodId(id);setTab('builder')}
 function copyWod(id){setCopyMode(true);setEditWodId(id);setTab('builder')}
 function saved(){setCopyMode(false);setEditWodId(null);setTab('library')}
 return <div className={simpleMode?'wod-hub simple-wod-hub':'wod-hub'}>
  {!simpleMode&&<div className="training-heading wod-hub-compact-head"><div><h3>WOD</h3></div>{staff&&<button type="button" className="primary-button" onClick={()=>{setCopyMode(false);setEditWodId(null);setTab("builder")}}><Plus size={15}/> Opprett WOD</button>}</div>}
  {!simpleMode&&<div className="hub-tabs" role="tablist" aria-label="WOD">
   <button type="button" role="tab" aria-selected={tab==='library'} className={tab==='library'?'selected':''} onClick={()=>{setTab('library');setCopyMode(false);setEditWodId(null)}}><BookOpen size={16}/> Bibliotek</button>
   {staff&&<button type="button" role="tab" aria-selected={tab==='builder'} className={tab==='builder'?'selected':''} onClick={()=>{setTab('builder');setCopyMode(false);setEditWodId(null)}}><WandSparkles size={16}/> {editWodId?(copyMode?'Kopier WOD':'Rediger WOD'):'Bygg WOD'}</button>}
  </div>}
  {tab==='library'?<WodLibrary key="library" staff={staff} isAdmin={isAdmin} simpleMode={simpleMode} onLaunchWod={(wodId)=>onLaunchWod?.(wodId,launchAssignmentId,launchClassSessionId)} onEditWod={editWod} onCopyWod={copyWod} focusWodId={focusWodId} onFocusConsumed={onFocusConsumed}/>:<WodBuilder officeMode={officeMode} onPreview={officeMode?onPreview:undefined} key={editWodId||'new'} editWodId={editWodId} copyMode={copyMode} initialImport={initialImportedWod} onImportConsumed={onImportConsumed} onSaved={saved} onCancel={()=>{setCopyMode(false);setEditWodId(null);setTab('library')}}/>}
 </div>
}
