import { ref, computed } from 'vue'
import type { BaseType, NumberState, ErrorState } from '../types/number-converter'

const VALIDATORS: Record<BaseType, RegExp> = {
  decimal: /^-?[0-9]+$/,
  binary: /^-?[0-1]+$/,
  octal: /^-?[0-7]+$/,
  hexadecimal: /^-?[0-9a-fA-F]+$/,
}

const BASE_RADIX: Record<BaseType, number> = {
  decimal: 10,
  binary: 2,
  octal: 8,
  hexadecimal: 16,
}

export function useNumberConversion() {
  const state = ref<NumberState>({
    decimal: '',
    binary: '',
    octal: '',
    hexadecimal: '',
  })

  const errors = ref<ErrorState>({
    decimal: '',
    binary: '',
    octal: '',
    hexadecimal: '',
  })

  const isValid = (base: BaseType, value: string): boolean => {
    if (value === '') return true
    return VALIDATORS[base].test(value)
  }

  const parseToBigInt = (base: BaseType, value: string): bigint | null => {
    if (value === '') return null
    try {
      const isNegative = value.startsWith('-')
      const absoluteValue = isNegative ? value.slice(1) : value
      
      let result: bigint
      switch (base) {
        case 'decimal':
          result = BigInt(absoluteValue)
          break
        case 'binary':
          result = BigInt('0b' + absoluteValue)
          break
        case 'octal':
          result = BigInt('0o' + absoluteValue)
          break
        case 'hexadecimal':
          result = BigInt('0x' + absoluteValue)
          break
        default:
          return null
      }
      
      return isNegative ? -result : result
    } catch {
      return null
    }
  }

  const convertFromBigInt = (value: bigint, targetBase: BaseType): string => {
    return value.toString(BASE_RADIX[targetBase]).toUpperCase()
  }

  const updateField = (base: BaseType, value: string) => {
    // Clear error for this field
    errors.value[base] = ''

    // Validate input
    if (!isValid(base, value)) {
      errors.value[base] = `Invalid character for ${base}`
      return
    }

    // Update the field being edited
    state.value[base] = value

    // If empty, clear all fields
    if (value === '') {
      Object.keys(state.value).forEach((key) => {
        state.value[key as BaseType] = ''
      })
      return
    }

    // Parse to BigInt
    const parsed = parseToBigInt(base, value)
    if (parsed === null) {
      errors.value[base] = 'Invalid number format'
      return
    }

    // Convert to other bases
    const bases: BaseType[] = ['decimal', 'binary', 'octal', 'hexadecimal']
    bases.forEach((targetBase) => {
      if (targetBase !== base) {
        state.value[targetBase] = convertFromBigInt(parsed, targetBase)
      }
    })
  }

  const copyToClipboard = async (base: BaseType): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(state.value[base])
      return true
    } catch {
      return false
    }
  }

  const clearAll = () => {
    state.value = {
      decimal: '',
      binary: '',
      octal: '',
      hexadecimal: '',
    }
    errors.value = {
      decimal: '',
      binary: '',
      octal: '',
      hexadecimal: '',
    }
  }

  return {
    state,
    errors,
    updateField,
    copyToClipboard,
    clearAll,
  }
}
