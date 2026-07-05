<script setup lang="ts">
import { ref } from 'vue'
import { useIpAddress } from '../composables/useIpAddress'
import type { IpCalcResult } from '../types/ip-calculator'

const { input, result, error, calculate, copyField, clear } = useIpAddress()

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
  calculate()
}

const fields = (r: IpCalcResult) => [
  { label: 'IP Address', value: r.ipAddress },
  { label: 'CIDR Prefix', value: `/${r.cidrPrefix}` },
  { label: 'Subnet Mask', value: r.subnetMask },
  { label: 'Wildcard Mask', value: r.wildcardMask },
  { label: 'Network Address', value: r.networkAddress },
  { label: 'Broadcast Address', value: r.broadcastAddress },
  { label: 'Total Addresses', value: r.totalAddresses.toString() },
  { label: 'Usable Hosts', value: r.usableHosts.toString() },
  { label: 'First Host', value: r.firstHost },
  { label: 'Last Host', value: r.lastHost },
  { label: 'IP Class', value: r.ipClass },
  { label: 'Private Range', value: r.isPrivate ? 'Yes' : 'No' },
  { label: 'Integer Value', value: r.integerValue.toString() },
]
</script>

<template>
  <div class="ip-calculator">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-semibold text-slate-200">IP Address Calculator</h2>
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
        for="ip-input"
        class="block text-xs uppercase tracking-wider text-slate-400 mb-2"
      >
        IP Address / CIDR
      </label>
      <input
        id="ip-input"
        v-model="input"
        @input="handleInput"
        :class="[
          'w-full bg-black border rounded px-3 py-2 text-cyan-400 font-mono outline-none transition-all',
          error
            ? 'border-red-500'
            : 'border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50',
        ]"
        type="text"
        placeholder="e.g. 192.168.1.0/24"
      />
      <p v-if="error" class="text-red-400 text-xs mt-1">{{ error }}</p>
      <p v-else class="text-slate-600 text-xs mt-1">
        Enter an IPv4 address with optional CIDR prefix (defaults to /32)
      </p>
    </div>

    <!-- Results -->
    <div v-if="result && result.isValid" class="space-y-4">
      <!-- Edge case note -->
      <div
        v-if="result.note"
        class="bg-cyan-500/5 border border-cyan-500/20 rounded-lg px-4 py-2 text-xs text-cyan-300"
      >
        ℹ {{ result.note }}
      </div>

      <!-- Binary representation -->
      <div class="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
        <h3 class="text-xs uppercase tracking-wider text-slate-400 mb-3">Binary (per octet)</h3>
        <div class="grid grid-cols-4 gap-2">
          <div
            v-for="(bits, i) in result.binaryOctets"
            :key="i"
            class="text-center"
          >
            <div class="text-slate-500 text-xs mb-1">Octet {{ i + 1 }}</div>
            <div class="font-mono text-sm text-cyan-400 tracking-wider">{{ bits }}</div>
            <div class="text-slate-600 text-xs mt-0.5">{{ [result.ipAddress.split('.')[i]] }}</div>
          </div>
        </div>
      </div>

      <!-- Computed fields grid -->
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

      <!-- Flags -->
      <div class="flex flex-wrap gap-2">
        <span
          v-if="result.isPrivate"
          class="px-2 py-1 text-xs rounded bg-green-500/10 text-green-400 border border-green-500/20"
        >
          Private
        </span>
        <span
          v-else
          class="px-2 py-1 text-xs rounded bg-slate-800 text-slate-400 border border-slate-700"
        >
          Public
        </span>
        <span
          v-if="result.isLoopback"
          class="px-2 py-1 text-xs rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
        >
          Loopback
        </span>
        <span
          v-if="result.isMulticast"
          class="px-2 py-1 text-xs rounded bg-purple-500/10 text-purple-400 border border-purple-500/20"
        >
          Multicast
        </span>
        <span
          v-if="result.isReserved"
          class="px-2 py-1 text-xs rounded bg-red-500/10 text-red-400 border border-red-500/20"
        >
          Reserved
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ip-calculator {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

input {
  font-family: 'SF Mono', 'Fira Code', 'Fira Mono', 'Roboto Mono', 'Lucida Console', Monaco, monospace;
}
</style>
