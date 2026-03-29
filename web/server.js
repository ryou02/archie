require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Anthropic = require("@anthropic-ai/sdk");
const { TOOL_DEFINITIONS } = require("./tools.js");
const {
  createBuildSession,
  finalizeBuildSession,
  syncBuildSession,
} = require("./build-session.js");
const { buildTaskPlan, parsePlanFromSpeech } = require("./task-plan.js");

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are Archie, a friendly AI game-building assistant inside Roblox Studio. You help kids build FULL Roblox games through conversation.

Your personality:
- Super friendly, casual, encouraging — you're talking to kids
- Use simple language, be enthusiastic
- Never explain code or teach — just build what they ask for
- NEVER use emojis, markdown formatting (like ** or #), or special characters in your responses. Your text gets spoken aloud by TTS, so write plain conversational text only.

RESPONSE LENGTH RULES — THIS IS CRITICAL:
- Keep ALL responses to 1-2 short sentences MAX. You are speaking out loud, not writing an essay.
- During building: 1-5 words only. "On it!", "Setting up the world", "Adding the cars", "Almost done!"
- When asking questions: One short question at a time. Not a paragraph.
- When presenting the plan: The plan format is the ONLY exception where you can be longer.
- NEVER repeat back what the user said. NEVER explain what you're about to do in detail. Just do it.
- Bad: "Great idea! I'm going to start by setting up the lighting to create a spooky atmosphere, then I'll search for some haunted house models and place them in the scene..."
- Good: "On it!"

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
- Before writing ANY script, call find_instances or get_children to get the EXACT names of objects you want to reference. Never guess object names.
- create_script for interactivity (vehicle systems, collectibles, combat, scoreboards)
- If NPCs/characters need animations, create_script to load and play animations on them
- Put server scripts in ServerScriptService, local scripts in StarterPlayerScripts or StarterGui
- Test each script individually after creating it — don't write 5 scripts then test

SCRIPTING PATTERNS — use these proven patterns, don't improvise:

Tool/weapon that does something on click:
  local tool = script.Parent -- Tool must be in StarterPack or Workspace
  local handle = tool:FindFirstChild("Handle")
  tool.Activated:Connect(function()
    -- do the action here
  end)

Shooting/projectile:
  -- Put a Tool in StarterPack with a Handle part inside it
  local tool = script.Parent
  tool.Activated:Connect(function()
    local player = game.Players:GetPlayerFromCharacter(tool.Parent)
    if not player then return end
    local char = player.Character
    local head = char:FindFirstChild("Head")
    if not head then return end
    local bullet = Instance.new("Part")
    bullet.Size = Vector3.new(0.5, 0.5, 2)
    bullet.CFrame = head.CFrame
    bullet.Velocity = head.CFrame.LookVector * 200
    bullet.Parent = workspace
    bullet.Touched:Connect(function(hit)
      if hit.Parent ~= char then
        bullet:Destroy()
      end
    end)
    game.Debris:AddItem(bullet, 3)
  end)

Collectible/pickup:
  local part = script.Parent
  part.Touched:Connect(function(hit)
    local player = game.Players:GetPlayerFromCharacter(hit.Parent)
    if player then
      local ls = player:FindFirstChild("leaderstats")
      if ls and ls:FindFirstChild("Coins") then
        ls.Coins.Value = ls.Coins.Value + 1
      end
      part:Destroy()
    end
  end)

Leaderboard/score setup (put in ServerScriptService):
  game.Players.PlayerAdded:Connect(function(player)
    local ls = Instance.new("Folder")
    ls.Name = "leaderstats"
    ls.Parent = player
    local coins = Instance.new("IntValue")
    coins.Name = "Coins"
    coins.Value = 0
    coins.Parent = ls
  end)

Vehicle seat (make sure VehicleSeat exists in the model):
  -- No script needed if using VehicleSeat — player just sits in it and WASD drives
  -- But if the model has no VehicleSeat, add one via run_code:
  -- local seat = Instance.new("VehicleSeat"); seat.Parent = workspace.CarModel; seat.Position = workspace.CarModel.PrimaryPart.Position

NPC that chases player:
  local npc = script.Parent
  local humanoid = npc:FindFirstChildOfClass("Humanoid")
  while true do
    local closest = nil
    local closestDist = 50
    for _, player in game.Players:GetPlayers() do
      local char = player.Character
      if char and char:FindFirstChild("HumanoidRootPart") then
        local dist = (char.HumanoidRootPart.Position - npc:GetPivot().Position).Magnitude
        if dist < closestDist then
          closest = char
          closestDist = dist
        end
      end
    end
    if closest and humanoid then
      humanoid:MoveTo(closest.HumanoidRootPart.Position)
    end
    task.wait(0.5)
  end

GUI (health bar, score display, ammo counter, etc.) — use run_code to create ScreenGui:
  -- Put this in a LocalScript in StarterPlayerScripts
  local player = game.Players.LocalPlayer
  local gui = Instance.new("ScreenGui")
  gui.Parent = player.PlayerGui
  local label = Instance.new("TextLabel")
  label.Size = UDim2.new(0, 200, 0, 50)
  label.Position = UDim2.new(0.5, -100, 0, 10)
  label.BackgroundTransparency = 0.5
  label.BackgroundColor3 = Color3.new(0, 0, 0)
  label.TextColor3 = Color3.new(1, 1, 1)
  label.Font = Enum.Font.GothamBold
  label.TextSize = 24
  label.Text = "Score: 0"
  label.Parent = gui

Give guns to player (put Tools in StarterPack so players spawn with them):
  -- After creating a Tool with a Handle, move it to StarterPack
  local tool = ServerStorage:FindFirstChild("Pistol")
  if tool then tool.Parent = game.StarterPack end

STEP 7: VERIFY — TEST THE GAME
This step is critical. NEVER skip it. Before telling the user the game is done:
1. get_scene_summary — check every object is above ground (Y > 0), nothing overlapping badly
2. For each object that looks underground, fix with run_code to reposition it above ground
3. Read back every script you created with read_script to double check for typos or wrong object names
4. start_playtest to launch the game
5. get_console_output to check for errors
6. stop_playtest
7. If there are ANY errors: read the error message, fix the script, and re-test
8. Repeat until get_console_output shows ZERO errors
Say "Testing the game real quick..." while verifying.

Common errors to watch for:
- "X is not a valid member of Y" → you referenced a wrong name, use find_instances to get the real name
- "attempt to index nil" → an object doesn't exist, check if it was inserted correctly
- Script not running → make sure it's in the right container (ServerScriptService for server, StarterPlayerScripts for client)

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
- Place the main structure at center: "0,5,0" (slightly above ground to avoid clipping)
- Place props relative to center in a logical layout:
  - Trees/scenery in a ring: "30,0,30", "-30,0,30", "30,0,-30", "-30,0,-30"
  - Roads/paths connecting structures
  - NPCs/items near buildings, not floating in empty space
- ALWAYS set the Y coordinate to at least 1-5 for ground objects. Toolbox models often have their pivot at the center, so y=0 puts half the model underground.
- After EVERY insert_asset, you MUST:
  1. get_properties to check Position and Size
  2. If Position.Y is negative or the model is underground, use run_code to fix it:
     run_code: local m = workspace:FindFirstChild("ModelName"); if m and m:IsA("Model") then local cf = m:GetBoundingBox(); local _, size = m:GetBoundingBox(); m:PivotTo(CFrame.new(cf.Position.X, size.Y/2, cf.Position.Z)) end
  3. If the model is way too big (Size > 100 studs when you expected small), scale it down or pick a different asset
- Keep the play area around 200x200 studs unless the user asks bigger.

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
let currentTaskPlan = [];
let activeBuildSession = null;
let archivedBuildSessions = [];

// Start endpoint — Archie greets the user
app.post("/start", async (req, res) => {
  conversationHistory = [];
  currentPlan = null;
  currentTaskPlan = [];
  activeBuildSession = null;
  archivedBuildSessions = [];
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
  res.json({
    plan: currentPlan,
    taskPlan: currentTaskPlan,
    activeBuildSession,
    archivedBuildSessions,
  });
});

// Reset conversation history
app.post("/reset", (req, res) => {
  conversationHistory = [];
  currentPlan = null;
  currentTaskPlan = [];
  activeBuildSession = null;
  archivedBuildSessions = [];
  res.json({ success: true });
});

// --- Agent Loop ---
async function agentLoop(userMessage) {
  const historyLengthBefore = conversationHistory.length;
  conversationHistory.push({ role: "user", content: userMessage });

  const MAX_ITERATIONS = 15;
  let iterations = 0;
  let hasCalledSearchToolbox = false;
  let usedToolsThisTurn = false;

  function syncPlanFromSpeech(speech) {
    const parsedPlan = parsePlanFromSpeech(speech);
    if (!parsedPlan) {
      return;
    }

    currentPlan = parsedPlan;
    currentTaskPlan = buildTaskPlan(parsedPlan);
    console.log("[plan] Saved plan:", currentPlan.name);
  }

  function archiveActiveSession(status) {
    if (!activeBuildSession) {
      return;
    }

    const finishedSession = finalizeBuildSession(activeBuildSession, status);
    activeBuildSession = null;
    archivedBuildSessions = [...archivedBuildSessions, finishedSession];
    currentTaskPlan = finishedSession.tasks;
  }

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
      // IMPORTANT: Never split between an assistant tool_use message and its tool_result reply
      const MAX_HISTORY = 30;
      if (conversationHistory.length > MAX_HISTORY + 2) {
        let cutPoint = conversationHistory.length - MAX_HISTORY;
        // Make sure we don't cut right before a tool_result message (user message with tool_result blocks)
        // If the message at cutPoint is a user message with tool_results, move cut back one more
        // so we include the assistant tool_use message that precedes it
        while (cutPoint > 2 && cutPoint < conversationHistory.length) {
          const msg = conversationHistory[cutPoint];
          if (msg.role === "user" && Array.isArray(msg.content) && msg.content.some(b => b.type === "tool_result")) {
            cutPoint--;
          } else {
            break;
          }
        }
        const first2 = conversationHistory.slice(0, 2);
        const recent = conversationHistory.slice(cutPoint);
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
        max_tokens: 4096,
        system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        tools: cachedTools,
        messages: trimmedMessages,
      });

      // Append assistant response to history
      conversationHistory.push({ role: "assistant", content: response.content });

      const assistantSpeech = response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim();

      if (assistantSpeech) {
        syncPlanFromSpeech(assistantSpeech);
      }

      // If Claude is done talking, extract speech and return
      if (response.stop_reason === "end_turn") {
        const textBlock = response.content.find((b) => b.type === "text");
        const speech = textBlock ? textBlock.text : "Done!";

        // Update plan status when building starts
        if (usedToolsThisTurn) {
          if (currentPlan) {
            currentPlan.status = "complete";
          }
          archiveActiveSession("complete");
        } else if (currentPlan && currentPlan.status === "waiting_approval" && iterations > 1) {
          currentPlan.status = "building";
        }

        return {
          speech,
          plan: currentPlan,
          taskPlan: currentTaskPlan,
          activeBuildSession,
          archivedBuildSessions,
        };
      }

      // If Claude wants to use tools, execute them
      if (response.stop_reason === "tool_use") {
        usedToolsThisTurn = true;
        if (!activeBuildSession && currentPlan) {
          currentPlan.status = "building";
          activeBuildSession = createBuildSession(currentPlan);
          currentTaskPlan = activeBuildSession.tasks;
        }

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
              if (!activeBuildSession) {
                activeBuildSession = createBuildSession(currentPlan);
                currentTaskPlan = activeBuildSession.tasks;
              }
            }

            // Route all tools to plugin
            const result = await executeToolViaPlugin(block.name, block.input);
            if (activeBuildSession) {
              activeBuildSession = syncBuildSession(activeBuildSession, block.name, block.input);
              currentTaskPlan = activeBuildSession.tasks;
            }
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
    archiveActiveSession("complete");
    return {
      speech: "Whew, that was a lot! Let me know what's next.",
      plan: currentPlan,
      taskPlan: currentTaskPlan,
      activeBuildSession,
      archivedBuildSessions,
    };
  } catch (err) {
    // Roll back conversation history to prevent corrupted state
    conversationHistory.length = historyLengthBefore;
    if (currentPlan) {
      currentPlan.status = "failed";
    }
    archiveActiveSession("failed");
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
