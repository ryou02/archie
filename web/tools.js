const TOOL_DEFINITIONS = [
  // === Assets & Toolbox (ALWAYS try these first for any object) ===
  {
    name: "search_toolbox",
    description:
      "ALWAYS call this FIRST when the user wants ANY object (car, tree, house, sword, NPC, etc.). Searches the Roblox Creator Store for free models. You MUST use this before trying to build anything from Parts. Returns asset IDs you can pass to insert_asset.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Search keyword (e.g., 'medieval castle', 'car', 'sword')",
        },
        maxResults: {
          type: "number",
          description: "Maximum results to return (default: 5)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "insert_asset",
    description:
      "Insert a model from the Roblox Creator Store into the game by asset ID. Use this after search_toolbox returns results.",
    input_schema: {
      type: "object",
      properties: {
        assetId: {
          type: "number",
          description: "The Roblox asset ID from search_toolbox results",
        },
        parent: {
          type: "string",
          description: "Path to parent (default: Workspace)",
        },
        position: {
          type: "string",
          description: "Position as 'x,y,z' (optional)",
        },
      },
      required: ["assetId"],
    },
  },

  // === Building & Instances (only use AFTER search_toolbox finds nothing) ===
  {
    name: "run_code",
    description: "Execute Luau code in Roblox Studio. ONLY use this as a LAST RESORT for building objects — first try search_toolbox + insert_asset. Use run_code for logic, scripting, and operations that don't involve placing objects. Returns printed output. All changes are undoable.",
    input_schema: {
      type: "object",
      properties: {
        code: { type: "string", description: "Valid Luau code to execute" },
      },
      required: ["code"],
    },
  },
  {
    name: "create_instance",
    description:
      "Create a basic Roblox instance (Part, Script, SpawnLocation, etc.). For complex objects like cars, trees, houses — use search_toolbox + insert_asset instead.",
    input_schema: {
      type: "object",
      properties: {
        className: {
          type: "string",
          description: "Roblox class name (e.g., Part, Model, SpawnLocation)",
        },
        parent: {
          type: "string",
          description: "Path to parent (e.g., Workspace, Workspace.MyModel)",
        },
        properties: {
          type: "object",
          description:
            "Key-value properties to set (e.g., {Name: 'Wall', Size: '4,10,1', BrickColor: 'Bright red'})",
        },
      },
      required: ["className", "parent"],
    },
  },
  {
    name: "delete_instance",
    description: "Delete a Roblox instance by path.",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to instance (e.g., Workspace.RedCar)",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "clone_instance",
    description:
      "Clone an existing instance and parent the clone to a target.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path to instance to clone" },
        newParent: {
          type: "string",
          description: "Path to parent the clone to",
        },
        newName: { type: "string", description: "Name for the clone" },
      },
      required: ["path", "newParent"],
    },
  },
  {
    name: "set_properties",
    description: "Set properties on an existing Roblox instance.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path to instance" },
        properties: {
          type: "object",
          description: "Key-value properties to set",
        },
      },
      required: ["path", "properties"],
    },
  },
  {
    name: "group_instances",
    description: "Group multiple instances into a new Model or Folder.",
    input_schema: {
      type: "object",
      properties: {
        paths: {
          type: "array",
          items: { type: "string" },
          description: "Paths to instances to group",
        },
        groupType: {
          type: "string",
          enum: ["Model", "Folder"],
          description: "Type of container",
        },
        name: { type: "string", description: "Name for the group" },
        parent: {
          type: "string",
          description: "Where to parent the group",
        },
      },
      required: ["paths", "groupType", "name", "parent"],
    },
  },
  {
    name: "ungroup_instances",
    description:
      "Ungroup a Model or Folder, reparenting children to the group's parent.",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to the Model or Folder to ungroup",
        },
      },
      required: ["path"],
    },
  },

  // === Reading Game State ===
  {
    name: "get_children",
    description:
      "Get the children of a Roblox instance. Returns name, className, and key properties for each child.",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "Path to instance (e.g., Workspace, Lighting). Defaults to Workspace.",
        },
      },
    },
  },
  {
    name: "get_properties",
    description: "Get all readable properties of a Roblox instance.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path to instance" },
      },
      required: ["path"],
    },
  },
  {
    name: "find_instances",
    description:
      "Find instances by name, class, or CollectionService tag. Searches recursively from the given root.",
    input_schema: {
      type: "object",
      properties: {
        root: {
          type: "string",
          description: "Path to search from (default: Workspace)",
        },
        name: { type: "string", description: "Instance name to match" },
        className: { type: "string", description: "Class name to match" },
        tag: { type: "string", description: "CollectionService tag to match" },
      },
    },
  },
  {
    name: "get_selection",
    description:
      "Get the instances currently selected by the user in Roblox Studio.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_scene_summary",
    description:
      "Get a summary of the entire workspace hierarchy (names, classes, and key properties). Use this to understand the current game state before making changes.",
    input_schema: {
      type: "object",
      properties: {
        maxDepth: {
          type: "number",
          description: "Maximum tree depth (default: 3)",
        },
      },
    },
  },

  // === Scripting ===
  {
    name: "create_script",
    description: "Create a new Script or LocalScript with source code.",
    input_schema: {
      type: "object",
      properties: {
        scriptType: {
          type: "string",
          enum: ["Script", "LocalScript", "ModuleScript"],
          description: "Type of script",
        },
        name: { type: "string", description: "Script name" },
        source: { type: "string", description: "Luau source code" },
        parent: {
          type: "string",
          description:
            "Path to parent (e.g., ServerScriptService, Workspace.MyCar)",
        },
      },
      required: ["scriptType", "name", "source", "parent"],
    },
  },
  {
    name: "read_script",
    description:
      "Read the source code of an existing Script, LocalScript, or ModuleScript.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path to the script" },
      },
      required: ["path"],
    },
  },
  {
    name: "edit_script",
    description: "Replace the source code of an existing script.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path to the script" },
        source: { type: "string", description: "New Luau source code" },
      },
      required: ["path", "source"],
    },
  },

  // === Environment ===
  {
    name: "set_lighting",
    description:
      "Change lighting properties: time of day, brightness, ambient color, fog, shadows.",
    input_schema: {
      type: "object",
      properties: {
        clockTime: {
          type: "number",
          description: "Time of day (0-24, e.g., 14 = 2pm)",
        },
        brightness: {
          type: "number",
          description: "Sun brightness (0-10)",
        },
        ambient: {
          type: "string",
          description: "Ambient color as 'r,g,b' (0-255)",
        },
        outdoorAmbient: {
          type: "string",
          description: "Outdoor ambient as 'r,g,b'",
        },
        fogStart: { type: "number", description: "Fog start distance" },
        fogEnd: { type: "number", description: "Fog end distance" },
        shadowSoftness: {
          type: "number",
          description: "Shadow blur (0-1)",
        },
      },
    },
  },
  {
    name: "set_atmosphere",
    description:
      "Set atmospheric effects (creates Atmosphere instance in Lighting if needed).",
    input_schema: {
      type: "object",
      properties: {
        density: {
          type: "number",
          description: "Particle density (0-1)",
        },
        haze: { type: "number", description: "Haziness (0-10)" },
        glare: { type: "number", description: "Sun glare (0-10)" },
        color: {
          type: "string",
          description: "Atmosphere color as 'r,g,b' (0-255)",
        },
      },
    },
  },
  {
    name: "modify_terrain",
    description:
      "Fill or clear terrain. Supports ball and region fills with Roblox terrain materials.",
    input_schema: {
      type: "object",
      properties: {
        operation: {
          type: "string",
          enum: ["fillBall", "fillRegion", "clear"],
          description: "Terrain operation",
        },
        center: {
          type: "string",
          description: "Center position as 'x,y,z' (for fillBall)",
        },
        radius: {
          type: "number",
          description: "Radius in studs (for fillBall)",
        },
        regionMin: {
          type: "string",
          description: "Region min corner as 'x,y,z' (for fillRegion)",
        },
        regionMax: {
          type: "string",
          description: "Region max corner as 'x,y,z' (for fillRegion)",
        },
        material: {
          type: "string",
          enum: [
            "Grass",
            "Sand",
            "Rock",
            "Snow",
            "Mud",
            "Basalt",
            "Asphalt",
            "Concrete",
            "Brick",
            "Slate",
            "Wood",
            "WoodPlanks",
            "Ice",
            "Glacier",
            "Ground",
            "LeafyGrass",
            "Pavement",
            "Sandstone",
            "Limestone",
            "Salt",
            "CrackedLava",
          ],
          description: "Terrain material",
        },
      },
      required: ["operation"],
    },
  },
  {
    name: "set_camera",
    description:
      "Move the Studio editor camera to a position, optionally looking at a target.",
    input_schema: {
      type: "object",
      properties: {
        position: {
          type: "string",
          description: "Camera position as 'x,y,z'",
        },
        lookAt: {
          type: "string",
          description: "Point to look at as 'x,y,z'",
        },
      },
      required: ["position"],
    },
  },

  // === Playtesting ===
  {
    name: "start_playtest",
    description: "Start Roblox Studio play mode to test the game.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "stop_playtest",
    description: "Stop Roblox Studio play mode.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_console_output",
    description: "Get recent console output and errors from Roblox Studio.",
    input_schema: {
      type: "object",
      properties: {
        maxLines: {
          type: "number",
          description: "Maximum lines to return (default: 20)",
        },
      },
    },
  },
  {
    name: "get_studio_mode",
    description: "Get the current Studio mode: Edit, Playing, or Paused.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },

  // === Utility ===
  {
    name: "undo",
    description: "Undo the last change made in Roblox Studio.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "select_instances",
    description:
      "Select instances in Roblox Studio (highlights them in the viewport and Explorer).",
    input_schema: {
      type: "object",
      properties: {
        paths: {
          type: "array",
          items: { type: "string" },
          description: "Paths to instances to select",
        },
      },
      required: ["paths"],
    },
  },
  {
    name: "tag_instances",
    description: "Add or remove CollectionService tags on instances.",
    input_schema: {
      type: "object",
      properties: {
        paths: {
          type: "array",
          items: { type: "string" },
          description: "Paths to instances",
        },
        addTags: {
          type: "array",
          items: { type: "string" },
          description: "Tags to add",
        },
        removeTags: {
          type: "array",
          items: { type: "string" },
          description: "Tags to remove",
        },
      },
      required: ["paths"],
    },
  },
];

module.exports = { TOOL_DEFINITIONS };
