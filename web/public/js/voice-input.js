const VoiceInput = {
  socket: null,
  mediaRecorder: null,
  isRecording: false,

  async init() {
    // Fetch the Deepgram key from our server
    const res = await fetch("/deepgram-key");
    const { key } = await res.json();
    this.apiKey = key;
  },

  async startRecording() {
    if (this.isRecording) return;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Connect to Deepgram WebSocket
    this.socket = new WebSocket(
      "wss://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&endpointing=300",
      ["token", this.apiKey]
    );

    this.socket.onopen = () => {
      console.log("Deepgram connected");
      this.isRecording = true;

      // Stream audio to Deepgram
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });
      this.mediaRecorder.ondataavailable = (e) => {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(e.data);
        }
      };
      this.mediaRecorder.start(250); // Send chunks every 250ms
    };

    this.socket.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      const transcript = data.channel?.alternatives?.[0]?.transcript;
      if (transcript && data.is_final) {
        this.onTranscript(transcript);
      }
    };

    this.socket.onerror = (err) => {
      console.error("Deepgram error:", err);
    };

    this.socket.onclose = () => {
      console.log("Deepgram disconnected");
      this.isRecording = false;
    };
  },

  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach((t) => t.stop());
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isRecording = false;
  },

  // Override this in app.js to handle transcripts
  onTranscript(text) {
    console.log("Transcript:", text);
  },
};
