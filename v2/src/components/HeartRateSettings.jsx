import { useEffect, useState } from 'react'
import './heart-rate.css'
import { Bluetooth, BluetoothConnected, BluetoothOff, HeartPulse, LoaderCircle, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { connectHeartRateSensor, disconnectHeartRateSensor, getHeartRateSnapshot, isHeartRateBluetoothAvailable, subscribeHeartRate } from '../lib/heartRate.js'

const DEFAULTS = {
  hr_enabled: false,
  hr_share_with_pt: false,
  hr_share_on_screen: false,
  hr_save_history: false,
}

export default function HeartRateSettings() {
  const [preferences, setPreferences] = useState(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [sensor, setSensor] = useState(getHeartRateSnapshot())
  const [, setClockNow] = useState(Date.now())

  useEffect(() => subscribeHeartRate(setSensor), [])
  useEffect(() => {
    if (sensor.status !== 'connected') return undefined
    const interval = setInterval(() => setClockNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [sensor.status])

  useEffect(() => {
    let live = true
    async function load() {
      try {
        if (!supabase) throw new Error('Supabase er ikkje konfigurert.')
        const { data: authData, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError
        const user = authData?.user
        if (!user) return
        const { data: preferenceData, error: loadError } = await supabase.from('member_preferences')
          .select('hr_enabled,hr_share_with_pt,hr_share_on_screen,hr_save_history')
          .eq('user_id', user.id).maybeSingle()
        if (loadError) throw loadError
        if (live) setPreferences({ ...DEFAULTS, ...(preferenceData || {}) })
      } catch (loadError) {
        if (live) setError('Kunne ikkje lesa pulsinnstillingane: ' + (loadError.message || 'Ukjend feil'))
      } finally {
        if (live) setLoading(false)
      }
    }
    load()
    return () => { live = false }
  }, [])

  async function updatePreference(key, value) {
    const previous = preferences
    const next = { ...preferences, [key]: value }
    setPreferences(next)
    setSaving(key)
    setError('')
    setNotice('')
    try {
      if (!supabase) throw new Error('Supabase er ikkje konfigurert.')
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      const user = authData?.user
      if (!user) throw new Error('Du må vere innlogga.')
      const { error: saveError } = await supabase.from('member_preferences')
        .upsert({ user_id: user.id, ...next, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      if (saveError) throw saveError
      setNotice('Pulsinnstillingane er lagra.')
      if (key === 'hr_enabled' && !value) disconnectHeartRateSensor()
    } catch (saveError) {
      setPreferences(previous)
      setError(saveError.message || 'Kunne ikkje lagra innstillinga.')
    } finally {
      setSaving('')
    }
  }

  async function pairSensor() {
    setError('')
    setNotice('')
    try {
      await connectHeartRateSensor()
      setNotice('Pulsbeltet er kopla til. Du kan no gå til trening.')
    } catch (connectError) {
      if (connectError?.name !== 'NotFoundError') setError(connectError.message || 'Bluetooth-tilkoplinga feila.')
    }
  }

  const connected = sensor.status === 'connected'
  const stale = connected && (!sensor.receivedAt || Date.now() - sensor.receivedAt > 10000)

  return <section className="engine-section hr-settings">
    <div className="engine-section-title"><h4><HeartPulse size={17}/> Puls under trening</h4><span>Valfritt</span></div>
    <p className="hr-settings-intro">Bruk ditt eige Bluetooth-pulsbelte. Pulsmåling er heilt frivillig og påverkar ikkje vanleg trening.</p>
    {loading ? <div className="training-state"><LoaderCircle className="spin"/> Hentar innstillingar …</div> : <>
      <div className="hr-setting-row">
        <div><strong>Bruk puls under trening</strong><small>Gjer pulsmåling tilgjengeleg i treningsmodus.</small></div>
        <button type="button" className={preferences.hr_enabled ? 'simple-mode-toggle enabled' : 'simple-mode-toggle'} aria-pressed={preferences.hr_enabled} disabled={Boolean(saving)} onClick={() => updatePreference('hr_enabled', !preferences.hr_enabled)}>{preferences.hr_enabled ? 'På' : 'Av'}</button>
      </div>
      <div className="hr-sensor-card" aria-live="polite">
        <div className="hr-sensor-heading"><div className="hr-sensor-icon"><Bluetooth size={19}/></div><div><strong>{sensor.deviceName || 'Bluetooth-pulsbelte'}</strong><small>{connected ? (stale ? 'Ingen nye målingar' : 'Tilkopla') : sensor.status === 'connecting' ? 'Koplar til …' : 'Ikkje tilkopla'}</small></div><span className={connected && !stale ? 'hr-status-dot connected' : 'hr-status-dot'} /></div>
        {connected && <div className="hr-sensor-reading"><strong>{stale ? '–' : sensor.bpm ?? '–'}</strong><span>BPM</span></div>}
        <div className="hr-sensor-actions">
          <button type="button" className="secondary-button" disabled={!preferences.hr_enabled || sensor.status === 'connecting'} onClick={pairSensor}><BluetoothConnected size={15}/> {sensor.status === 'connecting' ? 'Koplar til …' : connected ? 'Byte pulsbelte' : 'Kople til pulsbelte'}</button>
          {connected && <button type="button" className="secondary-button" onClick={disconnectHeartRateSensor}><BluetoothOff size={15}/> Kople frå</button>}
        </div>
        {!isHeartRateBluetoothAvailable() && <small className="hr-compatibility">Bluetooth-tilkopling krev HTTPS og ein nettlesar med Web Bluetooth-støtte, til dømes Chrome på Android.</small>}
      </div>
      <div className="hr-setting-row"><div><strong>Del puls med PT</strong><small>Føretrekt val. Deling frå kundetelefon til PT-nettbrett blir kopla til i neste byggjesteg.</small></div><button type="button" className={preferences.hr_share_with_pt ? 'simple-mode-toggle enabled' : 'simple-mode-toggle'} aria-pressed={preferences.hr_share_with_pt} disabled={Boolean(saving) || !preferences.hr_enabled} onClick={() => updatePreference('hr_share_with_pt', !preferences.hr_share_with_pt)}>{preferences.hr_share_with_pt ? 'På' : 'Av'}</button></div>
      <div className="hr-setting-row"><div><strong>Del puls på storskjerm</strong><small>Føretrekt val. Storskjermdeling blir kopla til i neste byggjesteg.</small></div><button type="button" className={preferences.hr_share_on_screen ? 'simple-mode-toggle enabled' : 'simple-mode-toggle'} aria-pressed={preferences.hr_share_on_screen} disabled={Boolean(saving) || !preferences.hr_enabled} onClick={() => updatePreference('hr_share_on_screen', !preferences.hr_share_on_screen)}>{preferences.hr_share_on_screen ? 'På' : 'Av'}</button></div>
      <div className="hr-setting-row"><div><strong>Lagre puls i treningshistorikken</strong><small>Føretrekt val. Lagring i økthistorikken blir kopla til i neste byggjesteg.</small></div><button type="button" className={preferences.hr_save_history ? 'simple-mode-toggle enabled' : 'simple-mode-toggle'} aria-pressed={preferences.hr_save_history} disabled={Boolean(saving) || !preferences.hr_enabled} onClick={() => updatePreference('hr_save_history', !preferences.hr_save_history)}>{preferences.hr_save_history ? 'På' : 'Av'}</button></div>
    </>}
    {error && <div className="auth-error" role="alert">{error}</div>}
    {notice && <div className="simple-mode-feedback success" role="status">{notice}</div>}
    <div className="hr-privacy-note"><ShieldCheck size={15}/> Du styrer sjølv om puls blir målt, delt eller lagra. Alle vala kan slåast av att.</div>
  </section>
}
