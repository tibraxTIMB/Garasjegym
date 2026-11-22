// A stopwatch-only session is a real workout log, but never a substitute for
// a WOD, PT assignment or an unverified manual entry.
export function canSaveDurationOnlyWorkout({format, manualEntry, sourceWodId, classSessionId, manualWodCount = 0, elapsedSeconds}) {
  return !manualEntry && !sourceWodId && !classSessionId && manualWodCount === 0 &&
    ['Fri trening', 'Stoppeklokke', 'Eigen økt'].includes(format) &&
    Number.isFinite(Number(elapsedSeconds)) && Number(elapsedSeconds) >= 1
}
