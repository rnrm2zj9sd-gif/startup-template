"use client";

import TextShimmer from "@/components/magicui/text-shimmer";
import { SystemBlock } from "@/components/system/system-block";
import { Button } from "@/components/ui/button";
import { demoUser } from "@/config/user";
import { ArrowRightIcon } from "@radix-ui/react-icons";
import { useInView } from "framer-motion";
import Link from "next/link";
import { useRef } from "react";

export default function HeroSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  return (
    <section
      id="hero"
      className="relative mx-auto mt-32 max-w-[80rem] px-6 text-center md:px-8"
    >
      <Link
        href="#waitlist"
        className="backdrop-blur-xl inline-flex h-7 items-center justify-between rounded-full border border-border bg-card px-3 text-xs transition-all ease-in hover:cursor-pointer hover:bg-white/10 hover:border-brand-blue/50 group gap-1 translate-y-[-1rem] animate-fade-in opacity-0"
      >
        <TextShimmer className="inline-flex items-center justify-center">
          <span>SYSTEM ONLINE — accès anticipé ouvert</span>{" "}
          <ArrowRightIcon className="ml-1 size-3 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5" />
        </TextShimmer>
      </Link>
      <h1 className="bg-gradient-to-br dark:from-white from-black from-30% dark:to-white/40 to-black/40 bg-clip-text py-6 text-5xl font-medium leading-none tracking-tighter text-transparent text-balance sm:text-6xl md:text-7xl lg:text-8xl translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:200ms]">
        Ta vie est un RPG.
        <br className="hidden md:block" /> Monte de niveau pour de vrai.
      </h1>
      <p className="mb-12 text-lg tracking-tight text-gray-400 md:text-xl text-balance translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:400ms]">
        THEMILION SYSTEM transforme tes objectifs en missions, ta discipline
        en XP et ta progression en rangs.
        <br className="hidden md:block" /> Fini la procrastination invisible :
        chaque action compte, et tu la vois.
      </p>
      <Button
        asChild
        className="group translate-y-[-1rem] animate-fade-in gap-1 rounded-lg opacity-0 ease-in-out [--animation-delay:600ms]"
      >
        <Link href="#waitlist">
          <span>Rejoindre la liste d’attente</span>
          <ArrowRightIcon className="ml-1 size-4 transition-transform duration-300 ease-in-out group-hover:translate-x-1" />
        </Link>
      </Button>
      <div
        ref={ref}
        className={`relative mt-[8rem] animate-fade-up opacity-0 [--animation-delay:400ms] before:pointer-events-none before:absolute before:bottom-1/2 before:left-0 before:top-0 before:h-full before:w-full before:opacity-0 before:[filter:blur(180px)] before:[background-image:linear-gradient(to_bottom,var(--color-one),var(--color-one),transparent_40%)] ${
          inView ? "before:animate-image-glow" : ""
        }`}
      >
        <SystemBlock player={demoUser} />
      </div>
    </section>
  );
}
