// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  normalizeMac,
  formatMac,
  extractBits,
  convertMac,
} from '../useMacAddress'

describe('normalizeMac', () => {
  it('parses colon format', () => {
    const { hex, error } = normalizeMac('AA:BB:CC:DD:EE:FF')
    expect(error).toBe('')
    expect(hex).toBe('AABBCCDDEEFF')
  })

  it('parses hyphen format', () => {
    const { hex, error } = normalizeMac('AA-BB-CC-DD-EE-FF')
    expect(error).toBe('')
    expect(hex).toBe('AABBCCDDEEFF')
  })

  it('parses Cisco format', () => {
    const { hex, error } = normalizeMac('AABB.CCDD.EEFF')
    expect(error).toBe('')
    expect(hex).toBe('AABBCCDDEEFF')
  })

  it('parses no separator', () => {
    const { hex, error } = normalizeMac('AABBCCDDEEFF')
    expect(error).toBe('')
    expect(hex).toBe('AABBCCDDEEFF')
  })

  it('handles lowercase input', () => {
    const { hex, error } = normalizeMac('aa:bb:cc:dd:ee:ff')
    expect(error).toBe('')
    expect(hex).toBe('AABBCCDDEEFF')
  })

  it('handles mixed case input', () => {
    const { hex, error } = normalizeMac('Aa:Bb:Cc:Dd:Ee:Ff')
    expect(error).toBe('')
    expect(hex).toBe('AABBCCDDEEFF')
  })

  it('trims whitespace', () => {
    const { hex, error } = normalizeMac('  AA:BB:CC:DD:EE:FF  ')
    expect(error).toBe('')
    expect(hex).toBe('AABBCCDDEEFF')
  })

  it('rejects mixed separators', () => {
    const { error } = normalizeMac('AA:BB-CC:DD-EE:FF')
    expect(error).toBe('Mixed separators not allowed')
  })

  it('rejects short MAC', () => {
    const { error } = normalizeMac('AA:BB:CC')
    expect(error).toContain('Invalid')
  })

  it('rejects invalid hex', () => {
    const { error } = normalizeMac('GG:BB:CC:DD:EE:FF')
    expect(error).toContain('Invalid')
  })

  it('rejects empty input', () => {
    const { error } = normalizeMac('')
    expect(error).toBe('MAC address is required')
  })

  it('rejects wrong Cisco format', () => {
    const { error } = normalizeMac('AA.BB.CC.DD.EE.FF')
    expect(error).toContain('Invalid Cisco format')
  })
})

describe('formatMac', () => {
  const hex = 'AABBCCDDEEFF'

  it('formats to colon', () => {
    expect(formatMac(hex, 'colon')).toBe('AA:BB:CC:DD:EE:FF')
  })

  it('formats to hyphen', () => {
    expect(formatMac(hex, 'hyphen')).toBe('AA-BB-CC-DD-EE-FF')
  })

  it('formats to Cisco', () => {
    expect(formatMac(hex, 'cisco')).toBe('AABB.CCDD.EEFF')
  })

  it('formats to no separator', () => {
    expect(formatMac(hex, 'none')).toBe('AABBCCDDEEFF')
  })
})

describe('extractBits', () => {
  it('detects unicast (I/G bit = 0)', () => {
    const { isMulticast } = extractBits('AABBCCDDEEFF')
    expect(isMulticast).toBe(false)
  })

  it('detects multicast (I/G bit = 1)', () => {
    const { isMulticast } = extractBits('01005E000001')
    expect(isMulticast).toBe(true)
  })

  it('detects globally unique (U/L bit = 0)', () => {
    const { isLocallyAdministered } = extractBits('00BBCCDDEEFF')
    expect(isLocallyAdministered).toBe(false)
  })

  it('detects locally administered (U/L bit = 1)', () => {
    const { isLocallyAdministered } = extractBits('02AABBCCDDEE')
    expect(isLocallyAdministered).toBe(true)
  })
})

describe('convertMac', () => {
  it('converts standard MAC correctly', () => {
    const r = convertMac('AA:BB:CC:DD:EE:FF')
    expect(r.isValid).toBe(true)
    expect(r.oui).toBe('AABBCC')
    expect(r.colon).toBe('AA:BB:CC:DD:EE:FF')
    expect(r.hyphen).toBe('AA-BB-CC-DD-EE-FF')
    expect(r.cisco).toBe('AABB.CCDD.EEFF')
    expect(r.noSeparator).toBe('AABBCCDDEEFF')
    expect(r.lowercase).toBe('aa:bb:cc:dd:ee:ff')
  })

  it('detects broadcast MAC', () => {
    const r = convertMac('FF:FF:FF:FF:FF:FF')
    expect(r.isBroadcast).toBe(true)
    expect(r.isMulticast).toBe(true)
    expect(r.note).toContain('Broadcast')
  })

  it('detects all-zero MAC', () => {
    const r = convertMac('00:00:00:00:00:00')
    expect(r.isAllZero).toBe(true)
    expect(r.note).toContain('Default')
  })

  it('detects multicast MAC', () => {
    const r = convertMac('01:00:5E:00:00:01')
    expect(r.isMulticast).toBe(true)
    expect(r.note).toContain('Multicast')
  })

  it('detects locally administered MAC', () => {
    const r = convertMac('02:AA:BB:CC:DD:EE')
    expect(r.isLocallyAdministered).toBe(true)
    expect(r.note).toContain('Locally administered')
  })

  it('extracts OUI correctly', () => {
    const r = convertMac('AABBCCDDEEFF')
    expect(r.oui).toBe('AABBCC')
  })

  it('returns error for invalid input', () => {
    const r = convertMac('invalid')
    expect(r.isValid).toBe(false)
    expect(r.error).not.toBe('')
  })
})
