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

test('plyo box step-ups use height only unless external load is specified', () => {
  assert.deepEqual(
    getExerciseMeasurementFlags({ name: 'Box Step-up', equipment: 'Plyoboks' }),
    { usesHeight: true, usesLoad: false },
  );
  assert.deepEqual(
    getExerciseMeasurementFlags({ name: 'Step-up', equipment: 'Kasse' }),
    { usesHeight: true, usesLoad: false },
  );
  assert.deepEqual(
    getExerciseMeasurementFlags({ name: 'Dumbbell Step-up', equipment: 'Manualar / kasse' }),
    { usesHeight: true, usesLoad: true },
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

test('TRX and static holds do not ask for kilograms unless externally loaded', () => {
  for (const name of ['TRX Row', 'TRX Chest Press', 'Dead Hang', 'Wall Sit', 'Ab Wheel Rollout']) {
    assert.deepEqual(getExerciseMeasurementFlags({ name, equipment: name.startsWith('TRX') ? 'TRX' : '' }), { usesHeight: false, usesLoad: false });
  }
  assert.deepEqual(getExerciseMeasurementFlags({name:'Dead Hang',equipment:'Pull-up-stong',sets:[{load_kg:10}]}),{usesHeight:false,usesLoad:true});
});
