import { exerciseRecordType } from './prMetrics.js'

export const STANDARD_PR_LIFTS = [
  { name: 'Bench press', label: 'Benkpress' },
  { name: 'Deadlift', label: 'Markløft' },
  { name: 'Back squat', label: 'Back squat' },
  { name: 'Front squat', label: 'Front squat' },
  { name: 'Squat Clean', label: 'Clean' },
  { name: 'Snatch', label: 'Snatch' },
  { name: 'Clean and Jerk', label: 'Clean & Jerk' },
]

const sideSuffix = /\s*·\s*(høgre|venstre|per side|vekslande)$/i
export const exerciseKey = name => String(name || '').trim().replace(sideSuffix, '').toLocaleLowerCase('nn-NO')
const positive = value => { const n = Number(String(value ?? '').replace(',', '.')); return Number.isFinite(n) && n > 0 ? n : 0 }

export function defaultPRUnit(type) {
  return { load: 'kg', reps: 'reps', hold: 'sek', height: 'cm', endurance: 'meter' }[type] || 'reps'
}

export function buildPRDirectory(catalogue = [], derived = [], saved = []) {
  const map = new Map()
  const register = (name, fallback = {}) => {
    const key = exerciseKey(name)
    if (!key) return null
    if (!map.has(key)) map.set(key, { key, name: String(name).trim().replace(sideSuffix, ''), type: fallback.type || exerciseRecordType(name), derived: [], saved: [], sessions: 0 })
    return map.get(key)
  }
  for (const pin of STANDARD_PR_LIFTS) register(pin.name, { type: 'load' })
  for (const item of catalogue) register(item.name)
  for (const item of derived) {
    const entry = register(item.name, item)
    if (!entry) continue
    entry.type = item.type
    entry.derived.push(item)
    entry.sessions += Number(item.sessions) || 0
  }
  for (const record of saved) {
    const entry = register(record.exercise_name)
    if (entry) entry.saved.push(record)
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'nn-NO'))
}

export function bestLoad(entry) {
  const derived = (entry?.derived || []).flatMap(group => group.records || []).filter(item => item.unit === 'kg').map(item => positive(item.value))
  const saved = (entry?.saved || []).filter(item => item.unit === 'kg').map(item => positive(item.result))
  return Math.max(0, ...derived, ...saved)
}

export function primaryPR(entry) {
  if (!entry) return null
  const unit = defaultPRUnit(entry.type)
  const derived = (entry.derived || []).flatMap(group => group.records || []).filter(item => item.unit === unit).map(item => positive(item.value))
  const saved = (entry.saved || []).filter(item => item.unit === unit).map(item => positive(item.result))
  const top = Math.max(0, ...derived, ...saved)
  return top > 0 ? { value: top, unit } : null
}

export function isValidManualPR({ exerciseName, result, unit }) {
  return Boolean(String(exerciseName || '').trim()) && positive(result) > 0 && ['kg', 'cm', 'reps', 'sett', 'sek', 'meter', 'cal'].includes(unit)
}
