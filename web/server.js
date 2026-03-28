require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Anthropic = require("@anthropic-ai/sdk");

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are Archie, a friendly AI building assistant inside Roblox Studio. You help kids build Roblox games by generating Luau code.

Your personality:
- Super friendly, casual, encouraging
- Keep spoken responses SHORT (1-5 words): "On it!", "Got it!", "Done!", "Let me build that!"
- Never explain code or teach — just build what they ask for

When the user asks you to build or change something, respond with valid JSON:
{
  "speech": "On it!",
  "code": "<valid Luau code that creates/modifies Roblox instances>",
  "description": "<short description of what was added/changed>"
}

When the user is just chatting (not asking to build), respond with:
{
  "speech": "<your casual response>",
  "code": null,
  "description": null
}

IMPORTANT rules for generated code:
- Use Instance.new() to create Parts, Models, Scripts, etc.
- Parent everything to game.Workspace unless the user specifies otherwise
- Scripts should be parented to the object they control, or to game.ServerScriptService
- Set properties like Position, Size, Color, Name, etc.
- Use BrickColor or Color3 for colors
- Code must be valid Luau that runs in Roblox Studio
- Always respond with valid JSON only — no markdown, no backticks`;

let conversationHistory = [];

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// --- Plugin Bridge State ---
let pendingAction = null; // { code, description, id }
let actionIdCounter = 0;

// Queue a code action for the plugin to pick up
function queueAction(code, description) {
  actionIdCounter++;
  pendingAction = { code, description, id: actionIdCounter };
  return actionIdCounter;
}

// Plugin polls this for pending code
app.get("/pending", (req, res) => {
  if (pendingAction) {
    res.json({ hasPending: true, action: pendingAction });
  } else {
    res.json({ hasPending: false });
  }
});

// Plugin approves the pending action
app.post("/approve", (req, res) => {
  const approved = pendingAction;
  pendingAction = null;
  res.json({ success: true, approved });
});

// Plugin rejects the pending action
app.post("/reject", (req, res) => {
  const rejected = pendingAction;
  pendingAction = null;
  res.json({ success: true, rejected });
});

// Health check
app.get("/status", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/chat", async (req, res) => {
  const { message } = req.body;

  conversationHistory.push({ role: "user", content: message });

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: conversationHistory,
    });

    const assistantText = response.content[0].text;
    conversationHistory.push({ role: "assistant", content: assistantText });

    let parsed;
    try {
      parsed = JSON.parse(assistantText);
    } catch {
      parsed = { speech: assistantText, code: null, description: null };
    }

    // If there's code, queue it for the plugin
    if (parsed.code) {
      queueAction(parsed.code, parsed.description || "Code from Archie");
    }

    res.json(parsed);
  } catch (err) {
    console.error("Claude API error:", err);
    res.status(500).json({
      speech: "Oops, my brain glitched!",
      code: null,
      description: null,
    });
  }
});

// Proxy Deepgram key to client (avoids exposing key in browser source)
app.get("/deepgram-key", (req, res) => {
  res.json({ key: process.env.DEEPGRAM_API_KEY });
});

// TTS proxy — client sends text, server calls ElevenLabs, returns audio
app.post("/tts", async (req, res) => {
  const { text } = req.body;

  try {
    const ttsRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!ttsRes.ok) {
      throw new Error(`ElevenLabs error: ${ttsRes.status}`);
    }

    const arrayBuffer = await ttsRes.arrayBuffer();
    res.set("Content-Type", "audio/mpeg");
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error("TTS error:", err);
    res.status(500).json({ error: "TTS failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Archie server running at http://localhost:${PORT}`);
});

module.exports = { app, queueAction };
