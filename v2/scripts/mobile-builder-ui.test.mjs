import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = path => readFileSync(new URL(path, import.meta.url), 'utf8')

test('fullscreen WOD exercise picker exposes a visible step-three action and a way back', () => {
  const wod = source('../src/components/WodBuilder.jsx')
  const libraryHead = wod.match(/className="wod-library-fullscreen-head"[^]*?className="engine-section-title"/)?.[0] || ''
  assert.match(libraryHead, /className="wod-library-ok-top"[^>]*disabled=\{!selected\.length\}/)
  assert.match(libraryHead, /setLibraryOpen\(false\);goToStep\(3\)/)
  assert.match(libraryHead, /aria-label="Tilbake til WOD-byggjaren"/)
})

test('fullscreen timer targets its own DOM node and restores scrolling on exit', () => {
  const timer = source('../src/components/Training.jsx')
  assert.match(timer, /timerContainerRef\.current\?\.requestFullscreen\?\.\(\)/)
  assert.match(timer, /ref=\{timerContainerRef\}/)
  assert.doesNotMatch(timer, /document\.documentElement\.requestFullscreen/)
  assert.match(timer, /document\.body\.style\.overflow = previousOverflow/)
  const viewport = source('../src/components/timer-viewport.css')
  assert.match(viewport, /\.engine-timer\.timer-focused\s*\{/)
  assert.match(viewport, /height:\s*100dvh\s*!important/)
  assert.match(viewport, /\.timer-panel-clock/)
})

test('live timer is one viewport-locked surface with portrait and landscape layouts', () => {
  const timer = source('../src/components/Training.jsx')
  const styles = source('../src/components/timer-viewport.css')
  assert.match(timer, /const stageVisible = focused && !stop/)
  assert.match(timer, /className="gg-live-timer" aria-label="Fullskjermsklokke/)
  assert.match(timer, /className="gg-live-timer__footer"/)
  assert.match(timer, /stagePanel==='wod'/)
  assert.match(timer, /stagePanel==='settings'/)
  assert.match(timer, /onClick=\{toggleBrowserFullscreen\}/)
  assert.match(styles, /\.engine-timer\.timer-focused\s*\{[^}]*overflow:\s*hidden\s*!important/s)
  assert.match(styles, /\.gg-live-timer\s*\{[^}]*grid-template-rows:\s*auto minmax\(0, 1fr\) auto/s)
  assert.match(styles, /@media \(orientation: portrait\)\s*\{/)
  assert.match(styles, /@media \(orientation: landscape\) and \(max-height: 480px\)\s*\{/)
  assert.match(styles, /\.gg-live-timer__body\s*\{[^}]*overflow:\s*hidden/s)
  assert.doesNotMatch(styles.match(/\.gg-live-timer\s*\{[^}]*\}/s)?.[0] || '', /overflow-y:\s*auto/)
})

test('AMRAP round splits stay visible without growing the clock page', () => {
  const timer = source('../src/components/Training.jsx')
  const styles = source('../src/components/timer-viewport.css')
  assert.match(timer, /summarizeLapSplits\(laps\)/)
  assert.match(timer, /stageLapHistory\.slice\(-3\)/)
  assert.match(timer, /stagePanel==='laps'/)
  assert.match(timer, /Vis alle \(\{laps\.length\}\)/)
  assert.match(styles, /\.gg-live-timer__lap-preview\s*\{[^}]*display:\s*flex/s)
  assert.match(styles, /\.gg-live-timer__body--with-laps/)
  assert.match(styles, /@media \(orientation: landscape\)\s*\{[^]*?\.gg-live-timer__clock-area\s*\{[^}]*grid-template-rows:\s*auto minmax\(0,1fr\) auto auto/s)
})

test('mobile WOD browsing keeps category and search visible but folds away secondary filters', () => {
  const app = source('../src/App.jsx')
  const hub = source('../src/components/WodHub.jsx')
  const library = source('../src/components/WodLibrary.jsx')
  const styles = source('../src/components/wod-compact.css')
  assert.match(app, /welcome-wod-compact/)
  assert.match(hub, /wod-hub-compact-head/)
  assert.match(hub, /import '\.\/wod-compact\.css'/)
  assert.match(library, /wod-library-compact-heading/)
  assert.match(library, /aria-label="WOD-type"/)
  assert.match(library, /aria-expanded=\{showAdvancedFilters\}/)
  assert.match(library, /wod-library-expanded-filters/)
  assert.match(styles, /\.wod-library-expanded-filters \{ display: none; \}/)
  assert.match(styles, /\.wod-library-expanded-filters\.is-open \{ display: grid;/)
  assert.match(styles, /\.welcome-wod-compact h1/)
})

test('class builder and PT Studio use dark, readable field and selected-item surfaces', () => {
  assert.match(source('../src/components/Booking.jsx'), /import '\.\/builder-form-contrast\.css'/)
  assert.match(source('../src/components/PTStudio.jsx'), /import '\.\/builder-form-contrast\.css'/)
  const styles = source('../src/components/builder-form-contrast.css')
  for (const key of ['.class-wizard', '.pt2', '.pt2-modal', '.wod-picker-option.selected', '.pt2-workspace-switch button.selected']) {
    assert.ok(styles.includes(key), `Missing readable ${key} style`)
  }
  assert.match(styles, /color:\s*#f6fafb\s*!important/)
})
