<template>
  <div class="settings-menu">
    <button class="settings-menu__trigger" type="button" aria-label="Impostazioni" title="Impostazioni" @click="open = !open">
      <UiIcon name="settings" />
    </button>
    <div v-if="open" class="settings-menu__panel">
      <label class="settings-menu__option">
        <input :checked="show3d" type="checkbox" @change="emit('update:show3d', ($event.target as HTMLInputElement).checked)" />
        <span>Mostra dadi 3D</span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import UiIcon from "./UiIcon.vue";

defineProps<{ show3d: boolean }>();
const emit = defineEmits<{ "update:show3d": [value: boolean] }>();
const open = ref(false);
</script>

<style scoped>
.settings-menu {
  position: relative;
}

.settings-menu__trigger {
  display: grid;
  width: 29px;
  height: 29px;
  place-items: center;
  border: 1px solid var(--obr-divider);
  border-radius: 6px;
  background: var(--obr-control);
  color: var(--obr-text-secondary);
}

.settings-menu__trigger:hover {
  border-color: var(--obr-text-secondary);
  background: var(--obr-control-hover);
}

.settings-menu__panel {
  position: absolute;
  z-index: 4;
  top: 37px;
  right: 0;
  width: 160px;
  padding: 8px;
  border: 1px solid var(--obr-divider);
  border-radius: 6px;
  background: var(--obr-paper);
}

.settings-menu__option {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--obr-text);
  font-size: 12px;
  font-weight: 650;
}

.settings-menu__option input {
  accent-color: var(--obr-text-secondary);
}
</style>
