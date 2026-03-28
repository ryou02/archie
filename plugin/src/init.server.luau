local HttpService = game:GetService("HttpService")

local SERVER_URL = "http://localhost:3000"
local POLL_INTERVAL = 1.5

-- Create plugin toolbar and button
local toolbar = plugin:CreateToolbar("Archie")
local toggleButton = toolbar:CreateButton(
	"Archie",
	"Open Archie Assistant",
	"rbxassetid://4458901886" -- robot icon
)

-- Create dock widget
local widgetInfo = DockWidgetPluginGuiInfo.new(
	Enum.InitialDockState.Right,
	true,  -- initially enabled
	false, -- override previous state
	350,   -- default width
	500,   -- default height
	300,   -- min width
	200    -- min height
)

local widget = plugin:CreateDockWidgetPluginGui("ArchieWidget", widgetInfo)
widget.Title = "Archie"

-- UI Colors
local BG_COLOR = Color3.fromRGB(26, 26, 46)
local PANEL_COLOR = Color3.fromRGB(15, 52, 96)
local ACCENT_COLOR = Color3.fromRGB(83, 52, 131)
local GREEN = Color3.fromRGB(46, 204, 113)
local RED = Color3.fromRGB(231, 76, 60)
local WHITE = Color3.fromRGB(238, 238, 238)

-- Main frame
local mainFrame = Instance.new("Frame")
mainFrame.Size = UDim2.new(1, 0, 1, 0)
mainFrame.BackgroundColor3 = BG_COLOR
mainFrame.BorderSizePixel = 0
mainFrame.Parent = widget

local layout = Instance.new("UIListLayout")
layout.SortOrder = Enum.SortOrder.LayoutOrder
layout.Padding = UDim.new(0, 8)
layout.Parent = mainFrame

local padding = Instance.new("UIPadding")
padding.PaddingTop = UDim.new(0, 12)
padding.PaddingBottom = UDim.new(0, 12)
padding.PaddingLeft = UDim.new(0, 12)
padding.PaddingRight = UDim.new(0, 12)
padding.Parent = mainFrame

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

-- Code preview area
local previewLabel = Instance.new("TextLabel")
previewLabel.Size = UDim2.new(1, 0, 0, 20)
previewLabel.BackgroundTransparency = 1
previewLabel.Text = "Code Preview"
previewLabel.TextColor3 = WHITE
previewLabel.Font = Enum.Font.GothamBold
previewLabel.TextSize = 14
previewLabel.TextXAlignment = Enum.TextXAlignment.Left
previewLabel.LayoutOrder = 2
previewLabel.Parent = mainFrame

local previewScroll = Instance.new("ScrollingFrame")
previewScroll.Size = UDim2.new(1, 0, 1, -160)
previewScroll.BackgroundColor3 = PANEL_COLOR
previewScroll.BorderSizePixel = 0
previewScroll.ScrollBarThickness = 6
previewScroll.LayoutOrder = 3
previewScroll.AutomaticCanvasSize = Enum.AutomaticSize.Y
previewScroll.Parent = mainFrame
local previewCorner = Instance.new("UICorner")
previewCorner.CornerRadius = UDim.new(0, 8)
previewCorner.Parent = previewScroll

local previewPadding = Instance.new("UIPadding")
previewPadding.PaddingTop = UDim.new(0, 8)
previewPadding.PaddingBottom = UDim.new(0, 8)
previewPadding.PaddingLeft = UDim.new(0, 8)
previewPadding.PaddingRight = UDim.new(0, 8)
previewPadding.Parent = previewScroll

local codeLabel = Instance.new("TextLabel")
codeLabel.Size = UDim2.new(1, 0, 0, 0)
codeLabel.AutomaticSize = Enum.AutomaticSize.Y
codeLabel.BackgroundTransparency = 1
codeLabel.Text = "Waiting for Archie..."
codeLabel.TextColor3 = Color3.fromRGB(150, 150, 150)
codeLabel.Font = Enum.Font.Code
codeLabel.TextSize = 12
codeLabel.TextXAlignment = Enum.TextXAlignment.Left
codeLabel.TextYAlignment = Enum.TextYAlignment.Top
codeLabel.TextWrapped = true
codeLabel.Parent = previewScroll

-- Description label
local descLabel = Instance.new("TextLabel")
descLabel.Size = UDim2.new(1, 0, 0, 20)
descLabel.BackgroundTransparency = 1
descLabel.Text = ""
descLabel.TextColor3 = Color3.fromRGB(180, 180, 180)
descLabel.Font = Enum.Font.Gotham
descLabel.TextSize = 12
descLabel.TextXAlignment = Enum.TextXAlignment.Left
descLabel.LayoutOrder = 4
descLabel.Parent = mainFrame

-- Buttons frame
local buttonsFrame = Instance.new("Frame")
buttonsFrame.Size = UDim2.new(1, 0, 0, 36)
buttonsFrame.BackgroundTransparency = 1
buttonsFrame.LayoutOrder = 5
buttonsFrame.Parent = mainFrame

local approveBtn = Instance.new("TextButton")
approveBtn.Size = UDim2.new(0.48, 0, 1, 0)
approveBtn.Position = UDim2.new(0, 0, 0, 0)
approveBtn.BackgroundColor3 = GREEN
approveBtn.Text = "Approve"
approveBtn.TextColor3 = WHITE
approveBtn.Font = Enum.Font.GothamBold
approveBtn.TextSize = 14
approveBtn.Parent = buttonsFrame
approveBtn.Visible = false
local approveCorner = Instance.new("UICorner")
approveCorner.CornerRadius = UDim.new(0, 8)
approveCorner.Parent = approveBtn

local rejectBtn = Instance.new("TextButton")
rejectBtn.Size = UDim2.new(0.48, 0, 1, 0)
rejectBtn.Position = UDim2.new(0.52, 0, 0, 0)
rejectBtn.BackgroundColor3 = RED
rejectBtn.Text = "Reject"
rejectBtn.TextColor3 = WHITE
rejectBtn.Font = Enum.Font.GothamBold
rejectBtn.TextSize = 14
rejectBtn.Parent = buttonsFrame
rejectBtn.Visible = false
local rejectCorner = Instance.new("UICorner")
rejectCorner.CornerRadius = UDim.new(0, 8)
rejectCorner.Parent = rejectBtn

-- History
local historyLabel = Instance.new("TextLabel")
historyLabel.Size = UDim2.new(1, 0, 0, 20)
historyLabel.BackgroundTransparency = 1
historyLabel.Text = "History"
historyLabel.TextColor3 = WHITE
historyLabel.Font = Enum.Font.GothamBold
historyLabel.TextSize = 14
historyLabel.TextXAlignment = Enum.TextXAlignment.Left
historyLabel.LayoutOrder = 6
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
historyList.LayoutOrder = 7
historyList.Parent = mainFrame

-- Toggle widget visibility
toggleButton.Click:Connect(function()
	widget.Enabled = not widget.Enabled
end)

-- State
local currentAction = nil
local historyEntries = {}

-- Helper: make HTTP request
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

-- Execute approved code
local function executeCode(code)
	local fn, err = loadstring(code)
	if fn then
		local success, execErr = pcall(fn)
		if not success then
			warn("[Archie] Code execution error: " .. tostring(execErr))
			return false
		end
		return true
	else
		warn("[Archie] Code parse error: " .. tostring(err))
		return false
	end
end

-- Update history display
local function updateHistory()
	local lines = {}
	for i = math.max(1, #historyEntries - 4), #historyEntries do
		table.insert(lines, "• " .. historyEntries[i])
	end
	historyList.Text = table.concat(lines, "\n")
end

-- Approve handler
approveBtn.MouseButton1Click:Connect(function()
	if not currentAction then return end

	local code = currentAction.code
	local desc = currentAction.description

	local success = executeCode(code)
	if success then
		table.insert(historyEntries, desc or "Action applied")
		updateHistory()
	end

	request("POST", "/approve", { id = currentAction.id })
	currentAction = nil
	codeLabel.Text = "Waiting for Archie..."
	descLabel.Text = ""
	approveBtn.Visible = false
	rejectBtn.Visible = false
end)

-- Reject handler
rejectBtn.MouseButton1Click:Connect(function()
	if not currentAction then return end
	request("POST", "/reject", { id = currentAction.id })
	currentAction = nil
	codeLabel.Text = "Waiting for Archie..."
	descLabel.Text = ""
	approveBtn.Visible = false
	rejectBtn.Visible = false
end)

-- Poll loop
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

	if not currentAction then
		local pendingOk, pendingData = request("GET", "/pending")
		if pendingOk and pendingData.hasPending then
			currentAction = pendingData.action
			codeLabel.Text = currentAction.code
			descLabel.Text = currentAction.description or ""
			approveBtn.Visible = true
			rejectBtn.Visible = true
		end
	end

	task.wait(POLL_INTERVAL)
end
