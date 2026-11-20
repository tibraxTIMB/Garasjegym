import test from 'node:test'
import assert from 'node:assert/strict'
import { chooseSpotifyDevice, isUsableSpotifyDevice, spotifyErrorMessage } from '../src/lib/spotifyDevices.js'
import { clearSpotifyOAuthSession, readSpotifyOAuthSession, writeSpotifyOAuthSession } from '../src/lib/spotifyOAuthStorage.js'

test('Spotify devices include tablets, computers and speakers', () => {
  for (const type of ['Smartphone','Tablet','Computer','Speaker','TV']) {
    assert.equal(isUsableSpotifyDevice({id:type,type,is_restricted:false}), true, type)
  }
})

test('restricted and unidentified Spotify devices are excluded', () => {
  assert.equal(isUsableSpotifyDevice({id:'restricted',type:'Speaker',is_restricted:true}), false)
  assert.equal(isUsableSpotifyDevice({type:'Tablet',is_restricted:false}), false)
  assert.equal(isUsableSpotifyDevice(null), false)
})

test('Spotify device selection keeps the current choice when it is still available', () => {
  const devices = [
    {id:'speaker',type:'Speaker',is_active:true,is_restricted:false},
    {id:'tablet',type:'Tablet',is_active:false,is_restricted:false},
  ]
  assert.equal(chooseSpotifyDevice(devices,'tablet'),'tablet')
})

test('Spotify device selection falls back to active, then first available device', () => {
  assert.equal(chooseSpotifyDevice([
    {id:'first',is_active:false,is_restricted:false},
    {id:'active',is_active:true,is_restricted:false},
  ],'missing'),'active')
  assert.equal(chooseSpotifyDevice([{id:'first',is_restricted:false}],'missing'),'first')
  assert.equal(chooseSpotifyDevice([], 'missing'),'')
})


test('Spotify API errors explain common recovery steps', () => {
  assert.match(spotifyErrorMessage(401), /Kople frå og til/)
  assert.match(spotifyErrorMessage(403), /Premium/)
  assert.match(spotifyErrorMessage(403, {error:{message:'Premium required'}}), /Premium-abonnement/)
  assert.match(spotifyErrorMessage(404), /oppdater einingslista/)
  assert.match(spotifyErrorMessage(429, {}, '12'), /12 sekund/)
  assert.equal(spotifyErrorMessage(500, {error:{message:'Serverfeil'}}), 'Serverfeil')
})


test('Spotify OAuth session helpers store, read and clear PKCE values', () => {
  const values = new Map()
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  }
  assert.equal(writeSpotifyOAuthSession(storage, 'state', 'verifier', 'state-value', 'verifier-value'), true)
  assert.deepEqual(readSpotifyOAuthSession(storage, 'state', 'verifier'), {
    state: 'state-value',
    verifier: 'verifier-value',
  })
  assert.equal(clearSpotifyOAuthSession(storage, 'state', 'verifier'), true)
  assert.deepEqual(readSpotifyOAuthSession(storage, 'state', 'verifier'), {state:'',verifier:''})
})

test('Spotify OAuth session helpers fail safely when browser storage is blocked', () => {
  const blocked = {
    getItem: () => { throw new Error('blocked') },
    setItem: () => { throw new Error('blocked') },
    removeItem: () => { throw new Error('blocked') },
  }
  assert.deepEqual(readSpotifyOAuthSession(blocked, 'state', 'verifier'), {state:'',verifier:''})
  assert.equal(writeSpotifyOAuthSession(blocked, 'state', 'verifier', 's', 'v'), false)
  assert.equal(clearSpotifyOAuthSession(blocked, 'state', 'verifier'), false)
})
