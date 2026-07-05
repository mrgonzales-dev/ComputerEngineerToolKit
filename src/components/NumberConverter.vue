<script setup lang="ts">
import { ref } from 'vue'
import { useNumberConversion } from '../composables/useNumberConversion'
import type { BaseType } from '../types/number-converter'

const { state, errors, updateField, copyToClipboard, clearAll } = useNumberConversion()

const fields: { key: BaseType; label: string }[] = [
  { key: 'decimal', label: 'Decimal (Base 10)' },
  { key: 'binary', label: 'Binary (Base 2)' },
  { key: 'octal', label: 'Octal (Base 8)' },
  { key: 'hexadecimal', label: 'Hexadecimal (Base 16)' },
]

const copyFeedback = ref<Record<BaseType, boolean>>({
  decimal: false,
  binary: false,
  octal: false,
  hexadecimal: false,
})

const handleCopy = async (base: BaseType) => {
  const success = await copyToClipboard(base)
  if (success) {
    copyFeedback.value[base] = true
    setTimeout(() => {
      copyFeedback.value[base] = false
    }, 1500)
  }
}
</script>

<template>
  <div class="number-converter">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-semibold text-slate-200">Number Converter</h2>
      <button
        @click="clearAll"
        class="px-3 py-1.5 text-xs text-slate-400 hover:text-cyan-400 border border-slate-700 hover:border-cyan-500/50 rounded transition-colors"
      >
        Clear All
      </button>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div
        v-for="field in fields"
        :key="field.key"
        class="bg-slate-900/50 border border-slate-800 rounded-lg p-4"
      >
        <label
          :for="field.key"
          class="block text-xs uppercase tracking-wider text-slate-400 mb-2"
        >
          {{ field.label }}
        </label>
        <div class="relative">
          <input
            :id="field.key"
            :value="state[field.key]"
            @input="updateField(field.key, ($event.target as HTMLInputElement).value)"
            :class="[
              'w-full bg-black border rounded px-3 py-2 text-cyan-400 font-mono pr-10 outline-none transition-all',
              errors[field.key]
                ? 'border-red-500'
                : 'border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50',
            ]"
            type="text"
            :placeholder="`Enter ${field.key} value...`"
          />
          <button
            @click="handleCopy(field.key)"
            :disabled="!state[field.key]"
            :class="[
              'absolute right-2 top-1/2 -translate-y-1/2 transition-colors',
              copyFeedback[field.key] ? 'text-green-400' : 'text-slate-500 hover:text-cyan-400',
              'disabled:opacity-30 disabled:hover:text-slate-500'
            ]"
            :title="copyFeedback[field.key] ? 'Copied!' : `Copy ${field.label}`"
          >
            <svg
              v-if="!copyFeedback[field.key]"
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>
        </div>
        <p
          v-if="errors[field.key]"
          class="text-red-400 text-xs mt-1"
        >
          {{ errors[field.key] }}
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.number-converter {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Ensure monospace font for inputs */
input {
  font-family: 'SF Mono', 'Fira Code', 'Fira Mono', 'Roboto Mono', 'Lucida Console', Monaco, monospace;
}
</style>
