/**
 * Capture one-off launch IDs before the parent clears its navigation state.
 * The returned values belong to the active workout and must be used at save.
 */
export function captureTrainingLaunchContext({
  launchAssignmentId = null,
  launchProgramSessionId = null,
} = {}) {
  return Object.freeze({
    assignmentId: typeof launchAssignmentId === 'string' && launchAssignmentId.trim()
      ? launchAssignmentId.trim()
      : null,
    programSessionId: typeof launchProgramSessionId === 'string' && launchProgramSessionId.trim()
      ? launchProgramSessionId.trim()
      : null,
  });
}

export function emptyTrainingLaunchContext() {
  return captureTrainingLaunchContext();
}
