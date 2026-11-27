export function validateClassCapacity(capacity, activeBookings = 0) {
  const value = Number(capacity)
  const active = Number(activeBookings)

  if (!Number.isInteger(value) || value < 1 || value > 100) {
    return { ok: false, error: 'Kapasitet må vere eit heilt tal mellom 1 og 100.' }
  }
  if (!Number.isInteger(active) || active < 0) {
    return { ok: false, error: 'Talet på aktive påmeldingar kunne ikkje kontrollerast.' }
  }
  if (value < active) {
    return {
      ok: false,
      error: 'Kapasiteten kan ikkje setjast til ' + value + ' når ' + active + ' har aktiv påmelding. Auk kapasiteten eller avmeld deltakarar først.',
    }
  }
  return { ok: true, value }
}

// Open Gym uses the ordinary class record and booking rules; this merely
// prepares an editable future date, never publishes or books automatically.
export function openGymDraft(now=new Date()){
 const ms=new Date(now).getTime()
 if(!Number.isFinite(ms))throw Error('Ugyldig tidspunkt.')
 const start=new Date(Math.ceil((ms+15*60000)/ (15*60000))*(15*60000))
 const local=new Date(start.getTime()-start.getTimezoneOffset()*60000).toISOString().slice(0,16)
 return {title:'Open Gym',type:'Open Gym',startsAt:local,duration:'60',capacity:'4'}
}
