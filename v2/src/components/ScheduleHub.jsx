import {useEffect,useState} from 'react'
import {CalendarDays,UserRound,Users} from 'lucide-react'
import Booking from './Booking.jsx'
import PT from './PT.jsx'
import CalendarAdmin from './CalendarAdmin.jsx'
import PersonalCalendar from './PersonalCalendar.jsx'
import {isStaff} from '../lib/auth.js'

export default function ScheduleHub({profile,onLogResult,onLaunchWorkout,onOpenWod,onContactPT=()=>{},focusRequestId,onFocusConsumed,initialClassId=null,initialTab='mine',onTabChange=()=>{},simpleMode=false,hidePTTab=false,onInitialClassConsumed=()=>{}}){
 const [tab,setTab]=useState(initialTab)
 const [focusClassId,setFocusClassId]=useState(initialClassId)
 const [focusPTClientId,setFocusPTClientId]=useState(null)
 useEffect(()=>{setTab(initialTab)},[initialTab,simpleMode])
 useEffect(()=>{setFocusClassId(initialClassId)},[initialClassId])
 const allowedTab=value=>(hidePTTab&&['pt','mine'].includes(value))?'booking':((!isStaff(profile)&&value==='calendar')||(simpleMode&&value==='pt'))?'mine':value
 const changeTab=value=>{const next=allowedTab(value);setTab(next);onTabChange(next)}
 const activeTab=allowedTab(tab)
 return <div className={simpleMode?'schedule-hub simple-schedule-hub':'schedule-hub'}>
  {!simpleMode&&<div className="training-heading"><div><span className="section-kicker">TIMEPLAN OG BOOKING</span><h3>Timeplan</h3><p>Alt du skal på, i ein kalender.</p></div></div>}
  <div className="hub-tabs" role="tablist" aria-label="Timeplan og booking">
   {!hidePTTab&&<button type="button" role="tab" aria-selected={activeTab==='mine'} className={activeTab==='mine'?'selected':''} onClick={()=>changeTab('mine')}><CalendarDays size={16}/> Min kalender</button>}
   <button type="button" role="tab" aria-selected={activeTab==='booking'} className={activeTab==='booking'?'selected':''} onClick={()=>changeTab('booking')}><Users size={16}/> Gruppetimar</button>
   {simpleMode&&!hidePTTab&&<button type="button" role="tab" aria-selected={false} onClick={onContactPT}><UserRound size={16}/> Spør om PT</button>}
   {!simpleMode&&!hidePTTab&&<button type="button" role="tab" aria-selected={activeTab==='pt'} className={activeTab==='pt'?'selected':''} onClick={()=>changeTab('pt')}><UserRound size={16}/> PT-studio</button>}
   {isStaff(profile)&&<button type="button" role="tab" aria-selected={activeTab==='calendar'} className={activeTab==='calendar'?'selected':''} onClick={()=>changeTab('calendar')}><CalendarDays size={16}/> Administrer</button>}
  </div>
  {activeTab==='mine'?<PersonalCalendar profile={profile} onOpenClass={classId=>{setFocusClassId(classId);changeTab('booking')}} onOpenPT={clientId=>{setFocusPTClientId(clientId||null);changeTab('pt')}} onOpenAssignment={wodId=>onOpenWod?.(wodId,null)}/>:activeTab==='booking'?<Booking profile={profile} onLogResult={onLogResult} onOpenWod={onOpenWod} initialClassId={focusClassId} onInitialClassConsumed={()=>{setFocusClassId(null);onInitialClassConsumed?.()}}/>:activeTab==='pt'?<PT profile={profile} controlledClientId={focusPTClientId} onClientChange={setFocusPTClientId} focusRequestId={focusRequestId} onFocusConsumed={onFocusConsumed} onLaunchWorkout={onLaunchWorkout}/>:<CalendarAdmin onNavigate={(target,classId,clientId)=>{changeTab(target==='pt'?'pt':'booking');if(target==='pt')setFocusPTClientId(clientId||null);else if(classId)setFocusClassId(classId)}}/>}
 </div>
}
