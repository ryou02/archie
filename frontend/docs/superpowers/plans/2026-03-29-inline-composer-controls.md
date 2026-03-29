# Inline Composer Controls Refresh Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the `/build` chat composer so the mic becomes an inline capsule inside the input field and the send action becomes a compact arrow-only button.

**Architecture:** Keep the existing `ChatPanel` behavior and event wiring, but restructure the composer markup into an input shell plus a separate send control. Update the glass styling in `globals.css` to support the nested shell, icon-only mic capsule, and arrow send button, then lock the new structure with source-based tests in `test/build-layout.test.ts`.

**Tech Stack:** Next.js App Router client component, React, global CSS, Node `node:test` source assertions

---

## File Map

- `src/components/ChatPanel.tsx`
  Responsibility: composer markup, submit binding, mic pointer-event wiring, accessible labels/titles.
- `src/app/globals.css`
  Responsibility: chat composer layout, input-shell styling, inline mic capsule states, arrow send button styling, responsive guardrails.
- `test/build-layout.test.ts`
  Responsibility: source-based assertions that the composer uses the nested input-shell structure and icon-only controls without regressing existing voice wiring.

## Chunk 1: Lock The New Composer Structure In Tests

### Task 1: Add failing source assertions for the inline composer layout

**Files:**
- Modify: `test/build-layout.test.ts`
- Inspect: `src/components/ChatPanel.tsx`
- Inspect: `src/app/globals.css`

- [ ] **Step 1: Add a failing test for the nested input-shell composer markup**

Add a new `node:test` case that asserts the source includes the new wrapper and icon-only controls. Use assertions along these lines:

```ts
test("chat composer nests the mic inside the input shell and uses an arrow-only send control", () => {
  assert.match(chatPanel, /chat-panel__composer/);
  assert.match(chatPanel, /chat-input-shell/);
  assert.match(chatPanel, /chat-input-control/);
  assert.match(chatPanel, /chat-input-action/);
  assert.match(chatPanel, /btn-send btn-send--icon/);
  assert.match(chatPanel, /aria-label="Send message"/);
  assert.match(chatPanel, /aria-hidden="true"/);
  assert.doesNotMatch(chatPanel, />\s*Send\s*</);
});
```

- [ ] **Step 2: Add a failing test for the new CSS hooks**

In the same test file, add assertions for the new class selectors and mobile/responsive expectations:

```ts
test("composer CSS supports an inline mic capsule and compact arrow send control", () => {
  assert.match(globalsCss, /\.chat-input-shell\s*\{/s);
  assert.match(globalsCss, /\.chat-input-control\s*\{/s);
  assert.match(globalsCss, /\.chat-input-action\s*\{/s);
  assert.match(globalsCss, /\.btn-send--icon\s*\{/s);
  assert.match(globalsCss, /\.btn-mic--inline\s*\{/s);
});
```

- [ ] **Step 3: Run the focused test file to confirm the new assertions fail**

Run: `npm test -- --test-name-pattern="chat composer|composer CSS"`

Expected: `FAIL` because `ChatPanel.tsx` and `globals.css` do not yet contain the new class names or arrow-send markup.

- [ ] **Step 4: Commit the failing tests**

```bash
git add test/build-layout.test.ts
git commit -m "test: cover inline composer controls"
```

## Chunk 2: Implement The New Composer Markup And Styling

### Task 2: Refactor `ChatPanel` to use a nested input shell

**Files:**
- Modify: `src/components/ChatPanel.tsx`
- Test: `test/build-layout.test.ts`

- [ ] **Step 1: Replace the composer row markup with an input shell wrapper**

Change the composer section so the input and mic live inside a shared wrapper. Target markup shape:

```tsx
<div className="chat-panel__composer flex gap-2 px-4 pb-4 pt-3">
  <div className="chat-input-shell flex flex-1 items-center">
    <input
      ...
      className="chat-input chat-input-control flex-1 text-sm outline-none"
    />
    <button
      type="button"
      disabled={disabled || !effectiveMicSupported}
      className={`btn-mic btn-mic--inline ${micState !== "idle" ? "btn-mic--active" : ""}`}
      ...
    >
      <span className="icon-mic" aria-hidden="true" />
    </button>
  </div>
  <button
    onClick={handleSubmit}
    disabled={disabled || !input.trim()}
    className="btn-send btn-send--icon"
    aria-label="Send message"
  >
    <span className="icon-send" aria-hidden="true" />
  </button>
</div>
```

- [ ] **Step 2: Preserve existing behavior and accessibility details**

Keep these details intact while changing only presentation:

- `onKeyDown={(e) => e.key === "Enter" && handleSubmit()}`
- mic `onPointerDown`, `onPointerUp`, `onPointerLeave`, `onPointerCancel`
- `title` copy for supported, recording, connecting, and unsupported states
- disabled logic for empty input and unsupported mic

- [ ] **Step 3: Run the focused test file**

Run: `npm test -- --test-name-pattern="chat composer nests|chat panel owns the build progress"`

Expected: the new composer-structure test still fails until CSS hooks are added, while unrelated `ChatPanel` tests continue to pass.

### Task 3: Restyle the composer for the inline mic capsule and arrow send button

**Files:**
- Modify: `src/app/globals.css`
- Test: `test/build-layout.test.ts`

- [ ] **Step 1: Add layout styles for the nested input shell**

Introduce focused selectors near the existing composer styles:

```css
.chat-input-shell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  padding: 0.45rem 0.45rem 0.45rem 1rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.065);
  border: 1px solid rgba(234, 244, 255, 0.12);
}

.chat-input-control {
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
}
```

- [ ] **Step 2: Convert the mic styles to an inline capsule variant**

Keep the shared `.btn-mic` behavior hooks, then add an inline modifier:

```css
.btn-mic--inline {
  min-width: 2.375rem;
  width: 2.375rem;
  height: 2.375rem;
  padding: 0;
  border-radius: 0.9rem;
  background: linear-gradient(180deg, rgba(224, 238, 255, 0.14), rgba(255, 255, 255, 0.04));
  border: 1px solid rgba(233, 243, 255, 0.12);
}
```

Also add a small icon primitive such as `.icon-mic` that draws the glyph with pseudo-elements, so the control stays icon-only without pulling in a new dependency.

- [ ] **Step 3: Convert send to an arrow-only control**

Add a send modifier and lightweight icon class:

```css
.btn-send--icon {
  min-width: 3rem;
  width: 3rem;
  height: 3rem;
  padding: 0;
  border-radius: 999px;
}
```

Add `.icon-send` with pseudo-elements or a simple inline glyph treatment so the button renders as an arrow without visible text. Keep hover, focus-visible, and disabled behavior aligned with the current send control.

- [ ] **Step 4: Add the responsive safeguard for narrow widths**

Update the existing small-screen composer rules so:

- the input shell keeps `min-width: 0`
- inline mic and send buttons keep fixed compact sizes
- the row does not wrap unexpectedly

Use the existing `@media (max-width: 1023px)` section if possible instead of adding a second disconnected breakpoint block.

- [ ] **Step 5: Run the focused composer tests**

Run: `npm test -- --test-name-pattern="chat composer|composer CSS"`

Expected: `PASS`

- [ ] **Step 6: Commit the markup and CSS change**

```bash
git add src/components/ChatPanel.tsx src/app/globals.css test/build-layout.test.ts
git commit -m "feat: inline the build composer mic control"
```

## Chunk 3: Verify The Full Build Layout Suite

### Task 4: Run regression checks for existing workspace assertions

**Files:**
- Verify: `test/build-layout.test.ts`
- Verify: `src/components/ChatPanel.tsx`
- Verify: `src/app/globals.css`

- [ ] **Step 1: Run the full targeted source test file**

Run: `npm test -- test/build-layout.test.ts`

Expected: all tests in `test/build-layout.test.ts` pass, including the existing workspace-layout and voice-output assertions.

- [ ] **Step 2: Inspect the final diff for scope control**

Run: `git diff -- src/components/ChatPanel.tsx src/app/globals.css test/build-layout.test.ts`

Expected: only composer markup, composer CSS, and test assertions changed. No unrelated build-page or avatar files should appear.

- [ ] **Step 3: Commit the verification pass if additional cleanup was needed**

If verification caused follow-up edits:

```bash
git add src/components/ChatPanel.tsx src/app/globals.css test/build-layout.test.ts
git commit -m "test: finalize inline composer control coverage"
```

If no extra edits were needed, skip this commit.
