import {useState} from 'react'
import {CalendarDays,UserRound} from 'lucide-react'
import Booking from './Booking.jsx'
import PT from './PT.jsx'

export default function ScheduleHub({profile,onLogResult,onLaunchWorkout,focusRequestId,onFocusConsumed}){
 const [tab,setTab]=useState('booking')
 return <div className="schedule-hub">
  <div className="training-heading"><div><span className="section-kicker">TIMEPLAN OG BOOKING</span><h3>Timar og avtalar</h3><p>Gruppetimar, PT-avtalar og personleg oppfølging samla.</p></div></div>
  <div className="hub-tabs" role="tablist" aria-label="Timeplan og booking">
   <button type="button" role="tab" aria-selected={tab==='booking'} className={tab==='booking'?'selected':''} onClick={()=>setTab('booking')}><CalendarDays size={16}/> Gruppetimar</button>
   <button type="button" role="tab" aria-selected={tab==='pt'} className={tab==='pt'?'selected':''} onClick={()=>setTab('pt')}><UserRound size={16}/> PT-studio</button>
  </div>
  {tab==='booking'?<Booking profile={profile} onLogResult={onLogResult}/>:<PT profile={profile} focusRequestId={focusRequestId} onFocusConsumed={onFocusConsumed} onLaunchWorkout={onLaunchWorkout}/>}
 </div>
}