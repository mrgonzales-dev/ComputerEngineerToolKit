<script setup lang="ts">
import { ref } from 'vue'
import { useMacAddress } from '../composables/useMacAddress'
import type { MacConversionResult } from '../types/mac-converter'

const { input, result, error, convert, copyField, clear } = useMacAddress()

const copyFeedback = ref<string>('')

const handleCopy = async (label: string, value: string) => {
  if (!value) return
  const success = await copyField(value)
  if (success) {
    copyFeedback.value = label
    setTimeout(() => {
      copyFeedback.value = ''
    }, 1500)
  }
}

const handleInput = () => {
  convert()
}

const fields = (r: MacConversionResult) => [
  { label: 'Colon', value: r.colon },
  { label: 'Hyphen', value: r.hyphen },
  { label: 'Cisco', value: r.cisco },
  { label: 'No Separator', value: r.noSeparator },
  { label: 'Lowercase', value: r.lowercase },
  { label: 'Uppercase', value: r.uppercase },
  { label: 'OUI', value: r.oui },
]
</script>

<template>
  <div class="mac-converter">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-semibold text-slate-200">MAC Address Converter</h2>
      <button
        @click="clear"
        class="px-3 py-1.5 text-xs text-slate-400 hover:text-cyan-400 border border-slate-700 hover:border-cyan-500/50 rounded transition-colors"
      >
        Clear
      </button>
    </div>

    <!-- Input -->
    <div class="bg-slate-900/50 border border-slate-800 rounded-lg p-4 mb-4">
      <label
        for="mac-input"
        class="block text-xs uppercase tracking-wider text-slate-400 mb-2"
      >
        MAC Address
      </label>
      <input
        id="mac-input"
        v-model="input"
        @input="handleInput"
        :class="[
          'w-full bg-black border rounded px-3 py-2 text-cyan-400 font-mono outline-none transition-all',
          error
            ? 'border-red-500'
            : 'border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50',
        ]"
        type="text"
        placeholder="e.g. AA:BB:CC:DD:EE:FF"
      />
      <p v-if="error" class="text-red-400 text-xs mt-1">{{ error }}</p>
      <p v-else class="text-slate-600 text-xs mt-1">
        Supports colon, hyphen, Cisco (AABB.CCDD.EEFF), or no separator
      </p>
    </div>

    <!-- Results -->
    <div v-if="result && result.isValid" class="space-y-4">
      <!-- Note -->
      <div
        v-if="result.note"
        class="bg-cyan-500/5 border border-cyan-500/20 rounded-lg px-4 py-2 text-xs text-cyan-300"
      >
        ℹ {{ result.note }}
      </div>

      <!-- Format conversions -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div
          v-for="field in fields(result)"
          :key="field.label"
          class="bg-slate-900/50 border border-slate-800 rounded-lg p-3"
        >
          <div class="flex items-center justify-between">
            <div class="flex-1 min-w-0">
              <div class="text-xs uppercase tracking-wider text-slate-400 mb-1">
                {{ field.label }}
              </div>
              <div class="font-mono text-sm text-cyan-400 truncate">
                {{ field.value }}
              </div>
            </div>
            <button
              @click="handleCopy(field.label, field.value)"
              :class="[
                'ml-2 shrink-0 transition-colors',
                copyFeedback === field.label ? 'text-green-400' : 'text-slate-500 hover:text-cyan-400',
              ]"
              :title="copyFeedback === field.label ? 'Copied!' : `Copy ${field.label}`"
            >
              <svg
                v-if="copyFeedback !== field.label"
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
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
                width="14"
                height="14"
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
        </div>
      </div>

      <!-- Bit analysis -->
      <div class="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
        <h3 class="text-xs uppercase tracking-wider text-slate-400 mb-3">Bit Analysis</h3>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <div class="text-xs text-slate-500 mb-1">I/G Bit (Unicast/Multicast)</div>
            <div class="font-mono text-sm" :class="result.isMulticast ? 'text-purple-400' : 'text-green-400'">
              {{ result.isMulticast ? 'Multicast' : 'Unicast' }}
            </div>
          </div>
          <div>
            <div class="text-xs text-slate-500 mb-1">U/L Bit (Global/Local)</div>
            <div class="font-mono text-sm" :class="result.isLocallyAdministered ? 'text-yellow-400' : 'text-cyan-400'">
              {{ result.isLocallyAdministered ? 'Locally Administered' : 'Globally Unique' }}
            </div>
          </div>
        </div>
      </div>

      <!-- Flags -->
      <div class="flex flex-wrap gap-2">
        <span
          v-if="result.isBroadcast"
          class="px-2 py-1 text-xs rounded bg-red-500/10 text-red-400 border border-red-500/20"
        >
          Broadcast
        </span>
        <span
          v-if="result.isAllZero"
          class="px-2 py-1 text-xs rounded bg-slate-700 text-slate-400 border border-slate-600"
        >
          Default / Unset
        </span>
        <span
          v-if="result.isMulticast && !result.isBroadcast"
          class="px-2 py-1 text-xs rounded bg-purple-500/10 text-purple-400 border border-purple-500/20"
        >
          Multicast
        </span>
        <span
          v-if="result.isLocallyAdministered"
          class="px-2 py-1 text-xs rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
        >
          Locally Administered
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mac-converter {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

input {
  font-family: 'SF Mono', 'Fira Code', 'Fira Mono', 'Roboto Mono', 'Lucida Console', Monaco, monospace;
}
</style>
