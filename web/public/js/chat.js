const Chat = {
  history: [], // { type: "text" | "build-session", ... }

  init() {
    this.scrollEl = document.getElementById("chat-scroll");
    this.historyEl = document.getElementById("chat-history");
    this.inputEl = document.getElementById("chat-input");

    // Send on Enter key
    this.inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && this.inputEl.value.trim()) {
        this.handleUserMessage(this.inputEl.value.trim());
        this.inputEl.value = "";
      }
    });

    this.historyEl.addEventListener("click", (event) => {
      const toggle = event.target.closest("[data-session-toggle]");
      if (!toggle) {
        return;
      }

      this.history = window.ChatModel.toggleBuildSessionExpanded(
        this.history,
        toggle.dataset.sessionToggle
      );
      this.renderHistory();
    });
  },

  addMessage(role, text) {
    const scrollToBottom = role === "user" ? true : this.shouldStickToBottom();
    this.history.push({ type: "text", role, content: text });
    this.renderHistory({ scrollToBottom });
  },

  addBuildSession(session) {
    const scrollToBottom = this.shouldStickToBottom();
    this.history = window.ChatModel.addArchivedBuildSession(this.history, session);
    this.renderHistory({ scrollToBottom });
  },

  renderHistory(options = {}) {
    const { scrollToBottom = false } = options;

    this.historyEl.innerHTML = this.history
      .map((item) => {
        if (item.type === "build-session") {
          return window.BuildCard.renderArchived(item.session, item.expanded);
        }

        return `
          <div class="chat-msg ${item.role === "user" ? "user" : "archie"}">
            ${item.content}
          </div>
        `;
      })
      .join("");

    if (scrollToBottom) {
      this.scrollToBottom();
    }
  },

  scrollToBottom() {
    if (!this.scrollEl) {
      return;
    }

    this.scrollEl.scrollTop = this.scrollEl.scrollHeight;
  },

  shouldStickToBottom(threshold = 96) {
    if (!this.scrollEl) {
      return true;
    }

    const distanceFromBottom =
      this.scrollEl.scrollHeight - this.scrollEl.clientHeight - this.scrollEl.scrollTop;
    return distanceFromBottom <= threshold;
  },

  async handleUserMessage(text) {
    this.addMessage("user", text);
    this.inputEl.disabled = true;

    if (this.onUserMessageStart) {
      this.onUserMessageStart(text);
    }

    try {
      const response = await Api.sendMessage(text, this.history);
      const speech = response.speech || "Done!";
      this.addMessage("assistant", speech);

      if (this.onRequestSuccess) {
        this.onRequestSuccess({ text, response, speech });
      }

      if (this.onArchieResponse) {
        this.onArchieResponse(speech);
      }
    } catch (err) {
      this.addMessage("assistant", "Oops, something went wrong!");
      console.error("Chat error:", err);

      if (this.onRequestError) {
        this.onRequestError(err);
      }
    }

    this.inputEl.disabled = false;
    this.inputEl.focus();
  },
};
