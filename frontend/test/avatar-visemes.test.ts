import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  AZURE_VISEME_TO_RPM,
  getVisemeBlendShapeName,
} from "../src/lib/avatar-visemes";

const apiSource = readFileSync(path.join(process.cwd(), "src/lib/api.ts"), "utf8");
const voiceOutputSource = readFileSync(
  path.join(process.cwd(), "src/lib/use-voice-output.ts"),
  "utf8"
);
const serverSource = readFileSync(path.join(process.cwd(), "server.js"), "utf8");
const packageJson = readFileSync(path.join(process.cwd(), "package.json"), "utf8");

test("azure viseme ids map onto Ready Player Me blend shapes", () => {
  assert.equal(AZURE_VISEME_TO_RPM[0], "viseme_sil");
  assert.equal(AZURE_VISEME_TO_RPM[7], "viseme_U");
  assert.equal(AZURE_VISEME_TO_RPM[18], "viseme_FF");
  assert.equal(AZURE_VISEME_TO_RPM[21], "viseme_PP");
});

test("unknown viseme ids fall back to silence", () => {
  assert.equal(getVisemeBlendShapeName(999), "viseme_sil");
});

test("tts contract carries audio and visemes through server and client helpers", () => {
  assert.match(apiSource, /export interface TTSResponse/);
  assert.match(apiSource, /visemes:\s*TTSVisemeCue\[]/);
  assert.match(voiceOutputSource, /const \{ audio, visemes \} = await getTTS\(text\)/);
  assert.match(voiceOutputSource, /return \{ speak, stop, visemes, isPlaying, audioRef \}/);
  assert.match(serverSource, /visemeReceived/);
  assert.match(serverSource, /res\.json\(\{ audio, visemes \}\)/);
  assert.match(serverSource, /<mstts:viseme type="redlips_front"\/>/);
  assert.match(serverSource, /speakSsmlAsync/);
});

test("tts server falls back to Deepgram JSON audio when Azure speech credentials are missing", () => {
  assert.match(serverSource, /if \(!speechKey \|\| !speechRegion\)/);
  assert.match(serverSource, /process\.env\.DEEPGRAM_API_KEY/);
  assert.match(serverSource, /https:\/\/api\.deepgram\.com\/v1\/speak\?model=/);
  assert.match(serverSource, /Buffer\.from\(arrayBuffer\)\.toString\("base64"\)/);
  assert.match(serverSource, /return \{ audio, visemes: \[\] \}/);
});

test("package.json includes avatar rendering and azure speech dependencies", () => {
  assert.match(packageJson, /"@react-three\/fiber"/);
  assert.match(packageJson, /"@react-three\/drei"/);
  assert.match(packageJson, /"three"/);
  assert.match(packageJson, /"microsoft-cognitiveservices-speech-sdk"/);
});
