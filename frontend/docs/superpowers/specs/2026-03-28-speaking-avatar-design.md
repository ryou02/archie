# Speaking Avatar with Lip Sync — Design Spec

## Overview

Add a 3D speaking avatar to the build page's empty left area. The avatar lip-syncs to Archie's spoken responses using viseme blend shapes driven by Azure Speech Services. The avatar idles naturally when not speaking and plays talking animations during speech.

## Architecture

```
User sends message
        |
        v
  Backend /chat → returns { speech, plan, ... }
        |
        v
  Frontend calls /tts with speech text
        |
        v
  Backend /tts (Azure Speech SDK)
    → returns { audio: base64 MP3, visemes: [{time, id}] }
        |
        v
  Frontend plays audio + feeds visemes to Avatar component
    → Avatar drives blend shape morph targets in sync with audio
```

## Components

### 1. Backend: `/tts` endpoint (server.js)

**Replace** Deepgram TTS with Azure Cognitive Services Speech SDK.

- Input: `{ text: string }`
- Output: `{ audio: string (base64 MP3), visemes: Array<{ time: number, id: number }> }`
- Azure's `SpeechSynthesizer` with `visemeReceived` event provides viseme IDs (0-21) timed to the audio
- Use a natural-sounding Azure neural voice (e.g., `en-US-JennyNeural` or `en-US-GuyNeural`)
- Viseme IDs map to blend shape names using Azure's standard mapping table

**Dependencies:** `microsoft-cognitiveservices-speech-sdk`

**Required env var:** `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`

### 2. Frontend: Avatar Component (src/components/Avatar.tsx)

A React Three Fiber component that:

- Loads a Ready Player Me `.glb` model (`/models/avatar.glb`)
- Loads animation clips from `/models/animations.glb` (Idle, Talking)
- Drives morph target blend shapes for:
  - **Lip sync**: Maps Azure viseme IDs to RPM viseme blend shapes (viseme_PP, viseme_kk, viseme_I, viseme_AA, viseme_O, viseme_U, viseme_FF, viseme_TH, viseme_sil, etc.)
  - **Blinking**: Random interval blink using eyeBlinkLeft/eyeBlinkRight morph targets
  - **Facial expressions**: Default neutral expression
- Uses `useFrame` to lerp morph targets smoothly each frame
- Switches between Idle and Talking animations based on speaking state

**Key pattern from reference repo:**
```
useFrame(() => {
  // For each viseme cue, check if currentAudioTime is within [start, end]
  // If so, lerp that viseme's blend shape toward 1
  // Otherwise, lerp toward 0
})
```

### 3. Frontend: Experience Component (src/components/AvatarExperience.tsx)

Wraps the Avatar in a Three.js scene with:

- `<Canvas>` from @react-three/fiber
- `<CameraControls>` positioned to frame the avatar (waist-up)
- `<Environment preset="sunset" />` for lighting
- `<ContactShadows>` for grounding

### 4. Frontend: Updated useVoiceOutput hook (src/lib/use-voice-output.ts)

Modify to:

- Call the updated `/tts` endpoint that returns JSON `{ audio, visemes }` instead of raw ArrayBuffer
- Expose `visemes` state and `isPlaying` state
- Expose `audioRef` so the Avatar can read `currentTime` for viseme sync

### 5. Frontend: Build Page Integration (src/app/build/page.tsx)

- Add `<AvatarExperience>` component in the main content area (left of chat panel)
- Pass `visemes`, `isPlaying`, and `audioRef` from `useVoiceOutput` to the avatar
- The avatar canvas fills the available space

## Assets

### Avatar Model
- Source: `@readyplayerme/visage` sample avatar (`male.glb`)
- Download to: `public/models/avatar.glb`
- MIT licensed

### Animations
- Source: `readyplayerme/animation-library` repo
- Files needed:
  - `M_Standing_Idle_001.glb` → `public/models/idle.glb`
  - `M_Talking_Variations_001.glb` → `public/models/talking.glb`
- License: Free with RPM avatars

## Viseme Mapping

Azure viseme IDs → RPM blend shape names:

| Azure ID | Phoneme | RPM Blend Shape |
|----------|---------|-----------------|
| 0 | Silence | viseme_sil |
| 1 | ae, ax, ah | viseme_aa |
| 2 | aa | viseme_aa |
| 3 | ao | viseme_O |
| 4 | ey, eh, uh | viseme_E |
| 5 | er | viseme_E |
| 6 | y, iy, ih, ix | viseme_I |
| 7 | w, uw | viseme_U |
| 8 | ow | viseme_O |
| 9 | aw | viseme_aa |
| 10 | oy | viseme_O |
| 11 | ay | viseme_aa |
| 12 | h | viseme_sil |
| 13 | r | viseme_RR |
| 14 | l | viseme_nn |
| 15 | s, z | viseme_SS |
| 16 | sh, ch, jh, zh | viseme_SS |
| 17 | th, dh | viseme_TH |
| 18 | f, v | viseme_FF |
| 19 | d, t, n | viseme_DD |
| 20 | k, g, ng | viseme_kk |
| 21 | p, b, m | viseme_PP |

## Data Flow (Runtime)

1. User sends message → backend returns `speech` text
2. Frontend calls `/tts` with speech text
3. Backend synthesizes audio via Azure Speech, collects viseme events
4. Backend returns `{ audio: base64, visemes: [{time: ms, id: 0-21}] }`
5. Frontend decodes base64 audio → creates `Audio` element → plays it
6. Avatar component reads `audio.currentTime` each frame
7. For current time, finds matching viseme → lerps blend shape to 1
8. All other viseme blend shapes lerp toward 0
9. When audio ends, avatar returns to Idle animation

## New Dependencies

**Frontend (package.json):**
- `@react-three/fiber` — React renderer for Three.js
- `@react-three/drei` — Helpers (CameraControls, Environment, ContactShadows, useGLTF, useAnimations)
- `three` — 3D engine
- `@types/three` — TypeScript types

**Backend (package.json):**
- `microsoft-cognitiveservices-speech-sdk` — Azure Speech TTS + visemes

## Files Changed

| File | Change |
|------|--------|
| `server.js` | Replace Deepgram `/tts` with Azure Speech SDK |
| `src/lib/use-voice-output.ts` | Return visemes + isPlaying + audioRef |
| `src/app/build/page.tsx` | Add AvatarExperience to layout |
| `src/components/Avatar.tsx` | **New** — 3D avatar with lip sync |
| `src/components/AvatarExperience.tsx` | **New** — R3F Canvas wrapper |
| `public/models/avatar.glb` | **New** — RPM avatar model |
| `public/models/idle.glb` | **New** — Idle animation |
| `public/models/talking.glb` | **New** — Talking animation |
| `package.json` | Add three/r3f/azure deps |
