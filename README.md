# Archie

Archie has two parts:

- a Next.js web app in `frontend/`
- a Roblox place driven by Rojo from the repo root

## Web App

Install the web app dependencies once:

```bash
npm run setup:web
```

Then use the repo root scripts:

```bash
npm run dev
npm run build
npm run lint
npm test
```

The root scripts forward to the canonical Next.js app in `frontend/`.

## Roblox Workflow

To build the place from scratch:

```bash
rojo build -o "Archie.rbxlx"
```

Then open `Archie.rbxlx` in Roblox Studio and start the Rojo server:

```bash
rojo serve
```
