<template>
  <svg class="die-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
    <template v-if="type === 'd4'">
      <path d="m24 5 17 34H7L24 5Z" />
      <path d="m24 5-7 34m7-34 7 34M7 39h34" />
    </template>
    <template v-else-if="type === 'd6'">
      <path d="m13 14 11-6 11 6v20l-11 6-11-6V14Z" />
      <path d="m13 14 11 7 11-7M24 21v19" />
    </template>
    <template v-else-if="type === 'd8'">
      <path d="m24 5 15 13-15 25L9 18 24 5Z" />
      <path d="m9 18h30M24 5v38" />
    </template>
    <template v-else-if="type === 'd10'">
      <path d="m24 4 13 9 5 18-18 13L6 31l5-18 13-9Z" />
      <path d="m11 13 13 9 13-9M6 31l18-9 18 9M24 22v22" />
    </template>
    <template v-else-if="type === 'd100'">
      <g transform="translate(-3 2) scale(.76)">
        <path d="m24 4 13 9 5 18-18 13L6 31l5-18 13-9Z" />
        <path d="m11 13 13 9 13-9M6 31l18-9 18 9" />
      </g>
      <g transform="translate(13 2) scale(.76)">
        <path d="m24 4 13 9 5 18-18 13L6 31l5-18 13-9Z" />
        <path d="m11 13 13 9 13-9M6 31l18-9 18 9" />
      </g>
    </template>
    <template v-else-if="type === 'd12'">
      <path d="m24 4 13 5 7 12-4 14-16 9-16-9-4-14 7-12 13-5Z" />
      <path d="m11 9 13 12 13-12M4 21l20 5 20-5M8 35l16-9 16 9M24 26v18" />
    </template>
    <template v-else>
      <path d="m24 4 15 10 5 17-12 13H16L4 31l5-17L24 4Z" />
      <path d="m9 14 15 10 15-10M4 31l20-7 20 7M16 44l8-20 8 20M24 4v20" />
    </template>
  </svg>
</template>

<script setup lang="ts">
import type { DieType } from "../dice/types";

defineProps<{ type: DieType }>();
</script>

<style scoped>
.die-icon {
  width: 30px;
  height: 30px;
  stroke-width: 1.65;
}
</style>
