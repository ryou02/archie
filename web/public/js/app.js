document.addEventListener("DOMContentLoaded", () => {
  BuildCard.init();
  Chat.init();
  VoiceOutput.init();
  VoiceInput.init();

  BuildState.update({
    avatarState: "idle",
    buildStatus: "Tell Archie what to build",
  });

  Chat.onUserMessageStart = (text) => {
    if (window.Avatar) {
      window.Avatar.setState("thinking");
    }
    beginPlanRequest(text);
    startPlanPolling();
  };

  Chat.onRequestSuccess = ({ response, speech }) => {
    stopPlanPolling();
    syncBuildSessionPayload(response, speech);
  };

  Chat.onRequestError = () => {
    stopPlanPolling();
    BuildCard.renderActive(null);
    if (window.Avatar) {
      window.Avatar.setState("idle");
    }
    BuildState.update({
      avatarState: "idle",
      buildStatus: "Something went wrong. Try again.",
      activeStepId: BuildState.state.steps[0]?.id || null,
    });
    if (BuildState.state.steps.length) {
      BuildState.updateStep(BuildState.state.steps[0].id, {
        status: "active",
        progress: 0,
        detail: "Let's try that one more time.",
      });
    }
  };

  Chat.onArchieResponse = (speech) => {
    if (speech) {
      VoiceOutput.speak(speech);
    }
  };

  VoiceInput.onTranscript = (text) => {
    Chat.handleUserMessage(text);
  };

  VoiceOutput.onSpeechStart = () => {
    if (window.Avatar) {
      window.Avatar.setState("speaking");
    }
    BuildState.update({
      avatarState: "speaking",
      buildStatus: BuildState.state.steps.length ? BuildState.state.buildStatus : "Explaining the plan",
    });
  };

  VoiceOutput.onSpeechEnergy = (energy) => {
    if (window.Avatar) {
      window.Avatar.setSpeechEnergy(energy);
    }
  };

  VoiceOutput.onSpeechEnd = () => {
    if (window.Avatar) {
      window.Avatar.setState("idle");
      window.Avatar.setSpeechEnergy(0);
    }

    BuildState.update({
      avatarState: "idle",
      buildStatus: BuildState.state.buildStatus,
    });
  };

  const micBtn = document.getElementById("mic-btn");
  micBtn.addEventListener("mousedown", () => {
    VoiceInput.startRecording();
    micBtn.classList.add("recording");
    if (window.Avatar) {
      window.Avatar.setState("listening");
    }
    BuildState.update({ avatarState: "listening", buildStatus: "Listening to your idea" });
  });
  micBtn.addEventListener("mouseup", () => {
    VoiceInput.stopRecording();
    micBtn.classList.remove("recording");
    if (window.Avatar) {
      window.Avatar.setState("idle");
    }
  });
  micBtn.addEventListener("mouseleave", () => {
    VoiceInput.stopRecording();
    micBtn.classList.remove("recording");
    if (window.Avatar) {
      window.Avatar.setState("idle");
    }
  });

  // Archie greets the user on load
  fetch("/start", { method: "POST" })
    .then((res) => res.json())
    .then((data) => {
      if (data.speech) {
        Chat.addMessage("assistant", data.speech);
        VoiceOutput.speak(data.speech);
      }
      syncBuildSessionPayload(data, data.speech);
    })
    .catch((err) => console.error("Start error:", err));

  console.log("Archie app initialized");
});

let planPollHandle = null;

function beginPlanRequest(text) {
  BuildState.reset();
  BuildCard.renderActive(null);
  BuildState.update({
    avatarState: "thinking",
    buildStatus: `Planning ${summarizeTopic(text)}...`,
  });
}

function startPlanPolling() {
  stopPlanPolling();
  planPollHandle = window.setInterval(async () => {
    try {
      const response = await Api.getPlan();
      syncBuildSessionPayload(response, undefined, { fromPoll: true });
    } catch (err) {
      console.error("Plan polling error:", err);
    }
  }, 600);
}

function stopPlanPolling() {
  if (planPollHandle) {
    window.clearInterval(planPollHandle);
    planPollHandle = null;
  }
}

function syncBuildSessionPayload(response, speech, options = {}) {
  const { fromPoll = false } = options;
  const archivedSessions = response?.archivedBuildSessions || [];
  const activeSession = response?.activeBuildSession || null;
  const shouldStickToBottom = Chat.shouldStickToBottom();
  if (!fromPoll) {
    archivedSessions.forEach((session) => {
      Chat.addBuildSession(session);
    });
  }

  BuildCard.renderActive(activeSession);
  if (activeSession && shouldStickToBottom) {
    Chat.scrollToBottom();
  }

  if (fromPoll && !activeSession) {
    return;
  }

  if (!activeSession && archivedSessions.length === 0) {
    BuildState.update({
      avatarState: "idle",
      buildStatus: speech ? clipDetail(speech, "Ready for the next idea") : "Ready for the next idea",
    });
    return;
  }

  if (activeSession) {
    BuildState.setTaskPlan(activeSession.tasks, {
      avatarState: "idle",
      activeStepId: getActiveTaskId(activeSession.tasks),
      buildStatus: activeSession.summary,
    });
    return;
  }

  const latestArchived = archivedSessions[archivedSessions.length - 1];
  BuildState.setTaskPlan(latestArchived.tasks, {
    avatarState: "idle",
    activeStepId: null,
    buildStatus: latestArchived.summary || speech || "Build complete",
  });
}

function getActiveTaskId(tasks) {
  const active = tasks.find((task) => task.status === "active");
  if (active) {
    return active.id;
  }

  const pending = tasks.find((task) => task.status !== "done");
  return pending ? pending.id : tasks[0]?.id || null;
}

function summarizeTopic(text) {
  const cleaned = text.trim().replace(/\s+/g, " ");
  if (!cleaned) {
    return "your build";
  }

  return cleaned.length > 28 ? `${cleaned.slice(0, 28).trim()}...` : cleaned;
}

function clipDetail(text, fallback) {
  const cleaned = (text || "").trim().replace(/\s+/g, " ");
  if (!cleaned) {
    return fallback;
  }

  return cleaned.length > 52 ? `${cleaned.slice(0, 52).trim()}...` : cleaned;
}
