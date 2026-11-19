import {useEffect,useState} from 'react'
import {CalendarDays,UserRound,Users} from 'lucide-react'
import Booking from './Booking.jsx'
import PT from './PT.jsx'
import CalendarAdmin from './CalendarAdmin.jsx'
import {isStaff} from '../lib/auth.js'

export default function ScheduleHub({profile,onLogResult,onLaunchWorkout,focusRequestId,onFocusConsumed,initialClassId=null,initialTab='booking',onTabChange=()=>{}}){
 const [tab,setTab]=useState(initialTab)
 const [focusClassId,setFocusClassId]=useState(initialClassId)
 useEffect(()=>{setTab(initialTab)},[initialTab])
 useEffect(()=>{setFocusClassId(initialClassId)},[initialClassId])
 const allowedTab=value=>value==='calendar'&&!isStaff(profile)?'booking':value
 const changeTab=value=>{const next=allowedTab(value);setTab(next);onTabChange(next)}
 const activeTab=allowedTab(tab)
 return <div className="schedule-hub">
  <div className="training-heading"><div><span className="section-kicker">TIMEPLAN OG BOOKING</span><h3>Timar og avtalar</h3><p>Gruppetimar, kalender og PT-avtalar samla.</p></div></div>
  <div className="hub-tabs" role="tablist" aria-label="Timeplan og booking">
   <button type="button" role="tab" aria-selected={activeTab==='booking'} className={activeTab==='booking'?'selected':''} onClick={()=>changeTab('booking')}><Users size={16}/> Gruppetimar</button>
   <button type="button" role="tab" aria-selected={activeTab==='pt'} className={activeTab==='pt'?'selected':''} onClick={()=>changeTab('pt')}><UserRound size={16}/> PT-studio</button>
   {isStaff(profile)&&<button type="button" role="tab" aria-selected={activeTab==='calendar'} className={activeTab==='calendar'?'selected':''} onClick={()=>changeTab('calendar')}><CalendarDays size={16}/> Kalender</button>}
  </div>
  {activeTab==='booking'?<Booking profile={profile} onLogResult={onLogResult} initialClassId={focusClassId}/>:activeTab==='pt'?<PT profile={profile} focusRequestId={focusRequestId} onFocusConsumed={onFocusConsumed} onLaunchWorkout={onLaunchWorkout}/>:<CalendarAdmin onNavigate={(target,classId)=>{changeTab(target==='pt'?'pt':'booking');if(target!=='pt'&&classId)setFocusClassId(classId)}}/>}
 </div>
}
