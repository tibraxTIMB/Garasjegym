const HEART_RATE_SERVICE = 'heart_rate'
const HEART_RATE_MEASUREMENT = 'heart_rate_measurement'

let snapshot = {
  status: 'disconnected',
  deviceName: '',
  bpm: null,
  receivedAt: null,
  error: '',
}
let activeDevice = null
let activeCharacteristic = null
let activeMeasurementHandler = null
let connectionAttempt = 0
const listeners = new Set()

function publish(patch) {
  snapshot = { ...snapshot, ...patch }
  listeners.forEach(listener => {
    try { listener(snapshot) } catch (error) { console.error('Heart-rate listener failed', error) }
  })
}

export function getHeartRateSnapshot() {
  return snapshot
}

export function subscribeHeartRate(listener) {
  listeners.add(listener)
  listener(snapshot)
  return () => listeners.delete(listener)
}

export function isHeartRateBluetoothAvailable() {
  return typeof window !== 'undefined' &&
    window.isSecureContext &&
    typeof navigator !== 'undefined' &&
    Boolean(navigator.bluetooth?.requestDevice)
}

export function parseHeartRateMeasurement(value) {
  if (!value || typeof value.getUint8 !== 'function' || value.byteLength < 2) return null
  const flags = value.getUint8(0)
  const is16Bit = Boolean(flags & 0x01)
  if (value.byteLength < (is16Bit ? 3 : 2)) return null
  const bpm = is16Bit ? value.getUint16(1, true) : value.getUint8(1)
  if (!Number.isFinite(bpm) || bpm < 25 || bpm > 250) return null
  return bpm
}

function clearActiveSensor({ disconnect = false } = {}) {
  if (activeCharacteristic && activeMeasurementHandler) {
    activeCharacteristic.removeEventListener('characteristicvaluechanged', activeMeasurementHandler)
  }
  if (activeCharacteristic) {
    try { activeCharacteristic.stopNotifications() } catch { /* Device may already be disconnected. */ }
  }
  if (activeDevice) {
    activeDevice.removeEventListener('gattserverdisconnected', handleDisconnected)
    if (disconnect && activeDevice.gatt?.connected) activeDevice.gatt.disconnect()
  }
  activeCharacteristic = null
  activeMeasurementHandler = null
  activeDevice = null
}

function handleDisconnected() {
  clearActiveSensor()
  publish({
    status: 'disconnected',
    deviceName: '',
    bpm: null,
    receivedAt: null,
    error: '',
  })
}

export async function connectHeartRateSensor() {
  if (!isHeartRateBluetoothAvailable()) {
    const message = !globalThis.isSecureContext
      ? 'Bluetooth krev sikker tilkopling (HTTPS).'
      : 'Denne nettlesaren støttar ikkje Web Bluetooth. Bruk Chrome på Android.'
    publish({ status: 'unsupported', error: message })
    throw new Error(message)
  }

  disconnectHeartRateSensor()
  const attempt = ++connectionAttempt
  publish({ status: 'connecting', error: '', bpm: null })

  try {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [HEART_RATE_SERVICE] }],
      optionalServices: [HEART_RATE_SERVICE],
    })
    if (attempt !== connectionAttempt) {
      if (device.gatt?.connected) device.gatt.disconnect()
      return null
    }

    activeDevice = device
    device.addEventListener('gattserverdisconnected', handleDisconnected)

    const server = await device.gatt.connect()
    if (attempt !== connectionAttempt) {
      if (device.gatt?.connected) device.gatt.disconnect()
      return null
    }

    const service = await server.getPrimaryService(HEART_RATE_SERVICE)
    if (attempt !== connectionAttempt) {
      if (device.gatt?.connected) device.gatt.disconnect()
      return null
    }

    const characteristic = await service.getCharacteristic(HEART_RATE_MEASUREMENT)
    if (attempt !== connectionAttempt) {
      if (device.gatt?.connected) device.gatt.disconnect()
      return null
    }

    activeCharacteristic = characteristic
    activeMeasurementHandler = event => {
      const bpm = parseHeartRateMeasurement(event.target.value)
      if (bpm == null || attempt !== connectionAttempt) return
      publish({
        status: 'connected',
        deviceName: device.name || 'Bluetooth-pulsbelte',
        bpm,
        receivedAt: Date.now(),
        error: '',
      })
    }
    characteristic.addEventListener('characteristicvaluechanged', activeMeasurementHandler)
    await characteristic.startNotifications()

    if (attempt !== connectionAttempt) {
      clearActiveSensor({ disconnect: true })
      return null
    }

    publish({
      status: 'connected',
      deviceName: device.name || 'Bluetooth-pulsbelte',
      error: '',
    })
    return device
  } catch (error) {
    if (attempt !== connectionAttempt) return null
    clearActiveSensor({ disconnect: true })
    publish({
      status: 'disconnected',
      deviceName: '',
      bpm: null,
      receivedAt: null,
      error: error?.name === 'NotFoundError' ? '' : (error?.message || 'Kunne ikkje kople til pulsbelte.'),
    })
    throw error
  }
}

export function disconnectHeartRateSensor() {
  connectionAttempt += 1
  clearActiveSensor({ disconnect: true })
  publish({ status: 'disconnected', deviceName: '', bpm: null, receivedAt: null, error: '' })
}
