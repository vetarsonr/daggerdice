<template>
  <main v-if="roll && visible" class="result-page">
    <RollCard :roll="roll" @close="close" />
  </main>
  <main v-else class="result-page result-page--empty"></main>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import RollCard from "../components/RollCard.vue";
import { closeResultCard, rollFromLocation } from "../obr/client";

const roll = rollFromLocation();
const visible = ref(true);
let timeout: number | undefined;

function close(): void {
  visible.value = false;
  void closeResultCard();
}

onMounted(() => {
  timeout = window.setTimeout(close, 6_000);
});

onBeforeUnmount(() => {
  if (timeout) window.clearTimeout(timeout);
});
</script>

<style scoped>
.result-page {
  padding: 0;
}

.result-page--empty {
  min-height: 1px;
}
</style>
