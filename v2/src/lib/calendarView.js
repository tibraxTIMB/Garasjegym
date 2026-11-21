// Date-only database values are local calendar dates, not UTC instants.
export function localCalendarDay(value) {
 if (typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
 const date=value instanceof Date?value:new Date(value)
 if (!Number.isFinite(date.getTime())) return ''
 return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-')
}

export function monthCalendarCells(year,month) {
 const offset=(new Date(year,month,1).getDay()+6)%7
 const days=new Date(year,month+1,0).getDate()
 const cells=[...Array(offset).fill(null),...Array.from({length:days},(_,i)=>new Date(year,month,i+1))]
 while(cells.length%7)cells.push(null)
 return cells
}

export function weekCalendarDays(value) {
 const start=new Date(value.getFullYear(),value.getMonth(),value.getDate())
 start.setDate(start.getDate()-(start.getDay()+6)%7)
 return Array.from({length:7},(_,i)=>new Date(start.getFullYear(),start.getMonth(),start.getDate()+i))
}
