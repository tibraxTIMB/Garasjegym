import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addWodSortOrder,
  getWodSchemaItems,
  moveWodItemByKey,
  moveWodItemToKey,
  moveWodItemToPosition,
  sortWodItems,
} from '../src/lib/wodOrdering.js';

const items = () => [
  { key: 'a', name: 'Knebøy' },
  { key: 'b', name: 'Roing' },
  { key: 'c', name: 'Push-up' },
];

test('flytt opp og ned endrar faktisk arrayrekkjefølgje utan å mutere originalen', () => {
  const original = items();
  const down = moveWodItemByKey(original, 'a', 1);
  assert.deepEqual(down.map(x => x.key), ['b', 'a', 'c']);
  assert.deepEqual(original.map(x => x.key), ['a', 'b', 'c']);
  assert.deepEqual(moveWodItemByKey(down, 'c', -1).map(x => x.key), ['b', 'c', 'a']);
});

test('posisjonsveljar brukar éin-basert posisjon og flyttar til nøyaktig vald plass', () => {
  assert.deepEqual(moveWodItemToPosition(items(), 'a', '3').map(x => x.key), ['b', 'c', 'a']);
  assert.deepEqual(moveWodItemToPosition(items(), 'c', '1').map(x => x.key), ['c', 'a', 'b']);
});

test('dra og slepp flyttar kjelde til målplassen', () => {
  assert.deepEqual(moveWodItemToKey(items(), 'c', 'a').map(x => x.key), ['c', 'a', 'b']);
});

test('ugyldige flytt gjev uendra liste', () => {
  const original = items();
  assert.equal(moveWodItemByKey(original, 'missing', 1), original);
  assert.equal(moveWodItemByKey(original, 'a', -1), original);
  assert.equal(moveWodItemToPosition(original, 'a', 'not-a-number'), original);
});

test('lagring skriv sekvensielle sort_order-verdiar i den viste rekkjefølgja', () => {
  const ordered = moveWodItemByKey(items(), 'a', 2);
  assert.deepEqual(addWodSortOrder(ordered).map(x => [x.key, x.sort_order]), [
    ['b', 1], ['c', 2], ['a', 3],
  ]);
});

test('gjenopning sorterer lagra nummer og bevarer rekkjefølgja for eldre element utan nummer', () => {
  const saved = [
    { key: 'c', sort_order: 3 },
    { key: 'legacy-1' },
    { key: 'a', sort_order: 1 },
    { key: 'b', sort_order: 2 },
    { key: 'legacy-2', sort_order: 0 },
  ];
  assert.deepEqual(sortWodItems(saved).map(x => x.key), [
    'a', 'b', 'c', 'legacy-1', 'legacy-2',
  ]);
});


test('redigering hentar rekkjefølgje frå legacy items eller engine-blokk når legacy-lista manglar', () => {
  const legacy = [{ key: 'legacy', sort_order: 1 }];
  assert.deepEqual(getWodSchemaItems({ items: legacy, wod_engine: { blocks: [{ items: [{ key: 'engine' }] }] } }), legacy);
  const engineOnly = { wod_engine: { blocks: [{ items: [{ key: 'b', sort_order: 2 }, { key: 'a', sort_order: 1 }] }] } };
  assert.deepEqual(sortWodItems(getWodSchemaItems(engineOnly)).map(x => x.key), ['a', 'b']);
  assert.deepEqual(getWodSchemaItems({ wod_engine: { blocks: [{ items: [{ key: 'x' }] }, { items: [{ key: 'y' }] }] } }).map(x => x.key), ['x', 'y']);
});
