import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { isStaff } from '../lib/auth.js'
import { ArrowRight, CheckCircle2, Plus } from 'lucide-react'
import GarageSelect from './GarageSelect.jsx'
import './pt-management-ux.css'

const SPECIALTIES = ['Styrke','Funksjonell trening','Kondisjon','Mobilitet','Seniortrening','Rehabiliteringsretta trening','Teknikk']

export default function PTManagement({ profile,focusServiceRequest=null,onOpenClient=()=>{} }) {
  const staff = isStaff(profile)
  const [loading,setLoading] = useState(true)
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const [notice,setNotice] = useState('')
  const [members,setMembers] = useState([])
  const [coaches,setCoaches] = useState([])
  const [services,setServices] = useState([])
  const [requests,setRequests] = useState([])
  const [assignments,setAssignments] = useState([])
  // Incoming enquiries matter more than catalogue management: show the
  // actionable queue first when staff opens PT-administrasjon.
  const [tab,setTab] = useState(staff?'bestillingar':'tenester')
  const [coachDraft,setCoachDraft] = useState({user_id:'',public_name:'',bio:'',specialties:[],capacity:'8'})
  const [coachEdit,setCoachEdit] = useState(null)
  const [serviceDraft,setServiceDraft] = useState({title:'',description:'',suitable_for:'',duration_label:'',price_label:'',category:'Personleg trening'})
  const [requestDraft,setRequestDraft] = useState({service_id:'',member_note:'',preferred_at:''})
  const [assignDraft,setAssignDraft] = useState({member_id:'',coach_user_id:'',admin_note:''})
  const [selectedCoachByRequest,setSelectedCoachByRequest] = useState({})
  const [recentlyAssignedClientId,setRecentlyAssignedClientId] = useState('')
  const [showRequestHistory,setShowRequestHistory] = useState(false)
  const [setupTab,setSetupTab] = useState('tenester')

  async function load() {
    setLoading(true);setError('')
    const results = await Promise.all([
      // Ein PT kan òg vera admin eller manager. Berre kundar må vera godkjende medlemmer.
      staff ? supabase.from('profiles').select('id,display_name,role,membership_status').in('role',['member','manager','admin']).eq('active',true).order('display_name') : Promise.resolve({data:[],error:null}),
      supabase.from('pt_coaches').select('*,profiles!pt_coaches_user_id_fkey(id,display_name,role)').order('created_at',{ascending:false}),
      supabase.from('pt_services').select('*').order('sort_order').order('title'),
      supabase.from('pt_service_requests').select('*,pt_services(title)').order('created_at',{ascending:false}),
      staff ? supabase.from('pt_client_assignments').select('*').order('created_at',{ascending:false}) : supabase.from('pt_client_assignments').select('*').eq('member_id',profile.id).order('created_at',{ascending:false})
    ])
    const labels=['medlemsregister','PT-register','PT-tenester','bestillingar','PT-tilknytingar']
    results.forEach((r,i)=>{if(r.error)setError(v=>v||labels[i]+': '+r.error.message)})
    if(results[0].data)setMembers(results[0].data)
    setCoaches(results[1].data||[]);setServices(results[2].data||[]);setRequests(results[3].data||[]);setAssignments(results[4].data||[])
    setLoading(false)
  }
  useEffect(()=>{load()},[])
  useEffect(()=>{
    if(!focusServiceRequest?.id||loading)return
    setTab('bestillingar')
    setShowRequestHistory(true)
    const timer=window.setTimeout(()=>{
      const target=document.getElementById('pt-service-request-'+focusServiceRequest.id)
      target?.scrollIntoView({behavior:'smooth',block:'center'})
      target?.focus({preventScroll:true})
    },80)
    return()=>window.clearTimeout(timer)
  },[focusServiceRequest,loading])
  async function act(fn,success) {
    setBusy(true);setError('');setNotice('')
    try { await fn();await load();setNotice(success) }
    catch(e){setError(e.message||'Kunne ikkje lagra endringa.')}
    finally{setBusy(false)}
  }
  async function saveCoach(e) {
    e.preventDefault()
    await act(async()=>{
      if(!coachDraft.user_id||!coachDraft.public_name.trim())throw new Error('Vel ein brukar og eit offentleg PT-namn.')
      const {error}=await supabase.from('pt_coaches').insert({user_id:coachDraft.user_id,public_name:coachDraft.public_name.trim(),bio:coachDraft.bio,specialties:coachDraft.specialties,capacity:Number(coachDraft.capacity),created_by:profile.id})
      if(error)throw error
      setCoachDraft({user_id:'',public_name:'',bio:'',specialties:[],capacity:'8'})
    },'PT-en er registrert.')
  }
  async function saveService(e) {
    e.preventDefault()
    await act(async()=>{
      if(!serviceDraft.title.trim())throw new Error('Tenesta må ha eit namn.')
      const {error}=await supabase.from('pt_services').insert({...serviceDraft,created_by:profile.id,sort_order:services.length})
      if(error)throw error
      setServiceDraft({title:'',description:'',suitable_for:'',duration_label:'',price_label:'',category:'Personleg trening'})
    },'PT-tenesta er lagra.')
  }
  async function requestService(e, serviceOverride=null) {
    e.preventDefault()
    await act(async()=>{
      const service=serviceOverride||services.find(s=>s.id===requestDraft.service_id)
      if(!service)throw new Error('Vel ei PT-teneste.')
      const {error}=await supabase.from('pt_service_requests').insert({member_id:profile.id,service_id:service.id,service_title:service.title,member_note:requestDraft.member_note,preferred_at:requestDraft.preferred_at||null})
      if(error)throw error
      setRequestDraft({service_id:'',member_note:'',preferred_at:''})
    },'Førespurnaden er sendt. Admin behandlar bestillinga og tildeler PT.')
  }
  async function assignClient(e) {
    e.preventDefault()
    await act(async()=>{
      if(!assignDraft.member_id||!assignDraft.coach_user_id)throw new Error('Vel både kunde og PT.')
      if(requests.filter(r=>r.member_id===assignDraft.member_id&&['pending','reviewing'].includes(r.status)).length>1)throw new Error('Fleire opne førespurnader for kunden. Handsam dei frå Førespurnader først.')
      const {error}=await supabase.rpc('assign_pt_coach',{
        p_member_id:assignDraft.member_id,
        p_coach_user_id:assignDraft.coach_user_id,
        p_admin_note:assignDraft.admin_note,
        p_service_request_id:requests.find(r=>r.member_id===assignDraft.member_id&&['pending','reviewing'].includes(r.status))?.id||null
      })
      if(error)throw error
      setAssignDraft({member_id:'',coach_user_id:'',admin_note:''})
    },'Kunden har fått tildelt PT. Tidlegare tilknyting er teken vare på i historikken.')
  }
  async function handleRequest(row,coachId) {
    await act(async()=>{
      if(!coachId)throw new Error('Vel PT før du godkjenner bestillinga.')
      const {error}=await supabase.rpc('assign_pt_coach',{
        p_member_id:row.member_id,
        p_coach_user_id:coachId,
        p_admin_note:'Tildelt via PT-bestilling',
        p_service_request_id:row.id
      })
      if(error)throw error
      setSelectedCoachByRequest(current=>({...current,[row.id]:''}))
      setRecentlyAssignedClientId(row.member_id)
    },'Bestillinga er behandla og PT er tildelt.')
  }
  async function declineRequest(row) {
    if(!window.confirm('Avslå denne PT-førespurnaden? Kunden får beskjed, og saka blir avslutta.'))return
    await act(async()=>{
      const {data,error}=await supabase.from('pt_service_requests')
        .update({status:'declined',handled_by:profile.id,handled_at:new Date().toISOString()})
        .eq('id',row.id).in('status',['pending','reviewing']).select('id')
      if(error)throw error
      if(!data?.length)throw new Error('Saka har endra status. Oppdater lista og prøv igjen.')
    },'Førespurnaden er avslått og avslutta.')
  }
  async function startReview(row) {
    await act(async()=>{
      const {data,error}=await supabase.from('pt_service_requests')
        .update({status:'reviewing',handled_by:profile.id,handled_at:new Date().toISOString()})
        .eq('id',row.id).eq('status','pending').select('id')
      if(error)throw error
      if(!data?.length)throw new Error('Førespurnaden er endra av nokon andre. Oppdater lista og prøv igjen.')
    },'Førespurnaden er teken til behandling. Medlemmen får beskjed, og adminvarselet blir ståande fram til PT er tildelt.')
  }
  async function toggleCoach(row) {
    await act(async()=>{const {error}=await supabase.from('pt_coaches').update({is_active:!row.is_active,updated_at:new Date().toISOString()}).eq('id',row.id);if(error)throw error},'PT-registeret er oppdatert.')
  }
  async function saveCoachEdit(e) {
    e.preventDefault()
    await act(async()=>{
      if(!coachEdit?.public_name?.trim())throw new Error('Skriv inn namnet som skal visast til medlemmane.')
      const {error}=await supabase.from('pt_coaches').update({public_name:coachEdit.public_name.trim(),bio:coachEdit.bio,specialties:coachEdit.specialties,capacity:Number(coachEdit.capacity)}).eq('id',coachEdit.id)
      if(error)throw error
      setCoachEdit(null)
    },'PT-presentasjonen er oppdatert.')
  }
  async function toggleService(row) {
    await act(async()=>{const {error}=await supabase.from('pt_services').update({is_active:!row.is_active,updated_at:new Date().toISOString()}).eq('id',row.id);if(error)throw error},'Tenesta er oppdatert.')
  }
  if(loading)return <div className="training-state">Hentar PT-tenester …</div>
  const activeCoaches=coaches.filter(c=>c.is_active)
  const activeAssignments=assignments.filter(a=>a.status==='active')
  const pending=requests.filter(r=>r.status==='pending'||r.status==='reviewing')
  const orderedRequests=[...requests].sort((a,b)=>Number(['pending','reviewing'].includes(b.status))-Number(['pending','reviewing'].includes(a.status))||new Date(b.created_at)-new Date(a.created_at))
  const shownRequests=showRequestHistory?orderedRequests:orderedRequests.filter(r=>['pending','reviewing'].includes(r.status))
  const accounts=members.some(m=>m.id===profile.id)?members:[profile,...members].filter(Boolean)
  const availableCoaches=accounts.filter(m=>['admin','manager'].includes(m.role)||(m.role==='member'&&m.membership_status==='approved'))
    .filter(m=>!coaches.some(c=>c.user_id===m.id))
  const coachOptions=availableCoaches.map(m=>({value:m.id,label:(m.display_name||'Utan namn')+' · '+(m.role==='admin'?'administrator':m.role==='manager'?'driftsansvarleg':'medlem')+(m.id===profile.id?' (deg)':'')}))
  const clientMembers=members.filter(m=>m.role==='member'&&m.membership_status==='approved')
  const memberMap=new Map(members.map(m=>[m.id,m.display_name]))
  const coachName=id=>coaches.find(c=>c.user_id===id)?.profiles?.display_name||members.find(m=>m.id===id)?.display_name||'PT'
  return <div className="pt-admin">
    <header className="pt-admin-head"><div><span className="section-kicker">GARASJEGYM · PT TENESTER</span><h2>{staff?'PT-administrasjon':'Bestill PT-hjelp'}</h2><p>{staff?'Register, kundetildeling og tenestekatalog.':'Du er medlem i GarasjeGym. PT blir tildelt først når bestillinga di er behandla.'}</p></div></header>
    {error&&<div className="auth-error">{error}</div>}{notice&&<div className="auth-message"><CheckCircle2 size={15}/>{notice}</div>}{staff&&recentlyAssignedClientId&&tab==='bestillingar'&&<button type="button" className="secondary-button" onClick={()=>onOpenClient(recentlyAssignedClientId,'plan')}>Opna treningsplan for tildelt kunde <ArrowRight size={15}/></button>}
    {staff&&<><div className="pt-admin-quick-counts" aria-label="PT-status"><span><b>{pending.length}</b> førespurnader</span><span><b>{activeAssignments.length}</b> PT-kundar</span><span><b>{activeCoaches.length}</b> aktive PT-ar</span></div><nav className="pt2-tabs pt-admin-primary-tabs" aria-label="Drift av PT">{[['bestillingar','Førespurnader'],['kundar','Kundar og PT'],['tenester','Tilbod og oppsett']].map(([id,label])=><button key={id} className={tab===id||(id==='kundar'&&tab==='trenarar')?'selected':''} onClick={()=>setTab(id)}>{label}{id==='bestillingar'&&pending.length>0?<span className="pt-admin-count">{pending.length}</span>:null}</button>)}</nav></>}
    {staff&&(tab==='kundar'||tab==='trenarar')&&<nav className="pt-admin-subtabs" aria-label="Kundar og PT"><button type="button" className={tab==='kundar'?'selected':''} onClick={()=>setTab('kundar')}>Kundeforhold</button><button type="button" className={tab==='trenarar'?'selected':''} onClick={()=>setTab('trenarar')}>PT-register</button></nav>}
    {staff&&tab==='tenester'&&<nav className="pt-admin-subtabs" aria-label="Tilbod og oppsett"><button type="button" className={setupTab==='tenester'?'selected':''} onClick={()=>setSetupTab('tenester')}>Tenestekatalog</button><button type="button" className={setupTab==='drift'?'selected':''} onClick={()=>setSetupTab('drift')}>Korleis det fungerer</button></nav>}
    {!staff&&<nav className="pt2-tabs"><button className={tab==='tenester'?'selected':''} onClick={()=>setTab('tenester')}>PT-tenester</button><button className={tab==='mine'?'selected':''} onClick={()=>setTab('mine')}>Mine førespurnader</button></nav>}
    {staff&&tab==='tenester'&&setupTab==='drift'&&<section className="pt2-panel pt-admin-howto"><h3>Frå første spørsmål til oppfølging</h3><ol><li><strong>Førespurnad:</strong> Medlemmen spør om PT utan å bestilla eller betala for ein time. Saka kjem i varslingssenteret og under «Førespurnader».</li><li><strong>Ta kontakt:</strong> Start behandling når du har sett saka. Avklar behov og ønskje med kunden.</li><li><strong>Tildel PT:</strong> Vel trenar og trykk «Stadfest tildeling». Kunden får PT-kontakten sin, men ingen time blir bestilt automatisk.</li><li><strong>Avtal time:</strong> Opna kunden i PT Studio → PT-timar og dialog for å avtala eller oppretta ein konkret time.</li><li><strong>Følg opp:</strong> Bruk PT Studio til treningsplan, mål, samtale og statussjekkar.</li></ol><p>Gruppetimar er ei eiga ordning i timeplanen. Ei gruppetimepåmelding er ikkje PT-tildeling.</p></section>}
    {staff&&tab==='trenarar'&&<div className="pt-admin-grid"><section className="pt2-panel"><h3>Registrer PT</h3><form className="pt2-form" onSubmit={saveCoach}><div className="pt2-field"><span>Vel brukar</span><GarageSelect label="Vel brukar som PT" value={coachDraft.user_id} placeholder="Trykk for å velja brukar …" options={coachOptions} onChange={id=>{const chosen=accounts.find(m=>m.id===id);setCoachDraft(v=>({...v,user_id:id,public_name:chosen?.display_name||''}))}}/>{!coachOptions.length&&<small>Alle tilgjengelege brukarar er registrerte som PT.</small>}</div><Field label="Namn som medlemmane får sjå"><input maxLength="80" value={coachDraft.public_name} onChange={e=>setCoachDraft(v=>({...v,public_name:e.target.value}))} required/></Field><Field label="Kompetanseområde"><div className="pt2-check-grid">{SPECIALTIES.map(s=><label className="pt2-check" key={s}><input type="checkbox" checked={coachDraft.specialties.includes(s)} onChange={e=>setCoachDraft(v=>({...v,specialties:e.target.checked?[...v.specialties,s]:v.specialties.filter(x=>x!==s)}))}/>{s}</label>)}</div></Field><Field label="Kort presentasjon"><textarea rows="3" value={coachDraft.bio} onChange={e=>setCoachDraft(v=>({...v,bio:e.target.value}))}/></Field><Field label="Kapasitet – aktive kundar"><input type="number" min="0" max="100" value={coachDraft.capacity} onChange={e=>setCoachDraft(v=>({...v,capacity:e.target.value}))}/></Field><button className="primary-button" disabled={busy}><Plus size={15}/> Registrer PT</button></form></section><section className="pt2-panel"><h3>PT-register</h3>{coaches.map(c=><article className="pt-admin-row" key={c.id}><div><strong>{c.public_name||c.profiles?.display_name||'Ukjend brukar'}</strong><p>{(c.specialties||[]).join(' · ')||'Ingen kompetanseområde registrerte'}</p><small>{activeAssignments.filter(a=>a.coach_user_id===c.user_id).length} / {c.capacity} aktive kundar</small></div><div className="pt-coach-actions"><button type="button" className="secondary-button" onClick={()=>setCoachEdit({id:c.id,public_name:c.public_name||c.profiles?.display_name||'',bio:c.bio||'',specialties:c.specialties||[],capacity:String(c.capacity)})}>Endre presentasjon</button><button type="button" className="secondary-button" onClick={()=>toggleCoach(c)} disabled={busy}>{c.is_active?'Deaktiver':'Aktiver'}</button></div>{coachEdit?.id===c.id&&<form className="pt2-form pt-coach-edit" onSubmit={saveCoachEdit}><Field label="Namn medlemmane ser"><input maxLength="80" value={coachEdit.public_name} onChange={e=>setCoachEdit(v=>({...v,public_name:e.target.value}))} required/></Field><Field label="Kort presentasjon"><textarea rows="3" value={coachEdit.bio} onChange={e=>setCoachEdit(v=>({...v,bio:e.target.value}))}/></Field><Field label="Kompetanseområde"><div className="pt2-check-grid">{SPECIALTIES.map(s=><label className="pt2-check" key={s}><input type="checkbox" checked={coachEdit.specialties.includes(s)} onChange={e=>setCoachEdit(v=>({...v,specialties:e.target.checked?[...v.specialties,s]:v.specialties.filter(x=>x!==s)}))}/>{s}</label>)}</div></Field><Field label="Kapasitet"><input type="number" min="0" max="100" value={coachEdit.capacity} onChange={e=>setCoachEdit(v=>({...v,capacity:e.target.value}))}/></Field><div className="pt-coach-actions"><button className="primary-button" disabled={busy}>Lagre presentasjon</button><button type="button" className="secondary-button" onClick={()=>setCoachEdit(null)}>Avbryt</button></div></form>}</article>)}{!coaches.length&&<Empty>Ingen PT-ar registrerte enno.</Empty>}</section></div>}
    {staff&&tab==='kundar'&&<div className="pt-admin-grid"><section className="pt2-panel"><h3>Tildel PT utan førespurnad</h3><p>Bruk dette berre når de allereie har avtalt PT-oppfølging. Nye spørsmål kjem under «Førespurnader». Dersom kunden har éi open førespurnad, blir ho ferdighandsama saman med tildelinga.</p><form className="pt2-form" onSubmit={assignClient}><Field label="Medlem"><GarageSelect label="Vel medlem" value={assignDraft.member_id} placeholder="Vel kunde …" options={clientMembers.map(m=>({value:m.id,label:m.display_name||'Medlem'}))} onChange={value=>setAssignDraft(v=>({...v,member_id:value}))}/></Field><Field label="PT"><GarageSelect label="Vel PT" value={assignDraft.coach_user_id} placeholder="Vel PT …" options={activeCoaches.map(c=>({value:c.user_id,label:c.public_name||c.profiles?.display_name||'PT'}))} onChange={value=>setAssignDraft(v=>({...v,coach_user_id:value}))}/></Field><Field label="Administrativt notat"><textarea rows="2" value={assignDraft.admin_note} onChange={e=>setAssignDraft(v=>({...v,admin_note:e.target.value}))}/></Field><button className="primary-button" disabled={busy}>Tildel PT</button></form></section><section className="pt2-panel"><h3>Aktive kundeforhold</h3>{activeAssignments.map(a=><article className="pt-admin-row" key={a.id}><div><strong>{memberMap.get(a.member_id)||'Medlem'}</strong><p>PT: {coachName(a.coach_user_id)}</p><small>Tildelt {new Date(a.assigned_at).toLocaleDateString('nn-NO')}</small></div><button type="button" className="secondary-button" onClick={()=>onOpenClient(a.member_id)}>Opna i PT Studio <ArrowRight size={15}/></button></article>)}{!activeAssignments.length&&<Empty>Ingen aktive PT-relasjonar.</Empty>}</section></div>}
    {staff&&tab==='bestillingar'&&<section className="pt2-panel pt-admin-inbox"><div className="pt-admin-inbox-head"><div><span className="section-kicker">SAKSLISTE</span><h3>PT-hjelp – førespurnader <span className="pt-admin-count">{pending.length}</span></h3><p>Ei førespurnad er ikkje ei timebestilling. Ta kontakt, vel rett trenar og stadfest tildelinga. «Under behandling» betyr at saka framleis er open; ho blir først avslutta ved tildeling eller ei avsluttande avgjerd.</p></div><div className="pt-admin-case-actions"><button type="button" className="secondary-button" onClick={()=>setTab('trenarar')}>Opna PT-register <ArrowRight size={15}/></button><button type="button" className="secondary-button" onClick={()=>load()} disabled={busy}>Oppdater</button></div></div>
      {shownRequests.map(r=>{const active=['pending','reviewing'].includes(r.status);const coachId=selectedCoachByRequest[r.id]||'';const chosen=activeCoaches.find(c=>c.user_id===coachId);const coachFull=chosen&&activeAssignments.filter(a=>a.coach_user_id===chosen.user_id).length>=Number(chosen.capacity||0);return <article id={"pt-service-request-"+r.id} tabIndex={r.id===focusServiceRequest?.id?-1:undefined} className={'pt-admin-case'+(r.id===focusServiceRequest?.id?' is-focus-target':'')} key={r.id}>
        <div className="pt-admin-case-top"><div><strong>{memberMap.get(r.member_id)||'Medlem'}</strong><small>{new Date(r.created_at).toLocaleDateString('nn-NO')} · {r.service_title}</small></div><span className={'pt-admin-status '+(active?'needs-action':'')}>{r.status==='pending'?'Ny':r.status==='reviewing'?'Under behandling':r.status==='assigned'?'PT tildelt':r.status==='cancelled'?'Trekt tilbake':r.status==='declined'?'Avslått':r.status}</span></div>
        {r.member_note?.includes('Føretrekt PT: ')&&<p className="pt-admin-case-note"><strong>Ønskja PT: </strong>{r.member_note.split('Føretrekt PT: ')[1]?.split('\n')[0]}</p>}{r.member_note&&<p className="pt-admin-case-note">{r.member_note}</p>}
        {active?<div className="pt-admin-case-steps">{r.status==='pending'&&<><button type="button" className="secondary-button" onClick={()=>startReview(r)} disabled={busy}>Marker som teken imot</button><small>Set status til «Under behandling». Dette avsluttar ikkje førespurnaden.</small></>}{r.status==='reviewing'&&<small>Saka er motteken, men står framleis open. Vel PT og stadfest tildeling for å ferdighandsama henne.</small>}{!activeCoaches.length&&<div className="pt2-empty" role="status">Ingen aktive PT-ar er registrerte. Registrer eller aktiver ein PT før tildeling.<div><button type="button" className="secondary-button" onClick={()=>setTab('trenarar')}>Opna PT-register <ArrowRight size={15}/></button></div></div>}<label className="pt-admin-coach-picker"><span>Vel PT for {memberMap.get(r.member_id)||'kunden'}</span><GarageSelect label="Vel PT for førespurnaden" value={coachId} placeholder="Vel ein tilgjengeleg PT …" disabled={busy||!activeCoaches.length} options={activeCoaches.map(c=>({value:c.user_id,label:(c.public_name||c.profiles?.display_name||'PT')+' · '+activeAssignments.filter(a=>a.coach_user_id===c.user_id).length+'/'+c.capacity+' kundar'}))} onChange={value=>setSelectedCoachByRequest(current=>({...current,[r.id]:value}))}/></label>
        {chosen&&<small className={coachFull?'pt-admin-capacity-warning':'pt-admin-capacity-ok'}>{coachFull?'PT-en er ved oppgitt kapasitet. Vel helst ein annan trenar.':(chosen.public_name||chosen.profiles?.display_name||'PT')+' er vald. Kunden blir varsla ved stadfesting.'}</small>}
        <button type="button" className="primary-button" disabled={busy||!coachId||coachFull} onClick={()=>handleRequest(r,coachId)}><CheckCircle2 size={16}/> Stadfest tildeling</button><button type="button" className="secondary-button" disabled={busy} onClick={()=>declineRequest(r)}>Avslå førespurnad</button></div>:<div className="pt-admin-case-actions">{r.assigned_coach_id&&<small>PT: {coachName(r.assigned_coach_id)}</small>}<button type="button" className="secondary-button" onClick={()=>onOpenClient(r.member_id,'pt-timar')}>Avtal time / opna dialog <ArrowRight size={15}/></button>{r.status==='assigned'&&<button type="button" className="secondary-button" onClick={()=>onOpenClient(r.member_id,'plan')}>Opna treningsplan <ArrowRight size={15}/></button>}</div>}
      </article>})}
      {!pending.length&&!showRequestHistory&&<div className="pt-admin-inbox-empty"><CheckCircle2 size={20}/><span>Ingen nye PT-førespurnader. Alle er handsama.</span></div>}
      {!requests.length&&<Empty>Ingen PT-førespurnader enno.</Empty>}
      {requests.length>pending.length&&<button type="button" className="secondary-button pt-admin-history-toggle" onClick={()=>setShowRequestHistory(value=>!value)}>{showRequestHistory?'Skjul handsama saker':`Vis ${requests.length-pending.length} tidlegare saker`}</button>}</section>}
    {staff&&tab==='tenester'&&setupTab==='tenester'&&<div className="pt-admin-grid"><section className="pt2-panel"><h3>Ny PT-teneste</h3><form className="pt2-form" onSubmit={saveService}><Field label="Namn"><input value={serviceDraft.title} onChange={e=>setServiceDraft(v=>({...v,title:e.target.value}))} required/></Field><Field label="Kategori"><select value={serviceDraft.category} onChange={e=>setServiceDraft(v=>({...v,category:e.target.value}))}>{['Personleg trening','Introduksjonsprogram','Treningsprogram','Seniortrening','Rehabiliteringsretta trening','Teknikkurs','Oppfølging'].map(x=><option>{x}</option>)}</select></Field><Field label="Forklaring"><textarea rows="3" value={serviceDraft.description} onChange={e=>setServiceDraft(v=>({...v,description:e.target.value}))}/></Field><Field label="Passar for"><input value={serviceDraft.suitable_for} onChange={e=>setServiceDraft(v=>({...v,suitable_for:e.target.value}))}/></Field><Field label="Varigheit"><input value={serviceDraft.duration_label} onChange={e=>setServiceDraft(v=>({...v,duration_label:e.target.value}))} placeholder="Til dømes 6 veker"/></Field><Field label="Pris (valfritt)"><input value={serviceDraft.price_label} onChange={e=>setServiceDraft(v=>({...v,price_label:e.target.value}))} placeholder="Kan stå tomt"/></Field><button className="primary-button" disabled={busy}><Plus size={15}/> Lagre teneste</button></form></section><section className="pt2-panel"><h3>Tenestekatalog</h3>{services.map(s=><article className="pt-admin-row" key={s.id}><div><strong>{s.title}</strong><p>{s.description}</p><small>{s.category} · {s.duration_label||'Varigheit ikkje oppgitt'} {s.price_label&&'· '+s.price_label}</small></div><button className="secondary-button" onClick={()=>toggleService(s)}>{s.is_active?'Skjul':'Publiser'}</button></article>)}{!services.length&&<Empty>Ingen PT-tenester oppretta enno.</Empty>}</section></div>}
    {!staff&&tab==='tenester'&&<div className="pt-admin-service-grid">{services.filter(s=>s.is_active).map(s=><article className="pt2-panel" key={s.id}><span className="section-kicker">{s.category}</span><h3>{s.title}</h3><p>{s.description}</p>{s.suitable_for&&<p><b>Passar for:</b> {s.suitable_for}</p>}<div className="pt-admin-meta">{s.duration_label}{s.price_label&&' · '+s.price_label}</div><form className="pt2-form" onSubmit={e=>requestService(e,s)}><Field label="Merknad eller ønskje"><textarea rows="2" value={requestDraft.service_id===s.id?requestDraft.member_note:''} onChange={e=>setRequestDraft({service_id:s.id,member_note:e.target.value,preferred_at:requestDraft.preferred_at})} placeholder="Kva ønskjer du hjelp med?"/></Field><button className="primary-button" type="submit" disabled={busy}>Bestill / be om kontakt</button></form></article>)}{!services.some(s=>s.is_active)&&<Empty>Det er ikkje publisert PT-tenester enno.</Empty>}</div>}
    {!staff&&tab==='mine'&&<section className="pt2-panel"><h3>Mine PT-førespurnader</h3>{requests.map(r=><article className="pt-admin-row" key={r.id}><div><strong>{r.service_title}</strong><p>{r.member_note}</p><small>{new Date(r.created_at).toLocaleDateString('nn-NO')}</small></div><Pill tone={r.status==='assigned'?'success':''}>{r.status==='assigned'?'PT tildelt':r.status==='pending'?'Ventande':r.status}</Pill></article>)}{!requests.length&&<Empty>Du har ikkje sendt nokon førespurnad enno.</Empty>}</section>}
  </div>
}

function Field({label,children}) { return <label className="pt2-field"><span>{label}</span>{children}</label> }
function Empty({children}) { return <div className="pt2-empty">{children}</div> }
function Pill({children}) { return <span className="pt2-pill">{children}</span> }
