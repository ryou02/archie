import {
  getAmbientBackgroundConfig,
  type AmbientSurface,
} from "@/lib/ambient-background";

interface AmbientBackgroundProps {
  surface: AmbientSurface;
}

export default function AmbientBackground({
  surface,
}: AmbientBackgroundProps) {
  const config = getAmbientBackgroundConfig(surface);

  return (
    <div className={config.containerClassName} aria-hidden="true">
      {config.enableVideo ? (
        <video
          className="ambient-video"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
        >
          <source src={config.videoSrc} type="video/mp4" />
        </video>
      ) : null}
      <div className="ambient-fallback" />
      <div className="ambient-drift" />
      <div className="ambient-grain" />
      <div className={config.overlayClassName} />
    </div>
  );
}
