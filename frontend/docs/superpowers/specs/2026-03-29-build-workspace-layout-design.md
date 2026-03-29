# Build Workspace Layout Refresh — Design Spec

## Overview

Rework the `/build` workspace so the avatar owns the main left-side stage instead of living inside a visible floating panel. The chat remains on the right as a single widened column, and the build progress/task panel moves inside that chat shell. On small screens, the layout stacks vertically with the avatar above chat instead of disappearing.

## Goals

- Remove the visible avatar panel chrome.
- Let the avatar stage start directly below the nav bar and fill the full left workspace region.
- Prevent the build progress panel from overlapping the avatar or the chat column.
- Keep build progress available by integrating it into the chat shell.
- Preserve the current voice-output wiring and speaking-avatar scene.

## Non-Goals

- Redesign the avatar scene lighting, model, or lip-sync behavior.
- Rewrite chat message behavior or build-session state handling.
- Introduce new floating panels or modal UI.

## Layout Architecture

### Desktop

The page becomes a true two-column workspace under the shared top header:

- **Left stage:** a chrome-free avatar region that fills the area from the header offset to the bottom edge and from the left edge gap to the chat column gap.
- **Right rail:** a slightly wider chat shell that contains status, progress/tasks, messages, and the composer in one panel.

This removes the current conflict where the avatar and a floating build-progress panel both occupy the same left-side coordinates.

### Mobile

The workspace becomes a vertical stack:

- Avatar stage first, with a controlled stage height.
- Chat shell second, filling the remaining width below it.
- Build progress/tasks remain inside the chat shell so the information structure stays consistent across breakpoints.

## Components

### 1. Build Page Container (`src/app/build/page.tsx`)

Replace the current fixed sibling shells with a workspace container that explicitly renders:

- a left avatar stage region
- a right chat region

The standalone absolute `workspace-panel` should be removed from page-level layout. The waiting-approval summary should also move into the right rail so it no longer floats over the avatar area.

### 2. Avatar Stage (`src/components/AvatarExperience.tsx` + CSS)

The avatar experience stays functionally the same, but its wrapper becomes presentation-light:

- no glass shell framing
- no separate card silhouette
- fills the allocated stage region

The stage can still keep subtle internal overlays or fades if needed for readability, but the user should no longer perceive it as a boxed panel.

### 3. Chat Rail (`src/components/ChatPanel.tsx`)

The chat shell becomes the owner of auxiliary build UI:

- build progress/task list at the top of the shell
- optional plan summary in the same column when waiting for approval
- existing history and composer below

This makes the right side a single coherent control surface instead of two overlapping or competing panels.

## Data Flow

The underlying state flow does not change:

- `BuildPage` continues to own `tasks`, `selectedTask`, `plan`, `activeSession`, and voice-output state.
- Those task and plan props get passed into the chat panel instead of being rendered by page-level floating blocks.
- `AvatarExperience` keeps receiving `visemes`, `isPlaying`, and `audioRef` from `useVoiceOutput()`.

## Styling Direction

- Keep the shared ambient background and top header intact.
- Preserve glass treatment for the chat rail.
- Remove the glass-card treatment from the avatar container.
- Use explicit layout dimensions in CSS variables so the avatar and chat widths remain coordinated.
- Keep responsive behavior driven by global workspace layout classes rather than one-off absolute positioning.

## Error Handling And Edge Cases

- If there are no tasks yet, the chat shell should simply omit the progress/task section without collapsing spacing awkwardly.
- If the plan is in `waiting_approval`, the summary stays inside the chat rail and must not push the composer off-screen.
- On smaller screens, the avatar should remain visible but should not monopolize the viewport height.

## Testing Strategy

- Update source-based layout tests in `test/build-layout.test.ts` to assert the new workspace structure.
- Verify the avatar stage is no longer wrapped in a visible panel class combination.
- Verify the build progress surface is owned by the chat panel path rather than page-level absolute layout.
- Verify responsive CSS keeps the avatar visible on small screens in a stacked layout.
