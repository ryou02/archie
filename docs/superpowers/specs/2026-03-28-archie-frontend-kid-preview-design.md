# Archie Frontend Kid Preview Design

## Goal

Redesign the Archie web frontend into a simple, kid-friendly interface centered on a live low-poly build preview, a more realistic speaking Roblox avatar, and a lightweight checklist UI that explains build progress step by step.

## Product Direction

The interface should feel approachable and clear for kids rather than technical or operational. It should avoid dashboard density and instead present Archie as a guide who is actively building something the user can watch unfold.

Core principles:
- Keep the layout simple and readable at a glance.
- Make the avatar and build preview feel alive and rewarding.
- Use plain-language status labels instead of technical workflow jargon.
- Preserve accessibility with strong contrast, large hit targets, and restrained motion.

## Primary Experience

The main screen is a staged experience with three elements:

1. A dominant Roblox avatar that speaks and reacts.
2. A live low-poly diorama showing something being built in real time.
3. A visible checklist of build steps with per-step progress and overall progress.

These elements should work together as a single story rather than separate tools. When Archie speaks, the avatar takes visual priority. When the build advances, the diorama reflects the current step and the checklist confirms what just changed.

## Layout

### Overall Structure

Use a preview-first split layout:
- A large `story stage` occupies most of the screen.
- A narrow `activity rail` sits alongside it.
- A simple input area remains available without dominating the view.

### Story Stage

The story stage contains:
- The Roblox avatar as the primary guide.
- The low-poly diorama as the visual representation of the game being built.
- Lightweight labels or transitions that help the user understand whether Archie is currently talking, thinking, or building.

The stage must allow emphasis to shift between avatar and diorama without a full layout change. This can be done through scale, camera framing, lighting, opacity, or motion cues.

### Activity Rail

The activity rail contains:
- A short overall progress indicator.
- A checklist of 4-6 steps such as planning, setting the scene, adding objects, and finishing touches.
- Per-step progress bars.
- Short status text written for children, with minimal jargon.

The checklist should explain the build without reading like a control panel. It must stay visible while the preview remains the emotional center of the interface.

### Input Surface

The input area remains simple:
- Large text input.
- Large microphone button.
- Minimal extra controls.

The interaction model should stay obvious for younger users and avoid clutter.

## Avatar Design

### Visual Role

The avatar should feel like Archie is present and responsive, not like a static decoration. It should retain a recognizable Roblox identity while gaining more believable speaking behavior.

### Speaking Realism

The speaking system should improve beyond a simple mouth open/close loop by adding:
- Smoothed mouth movement driven by speech timing or amplitude.
- Jaw motion with natural easing.
- Small head and torso motion while speaking.
- Idle blinking and subtle breathing when waiting.

The goal is not full realism; it is convincing, readable speaking on a stylized character.

### State Model

The avatar should visibly differentiate at least these states:
- Idle
- Listening
- Thinking
- Speaking

Each state should use subtle pose, timing, and camera differences so kids can understand what Archie is doing without reading extra text.

## Diorama Design

### Visual Direction

The build preview should be a warm, low-poly diorama inspired by the supplied reference:
- Sunlit tabletop feeling.
- Simple geometry and soft materials.
- Clean shadows and stylized forms.
- Small handcrafted scene fragments rather than a full literal world.

The preview should resemble “something being built” rather than a finished game map.

### Build Progression

The diorama should update incrementally as Archie works:
- Ground/base appears first.
- Main structure appears next.
- Props and decorative elements appear in later steps.
- Final polish adds small ambient or environmental touches.

Each stage should be visibly distinct so the user sees progress instead of waiting for a final reveal.

### Technical Shape

The diorama should be implemented in Three.js and designed as a deterministic scene that can be advanced by frontend state. It should support:
- Step-based scene changes.
- Simple animations for newly added pieces.
- Camera framing that works on both desktop and smaller screens.

## Task and Progress Model

### Checklist Structure

Represent tasks as a fixed ordered list of steps. Each step includes:
- Label
- Current status
- Progress value
- Optional short detail text

The frontend should be able to render:
- Upcoming steps
- Active step with live progress
- Completed steps

### Progress Language

Use plain, friendly labels instead of internal system terminology. Example directions:
- Planning the build
- Setting the world up
- Adding cool objects
- Finishing the details

Final wording should stay concise and readable for kids.

### Synchronization

Task progress, avatar state, and diorama progression should all derive from shared UI state so they remain synchronized. The user should not see the checklist claim a step is done while the scene still looks unchanged.

## Accessibility and Usability

The redesigned interface should prioritize:
- Large text and controls.
- Clear focus states.
- Strong color contrast.
- Reduced visual clutter.
- Motion that supports understanding rather than distracts.

For younger users, the product should remain understandable even if they never read every line of text. Important state changes must be visible through layout, animation, and iconography as well as words.

## Implementation Boundaries

The work should evolve the existing `web/public` frontend rather than replace the whole app. Likely areas of change:
- `index.html` for the updated layout regions.
- `style.css` for new layout, color, spacing, and accessibility improvements.
- Existing JS modules for chat, voice, and avatar state integration.
- New Three.js scene code for the low-poly diorama.
- New UI state utilities or data structures for checklist/progress rendering.

## Risks

- Over-animating the avatar could make the experience feel noisy or uncanny.
- A visually rich stage can become confusing if the checklist hierarchy is weak.
- A Three.js diorama can drift into generic “3D demo” territory unless the art direction remains tightly low-poly and scene-based.
- If avatar speaking and step progress are driven by separate ad hoc logic, the interface will feel inconsistent.

## Success Criteria

The redesign is successful if:
- Kids can understand what Archie is doing without technical explanation.
- The avatar feels noticeably more alive while speaking.
- The diorama visibly changes as work progresses.
- The checklist stays readable and useful without dominating the experience.
- The interface feels simple and friendly rather than like a dashboard.
