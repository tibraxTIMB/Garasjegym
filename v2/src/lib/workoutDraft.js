const keyFor = memberId => `garasjegym.workout-draft.v1.${memberId}`

export function restoreWorkoutDraft(memberId, storage = globalThis.localStorage) {
  if (!memberId || !storage) return null
  try {
    const draft = JSON.parse(storage.getItem(keyFor(memberId)) || 'null')
    if (draft?.version !== 1 || draft?.memberId !== memberId || draft?.mode !== 'active') return null
    return draft
  } catch { return null }
}

export function saveWorkoutDraft(memberId, draft, storage = globalThis.localStorage) {
  if (!memberId || !storage || !draft) return
  try { storage.setItem(keyFor(memberId), JSON.stringify({ ...draft, version: 1, memberId, savedAt: Date.now() })) }
  catch { /* Browsers may disable local persistence; live React state still works. */ }
}

export function clearWorkoutDraft(memberId, storage = globalThis.localStorage) {
  if (!memberId || !storage) return
  try { storage.removeItem(keyFor(memberId)) } catch { /* Optional local cache. */ }
}

export function resumedElapsedSeconds(snapshot, now = Date.now()) {
  const elapsed = Math.max(0, Number(snapshot?.elapsed) || 0)
  if (!snapshot?.running || !Number.isFinite(snapshot?.savedAt)) return elapsed
  return elapsed + Math.max(0, Math.floor((now - snapshot.savedAt) / 1000))
}
