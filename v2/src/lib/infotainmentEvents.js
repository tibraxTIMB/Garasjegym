/**
 * Groups infotainment events by the calendar day on the viewing device.
 * Starts-at values are timestamptz strings returned by Supabase.
 */
export function localDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function groupEventsByLocalDay(events) {
  const groups = new Map();

  for (const event of Array.isArray(events) ? events : []) {
    const key = localDateKey(event?.starts_at);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(event);
  }

  return [...groups.entries()];
}
