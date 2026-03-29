import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const voiceInputSource = readFileSync(
  path.join(process.cwd(), "src/lib/use-voice-input.ts"),
  "utf8"
);

test("voice input defers raw websocket error events until close details are available", () => {
  assert.match(voiceInputSource, /const pendingSocketErrorRef = useRef\(false\)/);
  assert.match(
    voiceInputSource,
    /socket\.onerror = \(\) => \{\s*pendingSocketErrorRef\.current = true;\s*\}/s
  );
  assert.match(
    voiceInputSource,
    /socket\.onclose = \(event\) => \{/s
  );
  assert.match(
    voiceInputSource,
    /createVoiceInputError\(undefined,\s*event\)/
  );
  assert.doesNotMatch(
    voiceInputSource,
    /socket\.onerror = \([^)]*\) => \{[\s\S]*onError\?\(event\)[\s\S]*stopRecording\(\)/s
  );
});

test("voice input builds readable transport errors from websocket close details", () => {
  assert.match(voiceInputSource, /function createVoiceInputError\(/);
  assert.match(
    voiceInputSource,
    /Voice input connection closed \(code \$\{closeEvent\.code\}\)/
  );
  assert.match(
    voiceInputSource,
    /Voice input connection failed before transcription could start\./
  );
});

test("voice input supports native browser speech recognition before Deepgram streaming", () => {
  assert.match(
    voiceInputSource,
    /SpeechRecognition \|\| browserWindow\.webkitSpeechRecognition/
  );
  assert.match(voiceInputSource, /const recognitionRef = useRef<BrowserSpeechRecognition \| null>\(null\)/);
  assert.match(
    voiceInputSource,
    /if \(speechRecognitionCtor\) \{[\s\S]*recognition\.start\(\);[\s\S]*return;/s
  );
  assert.match(
    voiceInputSource,
    /recognition\.onresult = \(event\) => \{[\s\S]*onTranscript\(transcript\)/s
  );
});
