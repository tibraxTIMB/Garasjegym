import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ChevronDown, Coffee, Dumbbell, HelpCircle, Home, Lightbulb, MessageSquareText, Search, Settings, ShieldCheck, Timer, Trophy, Users } from 'lucide-react'
import { HELP_CATEGORIES, HELP_FAQS, HELP_GLOSSARY, searchHelpTopics, visibleHelpTopics } from '../lib/helpContent.js'
import './help-center.css'

const icons = { home:Home, timer:Timer, dumbbell:Dumbbell, trophy:Trophy, users:Users, coffee:Coffee, settings:Settings, shield:ShieldCheck }
const popular = ['free-workout','wod-start','pt-contact','group-booking','coffee-order','finish-review']

export default function HelpCenter({ profile, isCoach = false, initialTopic = null, onClose = () => {}, onNavigate = () => {} }) {
  const [query, setQuery] = useState('')
  const [view, setView] = useState('guides')
  const [category, setCategory] = useState('all')
  const [expanded, setExpanded] = useState(initialTopic || 'navigation')
  const [expandedQuestion, setExpandedQuestion] = useState('')
  const topics = useMemo(() => visibleHelpTopics(profile, isCoach), [profile?.role, isCoach])
  const shownTopics = searchHelpTopics(topics, query).filter(topic => category === 'all' || topic.category === category)
  const shownTerms = HELP_GLOSSARY.filter(([term, explanation]) => (term + ' ' + explanation).toLocaleLowerCase('nn-NO').includes(query.trim().toLocaleLowerCase('nn-NO')))
  const shownQuestions = HELP_FAQS.filter(item => (item.question + ' ' + item.answer).toLocaleLowerCase('nn-NO').includes(query.trim().toLocaleLowerCase('nn-NO')))
  const shownCategories = HELP_CATEGORIES.filter(group => topics.some(topic => topic.category === group.id))

  function openTopic(id) {
    if (!topics.some(topic => topic.id === id)) return
    setView('guides'); setCategory('all'); setQuery(''); setExpanded(id)
    requestAnimationFrame(() => document.getElementById('gg-help-' + id)?.scrollIntoView({ behavior:'smooth', block:'start' }))
  }

  return <section className="gg-help">
    <header className="gg-help-header">
      <button type="button" className="gg-help-back" onClick={onClose}><ArrowLeft size={17} /> Mi side</button>
      <div className="gg-help-intro"><span className="section-kicker">GARASJEGYM · HJELPESENTER</span><h2>Hjelp og rettleiing</h2><p>Finn ut korleis funksjonane verkeleg fungerer. Søk, vel eit tema eller følg ei kort steg-for-steg-rettleiing.</p></div>
      <label className="gg-help-search"><Search size={19}/><span className="sr-only">Søk i hjelpa</span><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Søk etter funksjon, øving eller spørsmål …"/>{query && <button type="button" onClick={() => setQuery('')} aria-label="Tøm søket">×</button>}</label>
    </header>

    {!query && <div className="gg-help-popular"><span className="section-kicker">VANLEGE OPPGÅVER</span><div className="gg-help-popular-grid">{popular.map(id => { const topic = topics.find(item => item.id === id); if (!topic) return null; const Icon = icons[HELP_CATEGORIES.find(item => item.id === topic.category)?.icon] || BookOpen; return <button type="button" key={id} onClick={() => openTopic(id)}><Icon size={21}/><span>{topic.title}</span><ArrowRight size={15}/></button> })}</div></div>}

    <div className="gg-help-view-tabs" role="tablist" aria-label="Type hjelp">
      <button type="button" role="tab" aria-selected={view === 'guides'} className={view === 'guides' ? 'selected' : ''} onClick={() => setView('guides')}><BookOpen size={16}/> Slik gjer du det</button>
      <button type="button" role="tab" aria-selected={view === 'glossary'} className={view === 'glossary' ? 'selected' : ''} onClick={() => setView('glossary')}><HelpCircle size={16}/> Ordliste</button>
      <button type="button" role="tab" aria-selected={view === 'faq'} className={view === 'faq' ? 'selected' : ''} onClick={() => setView('faq')}><MessageSquareText size={16}/> Spørsmål og svar</button>
    </div>

    {view === 'guides' && <>
      <div className="gg-help-filters" aria-label="Hjelpekategoriar"><button type="button" className={category === 'all' ? 'selected' : ''} onClick={() => setCategory('all')}>Alle tema</button>{shownCategories.map(group => <button type="button" key={group.id} className={category === group.id ? 'selected' : ''} onClick={() => setCategory(group.id)}>{group.title}</button>)}</div>
      <div className="gg-help-results"><div className="gg-help-result-head"><h3>Rettleiingar</h3><small>{shownTopics.length} tema</small></div>
        {shownTopics.length ? shownTopics.map(topic => { const Icon = icons[HELP_CATEGORIES.find(group => group.id === topic.category)?.icon] || BookOpen; const open = expanded === topic.id; return <article className={'gg-help-topic' + (open ? ' open' : '')} key={topic.id} id={'gg-help-' + topic.id}>
          <button type="button" className="gg-help-topic-toggle" aria-expanded={open} onClick={() => setExpanded(open ? '' : topic.id)}><span className="gg-help-topic-icon"><Icon size={21}/></span><span className="gg-help-topic-title"><strong>{topic.title}</strong><small>{topic.summary}</small><em>{topic.time} lesetid</em></span><ChevronDown className="gg-help-chevron" size={19}/></button>
          {open && <div className="gg-help-topic-body"><ol className="gg-help-steps">{topic.steps.map((step,i) => <li key={i}><span className="gg-help-step-number">{i+1}</span><p>{step}</p></li>)}</ol>{topic.tip && <div className="gg-help-tip"><Lightbulb size={18}/><p>{topic.tip}</p></div>}{topic.action && <button type="button" className="primary-button gg-help-action" onClick={() => onNavigate(topic.action)}>{topic.actionLabel || 'Opna funksjonen'} <ArrowRight size={16}/></button>}</div>}
        </article> }) : <div className="gg-help-empty">Ingen rettleiingar passar søket. Prøv eit kortare ord eller vel «Alle tema».</div>}
      </div>
    </>}

    {view === 'glossary' && <section className="gg-help-results"><div className="gg-help-result-head"><div><h3>Ord og uttrykk</h3><p>Ei enkel forklaring på ord frå trening, WOD og kaffibaren.</p></div><small>{shownTerms.length} ord</small></div><div className="gg-help-glossary">{shownTerms.map(([term,explanation]) => <article key={term}><strong>{term}</strong><p>{explanation}</p></article>)}{!shownTerms.length && <div className="gg-help-empty">Ingen ord passar søket.</div>}</div></section>}

    {view === 'faq' && <section className="gg-help-results"><div className="gg-help-result-head"><h3>Vanlege spørsmål</h3><small>{shownQuestions.length} svar</small></div>{shownQuestions.map(item => { const open = expandedQuestion === item.question; return <article className="gg-help-faq" key={item.question}><button type="button" aria-expanded={open} onClick={() => setExpandedQuestion(open ? '' : item.question)}><strong>{item.question}</strong><ChevronDown size={18}/></button>{open && <div><p>{item.answer}</p><button type="button" className="gg-help-more" onClick={() => openTopic(item.topic)}>Sjå steg-for-steg <ArrowRight size={15}/></button></div>}</article> })}{!shownQuestions.length && <div className="gg-help-empty">Ingen spørsmål passar søket.</div>}</section>}

    <footer className="gg-help-footer"><CheckCircle2 size={18}/><p>Rettleiingane beskriv GarasjeGym slik funksjonane er bygde. Nokre val er berre synlege for PT, manager eller administrator. Du kan alltid opna hjelpa på nytt frå Mi side.</p></footer>
  </section>
}
