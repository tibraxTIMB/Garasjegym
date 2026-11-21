const HEIGHT_MOVEMENT = /box\s*(?:jump|step.?up|step.?over)|burpee\s*box|box\s*over/i;
const BODYWEIGHT_MOVEMENT = /air squat|burpee|double under|single under|toes-to-bar|pull-up|push-up|handstand push-up/i;
const LOAD_MOVEMENT = /squat|deadlift|press|curl|row|clean|snatch|jerk|thrust|pulldown|leg press|swing|lunge|carry|wall ball|step.?up|muscle-up/i;
const EXTERNAL_LOAD = /manual|dumbbell|kettlebell|barbell|vektstang|stang|vektskive|landmine|medisinball|medicine ball|weight vest|vektvest/i;
const BOX_EQUIPMENT = /plyo.?boks|kasse|box/i;
const HOLD_MOVEMENT = /dead hang|active hang|flexed.arm hang|wall sit|plank|handstand hold|l.?sit/i;

const hasValue = value => value !== null && value !== undefined && String(value).trim() !== '';
const hasHeight = item => hasValue(item?.height_cm) || hasValue(item?.heightCm);
const hasLoad = item => hasValue(item?.load_kg) || hasValue(item?.loadKg)
  || ['kg', 'percent', 'rir', 'bodyweight'].includes(String(item?.load_mode || item?.loadMode || '').toLowerCase());

/**
 * Resolve which physical measurements a workout result needs.
 * Box movements use centimetres; externally loaded box movements can use
 * centimetres and kilograms at the same time.
 */
export function getExerciseMeasurementFlags(exercise = {}) {
  const name = String(exercise.name || exercise.exercise_name || '').toLowerCase();
  const equipment = String(exercise.equipment || '').toLowerCase();
  const levels = exercise.levels || exercise.prescription_levels || {};
  const levelRows = Object.values(levels).filter(value => value && typeof value === 'object');
  const schemaSets = Array.isArray(exercise.sets) ? exercise.sets : [];

  const hasSavedHeight = hasHeight(exercise)
    || levelRows.some(level => hasHeight(level))
    || schemaSets.some(set => hasHeight(set));
  const hasSavedLoad = hasLoad(exercise)
    || levelRows.some(level => hasLoad(level))
    || schemaSets.some(set => hasLoad(set));

  const boxEquipment = BOX_EQUIPMENT.test(equipment);
  const usesHeight = HEIGHT_MOVEMENT.test(name)
    || (boxEquipment && /step.?up|step.?over/i.test(name))
    || hasSavedHeight;
  const externalLoad = EXTERNAL_LOAD.test(equipment) || EXTERNAL_LOAD.test(name);
  const boxOnly = usesHeight && boxEquipment && !externalLoad;
  const ordinaryLoad = LOAD_MOVEMENT.test(name) && !BODYWEIGHT_MOVEMENT.test(name)
    && (!usesHeight || /step.?up/i.test(name)) && !boxOnly;
  const bodyweightOnly = /^trx\b/.test(name) || /^trx\b/.test(equipment) || HOLD_MOVEMENT.test(name) || /ab wheel|rollout/.test(name);
  const usesLoad = Boolean(exercise.is_complex || hasSavedLoad || externalLoad || (!bodyweightOnly && ordinaryLoad) || (!bodyweightOnly && !usesHeight && !boxOnly));

  return { usesHeight, usesLoad };
}
