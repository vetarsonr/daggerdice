<template>
  <svg
    class="die-icon"
    :class="{ 'die-icon--d100': type === 'd100' }"
    :viewBox="viewBox"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <path
      v-if="type === 'd20'"
      d="M14 0 0 7.5v15.2l14 7.5 13-7 1-.6V7.5L14 0Zm-2 8.3-5.9 8.8-3.7-8 9.6-.8ZM8 18l6-9.1 6 9.1H8Zm13.8-.9L16 8.3l9.5.7-3.7 8.1ZM15 2.8l7.4 4-7.4-.6V2.8Zm-2 0v3.4l-7.4.6 7.4-4Zm-11 10 2.7 6L2 20.4v-7.6Zm1 9.3 2.7-1.6 4.4 5.5L3 22.1ZM8 20h11l-5 7.5L8 20Zm9.9 5.9 4.4-5.5L25 22l-7.1 3.9Zm5.6-7-.2-.1 2.7-6v7.6l-2.5-1.5Z"
    />
    <path
      v-else-if="type === 'd12'"
      d="M25 4 15 0 5 4l-5 7v10l6 7 9 4 9-4 6-7V11l-5-7ZM2 11.9 6 14l3.7 8.2-3.4 3.4L2 21v-9.1ZM12 22l-3.7-7.2L15 9.2l6.7 5.5L18 22h-6Zm16-1-4.3 4.7-3.4-3.4L24 14l4-2.1V21ZM16 2.2l7.8 3.6L27 10l-4.5 2.6L16 7.5V2.2ZM6.2 5.8 14 2.2v5.2l-6.5 5.1-.5-.1L3 10l3.2-4.2Zm2.1 21 3-3h7.5l3 3L15 30l-6.7-3.2Z"
    />
    <template v-else-if="type === 'd100'">
      <g transform="translate(1 1) scale(.72)">
        <path d="M16 0 0 12l1 6 15 11 15-11 1-6L16 0Zm13.7 12.8-.5 3.2-3.5-1.7-5.4-9 9.4 7.5ZM15 19.6v6.1l-11.1-8L7 16.1l8 3.5Zm2 0 8-3.5 3.1 1.6L17 25.8v-6.2Zm6.6-5.1L16 17.9l-7.6-3.4L16 2.9l7.6 11.6ZM2.3 12.8l9.4-7.5-5.4 9L2.8 16l-.5-3.2Z" />
      </g>
      <g transform="translate(23 9) scale(.72)">
        <path d="M16 0 0 12l1 6 15 11 15-11 1-6L16 0Zm13.7 12.8-.5 3.2-3.5-1.7-5.4-9 9.4 7.5ZM15 19.6v6.1l-11.1-8L7 16.1l8 3.5Zm2 0 8-3.5 3.1 1.6L17 25.8v-6.2Zm6.6-5.1L16 17.9l-7.6-3.4L16 2.9l7.6 11.6ZM2.3 12.8l9.4-7.5-5.4 9L2.8 16l-.5-3.2Z" />
      </g>
    </template>
    <path
      v-else-if="type === 'd10'"
      d="M16 0 0 12l1 6 15 11 15-11 1-6L16 0Zm13.7 12.8-.5 3.2-3.5-1.7-5.4-9 9.4 7.5ZM15 19.6v6.1l-11.1-8L7 16.1l8 3.5Zm2 0 8-3.5 3.1 1.6L17 25.8v-6.2Zm6.6-5.1L16 17.9l-7.6-3.4L16 2.9l7.6 11.6ZM2.3 12.8l9.4-7.5-5.4 9L2.8 16l-.5-3.2Z"
    />
    <path
      v-else-if="type === 'd8'"
      d="M13 0 0 8v13l13 10 13-10V8L13 0Zm11 15.9L17 4.5 24 9v6.9ZM13 2l.1.1L24.2 20H1.8L12.9 2.1 13 2ZM9 4.5 2 15.9V9l7-4.5ZM3.9 22h18.2L13 28.5 3.9 22Z"
    />
    <path
      v-else-if="type === 'd6'"
      d="M1 6.978h17.602M1 6.978 10.444 1H26M1 6.978V26h17.602m0-19.022L26 1m-7.398 5.978V26M26 1v17.391L18.602 26"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
    />
    <path
      v-else
      d="M14.5 2 2 25.5h22.5M14.5 2l10 23.5M14.5 2l15 11-5 12.5"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
    />
  </svg>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { DieType } from "../dice/types";

const props = defineProps<{ type: DieType }>();
const viewBoxes: Record<DieType, string> = {
  d20: "0 0 28 31",
  d12: "0 0 30 32",
  d10: "0 0 32 29",
  d100: "0 0 48 32",
  d8: "0 0 26 31",
  d6: "0 0 27 27",
  d4: "0 0 31 27",
};

const viewBox = computed(() => viewBoxes[props.type]);
</script>

<style scoped>
.die-icon {
  display: block;
  width: var(--bar-glyph, 24px);
  height: var(--bar-glyph, 24px);
  position: relative;
  top: -4px;
}

.die-icon--d100 {
  width: calc(var(--bar-glyph, 24px) * 1.5);
}
</style>
