# Speaking Avatar Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a build-page speaking avatar that lip-syncs to Archie’s speech using Azure viseme timing while preserving the existing ambient glass layout.

**Architecture:** Replace the current raw-MP3 `/tts` response with a JSON payload that includes base64 MP3 audio plus Azure viseme timing. Keep the speech transport and viseme mapping in small testable helpers, then layer a client-side avatar scene onto the empty build-page area and drive it from the shared voice-output hook.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Express, Azure Speech SDK, React Three Fiber, Drei, Three.js, Node `test` via `tsx --test`, ESLint

---

## Chunk 1: Speech Contract And Viseme Helpers

### Task 1: Add a failing test for the Azure viseme mapping helper

**Files:**
- Create: `test/avatar-visemes.test.ts`
- Create: `src/lib/avatar-visemes.ts`

- [ ] **Step 1: Write the failing test**

```ts
import test from "node:test";
import assert from "node:assert/strict";

import {
  AZURE_VISEME_TO_RPM,
  getVisemeBlendShapeName,
} from "../src/lib/avatar-visemes";

test("azure viseme ids map onto Ready Player Me blend shapes", () => {
  assert.equal(AZURE_VISEME_TO_RPM[0], "viseme_sil");
  assert.equal(AZURE_VISEME_TO_RPM[7], "viseme_U");
  assert.equal(AZURE_VISEME_TO_RPM[21], "viseme_PP");
  assert.equal(getVisemeBlendShapeName(18), "viseme_FF");
});

test("unknown viseme ids fall back to silence", () => {
  assert.equal(getVisemeBlendShapeName(999), "viseme_sil");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- test/avatar-visemes.test.ts`

Expected: FAIL with module-not-found for `src/lib/avatar-visemes.ts`

- [ ] **Step 3: Write the minimal helper**

```ts
export const AZURE_VISEME_TO_RPM: Record<number, string> = {
  0: "viseme_sil",
  1: "viseme_aa",
  2: "viseme_aa",
  3: "viseme_O",
  4: "viseme_E",
  5: "viseme_E",
  6: "viseme_I",
  7: "viseme_U",
  8: "viseme_O",
  9: "viseme_aa",
  10: "viseme_O",
  11: "viseme_aa",
  12: "viseme_sil",
  13: "viseme_RR",
  14: "viseme_nn",
  15: "viseme_SS",
  16: "viseme_SS",
  17: "viseme_TH",
  18: "viseme_FF",
  19: "viseme_DD",
  20: "viseme_kk",
  21: "viseme_PP",
};

export function getVisemeBlendShapeName(id: number) {
  return AZURE_VISEME_TO_RPM[id] ?? "viseme_sil";
}
```

- [ ] **Step 4: Re-run the focused test**

Run: `npm test -- test/avatar-visemes.test.ts`

Expected: PASS

### Task 2: Add a failing test for the `/tts` response contract

**Files:**
- Modify: `test/avatar-visemes.test.ts`
- Modify: `src/lib/api.ts`
- Modify: `src/lib/use-voice-output.ts`
- Modify: `server.js`

- [ ] **Step 1: Add a source-contract test**

```ts
import { readFileSync } from "node:fs";
import path from "node:path";

const apiSource = readFileSync(path.join(process.cwd(), "src/lib/api.ts"), "utf8");
const voiceSource = readFileSync(path.join(process.cwd(), "src/lib/use-voice-output.ts"), "utf8");
const serverSource = readFileSync(path.join(process.cwd(), "server.js"), "utf8");

test("tts contract carries audio and visemes through server and client helpers", () => {
  assert.match(apiSource, /export interface TTSResponse/);
  assert.match(apiSource, /visemes:\s*TTSVisemeCue\[]/);
  assert.match(voiceSource, /const \{ audio, visemes \} = await getTTS\(text\)/);
  assert.match(serverSource, /visemeReceived/);
  assert.match(serverSource, /res\.json\(\{ audio, visemes \}\)/);
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- --test-name-pattern="tts contract carries audio and visemes"`

Expected: FAIL because the current code still reads an `ArrayBuffer` and sends raw MP3 bytes

- [ ] **Step 3: Implement the minimal contract**

Code requirements:
- `src/lib/api.ts` exports `TTSVisemeCue` and `TTSResponse`
- `getTTS(text)` returns `Promise<TTSResponse>`
- `server.js` switches `/tts` to Azure Speech SDK, captures `visemeReceived`, and returns `{ audio, visemes }`
- `src/lib/use-voice-output.ts` decodes the JSON response and stores `visemes`, `isPlaying`, and `audioRef`

- [ ] **Step 4: Re-run the focused test**

Run: `npm test -- --test-name-pattern="tts contract carries audio and visemes"`

Expected: PASS

---

## Chunk 2: Avatar Scene And Build Page Integration

### Task 3: Add a failing test for the avatar scene surface

**Files:**
- Modify: `test/build-layout.test.ts`
- Create: `src/components/Avatar.tsx`
- Create: `src/components/AvatarExperience.tsx`

- [ ] **Step 1: Extend the layout test**

```ts
const avatarExperience = readFileSync(
  path.join(process.cwd(), "src/components/AvatarExperience.tsx"),
  "utf8"
);

test("build page renders a dedicated avatar stage beside the chat shell", () => {
  assert.match(buildPage, /<AvatarExperience/);
  assert.match(buildPage, /workspace-avatar/);
  assert.match(avatarExperience, /<Canvas/);
  assert.match(avatarExperience, /<Environment preset="sunset"/);
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- --test-name-pattern="avatar stage"`

Expected: FAIL because the component and layout slot do not exist yet

- [ ] **Step 3: Implement the minimal scene**

Code requirements:
- `Avatar.tsx` loads `/models/avatar.glb`, `/models/idle.glb`, and `/models/talking.glb`
- `AvatarExperience.tsx` renders the canvas, camera controls, environment, and contact shadows
- The avatar component accepts `visemes`, `isPlaying`, and `audioRef`

- [ ] **Step 4: Re-run the focused test**

Run: `npm test -- --test-name-pattern="avatar stage"`

Expected: PASS

### Task 4: Add a failing test for build-page wiring and layout classes

**Files:**
- Modify: `test/build-layout.test.ts`
- Modify: `src/app/build/page.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add integration assertions**

```ts
test("build page threads voice output state into the avatar stage", () => {
  assert.match(buildPage, /const \{ speak, visemes, isPlaying, audioRef \} = useVoiceOutput\(\)/);
  assert.match(buildPage, /<AvatarExperience[\s\S]*visemes=\{visemes\}/);
  assert.match(buildPage, /audioRef=\{audioRef\}/);
  assert.match(globalsCss, /\.workspace-avatar\s*\{/s);
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- --test-name-pattern="threads voice output state"`

Expected: FAIL

- [ ] **Step 3: Implement the minimal integration**

Code requirements:
- Split the main build layout into a left avatar stage and right chat shell
- Keep task/status chrome intact
- Ensure the avatar stage is hidden or simplified on smaller screens instead of breaking the layout

- [ ] **Step 4: Re-run the focused test**

Run: `npm test -- --test-name-pattern="threads voice output state"`

Expected: PASS

---

## Chunk 3: Assets, Dependencies, And Verification

### Task 5: Add the avatar assets and dependency declarations

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `public/models/avatar.glb`
- Create: `public/models/idle.glb`
- Create: `public/models/talking.glb`

- [ ] **Step 1: Add a package contract test**

Extend `test/avatar-visemes.test.ts` with:

```ts
const packageJson = readFileSync(path.join(process.cwd(), "package.json"), "utf8");

test("package.json includes avatar rendering and azure speech dependencies", () => {
  assert.match(packageJson, /"@react-three\\/fiber"/);
  assert.match(packageJson, /"@react-three\\/drei"/);
  assert.match(packageJson, /"three"/);
  assert.match(packageJson, /"microsoft-cognitiveservices-speech-sdk"/);
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- --test-name-pattern="includes avatar rendering and azure speech"`

Expected: FAIL

- [ ] **Step 3: Add the dependencies and assets**

Run:
- `npm install @react-three/fiber @react-three/drei three microsoft-cognitiveservices-speech-sdk`
- `npm install -D @types/three`
- Download the approved `.glb` avatar and animation assets into `public/models/`

- [ ] **Step 4: Re-run the focused test**

Run: `npm test -- --test-name-pattern="includes avatar rendering and azure speech"`

Expected: PASS

### Task 6: Full verification

**Files:**
- Verify: `test/avatar-visemes.test.ts`
- Verify: `test/build-layout.test.ts`
- Verify: `src/app/build/page.tsx`
- Verify: `src/components/Avatar.tsx`
- Verify: `src/components/AvatarExperience.tsx`
- Verify: `src/lib/api.ts`
- Verify: `src/lib/use-voice-output.ts`
- Verify: `server.js`

- [ ] **Step 1: Run targeted tests**

Run: `npm test -- test/avatar-visemes.test.ts test/build-layout.test.ts`

Expected: PASS

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: PASS

- [ ] **Step 3: Run a production build**

Run: `npm run build`

Expected: PASS

- [ ] **Step 4: Manual runtime verification**

Run: `npm run dev`

Then verify:
- The build page shows the avatar stage on desktop
- Sending a message plays speech audio
- The avatar switches to talking animation during playback and returns to idle after
- Missing Azure credentials fail with a logged server error and no crash

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json server.js src/app/build/page.tsx src/app/globals.css src/components/Avatar.tsx src/components/AvatarExperience.tsx src/lib/api.ts src/lib/avatar-visemes.ts src/lib/use-voice-output.ts test/avatar-visemes.test.ts test/build-layout.test.ts public/models/avatar.glb public/models/idle.glb public/models/talking.glb docs/superpowers/plans/2026-03-28-speaking-avatar.md
git commit -m "feat: add speaking avatar with azure visemes"
```
