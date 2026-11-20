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
const listeners = new Set()

function publish(patch) {
  snapshot = { ...snapshot, ...patch }
  listeners.forEach(listener => listener(snapshot))
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
  if (!value || value.byteLength < 2) return null
  const flags = value.getUint8(0)
  const is16Bit = Boolean(flags & 0x01)
  const bpm = is16Bit ? value.getUint16(1, true) : value.getUint8(1)
  if (!Number.isFinite(bpm) || bpm < 25 || bpm > 250) return null
  return bpm
}

function handleDisconnected() {
  activeCharacteristic = null
  activeDevice = null
  publish({
    status: 'disconnected',
    deviceName: '',
    bpm: null,
    receivedAt: null,
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
  publish({ status: 'connecting', error: '', bpm: null })

  try {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [HEART_RATE_SERVICE] }],
      optionalServices: [HEART_RATE_SERVICE],
    })
    activeDevice = device
    device.addEventListener('gattserverdisconnected', handleDisconnected)

    const server = await device.gatt.connect()
    const service = await server.getPrimaryService(HEART_RATE_SERVICE)
    const characteristic = await service.getCharacteristic(HEART_RATE_MEASUREMENT)
    activeCharacteristic = characteristic

    characteristic.addEventListener('characteristicvaluechanged', event => {
      const bpm = parseHeartRateMeasurement(event.target.value)
      if (bpm == null) return
      publish({
        status: 'connected',
        deviceName: device.name || 'Bluetooth-pulsbelte',
        bpm,
        receivedAt: Date.now(),
        error: '',
      })
    })

    await characteristic.startNotifications()
    publish({
      status: 'connected',
      deviceName: device.name || 'Bluetooth-pulsbelte',
      error: '',
    })
    return device
  } catch (error) {
    if (activeDevice) activeDevice.removeEventListener('gattserverdisconnected', handleDisconnected)
    activeDevice = null
    activeCharacteristic = null
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
  if (activeCharacteristic) {
    try { activeCharacteristic.stopNotifications() } catch { /* Device may already be disconnected. */ }
  }
  if (activeDevice) {
    activeDevice.removeEventListener('gattserverdisconnected', handleDisconnected)
    if (activeDevice.gatt?.connected) activeDevice.gatt.disconnect()
  }
  activeCharacteristic = null
  activeDevice = null
  publish({ status: 'disconnected', deviceName: '', bpm: null, receivedAt: null, error: '' })
}
