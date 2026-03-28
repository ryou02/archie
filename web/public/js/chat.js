const Chat = {
  history: [], // { role: "user" | "assistant", content: string }
  historyEl: document.getElementById("chat-history"),
  inputEl: document.getElementById("chat-input"),

  init() {
    // Send on Enter key
    this.inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && this.inputEl.value.trim()) {
        this.handleUserMessage(this.inputEl.value.trim());
        this.inputEl.value = "";
      }
    });
  },

  addMessage(role, text) {
    this.history.push({ role, content: text });
    const div = document.createElement("div");
    div.className = `chat-msg ${role === "user" ? "user" : "archie"}`;
    div.textContent = text;
    this.historyEl.appendChild(div);
    this.historyEl.scrollTop = this.historyEl.scrollHeight;
  },

  async handleUserMessage(text) {
    this.addMessage("user", text);
    this.inputEl.disabled = true;

    try {
      const response = await Api.sendMessage(text, this.history);
      this.addMessage("assistant", response.speech || "...");

      // Trigger TTS if available (wired in app.js)
      if (this.onArchieResponse) {
        this.onArchieResponse(response);
      }
    } catch (err) {
      this.addMessage("assistant", "Oops, something went wrong!");
      console.error("Chat error:", err);
    }

    this.inputEl.disabled = false;
    this.inputEl.focus();
  },
};
