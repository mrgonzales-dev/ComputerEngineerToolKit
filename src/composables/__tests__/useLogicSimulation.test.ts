// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  buildInputMap,
  topologicalSort,
  evaluateGate,
  simulate,
  generateTruthTable,
} from '../useLogicSimulation'
import type { CircuitComponent, Wire } from '../../types/logic-simulator'

// ─── Helpers ─────────────────────────────────────────────────
let testIdCounter = 0
function makeComponent(
  type: CircuitComponent['type'],
  x = 0,
  y = 0,
): CircuitComponent {
  testIdCounter++
  return {
    id: `test-c${testIdCounter}`,
    type,
    x,
    y,
    switchState: false,
  }
}

function makeWire(
  from: string,
  to: string,
  toPin = 'in-0',
): Wire {
  testIdCounter++
  return {
    id: `test-w${testIdCounter}`,
    fromComponent: from,
    fromPin: 'out',
    toComponent: to,
    toPin,
  }
}

// ─── evaluateGate ────────────────────────────────────────────
describe('evaluateGate', () => {
  it('AND: true only when both inputs true', () => {
    expect(evaluateGate('AND', [true, true])).toBe(true)
    expect(evaluateGate('AND', [true, false])).toBe(false)
    expect(evaluateGate('AND', [false, true])).toBe(false)
    expect(evaluateGate('AND', [false, false])).toBe(false)
  })

  it('OR: true when any input true', () => {
    expect(evaluateGate('OR', [true, true])).toBe(true)
    expect(evaluateGate('OR', [true, false])).toBe(true)
    expect(evaluateGate('OR', [false, true])).toBe(true)
    expect(evaluateGate('OR', [false, false])).toBe(false)
  })

  it('NOT: inverts input', () => {
    expect(evaluateGate('NOT', [true])).toBe(false)
    expect(evaluateGate('NOT', [false])).toBe(true)
  })

  it('XOR: true when inputs differ', () => {
    expect(evaluateGate('XOR', [true, false])).toBe(true)
    expect(evaluateGate('XOR', [false, true])).toBe(true)
    expect(evaluateGate('XOR', [true, true])).toBe(false)
    expect(evaluateGate('XOR', [false, false])).toBe(false)
  })

  it('NAND: inverted AND', () => {
    expect(evaluateGate('NAND', [true, true])).toBe(false)
    expect(evaluateGate('NAND', [true, false])).toBe(true)
    expect(evaluateGate('NAND', [false, false])).toBe(true)
  })

  it('NOR: inverted OR', () => {
    expect(evaluateGate('NOR', [false, false])).toBe(true)
    expect(evaluateGate('NOR', [true, false])).toBe(false)
    expect(evaluateGate('NOR', [false, true])).toBe(false)
  })

  it('XNOR: true when inputs same', () => {
    expect(evaluateGate('XNOR', [true, true])).toBe(true)
    expect(evaluateGate('XNOR', [false, false])).toBe(true)
    expect(evaluateGate('XNOR', [true, false])).toBe(false)
  })
})

// ─── buildInputMap ───────────────────────────────────────────
describe('buildInputMap', () => {
  it('returns null slots for unconnected inputs', () => {
    const gate = makeComponent('AND')
    const map = buildInputMap([gate], [])
    const slots = map.get(gate.id)
    expect(slots).toEqual([null, null])
  })

  it('maps wire sources to correct input slots', () => {
    const sw1 = makeComponent('SWITCH')
    const sw2 = makeComponent('SWITCH')
    const gate = makeComponent('AND')
    const w1 = makeWire(sw1.id, gate.id, 'in-0')
    const w2 = makeWire(sw2.id, gate.id, 'in-1')
    const map = buildInputMap([sw1, sw2, gate], [w1, w2])
    expect(map.get(gate.id)).toEqual([sw1.id, sw2.id])
  })

  it('handles NOT gate with single input slot', () => {
    const sw = makeComponent('SWITCH')
    const gate = makeComponent('NOT')
    const w = makeWire(sw.id, gate.id, 'in-0')
    const map = buildInputMap([sw, gate], [w])
    expect(map.get(gate.id)).toEqual([sw.id])
  })

  it('handles LED with single input slot', () => {
    const sw = makeComponent('SWITCH')
    const led = makeComponent('LED')
    const w = makeWire(sw.id, led.id, 'in-0')
    const map = buildInputMap([sw, led], [w])
    expect(map.get(led.id)).toEqual([sw.id])
  })

  it('switch has zero input slots', () => {
    const sw = makeComponent('SWITCH')
    const map = buildInputMap([sw], [])
    expect(map.get(sw.id)).toEqual([])
  })
})

// ─── topologicalSort ─────────────────────────────────────────
describe('topologicalSort', () => {
  it('returns empty order for no components', () => {
    const { order, cycleIds } = topologicalSort([], [])
    expect(order).toEqual([])
    expect(cycleIds).toEqual([])
  })

  it('sorts simple chain: SW → NOT → LED', () => {
    const sw = makeComponent('SWITCH')
    const not = makeComponent('NOT')
    const led = makeComponent('LED')
    const w1 = makeWire(sw.id, not.id, 'in-0')
    const w2 = makeWire(not.id, led.id, 'in-0')
    const { order, cycleIds } = topologicalSort([sw, not, led], [w1, w2])
    expect(cycleIds).toEqual([])
    // SW must come before NOT, NOT before LED
    expect(order.indexOf(sw.id)).toBeLessThan(order.indexOf(not.id))
    expect(order.indexOf(not.id)).toBeLessThan(order.indexOf(led.id))
  })

  it('detects cycle: A → B → A', () => {
    const a = makeComponent('AND')
    const b = makeComponent('AND')
    const w1 = makeWire(a.id, b.id, 'in-0')
    const w2 = makeWire(b.id, a.id, 'in-1')
    const { cycleIds } = topologicalSort([a, b], [w1, w2])
    expect(cycleIds).toContain(a.id)
    expect(cycleIds).toContain(b.id)
  })

  it('handles fan-out: one switch to two gates', () => {
    const sw = makeComponent('SWITCH')
    const g1 = makeComponent('NOT')
    const g2 = makeComponent('NOT')
    const w1 = makeWire(sw.id, g1.id, 'in-0')
    const w2 = makeWire(sw.id, g2.id, 'in-0')
    const { order, cycleIds } = topologicalSort([sw, g1, g2], [w1, w2])
    expect(cycleIds).toEqual([])
    expect(order.indexOf(sw.id)).toBeLessThan(order.indexOf(g1.id))
    expect(order.indexOf(sw.id)).toBeLessThan(order.indexOf(g2.id))
  })
})

// ─── simulate ────────────────────────────────────────────────
describe('simulate', () => {
  it('switch outputs its switchState', () => {
    const sw = makeComponent('SWITCH')
    sw.switchState = true
    const result = simulate([sw], [])
    expect(result.outputs.get(sw.id)).toBe(true)
  })

  it('AND gate with both switches HIGH → true', () => {
    const sw1 = makeComponent('SWITCH')
    sw1.switchState = true
    const sw2 = makeComponent('SWITCH')
    sw2.switchState = true
    const gate = makeComponent('AND')
    const w1 = makeWire(sw1.id, gate.id, 'in-0')
    const w2 = makeWire(sw2.id, gate.id, 'in-1')
    const result = simulate([sw1, sw2, gate], [w1, w2])
    expect(result.outputs.get(gate.id)).toBe(true)
  })

  it('AND gate with one switch LOW → false', () => {
    const sw1 = makeComponent('SWITCH')
    sw1.switchState = true
    const sw2 = makeComponent('SWITCH')
    sw2.switchState = false
    const gate = makeComponent('AND')
    const w1 = makeWire(sw1.id, gate.id, 'in-0')
    const w2 = makeWire(sw2.id, gate.id, 'in-1')
    const result = simulate([sw1, sw2, gate], [w1, w2])
    expect(result.outputs.get(gate.id)).toBe(false)
  })

  it('NOT gate inverts switch signal', () => {
    const sw = makeComponent('SWITCH')
    sw.switchState = true
    const gate = makeComponent('NOT')
    const w = makeWire(sw.id, gate.id, 'in-0')
    const result = simulate([sw, gate], [w])
    expect(result.outputs.get(gate.id)).toBe(false)
  })

  it('chain: SWITCH → NOT → LED', () => {
    const sw = makeComponent('SWITCH')
    sw.switchState = false
    const not = makeComponent('NOT')
    const led = makeComponent('LED')
    const w1 = makeWire(sw.id, not.id, 'in-0')
    const w2 = makeWire(not.id, led.id, 'in-0')
    const result = simulate([sw, not, led], [w1, w2])
    // SW=false → NOT=true → LED=true
    expect(result.outputs.get(led.id)).toBe(true)
  })

  it('unconnected input defaults to false', () => {
    const gate = makeComponent('AND')
    // No wires — both inputs unconnected
    const result = simulate([gate], [])
    expect(result.outputs.get(gate.id)).toBe(false)
  })

  it('LED with unconnected input is false', () => {
    const led = makeComponent('LED')
    const result = simulate([led], [])
    expect(result.outputs.get(led.id)).toBe(false)
  })

  it('returns cycleError for cyclic circuit', () => {
    const a = makeComponent('AND')
    const b = makeComponent('AND')
    const w1 = makeWire(a.id, b.id, 'in-0')
    const w2 = makeWire(b.id, a.id, 'in-1')
    const result = simulate([a, b], [w1, w2])
    expect(result.cycleError).toContain(a.id)
    expect(result.cycleError).toContain(b.id)
  })

  it('fan-out: one switch to two LEDs', () => {
    const sw = makeComponent('SWITCH')
    sw.switchState = true
    const led1 = makeComponent('LED')
    const led2 = makeComponent('LED')
    const w1 = makeWire(sw.id, led1.id, 'in-0')
    const w2 = makeWire(sw.id, led2.id, 'in-0')
    const result = simulate([sw, led1, led2], [w1, w2])
    expect(result.outputs.get(led1.id)).toBe(true)
    expect(result.outputs.get(led2.id)).toBe(true)
  })

  it('NAND gate: false only when both inputs true', () => {
    const sw1 = makeComponent('SWITCH')
    sw1.switchState = true
    const sw2 = makeComponent('SWITCH')
    sw2.switchState = true
    const gate = makeComponent('NAND')
    const w1 = makeWire(sw1.id, gate.id, 'in-0')
    const w2 = makeWire(sw2.id, gate.id, 'in-1')
    const result = simulate([sw1, sw2, gate], [w1, w2])
    expect(result.outputs.get(gate.id)).toBe(false)
  })

  it('XOR gate: true when inputs differ', () => {
    const sw1 = makeComponent('SWITCH')
    sw1.switchState = true
    const sw2 = makeComponent('SWITCH')
    sw2.switchState = false
    const gate = makeComponent('XOR')
    const w1 = makeWire(sw1.id, gate.id, 'in-0')
    const w2 = makeWire(sw2.id, gate.id, 'in-1')
    const result = simulate([sw1, sw2, gate], [w1, w2])
    expect(result.outputs.get(gate.id)).toBe(true)
  })
})

// ─── generateTruthTable ──────────────────────────────────────
describe('generateTruthTable', () => {
  it('generates 4 rows for 2 switches and 1 LED via AND', () => {
    const sw1 = makeComponent('SWITCH')
    const sw2 = makeComponent('SWITCH')
    const gate = makeComponent('AND')
    const led = makeComponent('LED')
    const w1 = makeWire(sw1.id, gate.id, 'in-0')
    const w2 = makeWire(sw2.id, gate.id, 'in-1')
    const w3 = makeWire(gate.id, led.id, 'in-0')
    const table = generateTruthTable([sw1, sw2, gate, led], [w1, w2, w3])
    expect(table.switchIds).toEqual([sw1.id, sw2.id])
    expect(table.ledIds).toEqual([led.id])
    expect(table.rows).toHaveLength(4)
    // Row 0: both false → AND=false → LED=false
    expect(table.rows[0].inputs).toEqual([false, false])
    expect(table.rows[0].outputs).toEqual([false])
    // Row 3: both true → AND=true → LED=true
    expect(table.rows[3].inputs).toEqual([true, true])
    expect(table.rows[3].outputs).toEqual([true])
  })

  it('generates 2 rows for 1 switch and 1 LED via NOT', () => {
    const sw = makeComponent('SWITCH')
    const gate = makeComponent('NOT')
    const led = makeComponent('LED')
    const w1 = makeWire(sw.id, gate.id, 'in-0')
    const w2 = makeWire(gate.id, led.id, 'in-0')
    const table = generateTruthTable([sw, gate, led], [w1, w2])
    expect(table.rows).toHaveLength(2)
    // SW=false → NOT=true → LED=true
    expect(table.rows[0].inputs).toEqual([false])
    expect(table.rows[0].outputs).toEqual([true])
    // SW=true → NOT=false → LED=false
    expect(table.rows[1].inputs).toEqual([true])
    expect(table.rows[1].outputs).toEqual([false])
  })

  it('generates 1 row for 0 switches', () => {
    const led = makeComponent('LED')
    const table = generateTruthTable([led], [])
    expect(table.rows).toHaveLength(1)
    expect(table.rows[0].inputs).toEqual([])
    expect(table.rows[0].outputs).toEqual([false])
  })

  it('handles multiple LEDs', () => {
    const sw = makeComponent('SWITCH')
    sw.switchState = false
    const led1 = makeComponent('LED')
    const led2 = makeComponent('LED')
    const w1 = makeWire(sw.id, led1.id, 'in-0')
    const w2 = makeWire(sw.id, led2.id, 'in-0')
    const table = generateTruthTable([sw, led1, led2], [w1, w2])
    expect(table.ledIds).toEqual([led1.id, led2.id])
    expect(table.rows).toHaveLength(2)
    // SW=false → both LEDs false
    expect(table.rows[0].outputs).toEqual([false, false])
    // SW=true → both LEDs true
    expect(table.rows[1].outputs).toEqual([true, true])
  })
})
