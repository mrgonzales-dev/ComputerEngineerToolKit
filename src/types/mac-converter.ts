export type MacFormat = 'colon' | 'hyphen' | 'cisco' | 'none'

export interface MacConversionResult {
  isValid: boolean
  error: string
  raw: string
  oui: string
  colon: string
  hyphen: string
  cisco: string
  noSeparator: string
  lowercase: string
  uppercase: string
  isMulticast: boolean
  isLocallyAdministered: boolean
  isBroadcast: boolean
  isAllZero: boolean
  note: string
}
