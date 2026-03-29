"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import AmbientBackground from "@/components/AmbientBackground";

export default function Home() {
  const router = useRouter();

  return (
    <div className="landing-page relative flex min-h-screen flex-1 items-center justify-center overflow-hidden px-6 py-16">
      <AmbientBackground surface="landing" />

      <div className="landing-shell relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center text-center">
        <div className="hero-mark">
          <Image
            src="/logo-mark.png"
            alt="Archie mark"
            className="hero-mark__image"
            width={250}
            height={250}
            priority
          />
        </div>

        <div className="hero-copy-wrap">
          <p className="hero-kicker">Made for imaginative Roblox builders</p>
          <h1 className="hero-title">ARCHIE</h1>
          <p className="hero-copy">
            Describe the game, shape the <span className="editorial-accent">vibe</span>,
            and let Archie help creators turn ideas into playable Roblox worlds.
          </p>
        </div>

        <button
          onClick={() => router.push("/build")}
          className="btn-primary mt-8 text-base"
        >
          Start Building
        </button>

        <div className="landing-floor" />
      </div>
    </div>
  );
}
