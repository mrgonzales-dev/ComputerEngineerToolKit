import { ref } from 'vue'
import type { IpCalcResult } from '../types/ip-calculator'

// --- Pure helper functions (exported for testing) ---

export function isValidOctet(octet: string): boolean {
  if (octet === '') return false
  if (!/^\d+$/.test(octet)) return false
  const n = parseInt(octet, 10)
  return n >= 0 && n <= 255
}

export function stripLeadingZeros(octet: string): string {
  if (octet === '0' || octet === '') return octet
  return octet.replace(/^0+/, '') || '0'
}

export function parseIpInput(input: string): { octets: number[]; prefix: number; error: string } {
  const trimmed = input.trim()

  if (trimmed === '') return { octets: [], prefix: 0, error: 'IP address is required' }

  // Split IP and CIDR
  const slashIndex = trimmed.indexOf('/')
  let ipPart: string
  let prefixPart: string | null = null

  if (slashIndex !== -1) {
    ipPart = trimmed.substring(0, slashIndex)
    prefixPart = trimmed.substring(slashIndex + 1)
  } else {
    ipPart = trimmed
  }

  // Validate prefix
  let prefix = 32 // default
  if (prefixPart !== null) {
    if (prefixPart === '') return { octets: [], prefix: 0, error: 'CIDR prefix cannot be empty after "/"' }
    if (!/^\d+$/.test(prefixPart)) return { octets: [], prefix: 0, error: 'CIDR prefix must be a number' }
    prefix = parseInt(prefixPart, 10)
    if (prefix < 0 || prefix > 32) return { octets: [], prefix: 0, error: 'CIDR prefix must be between 0 and 32' }
  }

  // Parse octets
  const octetStrings = ipPart.split('.')
  if (octetStrings.length !== 4) return { octets: [], prefix: 0, error: 'IP address must have exactly 4 octets' }

  const octets: number[] = []
  for (const raw of octetStrings) {
    if (!isValidOctet(raw)) {
      return { octets: [], prefix: 0, error: `Invalid octet: "${raw}"` }
    }
    // Silently strip leading zeros (MR. G approved Option B)
    octets.push(parseInt(stripLeadingZeros(raw), 10))
  }

  return { octets, prefix, error: '' }
}

export function octetsToInt(octets: number[]): number {
  return (octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]
}

export function intToOctets(value: number): number[] {
  return [
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ]
}

export function intToIp(value: number): string {
  return intToOctets(value).join('.')
}

export function octetsToBinary(octets: number[]): string[] {
  return octets.map((o) => o.toString(2).padStart(8, '0'))
}

export function getIpClass(firstOctet: number): string {
  if (firstOctet >= 0 && firstOctet <= 127) return 'Class A'
  if (firstOctet >= 128 && firstOctet <= 191) return 'Class B'
  if (firstOctet >= 192 && firstOctet <= 223) return 'Class C'
  if (firstOctet >= 224 && firstOctet <= 239) return 'Class D (Multicast)'
  if (firstOctet >= 240 && firstOctet <= 255) return 'Class E (Reserved)'
  return 'Unknown'
}

export function isPrivateRange(octets: number[]): boolean {
  const [a, b] = octets
  if (a === 10) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  return false
}

export function calcUsableHosts(prefix: number): number {
  const total = Math.pow(2, 32 - prefix)
  if (prefix === 32) return 0 // host route, single address
  if (prefix === 31) return 2 // RFC 3021 point-to-point, both usable
  return total - 2
}

export function calcHosts(networkInt: number, prefix: number): { first: number; last: number } {
  const total = Math.pow(2, 32 - prefix)
  if (prefix === 32) return { first: networkInt, last: networkInt }
  if (prefix === 31) return { first: networkInt, last: networkInt + 1 }
  return { first: networkInt + 1, last: networkInt + total - 2 }
}

export function calculateIp(input: string): IpCalcResult {
  const empty: IpCalcResult = {
    isValid: false,
    error: '',
    ipAddress: '',
    cidrPrefix: 0,
    subnetMask: '',
    wildcardMask: '',
    networkAddress: '',
    broadcastAddress: '',
    totalAddresses: 0,
    usableHosts: 0,
    firstHost: '',
    lastHost: '',
    ipClass: '',
    isPrivate: false,
    binaryOctets: [],
    integerValue: 0,
    isLoopback: false,
    isMulticast: false,
    isReserved: false,
    note: '',
  }

  const { octets, prefix, error } = parseIpInput(input)
  if (error) {
    return { ...empty, error }
  }

  const ipInt = octetsToInt(octets)
  const maskInt = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
  const wildcardInt = (~maskInt) >>> 0
  const networkInt = (ipInt & maskInt) >>> 0
  const broadcastInt = (networkInt | wildcardInt) >>> 0
  const totalAddresses = Math.pow(2, 32 - prefix)
  const usableHosts = calcUsableHosts(prefix)
  const { first, last } = calcHosts(networkInt, prefix)

  const firstOctet = octets[0]
  const ipClass = getIpClass(firstOctet)
  const isLoopback = firstOctet === 127
  const isMulticast = firstOctet >= 224 && firstOctet <= 239
  const isReserved = firstOctet >= 240

  // Build note for edge cases
  let note = ''
  if (isLoopback) note = 'Loopback address (127.0.0.0/8)'
  else if (isMulticast) note = 'Multicast address — no traditional network/broadcast'
  else if (isReserved) note = 'Reserved address (Class E)'
  else if (prefix === 32) note = 'Host route — single address, no subnet'
  else if (prefix === 31) note = 'RFC 3021 point-to-point link — both addresses usable'
  else if (firstOctet === 0 && prefix === 0) note = 'Entire IPv4 address space (0.0.0.0/0)'
  else if (firstOctet === 0) note = 'This network (0.0.0.0/8)'

  return {
    isValid: true,
    error: '',
    ipAddress: octets.join('.'),
    cidrPrefix: prefix,
    subnetMask: intToIp(maskInt),
    wildcardMask: intToIp(wildcardInt),
    networkAddress: intToIp(networkInt),
    broadcastAddress: intToIp(broadcastInt),
    totalAddresses,
    usableHosts,
    firstHost: intToIp(first),
    lastHost: intToIp(last),
    ipClass,
    isPrivate: isPrivateRange(octets),
    binaryOctets: octetsToBinary(octets),
    integerValue: ipInt >>> 0,
    isLoopback,
    isMulticast,
    isReserved,
    note,
  }
}

// --- Vue composable ---

export function useIpAddress() {
  const input = ref('')
  const result = ref<IpCalcResult | null>(null)
  const error = ref('')

  const calculate = () => {
    if (input.value.trim() === '') {
      result.value = null
      error.value = ''
      return
    }
    const calc = calculateIp(input.value)
    if (!calc.isValid) {
      result.value = null
      error.value = calc.error
      return
    }
    result.value = calc
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
    calculate,
    copyField,
    clear,
  }
}
