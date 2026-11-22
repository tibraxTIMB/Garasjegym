import { useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, ChevronDown, ChevronLeft, ChevronRight, Coffee, Dumbbell, HelpCircle, Home, Lightbulb, MessageSquareText, PlayCircle, Search, Settings, ShieldCheck, Timer, Trophy, Users, Video } from 'lucide-react'
import { HELP_CATEGORIES, HELP_FAQS, HELP_GLOSSARY, searchHelpTopics, visibleHelpTopics } from '../lib/helpContent.js'
import { helpVideoForTopic, visibleHelpVideos } from '../lib/helpVideos.js'
import './help-center.css'

const icons = { home:Home, timer:Timer, dumbbell:Dumbbell, trophy:Trophy, users:Users, coffee:Coffee, settings:Settings, shield:ShieldCheck }
const popular = ['free-workout','wod-start','pt-contact','group-booking','coffee-order','finish-review']

export default function HelpCenter({ profile, isCoach = false, initialTopic = null, onClose = () => {}, onNavigate = () => {} }) {
  const [query, setQuery] = useState('')
  const [view, setView] = useState('guides')
  const [returnView, setReturnView] = useState('guides')
  const [category, setCategory] = useState('all')
  const [activeId, setActiveId] = useState(initialTopic && initialTopic !== 'navigation' ? initialTopic : null)
  const [expandedQuestion, setExpandedQuestion] = useState('')
  const [videoOpen, setVideoOpen] = useState(null)
  const headerRef = useRef(null)
  const topics = useMemo(() => visibleHelpTopics(profile, isCoach), [profile?.role, isCoach])
  const videos = useMemo(() => visibleHelpVideos(topics), [topics])
  const activeTopic = topics.find(topic => topic.id === activeId)
  const activeVideo = helpVideoForTopic(activeId, videos)
  const siblings = activeTopic ? topics.filter(topic => topic.category === activeTopic.category) : []
  const siblingIndex = siblings.findIndex(topic => topic.id === activeId)
  const shownTopics = searchHelpTopics(topics, query).filter(topic => query.trim() || category === 'all' || topic.category === category)
  const shownTerms = HELP_GLOSSARY.filter(([term, explanation]) => (term + ' ' + explanation).toLocaleLowerCase('nn-NO').includes(query.trim().toLocaleLowerCase('nn-NO')))
  const shownQuestions = HELP_FAQS.filter(item => (item.question + ' ' + item.answer).toLocaleLowerCase('nn-NO').includes(query.trim().toLocaleLowerCase('nn-NO')))
  const shownCategories = HELP_CATEGORIES.filter(group => topics.some(topic => topic.category === group.id))
  const chosenCategory = shownCategories.find(group => group.id === category)
  const shownVideos = videos.filter(video => !query.trim() || `${video.title} ${video.summary}`.toLocaleLowerCase('nn-NO').includes(query.trim().toLocaleLowerCase('nn-NO')))

  function openTopic(id) {
    if (!topics.some(topic => topic.id === id)) return
    if (!activeId) setReturnView(view)
    if (activeId !== id) setVideoOpen(null)
    setActiveId(id)
    requestAnimationFrame(() => headerRef.current?.scrollIntoView({ behavior:'smooth', block:'start' }))
  }
  function goBack() {
    setVideoOpen(null)
    if (activeId) { setActiveId(null); setView(returnView) }
    else if (view !== 'guides') setView('guides')
    else if (category !== 'all' && !query.trim()) setCategory('all')
    else onClose()
    requestAnimationFrame(() => headerRef.current?.scrollIntoView({ behavior:'smooth', block:'start' }))
  }

  return <section className="gg-help" ref={headerRef}>
    <header className="gg-help-header">
      <button type="button" className="gg-help-back" onClick={goBack}><ArrowLeft size={17} /> {activeTopic ? 'Tilbake til oversikta' : view !== 'guides' ? 'Til rettleiingane' : category !== 'all' ? 'Til kategoriane' : 'Mi side'}</button>
      <div className="gg-help-intro"><span className="section-kicker">GARASJEGYM · HJELPESENTER</span><h2>{activeTopic?.title || 'Hjelp og rettleiing'}</h2>{activeTopic&&<p>{activeTopic.summary}</p>}</div>
      {!activeTopic&&<label className="gg-help-search"><Search size={19}/><span className="sr-only">Søk i hjelpa</span><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Søk etter funksjon eller spørsmål …"/>{query && <button type="button" onClick={() => setQuery('')} aria-label="Tøm søket">×</button>}</label>}
    </header>

    {activeTopic&&<><div className="gg-help-detail-meta"><span>{HELP_CATEGORIES.find(group => group.id === activeTopic.category)?.title}</span><span>{activeTopic.time} lesetid</span></div><article className="gg-help-detail">{activeVideo&&<section className="gg-help-video-detail"><button type="button" className="gg-help-video-toggle" aria-expanded={videoOpen===activeTopic.id} onClick={()=>setVideoOpen(open=>open===activeTopic.id?null:activeTopic.id)}><PlayCircle size={21}/><span><strong>{videoOpen===activeTopic.id?'Lukk videoen':'Sjå kort instruksjonsvideo'}</strong><small>{activeVideo.title} · tekst på nynorsk</small></span><ChevronDown size={18}/></button>{videoOpen===activeTopic.id&&<div className="gg-help-player"><video key={activeVideo.id} controls playsInline preload="metadata" poster={`${import.meta.env.BASE_URL}help/videos/${activeVideo.id}.png`} src={`${import.meta.env.BASE_URL}help/videos/${activeVideo.id}.mp4`} aria-label={`Instruksjonsvideo: ${activeVideo.title}`}>Nettlesaren din støttar ikkje video. Bruk stega nedanfor.</video><p>Opptak frå den ekte appvisinga, med lokale demodata og utan medlemsopplysningar. Teksten nedanfor er den fullstendige bruksrettleiinga.</p></div>}</section>}<ol className="gg-help-steps">{activeTopic.steps.map((step,i)=><li key={i}><span className="gg-help-step-number">{i+1}</span><p>{step}</p></li>)}</ol>{activeTopic.tip&&<div className="gg-help-tip"><Lightbulb size={18}/><p>{activeTopic.tip}</p></div>}{activeTopic.action&&<div className="gg-help-deep-link"><button type="button" className="primary-button gg-help-action" onClick={()=>onNavigate(activeTopic.action)}>{activeTopic.actionLabel||'Opna funksjonen'} <ArrowRight size={16}/></button><small>Dette opnar funksjonen utanfor hjelpesenteret.</small></div>}</article><nav className="gg-help-detail-nav" aria-label="Bla mellom rettleiingar"><button type="button" disabled={siblingIndex<=0} onClick={()=>openTopic(siblings[siblingIndex-1]?.id)}><ChevronLeft size={17}/> Førre</button><button type="button" onClick={goBack}><BookOpen size={17}/> Alle tema</button><button type="button" disabled={siblingIndex<0||siblingIndex>=siblings.length-1} onClick={()=>openTopic(siblings[siblingIndex+1]?.id)}>Neste <ChevronRight size={17}/></button></nav><section className="gg-help-related"><strong>Fleire tema om det same</strong><div>{siblings.filter(topic=>topic.id!==activeId).slice(0,3).map(topic=><button type="button" key={topic.id} onClick={()=>openTopic(topic.id)}>{topic.title}<ArrowRight size={13}/></button>)}</div></section></>}

    {!activeTopic&&<>

    <div className="gg-help-view-tabs" role="tablist" aria-label="Type hjelp">
      <button type="button" role="tab" aria-selected={view === 'guides'} className={view === 'guides' ? 'selected' : ''} onClick={() => setView('guides')}><BookOpen size={16}/> Rettleiingar</button>
      <button type="button" role="tab" aria-selected={view === 'videos'} className={view === 'videos' ? 'selected' : ''} onClick={() => setView('videos')}><Video size={16}/> Videoar</button>
      <button type="button" role="tab" aria-selected={view === 'glossary'} className={view === 'glossary' ? 'selected' : ''} onClick={() => setView('glossary')}><HelpCircle size={16}/> Ordliste</button>
      <button type="button" role="tab" aria-selected={view === 'faq'} className={view === 'faq' ? 'selected' : ''} onClick={() => setView('faq')}><MessageSquareText size={16}/> Spørsmål</button>
    </div>

    {view === 'guides' && <>
      {!query.trim() && category === 'all' && <>
        <section className="gg-help-quick"><span className="section-kicker">VANLEGE OPPGÅVER</span><div className="gg-help-quick-strip">{popular.map(id => { const topic = topics.find(item => item.id === id); return topic&&<button type="button" key={id} onClick={()=>openTopic(id)}>{topic.title}<ArrowRight size={14}/></button> })}</div></section>
        <section className="gg-help-categories"><div className="gg-help-result-head"><h3>Vel eit område</h3><small>{shownCategories.length} kategoriar</small></div><div className="gg-help-category-grid">{shownCategories.map(group=>{const Icon=icons[group.icon]||BookOpen;return <button type="button" key={group.id} onClick={()=>setCategory(group.id)}><Icon size={19}/><strong>{group.title}</strong><span>{topics.filter(topic=>topic.category===group.id).length}</span><ChevronRight size={15}/></button>})}</div></section>
      </>}
      {(query.trim() || category !== 'all') && <div className="gg-help-results"><div className="gg-help-result-head"><div className="gg-help-result-title">{!query.trim()&&<button type="button" className="gg-help-category-back" onClick={()=>setCategory('all')}><ArrowLeft size={15}/> Alle kategoriar</button>}<h3>{query.trim()?'Søkeresultat':chosenCategory?.title}</h3></div><small>{shownTopics.length} tema</small></div>
        {shownTopics.length ? shownTopics.map(topic => { const Icon = icons[HELP_CATEGORIES.find(group => group.id === topic.category)?.icon] || BookOpen; return <button type="button" className="gg-help-topic" key={topic.id} onClick={() => openTopic(topic.id)}><span className="gg-help-topic-icon"><Icon size={19}/></span><span className="gg-help-topic-title"><strong>{topic.title}</strong><small>{topic.summary}</small></span><ChevronRight size={18}/></button> }) : <div className="gg-help-empty">Ingen rettleiingar passar søket. Prøv eit kortare ord eller vel «Alle tema».</div>}
      </div>
      }
    </>}

    {view === 'videos' && <section className="gg-help-results"><div className="gg-help-result-head"><div><h3>Korte videoar</h3><p>Skjermopptak frå GarasjeGym med trygge demodata og nynorsk tekst. I rettleiingane finn du stega forklart.</p></div><small>{shownVideos.length} videoar</small></div><div className="gg-help-video-grid">{shownVideos.map(video=><button type="button" key={video.id} onClick={()=>{openTopic(video.topicIds[0]);setVideoOpen(video.topicIds[0])}}><span className="gg-help-video-play"><PlayCircle size={22}/></span><strong>{video.title}</strong><small>{video.summary}</small></button>)}</div>{!shownVideos.length&&<div className="gg-help-empty">Ingen videoar passar søket. Prøv eit anna ord.</div>}</section>}

    {view === 'glossary' && <section className="gg-help-results"><div className="gg-help-result-head"><div><h3>Ord og uttrykk</h3><p>Ei enkel forklaring på ord frå trening, WOD og kaffibaren.</p></div><small>{shownTerms.length} ord</small></div><div className="gg-help-glossary">{shownTerms.map(([term,explanation]) => <article key={term}><strong>{term}</strong><p>{explanation}</p></article>)}{!shownTerms.length && <div className="gg-help-empty">Ingen ord passar søket.</div>}</div></section>}

    {view === 'faq' && <section className="gg-help-results"><div className="gg-help-result-head"><h3>Vanlege spørsmål</h3><small>{shownQuestions.length} svar</small></div>{shownQuestions.map(item => { const open = expandedQuestion === item.question; return <article className="gg-help-faq" key={item.question}><button type="button" aria-expanded={open} onClick={() => setExpandedQuestion(open ? '' : item.question)}><strong>{item.question}</strong><ChevronDown size={18}/></button>{open && <div><p>{item.answer}</p><button type="button" className="gg-help-more" onClick={() => openTopic(item.topic)}>Sjå steg-for-steg <ArrowRight size={15}/></button></div>}</article> })}{!shownQuestions.length && <div className="gg-help-empty">Ingen spørsmål passar søket.</div>}</section>}

    </>}
  </section>
}
