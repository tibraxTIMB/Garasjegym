import test from 'node:test';
import assert from 'node:assert/strict';
import {
  captureTrainingLaunchContext,
  emptyTrainingLaunchContext,
} from '../src/lib/trainingLaunchContext.js';

test('captures an assignment ID before navigation state is consumed', () => {
  const launchProps = { launchAssignmentId: 'assignment-1' };
  const context = captureTrainingLaunchContext(launchProps);
  launchProps.launchAssignmentId = null;
  assert.deepEqual(context, { assignmentId: 'assignment-1', programSessionId: null });
});

test('captures a program-session ID for a WOD or free-form program workout', () => {
  assert.deepEqual(
    captureTrainingLaunchContext({ launchProgramSessionId: 'program-session-1' }),
    { assignmentId: null, programSessionId: 'program-session-1' },
  );
});

test('keeps both links when a WOD belongs to a PT program', () => {
  assert.deepEqual(
    captureTrainingLaunchContext({
      launchAssignmentId: 'assignment-1',
      launchProgramSessionId: 'program-session-1',
    }),
    { assignmentId: 'assignment-1', programSessionId: 'program-session-1' },
  );
});

test('normalizes empty and invalid launch values to null', () => {
  assert.deepEqual(
    captureTrainingLaunchContext({
      launchAssignmentId: '  ',
      launchProgramSessionId: undefined,
    }),
    emptyTrainingLaunchContext(),
  );
});
