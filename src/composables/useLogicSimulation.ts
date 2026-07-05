// Logic Gate Simulator — Simulation engine + composable
// Pure functions are exported for unit testing.

import { ref, computed } from 'vue'
import type {
  CircuitComponent,
  CircuitData,
  ComponentType,
  GateType,
  SimulationResult,
  TruthTable,
  TruthTableRow,
  Wire,
} from '../types/logic-simulator'
import { getInputCount } from '../types/logic-simulator'

// ─── Grid constants ──────────────────────────────────────────
export const GRID_SIZE = 20

// ─── Pure functions ──────────────────────────────────────────

/**
 * Build an input map: for each component, which source component
 * feeds each input pin? null = unconnected (treated as false/LOW).
 */
export function buildInputMap(
  components: CircuitComponent[],
  wires: Wire[],
): Map<string, (string | null)[]> {
  const map = new Map<string, (string | null)[]>()

  for (const c of components) {
    const count = getInputCount(c.type)
    const slots: (string | null)[] = new Array(count).fill(null)
    map.set(c.id, slots)
  }

  for (const w of wires) {
    const slots = map.get(w.toComponent)
    if (!slots) continue

    // Parse pin index from "in-0", "in-1", etc.
    const match = w.toPin.match(/^in-(\d+)$/)
    if (!match) continue
    const idx = parseInt(match[1], 10)
    if (idx >= 0 && idx < slots.length) {
      slots[idx] = w.fromComponent
    }
  }

  return map
}

/**
 * Topological sort using Kahn's algorithm.
 * Returns { order, cycleIds } — cycleIds is empty if no cycle.
 */
export function topologicalSort(
  components: CircuitComponent[],
  wires: Wire[],
): { order: string[]; cycleIds: string[] } {
  // Build adjacency + in-degree
  const inDegree = new Map<string, number>()
  const adj = new Map<string, string[]>() // componentId → components it feeds into

  for (const c of components) {
    inDegree.set(c.id, 0)
    adj.set(c.id, [])
  }

  for (const w of wires) {
    // Edge: fromComponent → toComponent
    if (!inDegree.has(w.fromComponent) || !inDegree.has(w.toComponent)) continue
    adj.get(w.fromComponent)!.push(w.toComponent)
    inDegree.set(w.toComponent, (inDegree.get(w.toComponent) ?? 0) + 1)
  }

  // Kahn's: start with all nodes that have in-degree 0
  const queue: string[] = []
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id)
  }

  const order: string[] = []
  while (queue.length > 0) {
    const id = queue.shift()!
    order.push(id)
    for (const next of adj.get(id) ?? []) {
      const newDeg = (inDegree.get(next) ?? 1) - 1
      inDegree.set(next, newDeg)
      if (newDeg === 0) queue.push(next)
    }
  }

  // Any components not in order are part of a cycle
  const cycleIds = components
    .filter(c => !order.includes(c.id))
    .map(c => c.id)

  return { order, cycleIds }
}

/** Evaluate a single gate given its input values. */
export function evaluateGate(type: GateType, inputs: boolean[]): boolean {
  switch (type) {
    case 'AND':
      return inputs.every(v => v)
    case 'OR':
      return inputs.some(v => v)
    case 'NOT':
      return !inputs[0]
    case 'XOR':
      return inputs[0] !== inputs[1]
    case 'NAND':
      return !inputs.every(v => v)
    case 'NOR':
      return !inputs.some(v => v)
    case 'XNOR':
      return inputs[0] === inputs[1]
  }
}

/**
 * Full simulation: topo sort → evaluate each component in order.
 * Unconnected inputs default to false (LOW).
 */
export function simulate(
  components: CircuitComponent[],
  wires: Wire[],
): SimulationResult {
  const inputMap = buildInputMap(components, wires)
  const { order, cycleIds } = topologicalSort(components, wires)

  const outputs = new Map<string, boolean>()

  if (cycleIds.length > 0) {
    return { outputs, cycleError: cycleIds }
  }

  for (const id of order) {
    const component = components.find(c => c.id === id)
    if (!component) continue

    if (component.type === 'SWITCH') {
      outputs.set(id, component.switchState)
      continue
    }

    // Gather input values from connected sources
    const sources = inputMap.get(id) ?? []
    const inputValues = sources.map(srcId => {
      if (srcId === null) return false
      return outputs.get(srcId) ?? false
    })

    if (component.type === 'LED') {
      // LED is pass-through: output = its input
      outputs.set(id, inputValues[0] ?? false)
    } else {
      // It's a gate
      outputs.set(id, evaluateGate(component.type, inputValues))
    }
  }

  return { outputs, cycleError: [] }
}

/**
 * Generate a truth table by enumerating all switch combinations.
 * Returns inputs (switch states) and outputs (LED states) for each row.
 */
export function generateTruthTable(
  components: CircuitComponent[],
  wires: Wire[],
): TruthTable {
  const switches = components.filter(c => c.type === 'SWITCH')
  const leds = components.filter(c => c.type === 'LED')

  const switchIds = switches.map(s => s.id)
  const ledIds = leds.map(l => l.id)
  const rows: TruthTableRow[] = []

  const combinations = 2 ** switches.length

  for (let i = 0; i < combinations; i++) {
    // Set switch states for this combination
    const inputStates: boolean[] = []
    const testComponents = components.map(c => {
      if (c.type === 'SWITCH') {
        const idx = switchIds.indexOf(c.id)
        const state = ((i >> idx) & 1) === 1
        inputStates.push(state)
        return { ...c, switchState: state }
      }
      return { ...c }
    })

    const result = simulate(testComponents, wires)
    const outputStates = ledIds.map(id => result.outputs.get(id) ?? false)

    rows.push({ inputs: inputStates, outputs: outputStates })
  }

  return { switchIds, ledIds, rows }
}

// ─── Composable ──────────────────────────────────────────────

let idCounter = 0
function generateId(prefix: string): string {
  idCounter++
  return `${prefix}-${idCounter}`
}

export function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE
}

export function useLogicSimulation() {
  const components = ref<CircuitComponent[]>([])
  const wires = ref<Wire[]>([])
  const selectedId = ref<string | null>(null)
  const selectedPaletteItem = ref<ComponentType | null>(null)

  // Re-run simulation whenever circuit changes
  const simulationResult = computed(() => simulate(components.value, wires.value))

  function addComponent(type: ComponentType, x: number, y: number): string {
    const id = generateId('c')
    components.value.push({
      id,
      type,
      x: snapToGrid(x),
      y: snapToGrid(y),
      switchState: false,
    })
    return id
  }

  function deleteComponent(id: string): void {
    components.value = components.value.filter(c => c.id !== id)
    // Cascade-delete wires referencing this component
    wires.value = wires.value.filter(
      w => w.fromComponent !== id && w.toComponent !== id,
    )
    if (selectedId.value === id) selectedId.value = null
  }

  function addWire(
    fromComponent: string,
    fromPin: string,
    toComponent: string,
    toPin: string,
  ): boolean {
    // Validate: target pin not already connected (one wire per input pin)
    const exists = wires.value.some(
      w => w.toComponent === toComponent && w.toPin === toPin,
    )
    if (exists) return false

    // Validate: not connecting to self
    if (fromComponent === toComponent) return false

    const id = generateId('w')
    wires.value.push({ id, fromComponent, fromPin, toComponent, toPin })
    return true
  }

  function deleteWire(id: string): void {
    wires.value = wires.value.filter(w => w.id !== id)
  }

  function toggleSwitch(id: string): void {
    const c = components.value.find(c => c.id === id)
    if (c && c.type === 'SWITCH') {
      c.switchState = !c.switchState
    }
  }

  function selectComponent(id: string | null): void {
    selectedId.value = id
  }

  function moveComponent(id: string, x: number, y: number): void {
    const c = components.value.find(c => c.id === id)
    if (c) {
      c.x = snapToGrid(x)
      c.y = snapToGrid(y)
    }
  }

  function getOutput(id: string): boolean {
    return simulationResult.value.outputs.get(id) ?? false
  }

  function clearAll(): void {
    components.value = []
    wires.value = []
    selectedId.value = null
    selectedPaletteItem.value = null
  }

  // ─── Save / Load ─────────────────────────────────────

  function serializeCircuit(): CircuitData {
    return {
      version: 1,
      components: components.value,
      wires: wires.value,
    }
  }

  function deserializeCircuit(data: CircuitData): boolean {
    if (data.version !== 1) return false
    if (!Array.isArray(data.components) || !Array.isArray(data.wires)) return false

    components.value = data.components
    wires.value = data.wires
    selectedId.value = null
    return true
  }

  function saveToFile(): void {
    const data = serializeCircuit()
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'circuit.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function loadFromFile(file: File): Promise<boolean> {
    return new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string) as CircuitData
          resolve(deserializeCircuit(data))
        } catch {
          resolve(false)
        }
      }
      reader.onerror = () => resolve(false)
      reader.readAsText(file)
    })
  }

  // localStorage persistence (auto-save on changes)
  const STORAGE_KEY = 'ce-toolkit-logic-circuit'

  function saveToLocalStorage(): void {
    try {
      const data = serializeCircuit()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // Storage full or unavailable — silently ignore
    }
  }

  function loadFromLocalStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const data = JSON.parse(raw) as CircuitData
        deserializeCircuit(data)
      }
    } catch {
      // Corrupt data — silently ignore
    }
  }

  return {
    // State
    components,
    wires,
    selectedId,
    selectedPaletteItem,
    simulationResult,

    // Actions
    addComponent,
    deleteComponent,
    addWire,
    deleteWire,
    toggleSwitch,
    selectComponent,
    moveComponent,
    getOutput,
    clearAll,

    // Save / Load
    saveToFile,
    loadFromFile,
    saveToLocalStorage,
    loadFromLocalStorage,
  }
}
