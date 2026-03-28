document.addEventListener("DOMContentLoaded", () => {
  Chat.init();

  // Avatar init is deferred until the module loads
  const waitForAvatar = setInterval(() => {
    if (window.Avatar) {
      clearInterval(waitForAvatar);
      window.Avatar.init();
      console.log("Archie avatar initialized");
    }
  }, 50);

  console.log("Archie app initialized");
});
