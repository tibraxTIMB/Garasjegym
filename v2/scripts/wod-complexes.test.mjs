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
