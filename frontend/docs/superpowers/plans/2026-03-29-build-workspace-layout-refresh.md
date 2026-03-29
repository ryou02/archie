# Build Workspace Layout Refresh Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the boxed avatar panel on `/build`, widen the chat rail slightly, move build progress into the chat shell, and keep the avatar visible above chat on small screens.

**Architecture:** Replace the current fixed floating-shell composition with an explicit workspace layout that owns a left avatar stage and a right chat rail. Keep page state in `BuildPage`, but move progress and waiting-approval UI into `ChatPanel` so the right side becomes a single coherent column while the avatar stage fills the remaining area.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind utilities, global CSS, Node `test` via `tsx --test`

---

## Chunk 1: Lock In The New Workspace Structure

### Task 1: Add failing source assertions for the new page layout

**Files:**
- Modify: `test/build-layout.test.ts`
- Modify: `src/app/build/page.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add layout assertions for the new workspace shell**

```ts
test("build page uses a dedicated workspace layout instead of floating avatar and task panels", () => {
  assert.match(buildPage, /workspace-layout/);
  assert.match(buildPage, /workspace-stage/);
  assert.match(buildPage, /workspace-rail/);
  assert.doesNotMatch(buildPage, /workspace-panel glass-shell glass-shell--panel absolute/);
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- --test-name-pattern="dedicated workspace layout"`
Expected: FAIL because the current page still renders the floating left task panel and old shell structure

- [ ] **Step 3: Implement the minimal page layout rewrite**

Code requirements:
- Replace page-level floating panel blocks with a single `workspace-layout`
- Render the avatar stage in a left `workspace-stage`
- Render the chat shell in a right `workspace-rail`
- Keep existing state management in `BuildPage`

- [ ] **Step 4: Re-run the focused test**

Run: `npm test -- --test-name-pattern="dedicated workspace layout"`
Expected: PASS

### Task 2: Add failing CSS assertions for chrome-free avatar staging and stacked mobile layout

**Files:**
- Modify: `test/build-layout.test.ts`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add CSS assertions**

```ts
test("workspace CSS gives the avatar a chrome-free stage and stacks avatar above chat on small screens", () => {
  assert.match(globalsCss, /\.workspace-layout\s*\{/s);
  assert.match(globalsCss, /\.workspace-stage\s*\{/s);
  assert.match(globalsCss, /\.workspace-rail\s*\{/s);
  assert.match(globalsCss, /@media \(max-width:\s*1023px\)\s*\{[\s\S]*\.workspace-layout[\s\S]*grid-template-columns:\s*1fr/s);
  assert.match(globalsCss, /@media \(max-width:\s*1023px\)\s*\{[\s\S]*\.workspace-stage[\s\S]*min-height:/s);
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- --test-name-pattern="chrome-free stage"`
Expected: FAIL because the current CSS still uses fixed `workspace-avatar` and `workspace-chat` blocks

- [ ] **Step 3: Implement the minimal CSS rewrite**

Code requirements:
- Introduce layout classes for `workspace-layout`, `workspace-stage`, and `workspace-rail`
- Remove the visible card treatment from the avatar region
- Widen the chat rail slightly relative to the current 360px width
- Stack the avatar above chat on smaller screens without hiding the avatar

- [ ] **Step 4: Re-run the focused test**

Run: `npm test -- --test-name-pattern="chrome-free stage"`
Expected: PASS

---

## Chunk 2: Move Build Progress Into The Chat Shell

### Task 3: Extend chat-panel source expectations to own build progress surfaces

**Files:**
- Modify: `test/build-layout.test.ts`
- Modify: `src/components/ChatPanel.tsx`
- Modify: `src/app/build/page.tsx`

- [ ] **Step 1: Add integration assertions**

```ts
const chatPanel = readFileSync(
  path.join(process.cwd(), "src/components/ChatPanel.tsx"),
  "utf8"
);

test("chat panel owns the build progress and approval summary surfaces", () => {
  assert.match(chatPanel, /tasks/);
  assert.match(chatPanel, /selectedTask/);
  assert.match(chatPanel, /planStatus/);
  assert.match(chatPanel, /Build Progress/);
  assert.doesNotMatch(buildPage, /workspace-summary glass-shell glass-shell--panel absolute/);
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- --test-name-pattern="owns the build progress"`
Expected: FAIL because the page still owns the floating progress and summary surfaces

- [ ] **Step 3: Implement the minimal chat-shell integration**

Code requirements:
- Pass `tasks`, `selectedTask`, `onSelectTask`, and relevant plan summary data into `ChatPanel`
- Render build progress/tasks inside `ChatPanel`
- Render the waiting-approval summary inside `ChatPanel`
- Remove duplicate page-level floating summary/task UI

- [ ] **Step 4: Re-run the focused test**

Run: `npm test -- --test-name-pattern="owns the build progress"`
Expected: PASS

---

## Chunk 3: Verify The Updated Workspace

### Task 4: Run the targeted test suite for workspace layout

**Files:**
- Verify: `test/build-layout.test.ts`
- Verify: `src/app/build/page.tsx`
- Verify: `src/components/ChatPanel.tsx`
- Verify: `src/app/globals.css`

- [ ] **Step 1: Run the build layout tests**

Run: `npm test -- test/build-layout.test.ts`
Expected: PASS

- [ ] **Step 2: Run the production build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Manually verify the page**

Check:
- Desktop avatar fills the area below the nav and left of the chat rail
- No visible avatar panel chrome remains
- Chat rail is slightly wider than before
- Build progress appears inside the chat shell
- Mobile stacks avatar above chat instead of hiding the avatar
