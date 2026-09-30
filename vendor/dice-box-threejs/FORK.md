# Local fork: dice-box-threejs

Upstream: <https://github.com/3d-dice/dice-box-threejs>

Base commit: `6945e0068eae27f22acd26debdb70f6ef2fd6063` (`0.0.12`, 2022-10-26).

The upstream project is MIT-licensed. Its unmodified license text is retained in
[`LICENSE`](./LICENSE).

## Local changes

1. `DiceBox.roll(notation, diceColors)` accepts an optional colour-set array.
   `getNotationVectors` assigns it by vector index and `spawnDice` passes that
   colour set to `DiceFactory`. This gives each die its own material while
   preserving the upstream physics and forced-result path.
2. `DiceFactory.create` and the d4 material replacement temporarily apply the
   supplied colour set. The replacement is needed because forcing a d4 face
   recreates its materials after the initial mesh was created.
3. Added `wallInset`, `spawnEdgeInset`, and `floorShadowOpacity` options. The
   application sets the wall inset to zero so the physics walls match the
   viewport, starts dice just inside a random edge, and keeps the shadow
   receiver alpha-only.
4. Added a `plastic` material alias with non-metallic, moderately rough
   `MeshStandardMaterial` settings. The application selects it explicitly.
5. Added `destroy()` and retained the resize handler so an Owlbear overlay can
   dispose the renderer and listener when it closes.
6. Added `src/index.d.ts` solely for the local TypeScript adapter.

Notation construction, forced-value selection, per-die colour mapping, and
Owlbear events remain in the application adapter under `src/engine/`.
