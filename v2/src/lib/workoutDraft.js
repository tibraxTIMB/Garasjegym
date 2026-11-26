const keyFor = memberId => `garasjegym.workout-draft.v1.${memberId}`

export function restoreWorkoutDraft(memberId, storage) {
  if (!memberId) return null
  try {
    const draft = JSON.parse((storage??globalThis.localStorage).getItem(keyFor(memberId)) || 'null')
    if (draft?.version !== 1 || draft?.memberId !== memberId || draft?.mode !== 'active') return null
    return draft
  } catch { return null }
}

export function saveWorkoutDraft(memberId, draft, storage) {
  if (!memberId || !draft) return false
  try { (storage??globalThis.localStorage).setItem(keyFor(memberId), JSON.stringify({ ...draft, version: 1, memberId, savedAt: Date.now() }));return true }
  catch { return false }
}

export function clearWorkoutDraft(memberId, storage) {
  if (!memberId) return
  try { (storage??globalThis.localStorage).removeItem(keyFor(memberId)) } catch { /* Optional local cache. */ }
}

export function resumedElapsedSeconds(snapshot, now = Date.now()) {
  const elapsed = Math.max(0, Number(snapshot?.elapsed) || 0)
  if (!snapshot?.running || !Number.isFinite(snapshot?.savedAt)) return elapsed
  return elapsed + Math.max(0, Math.floor((now - snapshot.savedAt) / 1000))
}

// Compare the exact confirmed result, not a changing clock snapshot timestamp.
export function workoutSaveFingerprint(draft){
 const {savedAt,version,memberId,activeExerciseIndex,resultSetIndex,flowDetailed,resultSummary,...data}=draft||{}
 // Display-only clock fields can be recalculated on reload. Keep phase, elapsed,
 // laps, round counts, planned target, swaps and block results in the fingerprint.
 const {savedAt:clockSavedAt,restored,remaining,displayTime,currentRound,countdown,countdownDeadline,hasStarted,running,samspel_roles,samspel_next_switch,samspel_rotation,...timerSnapshot}=data.timerSnapshot||{}
 return JSON.stringify({...data,timerSnapshot})
}
export function isRetryableWorkoutError(error,offline=false){
 if(offline)return true
 const status=Number(error?.status||error?.statusCode||0)
 return [408,429,502,503,504].includes(status)||error?.name==='AuthRetryableFetchError'||/failed to fetch|fetch failed|networkerror|network error|load failed|connection (?:lost|reset)|request timeout/i.test(error?.message||'')
}

// Synchronous shared guard for save, retry and discard, including confirmation awaits.
export function claimWorkoutAction(lock){
 if(!lock||lock.current)return false
 lock.current=true
 return true
}
export function releaseWorkoutAction(lock){
 if(lock)lock.current=false
}

// A request may have reached the server even if its response was lost. Persist the
// submitted fingerprint separately so ordinary draft autosave cannot erase it.
const receiptKey=memberId=>`garasjegym.workout-pending.v1.${memberId}`
export function readWorkoutSubmission(memberId,saveToken,storage){
 if(!memberId||!saveToken)return null
 try{
  const row=JSON.parse((storage??globalThis.localStorage).getItem(receiptKey(memberId))||'null')
  return row?.memberId===memberId&&row.saveToken===saveToken&&typeof row.fingerprint==='string'?row:null
 }catch{return null}
}
export function rememberWorkoutSubmission(memberId,saveToken,fingerprint,storage){
 if(!memberId||!saveToken||typeof fingerprint!=='string')return false
 try{(storage??globalThis.localStorage).setItem(receiptKey(memberId),JSON.stringify({memberId,saveToken,fingerprint}));return true}catch{return false}
}
export function clearWorkoutSubmission(memberId,saveToken,storage){
 if(!readWorkoutSubmission(memberId,saveToken,storage))return
 try{(storage??globalThis.localStorage).removeItem(receiptKey(memberId))}catch{}
}
export function workoutSubmissionConflict(submission,saveToken,fingerprint){
 return !!submission&&submission.saveToken===saveToken&&submission.fingerprint!==fingerprint
}
