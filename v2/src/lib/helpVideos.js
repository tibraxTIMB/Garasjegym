// The video chapters use the same topic IDs and instructions as the help centre.
// Never record authenticated member sessions to produce a help video.
export const HELP_VIDEOS = [
  {
    id: 'kom-i-gang',
    title: 'Finn fram i GarasjeGym',
    summary: 'Menyane, Mi side og enkel visning.',
    topicIds: ['navigation', 'simple-mode'],
    relatedTopicIds: ['change-name'],
    illustration: 'home',
  },
  {
    id: 'fri-trening',
    title: 'Start og lagre ei økt',
    summary: 'Fri trening, klokke og gjennomgang.',
    topicIds: ['free-workout', 'finish-review'],
    relatedTopicIds: ['manual-log'],
    illustration: 'training',
  },
  {
    id: 'pt-og-gruppetime',
    title: 'PT eller gruppetime?',
    summary: 'Send PT-førespurnad eller meld deg på ein time.',
    topicIds: ['pt-contact', 'group-booking'],
    relatedTopicIds: ['pt-plan'],
    illustration: 'pt',
  },
  {
    id: 'wod-og-klokke',
    title: 'WOD og treningsklokke',
    summary: 'Vel ei ferdig økt og bruk klokka.',
    topicIds: ['wod-start', 'timer-basics'],
    relatedTopicIds: ['timer-rounds', 'wod-formats'],
    illustration: 'wod',
  },
  {
    id: 'reinhald-og-vedlikehald',
    title: 'Kvitter for vedlikehald',
    summary: 'Drift, sjekklister og oppfølging av avvik.',
    topicIds: ['garage-maintenance'],
    relatedTopicIds: [],
    illustration: 'maintenance',
  },
]

export function visibleHelpVideos(topics) {
  const visibleIds = new Set(topics.map(topic => topic.id))
  return HELP_VIDEOS.filter(video => video.topicIds.every(id => visibleIds.has(id)))
}

export function helpVideoForTopic(topicId, videos) {
  return videos.find(video => [...video.topicIds, ...video.relatedTopicIds].includes(topicId)) || null
}
