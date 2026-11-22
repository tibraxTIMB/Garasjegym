import { useEffect, useRef, useState } from 'react'
import { ArrowRight, CheckCircle2, HeartHandshake, MessageSquareText, ShieldCheck, UserRound, Users } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import './pt-inquiry.css'

const GOALS = [
  'Eg vil koma i gang',
  'Eg vil bli sterkare',
  'Eg ønskjer ein treningsplan',
  'Eg vil læra teknikk',
  'Eg ønskjer motivasjon og oppfølging',
  'Eg er berre nysgjerrig',
]

const requestStatus = status => ({
  pending: 'Sendt – ventar på svar',
  reviewing: 'Garasjen ser på førespurnaden',
  assigned: 'Du har fått tildelt PT',
  cancelled: 'Trekt tilbake',
  rejected: 'Avslutta',
}[status] || status)

export default function PTInquiry({ profile, onGroupSchedule = () => {} }) {
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [tab, setTab] = useState('start')
  const [coaches, setCoaches] = useState([])
  const [services, setServices] = useState([])
  const [requests, setRequests] = useState([])
  const [goal, setGoal] = useState('')
  const [coachId, setCoachId] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [note, setNote] = useState('')
  const formRef = useRef(null)

  async function load() {
    const [coachResult, serviceResult, requestResult] = await Promise.all([
      supabase.from('pt_coaches').select('id,user_id,public_name,bio,specialties,is_active').eq('is_active', true).order('created_at'),
      supabase.from('pt_services').select('id,title,description,suitable_for,duration_label,price_label,is_active').eq('is_active', true).order('sort_order'),
      supabase.from('pt_service_requests').select('id,service_title,member_note,created_at,status,assigned_coach_id').eq('member_id', profile.id).order('created_at', { ascending: false }),
    ])
    if (coachResult.error || serviceResult.error || requestResult.error) {
      setError('Kunne ikkje henta PT-informasjonen: ' + (coachResult.error || serviceResult.error || requestResult.error).message)
    } else {
      setCoaches(coachResult.data || [])
      setServices(serviceResult.data || [])
      setRequests(requestResult.data || [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [profile.id])

  function chooseCoach(id) {
    setCoachId(id)
    setTab('start')
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  async function submit(e) {
    e.preventDefault()
    if (!goal) { setError('Vel kva du ønskjer hjelp med først.'); return }
    setBusy(true); setError(''); setNotice('')
    const coach = coaches.find(c => c.user_id === coachId)
    const service = services.find(s => s.id === serviceId)
    const memberNote = [
      'Ønskje: ' + goal,
      coach ? 'Føretrekt PT: ' + coach.public_name : 'Føretrekt PT: Hjelp meg å finna rett PT',
      note.trim() ? 'Melding: ' + note.trim() : '',
    ].filter(Boolean).join('\n')
    const { error: saveError } = await supabase.from('pt_service_requests').insert({
      member_id: profile.id,
      service_id: service?.id || null,
      service_title: service?.title || 'Uforpliktande PT-prat',
      member_note: memberNote,
    })
    if (saveError) setError('Førespurnaden blei ikkje sendt: ' + saveError.message)
    else {
      setNotice('Førespurnaden er sendt. Dette er ikkje ei timebestilling. Du finn statusen nedanfor.')
      setGoal(''); setCoachId(''); setServiceId(''); setNote('')
      await load()
      setTab('mine')
    }
    setBusy(false)
  }

  async function withdraw(request) {
    if (!window.confirm('Vil du trekkja tilbake førespurnaden?')) return
    setBusy(true); setError(''); setNotice('')
    const { data, error: updateError } = await supabase.from('pt_service_requests')
      .update({ status: 'cancelled' }).eq('id', request.id).eq('member_id', profile.id).eq('status', 'pending').select('id')
    if (updateError || !data?.length) setError('Kunne ikkje trekkja førespurnaden: ' + (updateError?.message || 'Han kan alt vera under behandling.'))
    else { setNotice('Førespurnaden er trekt tilbake.'); await load() }
    setBusy(false)
  }

  const activeRequest = requests.find(r => ['pending', 'reviewing'].includes(r.status))
  if (loading) return <div className="training-state">Hentar PT-informasjon …</div>

  return <div className="pt-enquiry">
    <section className="pt-enquiry-hero">
      <span className="section-kicker">PERSONLEG TRENING I GARASJEN</span>
      <h3>Nysgjerrig på PT?</h3>
      <p>Du treng ikkje vita kva du vil bestilla. Fortel oss litt om kva du ønskjer hjelp med, så finn me ut av neste steg saman.</p>
      <div className="pt-enquiry-promise"><ShieldCheck size={19} /><span>Uforpliktande førespurnad. Ingen time eller betaling blir avtalt før du seier ja.</span></div>
      <button type="button" className="pt-enquiry-hero-cta" onClick={() => { setTab('start'); requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })) }}>Spør om PT <ArrowRight size={17} /></button>
    </section>

    <div className="pt-enquiry-compare" aria-label="Skilnaden på PT og gruppetime">
      <article><UserRound size={24} /><h4>Personleg trening</h4><p>Éin-til-éin hjelp, tilpassa dine mål. De avtalar tidspunkt saman etter at du har fått svar.</p><strong>Start med ein førespurnad</strong></article>
      <article><Users size={24} /><h4>Gruppetime</h4><p>Tren saman med andre på eit fast tidspunkt som ligg i timeplanen.</p><button type="button" onClick={onGroupSchedule}>Sjå gruppetimar <ArrowRight size={15} /></button></article>
    </div>

    <nav className="pt-enquiry-tabs" aria-label="PT-hjelp">
      <button type="button" className={tab === 'start' ? 'selected' : ''} onClick={() => setTab('start')}>Bli kjend med PT</button>
      <button type="button" className={tab === 'mine' ? 'selected' : ''} onClick={() => setTab('mine')}>Mine førespurnader ({requests.length})</button>
    </nav>

    {error && <div className="auth-error" role="alert">{error}</div>}
    {notice && <div className="auth-message" role="status"><CheckCircle2 size={18} /> {notice}</div>}

    {tab === 'start' && <>
      <section className="pt-enquiry-section">
        <span className="section-kicker">FOLKA BAK OPPFØLGINGA</span>
        <h3>Møt PT-ane våre</h3>
        {coaches.length ? <div className="pt-enquiry-coaches">{coaches.map(coach => <article className="pt-enquiry-coach" key={coach.id}>
          <div className="pt-enquiry-coach-head"><span className="pt-enquiry-avatar"><UserRound size={25} /></span><div><h4>{coach.public_name || 'PT i GarasjeGym'}</h4><small>Personleg trenar</small></div></div>
          {!!coach.specialties?.length && <div className="pt-enquiry-tags">{coach.specialties.map(s => <span key={s}>{s}</span>)}</div>}
          <p>{coach.bio || 'Ta kontakt for å høyra meir om trening og oppfølging.'}</p>
          <button type="button" className="secondary-button" onClick={() => chooseCoach(coach.user_id)}>Spør om denne PT-en <ArrowRight size={15} /></button>
        </article>)}</div> : <div className="pt-enquiry-empty"><HeartHandshake size={24} /><div><strong>PT-presentasjonane kjem her.</strong><p>Garasjen har ikkje publisert PT-profilar enno. Du kan likevel senda ei førespurnad, så tek dei kontakt om tilbodet.</p></div></div>}
      </section>

      {!!services.length && <section className="pt-enquiry-section"><span className="section-kicker">KVA KAN DU FÅ HJELP MED?</span><h3>Dette tilbyr me</h3><div className="pt-enquiry-services">{services.map(service => <button type="button" key={service.id} className={serviceId === service.id ? 'selected' : ''} onClick={() => { setServiceId(service.id); formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}><strong>{service.title}</strong><span>{service.description || service.suitable_for}</span><small>{[service.duration_label,service.price_label].filter(Boolean).join(' · ')}</small></button>)}</div></section>}

      <section className="pt-enquiry-form-section" ref={formRef}>
        <div className="pt-enquiry-form-heading"><MessageSquareText size={23} /><div><span className="section-kicker">FØRSTE STEG</span><h3>Send ein uforpliktande førespurnad</h3><p>Du treng berre svara på eitt spørsmål. Resten er valfritt.</p></div></div>
        {activeRequest ? <div className="pt-enquiry-existing"><CheckCircle2 size={21} /><div><strong>Du har alt ein førespurnad inne.</strong><p>Du kan følgja statusen og trekkja han tilbake dersom han ikkje er teken til behandling.</p><button type="button" className="secondary-button" onClick={() => setTab('mine')}>Sjå førespurnaden <ArrowRight size={15} /></button></div></div> : <form onSubmit={submit} className="pt-enquiry-form">
          <label>Kva ønskjer du hjelp med? <span className="pt-required">*</span><select value={goal} onChange={e => setGoal(e.target.value)} required><option value="">Vel det som passar best …</option>{GOALS.map(g => <option key={g} value={g}>{g}</option>)}</select></label>
          <label>Ønskjer du ein bestemt PT? <small>Valfritt</small><select value={coachId} onChange={e => setCoachId(e.target.value)}><option value="">Hjelp meg å finna rett PT</option>{coaches.map(c => <option value={c.user_id} key={c.id}>{c.public_name || 'PT i GarasjeGym'}</option>)}</select></label>
          {!!services.length && <label>Er du interessert i eit bestemt tilbod? <small>Valfritt</small><select value={serviceId} onChange={e => setServiceId(e.target.value)}><option value="">Usikker – eg vil berre spørja</option>{services.map(s => <option value={s.id} key={s.id}>{s.title}{s.price_label ? ` · ${s.price_label}` : ''}</option>)}</select></label>}
          <label>Noko du vil fortelja oss? <small>Valfritt</small><textarea rows="3" value={note} maxLength="1000" onChange={e => setNote(e.target.value)} placeholder="Til dømes erfaring, spørsmål eller kva du er usikker på …" /></label>
          <button type="submit" className="primary-button" disabled={busy}>{busy ? 'Sender …' : 'Send førespurnad'} <ArrowRight size={17} /></button>
          <p className="pt-enquiry-fineprint">Me får meldinga og kan svara deg om kva som passar. Ei PT-time er ikkje bestilt enno.</p>
        </form>}
      </section>
    </>}

    {tab === 'mine' && <section className="pt-enquiry-section"><h3>Mine PT-førespurnader</h3><p>Her ser du kva som skjer vidare. Ein førespurnad er ikkje ei bekrefta time.</p>
      {requests.length ? <div className="pt-enquiry-request-list">{requests.map(request => <article key={request.id}>
        <div className="pt-enquiry-request-head"><strong>{request.service_title}</strong><span className={request.status === 'assigned' ? 'assigned' : ''}>{requestStatus(request.status)}</span></div>
        <small>Sendt {new Date(request.created_at).toLocaleDateString('nn-NO', { day:'numeric', month:'long', year:'numeric' })}</small>
        <p>{request.member_note}</p>
        {request.status === 'pending' && <button type="button" className="secondary-button" disabled={busy} onClick={() => withdraw(request)}>Trekk tilbake førespurnad</button>}
        {request.status === 'assigned' && <p className="pt-enquiry-next">Ein PT er tildelt. De avtalar eventuell trening og vidare oppfølging saman.</p>}
      </article>)}</div> : <div className="pt-enquiry-empty"><MessageSquareText size={22} /><div><strong>Ingen førespurnader enno.</strong><p>Du kan ta kontakt utan å bestilla ei time.</p><button type="button" className="secondary-button" onClick={() => setTab('start')}>Bli kjend med PT <ArrowRight size={15} /></button></div></div>}
    </section>}
  </div>
}
