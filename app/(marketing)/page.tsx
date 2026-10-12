import DomainsSection from "@/components/landing/domains-section";
import FeaturesSection from "@/components/landing/features-section";
import HeroSection from "@/components/landing/hero-section";
import ProblemSection from "@/components/landing/problem-section";
import WaitlistSection from "@/components/landing/waitlist-section";
import Particles from "@/components/magicui/particles";
import { SphereMask } from "@/components/magicui/sphere-mask";

export default async function Page() {
  return (
    <>
      <HeroSection />
      <SphereMask />
      <ProblemSection />
      <FeaturesSection />
      <DomainsSection />
      <WaitlistSection />
      <Particles
        className="absolute inset-0 -z-10"
        quantity={50}
        ease={70}
        size={0.05}
        staticity={40}
        color={"#ffffff"}
      />
    </>
  );
}
