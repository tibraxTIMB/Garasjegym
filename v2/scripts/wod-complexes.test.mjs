import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPLEX_EXERCISES,
  formatComplexSequence,
  isValidComplexExercise,
} from '../src/lib/wodComplexes.js';

test('built-in library contains multiple equipment-based complex exercises', () => {
  assert.equal(COMPLEX_EXERCISES.length, 7);
  assert.deepEqual(
    [...new Set(COMPLEX_EXERCISES.map(item => item.complex_family))].sort(),
    ['barbell', 'dumbbell', 'kettlebell', 'landmine'],
  );
});

test('every preset is a valid composite exercise with at least two movements', () => {
  for (const exercise of COMPLEX_EXERCISES) {
    assert.equal(exercise.category, 'Complex');
    assert.equal(isValidComplexExercise(exercise), true, exercise.name);
    assert.ok(exercise.complex_steps.length >= 2);
    assert.ok(exercise.complex_steps.every(step => step.reps > 0));
  }
});

test('Bear Complex keeps the complete five-movement sequence in order', () => {
  const bear = COMPLEX_EXERCISES.find(item => item.name === 'Bear Complex');
  assert.deepEqual(
    bear.complex_steps.map(step => step.name),
    ['Power clean', 'Front squat', 'Push press', 'Back squat', 'Push press'],
  );
});

test('Armor Building Complex preserves the 2-1-3 prescription', () => {
  const armor = COMPLEX_EXERCISES.find(item => item.name === 'Armor Building Complex');
  assert.deepEqual(armor.complex_steps.map(step => step.reps), [2, 1, 3]);
});

test('sequence formatter keeps movement order and individual reps', () => {
  assert.equal(
    formatComplexSequence([
      { name: 'Power clean', reps: 1 },
      { name: 'Front squat', reps: 2 },
      { name: 'Push press', reps: 1 },
    ]),
    '1. 1 × Power clean → 2. 2 × Front squat → 3. 1 × Push press',
  );
});

test('invalid composite definitions are rejected', () => {
  assert.equal(isValidComplexExercise(null), false);
  assert.equal(isValidComplexExercise({ is_complex: true, complex_steps: [] }), false);
  assert.equal(isValidComplexExercise({
    is_complex: true,
    complex_steps: [{ name: 'Clean', reps: 0 }, { name: 'Squat', reps: 1 }],
  }), false);
});

import {plannedComplexCycles,confirmWeightedComplexSets} from '../src/lib/wodComplexes.js'
test('quick complex confirmation uses programmed cycles but never confirms blank or failed attempts',()=>{
 const sets=[{load_kg:'40',reps:''},{load_kg:'',reps:''},{load_kg:'65',reps:'0',complex_status:'partial'},{load_kg:'70',reps:'0',complex_status:'failed'},{load_kg:'50',reps:'1',complex_status:'complete'}]
 const cycles=plannedComplexCycles({prescription_levels:{rx:{reps:'2'}}})
 assert.equal(cycles,2)
 assert.deepEqual(confirmWeightedComplexSets(sets,cycles),[{load_kg:'40',reps:'2',complex_status:'complete'},...sets.slice(1)])
 assert.equal(plannedComplexCycles({levels:{rx:{reps:''}}}),1)
})
