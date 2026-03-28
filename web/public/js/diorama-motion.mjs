function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function lerp(current, target, factor) {
  return current + (target - current) * factor;
}

export function computeRevealState({
  currentReveal,
  targetReveal,
  delta,
  elapsedTime,
  groupIndex,
  reducedMotion,
}) {
  const reveal = reducedMotion
    ? targetReveal
    : lerp(currentReveal, targetReveal, Math.min(delta * 6, 1));
  const clampedReveal = clamp(reveal, 0, 1);
  const settleStrength = 1 - clampedReveal;
  const floatPhase = elapsedTime * (1.5 + groupIndex * 0.14) + groupIndex * 0.9;
  const idleLift = reducedMotion ? 0 : Math.sin(floatPhase) * (0.016 + groupIndex * 0.004);

  return {
    reveal: clampedReveal,
    scale: Math.max(0.001, clampedReveal),
    positionY: settleStrength * (0.3 + groupIndex * 0.04) + idleLift * (0.25 + clampedReveal * 0.75),
    rotationX: reducedMotion ? 0 : settleStrength * 0.04,
    rotationZ: reducedMotion
      ? 0
      : Math.sin(floatPhase * 0.9) * 0.025 * (0.35 + clampedReveal * 0.65),
  };
}

export function computeCameraPose({
  elapsedTime,
  reducedMotion,
  basePosition,
  baseTarget,
}) {
  if (reducedMotion) {
    return {
      position: { ...basePosition },
      target: { ...baseTarget },
    };
  }

  return {
    position: {
      x: basePosition.x + Math.sin(elapsedTime * 0.32) * 0.2,
      y: basePosition.y + Math.sin(elapsedTime * 0.2) * 0.08,
      z: basePosition.z + Math.cos(elapsedTime * 0.24) * 0.16,
    },
    target: {
      x: baseTarget.x + Math.sin(elapsedTime * 0.28) * 0.12,
      y: baseTarget.y + Math.cos(elapsedTime * 0.24) * 0.05,
      z: baseTarget.z + Math.sin(elapsedTime * 0.18) * 0.08,
    },
  };
}

export function computeFloatMotion({
  elapsedTime,
  speed,
  amplitude,
  phase = 0,
  reveal = 1,
  reducedMotion,
}) {
  if (reducedMotion || reveal <= 0) {
    return 0;
  }

  return Math.sin(elapsedTime * speed + phase) * amplitude * reveal;
}
