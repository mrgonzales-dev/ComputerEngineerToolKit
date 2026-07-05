// Logic Gate Simulator — Type definitions
// Combinational only (no clocks, no flip-flops, no feedback loops)

export type GateType = 'AND' | 'OR' | 'NOT' | 'XOR' | 'NAND' | 'NOR' | 'XNOR'
export type ComponentType = GateType | 'SWITCH' | 'LED'

/** How many input pins each gate type has. */
export const GATE_INPUTS: Record<GateType, number> = {
  AND: 2,
  OR: 2,
  XOR: 2,
  NAND: 2,
  NOR: 2,
  XNOR: 2,
  NOT: 1,
}

/** Human-readable labels for each gate type. */
export const GATE_LABELS: Record<GateType, string> = {
  AND: 'AND',
  OR: 'OR',
  NOT: 'NOT',
  XOR: 'XOR',
  NAND: 'NAND',
  NOR: 'NOR',
  XNOR: 'XNOR',
}

/** Get the number of input pins for any component type. */
export function getInputCount(type: ComponentType): number {
  if (type === 'SWITCH') return 0
  if (type === 'LED') return 1
  return GATE_INPUTS[type]
}

/**
 * Pin naming convention:
 *   Input pins:  "in-0", "in-1", ...
 *   Output pin:  "out"
 *   SWITCH has only "out". LED has only "in-0".
 */

export interface CircuitComponent {
  id: string
  type: ComponentType
  x: number           // grid-snapped SVG x coordinate
  y: number           // grid-snapped SVG y coordinate
  switchState: boolean // only meaningful for SWITCH type; ignored otherwise
}

export interface Wire {
  id: string
  fromComponent: string
  fromPin: string      // always "out" (only outputs source wires)
  toComponent: string
  toPin: string        // "in-0", "in-1", etc.
}

/** Computed during simulation — NOT stored on components. */
export interface SimulationResult {
  outputs: Map<string, boolean>  // componentId → output value
  cycleError: string[]           // component IDs involved in a cycle (empty if none)
}

/** Serialized circuit for save/load. */
export interface CircuitData {
  version: 1
  components: CircuitComponent[]
  wires: Wire[]
}

/** Truth table row: input combination → output values. */
export interface TruthTableRow {
  inputs: boolean[]
  outputs: boolean[]
}

export interface TruthTable {
  switchIds: string[]
  ledIds: string[]
  rows: TruthTableRow[]
}
