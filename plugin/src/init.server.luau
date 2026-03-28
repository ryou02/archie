local HttpService = game:GetService("HttpService")
local ChangeHistoryService = game:GetService("ChangeHistoryService")
local Selection = game:GetService("Selection")
local InsertService = game:GetService("InsertService")
local RunService = game:GetService("RunService")
local CollectionService = game:GetService("CollectionService")
local ScriptEditorService = game:GetService("ScriptEditorService")
local Lighting = game:GetService("Lighting")

local SERVER_URL = "http://localhost:3000"
local POLL_INTERVAL = 0.5

-- Create plugin toolbar and button
local toolbar = plugin:CreateToolbar("Archie")
local toggleButton = toolbar:CreateButton(
	"Archie",
	"Open Archie Assistant",
	"rbxassetid://4458901886"
)

-- Create dock widget
local widgetInfo = DockWidgetPluginGuiInfo.new(
	Enum.InitialDockState.Right,
	true,
	false,
	350,
	500,
	300,
	200
)

local widget = plugin:CreateDockWidgetPluginGui("ArchieWidget", widgetInfo)
widget.Title = "Archie"

-- UI Colors
local BG_COLOR = Color3.fromRGB(26, 26, 46)
local PANEL_COLOR = Color3.fromRGB(15, 52, 96)
local ACCENT_COLOR = Color3.fromRGB(83, 52, 131)
local GREEN = Color3.fromRGB(46, 204, 113)
local RED = Color3.fromRGB(231, 76, 60)
local YELLOW = Color3.fromRGB(241, 196, 15)
local WHITE = Color3.fromRGB(238, 238, 238)

-- Main frame
local mainFrame = Instance.new("Frame")
mainFrame.Size = UDim2.new(1, 0, 1, 0)
mainFrame.BackgroundColor3 = BG_COLOR
mainFrame.BorderSizePixel = 0
mainFrame.Parent = widget

local mainLayout = Instance.new("UIListLayout")
mainLayout.SortOrder = Enum.SortOrder.LayoutOrder
mainLayout.Padding = UDim.new(0, 8)
mainLayout.Parent = mainFrame

local mainPadding = Instance.new("UIPadding")
mainPadding.PaddingTop = UDim.new(0, 12)
mainPadding.PaddingBottom = UDim.new(0, 12)
mainPadding.PaddingLeft = UDim.new(0, 12)
mainPadding.PaddingRight = UDim.new(0, 12)
mainPadding.Parent = mainFrame

-- Status indicator
local statusFrame = Instance.new("Frame")
statusFrame.Size = UDim2.new(1, 0, 0, 24)
statusFrame.BackgroundTransparency = 1
statusFrame.LayoutOrder = 1
statusFrame.Parent = mainFrame

local statusDot = Instance.new("Frame")
statusDot.Size = UDim2.new(0, 12, 0, 12)
statusDot.Position = UDim2.new(0, 0, 0.5, -6)
statusDot.BackgroundColor3 = RED
statusDot.Parent = statusFrame
local dotCorner = Instance.new("UICorner")
dotCorner.CornerRadius = UDim.new(1, 0)
dotCorner.Parent = statusDot

local statusLabel = Instance.new("TextLabel")
statusLabel.Size = UDim2.new(1, -20, 1, 0)
statusLabel.Position = UDim2.new(0, 20, 0, 0)
statusLabel.BackgroundTransparency = 1
statusLabel.Text = "Disconnected"
statusLabel.TextColor3 = WHITE
statusLabel.TextXAlignment = Enum.TextXAlignment.Left
statusLabel.Font = Enum.Font.GothamBold
statusLabel.TextSize = 13
statusLabel.Parent = statusFrame

-- Activity label
local activityLabel = Instance.new("TextLabel")
activityLabel.Size = UDim2.new(1, 0, 0, 20)
activityLabel.BackgroundTransparency = 1
activityLabel.Text = "Activity"
activityLabel.TextColor3 = WHITE
activityLabel.Font = Enum.Font.GothamBold
activityLabel.TextSize = 14
activityLabel.TextXAlignment = Enum.TextXAlignment.Left
activityLabel.LayoutOrder = 2
activityLabel.Parent = mainFrame

-- Activity feed (scrollable)
local activityScroll = Instance.new("ScrollingFrame")
activityScroll.Size = UDim2.new(1, 0, 1, -120)
activityScroll.BackgroundColor3 = PANEL_COLOR
activityScroll.BorderSizePixel = 0
activityScroll.ScrollBarThickness = 6
activityScroll.LayoutOrder = 3
activityScroll.AutomaticCanvasSize = Enum.AutomaticSize.Y
activityScroll.Parent = mainFrame
local activityCorner = Instance.new("UICorner")
activityCorner.CornerRadius = UDim.new(0, 8)
activityCorner.Parent = activityScroll

local activityPadding = Instance.new("UIPadding")
activityPadding.PaddingTop = UDim.new(0, 8)
activityPadding.PaddingBottom = UDim.new(0, 8)
activityPadding.PaddingLeft = UDim.new(0, 8)
activityPadding.PaddingRight = UDim.new(0, 8)
activityPadding.Parent = activityScroll

local activityLayout = Instance.new("UIListLayout")
activityLayout.SortOrder = Enum.SortOrder.LayoutOrder
activityLayout.Padding = UDim.new(0, 4)
activityLayout.Parent = activityScroll

-- History label
local historyLabel = Instance.new("TextLabel")
historyLabel.Size = UDim2.new(1, 0, 0, 20)
historyLabel.BackgroundTransparency = 1
historyLabel.Text = "History"
historyLabel.TextColor3 = WHITE
historyLabel.Font = Enum.Font.GothamBold
historyLabel.TextSize = 14
historyLabel.TextXAlignment = Enum.TextXAlignment.Left
historyLabel.LayoutOrder = 4
historyLabel.Parent = mainFrame

local historyList = Instance.new("TextLabel")
historyList.Size = UDim2.new(1, 0, 0, 60)
historyList.BackgroundTransparency = 1
historyList.Text = ""
historyList.TextColor3 = Color3.fromRGB(150, 150, 150)
historyList.Font = Enum.Font.Gotham
historyList.TextSize = 11
historyList.TextXAlignment = Enum.TextXAlignment.Left
historyList.TextYAlignment = Enum.TextYAlignment.Top
historyList.TextWrapped = true
historyList.LayoutOrder = 5
historyList.Parent = mainFrame

-- Toggle widget visibility
toggleButton.Click:Connect(function()
	widget.Enabled = not widget.Enabled
end)

-- State
local historyEntries = {}
local activityOrder = 0
local consoleBuffer = {} -- stores recent log messages

-- Capture console output via LogService
local LogService = game:GetService("LogService")
LogService.MessageOut:Connect(function(message, messageType)
	table.insert(consoleBuffer, {
		message = message,
		messageType = tostring(messageType),
		timestamp = os.clock(),
	})
	-- Keep last 100 lines
	if #consoleBuffer > 100 then
		table.remove(consoleBuffer, 1)
	end
end)

--- Add an entry to the activity feed
local function addActivity(text, color)
	activityOrder += 1
	local label = Instance.new("TextLabel")
	label.Size = UDim2.new(1, 0, 0, 0)
	label.AutomaticSize = Enum.AutomaticSize.Y
	label.BackgroundTransparency = 1
	label.Text = text
	label.TextColor3 = color or WHITE
	label.Font = Enum.Font.Code
	label.TextSize = 11
	label.TextXAlignment = Enum.TextXAlignment.Left
	label.TextWrapped = true
	label.LayoutOrder = activityOrder
	label.Parent = activityScroll
	-- Auto-scroll
	activityScroll.CanvasPosition = Vector2.new(0, activityLayout.AbsoluteContentSize.Y)
end

--- Update history display
local function addHistory(desc)
	table.insert(historyEntries, desc)
	local lines = {}
	for i = math.max(1, #historyEntries - 9), #historyEntries do
		table.insert(lines, "• " .. historyEntries[i])
	end
	historyList.Text = table.concat(lines, "\n")
end

--- Resolve a dot-separated path like "Workspace.MyCar.Body" to an Instance
local function resolvePath(pathStr)
	if not pathStr or pathStr == "" then
		return game.Workspace
	end
	local current = game
	for segment in pathStr:gmatch("[^%.]+") do
		current = current:FindFirstChild(segment)
		if not current then
			return nil
		end
	end
	return current
end

--- Get a path string for an instance
local function getPath(instance)
	local parts = {}
	local current = instance
	while current and current ~= game do
		table.insert(parts, 1, current.Name)
		current = current.Parent
	end
	return table.concat(parts, ".")
end

--- Parse a "x,y,z" string into a Vector3
local function parseVector3(str)
	if not str then return nil end
	local parts = str:split(",")
	if #parts ~= 3 then return nil end
	return Vector3.new(tonumber(parts[1]), tonumber(parts[2]), tonumber(parts[3]))
end

--- Parse a "r,g,b" string into a Color3
local function parseColor3(str)
	if not str then return nil end
	local parts = str:split(",")
	if #parts ~= 3 then return nil end
	return Color3.fromRGB(tonumber(parts[1]), tonumber(parts[2]), tonumber(parts[3]))
end

--- Set a property value with type coercion
local function setProperty(instance, propName, value)
	local currentVal = instance[propName]
	local valType = typeof(currentVal)

	if valType == "Vector3" and type(value) == "string" then
		instance[propName] = parseVector3(value)
	elseif valType == "Color3" and type(value) == "string" then
		instance[propName] = parseColor3(value)
	elseif valType == "BrickColor" and type(value) == "string" then
		instance[propName] = BrickColor.new(value)
	elseif valType == "UDim2" and type(value) == "string" then
		-- parse "scaleX,offsetX,scaleY,offsetY"
		local p = value:split(",")
		instance[propName] = UDim2.new(tonumber(p[1]), tonumber(p[2]), tonumber(p[3]), tonumber(p[4]))
	elseif valType == "number" then
		instance[propName] = tonumber(value)
	elseif valType == "boolean" then
		if type(value) == "string" then
			instance[propName] = value == "true"
		else
			instance[propName] = value
		end
	elseif valType == "EnumItem" and type(value) == "string" then
		-- Try to resolve enum like "Enum.Material.Neon"
		local enumPath = value:split(".")
		if #enumPath == 3 and enumPath[1] == "Enum" then
			local ok, enumVal = pcall(function()
				return Enum[enumPath[2]][enumPath[3]]
			end)
			if ok then
				instance[propName] = enumVal
			end
		end
	else
		instance[propName] = value
	end
end

--- Wrap a function in ChangeHistoryService recording
local function withUndo(description, fn)
	local recording = ChangeHistoryService:TryBeginRecording(description)
	if not recording then
		return fn()
	end
	local ok, result = pcall(fn)
	if ok then
		ChangeHistoryService:FinishRecording(recording, Enum.FinishRecordingOperation.Commit)
		return result
	else
		ChangeHistoryService:FinishRecording(recording, Enum.FinishRecordingOperation.Cancel)
		error(result)
	end
end

--- Get key properties of an instance for summaries
local function getKeyProps(instance)
	local props = { Name = instance.Name, ClassName = instance.ClassName }
	local ok

	ok, _ = pcall(function() props.Position = tostring(instance.Position) end)
	ok, _ = pcall(function() props.Size = tostring(instance.Size) end)
	ok, _ = pcall(function() props.BrickColor = tostring(instance.BrickColor) end)
	ok, _ = pcall(function() props.Color = tostring(instance.Color) end)
	ok, _ = pcall(function() props.Material = tostring(instance.Material) end)
	ok, _ = pcall(function() props.Anchored = instance.Anchored end)
	ok, _ = pcall(function() props.Transparency = instance.Transparency end)

	return props
end

-- ============================================================
-- Tool Handlers
-- ============================================================

local toolHandlers = {}

-- === Building & Instances ===

toolHandlers.run_code = function(params)
	local output = {}
	local env = setmetatable({
		print = function(...)
			local args = { ... }
			local strs = {}
			for i = 1, #args do
				table.insert(strs, tostring(args[i]))
			end
			table.insert(output, table.concat(strs, "\t"))
		end,
		warn = function(...)
			local args = { ... }
			local strs = {}
			for i = 1, #args do
				table.insert(strs, tostring(args[i]))
			end
			table.insert(output, "[warn] " .. table.concat(strs, "\t"))
		end,
	}, { __index = getfenv() })

	return withUndo("Archie: run code", function()
		local fn, err = loadstring(params.code)
		if not fn then
			error("Parse error: " .. tostring(err))
		end
		setfenv(fn, env)
		fn()
		return { output = table.concat(output, "\n") }
	end)
end

toolHandlers.create_instance = function(params)
	return withUndo("Archie: create " .. params.className, function()
		local parent = resolvePath(params.parent)
		if not parent then
			error("Parent not found: " .. params.parent)
		end
		local instance = Instance.new(params.className)
		if params.properties then
			for prop, value in pairs(params.properties) do
				local ok, err = pcall(setProperty, instance, prop, value)
				if not ok then
					warn("[Archie] Failed to set " .. prop .. ": " .. tostring(err))
				end
			end
		end
		instance.Parent = parent
		return { path = getPath(instance), name = instance.Name }
	end)
end

toolHandlers.delete_instance = function(params)
	return withUndo("Archie: delete " .. params.path, function()
		local instance = resolvePath(params.path)
		if not instance then
			error("Instance not found: " .. params.path)
		end
		local name = instance.Name
		instance:Destroy()
		return { deleted = name }
	end)
end

toolHandlers.clone_instance = function(params)
	return withUndo("Archie: clone " .. params.path, function()
		local instance = resolvePath(params.path)
		if not instance then
			error("Instance not found: " .. params.path)
		end
		local parent = resolvePath(params.newParent)
		if not parent then
			error("Parent not found: " .. params.newParent)
		end
		local clone = instance:Clone()
		if params.newName then
			clone.Name = params.newName
		end
		clone.Parent = parent
		return { path = getPath(clone), name = clone.Name }
	end)
end

toolHandlers.set_properties = function(params)
	return withUndo("Archie: set properties on " .. params.path, function()
		local instance = resolvePath(params.path)
		if not instance then
			error("Instance not found: " .. params.path)
		end
		local set = {}
		for prop, value in pairs(params.properties) do
			local ok, err = pcall(setProperty, instance, prop, value)
			if ok then
				table.insert(set, prop)
			else
				warn("[Archie] Failed to set " .. prop .. ": " .. tostring(err))
			end
		end
		return { path = getPath(instance), propertiesSet = set }
	end)
end

toolHandlers.group_instances = function(params)
	return withUndo("Archie: group into " .. params.name, function()
		local parent = resolvePath(params.parent)
		if not parent then
			error("Parent not found: " .. params.parent)
		end
		local group = Instance.new(params.groupType)
		group.Name = params.name
		group.Parent = parent
		for _, path in ipairs(params.paths) do
			local instance = resolvePath(path)
			if instance then
				instance.Parent = group
			else
				warn("[Archie] Instance not found for grouping: " .. path)
			end
		end
		return { path = getPath(group), childCount = #group:GetChildren() }
	end)
end

toolHandlers.ungroup_instances = function(params)
	return withUndo("Archie: ungroup " .. params.path, function()
		local group = resolvePath(params.path)
		if not group then
			error("Instance not found: " .. params.path)
		end
		local parent = group.Parent
		local children = group:GetChildren()
		for _, child in ipairs(children) do
			child.Parent = parent
		end
		group:Destroy()
		return { ungrouped = #children }
	end)
end

-- === Reading Game State ===

toolHandlers.get_children = function(params)
	local instance = resolvePath(params.path or "Workspace")
	if not instance then
		error("Instance not found: " .. tostring(params.path))
	end
	local children = {}
	for _, child in ipairs(instance:GetChildren()) do
		table.insert(children, getKeyProps(child))
	end
	return { path = getPath(instance), children = children }
end

toolHandlers.get_properties = function(params)
	local instance = resolvePath(params.path)
	if not instance then
		error("Instance not found: " .. params.path)
	end
	return getKeyProps(instance)
end

toolHandlers.find_instances = function(params)
	local root = resolvePath(params.root or "Workspace")
	if not root then
		error("Root not found: " .. tostring(params.root))
	end

	local results = {}
	local function search(instance)
		local match = true
		if params.name and instance.Name ~= params.name then
			match = false
		end
		if params.className and instance.ClassName ~= params.className then
			match = false
		end
		if params.tag and not CollectionService:HasTag(instance, params.tag) then
			match = false
		end
		if match and (params.name or params.className or params.tag) then
			table.insert(results, { path = getPath(instance), name = instance.Name, className = instance.ClassName })
		end
		for _, child in ipairs(instance:GetChildren()) do
			search(child)
		end
	end
	search(root)
	return { results = results }
end

toolHandlers.get_selection = function(params)
	local selected = Selection:Get()
	local results = {}
	for _, instance in ipairs(selected) do
		table.insert(results, { path = getPath(instance), name = instance.Name, className = instance.ClassName })
	end
	return { selected = results }
end

toolHandlers.get_scene_summary = function(params)
	local maxDepth = params.maxDepth or 3
	local function summarize(instance, depth)
		if depth > maxDepth then return nil end
		local node = { name = instance.Name, className = instance.ClassName }
		local children = instance:GetChildren()
		if #children > 0 and depth < maxDepth then
			node.children = {}
			for _, child in ipairs(children) do
				local childNode = summarize(child, depth + 1)
				if childNode then
					table.insert(node.children, childNode)
				end
			end
		elseif #children > 0 then
			node.childCount = #children
		end
		return node
	end
	return summarize(game.Workspace, 1)
end

-- === Assets & Toolbox ===

toolHandlers.search_toolbox = function(params)
	local query = params.query
	local maxResults = params.maxResults or 5

	local ok, items = pcall(function()
		return InsertService:GetFreeModels(query, 0)
	end)
	if not ok then
		error("Toolbox search failed: " .. tostring(items))
	end

	local results = {}
	-- Handle both Pages objects and plain arrays
	local list = items
	if type(items) ~= "table" then
		-- If it's a Pages object, try GetCurrentPage
		local pageOk, page = pcall(function() return items:GetCurrentPage() end)
		if pageOk then
			list = page
		else
			return { results = {}, error = "Could not read search results" }
		end
	end

	-- Debug: dump first item's keys to find the right field names
	local debugKeys = {}
	if list[1] then
		for k, v in pairs(list[1]) do
			table.insert(debugKeys, k .. "=" .. tostring(v))
		end
	end

	for i, item in ipairs(list) do
		if i > maxResults then break end
		-- Try every possible field name for the asset ID
		local id = item.AssetId or item.assetId or item.Id or item.id or item.AssetID
		table.insert(results, {
			assetId = id,
			name = item.Name or item.name or "Unknown",
		})
	end
	return { results = results, debugFirstItem = table.concat(debugKeys, ", ") }
end

toolHandlers.insert_asset = function(params)
	return withUndo("Archie: insert asset " .. tostring(params.assetId), function()
		local ok, model = pcall(function()
			return InsertService:LoadAsset(params.assetId)
		end)
		if not ok then
			error("Failed to load asset " .. tostring(params.assetId) .. ": " .. tostring(model))
		end

		local parent = resolvePath(params.parent or "Workspace")
		if not parent then
			error("Parent not found: " .. tostring(params.parent))
		end

		local inserted = {}
		for _, child in ipairs(model:GetChildren()) do
			child.Parent = parent
			if params.position then
				local pos = parseVector3(params.position)
				if pos then
					pcall(function()
						child:PivotTo(CFrame.new(pos))
					end)
				end
			end
			table.insert(inserted, { name = child.Name, path = getPath(child) })
		end
		model:Destroy()
		return { inserted = inserted }
	end)
end

-- === Scripting ===

toolHandlers.create_script = function(params)
	return withUndo("Archie: create script " .. params.name, function()
		local parent = resolvePath(params.parent)
		if not parent then
			error("Parent not found: " .. params.parent)
		end
		local script = Instance.new(params.scriptType)
		script.Name = params.name
		script.Source = params.source
		script.Parent = parent
		return { path = getPath(script), name = script.Name }
	end)
end

toolHandlers.read_script = function(params)
	local instance = resolvePath(params.path)
	if not instance then
		error("Script not found: " .. params.path)
	end
	if not instance:IsA("LuaSourceContainer") then
		error("Instance is not a script: " .. params.path)
	end
	return { path = getPath(instance), source = instance.Source }
end

toolHandlers.edit_script = function(params)
	return withUndo("Archie: edit script " .. params.path, function()
		local instance = resolvePath(params.path)
		if not instance then
			error("Script not found: " .. params.path)
		end
		if not instance:IsA("LuaSourceContainer") then
			error("Instance is not a script: " .. params.path)
		end
		instance.Source = params.source
		return { path = getPath(instance), updated = true }
	end)
end

-- === Environment ===

toolHandlers.set_lighting = function(params)
	return withUndo("Archie: set lighting", function()
		if params.clockTime then Lighting.ClockTime = params.clockTime end
		if params.brightness then Lighting.Brightness = params.brightness end
		if params.ambient then Lighting.Ambient = parseColor3(params.ambient) end
		if params.outdoorAmbient then Lighting.OutdoorAmbient = parseColor3(params.outdoorAmbient) end
		if params.fogStart then Lighting.FogStart = params.fogStart end
		if params.fogEnd then Lighting.FogEnd = params.fogEnd end
		if params.shadowSoftness then Lighting.ShadowSoftness = params.shadowSoftness end
		return { updated = true }
	end)
end

toolHandlers.set_atmosphere = function(params)
	return withUndo("Archie: set atmosphere", function()
		local atm = Lighting:FindFirstChildOfClass("Atmosphere")
		if not atm then
			atm = Instance.new("Atmosphere")
			atm.Parent = Lighting
		end
		if params.density then atm.Density = params.density end
		if params.haze then atm.Haze = params.haze end
		if params.glare then atm.Glare = params.glare end
		if params.color then atm.Color = parseColor3(params.color) end
		return { updated = true }
	end)
end

toolHandlers.modify_terrain = function(params)
	return withUndo("Archie: modify terrain", function()
		local terrain = game.Workspace.Terrain

		if params.operation == "clear" then
			terrain:Clear()
			return { cleared = true }
		elseif params.operation == "fillBall" then
			local center = parseVector3(params.center)
			if not center then error("Invalid center position") end
			local radius = params.radius or 20
			local material = Enum.Material[params.material or "Grass"]
			terrain:FillBall(center, radius, material)
			return { filled = "ball", center = tostring(center), radius = radius }
		elseif params.operation == "fillRegion" then
			local min = parseVector3(params.regionMin)
			local max = parseVector3(params.regionMax)
			if not min or not max then error("Invalid region bounds") end
			local material = Enum.Material[params.material or "Grass"]
			local region = Region3.new(min, max)
			region = region:ExpandToGrid(4)
			terrain:FillRegion(region, 4, material)
			return { filled = "region", min = tostring(min), max = tostring(max) }
		else
			error("Unknown terrain operation: " .. tostring(params.operation))
		end
	end)
end

toolHandlers.set_camera = function(params)
	local camera = game.Workspace.CurrentCamera
	local pos = parseVector3(params.position)
	if not pos then error("Invalid camera position") end
	if params.lookAt then
		local lookAt = parseVector3(params.lookAt)
		if lookAt then
			camera.CFrame = CFrame.lookAt(pos, lookAt)
		else
			camera.CFrame = CFrame.new(pos)
		end
	else
		camera.CFrame = CFrame.new(pos)
	end
	return { position = tostring(camera.CFrame.Position) }
end

-- === Playtesting ===

toolHandlers.start_playtest = function(params)
	return withUndo("Archie: start playtest", function()
		local fn = loadstring('game:GetService("RunService"):Run()')
		if fn then fn() end
		return { started = true }
	end)
end

toolHandlers.stop_playtest = function(params)
	local fn = loadstring('game:GetService("RunService"):Stop()')
	if fn then fn() end
	return { stopped = true }
end

toolHandlers.get_console_output = function(params)
	local maxLines = params.maxLines or 20
	local startIdx = math.max(1, #consoleBuffer - maxLines + 1)
	local lines = {}
	for i = startIdx, #consoleBuffer do
		local entry = consoleBuffer[i]
		table.insert(lines, "[" .. entry.messageType .. "] " .. entry.message)
	end
	return { lines = lines, count = #lines }
end

toolHandlers.get_studio_mode = function(params)
	local runService = game:GetService("RunService")
	local mode = "Edit"
	if runService:IsRunning() then
		if runService:IsClient() then
			mode = "Playing"
		else
			mode = "Running"
		end
	end
	return { mode = mode }
end

-- === Utility ===

toolHandlers.undo = function(params)
	ChangeHistoryService:Undo()
	return { undone = true }
end

toolHandlers.select_instances = function(params)
	local instances = {}
	for _, path in ipairs(params.paths) do
		local instance = resolvePath(path)
		if instance then
			table.insert(instances, instance)
		else
			warn("[Archie] Instance not found for selection: " .. path)
		end
	end
	Selection:Set(instances)
	return { selected = #instances }
end

toolHandlers.tag_instances = function(params)
	local tagged = 0
	local untagged = 0
	for _, path in ipairs(params.paths) do
		local instance = resolvePath(path)
		if instance then
			if params.addTags then
				for _, tag in ipairs(params.addTags) do
					CollectionService:AddTag(instance, tag)
					tagged += 1
				end
			end
			if params.removeTags then
				for _, tag in ipairs(params.removeTags) do
					CollectionService:RemoveTag(instance, tag)
					untagged += 1
				end
			end
		end
	end
	return { tagged = tagged, untagged = untagged }
end

-- ============================================================
-- Tool Queue Polling + Execution
-- ============================================================

local function request(method, path, body)
	local success, result = pcall(function()
		return HttpService:RequestAsync({
			Url = SERVER_URL .. path,
			Method = method,
			Headers = { ["Content-Type"] = "application/json" },
			Body = body and HttpService:JSONEncode(body) or nil,
		})
	end)
	if success and result.Success then
		return true, HttpService:JSONDecode(result.Body)
	end
	return false, nil
end

-- Main poll loop
while true do
	local ok, data = request("GET", "/status")

	if ok then
		statusDot.BackgroundColor3 = GREEN
		statusLabel.Text = "Connected"
	else
		statusDot.BackgroundColor3 = RED
		statusLabel.Text = "Disconnected"
		task.wait(POLL_INTERVAL)
		continue
	end

	-- Poll for tool requests
	local pollOk, pollData = request("GET", "/tool-queue/poll")
	if pollOk and pollData.hasRequest then
		local req = pollData.request
		local toolName = req.tool
		local params = req.params
		local id = req.id

		addActivity("→ " .. toolName .. "...", YELLOW)

		local handler = toolHandlers[toolName]
		if handler then
			local success, result = pcall(handler, params)
			if success then
				addActivity("✓ " .. toolName, GREEN)
				addHistory(toolName)
				request("POST", "/tool-queue/result", { id = id, result = result })
			else
				addActivity("✗ " .. toolName .. ": " .. tostring(result), RED)
				request("POST", "/tool-queue/result", { id = id, error = tostring(result) })
			end
		else
			addActivity("✗ Unknown tool: " .. toolName, RED)
			request("POST", "/tool-queue/result", { id = id, error = "Unknown tool: " .. toolName })
		end
	end

	task.wait(POLL_INTERVAL)
end
