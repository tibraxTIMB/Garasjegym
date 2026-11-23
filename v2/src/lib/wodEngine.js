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

// One source of truth for the primary score shown and stored by the builder.
// The selected workout format, not a separate technical dropdown, determines it.
export function scoreForWodFormat(format, combinationMode = 'For Time') {
  const chosen = String(format || '').trim();
  if (chosen === 'AMRAP' || chosen === 'Death By' || (['Couplet', 'Triplet'].includes(chosen) && combinationMode === 'AMRAP')) {
    return { type: 'rounds_reps', fields: ['rounds_reps'] };
  }
  if (['For Time', 'Chipper', 'Ladder'].includes(chosen)
    || (['Couplet', 'Triplet'].includes(chosen) && combinationMode === 'For Time')) {
    return { type: 'time', fields: ['time'] };
  }
  if (['Strength', 'Superset', 'Complex'].includes(chosen)) {
    return { type: 'load', fields: ['load'] };
  }
  if (chosen === 'Row Intervals') return { type: 'distance', fields: ['distance'] };
  return { type: 'reps', fields: ['reps'] };
}

/** A single EMOM format with second-precision intervals; older E3MOM labels stay readable. */
export function isEmomFormat(format) {
 return /^(?:E\d+(?:\.\d+)?MOM|EMOM(?: [1-7])?)$/i.test(String(format||'').trim())
}
export function emomIntervalSeconds(format, interval = {}) {
 const explicitSeconds=Number(interval?.work_every_seconds)
 if(Number.isInteger(explicitSeconds)&&explicitSeconds>=5&&explicitSeconds<=3600)return explicitSeconds
 const explicitMinutes=Number(interval?.work_every_minutes)
 if(Number.isFinite(explicitMinutes)&&explicitMinutes>0&&explicitMinutes<=60)return Math.round(explicitMinutes*60)
 const legacy=parseIntervalNotation(format)
 if(legacy)return legacy.intervalSeconds
 const mapped=/^EMOM ([1-7])$/i.exec(String(format||'').trim())
 return mapped?Number(mapped[1])*60:60
}
export function emomDisplayLabel(seconds) {
 const whole=Math.max(5,Math.min(3600,Math.round(Number(seconds)||60)))
 return whole%60===0?`E${whole/60}MOM`:`EMOM · ${Math.floor(whole/60)}:${String(whole%60).padStart(2,'0')}`
}

/** Count actual scheduled EMOM repetitions per movement, including rotating slots. */
export function emomPrescribedSetCount({format='EMOM',interval={},durationSeconds=0,minuteSlot='',exerciseIndex=0,exerciseCount=1}={}) {
 const every=emomIntervalSeconds(format,interval)
 const total=Math.max(0,Math.floor(Number(durationSeconds)||0))
 const slots=Math.floor(total/every)
 if(!slots)return 0
 const assigned=String(minuteSlot??'').split(/[,;\s/]+/).map(Number).filter(n=>Number.isInteger(n)&&n>0&&n<=slots)
 if(assigned.length)return new Set(assigned).size
 const count=Math.max(1,Math.floor(Number(exerciseCount)||1))
 const index=Math.max(0,Math.floor(Number(exerciseIndex)||0))%count
 return Math.max(0,Math.floor((slots+count-1-index)/count))
}

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
