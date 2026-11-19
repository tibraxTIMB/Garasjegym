export const WOD_ENGINE_VERSION = 2;

export const PARTICIPATION_MODES = Object.freeze([
  { value: 'individual', label: 'Individuell' },
  { value: 'partner', label: 'Partner · 2 utøvarar' },
  { value: 'team', label: 'Team · 3+ utøvarar' },
]);

export const COLLABORATION_MODES = Object.freeze([
  { value: 'solo', label: 'Individuell gjennomføring' },
  { value: 'free_split', label: 'Del arbeidet fritt' },
  { value: 'you_go_i_go', label: 'You go – I go' },
  { value: 'alternate', label: 'Annankvar / vekselvis' },
  { value: 'synchronized', label: 'Synkroniserte repetisjonar' },
  { value: 'parallel', label: 'Parallelt arbeid' },
]);

export const SCORE_TYPES = Object.freeze([
  { value: 'reps', label: 'Repetisjonar' },
  { value: 'rounds_reps', label: 'Rundar + ekstra reps' },
  { value: 'time', label: 'Tid' },
  { value: 'load', label: 'Vekt' },
  { value: 'distance', label: 'Distanse' },
  { value: 'calories', label: 'Kaloriar' },
  { value: 'height', label: 'Høgd' },
  { value: 'multi', label: 'Fleire resultatfelt' },
]);

export function parseIntervalNotation(value) {
  const text = String(value || '').trim().toUpperCase().replace(/\s+/g, '');
  const match = text.match(/^E(\d+(?:\.\d+)?)MOM$/);
  if (!match) return null;
  const minutes = Number(match[1]);
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 60) return null;
  return { source: text, intervalSeconds: Math.round(minutes * 60), intervalMinutes: minutes };
}

export function createWodEngineConfig({
  participation = 'individual',
  collaboration = 'solo',
  scoreType = 'reps',
  partnerCount = 2,
  scoreFields = [],
} = {}) {
  const mode = PARTICIPATION_MODES.some(item => item.value === participation) ? participation : 'individual';
  const collaborationMode = mode === 'individual' ? 'solo' : (
    COLLABORATION_MODES.some(item => item.value === collaboration && item.value !== 'solo')
      ? collaboration
      : 'free_split'
  );
  const count = mode === 'individual' ? 1 : mode === 'partner'
    ? 2
    : Math.max(3, Math.min(30, Number(partnerCount) || 3));
  const fields = Array.isArray(scoreFields) && scoreFields.length
    ? scoreFields.filter(field => SCORE_TYPES.some(type => type.value === field))
    : [scoreType];
  return {
    version: WOD_ENGINE_VERSION,
    participation: mode,
    participant_count: count,
    collaboration: collaborationMode,
    scoring: { type: scoreType, fields: [...new Set(fields)] },
  };
}

export function buildLegacyCompatibleBlock({ format = 'Eigen økt', items = [], durationSeconds = null, engine = null, interval = null } = {}) {
  const config = engine || createWodEngineConfig();
  const parsedInterval = parseIntervalNotation(format);
  return {
    id: 'main',
    type: 'workout',
    title: 'Hovuddel',
    format,
    duration_seconds: Number(durationSeconds) > 0 ? Number(durationSeconds) : null,
    interval: parsedInterval || interval || null,
    participation: config.participation,
    participant_count: config.participant_count,
    collaboration: config.collaboration,
    scoring: config.scoring,
    items: Array.isArray(items) ? items : [],
  };
}

export function normalizeWodEngine(schema = {}, fallback = {}) {
  const stored = schema?.wod_engine;
  if (stored?.version === WOD_ENGINE_VERSION && Array.isArray(stored.blocks)) {
    return {
      version: WOD_ENGINE_VERSION,
      participation: stored.participation || 'individual',
      participant_count: Number(stored.participant_count) || 1,
      collaboration: stored.collaboration || 'solo',
      scoring: stored.scoring || { type: 'reps', fields: ['reps'] },
      blocks: stored.blocks,
    };
  }
  const engine = createWodEngineConfig({
    participation: stored?.participation || 'individual',
    collaboration: stored?.collaboration || 'solo',
    scoreType: stored?.scoring?.type || 'reps',
    partnerCount: stored?.participant_count || 2,
    scoreFields: stored?.scoring?.fields,
  });
  return {
    ...engine,
    blocks: [buildLegacyCompatibleBlock({
      format: fallback.format || schema?.format || 'Eigen økt',
      items: schema?.items || [],
      durationSeconds: schema?.duration_seconds,
      interval: schema?.interval,
      engine,
    })],
  };
}

export function formatParticipation(engine) {
  if (engine?.participation === 'partner') return 'PARTNER · 2 UTØVARAR';
  if (engine?.participation === 'team') return 'TEAM · ' + (Number(engine.participant_count) || 3) + ' UTØVARAR';
  return 'INDIVIDUELL';
}
