import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {startupDelay} from '../src/lib/startupIntro.js'
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8')
test('intro gives a bounded first-launch dwell, no repeat delay after a slow load',()=>{
 assert.equal(startupDelay(0),3200)
 assert.equal(startupDelay(1000),2200)
 assert.equal(startupDelay(8000),180)
 assert.equal(startupDelay(1000,true),0)
})
test('existing gorilla icon and accessible animated app features render before JS',()=>{
 const html=read('../index.html'),main=read('../src/main.jsx')
 assert.match(html,/id="gg-startup"/)
 assert.match(html,/garasjegym-49-192\.png/)
 for(const label of ['WOD','TIMER','PT · TEAM','PR'])assert.ok(html.includes('>'+label+'<'))
 assert.match(html,/prefers-reduced-motion/)
 assert.match(html,/id="root" inert/)
 assert.match(main,/splash\.remove\(\);root\?\.removeAttribute\('inert'\)/)
 assert.match(main,/<StartupIntro \/>/)
 assert.match(main,/<App \/>/)
})
