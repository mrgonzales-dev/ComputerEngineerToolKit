# 📋 PLAN.md — Computer Engineer Toolkit

> Living document. Updated as plans evolve.

---

## Project Vision

An offline-first, extensible toolkit for computer engineers. Runs as a web app now, Electron desktop app later. Community can build and add tool plugins.

**First tool:** Number System Converter (binary/decimal/hex/octal with step-by-step breakdowns).

---

## Tech Stack

| Layer | Technology | Status |
|-------|-----------|--------|
| Frontend | Vue 3 + TypeScript + Vite | ✅ Scaffolded |
| Styling | Tailwind CSS 4 | ✅ Configured |
| Backend | Node.js + Express + TypeScript | ⏳ Not yet needed |
| Desktop | Electron (future) | ⏳ Phase 2 |
| Testing | Vitest | ✅ Installed |

---

## Build Phases

### Phase 1: Number System Converter (Web App)
- [ ] Core conversion logic (bin/dec/hex/oct)
- [ ] Signed representations (unsigned, two's complement, sign-mag, one's comp)
- [ ] Bit width selector (4, 8, 16, 32, 64)
- [ ] Overflow detection
- [ ] Step-by-step conversion breakdown
- [ ] UI — four editable input fields, all sync
- [ ] Copy to clipboard
- [ ] Dark mode (default)
- [ ] Tests — conversions, edge cases, steps

### Phase 2: App Shell + Tool Registry
- [ ] Sidebar with tool categories
- [ ] Tool registry system (tools register themselves)
- [ ] Command palette (⌘K)
- [ ] Theme toggle
- [ ] Tool routing

### Phase 3: More Tools
- [ ] IEEE 754 Floating-Point Visualizer
- [ ] Bitwise Playground
- [ ] Truth Table Generator
- [ ] K-Map Solver

### Phase 4: Plugin System
- [ ] Plugin SDK (types, interfaces)
- [ ] Plugin loader (local plugins)
- [ ] Plugin manager UI
- [ ] Plugin documentation

### Phase 5: Electron Shell
- [ ] Electron main process + preload
- [ ] IPC bridge (file system, notifications)
- [ ] System tray
- [ ] Global hotkey
- [ ] Auto-update
- [ ] Cross-platform packaging

### Phase 6: Backend (Express)
- [ ] Express server scaffold
- [ ] API routes (future tools that need server-side computation)
- [ ] Plugin serving

---

## Architecture Notes

- **Monorepo later** — for now, single Vite app. Extract into monorepo when we add the plugin SDK.
- **Backend is dormant** — the Number Converter is pure client-side. Backend exists for future tools (serial terminal, file operations, plugin serving).
- **Electron wraps the same Vite build** — 95% shared code. Electron adds native capabilities via IPC bridge.
- **Plugins are Vue components** — each tool is a self-contained Vue component that registers with the tool registry.

---

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-07-05 | Vue 3 over React | MR. G preference |
| 2026-07-05 | Tailwind CSS 4 | Fast styling, dark mode built-in |
| 2026-07-05 | Start with Number Converter | First thing CE students learn, simple to ship |
| 2026-07-05 | Web app first, Electron later | Prove the concept before adding native complexity |
| 2026-07-05 | No monorepo yet | One tool doesn't need it. Extract later. |
