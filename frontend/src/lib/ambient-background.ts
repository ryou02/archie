export const AMBIENT_BACKGROUND_VIDEO_SRC = "/media/ambient-loop.mp4";

export type AmbientSurface = "landing" | "build";

export interface AmbientBackgroundConfig {
  surface: AmbientSurface;
  enableVideo: boolean;
  videoSrc: string;
  containerClassName: string;
  overlayClassName: string;
}

const AMBIENT_BACKGROUND_CONFIG: Record<AmbientSurface, AmbientBackgroundConfig> = {
  landing: {
    surface: "landing",
    enableVideo: true,
    videoSrc: AMBIENT_BACKGROUND_VIDEO_SRC,
    containerClassName: "ambient-bg ambient-bg--landing",
    overlayClassName: "ambient-overlay ambient-overlay--hero",
  },
  build: {
    surface: "build",
    enableVideo: true,
    videoSrc: AMBIENT_BACKGROUND_VIDEO_SRC,
    containerClassName: "ambient-bg ambient-bg--build",
    overlayClassName: "ambient-overlay ambient-overlay--build",
  },
};

export function getAmbientBackgroundConfig(
  surface: AmbientSurface
): AmbientBackgroundConfig {
  return AMBIENT_BACKGROUND_CONFIG[surface];
}
