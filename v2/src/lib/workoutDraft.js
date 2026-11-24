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
  if (!memberId || !storage || !draft) return false
  try { storage.setItem(keyFor(memberId), JSON.stringify({ ...draft, version: 1, memberId, savedAt: Date.now() }));return true }
  catch { return false }
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

// Compare the exact confirmed result, not a changing clock snapshot timestamp.
export function workoutSaveFingerprint(draft){
 const {savedAt,version,memberId,activeExerciseIndex,...data}=draft||{}
 const {savedAt:clockSavedAt,...timerSnapshot}=data.timerSnapshot||{}
 return JSON.stringify({...data,timerSnapshot})
}
export function isRetryableWorkoutError(error,offline=false){
 if(offline)return true
 const status=Number(error?.status||error?.statusCode||0)
 return [408,429,502,503,504].includes(status)||error?.name==='AuthRetryableFetchError'||/failed to fetch|fetch failed|networkerror|network error|load failed|connection (?:lost|reset)|request timeout/i.test(error?.message||'')
}
