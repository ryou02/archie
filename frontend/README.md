# Archie Frontend

## What This Project Does

This app is the frontend and local web server for Archie, a voice-enabled AI assistant that helps users describe and plan Roblox game ideas through conversation.

The project includes:

- A landing page for starting a build session
- A build workspace with chat, task-plan progress, and archived sessions
- Voice input/output support
- A custom Express server that runs the Next.js app and exposes the backend endpoints used by the UI

## How To Install And Run

1. Install dependencies:

```bash
npm install
```

2. Create a local `.env` file in the project root.

3. Start the development server:

```bash
npm run dev
```

4. Open `http://localhost:3000` in your browser.

## Setup Instructions

### Roblox Studio Security

If you want the Archie Studio plugin to talk to this local server, Roblox Studio must allow HTTP requests for the place you have open.

1. Open your place in Roblox Studio.
2. Go to `File > Game Settings > Security`.
3. Turn on `Allow HTTP Requests`.
4. Save the setting, then make sure this frontend is still running on `http://localhost:3000`.

If `Allow HTTP Requests` is off, the plugin cannot poll the local Archie server and the app will stay in the `Studio Offline` state.

For unpublished places, you can also enable it from the Command Bar:

```lua
game:GetService("HttpService").HttpEnabled = true
```

### Dependencies

Main runtime dependencies are installed through `npm install`. The project uses:

- `next`, `react`, `react-dom`
- `express`, `cors`, `dotenv`
- `@anthropic-ai/sdk`
- `microsoft-cognitiveservices-speech-sdk`
- `@react-three/fiber`, `@react-three/drei`, `three`

### Environment Variables

Create a `.env` file with the following variables:

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

```bash
npm run dev    # run the local development server
npm run build  # build the Next.js app
npm run start  # start the production server
npm run lint   # run ESLint
npm run test   # run tests
```

## Team Members And Contributions

Current contributors visible in git history for this repo:

- Basil Liu: major work on the frontend experience, build workspace UI, styling, chat flow, voice-input integration, and frontend tests.
- tourist67: major work on server integration, API/data flow, task planning, and shared UI components used by the build interface.
