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
