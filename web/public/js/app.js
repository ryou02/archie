document.addEventListener("DOMContentLoaded", () => {
  Chat.init();

  // Avatar init
  const waitForAvatar = setInterval(() => {
    if (window.Avatar) {
      clearInterval(waitForAvatar);
      window.Avatar.init();
    }
  }, 50);

  // Voice input
  VoiceInput.init();
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
