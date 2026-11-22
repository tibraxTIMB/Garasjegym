import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { HELP_TOPICS, HELP_GLOSSARY, HELP_GLOSSARY_GROUPS, visibleHelpTopics } from '../src/lib/helpContent.js'
import { HELP_VIDEOS, helpVideoForTopic, visibleHelpVideos } from '../src/lib/helpVideos.js'
import { makeVideoStoryboards, storyboardHash } from './generate-help-videos.mjs'

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')

test('five video guides use real help topics and have complete nynorsk captions', () => {
  const boards = makeVideoStoryboards()
  assert.equal(boards.length, 5)
  assert.equal(new Set(boards.map(board => board.id)).size, 5)
  for (const board of boards) {
    assert.equal(board.scenes[0].kind, 'intro')
    assert.equal(board.scenes.at(-1).kind, 'outro')
    assert.ok(board.scenes.filter(scene => scene.kind === 'step').length >= 4)
    for (const topicId of board.topicIds) {
      const topic = HELP_TOPICS.find(item => item.id === topicId)
      assert.ok(topic, `Topic ${topicId} missing`)
      assert.ok(topic.steps.every(text => board.scenes.some(scene => scene.text === text)))
    }
  }
})

test('member-facing video list never exposes admin-only maintenance video', () => {
  const members = visibleHelpVideos(visibleHelpTopics({role:'member'}))
  const admins = visibleHelpVideos(visibleHelpTopics({role:'admin'}))
  assert.equal(members.length, 4)
  assert.equal(admins.length, 5)
  assert.equal(helpVideoForTopic('garage-maintenance', members), null)
  assert.equal(helpVideoForTopic('garage-maintenance', admins)?.id, 'reinhald-og-vedlikehald')
  assert.equal(helpVideoForTopic('timer-rounds', members)?.id, 'wod-og-klokke')
})

test('generated videos and posters exist and are not zero-byte placeholders', () => {
  const manifest = JSON.parse(read('../public/help/videos/manifest.json'))
  assert.equal(manifest.sourceHash, storyboardHash(), 'Video captions must match current help topics')
  for (const video of HELP_VIDEOS) {
    const mp4 = new URL(`../public/help/videos/${video.id}.mp4`, import.meta.url)
    const poster = new URL(`../public/help/videos/${video.id}.png`, import.meta.url)
    assert.ok(existsSync(mp4), `${video.id} MP4 missing`)
    assert.ok(statSync(mp4).size > 10000, `${video.id} MP4 empty`)
    assert.ok(existsSync(poster), `${video.id} poster missing`)
  }
})

test('video has an explicit play action, direct mobile fallback and the complete text guide', () => {
  const help = read('../src/components/HelpCenter.jsx')
  assert.match(help, /visibleHelpVideos\(topics\)/)
  assert.match(help, /videoOpen===activeTopic\.id/)
  assert.match(help, /controls playsInline preload="auto"/)
  assert.match(help, /<source src=\{videoUrl\} type="video\/mp4"/)
  assert.match(help, /<source src=\{webmUrl\} type="video\/webm"/)
  assert.match(help, /onClick=\{togglePlayback\}/)
  assert.match(help, /Opna direkte/)
  assert.match(help, /Prøv WebM/)
  assert.match(help, /opplesing av nynorsk tekst/)
  assert.match(help, /videoStatus==='error'/)
  assert.match(help, /activeTopic\.steps\.map/)
  assert.match(help, /Bla mellom rettleiingar/)
  assert.doesNotMatch(help, /autoPlay/)
})

test('recorded help videos contain local Norwegian narration timed to screen captions', () => {
  const recorder = read('./record-real-help-videos.py')
  const narration = read('./help_video_narration.py')
  const pronunciation = read('./help_video_pronunciation.py')
  const generator = read('./generate-live-help-videos.mjs')
  const validator = read('./check-real-help-videos.mjs')
  assert.match(recorder, /VoiceTimeline/)
  assert.match(recorder, /'-c:a','aac'/)
  assert.match(recorder, /'-c:a','libopus'/)
  assert.match(narration, /voice\.synthesize_wav/)
  assert.match(narration, /duration \+ 0\.65/)
  assert.match(narration, /pronunciation\.render/)
  assert.match(pronunciation, /phonemize\('en-us'/)
  assert.match(pronunciation, /\[\[\{self\.cache\[key\]\}\]\]/)
  assert.doesNotMatch(pronunciation, /Lingit.+load_lexicon/)
  assert.match(recorder, /EnglishWorkoutPronunciation/)
  assert.match(generator, /HELP_VIDEO_VOICE_MODEL/)
  assert.match(validator, /MP4 manglar opplesing/)
})

test('glossary categories account for every word exactly once', () => {
  const all = HELP_GLOSSARY.map(([term]) => term)
  const grouped = HELP_GLOSSARY_GROUPS.flatMap(group => group.terms)
  assert.equal(new Set(grouped).size, all.length)
  assert.deepEqual([...grouped].sort(), [...all].sort())
  assert.ok(HELP_GLOSSARY_GROUPS.some(group => group.id === 'wod'))
  assert.ok(HELP_GLOSSARY_GROUPS.some(group => group.id === 'pt'))
})

test('help landing page offers category choices and an independent video tab', () => {
  const help = read('../src/components/HelpCenter.jsx')
  const css = read('../src/components/help-center.css')
  assert.match(help, /category === 'all' && <>/)
  assert.match(help, /gg-help-category-grid/)
  assert.match(help, /gg-help-quick-strip/)
  assert.match(help, /view === 'videos'/)
  assert.match(help, /role="tab" aria-selected=\{view === 'videos'\}/)
  assert.match(help, /setCategory\('all'\)/)
  assert.match(help, /switchView\('videos'\)/)
  assert.match(help, /gg-help-glossary-categories/)
  assert.match(css, /grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/)
})
