const dayKey=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')
const monday=d=>{const n=new Date(d.getFullYear(),d.getMonth(),d.getDate(),12);n.setDate(n.getDate()-(n.getDay()+6)%7);return dayKey(n)}
export function trainingActivity(logs=[],now=new Date()){
 const today=dayKey(now),start=monday(now),month=today.slice(0,7),seen=new Set()
 const rows=logs.filter(l=>{const date=l.workout_date;if(!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||date>today||l.id&&seen.has(l.id))return false;if(l.id)seen.add(l.id);return true})
 const activeWeeks=new Set(rows.filter(l=>l.workout_date.slice(0,4)===today.slice(0,4)).map(l=>monday(new Date(l.workout_date+'T12:00:00'))))
 return {month:rows.filter(l=>l.workout_date.startsWith(month+'-')).length,week:rows.filter(l=>l.workout_date>=start).length,year:rows.filter(l=>l.workout_date.slice(0,4)===today.slice(0,4)).length,activeWeeks:activeWeeks.size,possiblyLimited:logs.length>=200}
}
export function validWeeklyGoal(value){if(String(value??'').trim()==='')return null;const n=Number(value);return Number.isInteger(n)&&n>=1&&n<=7?n:null}
export function arenaBlockContext(snapshot){
 if(!snapshot?.sessionOpen||snapshot.sessionPrepared!==true)return null
 const parts=Array.isArray(snapshot.block_summary)?snapshot.block_summary:[]
 const idx=Number(snapshot.active_block_index)
 const active=Number.isInteger(idx)&&idx>=0?parts[idx]:null
 return {part:active?idx+1:null,total:active?parts.length:null,title:active?.title||null,format:active?.format||snapshot.format||'',next:active?parts[idx+1]?.title||null:null,transition:Boolean(snapshot.composite_transition),round:Number(snapshot.currentRound)||null}
}
