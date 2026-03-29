import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const globalsCss = readFileSync(
  path.join(process.cwd(), "src/app/globals.css"),
  "utf8"
);
const buildPage = readFileSync(
  path.join(process.cwd(), "src/app/build/page.tsx"),
  "utf8"
);
const chatPanel = readFileSync(
  path.join(process.cwd(), "src/components/ChatPanel.tsx"),
  "utf8"
);
const statusDot = readFileSync(
  path.join(process.cwd(), "src/components/StatusDot.tsx"),
  "utf8"
);

test("workspace layout uses shared top and edge inset variables", () => {
  assert.match(globalsCss, /--workspace-top-offset:\s*[^;]+;/);
  assert.match(globalsCss, /--workspace-edge-gap:\s*[^;]+;/);
});

test("chat shell does not add a second inset edge outline", () => {
  assert.doesNotMatch(globalsCss, /\.glass-shell--chat::after\s*\{/s);
});

test("chat shell overrides the generic top-left hotspot with a more even highlight", () => {
  assert.match(globalsCss, /\.glass-shell--chat::before\s*\{/s);
  assert.doesNotMatch(
    globalsCss,
    /\.glass-shell--chat::before\s*\{[^}]*radial-gradient\(circle at 16% 16%/s
  );
});

test("workspace header allows the progress region to shrink on narrow screens", () => {
  assert.match(buildPage, /className="flex-1 min-w-0 max-w-xs mx-4 sm:mx-8"/);
});

test("status indicator hides its text label on small screens to prevent header overflow", () => {
  assert.match(statusDot, /className="nav-label hidden sm:inline"/);
});

test("build page header relies on workspace-header for horizontal clamping", () => {
  assert.match(
    buildPage,
    /className="workspace-header glass-shell glass-shell--quiet absolute top-3 z-20 flex items-center justify-between px-4 py-3 sm:px-6"/
  );
  assert.doesNotMatch(buildPage, /left-3|right-3|sm:left-4|sm:right-4/);
});

test("global styles clamp the workspace header and reset body margin", () => {
  assert.match(globalsCss, /body\s*\{[^}]*margin:\s*0;/s);
  assert.match(
    globalsCss,
    /\.workspace-header\s*\{[^}]*left:\s*var\(--workspace-edge-gap\);[^}]*width:\s*calc\(100vw - \(var\(--workspace-edge-gap\) \* 2\)\);[^}]*max-width:\s*calc\(100vw - \(var\(--workspace-edge-gap\) \* 2\)\);[^}]*overflow:\s*hidden;/s
  );
});

test("build page uses a dedicated workspace layout instead of floating avatar and task panels", () => {
  const avatarExperience = readFileSync(
    path.join(process.cwd(), "src/components/AvatarExperience.tsx"),
    "utf8"
  );

  assert.match(buildPage, /workspace-layout/);
  assert.match(buildPage, /workspace-stage/);
  assert.match(buildPage, /workspace-rail/);
  assert.match(buildPage, /<AvatarExperience/);
  assert.match(buildPage, /workspace-avatar/);
  assert.match(avatarExperience, /<Canvas/);
  assert.match(avatarExperience, /<Environment preset="sunset"/);
  assert.doesNotMatch(buildPage, /workspace-panel glass-shell glass-shell--panel absolute/);
});

test("build page threads voice output state into the avatar stage", () => {
  assert.match(
    buildPage,
    /const \{ speak, visemes, isPlaying, audioRef \} = useVoiceOutput\(\)/
  );
  assert.match(buildPage, /<AvatarExperience[\s\S]*visemes=\{visemes\}/);
  assert.match(buildPage, /isPlaying=\{isPlaying\}/);
  assert.match(buildPage, /audioRef=\{audioRef\}/);
  assert.match(globalsCss, /\.workspace-stage\s*\{/s);
  assert.match(globalsCss, /\.workspace-avatar\s*\{/s);
});

test("workspace CSS gives the avatar a chrome-free stage and stacks avatar above chat on small screens", () => {
  assert.match(globalsCss, /\.workspace-layout\s*\{[\s\S]*display:\s*grid/s);
  assert.match(globalsCss, /\.workspace-stage\s*\{/s);
  assert.match(globalsCss, /\.workspace-rail\s*\{/s);
  assert.match(
    globalsCss,
    /@media \(max-width:\s*1023px\)\s*\{[\s\S]*\.workspace-layout\s*\{[\s\S]*grid-template-columns:\s*1fr/s
  );
  assert.match(
    globalsCss,
    /@media \(max-width:\s*1023px\)\s*\{[\s\S]*\.workspace-stage\s*\{[\s\S]*min-height:/s
  );
});

test("chat panel owns the build progress and approval summary surfaces", () => {
  assert.match(chatPanel, /tasks:\s*TaskStep\[]/);
  assert.match(chatPanel, /selectedTaskId\?: string \| null/);
  assert.match(chatPanel, /overallProgress/);
  assert.match(chatPanel, /Build Progress/);
  assert.match(chatPanel, /waiting_approval/);
  assert.doesNotMatch(buildPage, /workspace-summary glass-shell glass-shell--panel absolute/);
});

test("avatar scene avoids generic bounds fitting and uses explicit framing transforms", () => {
  const avatarExperience = readFileSync(
    path.join(process.cwd(), "src/components/AvatarExperience.tsx"),
    "utf8"
  );
  const avatarSource = readFileSync(
    path.join(process.cwd(), "src/components/Avatar.tsx"),
    "utf8"
  );

  assert.doesNotMatch(avatarExperience, /<Bounds/);
  assert.doesNotMatch(avatarExperience, /<Center/);
  assert.match(avatarExperience, /camera=\{\{ position: \[0, 1\.22, 2\.7\], fov: 18 \}\}/);
  assert.match(avatarSource, /position=\{\[0, -2\.02, 0\.08\]\}/);
  assert.match(avatarSource, /scale=\{3\.45\}/);
});

test("avatar strips root motion from imported animation clips so the half-body rig stays anchored", () => {
  const avatarSource = readFileSync(
    path.join(process.cwd(), "src/components/Avatar.tsx"),
    "utf8"
  );

  assert.match(avatarSource, /function sanitizeAnimationClip/);
  assert.match(avatarSource, /track => !track\.name\.endsWith\("\.position"\)/);
});
