import test from 'node:test';
import assert from 'node:assert/strict';
import { groupEventsByLocalDay, localDateKey } from '../src/lib/infotainmentEvents.js';

test('localDateKey returns the device-local calendar day', () => {
  const date = new Date(2026, 10, 19, 23, 45, 0);
  assert.equal(localDateKey(date), '2026-11-19');
});

test('localDateKey accepts Supabase timestamp strings', () => {
  const date = new Date(2026, 10, 19, 9, 0, 0);
  assert.equal(localDateKey(date.toISOString()), '2026-11-19');
});

test('localDateKey safely rejects invalid or missing values', () => {
  assert.equal(localDateKey('not-a-date'), null);
  assert.equal(localDateKey(null), null);
  assert.equal(localDateKey(undefined), null);
});

test('events are grouped by local day and retain order within each day', () => {
  const first = new Date(2026, 10, 19, 9, 0, 0).toISOString();
  const second = new Date(2026, 10, 19, 17, 0, 0).toISOString();
  const nextDay = new Date(2026, 10, 20, 8, 0, 0).toISOString();
  const groups = groupEventsByLocalDay([
    { event_key: 'a', starts_at: first },
    { event_key: 'b', starts_at: second },
    { event_key: 'bad', starts_at: 'invalid' },
    { event_key: 'c', starts_at: nextDay },
  ]);

  assert.deepEqual(groups.map(([day, events]) => [day, events.map(event => event.event_key)]), [
    ['2026-11-19', ['a', 'b']],
    ['2026-11-20', ['c']],
  ]);
});

test('empty and non-array event collections produce no groups', () => {
  assert.deepEqual(groupEventsByLocalDay([]), []);
  assert.deepEqual(groupEventsByLocalDay(null), []);
  assert.deepEqual(groupEventsByLocalDay(undefined), []);
});
