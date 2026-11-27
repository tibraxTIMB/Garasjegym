import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const source=p=>readFileSync(new URL(p,import.meta.url),'utf8')
test('all PT scheduling dialogs portal outside app navigation',()=>{
 const s=source('../src/components/PTSchedule.jsx')
 assert.match(s,/createPortal\(/);assert.match(s,/,document\.body\)/)
 assert.equal((s.match(/<ScheduleModal label=/g)||[]).length,3)
 assert.match(source('../src/components/pt-schedule.css'),/body>\.gg-schedule-backdrop\{[^}]*z-index:2147483002!important/)
})
test('shared WOD picker scrolls without shrinking card rows and keeps actions usable',()=>{
 const s=source('../src/components/wod-picker-repair.css')
 assert.match(s,/\.wod-picker \.wod-picker-results\{display:flex!important;flex-direction:column!important/)
 assert.match(s,/\.wod-picker \.wod-picker-option\{flex:0 0 auto!important;grid-auto-rows:max-content!important/)
 assert.match(source('../src/components/WodPicker.jsx'),/disabled=\{multiple&&!draftIds\.length\}/)
 assert.match(source('../src/components/pt-schedule.css'),/\.gg-schedule-dialog\.gg-schedule-choosing>\.wod-picker>\.wod-picker-results\{flex:1 1 auto;min-height:84px;max-height:none!important/)
})
