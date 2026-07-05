// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  calculateIp,
  parseIpInput,
  isValidOctet,
  stripLeadingZeros,
} from '../useIpAddress'

describe('isValidOctet', () => {
  it('accepts valid octets 0-255', () => {
    expect(isValidOctet('0')).toBe(true)
    expect(isValidOctet('255')).toBe(true)
    expect(isValidOctet('128')).toBe(true)
  })

  it('rejects octets > 255', () => {
    expect(isValidOctet('256')).toBe(false)
    expect(isValidOctet('999')).toBe(false)
  })

  it('rejects non-numeric octets', () => {
    expect(isValidOctet('abc')).toBe(false)
    expect(isValidOctet('1a')).toBe(false)
    expect(isValidOctet('-1')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidOctet('')).toBe(false)
  })
})

describe('stripLeadingZeros', () => {
  it('strips leading zeros', () => {
    expect(stripLeadingZeros('001')).toBe('1')
    expect(stripLeadingZeros('010')).toBe('10')
    expect(stripLeadingZeros('000')).toBe('0')
  })

  it('preserves single zero', () => {
    expect(stripLeadingZeros('0')).toBe('0')
  })
})

describe('parseIpInput', () => {
  it('parses valid IP with CIDR', () => {
    const result = parseIpInput('192.168.1.0/24')
    expect(result.octets).toEqual([192, 168, 1, 0])
    expect(result.prefix).toBe(24)
    expect(result.error).toBe('')
  })

  it('defaults to /32 when no CIDR', () => {
    const result = parseIpInput('192.168.1.1')
    expect(result.octets).toEqual([192, 168, 1, 1])
    expect(result.prefix).toBe(32)
  })

  it('silently strips leading zeros (Option B)', () => {
    const result = parseIpInput('192.168.001.010/24')
    expect(result.octets).toEqual([192, 168, 1, 10])
    expect(result.error).toBe('')
  })

  it('trims whitespace', () => {
    const result = parseIpInput('  192.168.1.0/24  ')
    expect(result.octets).toEqual([192, 168, 1, 0])
    expect(result.prefix).toBe(24)
  })

  it('rejects empty input', () => {
    const result = parseIpInput('')
    expect(result.error).toBe('IP address is required')
  })

  it('rejects CIDR > 32', () => {
    const result = parseIpInput('192.168.1.0/33')
    expect(result.error).toBe('CIDR prefix must be between 0 and 32')
  })

  it('rejects trailing slash without prefix', () => {
    const result = parseIpInput('192.168.1.0/')
    expect(result.error).toBe('CIDR prefix cannot be empty after "/"')
  })

  it('rejects non-numeric CIDR', () => {
    const result = parseIpInput('192.168.1.0/abc')
    expect(result.error).toBe('CIDR prefix must be a number')
  })

  it('rejects wrong octet count', () => {
    const result = parseIpInput('192.168.1')
    expect(result.error).toBe('IP address must have exactly 4 octets')
  })

  it('rejects octet > 255', () => {
    const result = parseIpInput('256.1.1.1')
    expect(result.error).toContain('Invalid octet')
  })

  it('rejects negative octets', () => {
    const result = parseIpInput('-1.2.3.4')
    expect(result.error).toContain('Invalid octet')
  })
})

describe('calculateIp - standard cases', () => {
  it('calculates 192.168.1.0/24 correctly', () => {
    const r = calculateIp('192.168.1.0/24')
    expect(r.isValid).toBe(true)
    expect(r.ipAddress).toBe('192.168.1.0')
    expect(r.cidrPrefix).toBe(24)
    expect(r.subnetMask).toBe('255.255.255.0')
    expect(r.wildcardMask).toBe('0.0.0.255')
    expect(r.networkAddress).toBe('192.168.1.0')
    expect(r.broadcastAddress).toBe('192.168.1.255')
    expect(r.totalAddresses).toBe(256)
    expect(r.usableHosts).toBe(254)
    expect(r.firstHost).toBe('192.168.1.1')
    expect(r.lastHost).toBe('192.168.1.254')
    expect(r.ipClass).toBe('Class C')
    expect(r.isPrivate).toBe(true)
  })

  it('calculates 10.0.0.0/8 correctly', () => {
    const r = calculateIp('10.0.0.0/8')
    expect(r.subnetMask).toBe('255.0.0.0')
    expect(r.broadcastAddress).toBe('10.255.255.255')
    expect(r.usableHosts).toBe(16777214)
    expect(r.ipClass).toBe('Class A')
    expect(r.isPrivate).toBe(true)
  })

  it('calculates 172.16.0.0/12 correctly', () => {
    const r = calculateIp('172.16.0.0/12')
    expect(r.subnetMask).toBe('255.240.0.0')
    expect(r.networkAddress).toBe('172.16.0.0')
    expect(r.broadcastAddress).toBe('172.31.255.255')
    expect(r.isPrivate).toBe(true)
  })

  it('identifies 8.8.8.8 as public', () => {
    const r = calculateIp('8.8.8.8')
    expect(r.isPrivate).toBe(false)
  })

  it('identifies 172.32.0.0 as public', () => {
    const r = calculateIp('172.32.0.0/16')
    expect(r.isPrivate).toBe(false)
  })
})

describe('calculateIp - edge cases', () => {
  it('handles /32 as host route (0 usable hosts)', () => {
    const r = calculateIp('192.168.1.1/32')
    expect(r.usableHosts).toBe(0)
    expect(r.firstHost).toBe('192.168.1.1')
    expect(r.lastHost).toBe('192.168.1.1')
    expect(r.note).toContain('Host route')
  })

  it('handles /31 as RFC 3021 point-to-point (2 usable hosts)', () => {
    const r = calculateIp('192.168.1.0/31')
    expect(r.usableHosts).toBe(2)
    expect(r.firstHost).toBe('192.168.1.0')
    expect(r.lastHost).toBe('192.168.1.1')
    expect(r.note).toContain('RFC 3021')
  })

  it('handles 0.0.0.0/0 (entire internet)', () => {
    const r = calculateIp('0.0.0.0/0')
    expect(r.isValid).toBe(true)
    expect(r.subnetMask).toBe('0.0.0.0')
    expect(r.broadcastAddress).toBe('255.255.255.255')
    expect(r.totalAddresses).toBe(4294967296)
  })

  it('handles 255.255.255.255/32 (limited broadcast)', () => {
    const r = calculateIp('255.255.255.255/32')
    expect(r.isValid).toBe(true)
    expect(r.ipClass).toBe('Class E (Reserved)')
  })

  it('handles 127.0.0.0/8 (loopback)', () => {
    const r = calculateIp('127.0.0.0/8')
    expect(r.isLoopback).toBe(true)
    expect(r.note).toContain('Loopback')
  })

  it('detects Class D multicast (224.0.0.0/4)', () => {
    const r = calculateIp('224.0.0.0/4')
    expect(r.isMulticast).toBe(true)
    expect(r.ipClass).toBe('Class D (Multicast)')
    expect(r.note).toContain('Multicast')
  })

  it('detects Class E reserved (240.0.0.0/4)', () => {
    const r = calculateIp('240.0.0.0/4')
    expect(r.isReserved).toBe(true)
    expect(r.ipClass).toBe('Class E (Reserved)')
  })

  it('produces correct binary octets', () => {
    const r = calculateIp('192.168.1.0/24')
    expect(r.binaryOctets).toEqual(['11000000', '10101000', '00000001', '00000000'])
  })

  it('produces correct integer value', () => {
    const r = calculateIp('192.168.1.0/24')
    expect(r.integerValue).toBe(3232235776)
  })
})
