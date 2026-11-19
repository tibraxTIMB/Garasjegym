import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLegacyCompatibleBlock,
  createWodEngineConfig,
  formatParticipation,
  normalizeWodEngine,
  parseIntervalNotation,
} from '../src/lib/wodEngine.js';

test('partner configuration defaults to two athletes and free split', () => {
  const config = createWodEngineConfig({ participation: 'partner' });
  assert.equal(config.participant_count, 2);
  assert.equal(config.collaboration, 'free_split');
  assert.equal(formatParticipation(config), 'PARTNER · 2 UTØVARAR');
});

test('team configuration clamps participant count and supports synchronized work', () => {
  const config = createWodEngineConfig({ participation: 'team', partnerCount: 50, collaboration: 'synchronized' });
  assert.equal(config.participant_count, 30);
  assert.equal(config.collaboration, 'synchronized');
});

test('individual mode cannot accidentally retain partner collaboration', () => {
  const config = createWodEngineConfig({ participation: 'individual', collaboration: 'you_go_i_go' });
  assert.equal(config.collaboration, 'solo');
  assert.equal(config.participant_count, 1);
});

test('supports fractional EMOM intervals such as E1.25MOM', () => {
  assert.deepEqual(parseIntervalNotation('E1.25MOM'), {
    source: 'E1.25MOM', intervalSeconds: 75, intervalMinutes: 1.25,
  });
  assert.equal(parseIntervalNotation('E0MOM'), null);
  assert.equal(parseIntervalNotation('E99MOM'), null);
});

test('legacy WOD data is normalized to one executable block without losing items', () => {
  const schema = normalizeWodEngine({ format: 'AMRAP', duration_seconds: 780, items: [{ exercise_name: 'Wallball' }] });
  assert.equal(schema.blocks.length, 1);
  assert.equal(schema.blocks[0].format, 'AMRAP');
  assert.equal(schema.blocks[0].duration_seconds, 780);
  assert.equal(schema.blocks[0].items[0].exercise_name, 'Wallball');
});

test('block model preserves independent scoring fields', () => {
  const engine = createWodEngineConfig({ participation: 'partner', scoreType: 'multi', scoreFields: ['rounds_reps', 'distance'] });
  const block = buildLegacyCompatibleBlock({ format: 'Partner EMOM35', items: [], engine });
  assert.deepEqual(block.scoring.fields, ['rounds_reps', 'distance']);
});
