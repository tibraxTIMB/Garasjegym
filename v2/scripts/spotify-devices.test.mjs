import test from 'node:test'
import assert from 'node:assert/strict'
import { isUsableSpotifyDevice } from '../src/lib/spotifyDevices.js'

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
