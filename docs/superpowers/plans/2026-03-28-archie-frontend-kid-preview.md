# Archie Frontend Kid Preview Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Archie frontend into a kid-friendly preview-first experience with a speaking avatar, live checklist progress UI, and a low-poly Three.js diorama that updates as Archie builds.

**Architecture:** Keep the existing static frontend structure in `web/public`, but separate responsibilities more clearly. Introduce a shared frontend state model for avatar state, task progress, and diorama progression; evolve the current avatar scene; add a dedicated diorama scene module; and replace the current chat-first layout with a story-stage plus activity-rail layout.

**Tech Stack:** Static HTML/CSS, vanilla JavaScript modules, Three.js, Web Speech/TTS integration, existing Express server

---

## File Structure

### Existing files to modify

- `web/public/index.html`
  Replace the simple two-pane shell with semantic regions for story stage, avatar panel, diorama panel, task rail, and simplified chat input.
- `web/public/style.css`
  Replace the current dark dashboard styling with a warm, accessible, kid-friendly layout and component styles for progress, tasks, speech state, and responsive behavior.
- `web/public/js/app.js`
  Centralize bootstrapping and wire shared frontend state between chat, voice output, avatar, and diorama.
- `web/public/js/chat.js`
  Update response handling so UI state changes can be driven alongside speech and chat history.
- `web/public/js/avatar.js`
  Refactor the avatar renderer to support richer speaking animation and explicit UI states.
- `web/public/js/voice-output.js`
  Provide smoother speaking state and amplitude data to the avatar.

### New files to create

- `web/public/js/build-state.js`
  Shared store for checklist steps, active phase, avatar state, and diorama progress.
- `web/public/js/task-panel.js`
  Renders the task list and progress bars from shared state.
- `web/public/js/diorama.js`
  Owns the low-poly Three.js build scene and step-based scene progression.

### Existing files likely unchanged

- `web/public/js/api.js`
- `web/public/js/voice-input.js`
- `web/server.js`

---

## Chunk 1: Layout And Shared State

### Task 1: Reshape the HTML into a preview-first structure

**Files:**
- Modify: `web/public/index.html`

- [ ] **Step 1: Write down the target DOM structure in the file before editing**

Use this structure as the target:

```html
<div id="app">
  <main id="story-shell">
    <section id="story-stage" aria-label="Archie build preview">
      <div id="avatar-panel">
        <div class="panel-header">
          <p class="eyebrow">Archie</p>
          <p id="avatar-status">Ready to build</p>
        </div>
        <div id="avatar-container"></div>
      </div>
      <div id="diorama-panel">
        <div class="panel-header">
          <p class="eyebrow">Build Preview</p>
          <p id="build-status">Waiting for a build idea</p>
        </div>
        <div id="diorama-container"></div>
      </div>
    </section>
    <aside id="activity-rail" aria-label="Build progress">
      <section id="progress-card"></section>
      <section id="task-panel"></section>
      <section id="chat-container"></section>
    </aside>
  </main>
</div>
```

- [ ] **Step 2: Update `web/public/index.html` to match the target structure**

Keep:
- The import map for Three.js.
- The existing script loading order.

Add:
- Containers for `task-panel` and `diorama-container`.
- Accessible labels/headings for avatar state and build status.

- [ ] **Step 3: Manually verify the HTML still references all needed scripts**

Check:
- `js/api.js`
- `js/voice-input.js`
- `js/voice-output.js`
- `js/chat.js`
- `js/task-panel.js`
- `js/app.js`
- `js/avatar.js`
- `js/diorama.js`

- [ ] **Step 4: Commit**

```bash
git add web/public/index.html
git commit -m "feat: reshape frontend shell for preview layout"
```

### Task 2: Introduce a shared build state model

**Files:**
- Create: `web/public/js/build-state.js`
- Modify: `web/public/js/app.js`

- [ ] **Step 1: Write the minimal shared state API**

Create `web/public/js/build-state.js` with:

```js
const defaultSteps = [
  { id: "plan", label: "Planning the build", progress: 0, status: "upcoming", detail: "" },
  { id: "scene", label: "Setting the world up", progress: 0, status: "upcoming", detail: "" },
  { id: "objects", label: "Adding cool objects", progress: 0, status: "upcoming", detail: "" },
  { id: "polish", label: "Finishing the details", progress: 0, status: "upcoming", detail: "" },
];

const BuildState = {
  state: {
    avatarState: "idle",
    overallProgress: 0,
    activeStepId: defaultSteps[0].id,
    buildStatus: "Waiting for a build idea",
    steps: structuredClone(defaultSteps),
  },
  listeners: new Set(),
  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  },
  update(patch) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener(this.state));
  },
  updateStep(stepId, stepPatch) {
    const steps = this.state.steps.map((step) =>
      step.id === stepId ? { ...step, ...stepPatch } : step
    );
    const overallProgress =
      steps.reduce((sum, step) => sum + step.progress, 0) / steps.length;
    this.update({ steps, overallProgress });
  },
};

window.BuildState = BuildState;
```

- [ ] **Step 2: Wire the store into app bootstrap**

Update `web/public/js/app.js` so init order becomes:

```js
document.addEventListener("DOMContentLoaded", () => {
  TaskPanel.init();
  Chat.init();
  VoiceOutput.init();
  Avatar.init();
  Diorama.init();
  VoiceInput.init();
});
```

Also add initial state updates such as:

```js
BuildState.update({
  avatarState: "idle",
  buildStatus: "Tell Archie what to build",
});
```

- [ ] **Step 3: Run a quick syntax check in the browser**

Run:

```bash
npm start
```

Expected:
- Server starts without syntax errors.
- Page loads with no immediate `ReferenceError` for `BuildState`, `TaskPanel`, or `Diorama`.

- [ ] **Step 4: Commit**

```bash
git add web/public/js/build-state.js web/public/js/app.js
git commit -m "feat: add shared build progress state"
```

---

## Chunk 2: Task Rail And Kid-Friendly Styling

### Task 3: Render the checklist and progress bars from shared state

**Files:**
- Create: `web/public/js/task-panel.js`
- Modify: `web/public/index.html`

- [ ] **Step 1: Create the task panel renderer**

Add `web/public/js/task-panel.js`:

```js
const TaskPanel = {
  init() {
    this.root = document.getElementById("task-panel");
    this.progressRoot = document.getElementById("progress-card");
    window.BuildState.subscribe((state) => this.render(state));
  },
  render(state) {
    this.progressRoot.innerHTML = `
      <p class="eyebrow">Progress</p>
      <div class="overall-progress" aria-label="Overall build progress">
        <div class="overall-progress-bar" style="width:${state.overallProgress}%"></div>
      </div>
      <p class="progress-copy">${state.buildStatus}</p>
    `;

    this.root.innerHTML = state.steps.map((step) => `
      <article class="task-step task-step--${step.status}">
        <div class="task-step__row">
          <p class="task-step__label">${step.label}</p>
          <p class="task-step__percent">${Math.round(step.progress)}%</p>
        </div>
        <div class="task-step__bar" aria-hidden="true">
          <div class="task-step__fill" style="width:${step.progress}%"></div>
        </div>
        <p class="task-step__detail">${step.detail || "&nbsp;"}</p>
      </article>
    `).join("");
  },
};

window.TaskPanel = TaskPanel;
```

- [ ] **Step 2: Ensure `task-panel.js` is loaded before `app.js`**

Add to `web/public/index.html`:

```html
<script src="js/task-panel.js"></script>
```

- [ ] **Step 3: Verify initial rendering in the browser**

Expected:
- The activity rail shows one overall progress bar.
- Four checklist steps render with 0% values.
- No empty rail or JS errors.

- [ ] **Step 4: Commit**

```bash
git add web/public/index.html web/public/js/task-panel.js
git commit -m "feat: render build checklist progress panel"
```

### Task 4: Replace the current visual style with an accessible kid-friendly layout

**Files:**
- Modify: `web/public/style.css`

- [ ] **Step 1: Replace the current color system and shell layout**

Add root tokens such as:

```css
:root {
  --bg: oklch(0.97 0.03 95);
  --bg-soft: oklch(0.94 0.04 95);
  --panel: oklch(0.99 0.01 95);
  --ink: oklch(0.29 0.04 250);
  --ink-soft: oklch(0.48 0.03 250);
  --accent: oklch(0.72 0.15 145);
  --accent-strong: oklch(0.63 0.17 145);
  --warm: oklch(0.82 0.09 80);
  --line: color-mix(in oklab, var(--ink) 12%, white);
  --shadow: 0 20px 60px color-mix(in oklab, var(--ink) 10%, transparent);
}
```

Create responsive layout rules for:
- `#story-shell`
- `#story-stage`
- `#avatar-panel`
- `#diorama-panel`
- `#activity-rail`
- `#chat-container`

- [ ] **Step 2: Add styles for progress, tasks, and large controls**

Include rules for:
- `.overall-progress`
- `.overall-progress-bar`
- `.task-step`
- `.task-step__fill`
- `.task-step--active`
- `#chat-input`
- `#mic-btn`

Constraints:
- Large tap targets.
- Clear focus styles.
- High contrast text.
- No dark dashboard palette.

- [ ] **Step 3: Add a mobile/smaller laptop adaptation**

At a minimum:

```css
@media (max-width: 1100px) {
  #story-shell {
    grid-template-columns: 1fr;
  }

  #activity-rail {
    order: -1;
  }
}
```

Ensure the stage still reads clearly when stacked.

- [ ] **Step 4: Verify the page visually**

Run:

```bash
npm start
```

Check:
- Task rail remains readable.
- Avatar and diorama containers are visibly distinct.
- Input remains usable.
- Nothing depends on hover only.

- [ ] **Step 5: Commit**

```bash
git add web/public/style.css
git commit -m "feat: add kid-friendly preview-first styling"
```

---

## Chunk 3: Avatar Speaking Upgrade

### Task 5: Refactor the avatar scene to support explicit animation states

**Files:**
- Modify: `web/public/js/avatar.js`

- [ ] **Step 1: Add a stateful Avatar API**

Expand `Avatar` with:

```js
state: "idle",
mouthOpenTarget: 0,
mouthOpenCurrent: 0,
blinkTimer: 0,
idlePhase: 0,
setState(nextState) {
  this.state = nextState;
},
setSpeechEnergy(amount) {
  this.mouthOpenTarget = Math.max(0, Math.min(amount, 1));
},
```

- [ ] **Step 2: Smooth the speaking motion in `animate()`**

In the render loop, add:

```js
this.mouthOpenCurrent += (this.mouthOpenTarget - this.mouthOpenCurrent) * 0.18;
this.setMouthOpen(this.mouthOpenCurrent);
```

Also add:
- Small head bob while speaking.
- Small breathing motion while idle.
- Blink timing every few seconds if the model supports relevant morphs or bones.

- [ ] **Step 3: Update camera and lighting to make the avatar feel more present**

Adjust:
- Background away from the current dark navy.
- Camera framing closer and slightly warmer.
- Softer key/fill/rim lighting instead of one flat ambient plus one directional light.

- [ ] **Step 4: Add a placeholder behavior fallback**

If `archie.glb` fails to load:
- Render a stylized placeholder figure instead of a sphere.
- Keep speaking state visible by scaling or moving the placeholder face/jaw region.

- [ ] **Step 5: Verify animation quality**

Manual browser checks:
- Mouth movement ramps up and down smoothly.
- Avatar does not freeze after speech ends.
- Idle state remains alive but not distracting.

- [ ] **Step 6: Commit**

```bash
git add web/public/js/avatar.js
git commit -m "feat: improve avatar speaking animation"
```

### Task 6: Feed smoother speech energy and state into the avatar

**Files:**
- Modify: `web/public/js/voice-output.js`
- Modify: `web/public/js/app.js`

- [ ] **Step 1: Expose speech lifecycle hooks from `voice-output.js`**

Add callbacks:

```js
onSpeechStart: null,
onSpeechEnd: null,
onSpeechEnergy: null,
```

Call them when audio starts, updates, and ends.

- [ ] **Step 2: Smooth analyser output before sending it to Avatar**

Replace the raw average with a smoothed value:

```js
this.energy = this.energy * 0.72 + mouthOpen * 0.28;
```

Pass it to:

```js
if (this.onSpeechEnergy) this.onSpeechEnergy(this.energy);
```

- [ ] **Step 3: Update app wiring**

In `web/public/js/app.js`:

```js
VoiceOutput.onSpeechStart = () => BuildState.update({ avatarState: "speaking" });
VoiceOutput.onSpeechEnergy = (energy) => Avatar.setSpeechEnergy(energy);
VoiceOutput.onSpeechEnd = () => {
  Avatar.setSpeechEnergy(0);
  BuildState.update({ avatarState: "idle" });
};
```

- [ ] **Step 4: Verify end-to-end speech sync**

Expected:
- Triggering Archie speech updates avatar state.
- Mouth energy rises/falls with audio.
- Mouth returns to resting state after speech.

- [ ] **Step 5: Commit**

```bash
git add web/public/js/voice-output.js web/public/js/app.js
git commit -m "feat: sync avatar animation with voice output"
```

---

## Chunk 4: Low-Poly Diorama

### Task 7: Add a dedicated Three.js diorama scene

**Files:**
- Create: `web/public/js/diorama.js`
- Modify: `web/public/index.html`

- [ ] **Step 1: Create the base diorama renderer**

Add `web/public/js/diorama.js`:

```js
import * as THREE from "three";

const Diorama = {
  init() {
    this.container = document.getElementById("diorama-container");
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    this.camera.position.set(5.5, 4.5, 6.5);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);
    this.buildScene();
    window.BuildState.subscribe((state) => this.syncFromState(state));
    window.addEventListener("resize", () => this.onResize());
    this.onResize();
    this.animate();
  },
};

window.Diorama = Diorama;
```

- [ ] **Step 2: Build the low-poly scene primitives**

Implement helper methods:
- `createGround()`
- `createPlatformDeck()`
- `createTent()`
- `createBoat()`
- `createProps()`

Art direction:
- Soft warm materials.
- Simple geometry.
- Scene silhouette inspired by the reference image.

- [ ] **Step 3: Add step-based visibility/progression**

Map shared state to scene updates:

```js
syncFromState(state) {
  const current = state.steps;
  this.groups.plan.visible = current[0].progress > 0;
  this.groups.scene.visible = current[1].progress > 0;
  this.groups.objects.visible = current[2].progress > 0;
  this.groups.polish.visible = current[3].progress > 0;
}
```

Use simple reveal animation by interpolating group scale or vertical offset.

- [ ] **Step 4: Load the module**

Add to `web/public/index.html`:

```html
<script type="module" src="js/diorama.js"></script>
```

- [ ] **Step 5: Verify render behavior**

Expected:
- The diorama renders at page load.
- Resize does not distort the scene.
- Later state changes can reveal more geometry cleanly.

- [ ] **Step 6: Commit**

```bash
git add web/public/index.html web/public/js/diorama.js
git commit -m "feat: add low-poly build diorama"
```

### Task 8: Connect chat events to checklist and diorama progression

**Files:**
- Modify: `web/public/js/chat.js`
- Modify: `web/public/js/app.js`

- [ ] **Step 1: Add a simple optimistic build progression helper**

In `web/public/js/app.js`, add a helper like:

```js
function advanceBuildPreview() {
  const sequence = [
    ["plan", 100, "done", "Build idea ready"],
    ["scene", 65, "active", "Setting up the world"],
    ["objects", 30, "active", "Adding the main pieces"],
    ["polish", 10, "upcoming", ""],
  ];
}
```

Turn this into a deterministic progression function that updates:
- `buildStatus`
- `activeStepId`
- individual steps

- [ ] **Step 2: Trigger progression around request lifecycle**

Before sending a user message:

```js
BuildState.update({ avatarState: "thinking", buildStatus: "Planning the build" });
BuildState.updateStep("plan", { status: "active", progress: 35, detail: "Picking a good idea" });
```

After a successful response:
- Mark earlier steps complete.
- Advance later steps.
- Set task copy to match the current build phase.

- [ ] **Step 3: Keep the activity rail stable on errors**

On failure:

```js
BuildState.update({
  avatarState: "idle",
  buildStatus: "Something went wrong. Try again.",
});
```

Do not reset all steps unless explicitly intended.

- [ ] **Step 4: Verify visible progression**

Manual checks:
- Sending a message changes the active step.
- Progress bars advance.
- Diorama gains more visible pieces over time.

- [ ] **Step 5: Commit**

```bash
git add web/public/js/chat.js web/public/js/app.js
git commit -m "feat: sync task progress with build activity"
```

---

## Chunk 5: Polish And Verification

### Task 9: Add final interaction polish and accessibility fixes

**Files:**
- Modify: `web/public/style.css`
- Modify: `web/public/js/task-panel.js`
- Modify: `web/public/js/avatar.js`
- Modify: `web/public/js/diorama.js`

- [ ] **Step 1: Add reduced-motion handling**

Implement:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Also reduce non-essential camera/scene motion in JS when reduced motion is enabled.

- [ ] **Step 2: Improve empty and waiting states**

Ensure the UI reads clearly when no build is in progress:
- Friendly status copy.
- Visible but calm avatar.
- Diorama still shows a base stage rather than a blank void.

- [ ] **Step 3: Confirm focus and keyboard usability**

Manual checks:
- `Tab` reaches the input and microphone button.
- Focus ring is clearly visible.
- Chat input remains usable after a response.

- [ ] **Step 4: Commit**

```bash
git add web/public/style.css web/public/js/task-panel.js web/public/js/avatar.js web/public/js/diorama.js
git commit -m "feat: polish preview interactions and accessibility"
```

### Task 10: Run final verification

**Files:**
- No source changes required unless issues are found

- [ ] **Step 1: Start the app**

Run:

```bash
cd web
npm start
```

Expected:
- Server starts on `http://localhost:3000`.

- [ ] **Step 2: Manual verification checklist**

Confirm:
- Layout is preview-first, not dashboard-like.
- Task rail shows overall progress and per-step bars.
- Avatar speaking looks smoother than simple open/close.
- Diorama renders and reveals additional scene pieces.
- Interface remains readable on a smaller laptop-sized viewport.

- [ ] **Step 3: Capture any follow-up bugs before merging**

If issues are found:
- Fix them immediately in focused commits.
- Re-run the relevant verification steps.

