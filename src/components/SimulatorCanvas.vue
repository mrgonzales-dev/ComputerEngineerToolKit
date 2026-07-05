<script setup lang="ts">
// SimulatorCanvas — SVG canvas with grid, gate shapes, wires, and interaction.
// All shapes (gates, switches, LEDs, wires) are rendered inline.

import { ref, onMounted, onUnmounted } from 'vue'
import type {
  CircuitComponent,
  ComponentType,
  GateType,
  SimulationResult,
  Wire,
} from '../types/logic-simulator'
import { GATE_LABELS, getInputCount } from '../types/logic-simulator'
import { GRID_SIZE } from '../composables/useLogicSimulation'

const props = defineProps<{
  components: CircuitComponent[]
  wires: Wire[]
  selectedId: string | null
  simulationResult: SimulationResult
  selectedPaletteItem: ComponentType | null
}>()

const emit = defineEmits<{
  addComponent: [type: ComponentType, x: number, y: number]
  deleteComponent: [id: string]
  addWire: [fromComponent: string, fromPin: string, toComponent: string, toPin: string]
  deleteWire: [id: string]
  toggleSwitch: [id: string]
  selectComponent: [id: string | null]
  moveComponent: [id: string, x: number, y: number]
}>()

// ─── Canvas dimensions ───────────────────────────────────────
const canvasWidth = 2000
const canvasHeight = 1400

// ─── Wire creation state ─────────────────────────────────────
const pendingWire = ref<{ fromComponent: string; fromPin: string } | null>(null)
const mousePos = ref({ x: 0, y: 0 })

// ─── Component drag state ────────────────────────────────────
const draggingComponent = ref<{ id: string; offsetX: number; offsetY: number; moved: boolean } | null>(null)

// ─── Component geometry ──────────────────────────────────────
const GATE_WIDTH = 60
const GATE_HEIGHT = 50
const SWITCH_SIZE = 40
const LED_RADIUS = 18

/** Get the SVG x,y of a component's pin. */
function getPinPos(component: CircuitComponent, pin: string): { x: number; y: number } {
  const { x, y, type } = component

  if (type === 'SWITCH') {
    return { x: x + SWITCH_SIZE, y: y + SWITCH_SIZE / 2 }
  }

  if (type === 'LED') {
    return { x: x, y: y } // input pin at LED center-left
  }

  // Gate
  const inputCount = getInputCount(type)
  if (pin === 'out') {
    return { x: x + GATE_WIDTH, y: y + GATE_HEIGHT / 2 }
  }

  // Input pins — evenly spaced along left edge
  const match = pin.match(/^in-(\d+)$/)
  if (!match) return { x, y }
  const idx = parseInt(match[1], 10)
  const spacing = GATE_HEIGHT / (inputCount + 1)
  return { x, y: y + spacing * (idx + 1) }
}

/** Get the LED input pin position (left edge). */
function getLedInputPos(c: CircuitComponent): { x: number; y: number } {
  return { x: c.x - LED_RADIUS, y: c.y }
}

// ─── Wire path generation ────────────────────────────────────
function pendingWirePath(): string {
  if (!pendingWire.value) return ''
  const fromComp = props.components.find(c => c.id === pendingWire.value!.fromComponent)
  if (!fromComp) return ''
  const from = getOutputPinPos(fromComp)
  const midX = (from.x + mousePos.value.x) / 2
  return `M ${from.x} ${from.y} L ${midX} ${from.y} L ${midX} ${mousePos.value.y} L ${mousePos.value.x} ${mousePos.value.y}`
}

// ─── Wire color ──────────────────────────────────────────────
/** Get output value for a component from simulation result. */
function getOutput(id: string): boolean {
  return props.simulationResult.outputs.get(id) ?? false
}

function wireColor(wire: Wire): string {
  const output = props.simulationResult.outputs.get(wire.fromComponent) ?? false
  return output ? '#06b6d4' : '#475569' // cyan-500 : slate-600
}

// ─── SVG coordinate conversion ───────────────────────────────
const svgRef = ref<SVGSVGElement | null>(null)

function toSvgCoords(event: PointerEvent): { x: number; y: number } {
  const svg = svgRef.value
  if (!svg) return { x: 0, y: 0 }
  const pt = svg.createSVGPoint()
  pt.x = event.clientX
  pt.y = event.clientY
  const ctm = svg.getScreenCTM()
  if (!ctm) return { x: 0, y: 0 }
  const transformed = pt.matrixTransform(ctm.inverse())
  return { x: transformed.x, y: transformed.y }
}

// ─── Canvas click (place component) ──────────────────────────
function onCanvasClick(event: PointerEvent) {
  // Only place if a palette item is selected and we're not wiring or dragging
  if (pendingWire.value) return
  if (draggingComponent.value?.moved) return
  if (!props.selectedPaletteItem) return

  // Don't place if clicking on an existing component (event target is a gate/wire)
  const target = event.target as Element
  if (target.closest('[data-component-id]')) return

  const { x, y } = toSvgCoords(event)
  emit('addComponent', props.selectedPaletteItem, x, y)
}

// ─── Pin interaction (wire creation) ─────────────────────────
function onOutputPinDown(event: PointerEvent, componentId: string, pin: string) {
  event.stopPropagation()
  pendingWire.value = { fromComponent: componentId, fromPin: pin }
}

function onInputPinUp(event: PointerEvent, componentId: string, pin: string) {
  event.stopPropagation()
  if (!pendingWire.value) return
  if (pendingWire.value.fromComponent === componentId) {
    pendingWire.value = null
    return
  }
  emit('addWire', pendingWire.value.fromComponent, pendingWire.value.fromPin, componentId, pin)
  pendingWire.value = null
}

function onCanvasPointerMove(event: PointerEvent) {
  if (pendingWire.value) {
    const { x, y } = toSvgCoords(event)
    mousePos.value = { x, y }
  }
  if (draggingComponent.value) {
    const { x, y } = toSvgCoords(event)
    emit('moveComponent', draggingComponent.value.id, x - draggingComponent.value.offsetX, y - draggingComponent.value.offsetY)
    draggingComponent.value.moved = true
  }
}

function onCanvasPointerUp() {
  // If pointerup on canvas (not on a pin), cancel pending wire
  pendingWire.value = null
  draggingComponent.value = null
}

// ─── Component interaction ───────────────────────────────────
function onComponentClick(event: PointerEvent, id: string) {
  event.stopPropagation()
  emit('selectComponent', id)
}

function onComponentDragStart(event: PointerEvent, component: CircuitComponent) {
  // Don't start drag if clicking on a pin (pins handle their own pointerdown)
  const target = event.target as Element
  if (target.closest('[data-pin]')) return

  event.stopPropagation()
  emit('selectComponent', component.id)

  const { x, y } = toSvgCoords(event)
  draggingComponent.value = {
    id: component.id,
    offsetX: x - component.x,
    offsetY: y - component.y,
    moved: false,
  }
}

function onSwitchClick(event: PointerEvent, id: string) {
  event.stopPropagation()
  // Don't toggle if this was a drag operation
  if (draggingComponent.value?.moved) return
  emit('toggleSwitch', id)
}

function onWireClick(event: PointerEvent, wireId: string) {
  event.stopPropagation()
  emit('deleteWire', wireId)
}

// ─── Escape key (cancel pending wire) ────────────────────────
function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    pendingWire.value = null
    emit('selectComponent', null)
  }
}

// ─── Gate SVG path shapes ────────────────────────────────────
// Each gate is drawn within a 60x50 bounding box starting at (0,0).
// Input pins are on the left edge, output on the right edge.

/** Wrapper for template — accepts ComponentType, casts internally. */
function gateBodyPathFor(type: ComponentType): string {
  return gateBodyPath(type as GateType)
}

function gateBodyPath(type: GateType): string {
  switch (type) {
    case 'AND':
    case 'NAND':
      // D-shape: flat left, curved right
      return 'M 0 0 L 30 0 A 25 25 0 0 1 30 50 L 0 50 Z'
    case 'OR':
    case 'NOR':
      // Shield shape: curved left, curved right
      return 'M 0 0 Q 20 25 0 50 Q 30 50 55 25 Q 30 0 0 0 Z'
    case 'XOR':
    case 'XNOR':
      // Shield + extra curve on left
      return 'M -8 0 Q 12 25 -8 50 M 0 0 Q 20 25 0 50 Q 30 50 55 25 Q 30 0 0 0 Z'
    case 'NOT':
      // Triangle
      return 'M 0 0 L 0 50 L 50 25 Z'
  }
}

/** Does this gate type have an output bubble (NAND, NOR, XNOR, NOT)? */
function hasBubble(type: GateType): boolean {
  return type === 'NAND' || type === 'NOR' || type === 'XNOR' || type === 'NOT'
}

/** Wrapper for template. */
function hasBubbleFor(type: ComponentType): boolean {
  return hasBubble(type as GateType)
}

/** Output pin x offset (shifted right if bubble present). */
function outputPinX(type: GateType): number {
  return hasBubble(type) ? GATE_WIDTH + 6 : GATE_WIDTH
}

/** Wrapper for template. */
function outputPinXFor(type: ComponentType): number {
  return outputPinX(type as GateType)
}

/** Wrapper for template. */
function gateLabelFor(type: ComponentType): string {
  return GATE_LABELS[type as GateType]
}

/** Get array of input pin indices for a component. */
function inputPinIndices(type: ComponentType): number[] {
  const count = getInputCount(type)
  return Array.from({ length: count }, (_, i) => i)
}

/** Get Y position of input pin i for a gate. */
function inputPinY(type: ComponentType, i: number): number {
  const count = getInputCount(type)
  return (GATE_HEIGHT / (count + 1)) * (i + 1)
}

/** Get pin name for input index. */
function inputPinName(i: number): string {
  return 'in-' + i
}

// ─── Computed: gate output position for wire endpoint ────────
// Override getPinPos for gates with bubbles
function getOutputPinPos(component: CircuitComponent): { x: number; y: number } {
  if (component.type === 'SWITCH') {
    return getPinPos(component, 'out')
  }
  if (component.type === 'LED') {
    return { x: component.x + LED_RADIUS, y: component.y }
  }
  const gateType = component.type as GateType
  return {
    x: component.x + outputPinX(gateType),
    y: component.y + GATE_HEIGHT / 2,
  }
}

// Override wirePath to use getOutputPinPos for source
function wirePathV2(wire: Wire): string {
  const fromComp = props.components.find(c => c.id === wire.fromComponent)
  const toComp = props.components.find(c => c.id === wire.toComponent)
  if (!fromComp || !toComp) return ''

  const from = getOutputPinPos(fromComp)
  const to = toComp.type === 'LED'
    ? getLedInputPos(toComp)
    : getPinPos(toComp, wire.toPin)

  const midX = (from.x + to.x) / 2
  return `M ${from.x} ${from.y} L ${midX} ${from.y} L ${midX} ${to.y} L ${to.x} ${to.y}`
}

// ─── Grid pattern ────────────────────────────────────────────
const gridPatternId = 'grid-pattern'

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
})
</script>

<template>
  <div
    class="w-full h-full overflow-auto bg-black"
  >
    <svg
      ref="svgRef"
      :width="canvasWidth"
      :height="canvasHeight"
      class="block"
      @click="onCanvasClick"
      @pointermove="onCanvasPointerMove"
      @pointerup="onCanvasPointerUp"
    >
      <!-- Grid background -->
      <defs>
        <pattern :id="gridPatternId" :width="GRID_SIZE" :height="GRID_SIZE" patternUnits="userSpaceOnUse">
          <path :d="'M ' + GRID_SIZE + ' 0 L 0 0 0 ' + GRID_SIZE" fill="none" stroke="#1e293b" stroke-width="0.5" />
        </pattern>
      </defs>
      <rect :width="canvasWidth" :height="canvasHeight" :fill="'url(#' + gridPatternId + ')'" />

      <!-- Wires (rendered before components so components are on top) -->
      <g>
        <path
          v-for="wire in wires"
          :key="wire.id"
          :d="wirePathV2(wire)"
          :stroke="wireColor(wire)"
          stroke-width="2.5"
          fill="none"
          class="cursor-pointer hover:stroke-red-400 transition-colors"
          @click="onWireClick($event, wire.id)"
        />
      </g>

      <!-- Pending wire (preview while dragging) -->
      <path
        v-if="pendingWire"
        :d="pendingWirePath()"
        stroke="#06b6d4"
        stroke-width="2"
        stroke-dasharray="5,3"
        fill="none"
        opacity="0.6"
      />

      <!-- Components -->
      <g
        v-for="comp in components"
        :key="comp.id"
        :data-component-id="comp.id"
        :transform="'translate(' + comp.x + ', ' + comp.y + ')'"
        :class="['cursor-grab', selectedId === comp.id ? 'opacity-100' : 'opacity-90']"
        @click="onComponentClick($event, comp.id)"
        @pointerdown="onComponentDragStart($event, comp)"
      >
        <!-- ─── Switch ─── -->
        <template v-if="comp.type === 'SWITCH'">
          <rect
            :x="0"
            :y="0"
            :width="SWITCH_SIZE"
            :height="SWITCH_SIZE"
            rx="4"
            :fill="comp.switchState ? '#0d5563' : '#0f172a'"
            :stroke="comp.switchState ? '#06b6d4' : '#334155'"
            stroke-width="1.5"
            @click="onSwitchClick($event, comp.id)"
          />
          <!-- Toggle indicator -->
          <circle
            :cx="comp.switchState ? SWITCH_SIZE - 10 : 10"
            :cy="SWITCH_SIZE / 2"
            r="6"
            :fill="comp.switchState ? '#06b6d4' : '#475569'"
            @click="onSwitchClick($event, comp.id)"
          />
          <!-- Output pin -->
          <circle
            :cx="SWITCH_SIZE"
            :cy="SWITCH_SIZE / 2"
            r="5"
            fill="#1e293b"
            stroke="#06b6d4"
            stroke-width="1.5"
            class="cursor-crosshair"
            data-pin="true"
            @pointerdown="onOutputPinDown($event, comp.id, 'out')"
          />
          <text
            :x="SWITCH_SIZE / 2"
            :y="SWITCH_SIZE + 14"
            text-anchor="middle"
            fill="#64748b"
            font-size="10"
            font-family="monospace"
          >SW</text>
        </template>

        <!-- ─── LED ─── -->
        <template v-else-if="comp.type === 'LED'">
          <circle
            :cx="0"
            :cy="0"
            :r="LED_RADIUS"
            :fill="getOutput(comp.id) ? '#06b6d4' : '#1e293b'"
            :stroke="getOutput(comp.id) ? '#06b6d4' : '#334155'"
            stroke-width="1.5"
            :class="getOutput(comp.id) ? 'led-glow' : ''"
          />
          <!-- Input pin (left edge) -->
          <circle
            :cx="-LED_RADIUS"
            :cy="0"
            r="5"
            fill="#1e293b"
            stroke="#06b6d4"
            stroke-width="1.5"
            class="cursor-crosshair"
            data-pin="true"
            @pointerup="onInputPinUp($event, comp.id, 'in-0')"
          />
          <text
            :x="0"
            :y="LED_RADIUS + 14"
            text-anchor="middle"
            fill="#64748b"
            font-size="10"
            font-family="monospace"
          >LED</text>
        </template>

        <!-- ─── Gates ─── -->
        <template v-else>
          <path
            :d="gateBodyPathFor(comp.type)"
            :fill="selectedId === comp.id ? '#0d5563' : '#0f172a'"
            :stroke="selectedId === comp.id ? '#06b6d4' : '#334155'"
            stroke-width="1.5"
          />
          <!-- Output bubble (NAND, NOR, XNOR, NOT) -->
          <circle
            v-if="hasBubbleFor(comp.type)"
            :cx="GATE_WIDTH"
            :cy="GATE_HEIGHT / 2"
            r="4"
            fill="#0f172a"
            :stroke="selectedId === comp.id ? '#06b6d4' : '#334155'"
            stroke-width="1.5"
          />
          <!-- Input pins -->
          <circle
            v-for="i in inputPinIndices(comp.type)"
            :key="i"
            :cx="0"
            :cy="inputPinY(comp.type, i)"
            r="5"
            fill="#1e293b"
            stroke="#06b6d4"
            stroke-width="1.5"
            class="cursor-crosshair"
            data-pin="true"
            @pointerup="onInputPinUp($event, comp.id, inputPinName(i))"
          />
          <!-- Output pin -->
          <circle
            :cx="outputPinXFor(comp.type)"
            :cy="GATE_HEIGHT / 2"
            r="5"
            fill="#1e293b"
            stroke="#06b6d4"
            stroke-width="1.5"
            class="cursor-crosshair"
            data-pin="true"
            @pointerdown="onOutputPinDown($event, comp.id, 'out')"
          />
          <!-- Gate label -->
          <text
            :x="GATE_WIDTH / 2"
            :y="GATE_HEIGHT + 14"
            text-anchor="middle"
            fill="#64748b"
            font-size="10"
            font-family="monospace"
          >{{ gateLabelFor(comp.type) }}</text>
        </template>
      </g>
    </svg>
  </div>
</template>
