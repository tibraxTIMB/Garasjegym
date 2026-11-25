import {ChevronRight} from 'lucide-react'
export default function DailyWodStrip({wod,date,onOpen}){
 if(!wod?.id||!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return null
 const day=new Date(date+'T12:00:00'),stamp=day.toLocaleDateString('nn-NO',{day:'numeric',month:'short'})
 return <button type="button" className="gg-daily-strip" onClick={()=>onOpen(wod.id)} aria-label={'Opna Dagens WOD: '+wod.name+', '+stamp}>
 <time dateTime={date} className="gg-daily-date"><strong>{day.getDate()}</strong><small>{day.toLocaleDateString('nn-NO',{month:'short'}).replace('.','')}</small></time>
 <span className="gg-daily-copy"><span className="gg-daily-kicker">DAGENS WOD</span><strong>{wod.name}</strong><small>{wod.format} · {wod.duration_minutes||'–'} min</small></span><ChevronRight size={20} aria-hidden="true"/></button>
}
