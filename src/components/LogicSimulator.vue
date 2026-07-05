<script setup lang="ts">
// LogicSimulator — full-screen layout: palette (left) + canvas (center) + toolbar (top)
// Truth table panel slides in when generated.

import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useLogicSimulation, generateTruthTable } from '../composables/useLogicSimulation'
import type { ComponentType, TruthTable } from '../types/logic-simulator'
import SimulatorCanvas from './SimulatorCanvas.vue'

const emit = defineEmits<{
  back: []
}>()

const {
  components,
  wires,
  selectedId,
  selectedPaletteItem,
  simulationResult,
  addComponent,
  deleteComponent,
  addWire,
  deleteWire,
  toggleSwitch,
  selectComponent,
  moveComponent,
  clearAll,
  saveToFile,
  loadFromFile,
  saveToLocalStorage,
  loadFromLocalStorage,
} = useLogicSimulation()

// ─── Palette items ───────────────────────────────────────────
const paletteItems: { type: ComponentType; label: string; desc: string }[] = [
  { type: 'SWITCH', label: 'SW', desc: 'Toggle input' },
  { type: 'LED', label: 'LED', desc: 'Output light' },
  { type: 'AND', label: 'AND', desc: 'Both high' },
  { type: 'OR', label: 'OR', desc: 'Any high' },
  { type: 'NOT', label: 'NOT', desc: 'Invert' },
  { type: 'XOR', label: 'XOR', desc: 'Different' },
  { type: 'NAND', label: 'NAND', desc: 'Not both' },
  { type: 'NOR', label: 'NOR', desc: 'Not any' },
  { type: 'XNOR', label: 'XNOR', desc: 'Same' },
]

function selectPaletteItem(type: ComponentType) {
  selectedPaletteItem.value = selectedPaletteItem.value === type ? null : type
  // Deselect component when picking a palette item
  selectComponent(null)
}

// ─── Truth table ─────────────────────────────────────────────
const truthTable = ref<TruthTable | null>(null)
const showTruthTable = ref(false)

function generateTable() {
  truthTable.value = generateTruthTable(components.value, wires.value)
  showTruthTable.value = true
}

function closeTruthTable() {
  showTruthTable.value = false
}

// ─── Toolbar actions ─────────────────────────────────────────
function onClearAll() {
  clearAll()
  truthTable.value = null
  showTruthTable.value = false
  saveToLocalStorage()
}

function onSave() {
  saveToFile()
  saveToLocalStorage()
}

const fileInput = ref<HTMLInputElement | null>(null)

async function onLoadFile(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  const success = await loadFromFile(file)
  if (!success) {
    alert('Failed to load circuit file. Invalid format.')
  }
  target.value = '' // reset input so same file can be loaded again
}

function onBack() {
  saveToLocalStorage()
  emit('back')
}

// ─── Keyboard ────────────────────────────────────────────────
function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'Delete' || event.key === 'Backspace') {
    if (selectedId.value) {
      deleteComponent(selectedId.value)
      saveToLocalStorage()
    }
  }
  if (event.key === 'Escape') {
    selectComponent(null)
    selectedPaletteItem.value = null
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  loadFromLocalStorage()
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  saveToLocalStorage()
})

// ─── Stats ───────────────────────────────────────────────────
const componentCount = computed(() => components.value.length)
const wireCount = computed(() => wires.value.length)
const hasCycle = computed(() => simulationResult.value.cycleError.length > 0)
</script>

<template>
  <div class="h-screen w-screen flex flex-col bg-black text-slate-100 overflow-hidden">
    <!-- ─── Top toolbar ─── -->
    <header class="flex items-center gap-3 px-4 py-2 border-b border-slate-900 bg-black shrink-0">
      <!-- Back button -->
      <button
        @click="onBack"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 border border-transparent hover:border-slate-800 transition-colors"
      >
        <span class="text-base">←</span>
        <span>Toolkit</span>
      </button>

      <div class="w-px h-6 bg-slate-900" />

      <!-- Title -->
      <h1 class="text-sm font-semibold text-cyan-400 tracking-tight">Logic Gate Simulator</h1>

      <div class="flex-1" />

      <!-- Stats -->
      <div class="flex items-center gap-4 text-xs text-slate-600 font-mono">
        <span>{{ componentCount }} components</span>
        <span>{{ wireCount }} wires</span>
      </div>

      <div class="w-px h-6 bg-slate-900" />

      <!-- Actions -->
      <button
        @click="generateTable"
        :disabled="components.length === 0"
        class="px-3 py-1.5 rounded-md text-sm border transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        :class="showTruthTable
          ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
          : 'text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700'"
      >
        Truth Table
      </button>
      <button
        @click="onSave"
        :disabled="components.length === 0"
        class="px-3 py-1.5 rounded-md text-sm text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Save
      </button>
      <button
        @click="fileInput?.click()"
        class="px-3 py-1.5 rounded-md text-sm text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 transition-colors"
      >
        Load
      </button>
      <input
        ref="fileInput"
        type="file"
        accept=".json,application/json"
        class="hidden"
        @change="onLoadFile"
      />
      <button
        @click="onClearAll"
        :disabled="components.length === 0"
        class="px-3 py-1.5 rounded-md text-sm text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Clear
      </button>
    </header>

    <!-- ─── Main area ─── -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Gate palette -->
      <aside class="w-44 border-r border-slate-900 bg-black p-3 space-y-1 shrink-0 overflow-y-auto">
        <h3 class="text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-2 px-1">Components</h3>
        <button
          v-for="item in paletteItems"
          :key="item.type"
          @click="selectPaletteItem(item.type)"
          :class="[
            'w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-sm transition-colors border text-left',
            selectedPaletteItem === item.type
              ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
              : 'text-slate-400 hover:bg-slate-900/50 border-transparent'
          ]"
        >
          <span class="font-mono text-xs font-bold w-10 text-center shrink-0">{{ item.label }}</span>
          <span class="text-[11px] text-slate-600 truncate">{{ item.desc }}</span>
        </button>

        <!-- Instructions -->
        <div class="mt-4 pt-3 border-t border-slate-900 space-y-1.5 text-[10px] text-slate-700 leading-relaxed">
          <p><span class="text-slate-500">1.</span> Click a component above</p>
          <p><span class="text-slate-500">2.</span> Click canvas to place it</p>
          <p><span class="text-slate-500">3.</span> Drag output pin → input pin to wire</p>
          <p><span class="text-slate-500">4.</span> Click switch to toggle</p>
          <p><span class="text-slate-500">5.</span> Click wire to delete it</p>
          <p><span class="text-slate-500">6.</span> Select + Delete key to remove</p>
        </div>
      </aside>

      <!-- Canvas -->
      <div class="flex-1 relative overflow-hidden">
        <SimulatorCanvas
          :components="components"
          :wires="wires"
          :selected-id="selectedId"
          :simulation-result="simulationResult"
          :selected-palette-item="selectedPaletteItem"
          @add-component="addComponent"
          @delete-component="deleteComponent"
          @add-wire="addWire"
          @delete-wire="deleteWire"
          @toggle-switch="toggleSwitch"
          @select-component="selectComponent"
          @move-component="moveComponent"
        />

        <!-- Cycle error overlay -->
        <div
          v-if="hasCycle"
          class="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2 text-xs text-red-400 backdrop-blur-sm"
        >
          ⚠ Cycle detected — feedback loops not allowed in combinational circuits
        </div>

        <!-- Palette selection indicator -->
        <div
          v-if="selectedPaletteItem"
          class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg px-4 py-2 text-xs text-cyan-400 backdrop-blur-sm"
        >
          Click on canvas to place: <span class="font-mono font-bold">{{ selectedPaletteItem }}</span>
          <button @click="selectedPaletteItem = null" class="ml-2 text-slate-500 hover:text-slate-300">✕</button>
        </div>
      </div>

      <!-- Truth table panel -->
      <aside
        v-if="showTruthTable && truthTable"
        class="w-80 border-l border-slate-900 bg-black p-4 overflow-y-auto shrink-0"
      >
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-semibold text-cyan-400">Truth Table</h3>
          <button
            @click="closeTruthTable"
            class="text-slate-600 hover:text-slate-300 text-sm"
          >✕</button>
        </div>

        <div v-if="truthTable.switchIds.length === 0" class="text-xs text-slate-600 py-4">
          No switches in circuit. Add switches to generate a truth table.
        </div>

        <div v-else-if="truthTable.ledIds.length === 0" class="text-xs text-slate-600 py-4">
          No LEDs in circuit. Add LEDs to see outputs.
        </div>

        <table v-else class="w-full text-xs font-mono">
          <thead>
            <tr class="border-b border-slate-800">
              <th
                v-for="(_, i) in truthTable.switchIds"
                :key="'in-' + i"
                class="px-2 py-1.5 text-cyan-400 text-left"
              >In{{ i }}</th>
              <th
                v-for="(_, i) in truthTable.ledIds"
                :key="'out-' + i"
                class="px-2 py-1.5 text-emerald-400 text-left border-l border-slate-800"
              >Out{{ i }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, i) in truthTable.rows"
              :key="i"
              class="border-b border-slate-900 hover:bg-slate-900/30"
            >
              <td
                v-for="(val, j) in row.inputs"
                :key="'r' + i + 'in' + j"
                class="px-2 py-1"
                :class="val ? 'text-cyan-400' : 'text-slate-600'"
              >{{ val ? 1 : 0 }}</td>
              <td
                v-for="(val, j) in row.outputs"
                :key="'r' + i + 'out' + j"
                class="px-2 py-1 border-l border-slate-800"
                :class="val ? 'text-emerald-400' : 'text-slate-600'"
              >{{ val ? 1 : 0 }}</td>
            </tr>
          </tbody>
        </table>
      </aside>
    </div>
  </div>
</template>
