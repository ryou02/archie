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
const statusDot = readFileSync(
  path.join(process.cwd(), "src/components/StatusDot.tsx"),
  "utf8"
);

test("workspace chat uses a shared top inset instead of percentage positioning", () => {
  assert.match(globalsCss, /--workspace-top-offset:\s*[^;]+;/);
  assert.doesNotMatch(globalsCss, /\.workspace-chat\s*\{[^}]*top:\s*10%/s);
  assert.match(globalsCss, /\.workspace-chat\s*\{[^}]*top:\s*var\(--workspace-top-offset\);/s);
  assert.match(globalsCss, /\.workspace-chat\s*\{[^}]*bottom:\s*var\(--workspace-edge-gap\);/s);
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
