import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const file=path=>readFileSync(new URL(path,import.meta.url),'utf8')

test('Infotainment Timer view remains reachable and no private PT sessions appear',()=>{
 const src=file('../src/components/Infotainment.jsx')
 assert.match(src,/activeTab==='oversikt'\|\|activeTab==='musikk'\|\|activeTab==='timer'/)
 assert.match(src,/activeTab==='oversikt'\|\|activeTab==='timer'/)
 assert.match(src,/item\.category!=='pt'/)
 assert.match(src,/const arenaContext=arenaBlockContext\(timerSnapshot\)/)
 assert.match(src,/Boolean\(arenaContext&&timerSnapshot\?\.title\)/)
 const activity=file('../src/lib/trainingActivity.js')
 assert.match(activity,/!snapshot\?\.sessionOpen\|\|snapshot\.sessionPrepared!==true/)
 assert.match(src,/Date\.now\(\)-\(runStartedAt\.current/)
})

test('Homepage shows daily WOD once and provides immediately accessible main tasks',()=>{
 const app=file('../src/App.jsx')
 const overview=file('../src/components/Overview.jsx')
 assert.match(app,/simpleMode&&active==='oversikt'&&dailyWod/)
 assert.match(overview,/overview-primary-actions/)
 assert.match(overview,/onNavigate\('trening'\)/)
 assert.match(overview,/onNavigate\('mi-side'\)/)
 assert.match(overview,/Min treningsprofil/)
})

test('Android PWA manifest resolves a real maskable gorilla icon',()=>{
 const manifest=JSON.parse(file('../public/manifest.webmanifest'))
 assert.equal(manifest.id,'/Garasjegym/')
 assert.equal(manifest.display,'standalone')
 assert.ok(manifest.icons.some(icon=>icon.purpose==='maskable'&&icon.sizes==='512x512'))
 assert.ok(manifest.icons.every(icon=>icon.src.includes('v=gazelle-1-2')))
 for(const icon of manifest.icons){
  const png=icon.src.split('/').pop().split('?')[0]
  const bytes=readFileSync(new URL('../public/'+png,import.meta.url))
  assert.ok(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))
 }
})
