export type BaseType = 'decimal' | 'binary' | 'octal' | 'hexadecimal'

export interface NumberState {
  decimal: string
  binary: string
  octal: string
  hexadecimal: string
}

export interface ValidationState {
  decimal: boolean
  binary: boolean
  octal: boolean
  hexadecimal: boolean
}

export interface ErrorState {
  decimal: string
  binary: string
  octal: string
  hexadecimal: string
}
