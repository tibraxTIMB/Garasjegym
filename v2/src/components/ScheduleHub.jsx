import {useState} from 'react'
import {CalendarDays,UserRound,Users} from 'lucide-react'
import Booking from './Booking.jsx'
import PT from './PT.jsx'
import CalendarAdmin from './CalendarAdmin.jsx'
import {isStaff} from '../lib/auth.js'

export default function ScheduleHub({profile,onLogResult,onLaunchWorkout,focusRequestId,onFocusConsumed,initialTab='booking',onTabChange=()=>{}}){
 const [tab,setTab]=useState(initialTab)
 const changeTab=value=>{setTab(value);onTabChange(value)}
 return <div className="schedule-hub">
  <div className="training-heading"><div><span className="section-kicker">TIMEPLAN OG BOOKING</span><h3>Timar og avtalar</h3><p>Gruppetimar, kalender og PT-avtalar samla.</p></div></div>
  <div className="hub-tabs" role="tablist" aria-label="Timeplan og booking">
   <button type="button" role="tab" aria-selected={tab==='booking'} className={tab==='booking'?'selected':''} onClick={()=>changeTab('booking')}><Users size={16}/> Gruppetimar</button>
   <button type="button" role="tab" aria-selected={tab==='pt'} className={tab==='pt'?'selected':''} onClick={()=>changeTab('pt')}><UserRound size={16}/> PT-studio</button>
   {isStaff(profile)&&<button type="button" role="tab" aria-selected={tab==='calendar'} className={tab==='calendar'?'selected':''} onClick={()=>changeTab('calendar')}><CalendarDays size={16}/> Kalender</button>}
  </div>
  {tab==='booking'?<Booking profile={profile} onLogResult={onLogResult}/>:tab==='pt'?<PT profile={profile} focusRequestId={focusRequestId} onFocusConsumed={onFocusConsumed} onLaunchWorkout={onLaunchWorkout}/>:<CalendarAdmin onNavigate={target=>changeTab(target==='pt'?'pt':'booking')}/>}
 </div>
}
