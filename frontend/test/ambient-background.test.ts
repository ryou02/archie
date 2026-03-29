import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  AMBIENT_BACKGROUND_VIDEO_SRC,
  getAmbientBackgroundConfig,
} from "../src/lib/ambient-background";
import AmbientBackground from "../src/components/AmbientBackground";

test("landing config enables video and uses hero readability overlays", () => {
  const config = getAmbientBackgroundConfig("landing");

  assert.equal(config.surface, "landing");
  assert.equal(config.enableVideo, true);
  assert.equal(config.videoSrc, AMBIENT_BACKGROUND_VIDEO_SRC);
  assert.match(config.containerClassName, /ambient-bg--landing/);
  assert.match(config.overlayClassName, /ambient-overlay--hero/);
});

test("build config enables video and uses denser chrome readability overlays", () => {
  const config = getAmbientBackgroundConfig("build");

  assert.equal(config.surface, "build");
  assert.equal(config.enableVideo, true);
  assert.match(config.containerClassName, /ambient-bg--build/);
  assert.match(config.overlayClassName, /ambient-overlay--build/);
});

test("ambient background renders video and procedural overlay layers", () => {
  const html = renderToStaticMarkup(
    React.createElement(AmbientBackground, { surface: "landing" })
  );

  assert.match(html, /ambient-bg--landing/);
  assert.match(html, /ambient-video/);
  assert.match(html, /ambient-fallback/);
  assert.match(html, /ambient-grain/);
  assert.match(html, /ambient-drift/);
  assert.match(html, /ambient-overlay--hero/);
});
