<script setup lang="ts">
// Computer Engineer Toolkit — app shell
</script>

<template>
  <div class="h-screen w-screen flex bg-black text-slate-100 overflow-hidden">
    <!-- Sidebar (30%) -->
    <aside class="w-[30%] min-w-[240px] max-w-[400px] border-r border-slate-900 bg-black flex flex-col gap-8 p-[10px]">
      <!-- Logo / Title -->
      <div class="pb-1">
        <h1 class="text-lg font-bold text-cyan-400 tracking-tight">CE Toolkit</h1>
        <p class="text-xs text-slate-600 mt-1">Computer Engineer Toolkit</p>
      </div>

      <!-- Search -->
      <div>
        <input
          type="text"
          placeholder="Search tools..."
          class="w-full px-4 py-1 rounded-md bg-slate-900/50 border border-slate-800 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-colors"
        />
      </div>

      <!-- Tool navigation -->
      <nav class="flex-1 overflow-y-auto pt-2">
        <p class="text-slate-700 text-sm text-center mt-8">No tools installed yet</p>
      </nav>
    </aside>

    <!-- Main content (70%) -->
    <main class="flex-1 overflow-y-auto">
      <div class="p-8">
        <div class="max-w-4xl mx-auto">
          <!-- Empty state -->
          <div class="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div class="text-6xl mb-4 opacity-10">🛠️</div>
            <h2 class="text-xl font-semibold text-slate-400 mb-2">No tool selected</h2>
            <p class="text-slate-700 text-sm">Select a tool from the sidebar or add a new one.</p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
