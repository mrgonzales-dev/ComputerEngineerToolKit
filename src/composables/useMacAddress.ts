import { ref } from 'vue'
import type { MacConversionResult, MacFormat } from '../types/mac-converter'

// --- Pure helper functions (exported for testing) ---

export function normalizeMac(input: string): { hex: string; error: string } {
  const trimmed = input.trim()

  if (trimmed === '') return { hex: '', error: 'MAC address is required' }

  const hasColon = trimmed.includes(':')
  const hasHyphen = trimmed.includes('-')
  const hasDot = trimmed.includes('.')

  // Reject mixed separators
  const separatorCount = [hasColon, hasHyphen, hasDot].filter(Boolean).length
  if (separatorCount > 1) {
    return { hex: '', error: 'Mixed separators not allowed' }
  }

  let hex: string

  if (hasColon) {
    if (!/^([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}$/.test(trimmed)) {
      return { hex: '', error: 'Invalid colon format (expected XX:XX:XX:XX:XX:XX)' }
    }
    hex = trimmed.replace(/:/g, '')
  } else if (hasHyphen) {
    if (!/^([0-9a-fA-F]{2}-){5}[0-9a-fA-F]{2}$/.test(trimmed)) {
      return { hex: '', error: 'Invalid hyphen format (expected XX-XX-XX-XX-XX-XX)' }
    }
    hex = trimmed.replace(/-/g, '')
  } else if (hasDot) {
    if (!/^([0-9a-fA-F]{4}\.){2}[0-9a-fA-F]{4}$/.test(trimmed)) {
      return { hex: '', error: 'Invalid Cisco format (expected XXXX.XXXX.XXXX)' }
    }
    hex = trimmed.replace(/\./g, '')
  } else {
    if (!/^[0-9a-fA-F]{12}$/.test(trimmed)) {
      return { hex: '', error: 'Invalid MAC (expected 12 hex characters or separated format)' }
    }
    hex = trimmed
  }

  return { hex: hex.toUpperCase(), error: '' }
}

export function formatMac(hex: string, format: MacFormat): string {
  switch (format) {
    case 'colon':
      return hex.match(/.{2}/g)!.join(':')
    case 'hyphen':
      return hex.match(/.{2}/g)!.join('-')
    case 'cisco':
      return `${hex.substring(0, 4)}.${hex.substring(4, 8)}.${hex.substring(8, 12)}`
    case 'none':
      return hex
  }
}

export function extractBits(hex: string): {
  isMulticast: boolean
  isLocallyAdministered: boolean
} {
  const firstByte = parseInt(hex.substring(0, 2), 16)
  const isMulticast = (firstByte & 0x01) === 1
  const isLocallyAdministered = (firstByte & 0x02) === 2
  return { isMulticast, isLocallyAdministered }
}

export function convertMac(input: string): MacConversionResult {
  const empty: MacConversionResult = {
    isValid: false,
    error: '',
    raw: '',
    oui: '',
    colon: '',
    hyphen: '',
    cisco: '',
    noSeparator: '',
    lowercase: '',
    uppercase: '',
    isMulticast: false,
    isLocallyAdministered: false,
    isBroadcast: false,
    isAllZero: false,
    note: '',
  }

  const { hex, error } = normalizeMac(input)
  if (error) {
    return { ...empty, error }
  }

  const { isMulticast, isLocallyAdministered } = extractBits(hex)
  const isBroadcast = hex === 'FFFFFFFFFFFF'
  const isAllZero = hex === '000000000000'

  let note = ''
  if (isBroadcast) note = 'Broadcast MAC address'
  else if (isAllZero) note = 'Default / unset MAC address'
  else if (isMulticast) note = 'Multicast address (I/G bit set)'
  else if (isLocallyAdministered) note = 'Locally administered address (U/L bit set)'

  return {
    isValid: true,
    error: '',
    raw: hex,
    oui: hex.substring(0, 6),
    colon: formatMac(hex, 'colon'),
    hyphen: formatMac(hex, 'hyphen'),
    cisco: formatMac(hex, 'cisco'),
    noSeparator: formatMac(hex, 'none'),
    lowercase: formatMac(hex, 'colon').toLowerCase(),
    uppercase: formatMac(hex, 'none'),
    isMulticast,
    isLocallyAdministered,
    isBroadcast,
    isAllZero,
    note,
  }
}

// --- Vue composable ---

export function useMacAddress() {
  const input = ref('')
  const result = ref<MacConversionResult | null>(null)
  const error = ref('')

  const convert = () => {
    if (input.value.trim() === '') {
      result.value = null
      error.value = ''
      return
    }
    const res = convertMac(input.value)
    if (!res.isValid) {
      result.value = null
      error.value = res.error
      return
    }
    result.value = res
    error.value = ''
  }

  const copyField = async (value: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(value)
      return true
    } catch {
      return false
    }
  }

  const clear = () => {
    input.value = ''
    result.value = null
    error.value = ''
  }

  return {
    input,
    result,
    error,
    convert,
    copyField,
    clear,
  }
}
