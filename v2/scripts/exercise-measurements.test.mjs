import test from 'node:test';
import assert from 'node:assert/strict';
import { getExerciseMeasurementFlags } from '../src/lib/exerciseMeasurements.js';

test('plain plyo box exercises use height rather than load', () => {
  assert.deepEqual(
    getExerciseMeasurementFlags({ name: 'Box jump', equipment: 'Kasse' }),
    { usesHeight: true, usesLoad: false },
  );
  assert.deepEqual(
    getExerciseMeasurementFlags({ name: 'Box Jump Over', equipment: 'Kasse' }),
    { usesHeight: true, usesLoad: false },
  );
  assert.deepEqual(
    getExerciseMeasurementFlags({ name: 'Box Step-over', equipment: 'Kasse' }),
    { usesHeight: true, usesLoad: false },
  );
});

test('dumbbell box step-over supports both box height and external load', () => {
  assert.deepEqual(
    getExerciseMeasurementFlags({ name: 'Dumbbell Box Step-over', equipment: 'Manualar / kasse' }),
    { usesHeight: true, usesLoad: true },
  );
});

test('ordinary loaded strength exercises retain kilogram measurement', () => {
  assert.deepEqual(
    getExerciseMeasurementFlags({ name: 'Back squat', equipment: 'Vektstong' }),
    { usesHeight: false, usesLoad: true },
  );
  assert.deepEqual(
    getExerciseMeasurementFlags({ name: 'Dumbbell Romanian Deadlift', equipment: 'Manualar' }),
    { usesHeight: false, usesLoad: true },
  );
});

test('saved height and load values preserve both measurements when a WOD is reopened', () => {
  assert.deepEqual(
    getExerciseMeasurementFlags({
      name: 'Box Step-over',
      equipment: 'Kasse',
      levels: { rx: { heightCm: '60', loadMode: 'kg', loadKgMen: '15', loadKgWomen: '10' } },
    }),
    { usesHeight: true, usesLoad: true },
  );
  assert.deepEqual(
    getExerciseMeasurementFlags({
      name: 'Dumbbell Box Step-over',
      equipment: 'Manualar / kasse',
      sets: [{ reps: '10', height_cm: '50', load_kg: '12.5' }],
    }),
    { usesHeight: true, usesLoad: true },
  );
});
