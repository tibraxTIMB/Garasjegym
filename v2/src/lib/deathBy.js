// Death By: one fixed countdown per round. Each successful round adds a fixed rep step.
// Legacy confirmation mode is retained for callers that explicitly need it. Live clocks advance automatically.

const whole = (value, fallback, min, max) => {
 const n=Number(value)
 return Number.isInteger(n) && n>=min && n<=max ? n : fallback
}

export function deathByConfig(ladder = {}) {
 return {
  intervalSeconds: whole(ladder?.interval_seconds, 60, 5, 3600),
  start: whole(ladder?.start, 1, 1, 1000),
  step: whole(ladder?.step, 1, 1, 1000),
 }
}

export function deathByTimerState(elapsedSeconds = 0, completedRounds = 0, ladder = {}, {autoAdvance=false} = {}) {
 const {intervalSeconds,start,step}=deathByConfig(ladder)
 const elapsed=Math.max(0,Number(elapsedSeconds)||0)
 const confirmed=Math.max(0,Math.floor(Number(completedRounds)||0))
 const completed=autoAdvance?Math.max(confirmed,Math.floor(elapsed/intervalSeconds)):confirmed
 const failureAt=autoAdvance?null:(completed+1)*intervalSeconds
 const failed=!autoAdvance&&elapsed>=failureAt
 const round=failed ? completed+1 : Math.floor(elapsed/intervalSeconds)+1
 const secondsLeft=failed ? 0 : Math.max(0,intervalSeconds-(elapsed%intervalSeconds))
 return {
  intervalSeconds,start,step,round,completedRounds:completed,
  targetReps:start+(round-1)*step,
  secondsLeft,failed,failedRound:failed?completed+1:null,failureAt,
  roundConfirmed:completed>=round,
  canConfirm:!failed&&completed===round-1,
 }
}
