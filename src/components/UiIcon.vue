<template>
  <svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <template v-if="name === 'settings'">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v2M12 19.5v2M21.5 12h-2M4.5 12h-2M18.72 5.28l-1.42 1.42M6.7 17.3l-1.42 1.42M18.72 18.72 17.3 17.3M6.7 6.7 5.28 5.28" />
    </template>
    <path v-else-if="name === 'chevron-up'" d="m6 15 6-6 6 6" />
    <path v-else-if="name === 'chevron-down'" d="m6 9 6 6 6-6" />
    <template v-else-if="name === 'reset'">
      <path d="M4 8V4h4" />
      <path d="M4.7 4.7A8 8 0 1 1 4 14" />
    </template>
    <path v-else d="m6 6 12 12M18 6 6 18" />
  </svg>
</template>

<script setup lang="ts">
defineProps<{
  name: "settings" | "chevron-up" | "chevron-down" | "reset" | "close";
}>();
</script>

<style scoped>
.ui-icon {
  display: block;
  width: 1em;
  height: 1em;
  stroke-width: 1.8;
}
</style>
