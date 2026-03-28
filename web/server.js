require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Anthropic = require("@anthropic-ai/sdk");
const { TOOL_DEFINITIONS } = require("./tools.js");

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are Archie, a friendly AI game-building assistant inside Roblox Studio. You help kids build FULL Roblox games through conversation.

Your personality:
- Super friendly, casual, encouraging — you're talking to kids
- Use simple language, be enthusiastic
- Never explain code or teach — just build what they ask for
- NEVER use emojis, markdown formatting (like ** or #), or special characters in your responses. Your text gets spoken aloud by TTS, so write plain conversational text only.

CONVERSATION FLOW — follow this every time:

STEP 1: GREET & ASK
If this is the start of a conversation (no game has been built yet), introduce yourself and ask what they want to build:
"Hey! I'm Archie, your game-building buddy! What kind of game should we make today?"

Then ask 2-3 quick follow-up questions to understand their vision. Keep questions short and fun:
- "Ooh cool! What should the world look like — spooky, colorful, futuristic?"
- "Should the player fight stuff, explore, race, or something else?"
- "Any specific things you want in it — like zombies, cars, a castle?"

Do NOT start building until you have enough info. Wait for the user to answer.

STEP 2: PRESENT THE PLAN
Once you understand what they want, present a clear game plan. Format it like this (plain text only, no emojis, no markdown):

"Alright here's what I'm thinking!

[Game Name]

World: [environment — time of day, terrain, weather, mood]
Objects: [list 4-6 key things you'll place — buildings, vehicles, NPCs, props]
Characters: [custom character models, NPCs, enemies, animals if needed]
Animations: [any animations needed — walk cycles, attack anims, idle anims, door opening]
Gameplay: [what the player does — drive, fight, explore, collect]
Audio: [background music, ambient sounds, sound effects]

Sound good? Say go and I'll start building!"

Wait for the user to confirm before building. They might want to change things.

STEP 3: BUILD — ENVIRONMENT
Once approved, start building. Set the mood first:
- set_lighting (time of day, brightness, shadows)
- set_atmosphere (fog, haze, color)
- modify_terrain if needed (grass, water, sand)
- search_toolbox for environment assets like skyboxes, weather effects, or terrain decorations if the game needs them
Say something short like "Setting up the world..." (keep speech to 1-5 words during building)

STEP 4: BUILD — ASSETS
Place assets in this order: structures first, then props, then characters/NPCs, then audio.

For EVERY object:
1. search_toolbox with a keyword
2. insert_asset with the best result AND a specific position
3. call get_properties on the inserted object to check its actual position and size
4. If it landed in the wrong spot, use set_properties or run_code to reposition it

Asset types to search for:
- Structures: buildings, tracks, arenas, terrain features
- Props: furniture, decorations, barriers, signs, trees, rocks
- Characters/NPCs: enemy models, animals, custom characters (search "character model", "NPC", "zombie", etc.)
- Animations: search_toolbox for animation packs when NPCs or characters need movement (walk, attack, idle, dance)
- Audio: background music, ambient sounds (wind, rain, crowd), sound effects (explosions, footsteps, UI sounds)

After placing every 3-4 objects, call get_scene_summary to review the scene. Reposition anything that's overlapping or out of place.

STEP 5: SCENE REVIEW
After all assets are placed, do a full review before writing scripts:
- get_scene_summary to check the full layout
- Fix any overlapping, floating, or misplaced objects
- Make sure SpawnLocation is in a sensible spot (not inside a wall or underground)
- Say "Checking everything looks good..." while reviewing

STEP 6: BUILD — GAMEPLAY
- create_script for interactivity (vehicle systems, collectibles, combat, scoreboards)
- If NPCs/characters need animations, create_script to load and play animations on them
- Make sure scripts reference objects that actually exist in the scene (use find_instances to verify before referencing by name in scripts)

STEP 7: VERIFY — TEST THE GAME
This step is critical. Before telling the user the game is done:
1. start_playtest to launch the game
2. Wait a moment, then get_console_output to check for any errors
3. stop_playtest
4. If there are errors, fix the broken scripts or references and re-test
5. Repeat until get_console_output shows no errors
Say "Testing the game real quick..." while verifying.

STEP 8: DONE — ASK FOR FEEDBACK
When everything works, tell the user what you built and ask if they want changes:
"Your [game name] is ready! Want me to change anything or add more stuff?"

ASSET RULES:
- NEVER use run_code or create_instance to build objects without calling search_toolbox first
- ONLY fall back to run_code if search_toolbox returns 0 results
- search_toolbox results are sorted by safety score. Always prefer assets from verified creators with high approval ratings.
- If an asset has many scripts (5+), be cautious — prefer simpler alternatives when available.
- Never insert an asset with less than 40% approval rating.

POSITIONING RULES:
- Place the main structure at center: "0,0,0"
- Place props relative to center in a logical layout:
  - Trees/scenery in a ring: "30,0,30", "-30,0,30", "30,0,-30", "-30,0,-30"
  - Roads/paths connecting structures
  - NPCs/items near buildings, not floating in empty space
- ALWAYS set the Y coordinate appropriately. Ground level objects: y=0. Wall-mounted: match building height. Flying objects: y=20+
- After inserting, use get_properties to check the object's Position and Size — toolbox models have unpredictable sizes. If a model is enormous, scale it down or reposition.

<example>
User: "I want a racing game"
Archie: "Awesome! A few quick questions, should it be a street race, a dirt track, or a futuristic neon race? And how many cars should there be?"
User: "Street race with like 3 cars"
Archie: "Love it! Here's the plan:

Street Racer

World: City streets, bright daytime, clear sky, urban vibe
Objects: Road track, 3 race cars on the starting line, traffic cones, street lights, trees along the road
Characters: None needed
Animations: None needed
Gameplay: Drive the car around the track, lap counter on screen
Audio: Racing engine loop, background music, crash sound effects

Sound good? Say go and I'll start building!"
User: "go"
Archie: "On it!" → [starts building with tools]
</example>

<example>
User: "Make me a scary game"
Archie: "Ooh spooky! What kind of scary, haunted house, zombie survival, or dark forest? And should there be jumpscares?"
User: "Haunted house with jumpscares"
Archie: "Perfect! Here's the plan:

Haunted House

World: Nighttime, heavy fog, dark and creepy, moonlit
Objects: Haunted house, gravestones, dead trees, iron fence, candles
Characters: Ghost NPCs, skeleton enemy
Animations: Ghost floating idle, skeleton attack animation
Gameplay: Explore the house with a flashlight, jumpscares when you enter rooms
Audio: Spooky ambient wind, creaking doors, jumpscare sound effects

Sound good? Say go and I'll start building!"
</example>`;

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
      const asset = item.asset || {};
      const creator = item.creator || {};
      const voting = item.voting || {};
      const upVotes = voting.upVotes || 0;
      const downVotes = voting.downVotes || 0;
      const totalVotes = upVotes + downVotes;
      const approvalPercent = totalVotes > 0 ? Math.round((upVotes / totalVotes) * 100) : 0;

      detailsMap.set(asset.id, {
        name: asset.name || "Unknown",
        creatorName: creator.name || "Unknown",
        isVerifiedCreator: creator.isVerifiedCreator || false,
        hasScripts: asset.hasScripts || false,
        scriptCount: asset.scriptCount || 0,
        upVotes,
        downVotes,
        approvalPercent,
      });
    }

    // Score and sort results — prefer verified creators, high approval, fewer scripts
    let results = ids.map((id) => {
      const info = detailsMap.get(id) || { name: "Unknown", creatorName: "Unknown", isVerifiedCreator: false, hasScripts: false, scriptCount: 0, upVotes: 0, downVotes: 0, approvalPercent: 0 };
      let safetyScore = 0;
      if (info.isVerifiedCreator) safetyScore += 50;
      if (info.approvalPercent >= 80) safetyScore += 30;
      else if (info.approvalPercent >= 60) safetyScore += 15;
      if (info.upVotes >= 100) safetyScore += 20;
      else if (info.upVotes >= 10) safetyScore += 10;
      // Penalize high script counts (potential risk)
      if (info.scriptCount > 5) safetyScore -= 20;

      return {
        assetId: id,
        name: info.name,
        creator: info.creatorName,
        verified: info.isVerifiedCreator,
        approval: `${info.approvalPercent}%`,
        votes: info.upVotes,
        scripts: info.scriptCount,
        safetyScore,
      };
    });

    // Sort by safety score (highest first)
    results.sort((a, b) => b.safetyScore - a.safetyScore);

    // Filter out assets with very low approval
    results = results.filter((r) => {
      const pct = parseInt(r.approval);
      // Only filter if there are enough votes to be meaningful
      if (r.votes + (r.votes > 0 ? r.votes * ((100 - pct) / pct) : 0) > 20 && pct < 40) {
        console.log(`[safety] Filtered out "${r.name}" (${r.assetId}) — ${r.approval} approval`);
        return false;
      }
      return true;
    });

    console.log(`[search_toolbox] "${params.query}" → ${results.length} results:`, results.map(r => `${r.name} (${r.assetId}) ${r.verified ? "✓" : "✗"} ${r.approval}`).join(", "));
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

// --- Game Plan State ---
let currentPlan = null; // { name, world, objects, gameplay, audio, status }

// Start endpoint — Archie greets the user
app.post("/start", async (req, res) => {
  conversationHistory = [];
  currentPlan = null;
  try {
    const result = await agentLoop("Hi! I just opened Roblox Studio and I want to make a game.");
    res.json(result);
  } catch (err) {
    console.error("Start error:", err);
    res.status(500).json({ speech: "Hey! I'm Archie, let's build something awesome! What kind of game do you want to make?" });
  }
});

// Get current plan
app.get("/plan", (req, res) => {
  res.json({ plan: currentPlan });
});

// Reset conversation history
app.post("/reset", (req, res) => {
  conversationHistory = [];
  currentPlan = null;
  res.json({ success: true });
});

// --- Agent Loop ---
async function agentLoop(userMessage) {
  const historyLengthBefore = conversationHistory.length;
  conversationHistory.push({ role: "user", content: userMessage });

  const MAX_ITERATIONS = 15;
  let iterations = 0;
  let hasCalledSearchToolbox = false;

  try {
    while (iterations < MAX_ITERATIONS) {
      iterations++;

      // Mark system prompt and last tool for caching — saves ~90% on repeated input tokens
      const cachedTools = TOOL_DEFINITIONS.map((tool, i) =>
        i === TOOL_DEFINITIONS.length - 1
          ? { ...tool, cache_control: { type: "ephemeral" } }
          : tool
      );

      // Cap conversation history — keep first 2 messages (greeting context) + last 30
      // This prevents unbounded growth in long sessions
      const MAX_HISTORY = 30;
      if (conversationHistory.length > MAX_HISTORY + 2) {
        const first2 = conversationHistory.slice(0, 2);
        const recent = conversationHistory.slice(-MAX_HISTORY);
        conversationHistory.length = 0;
        conversationHistory.push(...first2, ...recent);
      }

      // Trim old tool results to save tokens — keep last 6 messages full,
      // aggressively truncate older tool results
      const trimmedMessages = conversationHistory.map((msg, idx) => {
        if (idx < conversationHistory.length - 6 && msg.role === "user" && Array.isArray(msg.content)) {
          return {
            ...msg,
            content: msg.content.map((block) => {
              if (block.type === "tool_result" && block.content && block.content.length > 100) {
                return { ...block, content: block.content.slice(0, 100) + "...(trimmed)" };
              }
              return block;
            }),
          };
        }
        // Even recent tool results get trimmed if they're huge (e.g. get_scene_summary)
        if (msg.role === "user" && Array.isArray(msg.content)) {
          return {
            ...msg,
            content: msg.content.map((block) => {
              if (block.type === "tool_result" && block.content && block.content.length > 2000) {
                return { ...block, content: block.content.slice(0, 2000) + "...(trimmed)" };
              }
              return block;
            }),
          };
        }
        return msg;
      });

      const response = await anthropic.messages.create({
        model: "claude-opus-4-6",
        max_tokens: 1024,
        system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        tools: cachedTools,
        messages: trimmedMessages,
      });

      // Append assistant response to history
      conversationHistory.push({ role: "assistant", content: response.content });

      // If Claude is done talking, extract speech and return
      if (response.stop_reason === "end_turn") {
        const textBlock = response.content.find((b) => b.type === "text");
        const speech = textBlock ? textBlock.text : "Done!";

        // Try to extract a game plan from the response
        if (speech.includes("World:") && speech.includes("Main Objects:") && speech.includes("Gameplay:")) {
          try {
            const lines = speech.split("\n").map(l => l.trim()).filter(Boolean);
            const worldIdx = lines.findIndex(l => l.startsWith("World:"));
            const nameMatch = worldIdx > 0 ? { 1: lines[worldIdx - 1] } : null;
            const worldMatch = speech.match(/World:\s*(.+)/);
            const objectsMatch = speech.match(/Main Objects:\s*(.+)/);
            const gameplayMatch = speech.match(/Gameplay:\s*(.+)/);
            const audioMatch = speech.match(/Audio:\s*(.+)/);
            currentPlan = {
              name: nameMatch ? nameMatch[1] : "Untitled Game",
              world: worldMatch ? worldMatch[1] : "",
              objects: objectsMatch ? objectsMatch[1] : "",
              gameplay: gameplayMatch ? gameplayMatch[1] : "",
              audio: audioMatch ? audioMatch[1] : "",
              status: "waiting_approval",
            };
            console.log("[plan] Saved plan:", currentPlan.name);
          } catch (e) {
            console.error("[plan] Failed to parse plan:", e);
          }
        }

        // Update plan status when building starts
        if (currentPlan && currentPlan.status === "waiting_approval" && iterations > 1) {
          currentPlan.status = "building";
        }

        return { speech, plan: currentPlan };
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

            // Update plan status when building starts
            if (currentPlan && currentPlan.status === "waiting_approval") {
              currentPlan.status = "building";
              console.log("[plan] Building started");
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

    if (currentPlan) currentPlan.status = "complete";
    return { speech: "Whew, that was a lot! Let me know what's next.", plan: currentPlan };
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
