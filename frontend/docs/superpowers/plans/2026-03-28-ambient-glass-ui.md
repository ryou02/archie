# Ambient Glass UI Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a shared ambient background system for the landing and build pages, plus a more transparent refractive chat shell with crisp dimensional edges and no outward edge glow.

**Architecture:** Introduce a reusable ambient-background layer stack driven by a small typed config module, then apply it to both routes so motion, overlays, and video fallback are shared. Restyle the build-side chrome around the chat-first glass language, while keeping all interaction logic intact and making the visual system resilient when video is absent or reduced motion is enabled.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind 4 utilities plus global CSS, Node `test` via `tsx --test`, ESLint

---

## Chunk 1: Ambient Background Foundation

### Task 1: Add a typed ambient-background config and test it first

**Files:**
- Create: `test/ambient-background.test.ts`
- Create: `src/lib/ambient-background.ts`

- [ ] **Step 1: Write the failing config tests**

```ts
import test from "node:test";
import assert from "node:assert/strict";

import {
  AMBIENT_BACKGROUND_VIDEO_SRC,
  getAmbientBackgroundConfig,
} from "../src/lib/ambient-background";

test("landing config enables video and uses hero readability overlays", () => {
  const config = getAmbientBackgroundConfig("landing");

  assert.equal(config.surface, "landing");
  assert.equal(config.enableVideo, true);
  assert.equal(config.videoSrc, AMBIENT_BACKGROUND_VIDEO_SRC);
  assert.match(config.containerClassName, /ambient-bg--landing/);
  assert.match(config.overlayClassName, /ambient-overlay--hero/);
});

test("build config enables video and uses denser chrome readability overlays", () => {
  const config = getAmbientBackgroundConfig("build");

  assert.equal(config.surface, "build");
  assert.equal(config.enableVideo, true);
  assert.match(config.containerClassName, /ambient-bg--build/);
  assert.match(config.overlayClassName, /ambient-overlay--build/);
});

test("unknown surfaces fall back to the build-safe config", () => {
  const config = getAmbientBackgroundConfig("other" as never);

  assert.equal(config.surface, "build");
});
```

- [ ] **Step 2: Run the new test to verify it fails**

Run: `npm test -- --test-name-pattern="ambient-background"`

Expected: FAIL with a module-not-found error for `src/lib/ambient-background.ts`

- [ ] **Step 3: Write the minimal config module**

```ts
export const AMBIENT_BACKGROUND_VIDEO_SRC = "/media/ambient-loop.mp4";

export type AmbientSurface = "landing" | "build";

export interface AmbientBackgroundConfig {
  surface: AmbientSurface;
  enableVideo: boolean;
  videoSrc: string;
  containerClassName: string;
  overlayClassName: string;
}

const CONFIG: Record<AmbientSurface, AmbientBackgroundConfig> = {
  landing: {
    surface: "landing",
    enableVideo: true,
    videoSrc: AMBIENT_BACKGROUND_VIDEO_SRC,
    containerClassName: "ambient-bg ambient-bg--landing",
    overlayClassName: "ambient-overlay ambient-overlay--hero",
  },
  build: {
    surface: "build",
    enableVideo: true,
    videoSrc: AMBIENT_BACKGROUND_VIDEO_SRC,
    containerClassName: "ambient-bg ambient-bg--build",
    overlayClassName: "ambient-overlay ambient-overlay--build",
  },
};

export function getAmbientBackgroundConfig(
  surface: AmbientSurface
): AmbientBackgroundConfig {
  return CONFIG[surface] ?? CONFIG.build;
}
```

- [ ] **Step 4: Run the focused test again**

Run: `npm test -- --test-name-pattern="ambient-background"`

Expected: PASS for 3 tests in `test/ambient-background.test.ts`

- [ ] **Step 5: Commit**

```bash
git add test/ambient-background.test.ts src/lib/ambient-background.ts
git commit -m "test: add ambient background config coverage"
```

### Task 2: Add a reusable `AmbientBackground` component with video and fallback structure

**Files:**
- Create: `src/components/AmbientBackground.tsx`
- Modify: `test/ambient-background.test.ts`
- Create: `public/media/ambient-loop.mp4`

- [ ] **Step 1: Extend the test to cover rendered structure**

```ts
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AmbientBackground from "../src/components/AmbientBackground";

test("ambient background renders video and procedural overlay layers", () => {
  const html = renderToStaticMarkup(<AmbientBackground surface="landing" />);

  assert.match(html, /ambient-bg--landing/);
  assert.match(html, /ambient-video/);
  assert.match(html, /ambient-grain/);
  assert.match(html, /ambient-drift/);
  assert.match(html, /ambient-overlay--hero/);
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- --test-name-pattern="ambient background renders video"`

Expected: FAIL with a module-not-found error for `src/components/AmbientBackground.tsx`

- [ ] **Step 3: Implement the component**

```tsx
import { getAmbientBackgroundConfig, type AmbientSurface } from "@/lib/ambient-background";

interface AmbientBackgroundProps {
  surface: AmbientSurface;
}

export default function AmbientBackground({ surface }: AmbientBackgroundProps) {
  const config = getAmbientBackgroundConfig(surface);

  return (
    <div className={config.containerClassName} aria-hidden="true">
      {config.enableVideo ? (
        <video
          className="ambient-video"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        >
          <source src={config.videoSrc} type="video/mp4" />
        </video>
      ) : null}
      <div className="ambient-fallback" />
      <div className="ambient-drift" />
      <div className="ambient-grain" />
      <div className={config.overlayClassName} />
    </div>
  );
}
```

- [ ] **Step 4: Add the initial background asset**

Create `public/media/ambient-loop.mp4` with a placeholder low-contrast loop that is safe to ship during iteration. If a final asset is not available yet, add the intended production filename now and use a temporary lightweight loop with the same path so page code does not churn later.

- [ ] **Step 5: Re-run the focused test**

Run: `npm test -- --test-name-pattern="ambient background renders video"`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add test/ambient-background.test.ts src/components/AmbientBackground.tsx public/media/ambient-loop.mp4
git commit -m "feat: add shared ambient background component"
```

### Task 3: Replace the old aurora globals with ambient tokens, motion, and fallbacks

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add the new design tokens near `:root`**

Add variables like:

```css
  --ambient-ink: #07111d;
  --ambient-haze: rgba(196, 226, 255, 0.10);
  --ambient-glass: rgba(231, 243, 255, 0.10);
  --ambient-glass-strong: rgba(231, 243, 255, 0.16);
  --ambient-edge: rgba(240, 248, 255, 0.24);
  --ambient-edge-soft: rgba(240, 248, 255, 0.10);
  --ambient-static: rgba(255, 255, 255, 0.08);
```

- [ ] **Step 2: Replace the legacy aurora/stars blocks with the new shared ambient classes**

Implement:

```css
.ambient-bg { position: fixed; inset: 0; overflow: hidden; z-index: 0; }
.ambient-video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: blur(18px) saturate(0.9) brightness(0.65); opacity: 0.48; }
.ambient-fallback { position: absolute; inset: 0; background: linear-gradient(180deg, #06111d 0%, #0a2136 45%, #081726 100%); }
.ambient-drift,
.ambient-drift::before,
.ambient-drift::after { /* layered haze fields with slow side-to-side drift */ }
.ambient-grain { position: absolute; inset: 0; opacity: 0.12; mix-blend-mode: screen; }
.ambient-overlay--hero { /* stronger center spotlight for landing title */ }
.ambient-overlay--build { /* denser right-side readability mask for chat */ }
```

- [ ] **Step 3: Add the motion and reduced-motion rules**

```css
@keyframes ambient-slide {
  0% { transform: translate3d(-2%, 0, 0); }
  100% { transform: translate3d(2%, 0, 0); }
}

@media (prefers-reduced-motion: reduce) {
  .ambient-video { animation: none; }
  .ambient-drift,
  .ambient-drift::before,
  .ambient-drift::after { animation: none; transform: none; }
}
```

- [ ] **Step 4: Preserve existing reusable utility classes while retuning them for the new system**

Update existing classes such as `.btn-primary`, `.btn-send`, `.btn-mic`, `.progress-bar`, `.build-row`, and `.nav-label` so they inherit the new glass palette instead of the current aurora/game-panel styling. Do not remove classes still used by the current components.

- [ ] **Step 5: Run lint**

Run: `npm run lint`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add ambient background and glass design tokens"
```

## Chunk 2: Apply the Shared Background to Both Pages

### Task 4: Adopt the shared ambient background on the landing page

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Replace the hard-coded aurora/stars layers with `AmbientBackground`**

Use:

```tsx
import AmbientBackground from "@/components/AmbientBackground";

<div className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden">
  <AmbientBackground surface="landing" />
  <div className="relative z-10 ...">...</div>
</div>
```

- [ ] **Step 2: Simplify the hero chrome to match the new system**

Update the logo container, title wrapper, and CTA shell so they rely on the new tokens rather than one-off green aurora glows. Keep the structure familiar, but remove the current explicit aurora-specific streak/glow styling.

- [ ] **Step 3: Remove no-longer-needed decorative elements**

Delete the dedicated `aurora-bg`, `aurora-streaks`, `stars`, and silhouette-only markup from this page once the new layered background is in place and verified.

- [ ] **Step 4: Confirm the route still renders**

Run: `npm run lint`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/app/layout.tsx
git commit -m "feat: apply ambient background to landing page"
```

### Task 5: Adopt the shared ambient background and overlay masks on `/build`

**Files:**
- Modify: `src/app/build/page.tsx`

- [ ] **Step 1: Replace the old background layers with the shared component**

Use:

```tsx
import AmbientBackground from "@/components/AmbientBackground";

<div className="relative h-screen overflow-hidden">
  <AmbientBackground surface="build" />
  ...
</div>
```

- [ ] **Step 2: Convert the right-side chat shell wrapper from hard panel styling to a glass host**

Replace the inline `background`, `backdropFilter`, and hard panel border with shared glass classes such as `glass-shell glass-shell--chat`.

- [ ] **Step 3: Retune the floating header and build-progress panel to the same material family**

Keep the current layout and state logic, but move the header, status chrome, progress panel, and approval summary away from `game-panel` toward quieter glass variants so the chat remains the dominant surface.

- [ ] **Step 4: Preserve all existing behavior**

Do not alter:

- polling behavior
- session start/send flow
- active task selection logic
- mic control wiring

This task is visual composition only.

- [ ] **Step 5: Run lint**

Run: `npm run lint`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/build/page.tsx
git commit -m "feat: apply ambient background to build workspace"
```

## Chunk 3: Refractive Chat Shell and UI Verification

### Task 6: Restyle `ChatPanel` around a transparent refractive shell

**Files:**
- Modify: `src/components/ChatPanel.tsx`
- Modify: `src/components/TaskList.tsx`
- Modify: `src/components/BuildSessionCard.tsx`
- Modify: `src/components/ProgressBar.tsx`
- Modify: `src/components/StatusDot.tsx`

- [ ] **Step 1: Swap `ChatPanel` from ad-hoc inline colors to semantic glass classes**

Refactor the shell markup so the panel sections expose stable styling hooks:

```tsx
<div className="chat-panel">
  <div className="chat-panel__header">...</div>
  <div className="chat-panel__messages">...</div>
  <div className="chat-panel__composer">...</div>
</div>
```

Use separate classes for:

- assistant bubble
- user bubble
- typing state
- input shell
- send button
- mic button

- [ ] **Step 2: Implement the requested glass look in CSS**

Add classes in `src/app/globals.css` such as:

```css
.glass-shell--chat {
  background: linear-gradient(135deg, rgba(255,255,255,0.10), rgba(159,214,255,0.035) 45%, rgba(255,255,255,0.04));
  border: 1px solid var(--ambient-edge);
  backdrop-filter: blur(28px) saturate(1.15);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.22), 0 18px 44px rgba(3,11,28,0.28);
}

.glass-shell--chat::before {
  /* internal highlight rim, no external glow spill */
}
```

Keep all highlight behavior inside the panel outline. Do not add halo or ambient light bleed around the shell.

- [ ] **Step 3: Retune supporting components to match the shell**

Update:

- `TaskList` buttons from aurora-highlight chips to quieter translucent rows
- `BuildSessionCard` cards so they feel nested inside the new material system
- `ProgressBar` fills to remain readable but less neon
- `StatusDot` so it reads cleanly on the softer background

- [ ] **Step 4: Preserve behavior with a lightweight regression check**

Run:

`npm test`

Expected: PASS for existing build-history/task-plan tests and the new ambient-background tests

- [ ] **Step 5: Run lint again**

Run: `npm run lint`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/ChatPanel.tsx src/components/TaskList.tsx src/components/BuildSessionCard.tsx src/components/ProgressBar.tsx src/components/StatusDot.tsx src/app/globals.css
git commit -m "feat: add refractive glass chat styling"
```

### Task 7: Run browser QA with an explicit inventory and capture evidence

**Files:**
- Modify: `docs/superpowers/plans/2026-03-28-ambient-glass-ui.md`
  - check off completed items only if executing in-place

- [ ] **Step 1: Write the QA inventory before opening the browser**

Inventory must cover:

- landing page background present and subtle
- build page background present and subtle
- stacked video + CSS layers active together
- chat shell is more transparent than before
- chat shell has crisp dimensional edges
- no outward edge glow/ambience
- landing hero remains readable
- build page chat remains readable
- build progress/task panel still usable
- mic/send/input controls still usable
- reduced-motion path does not break layout
- video-missing fallback still looks complete

Also add at least 2 exploratory checks:

- narrow desktop width with long task labels
- rapid message sending while the chat is auto-scrolling

- [ ] **Step 2: Run the dev server**

Run: `npm run dev`

Expected: local server starts successfully and prints the local URL for the app server

- [ ] **Step 3: Perform desktop QA**

Check:

- `http://127.0.0.1:3000/`
- `http://127.0.0.1:3000/build`

Capture screenshots for both surfaces at desktop width after the final styles load.

- [ ] **Step 4: Perform mobile QA**

Check the same routes at approximately `390x844` and verify:

- no clipped glass shell
- hero text still readable
- build composer remains usable
- side chrome does not overlap critical content

- [ ] **Step 5: Perform fallback and motion QA**

Temporarily disable or rename `public/media/ambient-loop.mp4`, reload both routes, and verify the procedural fallback stands on its own. Then re-enable the asset.

Use a reduced-motion environment and verify the page remains attractive without relying on animated drift.

- [ ] **Step 6: Record outcomes before signoff**

Do not claim completion until there is evidence for:

- `npm test`
- `npm run lint`
- desktop route verification
- mobile route verification
- fallback verification
- reduced-motion verification

- [ ] **Step 7: Commit final polish if QA required changes**

```bash
git add src/app/page.tsx src/app/build/page.tsx src/components/ChatPanel.tsx src/app/globals.css
git commit -m "fix: polish ambient glass UI after QA"
```
