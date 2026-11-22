// One command turns the actual help-centre instructions into five reusable MP4s.
// Illustrations are synthetic; no account, password or member data is opened.
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { HELP_TOPICS } from '../src/lib/helpContent.js'
import { HELP_VIDEOS } from '../src/lib/helpVideos.js'

export function makeVideoStoryboards(videos = HELP_VIDEOS, topics = HELP_TOPICS) {
  const byId = new Map(topics.map(topic => [topic.id, topic]))
  return videos.map(video => {
    const scenes = [{ kind: 'intro', title: video.title, text: video.summary }]
    for (const topicId of video.topicIds) {
      const topic = byId.get(topicId)
      if (!topic) throw new Error(`Videoen ${video.id} manglar hjelpetema ${topicId}`)
      for (const [index, text] of topic.steps.entries()) {
        scenes.push({ kind: 'step', title: topic.title, text, step: index + 1, total: topic.steps.length })
      }
    }
    scenes.push({ kind: 'outro', title: 'Prøv det sjølv', text: 'Finn rettleiinga under Mi side → Hjelp. Der kan du også opna funksjonen direkte.' })
    return { ...video, scenes }
  })
}

export function storyboardHash(storyboards = makeVideoStoryboards()) {
  return createHash('sha256').update(JSON.stringify(storyboards)).digest('hex')
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const python = process.env.HELP_VIDEO_PYTHON || 'python3'
  const script = fileURLToPath(new URL('./render-help-videos-offline.py', import.meta.url))
  const dest = fileURLToPath(new URL('../public/help/videos/', import.meta.url))
  const manifestPath = fileURLToPath(new URL('../public/help/videos/manifest.json', import.meta.url))
  const hash = storyboardHash()
  if (process.argv.includes('--check')) {
    let savedHash = null
    try { savedHash = JSON.parse(readFileSync(manifestPath, 'utf8')).sourceHash } catch { /* no previous video build */ }
    if (savedHash === hash) console.log('Hjelpevideoane samsvarar med rettleiingane.')
    else { console.error('Hjelpevideoane må genererast på nytt.'); process.exitCode = 1 }
  } else {
  const args = [script, '--output', dest, ...process.argv.slice(2)]
  const rendered = spawnSync(python, args, {
    input: JSON.stringify(makeVideoStoryboards()),
    encoding: 'utf8',
    stdio: ['pipe', 'inherit', 'inherit'],
  })
  if (rendered.error) throw rendered.error
  if (rendered.status !== 0) process.exit(rendered.status || 1)
  if (!process.argv.includes('--only')) {
    writeFileSync(manifestPath, `${JSON.stringify({sourceHash:hash, videos:HELP_VIDEOS.map(v=>v.id)}, null, 2)}\n`)
  }
  }
}
