import test from 'node:test';
import assert from 'node:assert/strict';
import { getAppBaseUrl } from '../src/lib/appBaseUrl.js';

test('GitHub Pages redirect includes repository base path', () => {
  assert.equal(
    getAppBaseUrl('https://tibraxtimb.github.io', '/Garasjegym/'),
    'https://tibraxtimb.github.io/Garasjegym/',
  );
});

test('local development uses its configured base path too', () => {
  assert.equal(
    getAppBaseUrl('http://localhost:5173', '/Garasjegym/'),
    'http://localhost:5173/Garasjegym/',
  );
});

test('root-hosted app retains the host root and normalises trailing slash', () => {
  assert.equal(getAppBaseUrl('https://example.test', '/'), 'https://example.test/');
  assert.equal(getAppBaseUrl('https://example.test', '/app'), 'https://example.test/app/');
});

test('redirect omits accidental query and hash from a supplied base', () => {
  assert.equal(
    getAppBaseUrl('https://example.test', '/Garasjegym/?x=1#section'),
    'https://example.test/Garasjegym/',
  );
});

test('invalid origin is rejected instead of producing a malformed redirect', () => {
  assert.throws(() => getAppBaseUrl('', '/Garasjegym/'), TypeError);
});
