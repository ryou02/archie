require("dotenv").config();
const express = require("express");
const cors = require("cors");

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

// Placeholder for chat endpoint (Task 4)
app.post("/chat", (req, res) => {
  res.json({ speech: "Not implemented yet", code: null, description: null });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Archie server running at http://localhost:${PORT}`);
});

module.exports = { app, queueAction };
