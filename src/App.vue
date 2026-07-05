<script setup lang="ts">
// CE Toolkit — App shell
// MR. G requested: side panel organized with section titles (Number Tools, Network Tools)
// App.vue only renders components — tool logic lives in their own components/composables.
import { ref } from 'vue'
import NumberConverter from './components/NumberConverter.vue'
import IpAddressCalculator from './components/IpAddressCalculator.vue'
import MacConverter from './components/MacConverter.vue'
import LogicSimulator from './components/LogicSimulator.vue'

const selectedTool = ref<string | null>(null)

// Sidebar navigation structure — section titles with grouped tool buttons.
// Network Tools entries are placeholders for MR. G to wire up later.
interface ToolEntry {
  id: string
  label: string
  icon: string
  available: boolean
}

interface ToolSection {
  title: string
  tools: ToolEntry[]
}

const sections: ToolSection[] = [
  {
    title: 'Number Tools',
    tools: [
      { id: 'number-converter', label: 'Number Converter', icon: '#', available: true },
    ],
  },
  {
    title: 'Network Tools',
    tools: [
      { id: 'ip-calculator', label: 'IP Address Calculator', icon: 'IP', available: true },
      { id: 'mac-converter', label: 'MAC Address Converter', icon: 'MAC', available: true },
    ],
  },
  {
    title: 'Logic Tools',
    tools: [
      { id: 'logic-simulator', label: 'Logic Gate Simulator', icon: 'LG', available: true },
    ],
  },
]
</script>

<template>
  <!-- Full-screen Logic Gate Simulator (replaces app shell) -->
  <LogicSimulator
    v-if="selectedTool === 'logic-simulator'"
    @back="selectedTool = null"
  />

  <!-- Normal toolkit (sidebar + tools) -->
  <div v-else class="h-screen w-screen flex bg-black text-slate-100 overflow-hidden">
    <!-- Sidebar -->
    <aside class="w-[30%] min-w-[260px] max-w-[400px] border-r border-slate-900 bg-black flex flex-col p-3">
      <!-- Logo / Title -->
      <div class="px-2 pt-2 pb-3 border-b border-slate-900/80">
        <h1 class="text-lg font-bold text-cyan-400 tracking-tight">CE Toolkit</h1>
        <p class="text-xs text-slate-600 mt-0.5">Computer Engineer Toolkit</p>
      </div>

      <!-- Search -->
      <div class="pt-3 pb-2">
        <input
          type="text"
          placeholder="Search tools..."
          class="w-full px-3 py-1.5 rounded-md bg-slate-900/50 border border-slate-800 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-colors"
        />
      </div>

      <!-- Tool navigation with section titles -->
      <nav class="flex-1 overflow-y-auto pt-1">
        <section
          v-for="section in sections"
          :key="section.title"
          class="mb-4"
        >
          <!-- Section header -->
          <h2 class="px-3 pt-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600 select-none">
            {{ section.title }}
          </h2>

          <!-- Tool buttons -->
          <ul class="space-y-0.5">
            <li v-for="tool in section.tools" :key="tool.id">
              <button
                @click="tool.available && (selectedTool = tool.id)"
                :disabled="!tool.available"
                :class="[
                  'w-full flex items-center gap-3 text-left px-3 py-2 rounded-md text-sm transition-colors',
                  tool.available
                    ? (selectedTool === tool.id
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                        : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200 border border-transparent')
                    : 'text-slate-700 cursor-not-allowed border border-transparent'
                ]"
              >
                <!-- Icon badge -->
                <span
                  :class="[
                    'inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-mono font-bold shrink-0',
                    tool.available
                      ? (selectedTool === tool.id
                          ? 'bg-cyan-500/15 text-cyan-400'
                          : 'bg-slate-900 text-slate-500')
                      : 'bg-slate-900/50 text-slate-700'
                  ]"
                >
                  {{ tool.icon }}
                </span>
                <span class="flex-1 truncate">{{ tool.label }}</span>
                <span
                  v-if="!tool.available"
                  class="text-[9px] uppercase tracking-wide text-slate-700 font-medium"
                >
                  soon
                </span>
              </button>
            </li>
          </ul>
        </section>
      </nav>

      <!-- Footer -->
      <div class="px-3 py-2 border-t border-slate-900/80 text-[10px] text-slate-700">
        v0.0.1 · offline-first
      </div>
    </aside>

    <!-- Main content -->
    <main class="flex-1 overflow-y-auto">
      <div class="p-8">
        <div class="max-w-4xl mx-auto">
          <NumberConverter v-if="selectedTool === 'number-converter'" />
          <IpAddressCalculator v-else-if="selectedTool === 'ip-calculator'" />
          <MacConverter v-else-if="selectedTool === 'mac-converter'" />

          <!-- Empty state -->
          <div v-else class="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div class="text-6xl mb-4 opacity-10">🛠️</div>
            <h2 class="text-xl font-semibold text-slate-400 mb-2">No tool selected</h2>
            <p class="text-slate-700 text-sm">Select a tool from the sidebar to get started.</p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
