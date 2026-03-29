<p align="center">
  <img src="preview/logo.png" alt="Archie" width="400" />
</p>

<p align="center">
  A voice-enabled AI agent that helps kids build Roblox games through conversation.
</p>

---

## Preview

<p align="center">
  <img src="preview/Screenshot 2026-03-29 at 7.25.11 PM.png" alt="Chat interface with 3D avatar" width="700" />
</p>

<p align="center">
  <img src="preview/Screenshot 2026-03-29 at 7.23.56 PM.png" alt="Game built in Roblox Studio" width="700" />
</p>

## Architecture

<p align="center">
  <img src="preview/Screenshot 2026-03-29 at 7.27.05 PM.png" alt="Tech stack" width="700" />
</p>

## What This Project Does

Archie has two parts:

- A Next.js frontend and local web server in `frontend/`
- A Roblox place workflow from the repo root

The frontend app is a voice-enabled AI assistant that helps users describe and plan Roblox game ideas through conversation.

The project includes:

- A landing page for starting a build session
- A build workspace with chat, task-plan progress, and archived sessions
- Voice input/output support
- A custom Express server that runs the Next.js app and exposes the backend endpoints used by the UI

## Repo Layout

- `frontend/`: the Next.js app, Express server, and frontend tests
- repo root: Roblox workflow files plus convenience scripts that forward to `frontend/`
- `plugin/`: Roblox Studio plugin assets

## How To Install And Run

1. Install the frontend dependencies from the repo root:

```bash
npm run setup:web
```

2. Create a local `.env` file in `frontend/`.

3. Start the development server from the repo root:

```bash
npm run dev
```

4. Open `http://localhost:3000` in your browser.

## Setup Instructions

### Roblox Studio Security

If you want the Archie Studio plugin to talk to the local server, Roblox Studio must allow HTTP requests for the place you have open.

1. Open your place in Roblox Studio.
2. Go to `File > Game Settings > Security`.
3. Turn on `Allow HTTP Requests`.
4. Save the setting, then make sure the Archie frontend is still running on `http://localhost:3000`.

If `Allow HTTP Requests` is off, the plugin cannot poll the local Archie server and the app will stay in the `Studio Offline` state.

For unpublished places, you can also enable it from the Command Bar:

```lua
game:GetService("HttpService").HttpEnabled = true
```

### Dependencies

Main runtime dependencies are installed through `npm run setup:web`. The frontend uses:

- `next`, `react`, `react-dom`
- `express`, `cors`, `dotenv`
- `@anthropic-ai/sdk`
- `microsoft-cognitiveservices-speech-sdk`
- `@react-three/fiber`, `@react-three/drei`, `three`

### Environment Variables

Create `frontend/.env` with the following variables:

```bash
ANTHROPIC_API_KEY=your_anthropic_key
DEEPGRAM_API_KEY=your_deepgram_key
AZURE_SPEECH_KEY=your_azure_speech_key
AZURE_SPEECH_REGION=your_azure_region
AZURE_SPEECH_VOICE=en-US-GuyNeural
```

Notes:

- `DEEPGRAM_API_KEY` is used for speech synthesis fallback and browser voice features.
- `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION` enable Azure speech synthesis with viseme support.
- `AZURE_SPEECH_VOICE` is optional; the app defaults to `en-US-GuyNeural`.
- Keep real keys out of version control.

### Useful Scripts

Run these from the repo root:

```bash
npm run setup:web  # install frontend dependencies
npm run dev        # run the local development server
npm run build      # build the Next.js app
npm run start      # start the production server
npm run lint       # run ESLint
npm test           # run tests
```

### Roblox Workflow

To build the place from scratch:

```bash
rojo build -o "Archie.rbxlx"
```

Then open `Archie.rbxlx` in Roblox Studio and start the Rojo server:

```bash
rojo serve
```

## Team Members And Contributions

Current contributors visible in git history for this repo:

- Basil Liu: major work on the frontend experience, build workspace UI, styling, chat flow, voice-input integration, and frontend tests.
- tourist67: major work on server integration, API/data flow, task planning, and shared UI components used by the build interface.
