// Display categories are deliberately independent from the stored broad category.
// A movement keeps its exercise ID and PR history even when its browse group changes.
export const EXERCISE_BROWSE_CATEGORIES = [
  'TRX', 'Olympiske løft', 'Burpees', 'Kettlebell', 'Manualar',
  'Vektstong', 'Gymnastikk', 'CrossFit', 'Styrke', 'Kjerne',
  'Kondisjon', 'Mobilitet', 'Pilates', 'Yoga', 'Rehab', 'Complex', 'Anna',
]

export function exerciseBrowseCategory(exercise = {}) {
  const name = String(exercise.name || '').toLowerCase()
  const equipment = String(exercise.equipment || '').toLowerCase()
  const category = String(exercise.category || '').toLowerCase()
  // The movement's mobility purpose takes precedence over generic equipment/name heuristics.
  if (category.includes('mobilitet')) return 'Mobilitet'
  if (/^trx\b/.test(name) || /\btrx\b/.test(equipment)) return 'TRX'
  if (/^burpee\b/.test(name) || /burpee/.test(name)) return 'Burpees'
  if (/(?:kettlebell|\bkb\b)/.test(name) || /kettlebell/.test(equipment)) return 'Kettlebell'
  if (/(?:dumbbell|manual)/.test(name) || /manual|dumbbell/.test(equipment)) return 'Manualar'
  if (/\b(?:clean|snatch|jerk)\b/.test(name) && /stong|barbell|vektstong/.test(equipment)) return 'Olympiske løft'
  if (/\b(?:pull-up|muscle-up|toes-to-bar|handstand|wall walk|ring dip)\b/.test(name)) return 'Gymnastikk'
  if (category.includes('rehab') || exercise.is_rehab) return 'Rehab'
  if (category.includes('pilates')) return 'Pilates'
  if (category.includes('yoga')) return 'Yoga'
  if (category.includes('complex')) return 'Complex'
  if (category.includes('kondisjon')) return 'Kondisjon'
  if (category.includes('kjerne')) return 'Kjerne'
  if (/stong|barbell|vektstong/.test(equipment)) return 'Vektstong'
  if (category.includes('crossfit')) return 'CrossFit'
  if (category.includes('styrke')) return 'Styrke'
  return exercise.category || 'Anna'
}

export function exerciseBrowseOrder(a, b) {
  const aIndex = EXERCISE_BROWSE_CATEGORIES.indexOf(a)
  const bIndex = EXERCISE_BROWSE_CATEGORIES.indexOf(b)
  return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex) || a.localeCompare(b, 'nn')
}
