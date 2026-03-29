"use client";

import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { MathUtils, type AnimationClip, type Group, type Object3D } from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { getVisemeBlendShapeName } from "@/lib/avatar-visemes";
import type { TTSVisemeCue } from "@/lib/api";

interface AvatarProps {
  visemes?: TTSVisemeCue[];
  isPlaying?: boolean;
  audioRef?: React.MutableRefObject<HTMLAudioElement | null>;
}

interface MorphBinding {
  dictionary: Record<string, number>;
  influences: number[];
}

const CONTROLLED_MORPHS = [
  "viseme_sil",
  "viseme_aa",
  "viseme_O",
  "viseme_E",
  "viseme_I",
  "viseme_U",
  "viseme_RR",
  "viseme_nn",
  "viseme_SS",
  "viseme_TH",
  "viseme_FF",
  "viseme_DD",
  "viseme_kk",
  "viseme_PP",
] as const;

function collectMorphBindings(scene: Object3D): MorphBinding[] {
  const bindings: MorphBinding[] = [];

  scene.traverse((child) => {
    const candidate = child as Object3D & {
      morphTargetDictionary?: Record<string, number> | null;
      morphTargetInfluences?: number[] | null;
    };

    if (candidate.morphTargetDictionary && candidate.morphTargetInfluences) {
      bindings.push({
        dictionary: candidate.morphTargetDictionary,
        influences: candidate.morphTargetInfluences,
      });
    }
  });

  return bindings;
}

function setMorphTarget(
  bindings: MorphBinding[],
  morphName: string,
  target: number,
  smoothing: number
) {
  for (const binding of bindings) {
    const morphIndex = binding.dictionary[morphName];

    if (typeof morphIndex !== "number") {
      continue;
    }

    binding.influences[morphIndex] = MathUtils.lerp(
      binding.influences[morphIndex] ?? 0,
      target,
      smoothing
    );
  }
}

function getActiveVisemeName(visemes: TTSVisemeCue[], currentTimeMs: number): string {
  for (let index = 0; index < visemes.length; index += 1) {
    const currentCue = visemes[index];
    const nextCue = visemes[index + 1];

    if (
      currentTimeMs >= currentCue.time &&
      (!nextCue || currentTimeMs < nextCue.time)
    ) {
      return getVisemeBlendShapeName(currentCue.id);
    }
  }

  return "viseme_sil";
}

function sanitizeAnimationClip(clip: AnimationClip | undefined, name: string) {
  if (!clip) {
    return null;
  }

  const sanitizedClip = clip.clone();
  sanitizedClip.name = name;
  sanitizedClip.tracks = sanitizedClip.tracks.filter(
    track => !track.name.endsWith(".position")
  );

  return sanitizedClip;
}

export default function Avatar({
  visemes = [],
  isPlaying = false,
  audioRef,
}: AvatarProps) {
  const groupRef = useRef<Group>(null);
  const morphBindingsRef = useRef<MorphBinding[]>([]);
  const nextBlinkAtRef = useRef(1.8);
  const blinkUntilRef = useRef(0);

  const avatarAsset = useGLTF("/models/avatar.glb");
  const idleAsset = useGLTF("/models/idle.glb");
  const talkingAsset = useGLTF("/models/talking.glb");

  const avatarScene = useMemo(
    () => cloneSkeleton(avatarAsset.scene),
    [avatarAsset.scene]
  );
  const animationClips = useMemo(() => {
    const idleClip = sanitizeAnimationClip(idleAsset.animations[0], "Idle");
    const talkingClip = sanitizeAnimationClip(talkingAsset.animations[0], "Talking");

    return [idleClip, talkingClip].filter(
      (clip): clip is AnimationClip => Boolean(clip)
    );
  }, [idleAsset.animations, talkingAsset.animations]);

  const { actions } = useAnimations(animationClips, groupRef);

  useEffect(() => {
    morphBindingsRef.current = collectMorphBindings(avatarScene);
  }, [avatarScene]);

  useEffect(() => {
    const activeAction = isPlaying ? actions.Talking : actions.Idle;
    const inactiveAction = isPlaying ? actions.Idle : actions.Talking;

    inactiveAction?.fadeOut(0.25);
    activeAction?.reset().fadeIn(0.25).play();

    return () => {
      activeAction?.fadeOut(0.2);
    };
  }, [actions, isPlaying]);

  useFrame((state, delta) => {
    const bindings = morphBindingsRef.current;
    const smoothing = Math.min(1, delta * 12);
    const currentTimeMs = audioRef?.current?.currentTime
      ? audioRef.current.currentTime * 1000
      : -1;
    const activeViseme = isPlaying
      ? getActiveVisemeName(visemes, currentTimeMs)
      : "viseme_sil";

    for (const morphName of CONTROLLED_MORPHS) {
      setMorphTarget(
        bindings,
        morphName,
        morphName === activeViseme ? 1 : 0,
        smoothing
      );
    }

    const elapsed = state.clock.elapsedTime;

    if (elapsed >= nextBlinkAtRef.current) {
      blinkUntilRef.current = elapsed + 0.1;
      nextBlinkAtRef.current = elapsed + 2 + Math.random() * 3.5;
    }

    const blinkTarget = elapsed <= blinkUntilRef.current ? 1 : 0;
    setMorphTarget(bindings, "eyeBlinkLeft", blinkTarget, 0.34);
    setMorphTarget(bindings, "eyeBlinkRight", blinkTarget, 0.34);
  });

  return (
    <group
      ref={groupRef}
      position={[0, -2.02, 0.08]}
      rotation={[0, 0.08, 0]}
      scale={3.45}
    >
      <primitive object={avatarScene} />
    </group>
  );
}

useGLTF.preload("/models/avatar.glb");
useGLTF.preload("/models/idle.glb");
useGLTF.preload("/models/talking.glb");
