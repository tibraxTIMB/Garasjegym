const normalizeId = value => {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized || null
}

/**
 * Empty context for a workout started outside a PT assignment/program session.
 * Use a factory so every workout starts with its own state object.
 */
export const emptyTrainingLaunchContext = () => ({
  assignmentId: null,
  programSessionId: null,
})

/**
 * Preserve the PT link that launched a workout. The database RPC validates
 * ownership, WOD matching and that only one PT link is completed per log.
 */
export function captureTrainingLaunchContext({
  launchAssignmentId = null,
  launchProgramSessionId = null,
} = {}) {
  return {
    assignmentId: normalizeId(launchAssignmentId),
    programSessionId: normalizeId(launchProgramSessionId),
  }
}
