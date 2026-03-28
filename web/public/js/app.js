document.addEventListener("DOMContentLoaded", () => {
  TaskPanel.init();
  Chat.init();
  VoiceOutput.init();
  VoiceInput.init();

  BuildState.update({
    avatarState: "idle",
    buildStatus: "Tell Archie what to build",
  });

  const waitForScenes = setInterval(() => {
    if (window.Avatar && window.Diorama) {
      clearInterval(waitForScenes);
      window.Avatar.init();
      window.Diorama.init();
    }
  }, 50);

  Chat.onArchieResponse = (speech) => {
    if (speech) {
      VoiceOutput.speak(speech);
    }
  };

  VoiceInput.onTranscript = (text) => {
    Chat.handleUserMessage(text);
  };

  const micBtn = document.getElementById("mic-btn");
  micBtn.addEventListener("mousedown", () => {
    VoiceInput.startRecording();
    micBtn.classList.add("recording");
  });
  micBtn.addEventListener("mouseup", () => {
    VoiceInput.stopRecording();
    micBtn.classList.remove("recording");
  });
  micBtn.addEventListener("mouseleave", () => {
    VoiceInput.stopRecording();
    micBtn.classList.remove("recording");
  });

  console.log("Archie app initialized");
});
