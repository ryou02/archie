"use client";

import { CameraControls, ContactShadows, Environment } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import Avatar from "@/components/Avatar";
import type { TTSVisemeCue } from "@/lib/api";

interface AvatarExperienceProps {
  visemes?: TTSVisemeCue[];
  isPlaying?: boolean;
  audioRef?: React.MutableRefObject<HTMLAudioElement | null>;
}

export default function AvatarExperience({
  visemes = [],
  isPlaying = false,
  audioRef,
}: AvatarExperienceProps) {
  return (
    <div className="workspace-avatar__canvas" aria-hidden="true">
      <Canvas camera={{ position: [0, 1.22, 2.7], fov: 18 }}>
        <color attach="background" args={["#08111c"]} />
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[2.6, 3.2, 4.8]}
          intensity={1.6}
          color="#eef6ff"
        />
        <directionalLight position={[-2.4, 1.9, 3.2]} intensity={0.7} color="#9fd0ff" />
        <pointLight position={[0, 0.4, 2.2]} intensity={0.45} color="#f5d8c1" />

        <Suspense fallback={null}>
          <Avatar visemes={visemes} isPlaying={isPlaying} audioRef={audioRef} />
          <Environment preset="sunset" />
          <ContactShadows
            position={[0, -1.55, 0]}
            opacity={0.32}
            scale={6}
            blur={2.8}
            far={4}
          />
        </Suspense>

        <CameraControls
          makeDefault
          enabled={false}
          minDistance={2.5}
          maxDistance={3}
          minPolarAngle={Math.PI / 2.08}
          maxPolarAngle={Math.PI / 2.02}
          minAzimuthAngle={-0.08}
          maxAzimuthAngle={0.08}
        />
      </Canvas>
    </div>
  );
}
