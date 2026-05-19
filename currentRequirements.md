# Vue Migration Plan for Recorder UI

Date captured: 2026-05-17

## Goal
- Migrate the recorder UI from imperative DOM updates to Vue 3.
- Keep existing behavior intact during migration.
- Reduce long-term complexity for step selection, drag/drop reorder, bulk actions, and pause/resume states.

## Scope (Phase 1)
- Migrate only `packages/tmr-recorder/src/ui/*` to Vue.
- Keep background/content scripts in plain JS for now.
- Keep existing extension messaging contracts unchanged.

## Non-goals (Phase 1)
- No refactor of recorder core logic in background/content.
- No change to external APIs consumed by `tmrApi`.
- No redesign of visual theme; preserve current look and behavior.

## Current UI Behaviors To Preserve
- Start recording modal, including Enter-to-start.
- Optional clear-site-data checkbox (default checked).
- Recording status display (Idle / Recording / Paused).
- Pause/Resume/Stop/Clear controls.
- Step list rendering with stable row identity.
- Drag reorder with animation and persisted order.
- Single delete action per step.
- Multi-select checkboxes with hover reveal.
- Bulk actions: delete/copy/cut/paste.
- Paste mode with per-row top/bottom insert controls.

## Architecture Target
- Vue 3 with Composition API.
- Single root app for `ui.html`.
- Local reactive state in UI layer, persisted through existing background APIs.
- Extract reusable logic into composables.

## Proposed File Structure
- `packages/tmr-recorder/src/ui/main.js`
- `packages/tmr-recorder/src/ui/App.vue`
- `packages/tmr-recorder/src/ui/components/RecorderHeader.vue`
- `packages/tmr-recorder/src/ui/components/RecorderControls.vue`
- `packages/tmr-recorder/src/ui/components/BulkActions.vue`
- `packages/tmr-recorder/src/ui/components/StepList.vue`
- `packages/tmr-recorder/src/ui/components/StepRow.vue`
- `packages/tmr-recorder/src/ui/components/StartModal.vue`
- `packages/tmr-recorder/src/ui/composables/useRecorderApi.js`
- `packages/tmr-recorder/src/ui/composables/useStepInteractions.js`
- `packages/tmr-recorder/src/ui/styles/ui.css`

## Migration Steps

1) Tooling setup
- Add Vue 3 dependencies for the recorder workspace.
- Add webpack support for `.vue` single-file components.
- Ensure output bundle path remains compatible with existing manifest/copy setup.

2) Bootstrap Vue app
- Replace script entry from imperative `index.js` to `main.js`.
- Mount Vue app onto existing `ui.html` root container.

3) Port static layout
- Move HTML structure into `App.vue` and child components.
- Move styles to shared UI stylesheet or SFC scoped sections as appropriate.
- Status: Implemented in `App.vue` (single-file app shell).

4) Port API layer
- Implement `useRecorderApi` composable wrapping current `callBg` behavior.
- Keep runtime message fallback behavior and event-driven refresh.
- Status: Implemented in `useRecorderApi.js`.

5) Port state model
- Centralize current mutable state into reactive refs/computed:
  - steps
  - selected IDs
  - copied/cut buffer
  - paste mode
- drag state
- recording status
- Status: Implemented with Vue reactive refs/sets in `App.vue`.

6) Port step interactions
- Reorder (mouse drag) with same UX and persistence.
- Delete single step.
- Multi-select + bulk actions (delete/copy/cut/paste).
- Paste insertion before/after row.
- Status: Implemented in `App.vue`.

7) Port modal interactions
- Start modal open/close, URL handling, Enter key behavior.
- Start request with clear-site-data option.
- Status: Implemented in `App.vue`.

8) Port status/controls
- Record/Pause/Resume/Stop/Clear button behavior.
- Disabled states and labels.
- Status: Implemented in `App.vue`.

9) Regression checks
- Verify all preserved behaviors listed above.
- Verify no polling loop regressions.
- Verify extension reload/watch workflow still works.

10) Cleanup
- Remove legacy imperative UI file once parity is confirmed.
- Keep fallback branch/commit point until manual QA signoff.
- Status: Completed (legacy `src/ui/index.js` removed after QA pass).

## Risk Areas
- Drag/drop smoothness differences after Vue rendering updates.
- Losing stable row identity during reorder or paste.
- Event handler conflicts between checkbox, paste controls, and drag handle.
- Build config changes affecting other extension assets.

## Mitigations
- Use explicit stable `_uiId` keys in Vue list rendering.
- Preserve existing reorder algorithm first, then optimize.
- Add focused manual test checklist for mixed interaction flows.
- Migrate incrementally: one behavior at a time behind working checkpoints.

## Manual QA Checklist
- Start recording via button and Enter key.
- Confirm clear-site-data behavior still works with redirects.
- Verify pause blocks recording and resume restores it.
- Reorder, then refresh UI; order stays persisted.
- Delete single step and verify persistence.
- Select multiple steps, copy, cut, and paste.
- Paste before and after target rows in paste mode.
- Confirm copied buffer replacement behavior on consecutive copy/cut.
- Resize recorder window and confirm list area responsiveness.
- Confirm no continuous flashing/re-render loop in devtools.

## Delivery Plan
- Milestone 1: Vue toolchain + static app shell.
- Milestone 2: API composable + status/controls.
- Milestone 3: Step list + reorder + delete.
- Milestone 4: Multi-select + bulk actions + paste mode.
- Milestone 5: QA pass + legacy UI removal.

## Tracking
- This file replaces feature backlog tracking with a focused Vue migration plan.
