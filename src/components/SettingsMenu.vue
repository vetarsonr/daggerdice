<template>
  <div class="settings-menu">
    <button class="settings-menu__trigger" type="button" aria-label="Impostazioni" title="Impostazioni" @click="open = !open">⚙</button>
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
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 8px;
  background: #282131;
  color: #d9cee4;
}

.settings-menu__trigger:hover,
.settings-menu__trigger:focus-visible {
  border-color: #b67de6;
  outline: none;
}

.settings-menu__panel {
  position: absolute;
  z-index: 4;
  top: 35px;
  right: 0;
  width: 160px;
  padding: 9px;
  border: 1px solid rgb(255 255 255 / 13%);
  border-radius: 9px;
  background: #292132;
  box-shadow: 0 8px 24px rgb(0 0 0 / 35%);
}

.settings-menu__option {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #f4eef9;
  font-size: 12px;
  font-weight: 650;
}

.settings-menu__option input {
  accent-color: #7b2fbe;
}
</style>
