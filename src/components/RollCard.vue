<template>
  <article
    class="roll-card"
    :class="[
      `roll-card--${reaction ? 'reaction' : roll.outcome ?? 'pool'}`,
      { 'roll-card--compact': compact, 'roll-card--clickable': !compact },
    ]"
    :aria-label="`${title}, totale ${roll.total}`"
    :tabindex="compact ? -1 : 0"
    @click="!compact && emit('close')"
    @keydown.enter="!compact && emit('close')"
  >
    <div class="roll-card__topline">
      <strong class="roll-card__title">{{ title }}</strong>
      <time class="roll-card__time">{{ relativeTime(roll.timestamp) }}</time>
    </div>
    <div class="roll-card__main">
      <div class="roll-card__content">
        <p class="roll-card__player">
          {{ actorName }}
          <span v-if="reaction" class="roll-card__badge roll-card__badge--reaction">REAZIONE</span>
          <span v-if="roll.playerRole === 'GM'" class="roll-card__badge">GM</span>
          <span v-if="roll.visibility !== 'all'" class="roll-card__badge roll-card__badge--private">{{ visibilityLabel }}</span>
        </p>
        <p class="roll-card__detail">
          <template v-for="(die, index) in roll.dice" :key="`${die.type}-${index}`">
            <span v-if="index > 0" class="roll-card__operator">{{ die.role === 'disadvantage' ? '−' : '+' }}</span>
            <span
              class="roll-card__die"
              :class="[`roll-card__die--${die.role}`, { 'roll-card__die--dropped': die.role === 'dropped' }]"
              :style="die.role === 'hope' || die.role === 'fear' ? { '--die-color': die.color } : undefined"
            >
              [{{ displayDieValue(die) }}] <small>{{ dieRoleLabel(die) }}</small>
            </span>
          </template>
          <template v-if="roll.modifier !== 0">
            <span class="roll-card__operator">{{ roll.modifier < 0 ? '−' : '+' }}</span>
            <span class="roll-card__modifier">{{ Math.abs(roll.modifier) }} <small>Modificatore</small></span>
          </template>
        </p>
        <p v-if="!compact" class="roll-card__formula">
          {{ formatRollFormula(roll) }}<span v-if="reaction"> · nessuna Speranza o Paura</span>
        </p>
        <span v-if="!compact && resourceLabel" class="roll-card__resource" :class="`roll-card__resource--${roll.outcome}`">
          {{ resourceLabel }}
        </span>
      </div>
      <strong class="roll-card__total">{{ roll.total }}</strong>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from "vue";
import {
  dieRoleLabel,
  displayDieValue,
  formatRollFormula,
  formatRollTitle,
  isReactionRoll,
  relativeTime,
  rollResourceLabel,
} from "../dice/format";
import type { RollEvent } from "../dice/types";

const props = withDefaults(defineProps<{ roll: RollEvent; compact?: boolean }>(), { compact: false });
const emit = defineEmits<{ close: [] }>();

const title = computed(() => formatRollTitle(props.roll));
const reaction = computed(() => isReactionRoll(props.roll));
const resourceLabel = computed(() => rollResourceLabel(props.roll));
const actorName = computed(() => props.roll.actorName ?? props.roll.playerName);
const visibilityLabel = computed(() => (props.roll.visibility === "gm" ? "GM e io" : "Privato"));
</script>

<style scoped>
.roll-card {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--obr-divider);
  border-radius: 6px;
  background: var(--obr-paper);
  color: var(--obr-text);
}

.roll-card--clickable {
  cursor: pointer;
}

.roll-card__topline,
.roll-card__main,
.roll-card__player,
.roll-card__detail {
  display: flex;
  align-items: center;
}

.roll-card__topline {
  justify-content: space-between;
  gap: 8px;
}

.roll-card__title {
  color: var(--obr-text);
  font-size: 12px;
}

.roll-card--hope .roll-card__title,
.roll-card--hope .roll-card__total {
  color: var(--hope);
}

.roll-card--fear .roll-card__title,
.roll-card--fear .roll-card__total {
  color: var(--fear-text);
}

.roll-card--critical .roll-card__title,
.roll-card--critical .roll-card__total {
  color: var(--hope);
}

.roll-card__time {
  flex: 0 0 auto;
  color: var(--obr-text-secondary);
  font-size: 10px;
}

.roll-card__main {
  justify-content: space-between;
  gap: 9px;
}

.roll-card__content {
  min-width: 0;
  flex: 1;
}

.roll-card__player {
  flex-wrap: wrap;
  gap: 5px;
  margin: 5px 0;
  color: var(--obr-text);
  font-size: 12px;
  font-weight: 700;
}

.roll-card__badge {
  padding: 1px 4px;
  border-radius: 4px;
  background: var(--obr-selected);
  color: var(--obr-text);
  font-size: 8px;
  font-weight: 850;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.roll-card__badge--private {
  background: var(--obr-control);
  color: var(--obr-text-secondary);
}

.roll-card__badge--reaction {
  border: 1px solid var(--obr-text-disabled);
  background: transparent;
  color: var(--obr-text-secondary);
}

.roll-card__detail {
  flex-wrap: wrap;
  gap: 3px;
  margin: 0;
  color: var(--obr-text-secondary);
  font-size: 12px;
}

.roll-card__operator {
  color: var(--obr-text-secondary);
  font-weight: 800;
}

.roll-card__die {
  color: var(--obr-text);
  font-weight: 900;
  white-space: nowrap;
}

.roll-card__die--hope {
  color: var(--die-color);
}

.roll-card__die--fear {
  color: var(--fear-text);
}

.roll-card__die small,
.roll-card__modifier small {
  margin-left: 2px;
  color: var(--obr-text-secondary);
  font-size: 9px;
  font-weight: 650;
}

.roll-card__die--dropped {
  color: var(--obr-text-disabled);
  text-decoration: line-through;
}

.roll-card__modifier {
  color: var(--obr-text);
  font-weight: 800;
}

.roll-card__formula {
  margin: 5px 0 0;
  color: var(--obr-text-secondary);
  font-size: 10px;
  line-height: 1.4;
}

.roll-card__resource {
  display: inline-block;
  margin-top: 6px;
  padding: 3px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--hope) 18%, var(--obr-paper));
  color: var(--hope);
  font-size: 10px;
  font-weight: 800;
}

.roll-card__resource--fear {
  background: color-mix(in srgb, var(--fear) 24%, var(--obr-paper));
  color: var(--fear-text);
}

.roll-card__total {
  flex: 0 0 auto;
  align-self: flex-end;
  color: var(--obr-text);
  font-size: 30px;
  line-height: 1;
}

.roll-card--compact {
  padding: 8px 9px;
  border-radius: 6px;
}

.roll-card--compact .roll-card__player {
  margin: 3px 0;
  font-size: 11px;
}

.roll-card--compact .roll-card__total {
  font-size: 22px;
}

</style>
