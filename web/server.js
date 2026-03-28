require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Anthropic = require("@anthropic-ai/sdk");
const { TOOL_DEFINITIONS } = require("./tools.js");

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are Archie, a friendly AI building assistant inside Roblox Studio. You help kids build Roblox games using your tools.

Your personality:
- Super friendly, casual, encouraging
- Keep spoken responses SHORT (1-5 words): "On it!", "Got it!", "Done!", "Let me build that!"
- Never explain code or teach — just build what they ask for

WORKFLOW — follow this exact order for EVERY request:
1. Check the scene: call get_scene_summary
2. Search for assets: call search_toolbox with a relevant keyword
3. Insert the best result: call insert_asset with the assetId
4. ONLY if search_toolbox returns 0 results, fall back to run_code or create_instance

<example>
User: "Make me a car"
You should call: get_scene_summary → search_toolbox({query: "car"}) → insert_asset({assetId: ...})
</example>

<example>
User: "Add a tree"
You should call: get_scene_summary → search_toolbox({query: "tree"}) → insert_asset({assetId: ...})
</example>

<example>
User: "Build a house"
You should call: get_scene_summary → search_toolbox({query: "house"}) → insert_asset({assetId: ...})
</example>

NEVER use run_code or create_instance to build objects without calling search_toolbox first. The toolbox has professional models that look 100x better than anything built from Parts.`;

let conversationHistory = [];

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.static("public"));

// --- Tool Queue ---
// Server pushes tool requests here, plugin polls and picks them up
const toolQueue = []; // { id, tool, params }
const toolResults = new Map(); // id -> { result } or { error }
const toolResultWaiters = new Map(); // id -> { resolve, timer }
let toolIdCounter = 0;
let lastPluginPoll = 0; // timestamp of last plugin poll

function generateToolId() {
  toolIdCounter++;
  return `tool_${toolIdCounter}`;
}

// Server-side tool handlers (don't need plugin)
async function handleSearchToolbox(params) {
  const query = encodeURIComponent(params.query || "");
  const maxResults = params.maxResults || 5;
  try {
    // Step 1: Search for model IDs via toolbox marketplace API
    const searchRes = await fetch(
      `https://apis.roblox.com/toolbox-service/v1/marketplace/Model?keyword=${query}&num=${maxResults}&sortType=Relevance`,
      { headers: { Accept: "application/json" } }
    );
    if (!searchRes.ok) {
      console.error("Toolbox search failed:", searchRes.status);
      return { result: { results: [], error: "Toolbox search unavailable" } };
    }
    const searchData = await searchRes.json();
    const ids = (searchData.data || []).slice(0, maxResults).map((item) => item.id);

    if (ids.length === 0) {
      return { result: { results: [] } };
    }

    // Step 2: Get names for those IDs via items/details API
    const detailsRes = await fetch(
      `https://apis.roblox.com/toolbox-service/v1/items/details?assetIds=${ids.join(",")}`,
      { headers: { Accept: "application/json" } }
    );
    if (!detailsRes.ok) {
      // If details fail, return IDs without names
      console.error("Details fetch failed:", detailsRes.status);
      return { result: { results: ids.map((id) => ({ assetId: id, name: "Unknown" })) } };
    }
    const detailsData = await detailsRes.json();
    const detailsMap = new Map();
    for (const item of detailsData.data || []) {
      detailsMap.set(item.asset?.id, item.asset?.name || "Unknown");
    }

    const results = ids.map((id) => ({
      assetId: id,
      name: detailsMap.get(id) || "Unknown",
    }));

    console.log(`[search_toolbox] "${params.query}" → ${results.length} results:`, results.map(r => `${r.name} (${r.assetId})`).join(", "));
    return { result: { results } };
  } catch (err) {
    console.error("Toolbox search error:", err);
    return { result: { results: [], error: "Toolbox search failed" } };
  }
}

function executeToolViaPlugin(toolName, params) {
  const id = generateToolId();
  toolQueue.push({ id, tool: toolName, params });

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      toolResultWaiters.delete(id);
      resolve({ error: `Tool '${toolName}' timed out after 15 seconds. The plugin may be disconnected.` });
    }, 15000);

    toolResultWaiters.set(id, { resolve, timer });
  });
}

// Plugin polls for next tool request
app.get("/tool-queue/poll", (req, res) => {
  lastPluginPoll = Date.now();
  if (toolQueue.length > 0) {
    const request = toolQueue.shift();
    res.json({ hasRequest: true, request });
  } else {
    res.json({ hasRequest: false });
  }
});

// Plugin returns tool result
app.post("/tool-queue/result", (req, res) => {
  const { id, result, error } = req.body;
  const waiter = toolResultWaiters.get(id);
  if (waiter) {
    clearTimeout(waiter.timer);
    toolResultWaiters.delete(id);
    if (error) {
      waiter.resolve({ error });
    } else {
      waiter.resolve({ result });
    }
  }
  res.json({ success: true });
});

// Health check
app.get("/status", (req, res) => {
  const pluginConnected = Date.now() - lastPluginPoll < 5000;
  res.json({ status: "ok", pluginConnected });
});

// Reset conversation history
app.post("/reset", (req, res) => {
  conversationHistory = [];
  res.json({ success: true });
});

// --- Agent Loop ---
async function agentLoop(userMessage) {
  const historyLengthBefore = conversationHistory.length;
  conversationHistory.push({ role: "user", content: userMessage });

  const MAX_ITERATIONS = 25;
  let iterations = 0;
  let hasCalledSearchToolbox = false;

  try {
    while (iterations < MAX_ITERATIONS) {
      iterations++;

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: TOOL_DEFINITIONS,
        messages: conversationHistory,
      });

      // Append assistant response to history
      conversationHistory.push({ role: "assistant", content: response.content });

      // If Claude is done talking, extract speech and return
      if (response.stop_reason === "end_turn") {
        const textBlock = response.content.find((b) => b.type === "text");
        const speech = textBlock ? textBlock.text : "Done!";
        return { speech };
      }

      // If Claude wants to use tools, execute them
      if (response.stop_reason === "tool_use") {
        const toolResults = [];
        for (const block of response.content) {
          if (block.type === "tool_use") {
            // Track if search_toolbox has been called
            if (block.name === "search_toolbox") {
              hasCalledSearchToolbox = true;
            }

            // INTERCEPTION: Block run_code and create_instance until search_toolbox has been called
            if (!hasCalledSearchToolbox && (block.name === "run_code" || block.name === "create_instance")) {
              console.log(`[BLOCKED] ${block.name} called before search_toolbox — rejecting`);
              toolResults.push({
                type: "tool_result",
                tool_use_id: block.id,
                content: JSON.stringify({
                  error: "REJECTED: You MUST call search_toolbox first before using " + block.name + ". Call search_toolbox now with a keyword describing what the user wants (e.g. 'car', 'house', 'tree'), then use insert_asset with the best assetId from the results."
                }),
                is_error: true,
              });
              continue;
            }

            // Route all tools to plugin
            const result = await executeToolViaPlugin(block.name, block.input);
            console.log(`[tool] ${block.name}(${JSON.stringify(block.input).slice(0, 100)}) → ${JSON.stringify(result).slice(0, 300)}`);
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: JSON.stringify(result),
            });
          }
        }
        conversationHistory.push({ role: "user", content: toolResults });
      }
    }

    return { speech: "Whew, that was a lot! Let me know what's next." };
  } catch (err) {
    // Roll back conversation history to prevent corrupted state
    conversationHistory.length = historyLengthBefore;
    throw err;
  }
}

// Chat endpoint — now runs the agent loop
app.post("/chat", async (req, res) => {
  const { message } = req.body;

  try {
    const result = await agentLoop(message);
    res.json(result);
  } catch (err) {
    console.error("Agent loop error:", err);
    res.status(500).json({
      speech: "Oops, my brain glitched!",
    });
  }
});

// Proxy Deepgram key to client
app.get("/deepgram-key", (req, res) => {
  res.json({ key: process.env.DEEPGRAM_API_KEY });
});

// TTS proxy — client sends text, server calls Deepgram Aura, returns audio
app.post("/tts", async (req, res) => {
  const { text } = req.body;

  try {
    const ttsRes = await fetch(
      "https://api.deepgram.com/v1/speak?model=aura-asteria-en",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      }
    );

    if (!ttsRes.ok) {
      throw new Error(`Deepgram TTS error: ${ttsRes.status}`);
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
  console.log(`\n🚀 Archie server running at http://localhost:${PORT}`);
  console.log(`🛡️  search_toolbox interception is ACTIVE\n`);
});
