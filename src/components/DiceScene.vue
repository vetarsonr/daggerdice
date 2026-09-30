<template>
  <div class="dice-scene" aria-label="Animazione dei dadi">
    <div ref="canvasHost" class="dice-scene__canvas"></div>
    <div v-if="fallback" class="dice-scene__fallback" aria-live="polite">
      <span
        v-for="(die, index) in dice"
        :key="`${die.type}-${index}`"
        :style="{ '--die-color': fallbackColor(die), '--die-text': fallbackTextColor(die) }"
      >
        {{ displayDieValue(die) }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { displayDieValue } from "../dice/format";
import { DiceEngine } from "../engine/DiceEngine";
import type { RolledDie } from "../dice/types";

const props = defineProps<{ dice: RolledDie[] }>();
const canvasHost = ref<HTMLElement>();
const fallback = ref(false);
let engine: DiceEngine | undefined;
let removeResizeListener: (() => void) | undefined;
let resizeObserver: ResizeObserver | undefined;

function play(): void {
  if (!engine) return;
  void engine.play(props.dice).catch(() => {
    fallback.value = true;
  });
}

function playWhenSized(attempts = 0): void {
  const host = canvasHost.value;
  if (!host || !engine) return;
  if ((host.clientWidth < 8 || host.clientHeight < 8) && attempts < 8) {
    window.requestAnimationFrame(() => playWhenSized(attempts + 1));
    return;
  }
  play();
}

function fallbackColor(die: RolledDie): string {
  return die.role === "hope" || die.role === "fear" ? die.color : "var(--obr-text-secondary)";
}

function fallbackTextColor(die: RolledDie): string {
  return die.role === "hope" ? "#15111d" : "var(--obr-paper)";
}

onMounted(async () => {
  if (!canvasHost.value) {
    fallback.value = true;
    return;
  }

  try {
    engine = new DiceEngine(canvasHost.value);
    const resize = () => engine?.resize();
    window.addEventListener("resize", resize);
    removeResizeListener = () => window.removeEventListener("resize", resize);
    if ("ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(canvasHost.value);
    }
    await nextTick();
    window.requestAnimationFrame(() => playWhenSized());
  } catch {
    fallback.value = true;
  }
});

watch(
  () => props.dice,
  () => play(),
);

onBeforeUnmount(() => {
  removeResizeListener?.();
  resizeObserver?.disconnect();
  engine?.dispose();
});
</script>

<style scoped>
.dice-scene,
.dice-scene__canvas {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.dice-scene {
  position: absolute;
  inset: 0;
  background: transparent;
}

.dice-scene__canvas :deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
}

.dice-scene__fallback {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 16px;
  padding: 24px;
}

.dice-scene__fallback span {
  display: grid;
  width: 72px;
  height: 72px;
  place-items: center;
  border: 1px solid var(--obr-divider);
  border-radius: 6px;
  background: var(--die-color);
  color: var(--die-text);
  font-size: 28px;
  font-weight: 800;
}
</style>
