export interface IpCalcResult {
  isValid: boolean
  error: string
  // Core fields
  ipAddress: string
  cidrPrefix: number
  subnetMask: string
  wildcardMask: string
  networkAddress: string
  broadcastAddress: string
  totalAddresses: number
  usableHosts: number
  firstHost: string
  lastHost: string
  ipClass: string
  isPrivate: boolean
  binaryOctets: string[]
  integerValue: number
  // Edge case flags
  isLoopback: boolean
  isMulticast: boolean
  isReserved: boolean
  note: string
}

export interface IpCalcState {
  input: string
  result: IpCalcResult | null
}
